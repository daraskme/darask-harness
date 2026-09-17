import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import { applyStatusEvent, initialStatusState } from '../src/status.mjs';

async function fixture() {
  const hooks = [];
  const effects = [];
  const timers = new Map();
  const requests = [];
  let cursor = 0;
  let timerId = 0;
  let clock = 0;
  let dirty = false;
  let client;
  let output;
  let defer = false;
  let fail = false;
  let sessionId = 'one';
  let config = { type: 'command', items: ['model'], refreshIntervalMs: 1000, commandRefreshIntervalMs: 5000, padding: 0 };
  let status = initialStatusState({ createdAt: 0 });
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [hooks[index].value, value => { hooks[index].value = value; dirty = true; }];
    },
    useMemo(create) { cursor++; return create(); },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = hooks[index];
      if (previous && deps.every((value, index) => Object.is(value, previous.deps[index]))) return;
      effects.push(() => {
        previous?.cleanup?.();
        hooks[index] = { deps, cleanup: effect() };
      });
    },
  };
  const schedule = (callback, delay, interval = false) => {
    const id = ++timerId;
    timers.set(id, { callback, at: clock + delay, delay, interval });
    return id;
  };
  runInNewContext(await readFile(new URL('../dist/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load({ factory }) {
      client = factory(id => {
        if (id === 'react') return react;
        if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
        throw new Error(`unexpected import: ${id}`);
      });
    } } },
    AbortController,
    Date: class extends Date { static now() { return clock; } },
    setTimeout: (fn, delay) => schedule(fn, delay),
    clearTimeout: id => timers.delete(id),
    setInterval: (fn, delay) => schedule(fn, delay, true),
    clearInterval: id => timers.delete(id),
    fetch(url, options) {
      const pending = Promise.withResolvers();
      const request = { url, signal: options.signal, resolve: text => pending.resolve({ ok: true, json: async () => ({ text }) }) };
      requests.push(request);
      if (fail) { fail = false; pending.reject(new Error('network error')); }
      else if (!defer) request.resolve(`result-${requests.length}`);
      return pending.promise;
    },
  });
  const render = () => {
    cursor = 0;
    dirty = false;
    output = client.StatusLine({
      sessionId,
      useProjection: name => name === 'daraskStatus' ? status : undefined,
      useSessions: select => select({ byId: { [sessionId]: { cwd: '/workspace', running: status.turn !== null } } }),
      useStatusConfig: select => select(config),
      useModelDirectory: select => select(null),
      t: key => key,
    });
    for (const effect of effects.splice(0)) effect();
  };
  const flush = async () => {
    for (let index = 0; index < 10; index++) {
      await setImmediate();
      if (!dirty) return;
      render();
    }
    assert.fail('hook updates did not settle');
  };
  return {
    requests, timers,
    async render() { render(); await flush(); },
    async event(type, data = {}, time = clock + 10) {
      clock = time;
      status = applyStatusEvent(status, { type, data, time });
      render();
      await flush();
    },
    async advance(ms) {
      clock += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at > clock) continue;
        if (timer.interval) timer.at = clock + timer.delay;
        else timers.delete(id);
        timer.callback();
      }
      await flush();
    },
    async configure(update) { config = { ...config, ...update }; render(); await flush(); },
    async session(id) { sessionId = id; render(); await flush(); },
    defer(value) { defer = value; },
    failNext() { fail = true; },
    text: () => output?.props.children.props.children,
    async resolve(index, text) { requests[index].resolve(text); await flush(); },
    dispose() { for (const hook of hooks) hook?.cleanup?.(); },
  };
}

test('event bursts keep the command timer and do not fetch until the configured interval', async t => {
  const f = await fixture();
  t.after(() => f.dispose());
  await f.render();
  assert.equal(f.requests.length, 1);
  for (let i = 0; i < 20; i++) await f.event('llm/retry-started');
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].signal.aborted, false);
  assert.equal(f.timers.size, 1);
  await f.advance(4799);
  assert.equal(f.requests.length, 1);
  await f.advance(1);
  assert.equal(f.requests.length, 2);
  assert.equal(f.timers.size, 1);
});

test('turn, session, mode and interval transitions refresh and clean up while stale requests cannot win', async t => {
  const f = await fixture();
  t.after(() => f.dispose());
  f.defer(true);
  await f.render();
  for (let i = 0; i < 20; i++) await f.event('tool/result');
  assert.equal(f.requests.length, 1, 'a slow request survives ordinary events');
  await f.event('turn/start', { turn: 1 });
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[0].signal.aborted, true);
  assert.match(f.requests[1].url, /trigger=turn/u);
  await f.event('turn/start', { turn: 2 });
  assert.equal(f.requests.length, 3, 'a new turn refreshes even if running remains true');
  assert.equal(f.requests[1].signal.aborted, true);
  await f.event('turn/end', { turn: 2 });
  assert.equal(f.requests.length, 4);
  assert.equal(f.requests[2].signal.aborted, true);
  await f.session('two');
  assert.equal(f.requests.length, 5);
  assert.equal(f.requests[3].signal.aborted, true);
  assert.match(f.requests[4].url, /session=two/u);
  await f.resolve(4, 'current');
  for (let index = 0; index < 4; index++) await f.resolve(index, 'stale');
  assert.equal(f.text(), 'current');
  assert.equal(f.timers.size, 1);
  f.defer(false);
  await f.configure({ commandRefreshIntervalMs: 7000 });
  assert.equal(f.requests.length, 6);
  assert.equal(f.requests[4].signal.aborted, true);
  assert.equal(f.timers.size, 1);
  await f.configure({ type: 'builtin' });
  assert.equal(f.requests[5].signal.aborted, true);
  assert.equal(f.timers.size, 0);
  await f.configure({ type: 'command' });
  assert.equal(f.requests.length, 7);
  await f.configure({ type: 'disabled' });
  assert.equal(f.timers.size, 0);
  assert.equal(f.requests[6].signal.aborted, true);
});

test('failed polling retries on the next interval and unmount aborts pending work', async t => {
  const f = await fixture();
  t.after(() => f.dispose());
  f.failNext();
  await f.render();
  assert.equal(f.requests.length, 1);
  assert.equal(f.text(), 'error.command');
  await f.advance(5000);
  assert.equal(f.requests.length, 2);
  assert.equal(f.text(), 'result-2');
  f.defer(true);
  await f.advance(5000);
  assert.equal(f.requests.length, 3);
  f.dispose();
  assert.equal(f.requests[2].signal.aborted, true);
  await f.resolve(2, 'after unmount');
  assert.equal(f.text(), 'result-2');
  assert.equal(f.timers.size, 0);
});
