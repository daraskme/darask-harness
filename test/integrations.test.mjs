import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { createTailscale, selfStatus, serveState } from '../src/tailscale.mjs';
import { createBrowserRun, browserRunConfig, browserRunUrl } from '../src/browser-run.mjs';
import { publicOrigin, createRoutes, completeOpenRouterCallback } from '../src/http.mjs';

async function temporary(t) {
  const root = resolve(tmpdir());
  const path = await mkdtemp(join(root, 'darask-integration-'));
  t.after(async () => { assert.equal(dirname(resolve(path)), root); assert.ok(basename(path).startsWith('darask-integration-')); await rm(path, { recursive: true, force: true }); });
  return path;
}
const authority = 'node.tailtest.ts.net:8443';
const target = 'http://127.0.0.1:3080';
const serving = () => ({ TCP: { '8443': { HTTPS: true } }, Web: { [authority]: { Handlers: { '/': { Proxy: target } } } } });
test('Tailscale only reports own device and rejects malformed DNS', () => {
  const result = selfStatus({ BackendState: 'Running', Self: { DNSName: 'node.tailtest.ts.net.', TailscaleIPs: ['100.64.0.1', 'bad'] }, Peer: { secret: 'other device' }, User: { private: 'email' } });
  assert.equal(result.dnsName, 'node.tailtest.ts.net');
  assert.deepEqual(result.addresses, ['100.64.0.1']);
  assert.ok(!JSON.stringify(result).includes('secret'));
  assert.equal(selfStatus({ Self: { DNSName: 'bad.ts.net/attack' } }).dnsName, null);
});
test('Tailscale refuses conflicts, public Funnel and shared handlers', () => {
  assert.equal(serveState({}, authority, target, 8443), 'off');
  assert.equal(serveState(serving(), authority, target, 8443), 'on');
  const other = serving(); other.Web[authority].Handlers['/other'] = { Text: 'other' };
  assert.equal(serveState(other, authority, target, 8443), 'conflict');
  assert.equal(serveState({ ...serving(), AllowFunnel: { [authority]: true } }, authority, target, 8443), 'conflict');
});
test('Tailscale enable and stop manage only their own port and preserve other applications', async t => {
  let configuration = { TCP: { '443': { HTTPS: true } }, Web: { 'other.example:443': { Handlers: { '/': { Text: 'preserve' } } } } };
  const calls = [];
  const tailscale = createTailscale({ directory: await temporary(t), run: async args => {
    calls.push(args);
    if (args[0] === 'status') return { code: 0, stdout: JSON.stringify({ BackendState: 'Running', Self: { DNSName: 'node.tailtest.ts.net.' } }) };
    if (args[1] === 'status') return { code: 0, stdout: JSON.stringify(configuration) };
    if (args.at(-1) === 'off') { delete configuration.TCP['8443']; delete configuration.Web[authority]; }
    else { configuration.TCP['8443'] = { HTTPS: true }; configuration.Web[authority] = serving().Web[authority]; }
    return { code: 0, stdout: '' };
  } });
  assert.equal((await tailscale.action('serveEnable')).owned, true);
  assert.equal((await tailscale.action('serveDisable')).serve, 'off');
  assert.equal(configuration.Web['other.example:443'].Handlers['/'].Text, 'preserve');
  assert.ok(!calls.flat().includes('reset'));
  assert.ok(!calls.flat().includes('funnel'));
  await tailscale.dispose();
});
test('Tailscale will not stop an existing configuration without ownership', async t => {
  const tailscale = createTailscale({ directory: await temporary(t), run: async args => ({ code: 0, stdout: JSON.stringify(args[0] === 'status' ? { BackendState: 'Running', Self: { DNSName: 'node.tailtest.ts.net.' } } : serving()) }) });
  await assert.rejects(tailscale.action('serveDisable'), /not created by DARASK/);
});
test('Browser Run rejects invalid credentials and private URLs before making requests', () => {
  for (const url of ['http://example.com', 'https://127.0.0.1', 'https://100.64.0.2', 'https://host.tailname.ts.net', 'https://user:password@example.com', 'file:///tmp/file']) assert.throws(() => browserRunUrl(url));
  assert.equal(browserRunUrl('https://example.com'), 'https://example.com/');
  assert.throws(() => browserRunConfig({ accountId: '../escape', apiToken: 'valid-token-123456' }));
});
test('Browser Run stores credentials only through the credential service and reports actual measured time', async t => {
  const saved = new Map();
  let connection;
  const provider = createBrowserRun({ directory: await temporary(t), credentials: { resolve: async k => saved.has(k) ? { value: saved.get(k) } : undefined, set: async (k,v) => saved.set(k,v), unset: async k => saved.delete(k) },
    onConnection: async value => { connection = value; }, fetch: async (url, options) => {
      assert.match(url, /^https:\/\/api.cloudflare.com\/client\/v4\/accounts\/[a-f0-9]{32}\/browser-rendering\/markdown$/);
      assert.equal(options.headers.Authorization, 'Bearer fake-token-1234567890');
      assert.equal(JSON.parse(options.body).url, 'https://example.com/');
      return new Response(JSON.stringify({ success: true, result: '# Example' }), { headers: { 'x-browser-ms-used': '123.5' } });
    } });
  assert.equal((await provider.status()).configured, false);
  await provider.save({ accountId: 'a'.repeat(32), apiToken: 'fake-token-1234567890' });
  assert.equal(connection.accountId, 'a'.repeat(32));
  assert.ok(!JSON.stringify(await provider.status()).includes('fake-token'));
  assert.equal((await provider.status()).connected, false);
  assert.equal((await provider.run({ action: 'markdown', url: 'https://example.com' })).text, '# Example');
  assert.equal((await provider.status()).observedMs, 123.5);
  await provider.remove(); assert.equal(saved.size, 0); assert.equal(connection, null);
});
test('Browser Run saves returned PDF locally and suppresses credentials in network errors', async t => {
  const creds = { resolve: async () => ({ value: JSON.stringify({ accountId: 'b'.repeat(32), apiToken: 'fake-token-1234567890' }) }) };
  const directory = await temporary(t);
  const provider = createBrowserRun({ credentials: creds, directory, fetch: async () => new Response('%PDF-1.7\nfixture', { headers: { 'content-type': 'application/pdf' } }) });
  const result = await provider.run({ action: 'pdf', url: 'https://example.com' });
  assert.equal(dirname(result.file), join(directory, 'browser-run'));
  assert.equal(await readFile(result.file, 'utf8'), '%PDF-1.7\nfixture');
  assert.equal(result.browserMs, undefined);
  const failing = createBrowserRun({ credentials: creds, directory, fetch: async () => { throw new Error('secret token in failure'); } });
  await assert.rejects(failing.run({ action: 'content', url: 'https://example.com' }), error => !error.message.includes('secret token'));
});
test('DSH carrier Host and Origin reconstruct the real login origin', async () => {
  const request = new Request('http://dsh.internal/api/darask/action', { method: 'POST', headers: { host: 'localhost:3080', origin: 'http://localhost:3080', 'content-type': 'application/json' }, body: '{}' });
  assert.equal(publicOrigin(request), 'http://localhost:3080');
  let observed;
  const route = createRoutes({ action: async (_payload, origin) => { observed = origin; return {}; } })[1];
  assert.equal((await route.fetch(request)).status, 200);
  assert.equal(observed, 'http://localhost:3080');
});

test('OAuth callback preserves HTTPS only for a trusted Tailscale authority', async () => {
  const host = 'test.example.ts.net:8443';
  const request = new Request('http://dsh.internal/darask/openrouter/callback?code=test&state=fixture', { headers: { host } });
  let observed;
  await completeOpenRouterCallback({ callback: async url => { observed = url; } }, request, [host]);
  assert.equal(observed, `https://${host}/darask/openrouter/callback?code=test&state=fixture`);
  assert.equal(publicOrigin(request), `http://${host}`);
  const forwarded = new Request('http://dsh.internal/', { headers: { host: 'localhost:3080', 'x-forwarded-host': host, 'x-forwarded-proto': 'https' } });
  assert.equal(publicOrigin(forwarded, [host]), 'http://localhost:3080');
  assert.throws(() => publicOrigin(new Request('http://dsh.internal/', { headers: { host, origin: 'https://foreign.example' } }), [host]));
});
