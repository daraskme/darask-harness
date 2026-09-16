import { workspaceHubUrl } from './workspace-navigation.mjs';

export const REMOTE_PATH = '/api/darask/remote';
export const REMOTE_SOCKET = '/api/darask/remote-stream';
export const REMOTE_ASSETS = '/api/darask/remote-assets';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const scriptJson = value => JSON.stringify(value).replaceAll('<', '\\u003c');
export function remoteUrl(node, resource, workspace) {
  // Native ES modules import sibling chunks using relative URLs.
  if (resource?.startsWith('/assets/')) return `${REMOTE_ASSETS}/${encodeURIComponent(node)}${resource}`;
  const query = new URLSearchParams({ node });
  if (resource !== undefined) query.set('resource', resource);
  if (workspace) query.set('workspace', workspace);
  return `${REMOTE_PATH}?${query}`;
}

/** One page-scoped carrier. No Host-ownership/loopback privilege is claimed. */
export function installRemoteBrowser(config) {
  const base = location.origin;
  window.__DARASK_EMBEDDED__ = config.embedded === true;
  const toRemote = (value, socket = false) => {
    const url = new URL(String(value), base);
    const own = url.origin.replace(/^ws/, 'http') === base || url.origin.replace(/^ws/, 'http') === config.origin;
    if (!own || !['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) return String(value);
    if (url.pathname === config.path || url.pathname === config.socket || url.pathname.startsWith(config.assets + '/')) return url.href;
    if (!socket && url.pathname.startsWith('/assets/')) return `${base}${config.assets}/${encodeURIComponent(config.node)}${url.pathname}${url.search}`;
    const query = new URLSearchParams({ node: config.node, resource: url.pathname + url.search });
    const target = `${base}${socket ? config.socket : config.path}?${query}`;
    return socket ? target.replace(/^http/, 'ws') : target;
  };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const request = new Request(input, init);
    return nativeFetch(new Request(toRemote(request.url), request));
  };
  const NativeSocket = window.WebSocket;
  window.WebSocket = class extends NativeSocket {
    constructor(url, protocols) { super(toRemote(url, true), protocols); }
  };
  if (window.EventSource) {
    const NativeEvents = window.EventSource;
    window.EventSource = class extends NativeEvents {
      constructor(url, options) { super(toRemote(url), options); }
    };
  }
  const setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    return setAttribute.call(this, name, /^(src|href|action|poster)$/i.test(name) ? toRemote(value) : value);
  };
  for (const [type, property] of [[HTMLScriptElement, 'src'], [HTMLLinkElement, 'href'], [HTMLImageElement, 'src'], [HTMLIFrameElement, 'src'], [HTMLMediaElement, 'src'], [HTMLSourceElement, 'src'], [HTMLAnchorElement, 'href'], [HTMLFormElement, 'action']]) {
    const descriptor = Object.getOwnPropertyDescriptor(type.prototype, property);
    if (descriptor?.set) Object.defineProperty(type.prototype, property, { ...descriptor, set(value) { descriptor.set.call(this, toRemote(value)); } });
  }
  window.__DSH_TRANSPORT__ = {
    fetch: window.fetch,
    loadBundle(url) { return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.onload = () => { script.remove(); resolve(); };
      script.onerror = () => { script.remove(); reject(new Error('リモート画面の部品を読み込めません。')); };
      script.src = toRemote(url); document.head.appendChild(script);
    }); },
  };
  // Official upload carrier prevents the native Blob Worker from posting to
  // the hub's session ID namespace. Its response still belongs to remote DSH.
  window.__DSH_FILE_UPLOAD__ = { fetch: window.fetch };
  // Native UI state belongs to this PC even though the public origin is shared.
  for (const name of ['localStorage', 'sessionStorage']) {
    const storage = window[name], prefix = `darask-remote:${config.node}:`;
    const keys = () => Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(k => k?.startsWith(prefix));
    const scoped = { getItem: key => storage.getItem(prefix + key), setItem: (key, value) => storage.setItem(prefix + key, value),
      removeItem: key => storage.removeItem(prefix + key), clear: () => keys().forEach(key => storage.removeItem(key)), key: i => keys()[i]?.slice(prefix.length) ?? null,
      get length() { return keys().length; } };
    Object.defineProperty(window, name, { configurable: true, value: scoped });
  }
  window.__DARASK_REMOTE_WORKSPACE__ = ui => {
    let opening = false;
    const seenRunning = new Map(), doneReminder = new Map();
    const pendingKind = kind => kind === 'approval' || kind === 'plan-review' || kind === 'question' ? kind : undefined;
    const sessionStatus = (session, sessions, pending) => {
      const jobs = sessions.jobsBySession?.[session.id];
      const snapshot = ui.sessions.binding?.(session.id)?.session?.getSnapshot?.();
      let runningSubagentCount = 0;
      for (const child of Object.values(sessions.byId || {})) if (child?.parentId === session.id && child.running) runningSubagentCount++;
      const kind = pendingKind(pending?.get?.(session.id)?.kind);
      const running = session.running === true;
      if (seenRunning.get(session.id) === true && !running) doneReminder.set(session.id, true);
      if (running) doneReminder.delete(session.id);
      seenRunning.set(session.id, running);
      return {
        id: session.id, title: session.displayTitle || session.title || '新しい会話',
        running, completed: session.completed === true || doneReminder.get(session.id) === true, runningSubagentCount,
        error: Boolean(snapshot?.lastAgentError) || Array.isArray(jobs) && jobs.some(job => job.status === 'failed'),
        ...kind ? { pendingInteraction: kind } : {},
      };
    };
    const update = () => {
      const workspaces = ui.workspaces.list.getSnapshot(), sessions = ui.sessions.list.getSnapshot();
      // Cordis throws on undeclared property access; optional chaining still hits the getter.
      const pending = ui.ctx?.get?.('uiSession')?.pendingInteractions?.getSnapshot?.();
      if (workspaces.phase !== 'ready' || sessions.phase !== 'ready') return;
      const active = workspaces.items.find(w => w.sessionIds.includes(sessions.current));
      if (active) parent.postMessage({ type: 'darask-remote-workspace', node: config.node, path: active.path }, base);
      const selected = workspaces.items.find(w => w.workspaceId === config.workspace);
      const expected = selected?.sessionIds.filter(id => !workspaces.archivedSessionIds?.includes(id)) ?? [];
      const candidates = expected.filter(id => sessions.byId?.[id]);
      if (expected.length && !candidates.length) return;
      if (selected) parent.postMessage({ type: 'darask-workspace-sessions', node: config.node, workspace: config.workspace, current: sessions.current,
        sessions: candidates.sort((a, b) => sessions.byId[b].updatedAt - sessions.byId[a].updatedAt).map(id => sessionStatus(sessions.byId[id], sessions, pending)) }, base);
      if (!opening && config.workspace) {
        if (!workspaces.items.some(w => w.workspaceId === config.workspace)) {
          opening = true;
          parent.postMessage({ type: 'darask-remote-error', node: config.node, message: '登録したリモートワークスペースが見つかりません。' }, base); return;
        }
        opening = true;
        const recent = candidates.includes(sessions.current) ? sessions.current : candidates.sort((a, b) => sessions.byId[b].updatedAt - sessions.byId[a].updatedAt)[0];
        if (!config.newSession && recent) ui.openSession(recent);
        else ui.openWorkspace(config.workspace).catch(() => parent.postMessage({ type: 'darask-remote-error', node: config.node, message: 'ワークスペースを開けません。接続先の状態を確認してください。' }, base));
      }
    };
    const receive = async event => {
      if (event.source !== parent || event.origin !== base || event.data?.node !== config.node || event.data?.workspace !== config.workspace) return;
      const snapshot = ui.workspaces.list.getSnapshot();
      const selected = snapshot.items.find(item => item.workspaceId === config.workspace);
      if (event.data.type === 'darask-open-session' && selected?.sessionIds.includes(event.data.session) && !snapshot.archivedSessionIds?.includes(event.data.session)) ui.openSession(event.data.session);
      if (event.data.type === 'darask-new-session' && selected) ui.openWorkspace(config.workspace).catch(() => parent.postMessage({ type: 'darask-remote-error', node: config.node, message: 'セッションを追加できませんでした。' }, base));
      if (event.data.type === 'darask-manage-session' && typeof event.data.requestId === 'string') {
        let ok = false;
        try {
          const { session, action, title } = event.data;
          if (!selected?.sessionIds.includes(session) || snapshot.archivedSessionIds?.includes(session)) throw new Error('Unknown session');
          if (action === 'rename') {
            if (typeof title !== 'string' || !title.trim() || title.length > 120) throw new Error('Invalid title');
            const result = await ui.sessions.binding(session)?.session.rename(title.trim());
            if (!result?.ok) throw new Error('Rename failed');
          } else if (action === 'fork') await ui.forkSession(session);
          else if (action === 'archive') await ui.archiveSession(session);
          else throw new Error('Invalid action');
          ok = true; update();
        } catch { /* The originating host receives a fixed diagnostic only. */ }
        parent.postMessage({ type: 'darask-session-result', node: config.node, workspace: config.workspace, requestId: event.data.requestId, ok }, base);
      }
    };
    window.addEventListener('message', receive);
    const stopWorkspace = ui.workspaces.list.subscribe(update), stopSession = ui.sessions.list.subscribe(update);
    const stopPending = ui.ctx?.get?.('uiSession')?.pendingInteractions?.subscribe?.(update);
    update(); return () => { stopWorkspace(); stopSession(); stopPending?.(); window.removeEventListener('message', receive); };
  };
}

export function remoteHubLocation({ node, host }, workspace) {
  const selected = host.workspaces.find(w => w.id === workspace);
  if (workspace && !selected) throw new Error('選択したリモートワークスペースが見つかりません。');
  return workspace ? workspaceHubUrl(node.id, workspace) : '/';
}

export const remoteBootstrap = config => `(${installRemoteBrowser.toString()})(${scriptJson(config)});`;
export function rewriteRemoteHtml(html, config) {
  const boot = `<script>${remoteBootstrap(config)}</script>`;
  const rewrite = html.replace(/<(?:script|link|img|iframe|source|video|audio|form|a)\b[^>]*>/gi, tag => tag.replace(/\b(src|href|action)=(['"])([^'"]*)\2/gi, (all, attr, quote, value) => {
    const decoded = value.replaceAll('&amp;', '&');
    if (!decoded || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(decoded)) return all;
    const url = new URL(decoded, 'http://dsh.internal/');
    return `${attr}=${quote}${escapeHtml(remoteUrl(config.node, url.pathname + url.search))}${quote}`;
  }));
  if (!/<head(?:\s[^>]*)?>/i.test(rewrite)) throw new Error('接続先の DSH の HTML を確認してください。');
  return rewrite.replace(/<head(?:\s[^>]*)?>/i, match => match + boot);
}

export function patchRemoteWorkspace(source) {
  const marker = 'const uiWorkspace = new UiWorkspaceService(ctx, ctx.remote.directoryPicker, workspaces, sessions);';
  if (!source.includes('id: "@deepseek-ai/dsh-client-ui-workspace"')) return source;
  if (source.split(marker).length !== 2) throw new Error('接続先 DSH のワークスペース UI はこのバージョンに対応していません。');
  return source.replace(marker, marker + '\nctx.effect(() => window.__DARASK_REMOTE_WORKSPACE__?.(uiWorkspace), "darask: remote workspace navigation");');
}

export function patchRemoteLayout(source) {
  const id = '@deepseek-ai/dsh-client-ui-layout', marker = 'window.__ModuleLoader__.load(';
  if (!source.includes(`id: "${id}"`)) return source;
  const patches = [
    ['${cols.sidebar}px minmax(0, 1fr)', '${window.__DARASK_EMBEDDED__ ? 0 : cols.sidebar}px minmax(0, 1fr)'],
    ['children: sidebar\n', 'children: window.__DARASK_EMBEDDED__ ? null : sidebar\n'],
    ['!sidebarCollapsed && (0, react_jsx_runtime.jsx)(DragHandle, {', '!window.__DARASK_EMBEDDED__ && !sidebarCollapsed && (0, react_jsx_runtime.jsx)(DragHandle, {'],
  ];
  // Restrict each replacement to the pinned layout factory; never alter another
  // registration in DSH's combined startup script.
  for (const [match, replacement] of patches) {
    const start = source.indexOf(match), factory = source.lastIndexOf(marker, start), next = source.indexOf(marker, factory + marker.length);
    const owner = /^window\.__ModuleLoader__\.load\(\{\s*id:\s*"([^"]+)"/.exec(source.slice(factory))?.[1];
    if (start < 0 || source.indexOf(match, start + match.length) >= 0 || owner !== id || next >= 0 && start + match.length > next) throw new Error('接続先 DSH の画面構成はこのバージョンに対応していません。');
    source = source.replace(match, replacement);
  }
  return source;
}
