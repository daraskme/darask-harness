import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { createCodexProvider, normalizeCodexUsage } from '../src/providers/codex.mjs';

function fixture(handler) {
  const calls = [], processes = [];
  const spawn = (command, args, options) => {
    assert.equal(command, '/tools/codex'); assert.deepEqual(args, ['app-server']);
    assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.killed = false;
    child.send = message => child.stdout.write(JSON.stringify(message) + '\n');
    child.kill = () => { child.killed = true; setImmediate(() => { child.emit('exit', null); child.emit('close', null); }); return true; };
    child.stdin = new Writable({ write(chunk, encoding, callback) {
      for (const line of chunk.toString().trim().split('\n')) {
        const message = JSON.parse(line); calls.push(message);
        setImmediate(async () => {
          if (child.killed) return;
          if (message.method === 'initialize') child.send({ id: message.id, result: { userAgent: 'mock' } });
          else await handler?.(message, child);
        });
      }
      callback();
    } });
    processes.push(child); return child;
  };
  const provider = createCodexProvider({ platform: 'linux', executable: '/tools/codex', exists: () => true, spawn, timeoutMs: 200, loginTimeoutMs: 1000 });
  return { provider, calls, processes };
}

test('normalization preserves separate buckets, nulls, reset times and credit units', () => {
  const result = normalizeCodexUsage({
    rateLimits: { primary: { usedPercent: 99 } },
    rateLimitsByLimitId: {
      codex: { primary: { usedPercent: 25, windowDurationMins: 300, resetsAt: 2000000000 }, secondary: null, credits: { balance: '12.5', hasCredits: true, unlimited: false } },
      other: { primary: { usedPercent: null }, secondary: { usedPercent: 110 } },
    }, rateLimitResetCredits: { availableCount: 2 },
  });
  assert.equal(result.windows.length, 2); assert.equal(result.windows[0].remainingPercent, 75);
  assert.equal(result.windows[1].remainingPercent, 0); assert.equal(result.windows[1].resetsAt, null);
  assert.equal(result.credits[0].unit, 'credits'); assert.equal(result.credits[0].balance, 12.5);
  assert.equal(result.resetCredits, 2);
  assert.equal(normalizeCodexUsage({}).status, 'unavailable');
  assert.equal(normalizeCodexUsage({ rateLimits: { credits: { balance: null } } }).credits[0].balance, null);
});

test('account read follows handshake, fetches quota and never starts a login', async () => {
  const f = fixture((message, child) => {
    if (message.method === 'account/read') child.send({ id: message.id, result: { account: { type: 'chatgpt', email: 'user@example.com', accessToken: 'must-not-expose', planType: 'pro' } } });
    if (message.method === 'account/rateLimits/read') child.send({ id: message.id, result: { rateLimits: { primary: { usedPercent: 10 } } } });
  });
  const status = await f.provider.status();
  assert.equal(status.auth, 'authenticated'); assert.equal(status.usage.windows[0].remainingPercent, 90);
  assert.ok(!JSON.stringify(status).includes('must-not-expose'));
  assert.deepEqual(f.calls.map(call => call.method), ['initialize', 'initialized', 'account/read', 'account/rateLimits/read']);
  assert.deepEqual(f.calls[2].params, { refreshToken: false });
  f.provider.dispose();
});

test('browser login lifecycle is idempotent, handles notifications, cancellation and logout', async () => {
  let account = null;
  const f = fixture((message, child) => {
    if (message.method === 'account/read') child.send({ id: message.id, result: { account } });
    if (message.method === 'account/login/start') child.send({ id: message.id, result: { type: 'chatgpt', loginId: 'attempt-1', authUrl: 'https://auth.openai.com/authorize?state=abc' } });
    if (message.method === 'account/login/cancel' || message.method === 'account/logout') child.send({ id: message.id, result: {} });
    if (message.method === 'account/rateLimits/read') child.send({ id: message.id, result: {} });
  });
  const login = await f.provider.login(); assert.equal(login.url, 'https://auth.openai.com/authorize?state=abc');
  assert.equal(login.loginId, undefined); assert.deepEqual(await f.provider.login(), login);
  assert.equal(f.calls.filter(call => call.method === 'account/login/start').length, 1);
  await f.provider.cancelLogin(); assert.equal(f.calls.at(-1).params.loginId, 'attempt-1');
  await f.provider.login(); account = { type: 'chatgpt' };
  f.processes[0].send({ method: 'account/login/completed', params: { loginId: 'attempt-1', success: true, error: null } });
  assert.equal((await f.provider.status()).login.status, 'authenticated');
  await f.provider.logout(); assert.equal(f.calls.at(-1).method, 'account/logout');
  f.provider.dispose();
});

test('device login returns only the documented verification URL and user code', async () => {
  const f = fixture((message, child) => {
    if (message.method === 'account/read') child.send({ id: message.id, result: { account: null } });
    if (message.method === 'account/login/start') {
      assert.equal(message.params.type, 'chatgptDeviceCode');
      child.send({ id: message.id, result: { type: 'chatgptDeviceCode', loginId: 'device-1', verificationUrl: 'https://auth.openai.com/codex/device', userCode: 'ABCD-1234', accessToken: 'secret' } });
    }
  });
  assert.deepEqual(await f.provider.login({ deviceCode: true }), { status: 'pending', url: 'https://auth.openai.com/codex/device', userCode: 'ABCD-1234' });
  f.provider.dispose();
});

test('invalid auth URLs are rejected and their login attempts are cancelled', async () => {
  const f = fixture((message, child) => {
    if (message.method === 'account/read') child.send({ id: message.id, result: { account: null } });
    if (message.method === 'account/login/start') child.send({ id: message.id, result: { loginId: 'bad', authUrl: 'https://evil.test/collect' } });
    if (message.method === 'account/login/cancel') child.send({ id: message.id, result: {} });
  });
  await assert.rejects(f.provider.login(), /valid provider login URL/);
  assert.equal(f.calls.at(-1).method, 'account/login/cancel'); f.provider.dispose();
});

test('pending requests settle when the child exits and status exposes no raw errors', async () => {
  const f = fixture((message, child) => {
    if (message.method === 'account/read') { child.stderr.write('access_token=secret'); child.emit('exit', 1); }
  });
  const status = await f.provider.status(); assert.equal(status.auth, 'unavailable');
  assert.ok(!JSON.stringify(status).includes('access_token')); f.provider.dispose();
});

test('missing replies time out; oversized protocol output terminates the connection', async () => {
  const f = fixture(() => {});
  assert.equal((await f.provider.status()).auth, 'unavailable'); assert.equal(f.processes[0].killed, true); f.provider.dispose();
  const flood = fixture((message, child) => { if (message.method === 'account/read') child.stdout.write('x'.repeat(524289)); });
  assert.equal((await flood.provider.status()).auth, 'unavailable'); assert.equal(flood.processes[0].killed, true); flood.provider.dispose();
});

test('concurrent reads share one initialized app-server connection', async () => {
  const f = fixture((message, child) => { if (message.method === 'account/read') child.send({ id: message.id, result: { account: null } }); });
  const results = await Promise.all([f.provider.status(), f.provider.status(), f.provider.status()]);
  assert.ok(results.every(result => result.auth === 'unauthenticated'));
  assert.equal(f.processes.length, 1); assert.equal(f.calls.filter(call => call.method === 'initialize').length, 1); f.provider.dispose();
});
