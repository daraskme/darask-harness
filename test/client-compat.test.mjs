import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { patchClient, CLIENT_PATCHES, compatibleGraph, compatibleUrl, compatibleResource, COMPAT_PATH } from '../src/client-compat.mjs';
import { removedFeatureRequest } from '../vendor/dsh-bridge-gateway/lib/darask-features.mjs';
const require = createRequire(import.meta.url);
const bundle = id => readFileSync(require.resolve(`${id}/client`), 'utf8');
const snapshotStore = initial => {
  let state = initial; const listeners = new Set();
  return { getSnapshot: () => state, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    set(next) { state = next; for (const fn of listeners) fn(); }, update(fn) { state = { ...state }; fn(state); for (const fn of listeners) fn(); } };
};
function settingsRuntime(source, outcome) {
  let plugin, calls = 0; const disposers = [];
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load({ factory }) {
    plugin = factory(id => id === '@deepseek-ai/cordis'
      ? { Service: class { constructor(ctx, name) { ctx[name] = this; this.ctx = ctx; } } }
      : id === '@deepseek-ai/dsh-client-store' ? { createSnapshotStore: snapshotStore } : require(id));
  } } }, setTimeout, clearTimeout, AbortController });
  const ctx = { remote: { $host: Object.freeze({ isLoopback: false }), $on: () => () => {}, settings: { async describe() { calls++; return outcome; } } },
    effect(fn) { disposers.push(fn()); }, on: () => () => {} };
  plugin.apply(ctx);
  return { ctx, calls: () => calls, dispose: () => disposers.forEach(fn => fn?.()) };
}
test('real pinned settings client reads its authenticated host from a remote browser without spoofing loopback', async () => {
  const id = '@deepseek-ai/dsh-client-ui-settings';
  const source = bundle(id);
  const value = { writable: true, hasDocument: true, namespaces: [{ ns: 'llm-pi-ai', value: { providers: {} }, revision: 1 }] };
  const before = settingsRuntime(source, { ok: true, value });
  await before.ctx.settingsScope.describe().ensure();
  assert.equal(before.ctx.settingsScope.describe().getSnapshot().status, 'unavailable');
  assert.equal(before.calls(), 0); before.dispose();
  const after = settingsRuntime(patchClient(id, source), { ok: true, value });
  await after.ctx.settingsScope.describe().ensure();
  assert.equal(after.ctx.settingsScope.describe().getSnapshot().status, 'ready');
  assert.equal(after.ctx.settingsScope.describe().getSnapshot().view, value);
  assert.equal(after.ctx.remote.$host.isLoopback, false); assert.equal(after.calls(), 1); after.dispose();
  const rejected = settingsRuntime(patchClient(id, source), { ok: false, error: { message: 'unauthorized' } });
  await rejected.ctx.settingsScope.describe().ensure();
  assert.equal(rejected.ctx.settingsScope.describe().getSnapshot().view, undefined);
  assert.equal(rejected.ctx.settingsScope.describe().getSnapshot().error, 'unauthorized'); rejected.dispose();
});
test('pinned provider clients lose duplicate sign-in seats, while retaining native settings and tool support', () => {
  for (const id of Object.keys(CLIENT_PATCHES)) {
    const output = patchClient(id, bundle(id));
    new vm.Script(output);
    if (id === 'dsh-grok-provider') assert.ok(!output.includes('id: "grok-auth"'));
    if (id === 'dsh-codex-connect') {
      assert.ok(!output.includes('id: "dsh-codex-connect-account"'));
      assert.ok(output.includes('id: "openai-codex-fast-mode"'));
    }
    assert.throws(() => patchClient(id, 'changed upstream bundle'), /incompatible/);
  }
});
test('boot graph URL changes are confined to patched scripts and do not mutate host state', () => {
  const url = '/plugins/??@deepseek-ai/dsh-client-ui-settings/client.js,dsh-grok-provider/client.js&rev=abc';
  const graph = { batches: [{ url }], entries: [{ id: 'react', url: '/plugins/react/client.js?rev=abc' }] };
  const next = compatibleGraph(graph);
  assert.equal(graph.batches[0].url, url);
  assert.ok(next.batches[0].url.startsWith(COMPAT_PATH));
  assert.equal(new URL(next.batches[0].url, 'http://local').searchParams.get('resource'), url);
  assert.equal(next.entries[0].url, graph.entries[0].url);
});
test('removed Gateway features cannot be re-enabled by stale UI requests', () => {
  for (const endpoint of ['gatewayStart', 'gatewaySaveConfig', 'startCustomTunnel', 'saveCustomTunnelConfig']) assert.equal(removedFeatureRequest(endpoint), true);
  assert.equal(removedFeatureRequest('setTunnelAutoStart', { tunnel: 'custom' }), true);
  assert.equal(removedFeatureRequest('platformStart', { platformId: 'feishu' }), true);
  assert.equal(removedFeatureRequest('platformStart', { platformId: 'telegram' }), false);
  assert.equal(removedFeatureRequest('setTunnelAutoStart', { tunnel: 'cloudflared' }), false);
  assert.equal(removedFeatureRequest('startCloudflared'), false);
});

test('native client HMR can replace a derived bundle revision without losing compatibility patches', () => {
  const original = '/plugins/??dsh-grok-provider/client.js&rev=before';
  const transformed = compatibleUrl(original);
  assert.match(transformed, /[?&]rev=before/);
  const rebuilt = transformed.replace(/([?&]rev=)[^&#]*/, '$1after');
  assert.equal(compatibleResource('http://local'+rebuilt), '/plugins/??dsh-grok-provider/client.js&rev=after');
  assert.equal(compatibleResource('http://local'+transformed), original);
  assert.equal(compatibleResource('http://local'+COMPAT_PATH+'?resource=https%3A%2F%2Fevil.test'), null);
});

test('the full startup combo preserves all 57 registrations and every unrelated factory', () => {
  const ids = JSON.parse(readFileSync(new URL('./fixtures/web-client-order.json', import.meta.url), 'utf8'));
  const source = ids.map(id => bundle(id) + '\n;\n').join('');
  const registered = text => {
    const entries = new Map();
    vm.runInNewContext(text, { window: { __ModuleLoader__: { load({ id, factory }) {
      assert.ok(!entries.has(id), `duplicate registration: ${id}`); entries.set(id, factory.toString());
    } } } });
    return entries;
  };
  const before = registered(source);
  let patched = source;
  for (const id of Object.keys(CLIENT_PATCHES)) patched = patchClient(id, patched);
  const after = registered(patched);
  assert.deepEqual([...after.keys()], ids);
  assert.equal(after.size, 57);
  for (const id of ids) {
    if (id in CLIENT_PATCHES) assert.notEqual(after.get(id), before.get(id), id);
    else assert.equal(after.get(id), before.get(id), `${id} must be byte-for-byte unchanged`);
  }
  assert.ok(after.has('@deepseek-ai/dsh-typert-registry'));
  assert.ok(after.has('@deepseek-ai/dsh-client-connection'));
  assert.ok(!after.get('dsh-grok-provider').includes('id: "grok-auth"'));
});

test('a provider patch cannot match a different factory or span plugin registrations', () => {
  const grok = bundle('dsh-grok-provider');
  assert.throws(() => patchClient('dsh-grok-provider', grok.replace('id: "dsh-grok-provider"', 'id: "other-provider"')), /escaped its plugin/);
  const split = grok.replace('}, GrokSettings))', '}, DifferentSettings))')
    + '\n;window.__ModuleLoader__.load({ id: "later-plugin", factory: () => { /* }, GrokSettings)) */ } });';
  assert.throws(() => patchClient('dsh-grok-provider', split), /escaped its plugin/);
});
