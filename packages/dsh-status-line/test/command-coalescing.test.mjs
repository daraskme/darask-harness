import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { Config, createStatusLineService } from '../src/index.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(homedir(), 'status-coalescing-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = join(root, 'status-line.json');
  const sessions = new Map(['one', 'two'].map(id => [id, { id, header: { cwd: root, createdAt: 1000 } }]));
  const status = { startedAt: 1000, turn: null, turns: 0, usageByModel: {}, model: { provider: 'p', id: 'm' } };
  const calls = [];
  let clock = 10_000;
  const service = createStatusLineService({
    config: Config({ type: 'command', command: 'first', userConfigFile: file, items: ['model'] }),
    ctx: {
      sessions: { get: id => sessions.get(id) },
      sessionProjections: { snapshot: () => ({ values: { daraskStatus: status } }) },
      get: () => undefined,
      logger: { warn() {} },
    },
    now: () => clock,
    runCommand(command, context, options) {
      const deferred = Promise.withResolvers();
      calls.push({ command, context, options, ...deferred });
      return deferred.promise;
    },
  });
  await service.effectiveConfig();
  return {
    root, service, sessions, status, calls,
    async configure(config) {
      await writeFile(file, JSON.stringify(config));
      clock += 2500;
      await service.effectiveConfig();
    },
  };
}

test('concurrent renders of a slow command share one execution per session and release it on completion', async t => {
  const f = await fixture(t);
  const requests = Array.from({ length: 20 }, () => f.service.render('one'));
  await setImmediate();
  assert.equal(f.calls.length, 1);
  const other = f.service.render('two');
  await setImmediate();
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0].context.session_id, 'one');
  assert.equal(f.calls[1].context.session_id, 'two');
  f.calls[0].resolve({ ok: true, text: 'one', exitCode: 7 });
  f.calls[1].resolve({ ok: true, text: 'two' });
  for (const result of await Promise.all(requests)) {
    assert.equal(result.text, 'one');
    assert.equal(result.context.session_id, 'one');
    assert.equal(result.exitCode, 7, 'partial command success is preserved');
  }
  assert.equal((await other).text, 'two');
  const refreshed = f.service.render('one');
  await setImmediate();
  assert.equal(f.calls.length, 3, 'settled results are not cached');
  f.calls[2].resolve({ ok: true, text: 'fresh' });
  assert.equal((await refreshed).text, 'fresh');
});

test('command and timeout changes invalidate in-flight work; old completion cannot clear its replacement', async t => {
  const f = await fixture(t);
  const old = f.service.render('one');
  await setImmediate();
  await f.configure({ command: 'second', commandTimeoutMs: 9000 });
  const current = f.service.render('one');
  await setImmediate();
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].command, 'second');
  assert.equal(f.calls[1].options.timeoutMs, 9000);
  f.calls[0].resolve({ ok: true, text: 'old' });
  await old;
  const duplicate = f.service.render('one');
  await setImmediate();
  assert.equal(f.calls.length, 2);
  await f.configure({ command: 'second', commandTimeoutMs: 1000 });
  const shorter = f.service.render('one');
  await setImmediate();
  assert.equal(f.calls.length, 3);
  assert.equal(f.calls[2].options.timeoutMs, 1000);
  f.calls[1].resolve({ ok: true, text: 'second' });
  f.calls[2].resolve({ ok: true, text: 'shorter' });
  assert.equal((await current).text, 'second');
  assert.equal((await duplicate).text, 'second');
  assert.equal((await shorter).text, 'shorter');
});

test('returning to an earlier command does not reuse its superseded in-flight result', async t => {
  const f = await fixture(t);
  const first = f.service.render('one');
  await setImmediate();
  await f.configure({ command: 'second' });
  const second = f.service.render('one');
  await setImmediate();
  await f.configure({ command: 'first' });
  const third = f.service.render('one');
  await setImmediate();
  assert.equal(f.calls.length, 3);
  for (const [index, call] of f.calls.entries()) call.resolve({ ok: true, text: `${index}` });
  assert.deepEqual((await Promise.all([first, second, third])).map(result => result.text), ['0', '1', '2']);
});

test('cwd and turn transitions do not share stale command contexts', async t => {
  const f = await fixture(t);
  const idle = f.service.render('one');
  await setImmediate();
  f.sessions.get('one').header.cwd = join(f.root, 'nested');
  const moved = f.service.render('one');
  await setImmediate();
  f.status.turn = { number: 1, startedAt: 10_000 };
  const started = f.service.render('one', 'turn');
  await setImmediate();
  f.status.turn = { number: 2, startedAt: 10_000 };
  const nextTurn = f.service.render('one', 'turn');
  await setImmediate();
  assert.equal(f.calls.length, 4);
  assert.equal(f.calls[1].options.cwd, join(f.root, 'nested'));
  assert.equal(f.calls[2].context.turn.number, 1);
  assert.equal(f.calls[3].context.turn.number, 2);
  for (const call of f.calls) call.resolve({ ok: true, text: 'done' });
  await Promise.all([idle, moved, started, nextTurn]);
});

test('disabling and reenabling command mode discards pending work from the earlier mode', async t => {
  const f = await fixture(t);
  const old = f.service.render('one');
  await setImmediate();
  await f.configure({ type: 'disabled' });
  assert.equal((await f.service.render('one')).type, 'disabled');
  assert.equal(f.calls.length, 1);
  await f.configure({ type: 'command' });
  const current = f.service.render('one');
  await setImmediate();
  assert.equal(f.calls.length, 2);
  f.calls[0].resolve({ ok: true, text: 'old' });
  f.calls[1].resolve({ ok: true, text: 'current' });
  assert.equal((await old).text, 'old');
  assert.equal((await current).text, 'current');
});

test('failed and rejected commands are shared only while pending and retry afterwards', async t => {
  const f = await fixture(t);
  const failure = f.service.render('one');
  const duplicate = f.service.render('one');
  await setImmediate();
  assert.equal(f.calls.length, 1);
  f.calls[0].resolve({ ok: false, error: 'timeout' });
  for (const result of await Promise.all([failure, duplicate])) {
    assert.equal(result.text, 'm');
    assert.equal(result.error, 'timeout');
  }
  const retry = f.service.render('one');
  const rejected = assert.rejects(retry, /runner failed/u);
  await setImmediate();
  assert.equal(f.calls.length, 2);
  f.calls[1].reject(new Error('runner failed'));
  await rejected;
  const recovered = f.service.render('one');
  await setImmediate();
  assert.equal(f.calls.length, 3);
  f.calls[2].resolve({ ok: true, text: 'recovered' });
  assert.equal((await recovered).text, 'recovered');
});

test('route validation still prevents commands for invalid, absent or cross-site sessions', async t => {
  const f = await fixture(t);
  const route = f.service.routes.find(route => !route.path.endsWith('/config'));
  for (const [query, headers, status] of [
    ['../etc', {}, 400],
    ['absent', {}, 404],
    ['one', { 'sec-fetch-site': 'cross-site' }, 403],
  ]) {
    const response = await route.fetch(new Request(`http://127.0.0.1/api/darask/status-line?session=${encodeURIComponent(query)}`, { headers }));
    assert.equal(response.status, status);
  }
  assert.equal(f.calls.length, 0);
  await f.configure({ type: 'disabled' });
  assert.equal((await f.service.render('one')).type, 'disabled');
  assert.equal(f.calls.length, 0);
});
