import { retainCompleted, retainError, sanitizeRemoteSession } from './session-activity.mjs';

export const REMOTE_PANEL = 'darask-workspace';
export const workspaceHubUrl = (node, workspace) => '/?' + new URLSearchParams({ pc: node, workspace });
const keyOf = (node, workspace) => `${node}:${workspace}`;

// Open workspaces have independent lifetimes. Switching the visible panel must
// not destroy an iframe, cancel its connection, or discard its session tabs.
export function createWorkspaceNavigation({ getLayout, getWindow, request }) {
  let selectedKey = null, snapshot = null, openedSnapshot = [], disposed = false;
  const opened = new Map(), requests = new Map(), frames = new Map(), queued = new Map(), listeners = new Set();
  const sessionActions = new Map();
  const cancelActions = key => { for (const [id, pending] of sessionActions) if (!key || pending.key === key) { clearTimeout(pending.timer); pending.reject(new Error('ワークスペースの接続が閉じられました。')); sessionActions.delete(id); } };
  const publish = () => { snapshot = opened.get(selectedKey) ?? null; openedSnapshot = [...opened.values()]; for (const listener of listeners) listener(); };
  const update = (key, value) => { opened.set(key, value); publish(); };
  const writeUrl = (node, workspace, replace = false) => {
    const browser = getWindow(), url = new URL(browser.location.href);
    if (node) { url.searchParams.set('pc', node); url.searchParams.set('workspace', workspace); }
    else { url.searchParams.delete('pc'); url.searchParams.delete('workspace'); }
    url.searchParams.delete('token');
    if (url.href !== browser.location.href) browser.history[replace ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search + url.hash);
  };
  const activate = (node, workspace, replace) => {
    const layout = getLayout();
    layout.selectPanel(REMOTE_PANEL); layout.closeRightbar(); layout.beginNavigation();
    selectedKey = keyOf(node, workspace); writeUrl(node, workspace, replace); publish();
  };
  const navigation = {
    getSnapshot: () => snapshot,
    getOpenedSnapshot: () => openedSnapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    attachFrame(node, workspace, send) {
      const key = keyOf(node, workspace); frames.set(key, send);
      return () => { if (frames.get(key) === send) { frames.delete(key); cancelActions(key); } };
    },
    receiveSessions(data) {
      const key = keyOf(data.node, data.workspace), entry = opened.get(key);
      if (!entry || !Array.isArray(data.sessions)) return;
      const previous = new Map((entry.sessions ?? []).map(session => [session.id, session]));
      const sessions = data.sessions.map(sanitizeRemoteSession).filter(Boolean)
        .map(session => {
          const last = previous.get(session.id);
          return { ...session, completed: retainCompleted(last, session), error: retainError(last, session) };
        });
      const current = typeof data.current === 'string' ? data.current : null;
      const waiting = queued.get(key);
      if (waiting && frames.has(key) && (waiting.type !== 'darask-open-session' || sessions.some(session => session.id === waiting.session))) {
        queued.delete(key); frames.get(key)(waiting);
      }
      // An empty hydrate must not close retained session tabs before the remote
      // session store has actually loaded.
      if (!sessions.length && entry.sessions?.length) return;
      if (entry.current === current && JSON.stringify(entry.sessions) === JSON.stringify(sessions)) return;
      update(key, { ...entry, sessions, current });
    },
    openSession(id, node = snapshot?.node, workspace = snapshot?.workspace) {
      const entry = opened.get(keyOf(node, workspace));
      if (!entry?.sessions?.some(item => item.id === id)) return;
      activate(node, workspace, false);
      frames.get(keyOf(node, workspace))?.({ type: 'darask-open-session', node, workspace, session: id });
    },
    startSession(node, workspace) { return navigation.open(node, workspace, { newSession: true }); },
    manageSession(node, workspace, session, action, title) {
      const key = keyOf(node, workspace), entry = opened.get(key), send = frames.get(key);
      if (!entry?.sessions?.some(item => item.id === session) || !send || !['rename', 'archive', 'fork'].includes(action)) return Promise.reject(new Error('セッションの接続を確認してください。'));
      const requestId = globalThis.crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { sessionActions.delete(requestId); reject(new Error('操作結果を確認できません。再読み込みしてセッションの状態を確認してください。')); }, 30000);
        sessionActions.set(requestId, { key, node, workspace, session, action, title, resolve, reject, timer });
        send({ type: 'darask-manage-session', node, workspace, session, action, title, requestId });
      });
    },
    receiveSessionResult(data) {
      const pending = sessionActions.get(data.requestId);
      if (!pending || data.node !== pending.node || data.workspace !== pending.workspace) return;
      sessionActions.delete(data.requestId); clearTimeout(pending.timer);
      if (!data.ok) { pending.reject(new Error('セッションを変更できませんでした。接続先の状態を確認してください。')); return; }
      const entry = opened.get(pending.key);
      if (entry && pending.action !== 'fork') update(pending.key, { ...entry, sessions: pending.action === 'archive' ? entry.sessions.filter(s => s.id !== pending.session)
        : entry.sessions.map(s => s.id === pending.session ? { ...s, title: pending.title } : s),
        current: pending.action === 'archive' && entry.current === pending.session ? null : entry.current });
      pending.resolve();
    },
    workspaceChanged(node, workspace, { deleted, title }) {
      const key = keyOf(node, workspace), entry = opened.get(key);
      if (!entry) return;
      if (!deleted) { update(key, { ...entry, title }); return; }
      cancelActions(key);
      requests.get(key)?.controller.abort(); clearTimeout(requests.get(key)?.timer); requests.delete(key); frames.delete(key); queued.delete(key); opened.delete(key);
      if (selectedKey === key) { selectedKey = null; getLayout().selectPanel(null); writeUrl(null, null, true); }
      publish();
    },
    async open(node, workspace, { replace = false, newSession = false, force = false, sessionId } = {}) {
      if (disposed) return;
      const key = keyOf(node, workspace), cached = opened.get(key);
      const selection = typeof sessionId === 'string' ? { type: 'darask-open-session', node, workspace, session: sessionId } : undefined;
      if (selection) queued.set(key, selection);
      activate(node, workspace, replace);
      if (!force && cached?.src && !cached.error) {
        if (newSession) {
          const command = { type: 'darask-new-session', node, workspace };
          if (cached.sessions && frames.has(key)) frames.get(key)(command); else queued.set(key, command);
        }
        else if (selection && cached.sessions?.some(session => session.id === sessionId) && frames.has(key)) {
          queued.delete(key); frames.get(key)(selection);
        }
        return;
      }
      if (!force && requests.has(key)) { requests.get(key).newSession ||= newSession; return requests.get(key).promise; }
      requests.get(key)?.controller.abort();
      clearTimeout(requests.get(key)?.timer);
      const controller = new AbortController(), signal = controller.signal;
      const timer = setTimeout(() => controller.abort(Object.assign(new Error('Connection timed out'), { name: 'TimeoutError' })), 45000);
      const pending = { controller, timer, newSession }; requests.set(key, pending);
      if (!selection) queued.delete(key);
      update(key, { node, workspace, loading: true, error: '', src: null });
      pending.promise = (async () => {
        try {
          const value = await request({ action: 'open', node, workspaceId: workspace }, signal);
          if (signal.aborted) throw signal.reason;
          if (requests.get(key) !== pending || disposed) return;
          const target = new URL(value.url, getWindow().location.href);
          if (target.origin !== getWindow().location.origin || target.pathname !== '/api/darask/remote' || target.searchParams.get('node') !== node || target.searchParams.get('workspace') !== workspace) throw new Error('ワークスペースを開けません。');
          const selected = value.host?.workspaces?.find(item => item.id === workspace);
          if (!selected) throw new Error('登録したワークスペースが見つかりません。');
          target.searchParams.set('resource', '/'); target.searchParams.set('embedded', '1');
          if (pending.newSession) target.searchParams.set('newSession', '1');
          update(key, { node, workspace, title: selected.title, loading: false, error: '', src: target.pathname + target.search });
        } catch (error) {
          if (requests.get(key) !== pending || signal.aborted && signal.reason?.name !== 'TimeoutError' || disposed) return;
          queued.delete(key);
          update(key, { node, workspace, loading: false, error: error.name === 'TimeoutError' || signal.reason?.name === 'TimeoutError' ? '接続に時間がかかっています。もう一度お試しください。' : error.message, src: null });
        } finally { clearTimeout(timer); if (requests.get(key) === pending) requests.delete(key); }
      })();
      return pending.promise;
    },
    observePanel(panel) {
      if (panel === REMOTE_PANEL || !selectedKey) return;
      selectedKey = null; publish(); writeUrl(null, null, true);
    },
    restore() {
      const query = new URL(getWindow().location.href).searchParams;
      const node = query.get('pc'), workspace = query.get('workspace');
      if (node && workspace) return navigation.open(node, workspace, { replace: true });
      if (selectedKey) { getLayout().selectPanel(null); navigation.observePanel(null); }
    },
    dispose() { disposed = true; cancelActions(); for (const pending of requests.values()) { pending.controller.abort(); clearTimeout(pending.timer); } requests.clear(); frames.clear(); queued.clear(); opened.clear(); listeners.clear(); snapshot = null; openedSnapshot = []; },
  };
  return navigation;
}
