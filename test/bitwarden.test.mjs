import test from 'node:test';
import assert from 'node:assert/strict';
import { BITWARDEN_TOKEN, createBitwarden, defaultBitwarden, validateBitwarden } from '../src/bitwarden.mjs';

const ids = {
  deepseek: '11111111-1111-4111-8111-111111111111',
  jev: '22222222-2222-4222-8222-222222222222',
};

function credentials() {
  const values = new Map();
  return {
    values,
    resolve: async key => values.has(key) ? { value: values.get(key) } : undefined,
    set: async (key, value) => values.set(key, value),
    unset: async key => values.delete(key),
  };
}

test('Bitwarden settings accept only an absolute bws path and approved secret UUID mappings', () => {
  const config = validateBitwarden({ enabled: true, executable: 'C:\\Tools\\bws.exe', secretIds: { DEEPSEEK_API_KEY: ids.deepseek, AI_GATEWAY_API_KEY: ids.jev } });
  assert.equal(config.enabled, true);
  assert.equal(config.secretIds.DEEPSEEK_API_KEY, ids.deepseek);
  assert.throws(() => validateBitwarden({ executable: 'bws.exe' }), /absolute/u);
  assert.throws(() => validateBitwarden({ secretIds: { UNKNOWN_SECRET: ids.deepseek } }));
  assert.throws(() => validateBitwarden({ secretIds: { DEEPSEEK_API_KEY: 'not-a-uuid' } }));
  assert.equal(defaultBitwarden().secretIds.DEEPSEEK_API_KEY, '');
});

test('Bitwarden sync gets only mapped UUIDs and stores values without exposing them', async () => {
  const store = credentials();
  const calls = [];
  const values = new Map([[ids.deepseek, 'official-deepseek-key'], [ids.jev, 'jev-gateway-key']]);
  const bitwarden = createBitwarden({ credentials: store, now: () => '2026-09-17T12:00:00.000Z', run(launch, args, options) {
    calls.push({ launch, args, env: options.env });
    const id = args[2];
    return { cancel() {}, completion: Promise.resolve({ code: 0, stdout: JSON.stringify({ object: 'secret', id, key: 'ignored', value: values.get(id) }), stderr: '', terminated: true }) };
  } });
  const config = validateBitwarden({ enabled: true, executable: 'C:\\Tools\\bws.exe', secretIds: { DEEPSEEK_API_KEY: ids.deepseek, AI_GATEWAY_API_KEY: ids.jev } });
  await bitwarden.save(config, 'machine-account-access-token');
  const result = await bitwarden.sync(config);
  assert.deepEqual(calls.map(call => call.args), [
    ['secret', 'get', ids.deepseek, '--output', 'json'],
    ['secret', 'get', ids.jev, '--output', 'json'],
  ]);
  assert.ok(calls.every(call => call.launch.command === 'C:\\Tools\\bws.exe' && call.env.BWS_ACCESS_TOKEN === 'machine-account-access-token'));
  assert.ok(calls.every(call => !call.args.includes('list')));
  assert.equal(store.values.get('DEEPSEEK_API_KEY'), 'official-deepseek-key');
  assert.equal(store.values.get('AI_GATEWAY_API_KEY'), 'jev-gateway-key');
  assert.equal(store.values.get(BITWARDEN_TOKEN), 'machine-account-access-token');
  assert.equal(result.lastSyncedAt, '2026-09-17T12:00:00.000Z');
  assert.ok(!JSON.stringify(result).includes('official-deepseek-key'));
  assert.ok(!JSON.stringify(result).includes('machine-account-access-token'));
});

test('Bitwarden sync is all-or-nothing and errors never include secret output', async () => {
  const store = credentials();
  store.values.set(BITWARDEN_TOKEN, 'machine-account-access-token');
  let calls = 0;
  const bitwarden = createBitwarden({ credentials: store, run(_launch, args) {
    calls += 1;
    const id = args[2];
    const stdout = calls === 1 ? JSON.stringify({ object: 'secret', id, value: 'must-not-be-stored' }) : 'private-error-output';
    return { cancel() {}, completion: Promise.resolve({ code: calls === 1 ? 0 : 1, stdout, stderr: 'private-stderr', terminated: true }) };
  } });
  const config = validateBitwarden({ enabled: true, executable: 'C:\\Tools\\bws.exe', secretIds: { DEEPSEEK_API_KEY: ids.deepseek, AI_GATEWAY_API_KEY: ids.jev } });
  await assert.rejects(bitwarden.sync(config), error => !error.message.includes('private') && !error.message.includes('must-not-be-stored'));
  assert.equal(store.values.has('DEEPSEEK_API_KEY'), false);
  assert.equal(store.values.has('AI_GATEWAY_API_KEY'), false);
});
