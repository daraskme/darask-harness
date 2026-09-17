import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createCliProvider, providerEnvironment, resolveCliExecutable, safeLoginUrl, spawnBounded } from '../src/providers/cli.mjs';

function child() {
  const process = new EventEmitter();
  process.stdout = new PassThrough(); process.stderr = new PassThrough(); process.stdin = new PassThrough();
  process.kills = [];
  process.kill = signal => { process.kills.push(signal); setImmediate(() => process.emit('close', null)); return true; };
  return process;
}
const win = { platform: 'win32', home: 'C:\\Users\\tester', env: {}, exists: () => true };
const options = (id, spawn) => ({ platform: 'linux', executable: `/tools/${id}`, home: '/tmp/darask-empty-home', exists: () => true, spawn, timeoutMs: 500, loginWaitMs: 100, loginTimeoutMs: 500 });

test('Grok and Cursor default to different absolute executable paths', () => {
  const grok = resolveCliExecutable('grok', win);
  const cursor = resolveCliExecutable('cursor', { ...win, exists: filename => !filename.endsWith('.cmd') });
  assert.equal(grok.command, 'C:\\Users\\tester\\.grok\\bin\\agent.exe');
  assert.equal(cursor.command, 'C:\\Users\\tester\\AppData\\Local\\cursor-agent\\agent.exe');
  assert.throws(() => resolveCliExecutable('cursor', { ...win, executable: grok.command }), /another provider/);
  assert.throws(() => resolveCliExecutable('grok', { ...win, executable: cursor.command }), /another provider/);
  assert.throws(() => resolveCliExecutable('cursor', { ...win, executable: 'agent' }), /absolute path/);
  assert.throws(() => resolveCliExecutable('grok', { ...win, executable: 'C:\\misc\\agent.exe' }), /ambiguous/);
});

test('Windows cmd shims are parsed without invoking cmd or a shell', () => {
  const resolved = resolveCliExecutable('cursor', {
    ...win, executable: 'C:\\cursor-agent\\agent.cmd',
    readFile: () => '@echo off\r\n"%~dp0node.exe" "%~dp0index.js" %*\r\n',
    nodeExecutable: 'C:\\runtime\\node.exe',
  });
  assert.equal(resolved.command, 'C:\\runtime\\node.exe');
  assert.deepEqual(resolved.args, ['C:\\cursor-agent\\index.js']);
  assert.throws(() => resolveCliExecutable('cursor', { ...win, readFile: () => 'powershell -Command %EVIL%' }), /cannot safely resolve/);
  assert.throws(() => resolveCliExecutable('cursor', { ...win, readFile: () => '"%~dp0..\\..\\evil.js" %*' }), /invalid launcher/);
});

const cursorCmd = '@echo off\nset "SCRIPT_DIR=%~dp0"\n%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\\cursor-agent.ps1" %*';
const cursorPs1 = '$scriptPath = Split-Path -parent $MyInvocation.MyCommand.Definition\n& "$scriptPath\\node.exe" "$scriptPath\\index.js" $args\n$nodePath = "$scriptPath\\versions\\$versionName\\node.exe"\n& "$nodePath" "$scriptPath\\versions\\$versionName\\index.js" $args';
const cursorShimOptions = {
  ...win, executable: 'C:\\cursor-agent\\agent.cmd',
  exists: filename => filename !== 'C:\\cursor-agent\\node.exe',
  readFile: filename => filename.endsWith('.cmd') ? cursorCmd : cursorPs1,
  readdir: () => ['2026.9.9-abcd', '2026.09.10-fd3934a', '2026.09.10-15-00-00-aabb', '..\\evil', '9999.99.99-execute.exe'].map(name => ({ name, isDirectory: () => true })),
};

test('official Cursor PowerShell shim resolves the latest bundled node and entry point directly', () => {
  const launch = resolveCliExecutable('cursor', cursorShimOptions);
  assert.equal(launch.command, 'C:\\cursor-agent\\versions\\2026.09.10-15-00-00-aabb\\node.exe');
  assert.deepEqual(launch.args, ['C:\\cursor-agent\\versions\\2026.09.10-15-00-00-aabb\\index.js']);
  assert.deepEqual(launch.env, { CURSOR_INVOKED_AS: 'agent.cmd' });
  assert.ok(!launch.command.includes('powershell'));
});

test('Cursor installation with sibling node works and malformed or incomplete installations fail closed', () => {
  const direct = resolveCliExecutable('cursor', { ...cursorShimOptions, exists: () => true });
  assert.equal(direct.command, 'C:\\cursor-agent\\node.exe');
  assert.throws(() => resolveCliExecutable('cursor', { ...cursorShimOptions, readdir: () => [] }), /no valid installed version/);
  assert.throws(() => resolveCliExecutable('cursor', { ...cursorShimOptions, readFile: filename => filename.endsWith('.cmd') ? cursorCmd : 'Invoke-Expression $env:PAYLOAD' }), /unrecognized/);
  assert.throws(() => resolveCliExecutable('cursor', { ...cursorShimOptions, exists: filename => !filename.endsWith('index.js') && filename !== 'C:\\cursor-agent\\node.exe' }), /lacks node.exe or index.js/);
});

test('only provider-owned login URLs and credentials reach each child', () => {
  assert.equal(safeLoginUrl('cursor', 'https://cursor.com/login?state=abc'), 'https://cursor.com/login?state=abc');
  assert.equal(safeLoginUrl('cursor', 'https://cursor.com.evil.test/login'), undefined);
  assert.equal(safeLoginUrl('cursor', 'https://cursor.com/login?access_token=secret'), undefined);
  assert.equal(safeLoginUrl('cursor', 'https://cursor.com/login#id_token=secret'), undefined);
  assert.equal(safeLoginUrl('cursor', 'https://user:secret@cursor.com/login'), undefined);
  const env = providerEnvironment('cursor', { PATH: '/bin', CURSOR_API_KEY: 'cursor-secret', XAI_API_KEY: 'grok-secret', OPENAI_API_KEY: 'codex-secret', NODE_OPTIONS: '--require evil', RANDOM_SECRET: 'secret' });
  assert.deepEqual(env, { PATH: '/bin', CURSOR_API_KEY: 'cursor-secret' });
});

test('bounded processes use structured spawn, cap output, and terminate on timeout', async () => {
  let first;
  const bounded = spawnBounded({ command: '/tools/claude', args: [] }, ['auth', 'status'], { timeoutMs: 50, maxBytes: 16, spawn: (command, args, config) => {
    assert.equal(command, '/tools/claude'); assert.deepEqual(args, ['auth', 'status']);
    assert.equal(config.shell, false); assert.equal(config.windowsHide, true);
    first = child(); setImmediate(() => first.stdout.write('x'.repeat(17))); return first;
  } });
  assert.equal((await bounded.completion).error, 'output-limit');
  assert.equal(first.kills[0], 'SIGTERM');
  const hung = spawnBounded({ command: '/tools/claude', args: [] }, [], { timeoutMs: 10, spawn: child });
  assert.equal((await hung.completion).error, 'timeout');
  const cancelled = spawnBounded({ command: '/tools/claude', args: [] }, [], { spawn: child });
  cancelled.cancel(); assert.equal((await cancelled.completion).error, 'cancelled');
});

test('status never initiates login and does not expose tokens from CLI output', async () => {
  const calls = [];
  const provider = createCliProvider('cursor', options('cursor-agent', (command, args) => {
    calls.push(args);
    const process = child();
    setImmediate(() => { process.stdout.write(JSON.stringify({ authenticated: true, email: 'person@example.com', accessToken: 'secret-token' })); process.emit('close', 0); });
    return process;
  }));
  assert.equal((await provider.status()).auth, 'authenticated');
  assert.deepEqual(await provider.login(), { status: 'authenticated' });
  assert.ok(calls.every(args => args.join(' ') === 'status --format json'));
  assert.ok(!JSON.stringify(await provider.status()).includes('secret-token'));
  provider.dispose();
});

test('login returns a provider URL, can be cancelled, and uses the correct CLI', async () => {
  const processes = [];
  const provider = createCliProvider('cursor', options('cursor-agent', (command, args, config) => {
    const process = child(); processes.push({ process, args });
    setImmediate(() => {
      if (args[0] === 'status') { process.stdout.write('{"authenticated":false}'); process.emit('close', 0); }
      else if (args[0] === 'login') { assert.equal(config.env.NO_OPEN_BROWSER, '1'); process.stdout.write('Secret token: do-not-return\nOpen https://cursor.com/login?state=abc\n'); }
      else process.emit('close', 0);
    });
    return process;
  }));
  const result = await provider.login();
  assert.equal(result.status, 'pending'); assert.equal(result.url, 'https://cursor.com/login?state=abc');
  assert.ok(!JSON.stringify(result).includes('do-not-return'));
  assert.deepEqual(await provider.login(), result);
  await provider.cancelLogin();
  assert.equal(processes.find(value => value.args[0] === 'login').process.kills[0], 'SIGTERM');
  provider.dispose();
});

test('cancellation during status check prevents a later login from starting', async () => {
  const argsSeen = [];
  const provider = createCliProvider('claude', options('claude', (command, args) => {
    argsSeen.push(args);
    const process = child();
    setTimeout(() => { process.stdout.write('{"loggedIn":false}'); process.emit('close', 1); }, 20);
    return process;
  }));
  const login = provider.login();
  await provider.cancelLogin();
  assert.match((await login).message, /cancelled/);
  assert.equal(argsSeen.length, 1);
  provider.dispose();
});

test('Grok status uses a read-only capability check, not a fictitious status command', async () => {
  const provider = createCliProvider('grok', options('grok', (command, args) => {
    assert.deepEqual(args, ['--version']);
    const process = child(); setImmediate(() => { process.stdout.write('Grok Build 1.0'); process.emit('close', 0); }); return process;
  }));
  const result = await provider.status(); assert.equal(result.auth, 'unknown'); assert.equal(result.usage.status, 'unavailable'); provider.dispose();
});

test('cancellation completion waits for child close before allowing lock release', async () => {
  const process = child();
  process.kill = signal => { process.kills.push(signal); return true; };
  const job = spawnBounded({ command: '/tools/claude', args: [] }, [], { platform: 'linux', spawn: () => process, killTimeoutMs: 1000 });
  let settled = false;
  const cancelled = job.cancel().then(value => { settled = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  process.emit('close', null);
  assert.equal((await cancelled).terminated, true);
});

test('Windows cancels only its own process tree, and awaits taskkill success', async () => {
  const process = child(); process.pid = 42042;
  const killer = new EventEmitter(); killer.kill = () => true;
  const job = spawnBounded({ command: 'C:\\tools\\claude.exe', args: [] }, [], {
    platform: 'win32', spawn: () => process, killTimeoutMs: 1000,
    killSpawn: (command, args, options) => {
      assert.match(command, /\\System32\\taskkill\.exe$/i);
      assert.deepEqual(args, ['/PID', '42042', '/T', '/F']);
      assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
      return killer;
    },
  });
  let settled = false;
  const cancelled = job.cancel().then(value => { settled = true; return value; });
  process.emit('close', null);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false); assert.deepEqual(process.kills, []);
  killer.emit('close', 0);
  const result = await cancelled;
  assert.equal(result.error, 'cancelled'); assert.equal(result.terminated, true);
});

test('failed process-tree termination is explicit and never reports a safe release', async () => {
  const process = child(); process.pid = 42043;
  const job = spawnBounded({ command: 'C:\\tools\\claude.exe', args: [] }, [], {
    platform: 'win32', spawn: () => process, killTimeoutMs: 10,
    killSpawn: () => { const killer = new EventEmitter(); killer.kill = () => true; setImmediate(() => killer.emit('close', 1)); return killer; },
  });
  const result = await job.cancel();
  assert.equal(result.error, 'termination-unconfirmed'); assert.equal(result.terminated, false); assert.equal(result.pid, 42043);
});
