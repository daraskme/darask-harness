import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once, EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { PassThrough } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import { ProxyServer, BridgeService } from '../vendor/dsh-bridge-gateway/lib/index.js';
import { AuthManager } from '../vendor/dsh-bridge-gateway/lib/auth/manager.js';
import { createDshSession, upstreamHeaders } from '../vendor/dsh-bridge-gateway/lib/dsh-session.mjs';
import { buildCloudflaredArgs, parseTunnelLog, cloudflaredEnvironment, namedTunnelUrl } from '../vendor/dsh-bridge-gateway/lib/cloudflared-manager.mjs';

test('unloading Gateway stops its tunnel without disabling automatic startup', async () => {
  for (const autoStart of [true, false]) {
    const saved = [];
    const config = { token: 'fixture', hostname: 'example.com', autoStart };
    const service = new BridgeService({ cloudflaredConfig: config, onPersist: async patch => saved.push(patch) });
    let stopped = 0;
    service.cloudflared = { stop() { stopped++; } };
    await service.dispose();
    assert.equal(stopped, 1);
    assert.equal(service.cloudflared, null);
    assert.equal(service.cloudflaredConfig, config);
    assert.ok(saved.every(patch => !('cloudflared' in patch)));
    await service.dispose();
    assert.equal(stopped, 1);
  }
});

test('saving a masked Cloudflare form preserves the stored tunnel token until explicitly cleared', async () => {
  const saved = [];
  const service = new BridgeService({ cloudflaredConfig: { token: 'private-token', hostname: 'old.example.com', autoStart: true }, onPersist: async patch => saved.push(patch) });
  await service.saveCloudflaredConfig({ token: undefined, hostname: 'new.example.com' });
  assert.equal(service.cloudflaredConfig.token, 'private-token');
  assert.equal(saved[0].cloudflared.token, 'private-token');
  await service.saveCloudflaredConfig({ token: '', hostname: '' });
  assert.equal(service.cloudflaredConfig.token, '');
});

test('explicitly stopping the tunnel still disables and persists automatic startup', async () => {
  const saved = [];
  const service = new BridgeService({ cloudflaredConfig: { token: 'fixture', hostname: 'example.com', autoStart: true }, onPersist: async patch => saved.push(patch) });
  await service.stopCloudflared();
  assert.equal(service.cloudflaredConfig.autoStart, false);
  assert.deepEqual(saved, [{ cloudflared: { token: 'fixture', hostname: 'example.com', autoStart: false } }]);
});

test('named Cloudflare tunnels never mix remote ingress with --url; inherited credentials cannot select another tunnel', () => {
  const named = buildCloudflaredArgs({ token: 'fixture-token', tokenInEnvironment: true, port: 3082 });
  assert.ok(!named.includes('--url')); assert.ok(!named.includes('fixture-token')); assert.equal(named.at(-1), 'run');
  assert.ok(buildCloudflaredArgs({ port: 3082 }).includes('http://127.0.0.1:3082'));
  const env = cloudflaredEnvironment({ PATH: 'fixture', TUNNEL_TOKEN: 'other', TUNNEL_URL: 'http://wrong', TUNNEL_CONFIG: 'other.yml' }, 'own');
  assert.equal(env.TUNNEL_TOKEN, 'own'); assert.equal(env.TUNNEL_URL, undefined); assert.equal(env.TUNNEL_CONFIG, undefined); assert.equal(env.PATH, 'fixture');
  assert.equal(cloudflaredEnvironment({ TUNNEL_TOKEN: 'other' }, null).TUNNEL_TOKEN, undefined);
});
test('allocating a Quick Tunnel URL does not signal connection readiness', () => {
  const url = parseTunnelLog('INF https://fixture.trycloudflare.com');
  assert.equal(url.url, 'https://fixture.trycloudflare.com'); assert.equal(url.ready, false);
  assert.equal(parseTunnelLog('Updated to new configuration', { token: 'fixture', hostname: 'example.com' }), null);
  assert.equal(parseTunnelLog('Registered tunnel connection connIndex=0', { token: 'fixture', hostname: 'example.com' }).ready, true);
  assert.equal(namedTunnelUrl('https://user:secret@example.com'), null);
  assert.equal(namedTunnelUrl('example.com'), 'https://example.com');
});
test('gateway gets a cookie from the official Connection exchange and replaces stale duplicates', () => {
  let exchanges = 0;
  const session = createDshSession({ authenticatedUrl: base => `${base}/?token=fixture`, authorizeIndex: (request, response) => {
    exchanges++; assert.equal(request.headers.host, '127.0.0.1:3080');
    response.writeHead(303, { 'set-cookie': 'dsh-auth-fixture=current; Max-Age=600; Path=/; HttpOnly' }); response.end();
  } }, 3080);
  const first = session(); assert.equal(first, 'dsh-auth-fixture=current'); assert.equal(session(), first); assert.equal(exchanges, 1);
  const headers = upstreamHeaders({ Host: 'example.com', Origin: 'https://example.com', Cookie: 'other=yes; dsh-auth-fixture=stale', 'Accept-Encoding': 'gzip' }, 3080, first);
  assert.equal(headers.host, '127.0.0.1:3080'); assert.equal(headers.origin, 'http://127.0.0.1:3080'); assert.equal(headers.cookie, 'other=yes; dsh-auth-fixture=current'); assert.equal(headers['accept-encoding'], undefined);
});
test('Cloudflare HTTP and WebSocket traffic keep visitor authentication before reaching DSH', async t => {
  let forwarded = 0;
  let sessionCalls = 0;
  const upstream = createServer((req, res) => { forwarded++; assert.match(req.headers.cookie, /dsh-auth-fixture=current/); res.end('DSH fixture'); });
  const wss = new WebSocketServer({ server: upstream });
  wss.on('connection', (ws, req) => { assert.match(req.headers.cookie, /dsh-auth-fixture=current/); ws.send('DSH websocket'); });
  await new Promise(r => upstream.listen(0, '127.0.0.1', r));
  const auth = new AuthManager({ config: { enabled: true, mode: 'password_only' }, logger: { warn() {} } });
  const proxy = new ProxyServer({ localPort: 0, targetPort: upstream.address().port, authManager: auth, logger: { info() {}, error() {} }, dshSession: () => { sessionCalls++; return 'dsh-auth-fixture=current'; } });
  await proxy.start();
  t.after(async () => { for (const client of wss.clients) client.terminate(); await proxy.stop(); wss.close(); await new Promise(r => upstream.close(r)); auth.dispose(); });
  const base = `http://127.0.0.1:${proxy.server.address().port}`;
  const headers = { 'cf-ray': 'fixture', origin: 'https://fixture.trycloudflare.com' };
  assert.equal((await fetch(`${base}/api/test`, { headers })).status, 401);
  assert.equal(forwarded, 0); assert.equal(sessionCalls, 0);
  headers.cookie = `dsh_bridge_auth=${auth.createSession()}`;
  assert.equal(await (await fetch(`${base}/api/test`, { headers })).text(), 'DSH fixture');
  const ws = new WebSocket(base.replace('http:', 'ws:'), { headers });
  const [body] = await once(ws, 'message'); assert.equal(body.toString(), 'DSH websocket'); ws.close();
});
