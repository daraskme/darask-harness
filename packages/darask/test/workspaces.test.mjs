import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, stat, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { credentialKey } from '@deepseek-ai/dsh-credentials';
import { createWorkspaceHub, workspaceName, workspaceHostUrl } from '../src/workspaces.mjs';
function registry() { const rows = []; return { list: () => rows, async create(p) { const row = rows.find(w => w.path === p) || { id: randomUUID(), title: path.basename(p), path: p }; if (!rows.includes(row)) rows.push(row); return row; } }; }
function credentials() { const keys = new Map(); return { async resolve(ref) { return keys.has(ref) ? { value: keys.get(ref) } : undefined; }, async set(ref, value) { keys.set(ref, value); }, async unset(ref) { keys.delete(ref); } }; }
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'darask-ws-'));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); assert.ok(path.basename(root).startsWith('darask-ws-')); await rm(root, { recursive: true, force: true }); });
  return root;
}
test('workspace names cannot escape the selected directory or target Windows devices', () => {
  for (const name of ['..', '../outside', 'a/b', 'a\\b', '', 'NUL.txt', 'COM1', 'x:stream', 'ending.']) assert.throws(() => workspaceName(name, 'win32'));
  assert.equal(workspaceName('画像 LoRA', 'win32'), '画像 LoRA');
  assert.throws(() => workspaceHostUrl('https://example.com'));
  assert.throws(() => workspaceHostUrl('https://win.tail123.ts.net:8443/?token=secret'));
  assert.equal(workspaceHostUrl('https://win.tail123.ts.net:8443'), 'https://win.tail123.ts.net:8443');
});
test('local creation makes a real folder, registers it natively and does not overwrite an existing workspace', async t => {
  const root = await fixture(t), reg = registry();
  const hub = createWorkspaceHub({ directory: path.join(root, 'config'), credentials: credentials(), registry: reg }); await hub.initialize();
  const payload = { action: 'create', node: 'local', path: root, name: '画像プロジェクト', requestId: randomUUID() };
  const [a, b] = await Promise.all([hub.action(payload), hub.action(payload)]);
  assert.equal(a.workspace.id, b.workspace.id); assert.equal(reg.list().length, 1);
  assert.ok((await stat(a.workspace.path)).isDirectory());
  await assert.rejects(hub.action({ ...payload, requestId: randomUUID() }), /同名/);
  await assert.rejects(hub.action({ ...payload, expectedHost: randomUUID(), requestId: randomUUID() }), /PC/);
  const registered = await hub.action({ action: 'register', node: 'local', path: a.workspace.path, requestId: randomUUID() });
  assert.equal(registered.workspace.id, a.workspace.id); assert.equal(registered.created, false);
});
test('remote creation runs only on the selected host and changing a URL never forwards a saved token', async t => {
  const root = await fixture(t), remoteRoot = path.join(root, 'remote'); await mkdir(remoteRoot);
  const remoteReg = registry(), localReg = registry();
  const remote = createWorkspaceHub({ directory: path.join(root, 'remote-config'), credentials: credentials(), registry: remoteReg }); await remote.initialize();
  const traffic = [];
  const fetch = async (url, init) => {
    const u = new URL(url); traffic.push(u.origin);
    assert.equal(u.origin, 'https://win.tail123.ts.net:8443');
    if (u.pathname === '/') return new Response(null, { status: 303, headers: { 'Set-Cookie': 'dsh-auth-test=accepted; Path=/; HttpOnly', Location: '/' } });
    assert.equal(init.headers.Cookie, 'dsh-auth-test=accepted');
    return remote.routes[1].fetch(new Request(url, init));
  };
  const hub = createWorkspaceHub({ directory: path.join(root, 'hub-config'), credentials: credentials(), registry: localReg, fetch }); await hub.initialize();
  const saved = await hub.action({ action: 'saveNode', name: 'win', url: 'https://win.tail123.ts.net:8443', token: 'a'.repeat(43) });
  const node = saved.nodes[0];
  const beforeSession = traffic.length;
  const [sessionA, sessionB] = await Promise.all([hub.remoteConnection(node.id), hub.remoteConnection(node.id)]);
  assert.equal(sessionA, sessionB); assert.equal(traffic.length, beforeSession + 1);
  const result = await hub.action({ action: 'create', node: node.id, path: remoteRoot, name: 'on-win', requestId: randomUUID() });
  assert.equal(result.host.id, remote.info().id); assert.equal(remoteReg.list().length, 1); assert.equal(localReg.list().length, 0);
  assert.equal((await hub.remoteConnection(node.id)).host.workspaces[0].id, result.workspace.id);
  const opened = await hub.action({ action: 'open', node: node.id, workspaceId: result.workspace.id });
  const openUrl = new URL(opened.url, 'https://hub.test');
  assert.equal(openUrl.origin, 'https://hub.test'); assert.equal(openUrl.pathname, '/api/darask/remote');
  assert.equal(openUrl.searchParams.get('workspace'), result.workspace.id); assert.ok(!opened.url.includes('token'));
  await assert.rejects(hub.action({ action: 'open', node: node.id, workspaceId: 'missing' }), /ワークスペース/);
  const count = traffic.length;
  await assert.rejects(hub.action({ action: 'saveNode', id: node.id, name: 'changed', url: 'https://other.tail123.ts.net:8443' }), /トークン/);
  assert.equal(traffic.length, count);
  const read = await (await hub.routes[0].fetch(new Request('http://local/api/darask/workspaces'))).text();
  assert.ok(!read.includes('a'.repeat(43))); assert.ok(read.includes('on-win'));
  await hub.action({ action: 'removeNode', id: node.id });
  await assert.rejects(hub.remoteConnection(node.id), /PC/);
});

test('native authority-bound authentication survives both hosts restarting and still rejects revoked sessions', async t => {
  const require = createRequire(import.meta.url);
  const pinned = await readFile(require.resolve('@deepseek-ai/dsh-client-connection'), 'utf8');
  const start = pinned.indexOf('//#region lib/types/browser-auth.js');
  assert.ok(start >= 0);
  const end = pinned.indexOf('//#endregion', start);
  assert.ok(end > start);
  const BrowserAuth = vm.runInNewContext(pinned.slice(start, end) + '\nBrowserAuth;', {createHash,createHmac,randomBytes,timingSafeEqual,credentialKey,Buffer,URL,Headers,Date});
  const records = new Map();
  const nativeCredentials = { async modifyRecord(key, modify) {
    const next = await modify(records.get(key));
    if (next !== undefined) records.set(key, next);
    return records.get(key);
  } };
  let auth = await BrowserAuth.create({}, nativeCredentials, 30);
  const origin = 'https://win.tail123.ts.net:8443';
  const token = new URL(auth.authenticatedUrl(origin)).searchParams.get('token');
  const root = await fixture(t), creds = credentials(), remoteReg = registry();
  await remoteReg.create(path.join(root, 'existing'));
  const remote = createWorkspaceHub({ directory: path.join(root, 'remote'), credentials: credentials(), registry: remoteReg }); await remote.initialize();
  let exchanges = 0, actions = 0;
  const fetch = async (url, init) => {
    const target = new URL(url); assert.equal(target.origin, origin);
    const headers = { host: target.host, cookie: init?.headers?.Cookie };
    if (target.pathname === '/') {
      exchanges++;
      let result;
      assert.equal(auth.authorizeIndex({method:'GET',url:target.pathname+target.search,headers}, {
        writeHead(status, headers) { result = new Response(null,{status,headers}); }, end() {},
      }), false);
      return result;
    }
    if (!auth.isAuthenticated({headers})) return new Response('authentication required',{status:401});
    actions++;
    return remote.routes[1].fetch(new Request(url,init));
  };
  const makeHub = () => createWorkspaceHub({directory:path.join(root,'hub'),credentials:creds,registry:registry(),fetch});
  let hub = makeHub(); await hub.initialize();
  const node = (await hub.action({action:'saveNode',name:'win',url:origin,token})).nodes[0];
  assert.equal(exchanges,1);
  const saved = await hub.remoteConnection(node.id);
  // The pinned DSH issues a new launch token for another process owner while
  // retaining the credential provider's signing secret across restarts.
  auth = await BrowserAuth.create({},nativeCredentials,30);
  assert.notEqual(new URL(auth.authenticatedUrl(origin)).searchParams.get('token'),token);
  hub = makeHub(); await hub.initialize();
  assert.equal((await hub.workspaceCatalog())[1].status,'online');
  assert.equal((await hub.remoteConnection(node.id)).cookie,saved.cookie);
  assert.equal(exchanges,1,'A restart must not exchange the obsolete launch token');
  const publicFiles = await Promise.all(['workspace-hosts.json','workspace-catalog.json'].map(file=>readFile(path.join(root,'hub',file),'utf8')));
  for (const contents of publicFiles) { assert.ok(!contents.includes(token)); assert.ok(!contents.includes(saved.cookie)); }
  assert.equal(auth.isAuthenticated({headers:{host:'other.tail123.ts.net:8443',cookie:saved.cookie}}),false);
  // Revocation remains effective; an invalid cookie must never dispatch a
  // create action or be treated as a successful offline response.
  records.clear(); auth = await BrowserAuth.create({},nativeCredentials,30);
  hub = makeHub(); await hub.initialize();
  const before = actions;
  await assert.rejects(hub.action({action:'create',node:node.id,path:root,name:'must-not-create',requestId:randomUUID()}),/トークン/);
  assert.equal(actions,before);
  await hub.action({action:'saveNode',id:node.id,name:'win',url:origin,token:new URL(auth.authenticatedUrl(origin)).searchParams.get('token')});
  assert.equal((await hub.workspaceCatalog())[1].status,'online');
  await hub.action({action:'removeNode',id:node.id});
  assert.equal(await creds.resolve(`DARASK_WORKSPACE_${node.id.replaceAll('-','').toUpperCase()}_SESSION`),undefined);
});
test('a node that is this DSH is adopted locally instead of opening Tailscale', async t => {
  const root = await fixture(t), reg = registry();
  const creds = credentials();
  const traffic = [];
  const hub = createWorkspaceHub({ directory: path.join(root, 'config'), credentials: creds, registry: reg, fetch: async (url, init) => {
    traffic.push(new URL(url).pathname);
    if (new URL(url).pathname === '/') return new Response(null, { status: 303, headers: { 'Set-Cookie': 'dsh-auth-test=accepted; Path=/; HttpOnly', Location: '/' } });
    return hub.routes[1].fetch(new Request(url, init));
  } });
  await hub.initialize();
  const self = hub.info();
  const id = randomUUID();
  await creds.set(`DARASK_WORKSPACE_${id.replaceAll('-', '').toUpperCase()}`, 'a'.repeat(43));
  const file = path.join(root, 'config', 'workspace-hosts.json');
  const saved = JSON.parse(await readFile(file, 'utf8'));
  saved.nodes = [{ id, name: 'win', url: 'https://win.tail123.ts.net:8443', hostId: self.id }];
  await writeFile(file, JSON.stringify(saved, null, 2));
  await hub.initialize();
  const result = await hub.action({ action: 'create', node: id, path: root, name: 'same-dsh', requestId: randomUUID() });
  assert.equal(result.sameMachine, true);
  assert.equal(result.host.id, self.id);
  assert.equal(reg.list().length, 1);
  const opened = await hub.action({ action: 'open', node: id });
  assert.equal(opened.sameMachine, true);
  assert.equal(opened.url, undefined);
});

test('remote rename and deletion use native commands, persist the full catalog and leave folders intact', async t => {
  const root = await fixture(t), remoteReg = registry(), localReg = registry(), creds = credentials();
  const folder = path.join(root, 'keep-this-folder'); await mkdir(folder);
  const workspace = await remoteReg.create(folder); await remoteReg.create(path.join(root, 'other-workspace'));
  await localReg.create(path.join(root, 'local-workspace'));
  const remote = createWorkspaceHub({ directory: path.join(root, 'remote'), credentials: credentials(), registry: remoteReg }); await remote.initialize();
  const mutations = [];
  const fetch = async (url, init) => {
    const target = new URL(url); assert.equal(target.origin, 'https://win.tail123.ts.net:8443');
    if (target.pathname === '/') return new Response(null, { status: 303, headers: { 'Set-Cookie': 'dsh-auth-test=accepted' } });
    assert.equal(init.headers.Cookie, 'dsh-auth-test=accepted'); assert.equal(init.headers.Origin, target.origin);
    if (target.pathname.startsWith('/api/workspace/')) {
      const packet = JSON.parse(init.body), { workspaceId, title } = packet.payload.args.request;
      assert.equal(workspaceId, workspace.id); assert.equal(packet.method, target.pathname.slice(5));
      mutations.push(packet.method);
      if (packet.method === 'workspace/rename') workspace.title = title;
      else remoteReg.list().splice(remoteReg.list().indexOf(workspace), 1);
      return Response.json({ rpcId: packet.rpcId, result: { ok: true, value: {} } });
    }
    return remote.routes[1].fetch(new Request(url, init));
  };
  const makeHub = () => createWorkspaceHub({ directory: path.join(root, 'hub'), credentials: creds, registry: localReg, fetch });
  let hub = makeHub(); await hub.initialize();
  const saved = await hub.action({ action: 'saveNode', name: 'win', url: 'https://win.tail123.ts.net:8443', token: 'c'.repeat(43) }), node = saved.nodes[0].id;
  const renamed = await hub.action({ action: 'rename', node, workspaceId: workspace.id, title: '変更した名前' });
  assert.equal(renamed.host.workspaces.length, 2); assert.equal(renamed.host.workspaces[0].title, '変更した名前');
  await assert.rejects(hub.action({ action: 'rename', node, workspaceId: workspace.id, title: '  ' }), /名前/);
  hub = makeHub(); await hub.initialize();
  assert.equal((await hub.workspaceCatalog())[1].workspaces[0].title, '変更した名前');
  const deleted = await hub.action({ action: 'delete', node, workspaceId: workspace.id });
  assert.equal(deleted.host.workspaces.length, 1); assert.ok((await stat(folder)).isDirectory());
  assert.equal(localReg.list()[0].title, 'local-workspace');
  hub = makeHub(); await hub.initialize();
  assert.equal((await hub.workspaceCatalog())[1].workspaces.length, 1);
  assert.deepEqual(mutations, ['workspace/rename', 'workspace/delete']);
});
test('missing remote connections and incorrect origins cannot silently create on the hub', async t => {
  const root = await fixture(t), reg = registry();
  const hub = createWorkspaceHub({ directory: path.join(root, 'config'), credentials: credentials(), registry: reg }); await hub.initialize();
  await assert.rejects(hub.action({ action: 'create', node: 'unconfigured-win', path: root, name: 'wrong-pc', requestId: randomUUID() }), /PC/);
  const denied = await hub.routes[0].fetch(new Request('http://127.0.0.1:3080/api/darask/workspaces', { method: 'POST', headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'register', node: 'local', path: root, requestId: randomUUID() }) }));
  assert.equal(denied.status, 400); assert.equal(reg.list().length, 0);
});

test('the catalog keeps existing and added workspaces across reload, restart and an offline PC', async t => {
  const root = await fixture(t), creds = credentials(), localReg = registry();
  const remotes = new Map();
  for (const name of ['win', 'mac']) {
    const reg = registry(); await reg.create(path.join(root, `${name}-existing`));
    const remote = createWorkspaceHub({ directory: path.join(root, name), credentials: credentials(), registry: reg });
    await remote.initialize(); remotes.set(name, remote);
  }
  await localReg.create(path.join(root, 'sub-existing'));
  let offline = false;
  const fetch = async (url, init) => {
    if (offline) throw new Error('offline');
    const u = new URL(url), remote = remotes.get(u.hostname.split('.')[0]); assert.ok(remote);
    if (u.pathname === '/') return new Response(null, { status: 303, headers: { 'Set-Cookie': 'dsh-auth-test=accepted; HttpOnly' } });
    return remote.routes[1].fetch(new Request(url, init));
  };
  const makeHub = () => createWorkspaceHub({ directory: path.join(root, 'hub'), credentials: creds, registry: localReg, fetch });
  let hub = makeHub(); await hub.initialize();
  for (const name of remotes.keys()) await hub.action({ action: 'saveNode', name, url: `https://${name}.tail123.ts.net:8443`, token: 'b'.repeat(43) });
  const read = async () => (await hub.routes[0].fetch(new Request('http://local/api/darask/workspaces'))).json();
  const first = await read(), win = first.nodes.find(n => n.name === 'win');
  const added = await hub.action({ action: 'create', node: win.id, path: root, name: 'win-new', requestId: randomUUID() });
  await hub.action({ action: 'register', node: win.id, path: added.workspace.path, requestId: randomUUID() });
  const expected = [['sub-existing'], ['win-existing', 'win-new'], ['mac-existing']];
  assert.deepEqual((await read()).groups.map(g => g.workspaces.map(w => w.title)), expected);
  hub = makeHub(); await hub.initialize();
  assert.deepEqual((await read()).groups.map(g => g.workspaces.map(w => w.title)), expected);
  // A native remote registration must be visible even if the proxy session is cached.
  await hub.remoteConnection(win.id);
  await remotes.get('win').local({ action: 'create', path: root, name: 'win-from-native', requestId: randomUUID() });
  expected[1].push('win-from-native');
  assert.deepEqual((await read()).groups.map(g => g.workspaces.map(w => w.title)), expected);
  offline = true; hub = makeHub(); await hub.initialize();
  const cached = await read();
  assert.deepEqual(cached.groups.map(g => g.workspaces.map(w => w.title)), expected);
  assert.deepEqual(cached.groups.map(g => g.status), ['online', 'offline', 'offline']);
  assert.ok(!JSON.stringify(cached).includes('b'.repeat(43)));
  const file = await readFile(path.join(root, 'hub', 'workspace-catalog.json'), 'utf8');
  assert.ok(!file.includes('b'.repeat(43))); assert.ok(!file.includes('dsh-auth-test'));
  await hub.action({ action: 'removeNode', id: win.id });
  assert.equal((await read()).groups.some(g => g.node === win.id), false);
});

test('a list response started before registration cannot overwrite the new workspace', async t => {
  const root = await fixture(t), remoteReg = registry();
  await remoteReg.create(path.join(root, 'old'));
  const remote = createWorkspaceHub({ directory: path.join(root, 'remote'), credentials: credentials(), registry: remoteReg }); await remote.initialize();
  let delayInfo = false, release, captured;
  const waiting = new Promise(resolve => { captured = resolve; });
  const hold = new Promise(resolve => { release = resolve; });
  const fetch = async (url, init) => {
    if (new URL(url).pathname === '/') return new Response(null, { status: 303, headers: { 'Set-Cookie': 'dsh-auth-test=accepted' } });
    const response = await remote.routes[1].fetch(new Request(url, init));
    if (delayInfo && JSON.parse(init.body).action === 'info') { captured(); await hold; }
    return response;
  };
  const hub = createWorkspaceHub({ directory: path.join(root, 'hub'), credentials: credentials(), registry: registry(), fetch }); await hub.initialize();
  const saved = await hub.action({ action: 'saveNode', name: 'win', url: 'https://win.tail123.ts.net:8443', token: 'c'.repeat(43) });
  delayInfo = true; const listing = hub.workspaceCatalog(); await waiting;
  await hub.action({ action: 'create', node: saved.nodes[0].id, path: root, name: 'new', requestId: randomUUID() });
  release();
  assert.deepEqual((await listing)[1].workspaces.map(w => w.title), ['old', 'new']);
  const cache = JSON.parse(await readFile(path.join(root, 'hub', 'workspace-catalog.json'), 'utf8'));
  assert.deepEqual(cache[saved.nodes[0].id].workspaces.map(w => w.title), ['old', 'new']);
});

test('a hub pushes provider keys to a remote PC without sharing retired Devin keys', async t => {
  const root = await fixture(t);
  const remoteCredentials = credentials(), hubCredentials = credentials();
  await hubCredentials.set('DEEPSEEK_API_KEY', 'sk-hub-deepseek');
  await hubCredentials.set('DARASK_OPENROUTER_API_KEY', 'hub-devin-key');
  const remote = createWorkspaceHub({ directory: path.join(root, 'remote-config'), credentials: remoteCredentials, registry: registry() });
  await remote.initialize();
  const traffic = [];
  const fetch = async (url, init) => {
    const target = new URL(url); traffic.push(target.pathname);
    if (target.pathname === '/') return new Response(null, { status: 303, headers: { 'Set-Cookie': 'dsh-auth-test=accepted' } });
    assert.equal(target.origin, 'https://win.tail123.ts.net:8443');
    assert.equal(init.headers.Cookie, 'dsh-auth-test=accepted');
    return remote.routes[1].fetch(new Request(url, init));
  };
  const hub = createWorkspaceHub({ directory: path.join(root, 'hub-config'), credentials: hubCredentials, registry: registry(), fetch });
  await hub.initialize();
  const node = (await hub.action({ action: 'saveNode', name: 'win', url: 'https://win.tail123.ts.net:8443', token: 'a'.repeat(43) })).nodes[0];

  const before = traffic.length;
  const shared = await hub.action({ action: 'shareCredentials', node: node.id, refs: ['DEEPSEEK_API_KEY', 'DARASK_OPENROUTER_API_KEY', 'DARASK_OPENAI_API_KEY'] });
  assert.equal(traffic.length, before + 1, 'one push per selected PC');
  const row = shared.results[0];
  assert.equal(row.node, node.id);
  assert.deepEqual(row.saved.sort(), ['DARASK_OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY']);
  assert.deepEqual(shared.missing, ['DARASK_OPENAI_API_KEY'], 'a key the hub never stored is reported, not invented');
  assert.equal((await remoteCredentials.resolve('DARASK_OPENROUTER_API_KEY')).value, 'hub-devin-key');
  assert.ok(!JSON.stringify(shared).includes('hub-devin-key'), 'the action response never carries a secret');
  assert.ok(!JSON.stringify(shared).includes('sk-hub-deepseek'));

  // The remote's own status route reports presence and origin, never values.
  const status = await (await remote.routes[2].fetch(new Request('http://local/api/darask/workspaces/status'))).json();
  assert.equal(status.credentials.find(row => row.ref === 'DARASK_OPENROUTER_API_KEY').configured, true);
  assert.ok(!JSON.stringify(status).includes('hub-devin-key'));
  assert.ok(status.credentials.every(row => !('value' in row)));

  const remoteStatusResponse = await hub.routes[2].fetch(new Request(`http://local/api/darask/workspaces/status?node=${node.id}`));
  assert.equal(remoteStatusResponse.status, 200, 'remote status must use the hub request function, not the incoming Request object');
  const remoteStatus = await remoteStatusResponse.json();
  assert.equal(remoteStatus.credentials.find(row => row.ref === 'DARASK_OPENROUTER_API_KEY').configured, true);

  await assert.rejects(hub.action({ action: 'shareCredentials', node: node.id, refs: ['DEVIN_API_KEY'] }), /選択/);

  // Revoking removes what was shared and leaves the rest alone.
  const revoked = await hub.action({ action: 'shareCredentials', node: node.id, refs: ['DARASK_OPENROUTER_API_KEY'], revoke: true });
  assert.deepEqual(revoked.results[0].removed, ['DARASK_OPENROUTER_API_KEY']);
  assert.equal(await remoteCredentials.resolve('DARASK_OPENROUTER_API_KEY'), undefined);
  assert.equal((await remoteCredentials.resolve('DEEPSEEK_API_KEY')).value, 'sk-hub-deepseek');

  await assert.rejects(hub.action({ action: 'shareCredentials', node: node.id, refs: ['DARASK_WORKSPACE_X'] }), /選択/);
  await assert.rejects(hub.action({ action: 'shareCredentials', node: randomUUID(), refs: ['DEEPSEEK_API_KEY'] }), /PC/);
  const listing = await (await hub.routes[0].fetch(new Request('http://local/api/darask/workspaces'))).json();
  assert.deepEqual(listing.secrets.filter(row => row.available).map(row => row.ref).sort(), ['DARASK_OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY']);
  assert.ok(listing.secrets.every(row => !('value' in row)));
});
