import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { once } from 'node:events';
import vm from 'node:vm';
import { createRemoteProxy, remoteResource } from '../src/remote-proxy.mjs';
import { remoteUrl, REMOTE_SOCKET, REMOTE_ASSETS, remoteBootstrap, patchRemoteWorkspace, patchRemoteLayout, rewriteRemoteHtml } from '../src/remote-browser.mjs';
const require = createRequire(import.meta.url);
const { WebSocket, WebSocketServer } = createRequire(new URL('../vendor/dsh-bridge-gateway/package.json', import.meta.url))('ws');
const id = '00000000-0000-4000-8000-000000000001';
const host = { workspaces: [{ id: 'project', path: 'F:\\H3 concept\\h3-workspace' }] };
async function listening(server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); return `http://127.0.0.1:${server.address().port}`; }
function hubFor(origin) {
  const listeners = new Set();
  return { calls: 0, invalidations: 0,
    async remoteConnection(node) { this.calls++; if (node !== id) throw new Error('未登録の PC です。'); return { node: { id, name: 'win', url: origin }, cookie: 'dsh-auth-remote=remote-only', host }; },
    onRemoteChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    invalidateRemote(node) { this.invalidations++; for (const fn of listeners) fn(node); },
  };
}
test('proxy rejects foreign resources and origins before credential lookup', async t => {
  for (const path of ['https://evil.test/', '//evil.test/', '/\\evil.test/', '/x#hash', '/x\n', '/api/darask/remote?node=x']) assert.throws(() => remoteResource(path, 'https://win.tail.test'));
  assert.equal(remoteResource('/plugins/??a.js,b.js&rev=123', 'https://win.tail.test').pathname, '/plugins/');
  const hub = hubFor('https://win.tail.test'), proxy = createRemoteProxy({ hub, connection: {} }); t.after(() => proxy.dispose());
  const response = await proxy.route.fetch(new Request('https://hub.test' + remoteUrl(id, '/api/x'), { headers: { Origin: 'https://evil.test' } }));
  assert.equal(response.status, 403); assert.equal(hub.calls, 0);
});
test('real HTTP carrier handles GET, POST, assets and redirects without leaking either PC cookie', async t => {
  const seen = [];
  const remote = createServer(async (req, res) => {
    const parts = []; for await (const part of req) parts.push(part);
    seen.push({ path: req.url, method: req.method, headers: req.headers, body: Buffer.concat(parts) });
    res.setHeader('Set-Cookie', 'remote-secret=new; Path=/');
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'"); res.end('<html><head><script src="/app.js"></script></head><body>win</body></html>'); }
    else if (req.url === '/redirect') { res.writeHead(303, { Location: '/files?q=a%20b' }); res.end(); }
    else if (req.url === '/external') { res.writeHead(303, { Location: 'https://evil.test/' }); res.end(); }
    else if (req.url === '/denied') { res.writeHead(401); res.end(); }
    else { res.setHeader('Content-Type', 'application/octet-stream'); res.end(Buffer.concat(parts)); }
  });
  const remoteOrigin = await listening(remote), hub = hubFor(remoteOrigin);
  const proxy = createRemoteProxy({ hub, connection: { requestRejection: req => req.headers.cookie === 'hub-auth=hub-only' ? undefined : 401 } });
  // Exercise the exact HTTP bridge shipped by pinned DSH, including GET body rules.
  const source = readFileSync(require.resolve('@deepseek-ai/dsh-client-connection'), 'utf8');
  const bridgeCode = source.slice(source.indexOf('async function bridge('), source.indexOf('//#endregion', source.indexOf('async function bridge(')));
  const bridge = vm.runInNewContext(`(${bridgeCode})`, { Request, URL, AbortController, Readable, Buffer, DEFAULT_MAX_REQUEST_BODY_BYTES: 300 * 1024 * 1024 });
  const server = createServer((req, res) => req.url.startsWith(REMOTE_ASSETS) ? proxy.assets.handler(req, res) : bridge(req, res, { requestBodyMode: () => proxy.route.requestBody, fetch: proxy.route.fetch }).catch(() => { res.writeHead(500); res.end(); }));
  const origin = await listening(server);
  t.after(async () => { proxy.dispose(); server.closeAllConnections(); remote.closeAllConnections(); await Promise.all([new Promise(r => server.close(r)), new Promise(r => remote.close(r))]); });
  const request = (resource, init = {}) => fetch(origin + remoteUrl(id, resource, 'project'), { redirect: 'manual', ...init, headers: { Origin: origin, Cookie: 'hub-auth=hub-only', Authorization: 'Bearer hub-only', ...init.headers } });
  const shell = await request(undefined); assert.equal(shell.status, 303);
  const hubUrl = new URL(shell.headers.get('location'), origin);
  assert.equal(hubUrl.pathname, '/'); assert.equal(hubUrl.searchParams.get('pc'), id); assert.equal(hubUrl.searchParams.get('workspace'), 'project');
  assert.equal(await shell.text(), '');
  const page = await request('/'); assert.equal(page.status, 200); assert.equal(page.headers.get('set-cookie'), null);
  assert.match(page.headers.get('content-security-policy'), /script-src 'self' 'sha256-/);
  assert.match(await page.text(), /__DSH_TRANSPORT__/);
  assert.equal(seen.at(-1).headers.cookie, 'dsh-auth-remote=remote-only'); assert.equal(seen.at(-1).headers.origin, remoteOrigin); assert.equal(seen.at(-1).headers.authorization, undefined);
  const binary = Buffer.from([0, 255, 128, 10]); const upload = await request('/api/files?q=a%20b', { method: 'POST', body: binary, headers: { 'Content-Type': 'application/octet-stream' } });
  assert.deepEqual(Buffer.from(await upload.arrayBuffer()), binary); assert.deepEqual(seen.at(-1).body, binary); assert.equal(seen.at(-1).path, '/api/files?q=a%20b');
  const redirect = await request('/redirect'); assert.equal(redirect.status, 303); assert.equal(new URL(redirect.headers.get('location'), origin).searchParams.get('resource'), '/files?q=a%20b');
  assert.equal((await request('/external')).status, 502);
  const before = seen.length; assert.equal((await request('/denied', { method: 'POST', body: 'one' })).status, 502); assert.equal(seen.length, before + 1); assert.equal(hub.invalidations, 1);
  const assets = remoteUrl(id, '/assets/main.js');
  assert.equal((await fetch(origin + assets)).status, 401);
  assert.equal((await fetch(origin + assets, { method: 'POST', headers: { Cookie: 'hub-auth=hub-only' } })).status, 405);
  assert.equal((await request('/assets/main.js')).status, 200); assert.equal(seen.at(-1).path, '/assets/main.js');
  const sibling = new URL('./vendor.js', origin + assets); assert.equal((await fetch(sibling, { headers: { Cookie: 'hub-auth=hub-only', Origin: origin } })).status, 200); assert.equal(seen.at(-1).path, '/assets/vendor.js');
});
test('native relative ESM assets keep a node prefix, without rewriting the document base', () => {
  const html = '<html><head><base href="/"><script type="module" src="./assets/main.js"></script><link href="./assets/theme.css"><link href="./favicon.svg"></head></html>';
  const result = rewriteRemoteHtml(html, { node: id, assets: REMOTE_ASSETS });
  assert.ok(result.includes('<base href="/">')); assert.ok(result.includes(remoteUrl(id, '/assets/main.js'))); assert.ok(!result.includes('href="./'));
});
test('WebSocket carrier authenticates, carries text and binary, and disconnects removed PCs', async t => {
  const remote = createServer(), wss = new WebSocketServer({ server: remote });
  let upstreamHeaders;
  wss.on('connection', (socket, req) => { upstreamHeaders = req.headers; socket.on('message', (data, binary) => socket.send(data, { binary })); });
  const remoteOrigin = await listening(remote), hub = hubFor(remoteOrigin);
  const proxy = createRemoteProxy({ hub, connection: { requestRejection: req => req.headers.cookie === 'hub-auth=accepted' && req.headers.origin === 'https://hub.test' ? undefined : 403 } });
  const server = createServer(); server.on('upgrade', proxy.upgrade.handler); const origin = await listening(server);
  t.after(async () => { proxy.dispose(); for (const socket of wss.clients) socket.terminate(); wss.close(); server.closeAllConnections(); remote.closeAllConnections(); await Promise.all([new Promise(r => server.close(r)), new Promise(r => remote.close(r))]); });
  const url = origin.replace('http:', 'ws:') + REMOTE_SOCKET + '?' + new URLSearchParams({ node: id, resource: '/api/remote.mux' });
  const rejected = new WebSocket(url); rejected.on('error', () => {}); const [, rejection] = await once(rejected, 'unexpected-response'); assert.equal(rejection.statusCode, 403); rejected.terminate(); assert.equal(hub.calls, 0);
  const client = new WebSocket(url, { headers: { Cookie: 'hub-auth=accepted', Origin: 'https://hub.test' } }); await once(client, 'open');
  assert.equal(upstreamHeaders.cookie, 'dsh-auth-remote=remote-only'); assert.equal(upstreamHeaders.origin, remoteOrigin);
  let received = once(client, 'message'); client.send('hello'); let [data, binary] = await received; assert.equal(data.toString(), 'hello'); assert.equal(binary, false);
  received = once(client, 'message'); client.send(Buffer.from([0, 255, 128])); [data, binary] = await received; assert.deepEqual(data, Buffer.from([0, 255, 128])); assert.equal(binary, true);
  const closed = once(client, 'close'); hub.invalidateRemote(id); await closed; assert.equal(client.readyState, WebSocket.CLOSED);
});
test('workspace patch preserves every real native factory and detects drift', () => {
  const ids = ['@deepseek-ai/dsh-client-ui-workspace', '@deepseek-ai/dsh-typert-registry', '@deepseek-ai/dsh-client-connection'];
  const source = ids.map(id => readFileSync(require.resolve(id + '/client'), 'utf8')).join('\n');
  const factories = new Map(); vm.runInNewContext(patchRemoteWorkspace(source), { window: { __ModuleLoader__: { load({ id, factory }) { assert.ok(!factories.has(id)); factories.set(id, factory); } } } });
  assert.deepEqual([...factories.keys()], ids); assert.match(factories.get(ids[0]).toString(), /__DARASK_REMOTE_WORKSPACE__/);
  assert.throws(() => patchRemoteWorkspace(source.replace('const uiWorkspace =', 'const unknown =')), /バージョン/);
  assert.equal(patchRemoteWorkspace('const a = 1;'), 'const a = 1;');
});

test('embedded layout hides only the duplicate sidebar and preserves the real layout and other factories', () => {
  const id = '@deepseek-ai/dsh-client-ui-layout';
  const original = readFileSync(require.resolve(id + '/client'), 'utf8');
  const after = patchRemoteLayout(original);
  new vm.Script(after);
  assert.ok(after.includes('children: window.__DARASK_EMBEDDED__ ? null : sidebar'));
  assert.ok(after.includes('window.__DARASK_EMBEDDED__ ? 0 : cols.sidebar'));
  assert.ok(after.includes('children: renderSlot("rightbar"'));
  assert.throws(() => patchRemoteLayout(original.replace('children: sidebar', 'children: changed')), /バージョン/);
  assert.throws(() => patchRemoteLayout(original.replace(`id: "${id}"`, 'id: "other"') + `\n// id: "${id}"`), /バージョン/);
  const combined = original + readFileSync(require.resolve('@deepseek-ai/dsh-typert-registry/client'), 'utf8');
  assert.ok(patchRemoteLayout(combined).endsWith(readFileSync(require.resolve('@deepseek-ai/dsh-typert-registry/client'), 'utf8')));
});
test('page carrier rewrites HTTP, WS and scripts while isolating storage and selecting a remote workspace', async () => {
  class Element { setAttribute(key, value) { this[key] = value; } }
  const storage = () => { const map = new Map([['hub-key', 'hub-value']]); return { get length() { return map.size; }, key: i => [...map.keys()][i], getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) }; };
  const localStorage = storage(), sessionStorage = storage(), traffic = [], messages = [];
  const events = new Map();
  const window = { addEventListener: (name, fn) => events.set(name, fn), removeEventListener: (name, fn) => { if (events.get(name) === fn) events.delete(name); }, localStorage, sessionStorage, fetch: async req => { traffic.push(req); return new Response('ok'); }, WebSocket: class { constructor(url) { this.url = url; } }, EventSource: class { constructor(url) { this.url = url; } } };
  const context = vm.createContext({ window, location: { origin: 'https://hub.test' }, URL, URLSearchParams, Request, Element, HTMLScriptElement: Element, HTMLLinkElement: Element, HTMLImageElement: Element, HTMLIFrameElement: Element, HTMLMediaElement: Element, HTMLSourceElement: Element, HTMLAnchorElement: Element, HTMLFormElement: Element, parent: { postMessage: (...args) => messages.push(args) }, document: {} });
  vm.runInContext(remoteBootstrap({ node: id, origin: 'https://win.tail.test', path: '/api/darask/remote', socket: REMOTE_SOCKET, assets: REMOTE_ASSETS, workspace: 'project' }), context);
  await window.fetch('https://hub.test/api/files', { method: 'POST', body: 'remote' }); assert.equal(new URL(traffic[0].url).searchParams.get('resource'), '/api/files'); assert.equal(await traffic[0].text(), 'remote');
  await window.fetch('https://outside.test/image'); assert.equal(traffic[1].url, 'https://outside.test/image');
  assert.equal(new URL(new window.WebSocket('wss://hub.test/api/remote.mux').url).pathname, REMOTE_SOCKET); assert.equal(window.__DSH_TRANSPORT__.ownsHost, undefined);
  assert.equal(new URL(new window.EventSource('/plugins/events').url).searchParams.get('resource'), '/plugins/events');
  assert.equal(window.__DSH_FILE_UPLOAD__.fetch, window.fetch);
  window.localStorage.setItem('selected', 'win'); window.localStorage.clear(); assert.equal(localStorage.getItem('hub-key'), 'hub-value'); assert.equal(window.localStorage.length, 0);
  const subscribers = new Set(), opened = [];
  const store = value => ({ getSnapshot: () => value, subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); } });
  const pendingInteractions = store(new Map([['s', { kind: 'approval', key: 'p', sessionId: 's' }]]));
  const ui = { ctx: new Proxy({ get(name) { return name === 'uiSession' ? { pendingInteractions } : undefined; } }, { get(target, prop, receiver) {
    if (prop === 'uiSession') throw new Error('cannot get property "uiSession" without inject');
    return Reflect.get(target, prop, receiver);
  } }),
    workspaces: { list: store({ phase: 'ready', items: [{ workspaceId: 'project', path: 'F:\\remote', sessionIds: ['s'] }] }) },
    sessions: { list: store({ phase: 'ready', current: 's', byId: { s: { id: 's', displayTitle: '会話', running: false, completed: false, updatedAt: 1 } }, jobsBySession: { s: [{ status: 'failed' }] } }),
      binding: () => ({ session: { getSnapshot: () => ({ lastAgentError: null }) } }) },
    openSession(id) { opened.push(id); },
    async openWorkspace(id) { opened.push(`workspace:${id}`); } };
  const dispose = window.__DARASK_REMOTE_WORKSPACE__(ui); for (const fn of subscribers) fn(); assert.deepEqual(opened, ['s']); assert.equal(messages.find(item => item[0].type === 'darask-remote-workspace')[0].path, 'F:\\remote');
  const posted = messages.find(item => item[0].type === 'darask-workspace-sessions')[0].sessions[0];
  assert.equal(posted.pendingInteraction, 'approval'); assert.equal(posted.error, true); assert.equal(posted.title, '会話');
  const sessionOpened = []; ui.openSession = id => sessionOpened.push(id);
  const data = { type: 'darask-open-session', node: id, workspace: 'project', session: 's' };
  for (const event of [{ origin: 'https://evil.test', source: context.parent, data }, { origin: 'https://hub.test', source: {}, data }, { origin: 'https://hub.test', source: context.parent, data: { ...data, session: 'foreign' } }]) events.get('message')(event);
  assert.equal(sessionOpened.length, 0);
  events.get('message')({ origin: 'https://hub.test', source: context.parent, data }); assert.deepEqual(sessionOpened, ['s']);
  const managed = [];
  ui.sessions.binding = session => ({ session: { getSnapshot: () => ({}), async rename(title) { managed.push({ action: 'rename', session, title }); return { ok: true }; } } });
  ui.archiveSession = async session => { managed.push({ action: 'archive', session }); };
  ui.forkSession = async session => { managed.push({ action: 'fork', session }); };
  const command = { ...data, type: 'darask-manage-session', action: 'rename', title: '変更後の会話', requestId: 'request-one' };
  await events.get('message')({ origin: 'https://hub.test', source: context.parent, data: command });
  assert.deepEqual(managed, [{ action: 'rename', session: 's', title: '変更後の会話' }]);
  assert.equal(messages.at(-1)[0].type, 'darask-session-result'); assert.equal(messages.at(-1)[0].ok, true);
  await events.get('message')({ origin: 'https://hub.test', source: context.parent, data: { ...command, action: 'archive', session: 'foreign' } });
  assert.equal(managed.length, 1); assert.equal(messages.at(-1)[0].ok, false);
  await events.get('message')({ origin: 'https://hub.test', source: context.parent, data: { ...command, action: 'fork' } });
  assert.deepEqual(managed[1], { action: 'fork', session: 's' }); assert.equal(messages.at(-1)[0].ok, true);
  await events.get('message')({ origin: 'https://hub.test', source: context.parent, data: { ...command, action: 'archive' } });
  assert.deepEqual(managed[2], { action: 'archive', session: 's' }); assert.equal(messages.at(-1)[0].ok, true);
  dispose(); assert.equal(subscribers.size, 0); assert.equal(events.size, 0);
});

test('remote workspace waits for session records instead of opening a replacement tab', async () => {
  class Element { setAttribute(key, value) { this[key] = value; } }
  const messages = [];
  const window = { addEventListener() {}, removeEventListener() {}, fetch: async () => new Response('ok'), WebSocket: class { constructor(url) { this.url = url; } }, EventSource: class { constructor(url) { this.url = url; } }, localStorage: { length: 0, key() { return null; }, getItem() { return null; }, setItem() {}, removeItem() {}, clear() {} }, sessionStorage: { length: 0, key() { return null; }, getItem() { return null; }, setItem() {}, removeItem() {}, clear() {} } };
  const context = vm.createContext({ window, location: { origin: 'https://hub.test' }, URL, URLSearchParams, Request, Element, HTMLScriptElement: Element, HTMLLinkElement: Element, HTMLImageElement: Element, HTMLIFrameElement: Element, HTMLMediaElement: Element, HTMLSourceElement: Element, HTMLAnchorElement: Element, HTMLFormElement: Element, parent: { postMessage: (...args) => messages.push(args) }, document: {} });
  vm.runInContext(remoteBootstrap({ node: id, origin: 'https://win.tail.test', path: '/api/darask/remote', socket: REMOTE_SOCKET, assets: REMOTE_ASSETS, workspace: 'project' }), context);
  let snapshot = { phase: 'ready', current: null, byId: {}, jobsBySession: {} };
  const subscribers = new Set();
  const store = get => ({ getSnapshot: get, subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); } });
  const opened = [];
  const ui = {
    ctx: { get() { return undefined; } },
    workspaces: { list: store(() => ({ phase: 'ready', items: [{ workspaceId: 'project', path: 'F:\\remote', sessionIds: ['s'] }] })) },
    sessions: { list: store(() => snapshot), binding: () => ({ session: { getSnapshot: () => ({}) } }) },
    openSession(sid) { opened.push(sid); },
    async openWorkspace(wid) { opened.push(`workspace:${wid}`); },
  };
  window.__DARASK_REMOTE_WORKSPACE__(ui);
  assert.deepEqual(opened, []);
  assert.ok(!messages.some(item => item[0].type === 'darask-workspace-sessions'));
  snapshot = { phase: 'ready', current: 's', byId: { s: { id: 's', displayTitle: '会話', running: false, completed: false, updatedAt: 1 } }, jobsBySession: {} };
  for (const fn of subscribers) fn();
  assert.deepEqual(opened, ['s']);
  assert.equal(messages.find(item => item[0].type === 'darask-workspace-sessions')[0].sessions[0].id, 's');
});
