import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpstreamClient } from '../src/upstream-client.mjs';

function mockProvider(provider, replies) {
  const calls = [];
  const fetch = async (path, init) => {
    const request = { path, ...init, body: init.body ? JSON.parse(init.body) : undefined };
    calls.push(request);
    assert.ok(replies.length, `Unexpected request ${path}`);
    const next = replies.shift();
    if (next instanceof Error) throw next;
    if (typeof next === 'function') return next(request);
    if (next.httpStatus) return new Response(JSON.stringify(next.body ?? {}), { status: next.httpStatus });
    return Response.json(provider === 'grok'
      ? { type: 'server-response', rpcId: request.body.rpcId, result: { ok: true, value: next } }
      : next);
  };
  return { client: createUpstreamClient(provider, { fetch }), calls };
}

const grokAuth = (available = true, session) => ({ generation: 1, available, driver: true, ...(session ? { session } : {}) });
const quotaTime = '2026-09-14T00:00:00.000Z';

test('Grok uses the same authenticated RPC carrier and dashboard quota schema', async () => {
  const { client, calls } = mockProvider('grok', [
    { kind: 'status', status: grokAuth() },
    { kind: 'dashboard', dashboard: { fetchedAt: quotaTime, models: { state: 'ready', items: [] },
      quota: { state: 'ready', usedPercent: 35.5, remainingPercent: 64.5, periodKind: 'weekly', resetsAt: '2026-09-18T00:00:00Z' } } },
  ]);
  const state = await client.status();
  assert.equal(state.auth, 'authenticated');
  assert.deepEqual(state.usage, { status: 'available', source: 'dsh-grok-provider', updatedAt: quotaTime,
    windows: [{ id: 'grok:weekly', label: 'Grok weekly', usedPercent: 35.5, remainingPercent: 64.5,
      resetsAt: '2026-09-18T00:00:00.000Z' }], credits: null });
  assert.deepEqual(calls.map(call => call.path), ['/api/grok-auth/status', '/api/grok-auth/dashboard']);
  for (const call of calls) {
    assert.equal(call.method, 'POST');
    assert.equal(call.credentials, 'same-origin');
    assert.equal(call.cache, 'no-store');
    assert.equal(call.redirect, 'error');
    assert.equal(call.headers['content-type'], 'application/json');
    assert.equal(call.body.type, 'client-request');
    assert.deepEqual(call.body.payload, {});
    assert.ok(call.signal instanceof AbortSignal);
  }
  assert.notEqual(calls[0].body.rpcId, calls[1].body.rpcId);
});

test('Grok signed-out status does not fetch account billing', async () => {
  const { client, calls } = mockProvider('grok', [{ kind: 'status', status: grokAuth(false) }]);
  assert.equal((await client.status()).auth, 'unauthenticated');
  assert.equal(calls.length, 1);
});

test('Grok quota failure keeps known authenticated state and never substitutes zero', async () => {
  const { client } = mockProvider('grok', [{ kind: 'status', status: grokAuth() },
    { httpStatus: 503, body: { error: 'Bearer secret-do-not-echo' } }]);
  const state = await client.status();
  assert.equal(state.auth, 'authenticated');
  assert.equal(state.usage.status, 'error');
  assert.deepEqual(state.usage.windows, []);
  assert.equal(state.usage.credits, null);
  assert.ok(!JSON.stringify(state).includes('secret-do-not-echo'));
});

test('Grok ready-but-undisclosed quota remains unknown and has no credit estimate', async () => {
  const { client } = mockProvider('grok', [{ kind: 'status', status: grokAuth() },
    { kind: 'dashboard', dashboard: { fetchedAt: quotaTime, quota: { state: 'ready' } } }]);
  const state = await client.status();
  assert.equal(state.usage.status, 'unknown');
  assert.equal(state.usage.updatedAt, quotaTime);
  assert.equal(state.usage.credits, null);
  assert.deepEqual(state.usage.windows, []);
});

test('Grok login and cancellation use the exact active public session id', async () => {
  const session = { state: 'running', sessionId: 'grok-login-1' };
  const { client, calls } = mockProvider('grok', [
    { kind: 'login-started', status: session, sessionId: session.sessionId },
    { kind: 'cancelled', status: grokAuth(false, { ...session, state: 'cancelled' }) },
  ]);
  const login = await client.login();
  assert.equal(login.login.status, 'running');
  assert.equal(login.login.url, undefined, 'Grok official CLI owns opening the host browser');
  assert.equal((await client.cancelLogin()).login.status, 'cancelled');
  assert.deepEqual(calls[1].body.payload, { sessionId: 'grok-login-1' });
});

test('Grok cancellation without an observed session never sends a made-up id', async () => {
  const { client, calls } = mockProvider('grok', []);
  assert.equal((await client.cancelLogin()).login.status, 'unavailable');
  assert.equal(calls.length, 0);
});

test('Grok logout exposes upstream confirmation and requires a separate deliberate call', async () => {
  const { client, calls } = mockProvider('grok', [
    { kind: 'logout-confirmation-required', confirmationId: 'confirmation-1', expiresAt: quotaTime },
    { kind: 'logout-succeeded', status: grokAuth(false) },
  ]);
  const first = await client.logout();
  assert.equal(calls.length, 1, 'must never auto-confirm official CLI logout');
  assert.equal(first.logoutConfirmation.required, true);
  assert.equal(first.logoutConfirmation.expiresAt, quotaTime);
  const second = await client.logout();
  assert.equal(second.auth, 'unauthenticated');
  assert.equal(second.logoutConfirmation, undefined);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].body.payload, {});
  assert.deepEqual(calls[1].body.payload, {}, 'upstream rejects confirmationId in the payload');
});

test('concurrent Grok logout clicks share one request and cannot auto-confirm', async () => {
  let release;
  const { client, calls } = mockProvider('grok', [request => new Promise(resolve => {
    release = () => resolve(Response.json({ type: 'server-response', rpcId: request.body.rpcId,
      result: { ok: true, value: { kind: 'logout-confirmation-required', confirmationId: 'confirmation-1', expiresAt: quotaTime } } }));
  })]);
  const first = client.logout();
  const concurrent = client.logout();
  assert.equal(first, concurrent);
  assert.equal(calls.length, 1);
  release();
  assert.equal((await concurrent).logoutConfirmation.required, true);
});

test('Grok validates the RPC response correlation id', async () => {
  const { client } = mockProvider('grok', [() => Response.json({ type: 'server-response', rpcId: 'different',
    result: { ok: true, value: { kind: 'status', status: grokAuth() } } })]);
  assert.equal((await client.status()).usage.status, 'error');
});

test('Codex normal LLM credentials supply exact windows, credits, and individual limits', async () => {
  const { client, calls } = mockProvider('codex', [{ status: 'signed-in', usage: {
    rateLimits: [{ id: 'codex', name: 'Codex', windows: [
      { remainingPercent: 42.75, windowSeconds: 18000, resetAt: 1800000000 },
      { remainingPercent: 90, windowSeconds: 604800 },
    ] }], credits: { unlimited: false, balance: '123456789012345.000001' },
    individualLimit: { limit: '1000.00', used: '25.01', remaining: '974.99', remainingPercent: 97.499 },
  } }]);
  const state = await client.status();
  assert.equal(calls[0].path, '/api/darask/codex/status');
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].body, undefined);
  assert.equal(state.auth, 'authenticated');
  assert.equal(state.usage.updatedAt, null, 'upstream cache does not expose an observation time');
  assert.equal(state.usage.windows[0].usedPercent, 57.25);
  assert.equal(state.usage.windows[0].resetsAt, new Date(1800000000 * 1000).toISOString());
  assert.equal(state.usage.windows[1].resetsAt, null);
  assert.deepEqual(state.usage.credits, { unlimited: false, balance: '123456789012345.000001', unit: null });
  assert.equal(state.usage.individualLimit.remaining, '974.99');
});

test('Codex quota error is independent of authentication and never echoes provider error data', async () => {
  const { client } = mockProvider('codex', [{ status: 'signed-in', usage: { rateLimits: [] }, quotaError: 'access_token=secret' }]);
  const state = await client.status();
  assert.equal(state.auth, 'authenticated');
  assert.equal(state.usage.status, 'error');
  assert.ok(!JSON.stringify(state).includes('access_token'));
});

test('Codex does not invent quota or prepaid credits when data is missing', async () => {
  const { client } = mockProvider('codex', [{ status: 'signed-in', usage: { rateLimits: [] } }]);
  const state = await client.status();
  assert.equal(state.usage.status, 'unknown');
  assert.deepEqual(state.usage.windows, []);
  assert.equal(state.usage.credits, null);
});

test('Codex login returns HTTPS authorization data and uses only upstream actions', async () => {
  const { client, calls } = mockProvider('codex', [
    { url: 'https://auth.openai.com/oauth/authorize?state=test-state' },
    { status: 'signed-out' }, { ok: true },
  ]);
  const state = await client.login();
  assert.equal(state.login.status, 'running');
  assert.equal(state.login.url, 'https://auth.openai.com/oauth/authorize?state=test-state');
  assert.equal((await client.cancelLogin()).auth, 'unauthenticated');
  assert.equal((await client.logout()).auth, 'unauthenticated');
  assert.deepEqual(calls.map(call => call.path), ['login', 'cancel', 'logout'].map(action => `/api/darask/codex/${action}`));
  assert.ok(calls.every(call => call.method === 'POST' && Object.keys(call.body).length === 0));
});

test('Codex rejects unsafe authorization URLs without leaking them', async () => {
  for (const url of ['javascript:alert(1)', 'http://auth.openai.com/', 'https://user:secret@auth.openai.com/']) {
    const { client } = mockProvider('codex', [{ url }]);
    const state = await client.login();
    assert.equal(state.login.status, 'failed');
    assert.equal(state.login.url, undefined);
    assert.ok(!JSON.stringify(state).includes(url));
  }
});

test('Codex account actions send exact keys and callback JSON; adding and cancelling preserves existing usage', async () => {
  const accountKey = 'acct_' + 'A'.repeat(43);
  const active = { accountKey, displayName: 'Personal', maskedEmail: 'p***@example.com', active: true, usage: { rateLimits: [], credits: { unlimited: false, balance: '1.25' } } };
  const signedIn = { status: 'signed-in', usage: active.usage, accounts: [active] };
  const { client, calls } = mockProvider('codex', [signedIn, {url:'https://auth.openai.com/oauth/authorize?state=test'}, {status:'signed-in',usage:active.usage},
    {ok:true}, signedIn, {ok:true}, {status:'signing-in',accounts:[active]}, {ok:true}, {status:'signed-out',accounts:[]}]);
  await client.status();
  assert.equal((await client.login()).accounts[0].usage.credits.balance, '1.25');
  assert.equal((await client.cancelLogin()).accounts.length, 1);
  await client.selectAccount({accountKey});
  assert.deepEqual(calls[3].body, {accountKey});
  await client.submitCallback({callbackUrl:'http://localhost:1455/auth/callback?code=test&state=test'});
  assert.equal(calls[5].body.callbackUrl, 'http://localhost:1455/auth/callback?code=test&state=test');
  assert.equal((await client.removeAccount({accountKey})).accounts.length, 0);
  assert.equal(calls[7].method, 'DELETE');
  assert.deepEqual(calls[7].body, {accountKey});
});

test('upstream unavailable and untrusted-origin failures are safe and distinct', async () => {
  const missing = mockProvider('codex', [{ httpStatus: 404 }]);
  assert.equal((await missing.client.status()).auth, 'unavailable');
  const denied = mockProvider('codex', [{ httpStatus: 403, body: { error: 'secret-data' } }]);
  const state = await denied.client.status();
  assert.equal(state.auth, 'unknown');
  assert.match(state.message, /origin is not authorized/u);
  assert.ok(!JSON.stringify(state).includes('secret-data'));
});

test('request abort is forwarded and never logs exception details', async () => {
  const controller = new AbortController();
  const { client, calls } = mockProvider('codex', [request => new Promise((_resolve, reject) => {
    request.signal.addEventListener('abort', () => reject(new Error('private-error')), { once: true });
  })]);
  const pending = client.status({ signal: controller.signal });
  controller.abort();
  const state = await pending;
  assert.equal(calls[0].signal.aborted, true);
  assert.equal(state.usage.status, 'error');
  assert.ok(!JSON.stringify(state).includes('private-error'));
});

test('malformed percentages and reset timestamps cannot become actionable quota', async () => {
  for (const window of [
    { remainingPercent: 101, windowSeconds: 18000 },
    { remainingPercent: 50, windowSeconds: 18000, resetAt: Number.MAX_SAFE_INTEGER },
    { remainingPercent: null, windowSeconds: 18000 },
  ]) {
    const { client } = mockProvider('codex', [{ status: 'signed-in', usage: { rateLimits: [{ id: 'codex', windows: [window] }] } }]);
    const state = await client.status();
    assert.equal(state.auth, 'authenticated');
    assert.equal(state.usage.status, 'error');
    assert.deepEqual(state.usage.windows, []);
  }
});

test('an already cancelled action never sends an authentication mutation', async () => {
  const { client, calls } = mockProvider('codex', []);
  const controller = new AbortController();
  controller.abort();
  const state = await client.logout({ signal: controller.signal });
  assert.equal(calls.length, 0);
  assert.match(state.message, /cancelled/u);
});
