import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { setImmediate } from 'node:timers/promises';
import vm from 'node:vm';
import { buildSync } from 'esbuild';
import React from 'react';

const require = createRequire(import.meta.url);
const source = buildSync({
  stdin: {
    contents: readFileSync(new URL('../src/dashboard-client.jsx', import.meta.url), 'utf8') + '\nexport { useColdSessions };',
    resolveDir: fileURLToPath(new URL('../src', import.meta.url)), loader: 'jsx',
  },
  bundle: true, format: 'cjs', platform: 'node', external: ['react', 'react/*', '@deepseek-ai/*'], write: false,
}).outputFiles[0].text;
const node = '11111111-1111-4111-8111-111111111111';
const groups = [{
  node, name: 'Worker', status: 'online',
  workspaces: Array.from({ length: 9 }, (_, i) => ({ id: `w${i}`, path: `/workspace/${i}` })),
}];
const opened = [{ node, workspace: 'w8', current: 'hot', sessions: [{ id: 'hot', title: 'Hot', running: true }] }];
const deferred = () => Promise.withResolvers();
const sameDeps = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));

// Model React's batched state updates, effect cleanup and Object.is dependencies
// without a browser or a second React dependency.
function harness(t) {
  const slots = [], requests = [], timers = new Map(), events = new EventTarget();
  let index = 0, effects = [], dirty = false, component, value, mounted = true;
  const hooks = {
    useState(initial) {
      const i = index++;
      slots[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, update => {
        if (!mounted) return;
        const next = typeof update === 'function' ? update(slots[i].value) : update;
        if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true; }
      }];
    },
    useMemo(factory, deps) {
      const i = index++;
      if (!sameDeps(slots[i]?.deps, deps)) slots[i] = { value: factory(), deps };
      return slots[i].value;
    },
    useEffect(effect, deps) {
      const i = index++;
      if (!sameDeps(slots[i]?.deps, deps)) effects.push(() => {
        slots[i]?.cleanup?.();
        slots[i] = { deps, cleanup: effect() };
      });
    },
    useSyncExternalStore(_subscribe, snapshot) { index++; return snapshot(); },
  };
  const window = {
    addEventListener: (...args) => events.addEventListener(...args),
    removeEventListener: (...args) => events.removeEventListener(...args),
    dispatchEvent: event => events.dispatchEvent(event),
    setInterval(fn, ms) { const id = Symbol(); timers.set(id, { fn, ms }); return id; },
    clearInterval: id => timers.delete(id),
    localStorage: { getItem: () => null, setItem() {} },
  };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports, window, Event, AbortController, AbortSignal,
    require: id => id === 'react' ? { ...React, ...hooks }
      : id === '@deepseek-ai/dsh-client-ui-primitives' ? { Button: 'button', Input: 'input', Switch: 'input', StateDot: 'span' } : require(id),
    fetch(_url, init) {
      const request = { body: JSON.parse(init.body), signal: init.signal, ...deferred() };
      requests.push(request);
      return request.promise.then(payload => ({ ok: true, json: async () => payload }));
    },
  });
  const render = (next = component) => {
    component = next; dirty = false; index = 0; effects = [];
    value = component(module.exports);
    for (const effect of effects) effect();
    return value;
  };
  const flush = async () => {
    await setImmediate();
    while (dirty) render();
  };
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    for (const slot of slots) slot?.cleanup?.();
  };
  t.after(unmount);
  return { requests, timers, window, render, flush, unmount, value: () => value };
}

async function finishBatch(h, start, count) {
  for (let i = start; i < start + count; i++) {
    assert.ok(h.requests[i], `target ${i} was reached`);
    h.requests[i].resolve({ items: [{ sessionId: `cold-${i}`, cwd: h.requests[i].body.cwd }] });
    await h.flush();
  }
}

test('hot session updates do not restart cold work or starve targets after the first four', async t => {
  const h = harness(t);
  let current = opened, catalog = groups;
  h.render(({ useColdSessions }) => useColdSessions(catalog, current, 0));
  assert.equal(h.requests.length, 4);
  for (let i = 0; i < 6; i++) {
    current = [{ ...opened[0], current: `current-${i}`, sessions: [{ ...opened[0].sessions[0], title: `Hot ${i}`, running: i % 2 === 0 }] }];
    h.render();
  }
  catalog = [{ ...groups[0], name: 'Renamed', workspaces: [...groups[0].workspaces].reverse() }];
  h.render();
  assert.equal(h.requests.length, 4);
  assert.ok(h.requests.every(request => !request.signal.aborted));
  await finishBatch(h, 0, 8);
  assert.equal(h.requests.length, 8);
  assert.equal(new Set(h.requests.map(request => request.body.cwd)).size, 8);
  assert.equal(Object.keys(h.value()).length, 8);
});

test('target/cwd changes cancel pending work, discard stale replies and cancel on unmount', async t => {
  const h = harness(t);
  let catalog = groups, live = opened;
  h.render(({ useColdSessions }) => useColdSessions(catalog, live, 0));
  const first = h.requests.slice();
  catalog = [{ ...groups[0], workspaces: [{ id: 'w0', path: '/new' }] }];
  h.render();
  assert.ok(first.every(request => request.signal.aborted));
  assert.equal(h.requests.length, 5);
  assert.equal(h.requests[4].body.cwd, '/new');
  for (const request of first) request.resolve({ items: ['stale'] });
  await h.flush();
  assert.equal(Object.keys(h.value()).length, 0);
  h.requests[4].resolve({ items: ['new'] });
  await h.flush();
  catalog = [{ ...catalog[0], workspaces: [{ id: 'w0', path: '/newer' }] }];
  h.render();
  assert.equal(h.value()[`${node}:w0`], undefined, 'cached data belongs to its original cwd');
  live = [{ node, workspace: 'w0', sessions: [{ id: 'now-hot' }] }];
  h.render();
  assert.equal(h.requests[5].signal.aborted, true);
  live = [];
  h.render();
  assert.equal(h.requests.length, 7);
  h.unmount();
  assert.equal(h.requests[6].signal.aborted, true);
  h.requests[5].resolve({ items: ['stale'] });
  h.requests[6].resolve({ items: ['unmounted'] });
  await h.flush();
  assert.equal(h.requests.length, 7);
});

test('refresh errors preserve same-cwd results, clear on retry and never reuse results for another cwd', async t => {
  const h = harness(t);
  let catalog = [{ ...groups[0], workspaces: [groups[0].workspaces[0]] }], tick = 0;
  h.render(({ useColdSessions }) => useColdSessions(catalog, [], tick));
  h.requests[0].resolve({ items: ['last success'] });
  await h.flush();
  const key = `${node}:w0`;
  tick++;
  h.render();
  h.requests[1].reject(new Error('retryable'));
  await h.flush();
  assert.equal(h.value()[key].items[0], 'last success');
  assert.equal(h.value()[key].error, 'retryable');
  tick++;
  h.render();
  h.requests[2].resolve({ items: ['retried'] });
  await h.flush();
  assert.equal(h.value()[key].items[0], 'retried');
  assert.equal(h.value()[key].error, undefined);
  catalog = [{ ...catalog[0], workspaces: [{ id: 'w0', path: '/other' }] }];
  h.render();
  h.requests[3].reject(new Error('new cwd unavailable'));
  await h.flush();
  assert.equal(h.value()[key].items.length, 0);
  assert.equal(h.value()[key].error, 'new cwd unavailable');
});

test('periodic, manual and failed-catalog refreshes each run one cold batch and retry failed targets', async t => {
  const h = harness(t), loads = [];
  const loadGroups = () => { const load = deferred(); loads.push(load); return load.promise; };
  const props = {
    navigation: { subscribe() {}, getOpenedSnapshot: () => opened },
    loadGroups, hostName: 'Hub', useSessions: () => ({ phase: 'ready', ids: [], byId: {} }),
    useSessionPendingInteraction: () => new Map(), useWorkspaces: () => ({ items: [] }), openLocal() {},
  };
  h.render(({ DashboardPanel }) => DashboardPanel(props));
  loads[0].resolve({ groups });
  await h.flush();
  assert.equal(h.requests.length, 4);
  h.requests[0].reject(new Error('temporary failure'));
  await h.flush();
  await finishBatch(h, 1, 7);
  assert.equal(h.requests.length, 8);
  const [{ fn: refresh, ms }] = h.timers.values();
  assert.equal(ms, 30000);
  refresh();
  loads[1].resolve({ groups: structuredClone(groups) });
  await h.flush();
  assert.equal(h.requests.length, 12);
  await finishBatch(h, 8, 8);
  assert.equal(h.requests[8].body.cwd, h.requests[0].body.cwd, 'failed target retried');
  const findRefresh = element => {
    if (element?.props?.children === '更新') return element;
    return React.Children.toArray(element?.props?.children).map(findRefresh).find(Boolean);
  };
  findRefresh(h.value()).props.onClick();
  await h.flush();
  loads[2].resolve({ groups: structuredClone(groups) });
  await h.flush();
  assert.equal(h.requests.length, 20, 'manual refresh starts just one four-worker batch');
  await finishBatch(h, 16, 8);
  assert.equal(h.requests.length, 24);
  refresh();
  loads[3].reject(new Error('catalog unavailable'));
  await h.flush();
  assert.equal(h.requests.length, 28, 'catalog failure still refreshes known cold targets');
  await finishBatch(h, 24, 8);
  h.unmount();
  assert.equal(h.timers.size, 0);
  h.window.dispatchEvent(new Event('darask-workspaces-changed'));
  assert.equal(loads.length, 4);
});
