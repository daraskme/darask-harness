import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, CATALOG_REFS, SHARED_AT_REF, credentialValue, isShareableRef, selectSecretRefs, shareStatus, readSharedAt, applySecretPush, pushPayload } from '../src/shared-credentials.mjs';

function credentials(seed = {}) {
  const keys = new Map(Object.entries(seed));
  const puts = [];
  return {
    keys, puts,
    async resolve(ref) { return keys.has(ref) ? { value: keys.get(ref), source: 'file' } : undefined; },
    async set(ref, value) { puts.push([ref, value]); keys.set(ref, value); },
    async unset(ref) { puts.push([ref, null]); keys.delete(ref); },
  };
}

test('only catalog references can be shared, and every one is a plain credential name', () => {
  for (const row of CATALOG) {
    assert.match(row.ref, /^[A-Z][A-Z0-9_]*$/);
    assert.ok(row.label && row.group && row.hint);
    assert.ok(isShareableRef(row.ref));
  }
  // Connection material and hub-local bookkeeping must never be offered.
  for (const ref of ['DARASK_WORKSPACE_ABC', 'DARASK_WORKSPACE_ABC_SESSION', 'DARASK_OPENAI_RELAY', 'DARASK_LOCAL_API_KEY', SHARED_AT_REF]) assert.equal(isShareableRef(ref), false);
  assert.equal(new Set(CATALOG_REFS).size, CATALOG_REFS.length);
});

test('the hub exports only configured references and never their values', async () => {
  const store = credentials({ DEEPSEEK_API_KEY: 'sk-deepseek-secret', DARASK_OPENAI_API_KEY: 'devin-secret' });
  const { secrets, missing, requested } = await pushPayload(store, ['DEEPSEEK_API_KEY', 'DARASK_OPENAI_API_KEY', 'DARASK_XAI_API_KEY']);
  assert.deepEqual(requested, ['DEEPSEEK_API_KEY', 'DARASK_OPENAI_API_KEY', 'DARASK_XAI_API_KEY']);
  assert.deepEqual(secrets, { DEEPSEEK_API_KEY: 'sk-deepseek-secret', DARASK_OPENAI_API_KEY: 'devin-secret' });
  assert.deepEqual(missing, ['DARASK_XAI_API_KEY']);
  const rows = await shareStatus(store, { refs: ['DEEPSEEK_API_KEY', 'DARASK_XAI_API_KEY'] });
  assert.deepEqual(rows.map(row => [row.ref, row.configured]), [['DEEPSEEK_API_KEY', true], ['DARASK_XAI_API_KEY', false]]);
  assert.ok(!JSON.stringify(rows).includes('sk-deepseek-secret'));
});

test('a push writes, stamps, and reverts remote credentials', async () => {
  const store = credentials();
  const first = await applySecretPush(store, { DARASK_OPENAI_API_KEY: 'v1-key', DARASK_OPENROUTER_API_KEY: 'cog_v3' }, { now: () => '2026-01-01T00:00:00.000Z' });
  assert.deepEqual(first.saved, ['DARASK_OPENAI_API_KEY', 'DARASK_OPENROUTER_API_KEY']);
  assert.deepEqual(first.removed, []);
  assert.equal(store.keys.get('DARASK_OPENAI_API_KEY'), 'v1-key');
  const at = JSON.parse(store.keys.get(SHARED_AT_REF));
  assert.equal(at.DARASK_OPENAI_API_KEY, '2026-01-01T00:00:00.000Z');
  const status = await shareStatus(store, { refs: ['DARASK_OPENAI_API_KEY', 'DARASK_OPENROUTER_API_KEY'], sharedAt: await readSharedAt(store) });
  assert.deepEqual(status.map(row => [row.ref, row.configured, row.sharedAt]), [['DARASK_OPENAI_API_KEY', true, '2026-01-01T00:00:00.000Z'], ['DARASK_OPENROUTER_API_KEY', true, '2026-01-01T00:00:00.000Z']]);
  const second = await applySecretPush(store, { DARASK_OPENAI_API_KEY: null }, { now: () => '2026-01-02T00:00:00.000Z' });
  assert.deepEqual(second.removed, ['DARASK_OPENAI_API_KEY']);
  assert.equal(store.keys.has('DARASK_OPENAI_API_KEY'), false);
  assert.equal(JSON.parse(store.keys.get(SHARED_AT_REF)).DARASK_OPENAI_API_KEY, undefined);
  assert.ok(store.keys.has('DARASK_OPENROUTER_API_KEY'));
});

test('a push rejects anything outside the catalog before the first write', async () => {
  const store = credentials();
  for (const secrets of [{ DARASK_WORKSPACE_X: 'token' }, { DEEPSEEK_API_KEY: '' }, { DEEPSEEK_API_KEY: 42 }, { DEEPSEEK_API_KEY: 'x'.repeat(8193) }, []]) {
    await assert.rejects(applySecretPush(store, secrets), /共有|キー/);
  }
  assert.equal(store.puts.length, 0);
  assert.throws(() => selectSecretRefs(['DARASK_WORKSPACE_X']), /選択/);
  assert.throws(() => selectSecretRefs('DEEPSEEK_API_KEY'), /選択/);
  assert.deepEqual(selectSecretRefs(undefined), [...CATALOG_REFS]);
  assert.equal(credentialValue('ok'), true);
  assert.equal(credentialValue('bad\u0000value'), false);
});
