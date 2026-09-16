import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createOpenRouterProvider, normalizeOpenRouterUsage } from '../src/providers/openrouter.mjs';
import { createOpenRouterCallbackRoute, OPENROUTER_CALLBACK_PATH } from '../src/http.mjs';

const KEY = 'DARASK_OPENROUTER_API_KEY';
const MANAGEMENT = 'DARASK_OPENROUTER_MANAGEMENT_KEY';

function fixture({ entries = [], replies = [], now = () => 1000, set, enableRoute } = {}) {
  const values = new Map(entries);
  const writes = [];
  const routes = [];
  const requests = [];
  const credentials = {
    resolve: async name => values.has(name) ? { value: values.get(name) } : undefined,
    set: async (name, value) => { writes.push([name, value]); if (set) await set(name, value); values.set(name, value); },
    unset: async name => { values.delete(name); },
  };
  const fetch = async (url, options) => {
    const request = { url, ...options, body: options.body ? JSON.parse(options.body) : undefined };
    requests.push(request);
    assert.ok(replies.length, `Unexpected network request ${url}`);
    const reply = replies.shift();
    if (typeof reply === 'function') return reply(request);
    if (reply instanceof Error) throw reply;
    return Response.json(reply.status === undefined ? reply : reply.data ?? {}, { status: reply.status ?? 200 });
  };
  const provider = createOpenRouterProvider({ credentials, fetch, now, enableRoute: async ref => {
    routes.push(ref); await enableRoute?.(ref);
  } });
  return { provider, values, writes, routes, requests };
}

async function challenge(provider, origin = 'http://localhost:9000') {
  const result = await provider.login(origin);
  const authorization = new URL(result.url);
  const callback = new URL(authorization.searchParams.get('callback_url'));
  callback.searchParams.set('code', 'authorization-code');
  return { result, authorization, callback };
}

test('OpenRouter login generates PKCE S256 and stores only the exchanged API key', async () => {
  const f = fixture({ replies: [{ key: 'sk-or-new-api-key' }] });
  const { result, authorization, callback } = await challenge(f.provider);
  assert.equal(result.status, 'pending');
  assert.equal(authorization.origin, 'https://openrouter.ai');
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(f.requests.length, 0, 'starting OAuth requires no credential request');
  assert.equal(callback.pathname, OPENROUTER_CALLBACK_PATH);
  assert.equal(callback.searchParams.get('darask_openrouter_callback'), null);
  assert.equal(callback.origin, 'http://localhost:9000');
  assert.ok(callback.searchParams.get('state').length >= 32);
  const repeated = await f.provider.login('http://localhost:9000');
  assert.equal(repeated.url, result.url, 'a repeated click reuses the active challenge');
  await f.provider.callback(callback.href);
  assert.equal(f.requests.length, 1);
  const request = f.requests[0];
  assert.equal(request.url, 'https://openrouter.ai/api/v1/auth/keys');
  assert.equal(request.method, 'POST');
  assert.equal(request.redirect, 'error');
  assert.equal(request.headers.Authorization, undefined);
  assert.equal(request.body.code, 'authorization-code');
  assert.equal(request.body.code_challenge_method, 'S256');
  assert.equal(createHash('sha256').update(request.body.code_verifier).digest('base64url'), authorization.searchParams.get('code_challenge'));
  assert.ok(!JSON.stringify(result).includes(request.body.code_verifier));
  assert.deepEqual(f.writes.filter(([name]) => name === KEY), [[KEY, 'sk-or-new-api-key']]);
  assert.equal(f.values.has('DARASK_OPENROUTER_PKCE'), false);
  assert.deepEqual(f.routes, [KEY]);
  await assert.rejects(f.provider.callback(callback.href), /expired or invalid/u);
  assert.equal(f.requests.length, 1, 'replayed callbacks must never exchange again');
});

test('OAuth callback rejects wrong state, origin, path, duplicate parameters and errors without consuming a valid flow', async () => {
  const f = fixture({ replies: [{ key: 'sk-or-good-api-key' }] });
  const { callback } = await challenge(f.provider);
  const invalid = [
    url => url.searchParams.set('state', 'wrong-state'),
    url => { url.hostname = 'example.com'; },
    url => { url.pathname = '/wrong-path'; },
    url => url.searchParams.append('state', url.searchParams.get('state')),
    url => url.searchParams.append('code', 'second-code'),
    url => url.searchParams.set('error', 'access_denied'),
    url => { url.hash = 'fragment'; },
    url => { url.username = 'user'; url.password = 'pass'; },
    url => url.searchParams.set('code', '  '),
  ];
  for (const modify of invalid) {
    const url = new URL(callback);
    modify(url);
    await assert.rejects(f.provider.callback(url.href));
  }
  assert.equal(f.requests.length, 0);
  assert.equal(f.writes.filter(([name]) => name === KEY).length, 0);
  await f.provider.callback(callback.href);
  assert.equal(f.values.get(KEY), 'sk-or-good-api-key');
});

test('OAuth pending state expires exactly at its deadline and cancellation invalidates it', async () => {
  let now = 1000;
  const f = fixture({ now: () => now });
  const first = await challenge(f.provider);
  now += 600000;
  await assert.rejects(f.provider.callback(first.callback.href));
  const second = await challenge(f.provider);
  assert.notEqual(first.result.url, second.result.url);
  await f.provider.cancelLogin();
  await assert.rejects(f.provider.callback(second.callback.href));
  assert.equal(f.requests.length, 0);
});

test('login origins require HTTPS or a bare loopback origin', async () => {
  for (const origin of ['http://example.com', 'ftp://localhost', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com/?query=1']) {
    const f = fixture();
    await assert.rejects(f.provider.login(origin), /Login requires/u);
  }
  const f = fixture();
  await f.provider.login('http://localhost:9000');
  await assert.rejects(f.provider.login('http://127.0.0.1:9000'), /another origin/u);
});

test('cancelling an in-flight exchange aborts it and prevents a late response from writing credentials', async () => {
  let finish;
  const f = fixture({ entries: [[KEY, 'existing-api-key']], replies: [() => new Promise(resolve => { finish = resolve; })] });
  const { callback } = await challenge(f.provider);
  const pending = f.provider.callback(callback.href);
  const rejected = assert.rejects(pending);
  const cancelled = f.provider.cancelLogin();
  assert.equal(f.requests[0].signal.aborted, true);
  finish(Response.json({ key: 'late-replacement-key' }));
  await Promise.all([rejected, cancelled]);
  assert.equal(f.values.get(KEY), 'existing-api-key');
  assert.equal(f.writes.filter(([name]) => name === KEY).length, 0);
  assert.equal(f.routes.length, 0);
});

test('cancellation during a credential write restores the previously authenticated account', async () => {
  let finishWrite;
  let startedWrite;
  const started = new Promise(resolve => { startedWrite = resolve; });
  const f = fixture({ entries: [[KEY, 'existing-api-key']], replies: [{ key: 'replacement-api-key' }],
    set: async (_name, value) => {
      if (value === 'replacement-api-key') { startedWrite(); await new Promise(resolve => { finishWrite = resolve; }); }
    },
  });
  const { callback } = await challenge(f.provider);
  const pending = f.provider.callback(callback.href);
  const rejected = assert.rejects(pending);
  await started;
  const cancelled = f.provider.cancelLogin();
  finishWrite();
  await Promise.all([rejected, cancelled]);
  assert.equal(f.values.get(KEY), 'existing-api-key');
  assert.equal(f.routes.length, 0);
});

test('logout waits for OAuth exchange shutdown then clears both credentials', async () => {
  let finish;
  const f = fixture({ entries: [[KEY, 'old-api-key'], [MANAGEMENT, 'old-management-key']],
    replies: [() => new Promise(resolve => { finish = resolve; })] });
  const { callback } = await challenge(f.provider);
  const pending = f.provider.callback(callback.href);
  const rejected = assert.rejects(pending);
  const logout = f.provider.logout();
  finish(Response.json({ key: 'too-late-api-key' }));
  await Promise.all([rejected, logout]);
  assert.equal(f.values.size, 0);
  assert.equal(f.routes.length, 0);
});

test('failed exchanges consume the code and do not retry or save invalid credentials', async () => {
  for (const reply of [{ status: 500, data: {} }, { key: 'short' }, { key: 'key with spaces' }, { key: 'x'.repeat(8193) }, null]) {
    const f = fixture({ replies: [reply === null ? () => Response.json(null) : reply] });
    const { callback } = await challenge(f.provider);
    await assert.rejects(f.provider.callback(callback.href));
    await assert.rejects(f.provider.callback(callback.href));
    assert.equal(f.requests.length, 1);
    assert.equal(f.writes.filter(([name]) => name === KEY).length, 0);
  }
});

test('ordinary API-key status never sends it to the management-only credits endpoint', async () => {
  const f = fixture({ entries: [[KEY, 'ordinary-key']], replies: [{ data: { limit: 20, limit_remaining: 15, usage: 5 } }] });
  const state = await f.provider.status();
  assert.equal(state.auth, 'authenticated');
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].url, 'https://openrouter.ai/api/v1/key');
  assert.equal(f.requests[0].headers.Authorization, 'Bearer ordinary-key');
  assert.equal(state.usage.credits.scope, 'key-limit');
  assert.equal(state.usage.credits.balance, 15);
});

test('management credits remain separate from API-key limits and failure preserves key usage', async () => {
  const f = fixture({ entries: [[KEY, 'ordinary-key'], [MANAGEMENT, 'management-key']],
    replies: [{ data: { limit: 20, limit_remaining: 15, usage: 5 } }, { status: 403, data: {} }] });
  const state = await f.provider.status();
  assert.equal(state.auth, 'authenticated');
  assert.equal(state.usage.windows[0].remainingPercent, 75);
  assert.equal(f.requests[1].headers.Authorization, 'Bearer management-key');
  assert.match(state.usage.message, /Management-key credits request failed/u);
  const normalized = normalizeOpenRouterUsage({ data: { limit: 20, limit_remaining: 15, usage: 5 } },
    { data: { total_credits: 100, total_usage: 30 } }, '2026-09-14T00:00:00.000Z');
  assert.equal(normalized.credits.balance, 70);
  assert.equal(normalized.credits.scope, 'account');
});

test('OpenRouter status never returns raw network errors or fabricates undisclosed quota', async () => {
  const f = fixture({ entries: [[KEY, 'ordinary-key']], replies: [new Error('Bearer secret-account-key')] });
  const state = await f.provider.status();
  assert.equal(state.auth, 'unknown');
  assert.ok(!JSON.stringify(state).includes('secret-account-key'));
  const unknown = normalizeOpenRouterUsage({ data: {} });
  assert.equal(unknown.credits, null);
  assert.deepEqual(unknown.windows, []);
  assert.equal(unknown.used.amount, null);
  assert.throws(() => normalizeOpenRouterUsage({ data: [] }));
});

test('OpenRouter callback is outside /api so a cross-site redirect is accepted on loopback Host', async () => {
  const f = fixture({ replies: [{ key: 'sk-or-new-api-key' }] });
  const { callback } = await challenge(f.provider, 'http://127.0.0.1:3080');
  let status = 0;
  let body = '';
  const res = {
    writeHead(code) { status = code; },
    end(value) { body = String(value ?? ''); },
  };
  const legacy = new URL(callback);
  legacy.pathname = OPENROUTER_CALLBACK_PATH;
  legacy.searchParams.delete('darask_openrouter_callback');
  await createOpenRouterCallbackRoute({ callback: url => f.provider.callback(url) }).handler({
    method: 'GET',
    url: `${legacy.pathname}${legacy.search}`,
    headers: { host: '127.0.0.1:3080', origin: 'https://openrouter.ai', 'sec-fetch-site': 'cross-site' },
  }, res);
  assert.equal(status, 200);
  assert.match(body, /連携が完了/u);
  assert.equal(f.values.get(KEY), 'sk-or-new-api-key');
});

test('pending PKCE survives a provider restart so a 404 callback URL can still be submitted', async () => {
  const f = fixture({ replies: [{ key: 'sk-or-restored-api-key' }] });
  const { callback } = await challenge(f.provider);
  const restored = fixture({ entries: [...f.values.entries()], replies: [{ key: 'sk-or-restored-api-key' }] });
  await restored.provider.callback(callback.href);
  assert.equal(restored.values.get(KEY), 'sk-or-restored-api-key');
});

test('provider disposal preserves unexpired PKCE for the replacement provider only', async () => {
  const f = fixture();
  const { callback } = await challenge(f.provider);
  await f.provider.dispose();
  await assert.rejects(f.provider.callback(callback.href));
  await assert.rejects(f.provider.login('http://localhost:9000'), /stopped/u);
  const restored = fixture({ entries: [...f.values.entries()], replies: [{ key: 'sk-or-after-reload' }] });
  await restored.provider.callback(callback.href);
  assert.equal(restored.values.get(KEY), 'sk-or-after-reload');
  assert.equal(f.requests.length, 0);
});
