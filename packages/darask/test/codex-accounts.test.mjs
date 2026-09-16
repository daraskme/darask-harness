import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OpenAICodexCredentialStore } from 'dsh-codex-connect';
import { captureCodexAccounts, createCodexAccounts, codexRoutes } from '../src/codex-accounts.mjs';

async function fixture(t, version = 2) {
  const dir = await mkdtemp(join(tmpdir(), 'darask-codex-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new OpenAICodexCredentialStore(join(dir, 'auth.json'));
  const credentials = ['A', 'B'].map(accountId => ({ type: 'oauth', accountId, access: `private-${accountId}`, refresh: `refresh-${accountId}`, expires: Date.now() + 3600000 }));
  await writeFile(store.filename, JSON.stringify(version === 1 ? { version, credential: credentials[0] } : { version, credentials, activeAccountId: 'A' }), { mode: 0o600 });
  return store;
}

test('quota capture pins every account while selection and token refresh overlap', async t => {
  const store = await fixture(t);
  const [a, b] = await captureCodexAccounts(store);
  await store.activate(b.summary.accountKey);
  await a.credentials.modify('openai-codex', async current => ({ ...current, access: 'renewed-A' }));
  assert.equal((await store.read('openai-codex')).accountId, 'B');
  assert.equal((await a.credentials.read('openai-codex')).access, 'renewed-A');
  assert.equal((await b.credentials.read('openai-codex')).accountId, 'B');
  const document = await store.readDocument();
  assert.equal(document.credentials.find(a => a.accountId === 'A').access, 'renewed-A');
  assert.equal(document.credentials.find(a => a.accountId === 'B').access, 'private-B');
  await store.removeAccount(a.summary.accountKey);
  assert.equal(await a.credentials.modify('openai-codex', current => current), undefined, 'removed accounts cannot be resurrected by a refresh');
  assert.equal((await store.accounts()).length, 1);
});

test('v1 credentials remain readable without migrating for a usage query', async t => {
  const store = await fixture(t, 1);
  const [entry] = await captureCodexAccounts(store);
  assert.equal(entry.summary.active, true);
  assert.equal((await entry.credentials.read('openai-codex')).accountId, 'A');
  assert.equal((await store.readDocument()).version, 1);
});

test('usage cache coalesces per account, separates credits, redacts errors and expires', async t => {
  const store = await fixture(t);
  let reads = 0, clock = 100000;
  const accounts = createCodexAccounts({ store, now: () => clock, readUsage: async captured => {
    reads++;
    const credential = await captured.read('openai-codex');
    if (credential.accountId === 'B') throw new Error('refresh-secret-B');
    return { rateLimits: [], credits: { unlimited: false, balance: '12.001' } };
  } });
  const [first, second] = await Promise.all([accounts.status(), accounts.status()]);
  assert.equal(reads, 2);
  assert.deepEqual(first, second);
  assert.equal(first[0].usage.credits.balance, '12.001');
  assert.equal(first[1].status, 'error');
  assert.equal(first[1].usage, undefined);
  assert.doesNotMatch(JSON.stringify(first), /private-|refresh-|accountId|"access"/);
  await store.activate(first[1].accountKey);
  const switched = await accounts.status();
  assert.equal(switched[1].active, true);
  assert.equal(switched[0].active, false);
  assert.equal(reads, 2);
  clock += 16000;
  await accounts.status();
  assert.equal(reads, 3);
  accounts.invalidate();
  await accounts.status();
  assert.equal(reads, 5);
});

test('authenticated HTTPS carrier forwards only fixed paths and no browser credentials', async () => {
  let calls = 0;
  const routes = codexRoutes({ accounts: { invalidate() {} }, fetch: async (url, init) => {
    calls++;
    assert.equal(url, 'http://127.0.0.1:3080/plugins/dsh-openai-codex/auth/login');
    assert.equal(init.headers.Origin, 'http://127.0.0.1:3080');
    assert.equal(init.headers.Cookie, undefined);
    assert.equal(init.headers.Authorization, undefined);
    return Response.json({ url: 'https://auth.openai.com/oauth/authorize?state=test' });
  } });
  const route = routes.find(r => r.path.endsWith('/login'));
  for (const host of ['sub.tail7f0d3a.ts.net:8443', 'dsh.darask.me']) {
    const response = await route.fetch(new Request('http://dsh.internal/api/darask/codex/login', { method: 'POST', headers: { host, origin: `https://${host}`, Cookie: 'private-cookie', 'Content-Type': 'application/json' }, body: '{}' }));
    assert.equal(response.status, 200);
  }
  for (const headers of [{host:'dsh.darask.me', origin:'https://evil.example'}, {host:'dsh.darask.me'}, {host:'dsh.darask.me',origin:'https://dsh.darask.me','sec-fetch-site':'cross-site'}]) {
    const response = await route.fetch(new Request('http://dsh.internal/api/darask/codex/login', { method: 'POST', headers:{...headers,'Content-Type':'application/json'},body:'{}' }));
    assert.equal(response.status, 403);
  }
  assert.equal(calls, 2);
  const expired = codexRoutes({ accounts: { status: async () => [{ accountKey: 'saved', active: true, usage: { rateLimits: [] } }] },
    fetch: async () => Response.json({ status: 'reauth-required' }) }).find(r => r.path.endsWith('/status'));
  const expiredResponse = await expired.fetch(new Request('http://dsh.internal/api/darask/codex/status', {headers:{host:'dsh.darask.me'}}));
  assert.equal((await expiredResponse.json()).status, 'reauth-required', 'stored accounts must not override an explicit reauthentication failure');
});

test('invalid callbacks and provider errors never echo credential-bearing text', async () => {
  const routes = codexRoutes({ accounts: { invalidate() {} }, fetch: async () => Response.json({ error: 'private-code' }, { status: 400 }) });
  const route = routes.find(r => r.path.endsWith('/callback'));
  const response = await route.fetch(new Request('http://dsh.internal/api/darask/codex/callback', {method:'POST',headers:{host:'dsh.darask.me',origin:'https://dsh.darask.me','Content-Type':'application/json'},body:JSON.stringify({callbackUrl:'http://localhost:1455/auth/callback?code=private-code'})}));
  assert.equal(response.status, 400);
  assert.doesNotMatch(await response.text(), /private-code/);
});
