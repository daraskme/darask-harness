import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readTgzEntry, installedRoot, installedArchive, createHostUpdateRoutes, distributeToNodes, createDistribution } from '../src/host-update.mjs';
import { developmentRoutes } from '../src/development.mjs';

function childProcess() {
  const child = new EventEmitter();
  child.unref = () => {};
  queueMicrotask(() => child.emit('spawn'));
  return child;
}

function tarEntry(name, data) {
  const body = Buffer.from(data);
  const header = Buffer.alloc(512);
  header.write(name, 0, 'ascii');
  header.write('0000644\0', 100);
  header.write('0000000\0', 108);
  header.write('0000000\0', 116);
  header.write(body.length.toString(8).padStart(11, '0') + ' ', 124);
  header.write('00000000000\0', 136);
  header.write('        ', 148);
  header.write('0', 156);
  const padding = Math.ceil(body.length / 512) * 512 - body.length;
  return Buffer.concat([header, body, Buffer.alloc(padding)]);
}

const fixtureTgz = manifest => gzipSync(Buffer.concat([tarEntry('package/package.json', JSON.stringify(manifest)), Buffer.alloc(1024)]));
const PACKAGE = { name: 'dsh-darask', version: '9.9.9-test.1' };

async function fixtureRoot(t, { devMode = false, layout = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'darask-host-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const data = join(root, 'data');
  if (layout) {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(join(root, 'app', 'package.json'), JSON.stringify({ name: 'darask-dsh-app', dependencies: { 'dsh-darask': 'file:../packages/dsh-darask-0.0.0.tgz' } }));
  }
  if (devMode) { await mkdir(join(data, 'darask'), { recursive: true }); await writeFile(join(data, 'darask', 'development.json'), '{}'); }
  return { root, data };
}

const post = (route, { host = 'host-1', body = fixtureTgz(PACKAGE), headers = {} } = {}) =>
  route.fetch(new Request(`http://127.0.0.1:3080/api/darask/host-update?expectedHost=${host}`, {
    method: 'POST', headers: { origin: 'http://127.0.0.1:3080', 'content-type': 'application/octet-stream', ...headers }, body,
  }));

test('readTgzEntry extracts package/package.json from a tar.gz', () => {
  const entry = readTgzEntry(fixtureTgz(PACKAGE), 'package/package.json');
  assert.deepEqual(JSON.parse(entry.toString('utf8')), PACKAGE);
  assert.equal(readTgzEntry(fixtureTgz(PACKAGE), 'package/nope'), null);
});

test('installedRoot detects the installed layout, dev mode and other layouts', async t => {
  const installed = await fixtureRoot(t);
  assert.deepEqual(await installedRoot(installed.data), { root: installed.root });
  const dev = await fixtureRoot(t, { devMode: true });
  assert.deepEqual(await installedRoot(dev.data), { devMode: true });
  const bare = await fixtureRoot(t, { layout: false });
  assert.deepEqual(await installedRoot(bare.data), {});
});

test('host-update stages the archive, launches the detached updater and exits', async t => {
  const { root, data } = await fixtureRoot(t);
  const spawned = [];
  let exitCode = null;
  const [route] = createHostUpdateRoutes({
    directory: join(data, 'darask'), hostId: () => 'host-1', dshHome: data, exitDelayMs: 5,
    spawnImpl: (file, args, options) => { spawned.push({ file, args, options }); return childProcess(); },
    exit: code => { exitCode = code; },
  });
  const response = await post(route);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.accepted, true);
  assert.equal(result.version, '9.9.9-test.1');
  const staging = join(data, 'darask', 'update');
  const staged = await readdir(staging);
  assert.ok(staged.includes('dsh-darask-9.9.9-test.1.tgz'));
  for (const name of ['setup-dsh-host.mjs', 'host-update.mjs', 'update.log']) assert.ok(existsSync(join(staging, name)), name);
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].args[1], '--root');
  assert.equal(spawned[0].args[2], root);
  assert.equal(spawned[0].options.detached, true);
  await new Promise(done => setTimeout(done, 50));
  assert.equal(exitCode, 0);
});

test('host-update rejects wrong host, bad payloads and dev mode', async t => {
  const { root, data } = await fixtureRoot(t);
  const calls = [];
  const routes = overrides => createHostUpdateRoutes({
    directory: join(data, 'darask'), hostId: () => 'host-1', dshHome: data, exitDelayMs: 5,
    spawnImpl: () => { calls.push('spawn'); return { unref() {} }; }, exit: code => calls.push(`exit${code}`), ...overrides,
  })[0];
  // Origin が無ければ拒否
  const noOrigin = await routes().fetch(new Request('http://127.0.0.1:3080/api/darask/host-update?expectedHost=host-1', { method: 'POST', body: fixtureTgz(PACKAGE) }));
  assert.equal(noOrigin.status, 403);
  // 接続先と expectedHost が一致しない
  assert.equal((await post(routes(), { host: 'other' })).status, 400);
  // gzip ではない
  assert.equal((await post(routes(), { body: Buffer.from('not a tgz') })).status, 400);
  // dsh-darask ではないパッケージ
  assert.equal((await post(routes(), { body: fixtureTgz({ name: 'evil', version: '1.0.0' }) })).status, 400);
  // バージョン形式が不正
  assert.equal((await post(routes(), { body: fixtureTgz({ name: 'dsh-darask', version: 'latest' }) })).status, 400);
  assert.deepEqual(calls, []);
  // 開発モードは push を受け付けない
  const dev = await fixtureRoot(t, { devMode: true });
  const devRoute = createHostUpdateRoutes({ directory: join(dev.data, 'darask'), hostId: () => 'host-1', dshHome: dev.data, spawnImpl: () => ({ unref() {} }) })[0];
  const devResult = await (await post(devRoute)).json();
  assert.equal(devResult.devMode, true);
});

test('distributeToNodes updates dev-mode PCs, skips identical archives and pushes changed content at the same version', async t => {
  const bytes = fixtureTgz(PACKAGE);
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const hosts = {
    n1: { node: { id: 'n1', name: 'dev-pc', url: 'https://a', hostId: 'h1' }, cookie: 'c1', host: { id: 'h1', release: '9.9.9-test.1' } },
    n2: { node: { id: 'n2', name: 'win-pc', url: 'https://b', hostId: 'h2' }, cookie: 'c2', host: { id: 'h2', release: '9.9.9-test.1', releaseDigest: digest } },
    n3: { node: { id: 'n3', name: 'old-pc', url: 'https://c', hostId: 'h3' }, cookie: 'c3', host: { id: 'h3', release: '9.9.9-test.1', releaseDigest: 'old-content' } },
    n4: { node: { id: 'n4', name: 'down-pc', url: 'https://d', hostId: 'h4' }, cookie: 'c4', host: { id: 'h4', release: '9.0.0' } },
  };
  const hub = {
    listNodes: () => Object.values(hosts).map(({ node }) => node),
    remoteConnection: async id => { if (id === 'n4') throw new Error('接続できません'); return hosts[id]; },
  };
  const seen = [];
  const fetchImpl = async (url, options = {}) => {
    seen.push(url);
    const body = JSON.parse(typeof options.body === 'string' ? options.body : 'null') ?? {};
    if (url === 'https://a/api/darask/development' && body.action === 'status') return new Response(JSON.stringify({ available: true }));
    if (url === 'https://a/api/darask/development' && body.action === 'update') {
      assert.equal(body.expectedHost, 'h1');
      assert.equal(body.propagate, false);
      return new Response(JSON.stringify({ accepted: true }));
    }
    if (url === 'https://b/api/darask/development' || url === 'https://c/api/darask/development') return new Response(JSON.stringify({ available: false }));
    if (url === 'https://c/api/darask/host-update?expectedHost=h3') return new Response(JSON.stringify({ accepted: true, version: '9.9.9-test.1' }));
    return new Response('{}', { status: 404 });
  };
  const archive = { name: 'dsh-darask-9.9.9-test.1.tgz', bytes, sha256: digest, version: '9.9.9-test.1' };
  const results = await distributeToNodes({ hub, archive, fetchImpl });
  assert.deepEqual(results.map(row => [row.name, row.ok, row.kind]), [
    ['dev-pc', true, 'dev'], ['win-pc', true, 'skip'], ['old-pc', true, 'push'], ['down-pc', false, undefined],
  ]);
  assert.ok(seen.includes('https://c/api/darask/host-update?expectedHost=h3'));
  assert.ok(!seen.some(url => url.startsWith('https://b/api/darask/host-update')));
});

test('host update serializes uploads, bounds input and never exits after spawn failure', async t => {
  const { data } = await fixtureRoot(t);
  let exits = 0;
  const route = createHostUpdateRoutes({
    directory: join(data, 'darask'), dshHome: data, hostId: () => 'host-1', exitDelayMs: 5,
    spawnImpl: () => { const child = new EventEmitter(); queueMicrotask(() => child.emit('error', new Error('cannot spawn'))); return child; },
    exit: () => { exits++; },
  })[0];
  assert.equal((await post(route, { headers: { origin: 'https://other.invalid' } })).status, 400);
  assert.equal((await post(route, { headers: { 'content-length': String(65 * 1024 * 1024) } })).status, 413);
  const requests = await Promise.all([post(route), post(route)]);
  assert.deepEqual(requests.map(r => r.status).sort(), [400, 409]);
  await new Promise(done => setTimeout(done, 20));
  assert.equal(exits, 0);
  assert.equal((await post(route)).status, 400);
});

test('installed archive preserves the exact bytes and digest used by the canonical installer', async t => {
  const { root, data } = await fixtureRoot(t);
  const bytes = fixtureTgz(PACKAGE);
  await mkdir(join(root, 'packages'));
  await writeFile(join(root, 'packages', 'dsh-darask-0.0.0.tgz'), bytes);
  const archive = await installedArchive(data);
  assert.deepEqual(archive.bytes, bytes);
  assert.equal(archive.version, PACKAGE.version);
  assert.equal(archive.sha256, createHash('sha256').update(bytes).digest('hex').slice(0, 16));
});

async function distributionFixture(t, { development = true } = {}) {
  const { data } = await fixtureRoot(t);
  const directory = join(data, 'darask');
  const node = { id: 'n1', name: 'remote', url: 'https://remote.invalid' };
  const archive = { bytes: fixtureTgz(PACKAGE), version: PACKAGE.version, sha256: 'initial' };
  const state = { available: true, source: 'fixture-source', head: 'initial', job: null };
  let packs = 0, pushes = 0;
  const env = development ? { DARASK_DEV_CONTROL_URL: 'https://control.invalid', DARASK_DEV_CONTROL_TOKEN: 'fixture' } : {};
  const fetchImpl = async (url, options) => {
    if (url === env.DARASK_DEV_CONTROL_URL) return Response.json(state);
    if (url.endsWith('/development')) return Response.json({ available: false });
    assert.equal(url, `${node.url}/api/darask/host-update?expectedHost=remote-host`);
    assert.equal(options.headers.Origin, node.url);
    assert.equal(options.headers.Cookie, 'fixture-cookie');
    pushes++;
    return Response.json({ accepted: true, version: archive.version });
  };
  const create = () => {
    const coordinator = createDistribution({
      directory, version: PACKAGE.version, env, fetchImpl,
      hub: { listNodes: () => [node], remoteConnection: async () => ({ node, host: { id: 'remote-host' }, cookie: 'fixture-cookie' }) },
      pack: async () => { packs++; return archive; },
      readInstalled: async () => archive,
    });
    t.after(() => coordinator.dispose());
    return coordinator;
  };
  return { directory, state, archive, create, counts: () => ({ packs, pushes }) };
}

async function distributionFinished(coordinator) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const status = await coordinator.status();
    if (status.job && status.job.phase !== 'running') return status;
    await new Promise(done => setTimeout(done, 10));
  }
  throw new Error('distribution did not finish');
}

test('successful hub update resumes after restart, persists results and does not repeat on startup', async t => {
  const fixture = await distributionFixture(t);
  const first = fixture.create();
  await first.resume();
  assert.equal(fixture.counts().pushes, 0);
  await first.markPending();
  first.dispose();
  fixture.state.head = 'updated';
  fixture.state.job = { action: 'update', phase: 'done' };
  const restarted = fixture.create();
  await restarted.resume();
  const result = await distributionFinished(restarted);
  assert.equal(result.job.phase, 'done');
  assert.equal(result.last.results[0].kind, 'push');
  assert.equal(result.pending, false);
  restarted.dispose();
  await fixture.create().resume();
  assert.deepEqual(fixture.counts(), { packs: 1, pushes: 1 });
});

test('failed or remotely initiated development updates never fan out', async t => {
  for (const remote of [false, true]) {
    const fixture = await distributionFixture(t);
    const coordinator = fixture.create();
    await coordinator.resume();
    await coordinator.markPending(!remote);
    fixture.state.head = 'changed';
    fixture.state.job = { action: 'update', phase: remote ? 'done' : 'error' };
    await coordinator.resume();
    assert.equal((await coordinator.status()).pending, false);
    coordinator.dispose();
    await fixture.create().resume();
    assert.deepEqual(fixture.counts(), { packs: 0, pushes: 0 });
  }
});

test('installed hub detects a changed archive at the same version and manual distribution works without Git', async t => {
  const fixture = await distributionFixture(t, { development: false });
  const first = fixture.create();
  await first.resume();
  first.dispose();
  fixture.archive.sha256 = 'rebuilt-same-version';
  const changed = fixture.create();
  await changed.resume();
  await distributionFinished(changed);
  assert.deepEqual(fixture.counts(), { packs: 0, pushes: 1 });
  await changed.request();
  await distributionFinished(changed);
  assert.equal(fixture.counts().pushes, 2);
});

test('development endpoint writes the marker before forwarding, clears failures and checks remote identity', async t => {
  const fixture = await distributionFixture(t);
  const coordinator = fixture.create();
  const host = () => ({ hub: { info: () => ({ id: 'self' }) }, distribution: coordinator });
  const env = { DARASK_DEV_CONTROL_URL: 'https://control.invalid', DARASK_DEV_CONTROL_TOKEN: 'fixture' };
  let forwards = 0;
  const route = developmentRoutes(env, async () => {
    forwards++;
    const marker = JSON.parse(await readFile(join(fixture.directory, 'distribute-pending.json')));
    assert.equal(marker.propagate, false);
    return Response.json({ error: '未コミットの編集があります。' }, { status: 400 });
  }, host)[0];
  const request = expectedHost => new Request('https://self.invalid/api/darask/development', {
    method: 'POST', headers: { Origin: 'https://self.invalid', 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', expectedHost, propagate: false }),
  });
  assert.equal((await route.fetch(request('wrong'))).status, 400);
  assert.equal(forwards, 0);
  assert.equal((await route.fetch(request('self'))).status, 400);
  assert.equal(forwards, 1);
  assert.equal((await coordinator.status()).pending, false);
  const installed = developmentRoutes({}, globalThis.fetch, host)[0];
  const status = await (await installed.fetch(new Request('https://self.invalid/api/darask/development'))).json();
  assert.equal(status.available, false);
  assert.equal(status.distribute.nodes, 1);
});
