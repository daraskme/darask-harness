import React, { useEffect, useState, useRef, useSyncExternalStore } from 'react';
import { Button, Input, Modal, Tag, Menu, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { sessionActivity, workspaceActivity, sessionActivityLabel } from './session-activity.mjs';
import { WorkspaceSetsEditor, registerWorkspaceSetUi } from './workspace-sets-client.jsx';
import { ConnectionQrTools } from './connection-qr-client.jsx';
import { createWorkspaceNavigation, REMOTE_PANEL } from './workspace-navigation.mjs';
import { KeySharing } from './key-sharing-client.jsx';
import { registerDashboardUi } from './dashboard-client.jsx';

const endpoint = '/api/darask/workspaces';
async function call(body, signal) {
  const response = await fetch(endpoint, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), signal: signal ?? AbortSignal.timeout(45000) });
  const value = await response.json();
  if (!response.ok || value.error) throw new Error(value.error || 'PC に接続できません。');
  return value;
}

export function PcConnections() {
  const [editingId, setEditingId] = useState(null);
  const [data, setData] = useState(null), [name, setName] = useState(''), [url, setUrl] = useState(''), [token, setToken] = useState('');
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const [imported, setImported] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  useEffect(() => { const controller = new AbortController(); call(null, controller.signal).then(setData).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, []);
  async function save() {
    setPending(true); setError(''); setSaved(false);
    try { await call({ action: 'saveNode', id: editingId, name, url, token }); setData(await call()); window.dispatchEvent(new Event('darask-workspaces-changed')); setToken(''); setName(''); setUrl(''); setEditingId(null); setSaved(true); setImported(false); setFormOpen(false); }
    catch (e) { setError(e.message); } finally { setPending(false); }
  }
  async function remove(id) {
    setPending(true); setError('');
    try { await call({ action: 'removeNode', id }); setData(await call()); window.dispatchEvent(new Event('darask-workspaces-changed')); }
    catch (e) { setError(e.message); } finally { setPending(false); }
  }
  return <div className="darask-integrations"><h3>PC の接続</h3>
    <p className="darask-muted">接続先の PC に DSH と DARASK を導入し、QR で登録します。ワークスペースはその PC に作成されます。</p>
    <ConnectionQrTools call={call} disabled={pending} onImport={value => {
      const existing = data?.nodes?.find(node => node.url === value.url);
      setEditingId(existing?.id ?? null); setName(existing?.name ?? value.name); setUrl(value.url); setToken(value.token); setImported(true); setSaved(false); setError(''); setFormOpen(true);
    }} />
    {imported && <p role="status" className="darask-login">{name} の接続情報を読み取りました。下の「接続を確認して保存」で登録できます。</p>}
    {data?.nodes?.map(node => <article className="darask-provider" key={node.id}><header className="darask-provider-header"><div className="darask-provider-name"><h3>{node.name}</h3><span className="darask-meta">{node.url}</span></div><Tag>登録済み</Tag><Button size="sm" disabled={pending} onClick={() => { setEditingId(node.id); setName(node.name); setUrl(node.url); setToken(''); setSaved(false); setImported(false); setFormOpen(true); }}>接続を変更</Button><Button size="sm" disabled={pending} onClick={() => { void remove(node.id); }}>接続を解除</Button></header></article>)}
    <details className="darask-provider darask-pc-manual" open={formOpen} onToggle={event => setFormOpen(event.currentTarget.open)}><summary>{imported ? '読み取った接続情報' : editingId ? '接続情報を変更' : 'URL・トークンを手入力する'}</summary><div className="darask-pc-form">
      <h3>{editingId ? 'PC の接続を変更' : 'PC を追加'}</h3>
      {data?.peers?.length > 0 && <label className="darask-field"><span>Tailscale の PC</span><select disabled={pending} value="" onChange={e => { const peer = data.peers.find(p => p.dnsName === e.target.value); if (peer) { setName(peer.name); setUrl(`https://${peer.dnsName}:8443`); setToken(''); } }}><option value="">一覧から接続先を選択</option>{data.peers.map(peer => <option key={peer.dnsName} value={peer.dnsName}>{peer.name}（{peer.online ? 'オンライン' : 'オフライン'}）</option>)}</select></label>}
      <label className="darask-field"><span>PC の表示名</span><Input value={name} onChange={e => setName(e.target.value)} disabled={pending} placeholder="win / MacBook Air" /></label>
      <label className="darask-field"><span>その PC の DSH の URL</span><Input value={url} onChange={e => { setUrl(e.target.value); setToken(''); }} disabled={pending} placeholder="https://win.….ts.net:8443" autoComplete="off" /></label>
      <label className="darask-field"><span>DSH トークン</span><Input type="password" value={token} onChange={e => setToken(e.target.value.trim())} disabled={pending} autoComplete="new-password" /><small>起動 URL の token= の後の値です。保存済みのトークンは画面に表示しません。</small></label>
      <Button variant="primary" disabled={pending || !name || !url || !token} onClick={() => { void save(); }}>{pending ? '接続を確認中…' : '接続を確認して保存'}</Button>
    </div></details>
    {saved && <p role="status">PC の接続を保存しました。</p>}
    {error && <p className="darask-error" role="alert">{error}</p>}
    {data?.nodes?.length > 0 && <KeySharing nodes={data.nodes} secrets={data.secrets} />}
  </div>;
}

export function WorkspacePanel({ onPicked, navigation }) {
  const [data, setData] = useState(null), [node, setNode] = useState('local'), [inputPath, setInputPath] = useState(''), [name, setName] = useState('');
  const [listing, setListing] = useState(null), [pending, setPending] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null);
  const generation = useRef(0);
  useEffect(() => { const controller = new AbortController(); call(null, controller.signal).then(setData).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => { controller.abort(); generation.current++; }; }, []);
  async function browse(pc = node, value = inputPath) {
    const own = ++generation.current; setPending(true); setError(''); setResult(null);
    try { const response = await call({ action: 'browse', node: pc, path: value }); if (own === generation.current) { setListing(response); setInputPath(response.directory.path); } }
    catch (e) { if (own === generation.current) { setListing(null); setError(e.message); } }
    finally { if (own === generation.current) setPending(false); }
  }
  async function create(action) {
    setPending(true); setError(''); setResult(null);
    try {
      const response = await call({ action, node, path: inputPath, name, requestId: crypto.randomUUID() });
      setResult(response); setName('');
      setData(current => mergeWorkspaceGroup(current, response.sameMachine ? 'local' : node, response.host));
      setListing(current => current ? { ...current, host: response.host } : current);
      window.dispatchEvent(new Event('darask-workspaces-changed'));
      if (onPicked && (node === 'local' || response.sameMachine)) onPicked(response.workspace.path);
    } catch (e) { setError(e.message); } finally { setPending(false); }
  }
  async function openPc(workspaceId = result?.workspace?.id) {
    setPending(true); setError('');
    try {
      await navigation.open(node, workspaceId);
    }
    catch (e) { setError(e.message); }
    finally { setPending(false); }
  }
  return <section className="darask darask-workspaces"><header className="darask-heading"><div><h2>ワークスペース</h2><p>作成先の PC と保存先を選びます。その PC のアクセス権でフォルダーを作成します。</p></div></header>
    <WorkspaceSetsEditor data={data} onPicked={onPicked} />
    <WorkspaceGroups groups={data?.groups ?? []} pending={pending} onOpen={async (group, workspace) => {
      if (group.node === 'local') { onPicked?.(workspace.path); return; }
      setPending(true); setError('');
      try { await navigation.open(group.node, workspace.id); } catch (e) { setError(e.message); } finally { setPending(false); }
    }} localCanOpen={Boolean(onPicked)} />
    <div className="darask-fields">
      <label className="darask-field"><span>作成先の PC</span><select value={node} disabled={pending} onChange={e => { const value = e.target.value; setNode(value); setInputPath(''); setListing(null); setResult(null); void browse(value, ''); }}>
        <option value="local">{data?.host?.name ?? 'この PC'}（この DSH の PC）</option>{data?.nodes?.map(pc => <option key={pc.id} value={pc.id}>{pc.name}</option>)}
      </select></label>
      <p className="darask-muted">別の PC は「設定 → アカウント → PC・Tailscale → PC の接続」で追加できます。</p>
      <label className="darask-field"><span>保存先のフォルダー</span><Input value={inputPath} onChange={e => setInputPath(e.target.value)} disabled={pending} placeholder={node === 'local' ? data?.host?.home : 'C:\\Projects または /Users/名前/Projects'} autoComplete="off" /><small>絶対パスを直接入力するか、フォルダーを参照してください。</small></label>
      <div className="darask-actions"><Button variant="outline" disabled={pending} onClick={() => { void browse(); }}>{pending ? '処理中…' : 'この場所を参照'}</Button><Button disabled={pending} onClick={() => { void browse(node, ''); }}>ホーム</Button>{listing?.directory?.parent && <Button disabled={pending} onClick={() => { void browse(node, listing.directory.parent); }}>上の階層</Button>}{listing?.directory?.roots?.map(root => <Button key={root} disabled={pending} onClick={() => { void browse(node, root); }}>{root}</Button>)}</div>
      {listing && <><p className="darask-meta">接続先: {listing.host.name} · {listing.directory.path}</p><div className="darask-folder-list">{listing.directory.folders.map(folder => <button type="button" key={folder.path} disabled={pending} onClick={() => { void browse(node, folder.path); }}><span aria-hidden="true">▸</span> {folder.name}</button>)}{!listing.directory.folders.length && <p className="darask-muted">子フォルダーはありません。</p>}</div>{listing.directory.truncated && <p className="darask-muted">先頭の 1,000 件を表示しています。保存先は直接入力できます。</p>}</>}
      <label className="darask-field"><span>新しいワークスペース名</span><Input value={name} onChange={e => setName(e.target.value)} disabled={pending} placeholder="my-project" /></label>
      <div className="darask-actions"><Button variant="primary" disabled={pending || !data || !name || !inputPath} onClick={() => { void create('create'); }}>フォルダーを作成して登録</Button><Button variant="outline" disabled={pending || !data || !inputPath} onClick={() => { void create('register'); }}>このフォルダーを登録</Button></div>
      {error && <p className="darask-error" role="alert">{error}</p>}
      {result && <div className="darask-login" role="status"><strong>{result.created ? 'ワークスペースを作成しました。' : 'ワークスペースを登録しました。'}</strong><span>{result.host.name} · {result.workspace.path}</span>
        {node !== 'local' && result.sameMachine && <p>この DSH のワークスペース一覧から開けます。別の DSH へ移動しません。</p>}
        {node !== 'local' && !result.sameMachine && <><p>リモート環境としてこのハブから操作できます。ファイルと処理は {result.host.name} 上で実行されます。</p><Button variant="primary" disabled={pending} onClick={() => { void openPc(); }}>この画面で開く</Button></>}</div>}
    </div>
  </section>;
}

export function mergeWorkspaceGroup(data, node, host) {
  if (!data) return data;
  const name = node === 'local' ? host.name : data.nodes?.find(n => n.id === node)?.name ?? host.name;
  const group = { node, name, hostId: host.id, status: 'online', workspaces: host.workspaces };
  const groups = data.groups ?? [];
  return { ...data, ...(node === 'local' ? { host } : {}), groups: groups.some(g => g.node === node) ? groups.map(g => g.node === node ? group : g) : [...groups, group] };
}

function ActivityMark({ state }) {
  if (!state) return null;
  const label = sessionActivityLabel(state);
  return <span className="darask-session-status" title={label} data-state={state}>
    {state === 'error' ? <span className="darask-session-error" aria-hidden="true">×</span> : <StateDot state={state} />}
    <span className="darask-visually-hidden">{label}</span>
  </span>;
}

export function WorkspaceGroups({ groups, onOpen, pending = false, localCanOpen = false, compact = false }) {
  return <div className={compact ? 'darask-remote-workspaces' : 'darask-workspace-groups'}>{groups.map(group => <section key={group.node} className="darask-workspace-group">
    <h3>{group.name} <span className="darask-muted">{group.node === 'local' ? 'この PC' : 'リモート環境'}{group.status === 'offline' ? ' · オフライン' : ''}</span></h3>
    {group.error && <p className="darask-muted">{group.error}</p>}
    {group.workspaces.map(workspace => <div key={workspace.id} className="darask-workspace-entry">
      <button type="button" disabled={pending || (group.node === 'local' && !localCanOpen)} onClick={() => { void onOpen(group, workspace); }} title={`${group.name} · ${workspace.path}`}>
        <strong><ActivityMark state={workspaceActivity(workspace.sessions)} />{group.node !== 'local' && '🌐 '}{workspace.title}</strong><small>{workspace.path}</small>
      </button>
    </div>)}
    {!group.workspaces.length && <p className="darask-muted">{group.status === 'offline' ? '保存済みの一覧はありません。' : '登録済みのワークスペースはありません。'}</p>}
  </section>)}</div>;
}

export function RemoteWorkspaceRows({ groups, query = '', selected, opened = [], onOpen, onSession, onNew, onManage, onManageSession }) {
  const [details, setDetails] = useState(null);
  const [menu, setMenu] = useState(null), [target, setTarget] = useState(null), [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false), [error, setError] = useState('');
  const normalized = query.trim().toLocaleLowerCase();
  async function save() {
    setPending(true); setError('');
    try {
      if (target.session) await onManageSession(target.group.node, target.workspace.id, target.session.id, target.action, draft.trim());
      else await onManage(target.group, target.workspace, target.action, draft.trim());
      setTarget(null);
    }
    catch (error) { setError(error.message); }
    finally { setPending(false); }
  }
  return <><div className="darask-remote-workspaces">{groups.filter(group => group.node !== 'local').flatMap(group => group.workspaces
    .filter(workspace => `${workspace.title} ${workspace.path} ${group.name}`.toLocaleLowerCase().includes(normalized))
    .map(workspace => {
      const key = `${group.node}:${workspace.id}`, expanded = details === key;
      const active = selected?.node === group.node && selected.workspace === workspace.id;
      const retained = opened.find(entry => entry.node === group.node && entry.workspace === workspace.id) ?? (active ? selected : null);
      return <div key={key} className="darask-workspace-row-wrap">
        <div className="darask-workspace-row" data-active={active || undefined}>
          <button type="button" className="darask-workspace-globe" aria-label={`${workspace.title} の接続情報`} aria-expanded={expanded} onClick={() => setDetails(expanded ? null : key)}>🌐</button>
          <ActivityMark state={workspaceActivity(retained?.sessions)} />
          <button type="button" className="darask-workspace-title" aria-current={active ? 'page' : undefined} onClick={() => { void onOpen(group, workspace); }}>{workspace.title}</button>
          <Menu open={menu === key} onClose={() => setMenu(null)} portal items={[{ id: 'rename', label: '名前を変更' }, { id: 'delete', label: '一覧から削除', danger: true }]} onSelect={action => {
            if (!['rename', 'delete'].includes(action)) return;
            setMenu(null); setTarget({ group, workspace, action }); setDraft(workspace.title); setError('');
          }} anchor={<button type="button" className="darask-workspace-action" aria-label={`${workspace.title} の操作`} aria-haspopup="menu" aria-expanded={menu === key} onClick={() => setMenu(menu === key ? null : key)}>…</button>} />
          <button type="button" className="darask-workspace-action" aria-label={`${workspace.title} にセッションを追加`} onClick={() => { void onNew?.(group, workspace); }}>＋</button>
        </div>
        {expanded && <div className="darask-workspace-info" role="region" aria-label={`${workspace.title} の接続情報`}>
          <strong>{group.name}</strong><span>{workspace.path}</span><span>{group.status === 'offline' ? 'オフライン · 保存済みの一覧' : 'オンライン'}</span>
          {group.error && <span>{group.error}</span>}
        </div>}
        {retained?.sessions?.length > 0 && <div className="darask-workspace-sessions">{retained.sessions.map(session => {
          const sessionKey = `${key}:${session.id}`;
          return <div key={session.id} className="darask-session-row"><ActivityMark state={sessionActivity(session)} /><button type="button" className="darask-session-title" aria-current={active && retained.current === session.id ? 'page' : undefined} onClick={() => onSession?.(session.id, group.node, workspace.id)}>{session.title}</button>
            <Menu open={menu === sessionKey} onClose={() => setMenu(null)} portal items={[{ id: 'rename', label: '名前を変更' }, { id: 'fork', label: 'セッションをフォーク' }, { id: 'archive', label: 'アーカイブ' }]} onSelect={action => {
              if (!['rename', 'fork', 'archive'].includes(action)) return;
              setMenu(null);
              if (action === 'fork') {
                setPending(true); setError('');
                Promise.resolve(onManageSession?.(group.node, workspace.id, session.id, 'fork')).catch(err => setError(err.message)).finally(() => setPending(false));
                return;
              }
              setTarget({ group, workspace, session, action }); setDraft(session.title); setError('');
            }} anchor={<button type="button" className="darask-workspace-action" aria-label={`${session.title} の操作`} aria-haspopup="menu" aria-expanded={menu === sessionKey} onClick={() => setMenu(menu === sessionKey ? null : sessionKey)}>…</button>} />
          </div>;
        })}</div>}
      </div>;
    }))}</div>
    {error && !target && <p role="alert" className="darask-error">{error}</p>}
    <Modal open={target !== null} onClose={() => { if (!pending) setTarget(null); }} title={target?.session ? target.action === 'rename' ? 'セッションの名前を変更' : 'セッションをアーカイブ' : target?.action === 'rename' ? 'ワークスペースの名前を変更' : 'ワークスペースを一覧から削除'} closeLabel="閉じる">
      {target && <div className="darask darask-workspace-dialog">
        {target.action === 'rename' ? <label className="darask-field"><span>表示名</span><Input value={draft} maxLength={120} autoFocus disabled={pending} onChange={event => setDraft(event.target.value)} /></label>
          : target.session ? <p>「{target.session.title}」をアーカイブして一覧から隠します。会話データは保持されます。</p> : <p>「{target.workspace.title}」を一覧から削除します。フォルダーと会話データは残ります。</p>}
        {error && <p role="alert" className="darask-error">{error}</p>}
        <div className="darask-actions"><Button disabled={pending} onClick={() => setTarget(null)}>キャンセル</Button><Button variant="primary" disabled={pending || target.action === 'rename' && !draft.trim()} onClick={() => { void save(); }}>{pending ? '保存中…' : target.action === 'rename' ? '名前を変更' : target.session ? 'アーカイブ' : '一覧から削除'}</Button></div>
      </div>}
    </Modal></>;
}

function RemoteWorkspaceSidebar({ query, navigation }) {
  const [data, setData] = useState(null), [error, setError] = useState('');
  const selected = useSyncExternalStore(navigation.subscribe, navigation.getSnapshot, navigation.getSnapshot);
  const opened = useSyncExternalStore(navigation.subscribe, navigation.getOpenedSnapshot, navigation.getOpenedSnapshot);
  useEffect(() => {
    const controller = new AbortController(); let reading = false, refreshAgain = false;
    const refresh = async () => {
      if (reading) { refreshAgain = true; return; } reading = true;
      do {
        refreshAgain = false;
        try { const value = await call(null, controller.signal); if (!controller.signal.aborted) { setData(value); setError(''); } }
        catch (e) { if (!controller.signal.aborted) setError(e.message); }
      } while (refreshAgain && !controller.signal.aborted);
      reading = false;
    };
    void refresh();
    window.addEventListener('darask-workspaces-changed', refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('darask-workspaces-changed', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  const groups = data?.groups?.filter(g => g.node !== 'local') ?? [];
  async function manage(group, workspace, action, title) {
    const value = await call({ action, node: group.node, workspaceId: workspace.id, ...(action === 'rename' ? { title } : {}) });
    setData(current => mergeWorkspaceGroup(current, group.node, value.host));
    navigation.workspaceChanged(group.node, workspace.id, { deleted: action === 'delete', title });
    window.dispatchEvent(new Event('darask-workspaces-changed'));
  }
  return <div className="darask darask-workspaces-sidebar"><RemoteWorkspaceRows groups={groups} query={query} selected={selected} opened={opened} onOpen={(group, workspace) => navigation.open(group.node, workspace.id)} onSession={navigation.openSession} onNew={(group, workspace) => navigation.startSession(group.node, workspace.id)} onManage={manage} onManageSession={navigation.manageSession} />{error && <p className="darask-error" role="alert">{error}</p>}</div>;
}

function WorkspaceDirectoryFlow({ open, onCancel, onPicked, navigation }) {
  const openNavigation = { open: (...args) => { onCancel(); return navigation.open(...args); } };
  return <Modal open={open} onClose={onCancel} title="ワークスペースを選択" closeLabel="閉じる" className="darask-usage-modal">{open && <WorkspacePanel onPicked={onPicked} navigation={openNavigation} />}</Modal>;
}

function WorkspaceNavigationBridge({ navigation, usePanelInfo }) {
  const panel = usePanelInfo(info => info.activePanelId);
  // Observe before restoring so the initial conversation render cannot cancel
  // the remote selection restored by the subsequent effect.
  useEffect(() => navigation.observePanel(panel), [navigation, panel]);
  useEffect(() => {
    const restore = () => { void navigation.restore(); };
    restore(); window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [navigation]);
  return null;
}

function RemoteWorkspaceFrame({ navigation, selected, visible }) {
  const frame = useRef(null);
  const [frameError, setFrameError] = useState('');
  const themeObserver = useRef(null);
  useEffect(() => {
    setFrameError('');
    const receive = event => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.node !== selected?.node) return;
      if (event.data.type === 'darask-remote-error' && typeof event.data.message === 'string') setFrameError(event.data.message);
      if (event.data.type === 'darask-workspace-sessions') navigation.receiveSessions(event.data);
      if (event.data.type === 'darask-session-result') navigation.receiveSessionResult(event.data);
    };
    const detach = navigation.attachFrame(selected.node, selected.workspace, message => frame.current?.contentWindow?.postMessage(message, window.location.origin));
    window.addEventListener('message', receive);
    return () => { detach(); themeObserver.current?.disconnect(); window.removeEventListener('message', receive); };
  }, [navigation, selected?.node, selected?.workspace, selected?.src]);
  function loaded() {
    themeObserver.current?.disconnect();
    const win = frame.current?.contentWindow;
    const child = frame.current?.contentDocument;
    if (!win || win.location.href === 'about:blank' || !child?.body) return;
    if (!win.__DARASK_EMBEDDED__) { setFrameError('画面を読み込めません。接続先の DSH を確認して再試行してください。'); return; }
    setFrameError('');
    const sync = () => {
      const dark = document.body.hasAttribute('data-ds-dark-theme');
      if (child.body.hasAttribute('data-ds-dark-theme') !== dark) child.body.toggleAttribute('data-ds-dark-theme', dark);
    };
    const observer = new MutationObserver(sync); themeObserver.current = observer;
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] });
    observer.observe(child.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] }); sync();
  }
  if (!selected) return null;
  const error = selected.error || frameError;
  return <div className="darask-workspace-main" hidden={!visible}>
    {selected.loading && <p className="darask-workspace-status" role="status">ワークスペースを開いています…</p>}
    {error && <div className="darask-workspace-status" role="alert"><p>{error}</p><Button onClick={() => { void navigation.open(selected.node, selected.workspace, { replace: true, force: true }); }}>再試行</Button></div>}
    {selected.src && <iframe ref={frame} key={selected.src} src={selected.src} title={selected.title || 'ワークスペース'} onLoad={loaded} allow="clipboard-read; clipboard-write" />}
  </div>;
}
export function RemoteWorkspacePool({ navigation, usePanelInfo }) {
  const selected = useSyncExternalStore(navigation.subscribe, navigation.getSnapshot, navigation.getSnapshot);
  const opened = useSyncExternalStore(navigation.subscribe, navigation.getOpenedSnapshot, navigation.getOpenedSnapshot);
  const active = usePanelInfo(info => info.activePanelId) === REMOTE_PANEL;
  return <div className="darask-workspace-pool" hidden={!active}>{opened.map(entry => <RemoteWorkspaceFrame key={`${entry.node}:${entry.workspace}`} navigation={navigation} selected={entry} visible={active && selected?.node === entry.node && selected.workspace === entry.workspace} />)}</div>;
}
function ArchivePanel() {
  const [data, setData] = useState(null), [error, setError] = useState(''), [pending, setPending] = useState(false), [target, setTarget] = useState(null);
  async function load(signal) {
    const response = await fetch('/api/darask/archives', { credentials: 'same-origin', cache: 'no-store', signal: signal ?? AbortSignal.timeout(20000) });
    const value = await response.json();
    if (!response.ok || value.error) throw new Error(value.error || 'アーカイブを取得できません。');
    setData(value); setError('');
  }
  useEffect(() => { const controller = new AbortController(); load(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, []);
  async function act(action, sessionId) {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/darask/archives', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, sessionId }) });
      const value = await response.json();
      if (!response.ok || value.error) throw new Error(value.error || '操作できませんでした。');
      setData(value); setTarget(null); window.dispatchEvent(new Event('darask-workspaces-changed'));
    } catch (e) { setError(e.message); } finally { setPending(false); }
  }
  return <section className="darask">
    <header className="darask-heading"><div><h2>アーカイブ</h2><p>一覧から隠した会話を戻すか、会話データを削除します。復元するとサイドバーに再表示されます。</p></div></header>
    {error && <p role="alert" className="darask-error">{error}</p>}
    {!data && !error && <p role="status">読み込み中…</p>}
    {data && data.items.length === 0 && <p className="darask-muted">アーカイブした会話はありません。</p>}
    {data?.items?.length > 0 && <div className="darask-archive-list">{data.items.map(item => <article key={item.id} className="darask-provider">
      <header className="darask-provider-header"><div className="darask-provider-name"><h3>{item.title}</h3><span className="darask-meta">{item.workspaceTitle}{item.path ? ` · ${item.path}` : ''}</span></div>
        <div className="darask-actions"><Button disabled={pending} onClick={() => { void act('restore', item.id); }}>一覧に戻す</Button><Button disabled={pending} onClick={() => setTarget(item)}>削除</Button></div>
      </header>
    </article>)}</div>}
    <Modal open={target !== null} onClose={() => { if (!pending) setTarget(null); }} title="アーカイブを削除" closeLabel="閉じる">
      {target && <div className="darask darask-workspace-dialog">
        <p>「{target.title}」の会話データを削除します。この操作は取り消せません。</p>
        <div className="darask-actions"><Button disabled={pending} onClick={() => setTarget(null)}>キャンセル</Button><Button variant="primary" disabled={pending} onClick={() => { void act('delete', target.id); }}>{pending ? '削除中…' : '削除'}</Button></div>
      </div>}
    </Modal>
  </section>;
}
function RemoteWorkspacePanel() { return null; }
export function registerWorkspaceUi(ctx) {
  registerWorkspaceSetUi(ctx);
  const navigation = createWorkspaceNavigation({ getLayout: () => ctx.layout, getWindow: () => window, request: call });
  ctx.effect(() => () => navigation.dispose());
  const inject = () => ({ navigation });
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: REMOTE_PANEL, inject }, RemoteWorkspacePanel));
  ctx.slots.inject('main.persistent', () => ctx.slots.register({ name: 'main.persistent', inject }, RemoteWorkspacePool));
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'darask-workspace-navigation', inject }, WorkspaceNavigationBridge));
  ctx.slots.inject('sidebar.workspaces.remote', () => ctx.slots.register({ name: 'sidebar.workspaces.remote', inject }, RemoteWorkspaceSidebar));
  registerDashboardUi(ctx, { navigation, loadGroups: signal => call(null, signal) });
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'darask-workspaces', order: 12, label: () => 'ワークスペース', inject }, WorkspacePanel));
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'darask-archives', order: 13, label: () => 'アーカイブ' }, ArchivePanel));
  for (const slot of ['conversation.hero.workspace.directoryFlow', 'sidebar.workspaces.directoryFlow']) {
    ctx.slots.inject(slot, () => ctx.slots.register({ name: slot, priority: -20, inject }, WorkspaceDirectoryFlow));
  }
}
