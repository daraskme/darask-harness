import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto';
import { ProxyServer } from '../vendor/dsh-bridge-gateway/lib/index.js';
import { AuthManager } from '../vendor/dsh-bridge-gateway/lib/auth/manager.js';

const TEAM = 'fixture.cloudflareaccess.com';
const AUD = 'fixture-aud-tag';
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');

function fixtureKeys(kid = 'fixture') {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return { jwk: { ...publicKey.export({ format: 'jwk' }), kid, use: 'sig', alg: 'RS256' }, privateKey };
}

function jwt(privateKey, payload, header = {}) {
  const head = b64({ alg: 'RS256', kid: 'fixture', typ: 'JWT', ...header });
  const body = b64(payload);
  const sig = cryptoSign('RSA-SHA256', Buffer.from(`${head}.${body}`), privateKey).toString('base64url');
  return `${head}.${body}.${sig}`;
}

const claims = (overrides = {}) => ({ iss: `https://${TEAM}`, aud: [AUD], exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000), email: 'user@example.com', ...overrides });

async function fixture(t, { config, jwks }) {
  let keyCalls = 0;
  const upstream = createServer((req, res) => res.end('DSH fixture'));
  upstream.on('upgrade', (_req, socket) => socket.end('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n'));
  await new Promise(done => upstream.listen(0, '127.0.0.1', done));
  const auth = new AuthManager({
    config,
    logger: { warn() {} },
    fetch: async url => { keyCalls++; assert.equal(url, `https://${TEAM}/cdn-cgi/access/certs`); return new Response(JSON.stringify(jwks())); },
  });
  const proxy = new ProxyServer({ localPort: 0, targetPort: upstream.address().port, authManager: auth, logger: { info() {}, error() {} }, dshSession: () => 'dsh-auth-fixture=current' });
  await proxy.start();
  t.after(async () => { await proxy.stop(); await new Promise(done => upstream.close(done)); auth.dispose(); });
  return { auth, base: `http://127.0.0.1:${proxy.server.address().port}`, keys: () => keyCalls };
}

test('Cloudflare Access: valid JWT reaches DSH, missing or invalid JWT gets the Access page', async t => {
  const pair = fixtureKeys();
  const { auth, base } = await fixture(t, {
    config: { enabled: true, cfAccess: { enabled: true, teamDomain: 'fixture', aud: AUD } },
    jwks: () => ({ keys: [pair.jwk] }),
  });
  const cf = { 'cf-ray': 'fixture', 'cf-connecting-ip': '203.0.113.1' };
  // JWT なし → パスワード画面ではなく Access の案内ページ
  const denied = await fetch(`${base}/`, { headers: cf });
  assert.equal(denied.status, 401);
  const page = await denied.text();
  assert.match(page, /Cloudflare Zero Trust/);
  assert.doesNotMatch(page, /パスワード/);
  // 署名・iss/aud/exp が正しい JWT → 上流へ到達
  const ok = await fetch(`${base}/api/test`, { headers: { ...cf, 'cf-access-jwt-assertion': jwt(pair.privateKey, claims()) } });
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), 'DSH fixture');
  // CF_Authorization クッキー経路でも受理
  const cookie = await fetch(`${base}/api/test`, { headers: { ...cf, cookie: `CF_Authorization=${jwt(pair.privateKey, claims())}` } });
  assert.equal(cookie.status, 200);
  // ゲートウェイのパスワードセッションがあっても JWT なしでは拒否
  const session = await fetch(`${base}/api/test`, { headers: { ...cf, cookie: `dsh_bridge_auth=${auth.createSession()}` } });
  assert.equal(session.status, 401);
  // aud 不一致・期限切れ・改ざん署名は拒否
  for (const token of [
    jwt(pair.privateKey, claims({ aud: ['other'] })),
    jwt(pair.privateKey, claims({ exp: Math.floor(Date.now() / 1000) - 60 })),
    jwt(pair.privateKey, claims({ iss: 'https://evil.cloudflareaccess.com' })),
    jwt(pair.privateKey, claims({ nbf: Math.floor(Date.now() / 1000) + 3600 })),
    jwt(pair.privateKey, claims({ nbf: 'not-a-date' })),
    jwt(pair.privateKey, claims(), { alg: 'HS256' }),
    `${jwt(pair.privateKey, claims()).slice(0, -8)}deadbeef`,
  ]) {
    assert.equal((await fetch(`${base}/api/test`, { headers: { ...cf, 'cf-access-jwt-assertion': token } })).status, 401);
  }
});

test('Cloudflare Access gates WebSocket upgrades and preserves true loopback access', async t => {
  const pair = fixtureKeys();
  const { base, auth } = await fixture(t, {
    config: { enabled: true, cfAccess: { enabled: true, teamDomain: TEAM, aud: AUD } },
    jwks: () => ({ keys: [pair.jwk] }),
  });
  const upgrade = token => new Promise((done, fail) => {
    const request = httpRequest(base, { headers: { 'cf-ray': 'fixture', Connection: 'Upgrade', Upgrade: 'websocket', ...(token ? { 'cf-access-jwt-assertion': token } : {}) } });
    request.on('upgrade', (response, socket) => { socket.destroy(); done(response.statusCode); });
    request.on('response', response => { response.resume(); done(response.statusCode); });
    request.on('error', fail);
    request.end();
  });
  assert.equal(await upgrade(), 401);
  assert.equal(await upgrade(jwt(pair.privateKey, claims())), 101);
  assert.equal((await fetch(base)).status, 200);
  const tunnel = { 'x-dsh-internal-tunnel': auth.internalTunnelSecret };
  assert.equal((await fetch(`${base}/api/test`, { headers: tunnel })).status, 401);
  assert.equal((await fetch(`${base}/api/test`, { headers: { ...tunnel, cookie: `dsh_bridge_auth=${auth.createSession()}` } })).status, 200);
});

test('Access configuration persists, restricts the key endpoint and discards keys on team change', async t => {
  const first = fixtureKeys(), second = fixtureKeys();
  let saved;
  const auth = new AuthManager({
    config: { enabled: true },
    onPersist: patch => { saved = patch; },
    fetch: async url => new Response(JSON.stringify({ keys: [url.includes('fixture.') ? first.jwk : second.jwk] })),
  });
  t.after(() => auth.dispose());
  await assert.rejects(auth.setCfAccess({ enabled: true, teamDomain: 'https://127.0.0.1', aud: AUD }));
  await auth.setCfAccess({ enabled: true, teamDomain: `https://${TEAM}/`, aud: AUD });
  assert.equal(saved.cfAccess.teamDomain, TEAM);
  const req = token => ({ socket: { remoteAddress: '127.0.0.1' }, headers: { 'cf-ray': 'fixture', 'cf-access-jwt-assertion': token } });
  assert.equal((await auth.verifyRequestAsync(req(jwt(first.privateKey, claims())))).authenticated, true);
  await auth.setCfAccess({ teamDomain: 'second' });
  const changed = claims({ iss: 'https://second.cloudflareaccess.com' });
  assert.equal((await auth.verifyRequestAsync(req(jwt(first.privateKey, changed)))).authenticated, false);
  assert.equal((await auth.verifyRequestAsync(req(jwt(second.privateKey, changed)))).authenticated, true);
});

test('Access key failures fail closed and unknown key retries are bounded', async t => {
  const pair = fixtureKeys();
  let fail = false, calls = 0;
  const auth = new AuthManager({
    config: { enabled: true, cfAccess: { enabled: true, teamDomain: TEAM, aud: AUD } },
    fetch: async () => { calls++; if (fail) throw new Error('offline'); return new Response(JSON.stringify({ keys: [pair.jwk] })); },
    logger: { warn() {} },
  });
  t.after(() => auth.dispose());
  const req = { socket: { remoteAddress: '127.0.0.1' }, headers: { 'cf-ray': 'fixture', 'cf-access-jwt-assertion': jwt(pair.privateKey, claims(), { kid: 'unknown' }) } };
  assert.equal((await auth.verifyRequestAsync(req)).authenticated, false);
  assert.equal((await auth.verifyRequestAsync(req)).authenticated, false);
  assert.equal(calls, 2);
  auth.cfKeysAt = 0;
  fail = true;
  req.headers['cf-access-jwt-assertion'] = jwt(pair.privateKey, claims());
  assert.equal((await auth.verifyRequestAsync(req)).authenticated, false);
  assert.equal((await auth.verifyRequestAsync(req)).authenticated, false);
  assert.equal(calls, 3);
});

test('Cloudflare Access: unknown kid refreshes the key set once and then authenticates', async t => {
  const primary = fixtureKeys('primary');
  const rotated = fixtureKeys('rotated');
  let generation = 0;
  const { base, keys } = await fixture(t, {
    config: { enabled: true, cfAccess: { enabled: true, teamDomain: 'fixture', aud: AUD } },
    jwks: () => ({ keys: generation++ === 0 ? [primary.jwk] : [primary.jwk, rotated.jwk] }),
  });
  const cf = { 'cf-ray': 'fixture', 'cf-access-jwt-assertion': jwt(rotated.privateKey, claims(), { kid: 'rotated' }) };
  assert.equal((await fetch(`${base}/api/test`, { headers: cf })).status, 200);
  assert.equal(keys(), 2);
});

test('Cloudflare Access disabled: tunnel traffic keeps password/session flow', async t => {
  const pair = fixtureKeys();
  const { auth, base, keys } = await fixture(t, {
    config: { enabled: true, mode: 'password_only' },
    jwks: () => ({ keys: [pair.jwk] }),
  });
  const cf = { 'cf-ray': 'fixture' };
  assert.equal((await fetch(`${base}/api/test`, { headers: cf })).status, 401);
  const denied = await fetch(`${base}/api/test`, { headers: { ...cf, 'cf-access-jwt-assertion': jwt(pair.privateKey, claims()) } });
  assert.equal(denied.status, 401); // 設定前は JWT があっても従来どおりの認証
  const ok = await fetch(`${base}/api/test`, { headers: { ...cf, cookie: `dsh_bridge_auth=${auth.createSession()}` } });
  assert.equal(ok.status, 200);
  assert.equal(keys(), 0); // 鍵の取得は行われない
});

test('Cloudflare Access configured but disabled: custom tunnel flow unchanged', async t => {
  const pair = fixtureKeys();
  const { auth, base } = await fixture(t, {
    config: { enabled: true, cfAccess: { enabled: false, teamDomain: 'fixture', aud: AUD } },
    jwks: () => ({ keys: [pair.jwk] }),
  });
  const tunnel = { 'x-dsh-internal-tunnel': auth.internalTunnelSecret };
  assert.equal((await fetch(`${base}/api/test`, { headers: tunnel })).status, 401);
  const ok = await fetch(`${base}/api/test`, { headers: { ...tunnel, cookie: `dsh_bridge_auth=${auth.createSession()}` } });
  assert.equal(ok.status, 200);
});
