import { homedir, hostname } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, realpath, stat, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { modelEndpoint } from './local-settings.mjs';
import { publicOrigin } from './http.mjs';
import { installedArchive } from './host-update.mjs';
import QRCode from 'qrcode';
import { parseConnectionLink } from './connection-link.mjs';
import { shareStatus, applySecretPush, pushPayload, readSharedAt, catalogRows, CATALOG_REFS } from './shared-credentials.mjs';

const BASE = '/api/darask/workspaces';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function workspaceName(value, platform = process.platform) {
  if (typeof value !== 'string' || !value.trim() || value.length > 120 || /^[. ]+$/.test(value) || /[\\/\x00-\x1f]/.test(value)) throw new Error('フォルダー名を一つ指定してください。');
  if (platform === 'win32' && (/[<>:"|?*]|[. ]$/.test(value) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value))) throw new Error('Windows で使用できないフォルダー名です。');
  return value;
}
export function workspaceHostUrl(value) {
  const url = new URL(value);
  if (url.pathname !== '/' || url.username || url.password || url.hash || url.search) throw new Error('接続先には PC の DSH の URL だけを指定してください。');
  modelEndpoint(`${url.origin}/v1`);
  return url.origin;
}
export async function browseWorkspacePath(input = homedir()) {
  if (typeof input !== 'string' || !path.isAbsolute(input) || /[\x00-\x1f]/.test(input)) throw new Error('保存先は絶対パスで指定してください。');
  const current = await realpath(input);
  if (!(await stat(current)).isDirectory()) throw new Error('保存先がフォルダーではありません。');
  const entries = (await readdir(current, { withFileTypes: true })).filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const roots = process.platform === 'win32'
    ? (await Promise.all('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(async letter => { const drive = `${letter}:\\`; try { return (await stat(drive)).isDirectory() ? drive : null; } catch { return null; } }))).filter(Boolean)
    : ['/'];
  return { path: current, parent: path.dirname(current) === current ? null : path.dirname(current), home: homedir(), roots,
    folders: entries.slice(0, 1000).map(e => ({ name: e.name, path: path.join(current, e.name) })), truncated: entries.length > 1000 };
}

/** Each host registers its own native DSH workspace. Remote paths are never
 * interpreted as local paths on the hub, including same-spelled C:\ paths. */
/** Fresh, value-free view of the credentials this PC received from a hub. */
export async function sharedCredentialStatus(credentials) {
  const sharedAt = await readSharedAt(credentials);
  return shareStatus(credentials, { refs: CATALOG_REFS, sharedAt });
}
export function createWorkspaceHub({ directory, credentials, registry, peers = async () => [], connection, tailscale, fetch: fetchImpl = globalThis.fetch }) {
  const file = path.join(directory, 'workspace-hosts.json');
  const catalogFile = path.join(directory, 'workspace-catalog.json');
  const releaseFile = new URL('../package.json', import.meta.url);
  let release = '0.0.0', releaseDigest;
  let catalog = {}, catalogTail = Promise.resolve(), refreshingCatalog;
  let state = { id: randomUUID(), nodes: [] }, chain = Promise.resolve();
  const operations = new Map();
  const remoteSessions = new Map(), remoteListeners = new Set();
  const invalidateRemote = id => { remoteSessions.delete(id); for (const fn of remoteListeners) fn(id); };
  const ref = id => `DARASK_WORKSPACE_${id.replaceAll('-', '').toUpperCase()}`;
  const cookieRef = id => `${ref(id)}_SESSION`;
  const tokenDigest = token => createHash('sha256').update(token).digest('hex');
  async function savedCookie(node, token) {
    if (!node.hostId) return;
    const value = (await credentials.resolve(cookieRef(node.id)))?.value;
    if (!value) return;
    let saved;
    try { saved = JSON.parse(value); } catch { return; }
    if (saved.version === 1 && saved.origin === node.url && saved.hostId === node.hostId && saved.tokenDigest === tokenDigest(token)
      && typeof saved.cookie === 'string' && saved.cookie.length < 16384 && /^dsh-auth-[A-Za-z0-9_-]+=[A-Za-z0-9_.-]+$/.test(saved.cookie)) return saved.cookie;
  }
  async function rememberCookie(node, token, cookie) {
    // Keep the authority-bound session in DSH's credential store, never in the
    // public node/catalog files. Launch tokens change when the remote restarts.
    await credentials.set(cookieRef(node.id), JSON.stringify({ version: 1, origin: node.url, hostId: node.hostId, tokenDigest: tokenDigest(token), cookie }));
  }
  const info = () => ({ id: state.id, name: hostname(), platform: process.platform, home: homedir(), version: 1, release, releaseDigest,
    workspaces: registry.list().map(w => ({ id: w.id, title: w.title, path: w.path })) });
  /** Fresh, value-free view of the credentials this PC received from a hub. */
  const sharedCredentialStatusFor = () => sharedCredentialStatus(credentials);
  async function shareCredentials(input) {
    if (!Array.isArray(input.refs) && input.refs !== undefined) throw new Error('共有するキーの選択が正しくありません。');
    const secrets = input.revoke === true ? Object.fromEntries((input.refs ?? CATALOG_REFS).map(ref => [ref, null])) : input.secrets;
    const result = await applySecretPush(credentials, secrets);
    invalidateRemote(state.id);
    // Keep `host` in the reply: every answer on this channel is host-checked so
    // a stale node record cannot apply a push to a different PC.
    return { host: info(), ...result, credentials: await sharedCredentialStatusFor() };
  }
  const sameMachine = host => host?.id === state.id;
  async function persist() {
    await mkdir(directory, { recursive: true });
    const tmp = `${file}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 }); await rename(tmp, file);
  }
  function remember(node, host, expected) {
    const task = catalogTail.catch(() => {}).then(async () => {
      if (!state.nodes.some(n => n.id === node.id && n.hostId === host.id)) return;
      // A list request started before a registration must not erase its result.
      if (expected && catalog[node.id] !== expected.entry) return catalog[node.id];
      const workspaces = host.workspaces.map(w => ({ id: w.id, title: w.title, path: w.path }));
      const next = { ...catalog, [node.id]: { hostId: host.id, workspaces, updatedAt: new Date().toISOString() } };
      const tmp = `${catalogFile}.${randomUUID()}.tmp`;
      await writeFile(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
      await rename(tmp, catalogFile);
      catalog = next;
      return catalog[node.id];
    });
    catalogTail = task;
    return task;
  }
  function workspaceCatalog() {
    if (refreshingCatalog) return refreshingCatalog;
    refreshingCatalog = (async () => {
      const groups = await Promise.all(state.nodes.filter(n => n.hostId !== state.id).map(async node => {
        const expected = { entry: catalog[node.id] };
        const cached = catalog[node.id]?.hostId === node.hostId ? catalog[node.id] : null;
        try {
          // The proxy session cache may still contain the list from 30 seconds ago.
          const { host } = await request(node, { action: 'info' });
          const saved = await remember(node, host, expected);
          if (!saved) return null;
          return { node: node.id, name: node.name, hostId: host.id, status: 'online', workspaces: saved.workspaces, updatedAt: saved.updatedAt };
        } catch {
          const last = catalog[node.id]?.hostId === node.hostId ? catalog[node.id] : cached;
          return { node: node.id, name: node.name, hostId: node.hostId, status: 'offline', workspaces: last?.workspaces ?? [], updatedAt: last?.updatedAt ?? null,
            error: '接続できません。前回取得したワークスペースを表示しています。' };
        }
      }));
      return [{ node: 'local', name: hostname(), hostId: state.id, status: 'online', workspaces: info().workspaces }, ...groups.filter(g => g && state.nodes.some(n => n.id === g.node && n.hostId === g.hostId))];
    })().finally(() => { refreshingCatalog = undefined; });
    return refreshingCatalog;
  }
  async function cookieFor(node, token) {
    const result = await fetchImpl(`${node.url}/?token=${encodeURIComponent(token)}`, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
    const cookies = result.headers.getSetCookie().map(value => value.split(';', 1)[0]).filter(value => /^dsh-auth-[A-Za-z0-9_-]+=[A-Za-z0-9_.-]+$/.test(value));
    if (![200, 302, 303].includes(result.status) || !cookies.length) throw new Error('接続先の DSH トークンを確認してください。');
    if (cookies.length !== 1) throw new Error('接続先の DSH 認証情報を確認してください。');
    return cookies[0];
  }
  async function authenticatedRequest(node, action, token) {
    if (token === undefined) token = (await credentials.resolve(ref(node.id)))?.value;
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{20,512}$/.test(token)) throw new Error('設定の「アカウント」で、この PC の DSH トークンを登録してください。');
    const saved = await savedCookie(node, token);
    let cookie = saved ?? await cookieFor(node, token);
    const send = () => fetchImpl(`${node.url}${BASE}/local`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: node.url, Cookie: cookie },
      body: JSON.stringify({ ...action, expectedHost: node.hostId }), redirect: 'error', signal: AbortSignal.timeout(15000) });
    let result = await send();
    // The native authentication guard rejects before dispatching an action.
    // Only that rejection permits one retry; never retry other mutation errors.
    if (saved && [401, 403].includes(result.status)) { await result.body?.cancel(); cookie = await cookieFor(node, token); result = await send(); }
    if ([401, 403].includes(result.status)) throw new Error('接続先の DSH 認証が切れました。設定の「アカウント」で PC の接続情報を更新してください。');
    const body = await result.json();
    if (!result.ok || body.error) throw new Error(body.error || '接続先の DSH で処理できませんでした。');
    if (node.hostId && body.host?.id !== node.hostId) throw new Error('接続先の PC が変更されています。接続設定を確認してください。');
    if (cookie !== saved && state.nodes.includes(node)) await rememberCookie(node, token, cookie);
    return { body, cookie };
  }
  const request = async (node, action, token) => (await authenticatedRequest(node, action, token)).body;
  async function remoteConnection(id) {
    const node = state.nodes.find(n => n.id === id);
    if (!node || !uuid(id)) throw new Error('接続先の PC を登録してください。');
    const token = (await credentials.resolve(ref(id)))?.value;
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{20,512}$/.test(token)) throw new Error('PC の接続情報を更新してください。');
    const fingerprint = JSON.stringify([node.url, node.hostId, token]);
    const cached = remoteSessions.get(id);
    if (cached?.fingerprint === fingerprint && cached.until > Date.now()) return cached.promise;
    const entry = { fingerprint, until: Date.now() + 30000 };
    entry.promise = (async () => {
      const { body: { host }, cookie } = await authenticatedRequest(node, { action: 'info' }, token);
      if (sameMachine(host)) throw new Error('これはハブ自身です。「この PC」から開いてください。');
      if (state.nodes.find(n => n.id === id) !== node) throw new Error('PC の接続設定が変更されました。開き直してください。');
      return { node: { ...node }, cookie, host };
    })().catch(error => { if (remoteSessions.get(id) === entry) remoteSessions.delete(id); throw error; });
    remoteSessions.set(id, entry);
    return entry.promise;
  }
  async function local(action) {
    if (action.expectedHost && action.expectedHost !== state.id) throw new Error('選択した PC と接続先が一致しません。');
    if (action.action === 'info') return { host: info(), credentials: await sharedCredentialStatusFor() };
    if (action.action === 'shareCredentials') return shareCredentials(action);
    if (action.action === 'browse') return { host: info(), directory: await browseWorkspacePath(action.path || homedir()) };
    if (!['create', 'register'].includes(action.action)) throw new Error('ワークスペースの操作を確認してください。');
    if (!uuid(action.requestId)) throw new Error('作成リクエストの ID が無効です。');
    const fingerprint = JSON.stringify([action.action, action.path, action.name]);
    const held = operations.get(action.requestId);
    if (held) { if (held.fingerprint !== fingerprint) throw new Error('作成リクエストの内容が一致しません。'); return held.task; }
    const task = chain.catch(() => {}).then(async () => {
      const parent = await browseWorkspacePath(action.path || homedir());
      let target = parent.path;
      if (action.action === 'create') {
        target = path.join(parent.path, workspaceName(action.name));
        try { await mkdir(target); } catch (e) { if (e.code === 'EEXIST') throw new Error('同名のフォルダーが存在します。「このフォルダーを登録」を使ってください。'); throw e; }
      }
      let workspace;
      try { workspace = await registry.create(target); }
      catch { throw new Error(`フォルダーは ${target} にあります。DSH への登録に失敗したため、場所を確認して「このフォルダーを登録」を実行してください。`); }
      return { host: info(), workspace: { id: workspace.id, title: workspace.title, path: workspace.path }, created: action.action === 'create' };
    });
    chain = task; operations.set(action.requestId, { fingerprint, task });
    if (operations.size > 200) operations.delete(operations.keys().next().value);
    return task;
  }
  async function action(input) {
    if (input.action === 'connectionQr') {
      const network = await tailscale?.status();
      if (!network?.connected || network.serve !== 'on' || !network.url) throw new Error('Tailscale に接続し、この画面の Tailscale 共有を開始してください。');
      if (typeof connection?.authenticatedUrl !== 'function') throw new Error('DSH の認証リンクを取得できません。DSH を更新してください。');
      const url = connection.authenticatedUrl(network.url);
      const parsed = parseConnectionLink(url);
      if (parsed.url !== new URL(network.url).origin) throw new Error('Tailscale の接続先を確認してください。');
      return { host: { id: state.id, name: hostname() }, origin: parsed.url, url,
        image: await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', width: 720, margin: 4, color: { dark: '#12202C', light: '#FFFFFF' } }) };
    }
    if (input.action === 'saveNode') {
      const id = input.id || randomUUID();
      if (!uuid(id) || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 100) throw new Error('PC の名前を確認してください。');
      const node = { id, name: input.name.trim(), url: workspaceHostUrl(input.url) };
      const old = state.nodes.find(n => n.id === id);
      const token = input.token || (old?.url === node.url ? (await credentials.resolve(ref(id)))?.value : null);
      const { body: result, cookie } = await authenticatedRequest(node, { action: 'info' }, token);
      if (!uuid(result.host?.id) || result.host.version !== 1) throw new Error('接続先に対応する DARASK プラグインを導入してください。');
      if (result.host.id === state.id) throw new Error('これは現在の PC です。作成先に「この PC」を選んでください。');
      if (state.nodes.some(n => n.id !== id && n.hostId === result.host.id)) throw new Error('この PC はすでに登録されています。');
      node.hostId = result.host.id;
      await credentials.set(ref(id), token);
      await rememberCookie(node, token, cookie);
      state.nodes = [...state.nodes.filter(n => n.id !== id), node]; await persist();
      await remember(node, result.host);
      invalidateRemote(id);
      return { nodes: state.nodes };
    }
    if (input.action === 'removeNode') {
      if (!uuid(input.id)) throw new Error('PC の ID を確認してください。');
      state.nodes = state.nodes.filter(n => n.id !== input.id); await persist();
      // Stored credential can be reused only after an explicit new connection.
      await credentials.unset(ref(input.id)); await credentials.unset(cookieRef(input.id)); invalidateRemote(input.id); return { nodes: state.nodes };
    }
    if (input.action === 'shareCredentials') {
      const ids = Array.isArray(input.refs) ? input.refs : CATALOG_REFS;
      if (ids.some(ref => !CATALOG_REFS.includes(ref))) throw new Error('共有するキーの選択が正しくありません。');
      if (input.revoke !== true && ids.length === 0) throw new Error('共有するキーを選択してください。');
      // Values are resolved here, on the hub that owns them, and the browser
      // never sees them: it only names the references to push or revoke.
      const { secrets, missing } = input.revoke === true ? { secrets: Object.fromEntries(ids.map(ref => [ref, null])), missing: [] } : await pushPayload(credentials, ids);
      if (!missing.length && Object.keys(secrets).length === 0) throw new Error('共有できるキーがありません。先にアカウント画面で登録してください。');
      const targets = input.node ? state.nodes.filter(n => n.id === input.node) : [...state.nodes];
      if (!targets.length) throw new Error('共有先の PC を登録してください。');
      const results = [];
      for (const node of targets) {
        try {
          const remote = await request(node, { action: 'shareCredentials', refs: ids, secrets });
          results.push({ node: node.id, name: node.name, ...remote });
        } catch (error) { results.push({ node: node.id, name: node.name, error: error.message }); }
      }
      return { results, missing };
    }

    if (input.node === 'local') return local(input);
    const node = state.nodes.find(n => n.id === input.node);
    if (!node) throw new Error('作成先の PC を選択してください。');
    if (['rename', 'delete'].includes(input.action)) {
      if (!uuid(input.workspaceId)) throw new Error('ワークスペースの ID を確認してください。');
      const title = typeof input.title === 'string' ? input.title.trim() : '';
      if (input.action === 'rename' && (!title || title.length > 120 || /[\x00-\x1f]/.test(title))) throw new Error('名前は 1〜120 文字で入力してください。');
      const remote = await remoteConnection(node.id);
      if (!remote.host.workspaces.some(workspace => workspace.id === input.workspaceId)) throw new Error('選択したワークスペースが見つかりません。');
      const method = `workspace/${input.action}`;
      const response = await fetchImpl(`${node.url}/api/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: node.url, Cookie: remote.cookie },
        body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method, payload: { args: { request: { workspaceId: input.workspaceId, ...(input.action === 'rename' ? { title } : {}) } } } }),
        redirect: 'error', signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || !result.result?.ok) {
        const code = result.result?.error?.code;
        if (code === 'workspace/name-conflict') throw new Error('その PC には同じ名前のワークスペースがあります。');
        throw new Error('ワークスペースを変更できませんでした。接続先の状態を確認してください。');
      }
      remoteSessions.delete(node.id);
      const updated = await request(node, { action: 'info' });
      await remember(node, updated.host);
      return { ...updated, deleted: input.action === 'delete' };
    }
    if (['info', 'browse', 'create', 'register', 'open'].includes(input.action)) {
      let remote;
      try { remote = input.action === 'open' ? { host: node.hostId === state.id ? info() : (await remoteConnection(node.id)).host } : await request(node, input); }
      catch (e) {
        if (['create', 'register'].includes(input.action)) throw new Error(`相手の PC で結果を確認してください。自動で再送はしません。${e.message}`);
        throw e;
      }
      if (sameMachine(remote.host)) {
        if (input.action === 'open') return { host: info(), sameMachine: true };
        if (input.action === 'info' || input.action === 'browse') return { ...remote, host: info(), sameMachine: true };
        const adopted = await local({ action: 'register', path: remote.workspace.path, requestId: randomUUID() });
        return { ...adopted, created: remote.created === true, sameMachine: true };
      }
      if (['create', 'register'].includes(input.action)) {
        remoteSessions.delete(node.id);
        await remember(node, remote.host);
      }
      if (input.action === 'open') {
        if (input.workspaceId && !remote.host.workspaces.some(w => w.id === input.workspaceId)) throw new Error('選択したリモートワークスペースが見つかりません。');
        remoteSessions.delete(node.id);
        return { url: `/api/darask/remote?node=${encodeURIComponent(node.id)}${input.workspaceId ? `&workspace=${encodeURIComponent(input.workspaceId)}` : ''}`, host: remote.host };
      }
      return remote;
    }
    throw new Error('ワークスペースの操作を確認してください。');
  }
  const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  // Per-PC credential status for the settings screen. The library route carries
  // every value so a remote target can be asked without a loopback fetch, which
  // the token-bound remote channel could not authenticate.
  const catalogHandler = async incoming => {
    try { publicOrigin(incoming); } catch { return json({ error: 'この接続元からは操作できません。' }, 403); }
    if (incoming.method !== 'GET') return json({ error: 'GET を使用してください。' }, 405);
    try {
      const status = async node => ({ node: node.id, name: node.name,
        credentials: await sharedCredentialStatus(credentials) });
      const node = new URL(incoming.url).searchParams.get('node');
      if (!node) return json(await status({ id: 'local', name: hostname() }));
      const target = state.nodes.find(n => n.id === node);
      if (!target) throw new Error('共有先の PC を登録してください。');
      const remote = await request(target, { action: 'info' });
      return json({ node: target.id, name: target.name, credentials: remote.credentials ?? [] });
    } catch (error) {
      return json({ error: /^[ぁ-んァ-ヶ一-龯]|^Windows/.test(error.message) ? error.message : 'PC に接続できません。DSH の起動、Tailscale とトークンを確認してください。' }, 400);
    }
  };
  const handler = localOnly => async request => {
    if (request.method === 'GET') {
      const [groups, devices, hubCredentials] = await Promise.all([workspaceCatalog(), peers(), sharedCredentialStatusFor()]);
      const hub = Object.fromEntries(hubCredentials.map(row => [row.ref, row.configured === true]));
      return json({ host: info(), nodes: state.nodes.map(n => ({ ...n, sameMachine: n.hostId === state.id })), peers: devices, groups,
        secrets: catalogRows().map(row => ({ ...row, available: hub[row.ref] === true })) });
    }
    try {
      publicOrigin(request);
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'JSON 形式で送信してください。' }, 415);
      const text = await request.text(); if (Buffer.byteLength(text) > 16384) return json({ error: '入力が長すぎます。' }, 413);
      const input = JSON.parse(text);
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('入力を確認してください。');
      return json(await (localOnly ? local(input) : action(input)));
    } catch (error) {
      const code = { EACCES: '保存先フォルダーへのアクセス権がありません。', EPERM: '保存先フォルダーへのアクセス権がありません。', ENOENT: '保存先フォルダーが見つかりません。' }[error.code];
      return json({ error: code || (/^[ぁ-んァ-ヶ一-龯]|^Windows/.test(error.message) ? error.message : 'PC に接続できません。DSH の起動、Tailscale とトークンを確認してください。') }, 400);
    }
  };
  return { async initialize() {
      try { state = JSON.parse(await readFile(file, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; await persist(); }
      try { catalog = JSON.parse(await readFile(catalogFile, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      try { release = JSON.parse(await readFile(releaseFile, 'utf8')).version || release; } catch {}
      try { releaseDigest = (await installedArchive())?.sha256; } catch {}
    }, local, action, info, remoteConnection, invalidateRemote, workspaceCatalog,
    listNodes() { return state.nodes.filter(n => n.hostId !== state.id); },
    onRemoteChange(fn) { remoteListeners.add(fn); return () => remoteListeners.delete(fn); },
    routes: [{ path: BASE, methods: ['GET', 'POST'], requestBody: 'buffered', fetch: handler(false) }, { path: `${BASE}/local`, methods: ['POST'], requestBody: 'buffered', fetch: handler(true) }, { path: `${BASE}/status`, methods: ['GET'], requestBody: 'buffered', fetch: catalogHandler }] };
}
