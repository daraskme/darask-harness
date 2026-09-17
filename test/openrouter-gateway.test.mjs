import test from 'node:test';
import assert from 'node:assert/strict';
import { attachOAuthOrigin, verifiedOAuthOrigin } from '../vendor/dsh-bridge-gateway/lib/oauth-origin.mjs';
import { upstreamHeaders } from '../vendor/dsh-bridge-gateway/lib/dsh-session.mjs';
import { createRoutes, createOpenRouterCallbackRoute } from '../src/http.mjs';
import { createOpenRouterProvider } from '../src/providers/openrouter.mjs';

function forward(method, url, origin) {
  const req = { method, url, headers: { host: 'gateway.example', 'x-forwarded-proto': 'https', ...(origin ? { origin } : {}) } };
  return attachOAuthOrigin(upstreamHeaders(req.headers, 3080), req);
}

test('Gateway OpenRouter login and automatic callback retain HTTPS authority despite loopback transport', async () => {
  const values = new Map();
  let exchanges = 0, auth;
  const provider = createOpenRouterProvider({
    credentials: { resolve: async key => values.has(key) ? { value: values.get(key) } : undefined, set: async (key, value) => values.set(key, value), unset: async key => values.delete(key) },
    enableRoute: async () => {}, fetch: async () => { exchanges++; return Response.json({ key: 'fixture-api-key' }); },
  });
  const headers = forward('POST', '/api/darask/action', 'https://gateway.example');
  assert.equal(headers.host, '127.0.0.1:3080');
  assert.equal(headers.origin, 'http://127.0.0.1:3080');
  const route = createRoutes({ action: async (_payload, origin) => { auth = await provider.login(origin); return auth; } })[1];
  const response = await route.fetch(new Request('http://dsh.internal/api/darask/action', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'login', provider: 'openrouter' }) }));
  assert.equal(response.status, 200);
  const callback = new URL(new URL(auth.url).searchParams.get('callback_url'));
  assert.equal(callback.origin, 'https://gateway.example');
  assert.equal(callback.pathname, '/darask/openrouter/callback');
  callback.searchParams.set('code', 'fixture-code');
  let status, body;
  await createOpenRouterCallbackRoute({ callback: url => provider.callback(url) }).handler({
    method: 'GET', url: callback.pathname + callback.search,
    headers: forward('GET', callback.pathname + callback.search, 'https://openrouter.ai'),
  }, { writeHead(value) { status = value; }, end(value) { body = value; } });
  assert.equal(status, 200);
  assert.match(body, /連携が完了/u);
  assert.equal(exchanges, 1);
  await provider.dispose();
});

test('Gateway origin proof rejects spoofing, tampering, expiry, and cross-origin API requests', () => {
  const headers = forward('POST', '/api/darask/action', 'https://gateway.example');
  const request = overrides => new Request('http://dsh.internal/api/darask/action', { method: 'POST', headers: { ...headers, ...overrides } });
  assert.equal(verifiedOAuthOrigin(request()), 'https://gateway.example');
  assert.throws(() => verifiedOAuthOrigin(request({ 'x-darask-oauth-origin': 'https://evil.example' })));
  assert.throws(() => verifiedOAuthOrigin(request(), Date.now() + 120000));
  assert.throws(() => forward('POST', '/api/darask/action', 'https://evil.example'));
  assert.equal(verifiedOAuthOrigin(new Request('http://localhost/api/darask/action', { headers: { 'x-forwarded-host': 'evil.example' } })), undefined);
  const supplied = { 'x-darask-oauth-origin': 'https://evil.example', 'x-darask-oauth-proof': 'forged' };
  attachOAuthOrigin(supplied, { method: 'GET', url: '/', headers: { host: 'gateway.example' } });
  assert.deepEqual(supplied, {});
});
