import test from 'node:test';
import assert from 'node:assert/strict';
import { BITWARDEN_AUTO_REFS, BITWARDEN_TOKEN, createBitwarden, defaultBitwarden, validateBitwarden } from '../src/bitwarden.mjs';

const ids = {
  DEEPSEEK_API_KEY: '11111111-1111-4111-8111-111111111111',
  AI_GATEWAY_API_KEY: '22222222-2222-4222-8222-222222222222',
  DARASK_R2_ACCESS_KEY_ID: '33333333-3333-4333-8333-333333333333',
  DARASK_R2_SECRET_ACCESS_KEY: '44444444-4444-4444-8444-444444444444',
  DARASK_CLOUDFLARE_BROWSER_RUN: '55555555-5555-4555-8555-555555555555',
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
  const config = validateBitwarden({ enabled: true, executable: 'C:\\Tools\\bws.exe', secretIds: { DEEPSEEK_API_KEY: ids.DEEPSEEK_API_KEY, AI_GATEWAY_API_KEY: ids.AI_GATEWAY_API_KEY } });
  assert.equal(config.enabled, true);
  assert.equal(config.secretIds.DEEPSEEK_API_KEY, ids.DEEPSEEK_API_KEY);
  assert.throws(() => validateBitwarden({ executable: 'bws.exe' }), /absolute/u);
  assert.throws(() => validateBitwarden({ secretIds: { UNKNOWN_SECRET: ids.DEEPSEEK_API_KEY } }));
  assert.throws(() => validateBitwarden({ secretIds: { DEEPSEEK_API_KEY: 'not-a-uuid' } }));
  assert.equal(defaultBitwarden().secretIds.DEEPSEEK_API_KEY, '');
});

test('Bitwarden token-only sync discovers the five approved keys and stores no returned values in status', async () => {
  const store = credentials();
  const calls = [];
  const values = new Map(BITWARDEN_AUTO_REFS.map(ref => [ids[ref], `value-for-${ref}`]));
  const catalog = [...BITWARDEN_AUTO_REFS.map(ref => ({ id: ids[ref], key: ref, projectIds: [] })),
    { id: '66666666-6666-4666-8666-666666666666', key: 'UNAPPROVED_SECRET', projectIds: [] }];
  const bitwarden = createBitwarden({ credentials: store, now: () => '2026-09-17T12:00:00.000Z', run(launch, args, options) {
    calls.push({ launch, args, env: options.env });
    const id = args[2];
    const stdout = args[1] === 'list' ? JSON.stringify(catalog) : JSON.stringify({ id, key: 'ignored', value: values.get(id) });
    return { cancel() {}, completion: Promise.resolve({ code: 0, stdout, stderr: '', terminated: true }) };
  } });
  const config = validateBitwarden({ enabled: true, executable: 'C:\\Tools\\bws.exe' });
  await bitwarden.save(config, 'machine-account-access-token');
  const result = await bitwarden.sync(config);
  assert.deepEqual(calls.map(call => call.args), [
    ['secret', 'list', '--output', 'json'],
    ...BITWARDEN_AUTO_REFS.map(ref => ['secret', 'get', ids[ref], '--output', 'json']),
  ]);
  assert.ok(calls.every(call => call.launch.command === 'C:\\Tools\\bws.exe' && call.env.BWS_ACCESS_TOKEN === 'machine-account-access-token'));
  for (const ref of BITWARDEN_AUTO_REFS) assert.equal(store.values.get(ref), `value-for-${ref}`);
  assert.equal(store.values.has('UNAPPROVED_SECRET'), false);
  assert.equal(store.values.get(BITWARDEN_TOKEN), 'machine-account-access-token');
  assert.equal(result.lastSyncedAt, '2026-09-17T12:00:00.000Z');
  assert.equal(result.mapped, BITWARDEN_AUTO_REFS.length);
  assert.ok(!JSON.stringify(result).includes('value-for-'));
  assert.ok(!JSON.stringify(result).includes('machine-account-access-token'));
});

test('Bitwarden discovery fails closed for missing or duplicate approved keys', async () => {
  for (const catalog of [
    BITWARDEN_AUTO_REFS.slice(1).map(ref => ({ id: ids[ref], key: ref, projectIds: [] })),
    [...BITWARDEN_AUTO_REFS.map(ref => ({ id: ids[ref], key: ref, projectIds: [] })), { id: '66666666-6666-4666-8666-666666666666', key: BITWARDEN_AUTO_REFS[0], projectIds: [] }],
  ]) {
    const store = credentials(); store.values.set(BITWARDEN_TOKEN, 'machine-account-access-token');
    const bitwarden = createBitwarden({ credentials: store, run() {
      return { cancel() {}, completion: Promise.resolve({ code: 0, stdout: JSON.stringify(catalog), stderr: '', terminated: true }) };
    } });
    await assert.rejects(bitwarden.sync(validateBitwarden({ enabled: true, executable: 'C:\\Tools\\bws.exe' })));
    for (const ref of BITWARDEN_AUTO_REFS) assert.equal(store.values.has(ref), false);
  }
});

test('Bitwarden token-only sync is all-or-nothing and errors never include secret output', async () => {
  const store = credentials();
  store.values.set(BITWARDEN_TOKEN, 'machine-account-access-token');
  let gets = 0;
  const catalog = BITWARDEN_AUTO_REFS.map(ref => ({ id: ids[ref], key: ref, projectIds: [] }));
  const bitwarden = createBitwarden({ credentials: store, run(_launch, args) {
    if (args[1] === 'list') return { cancel() {}, completion: Promise.resolve({ code: 0, stdout: JSON.stringify(catalog), stderr: '', terminated: true }) };
    gets += 1;
    const id = args[2];
    const stdout = gets === 1 ? JSON.stringify({ id, value: 'must-not-be-stored' }) : 'private-error-output';
    return { cancel() {}, completion: Promise.resolve({ code: gets === 1 ? 0 : 1, stdout, stderr: 'private-stderr', terminated: true }) };
  } });
  const config = validateBitwarden({ enabled: true, executable: 'C:\\Tools\\bws.exe' });
  await assert.rejects(bitwarden.sync(config), error => !error.message.includes('private') && !error.message.includes('must-not-be-stored'));
  for (const ref of BITWARDEN_AUTO_REFS) assert.equal(store.values.has(ref), false);
});
