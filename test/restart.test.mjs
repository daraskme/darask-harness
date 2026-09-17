import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleRestart, restartRoutes } from '../src/restart.mjs';

test('scheduleRestart spawns the current argv then exits; daemon mode only exits', async () => {
  const spawned = [];
  const exited = [];
  const child = { unref() { spawned.push('unref'); } };
  scheduleRestart({
    env: {}, execPath: '/node', argv: ['/node', 'dsh', 'web'], cwd: '/app', delayMs: 0,
    spawnImpl: (bin, args, opts) => { spawned.push({ bin, args, opts }); return child; },
    exit: code => exited.push(code),
  });
  await new Promise(done => setTimeout(done, 20));
  assert.equal(spawned[0].bin, '/node');
  assert.deepEqual(spawned[0].args, ['dsh', 'web']);
  assert.equal(spawned[0].opts.detached, true);
  assert.equal(exited[0], 0);

  spawned.length = 0; exited.length = 0;
  scheduleRestart({ env: { DSH_DAEMON: '1' }, delayMs: 0, spawnImpl: () => { throw new Error('must not spawn'); }, exit: code => exited.push(code) });
  await new Promise(done => setTimeout(done, 20));
  assert.equal(spawned.length, 0);
  assert.equal(exited[0], 0);
});

test('scheduleRestart asks the development supervisor instead of spawning a second DSH', async () => {
  const calls = [];
  const exited = [];
  scheduleRestart({
    env: { DARASK_DEV_CONTROL_URL: 'http://127.0.0.1:9/', DARASK_DEV_CONTROL_TOKEN: 'secret' },
    delayMs: 0,
    spawnImpl: () => { throw new Error('must not spawn'); },
    exit: code => exited.push(code),
    fetchImpl: async (url, init) => { calls.push({ url, init }); return new Response('{"ok":true}'); },
  });
  await new Promise(done => setTimeout(done, 30));
  assert.equal(calls[0].url, 'http://127.0.0.1:9/');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer secret');
  assert.equal(JSON.parse(calls[0].init.body).action, 'restart');
  assert.equal(exited.length, 0);
});

test('restart route requires a same-origin browser POST', async () => {
  const [route] = restartRoutes({ delayMs: 60_000, spawnImpl: () => { throw new Error('must not spawn'); }, exit: () => {} });
  const missing = await route.fetch(new Request('http://localhost/api/darask/restart', { method: 'POST' }));
  assert.equal(missing.status, 403);
  const bad = await route.fetch(new Request('http://localhost/api/darask/restart', { method: 'POST', headers: { Origin: 'https://evil.example' } }));
  assert.equal(bad.status, 403);
  const ok = await route.fetch(new Request('http://localhost/api/darask/restart', { method: 'POST', headers: { Origin: 'http://localhost', host: 'localhost' } }));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).ok, true);
});
