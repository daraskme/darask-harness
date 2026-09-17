import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createComputer, computerEnvironment, defaultComputer, mapPoint, normalizeWindows, powershellExecutable, validateComputer, validateComputerAction } from '../src/computer.mjs';
import { defaultConfig, validateConfig } from '../src/config.mjs';
import { createStore } from '../src/store.mjs';
import { createService } from '../src/service.mjs';

async function directory(t) {
  const parent = path.resolve(tmpdir());
  const value = await mkdtemp(path.join(parent, 'darask-computer-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(value)), parent);
    assert.ok(path.basename(value).startsWith('darask-computer-'));
    await rm(value, { recursive: true, force: true });
  });
  return value;
}

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x03, 0x00, 0x01, 0x18, 0xdd, 0x8d, 0xb0, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

test('computer settings are opt-in and reject unknown keys', () => {
  assert.deepEqual(defaultComputer(), { enabled: false, game: { name: '', executable: '', args: [], cwd: '', windowTitle: '' } });
  assert.equal(validateConfig({}).computer.enabled, false);
  assert.equal(validateConfig({ computer: { enabled: true } }).computer.enabled, true);
  assert.deepEqual(validateConfig({ computer: { game: { name: 'TWA', executable: 'C:\\Games\\TWA\\game.exe', args: ['-windowed'], cwd: 'C:\\Games\\TWA', windowTitle: 'TWA' } } }).computer.game, {
    name: 'TWA', executable: 'C:\\Games\\TWA\\game.exe', args: ['-windowed'], cwd: 'C:\\Games\\TWA', windowTitle: 'TWA',
  });
  assert.throws(() => validateComputer({ enabled: 'yes' }));
  assert.throws(() => validateComputer({ enabled: true, extra: 1 }));
  assert.throws(() => validateConfig({ computer: { enabled: true, inject: true } }));
  assert.throws(() => validateConfig({ computer: { game: { executable: 'game.exe' } } }), /absolute/);
  assert.throws(() => validateConfig({ computer: { game: { args: ['ok', 'bad\narg'] } } }));
});

test('computer actions validate coordinates, keys, and text before any host call', () => {
  assert.equal(validateComputerAction({ action: 'screenshot' }).action, 'screenshot');
  assert.throws(() => validateComputerAction({ action: 'explode' }));
  assert.throws(() => validateComputerAction({ action: 'click' }));
  assert.throws(() => validateComputerAction({ action: 'click', x: 1.5, y: 2 }));
  assert.throws(() => validateComputerAction({ action: 'type', text: '' }));
  assert.throws(() => validateComputerAction({ action: 'type', text: 'a\u0000b' }));
  assert.throws(() => validateComputerAction({ action: 'key', keys: ['ctrl', 'evil.exe'] }));
  assert.throws(() => validateComputerAction({ action: 'focus' }));
  assert.deepEqual(validateComputerAction({ action: 'key', keys: ['Ctrl', 'C'] }).keys, ['ctrl', 'c']);
  assert.equal(validateComputerAction({ action: 'wait', ms: 250 }).ms, 250);
  assert.throws(() => validateComputerAction({ action: 'wait', ms: 20000 }));
});

test('window lists unwrap PowerShell 5.1 array wrapping and JSON strings', () => {
  const windows = [{ hwnd: '1', title: 'Notepad', x: 0, y: 0, width: 10, height: 10, pid: 2 }];
  assert.deepEqual(normalizeWindows(JSON.stringify(windows)), windows);
  assert.deepEqual(normalizeWindows([{ value: windows }]), windows);
  assert.deepEqual(normalizeWindows(null), []);
});

test('screenshot coordinates map through origin and scale; screen space is raw', () => {
  const capture = { originX: -1920, originY: 0, width: 3840, height: 1080, imageWidth: 1280, imageHeight: 360, scaleX: 3, scaleY: 3 };
  assert.deepEqual(mapPoint(0, 0, capture), { x: -1920 + Math.round(0.5 * 3), y: Math.round(0.5 * 3) });
  assert.deepEqual(mapPoint(10, 20, capture, 'screen'), { x: 10, y: 20 });
  assert.throws(() => mapPoint(10, 20, null));
  assert.throws(() => mapPoint(9999, 0, capture));
});

test('computer environment keeps the interactive Windows session and drops NODE_OPTIONS', () => {
  const env = computerEnvironment({ PATH: 'C:\\Windows\\System32', SESSIONNAME: 'Console', NODE_OPTIONS: '--require evil', USERPROFILE: 'C:\\Users\\tester', RANDOM: 'no' });
  assert.deepEqual(env, { PATH: 'C:\\Windows\\System32', SESSIONNAME: 'Console', USERPROFILE: 'C:\\Users\\tester' });
  assert.equal(powershellExecutable('win32', { SystemRoot: 'D:\\Windows' }), 'D:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.throws(() => powershellExecutable('linux'), /Windows/);
});

test('computer tool refuses work until enabled and serializes host operations', async t => {
  const location = await directory(t);
  const store = createStore(location);
  await store.load();
  const ops = [];
  const computer = createComputer({
    directory: location, store, platform: 'win32',
    runHost: async payload => {
      ops.push(payload.op);
      if (payload.op === 'screenshot') {
        await mkdir(path.dirname(payload.path), { recursive: true });
        await writeFile(payload.path, PNG);
        return { ok: true, op: 'screenshot', originX: 0, originY: 0, width: 100, height: 50, imageWidth: 100, imageHeight: 50, scaleX: 1, scaleY: 1, cursorX: 4, cursorY: 6, path: payload.path };
      }
      if (payload.op === 'windows') return { ok: true, windowsJson: JSON.stringify([{ hwnd: '42', title: 'Notepad', x: 0, y: 0, width: 800, height: 600, pid: 7 }]) };
      return { ok: true, op: payload.op };
    },
  });
  t.after(() => computer.dispose());
  await assert.rejects(computer.run({ action: 'windows' }), /enable PC screen control/);
  await store.save({ computer: { enabled: true } });
  const listed = await computer.run({ action: 'windows' });
  assert.match(listed.text, /Notepad/);
  const shot = await computer.run({ action: 'screenshot' });
  assert.equal(shot.width, 100);
  assert.equal(await readFile(shot.file).then(buffer => buffer.equals(PNG)), true);
  const clicked = await computer.run({ action: 'click', x: 10, y: 10, observe: false });
  assert.equal(clicked.action, 'click');
  assert.deepEqual(ops, ['windows', 'screenshot', 'click']);
  await assert.rejects(computer.run({ action: 'click', x: 10, y: 10 }), /screenshot/);
  await computer.run({ action: 'screenshot' });
  const observed = await computer.run({ action: 'click', x: 10, y: 10 });
  assert.equal(observed.action, 'click');
  assert.equal(observed.width, 100);
  assert.ok(ops.includes('screenshot'));
});

test('computer launches only the locally configured game profile without a shell', async t => {
  const location = await directory(t);
  const store = createStore(location);
  await store.load();
  await store.save({ computer: { enabled: true, game: {
    name: 'TWA', executable: 'C:\\Games\\TWA\\game.exe', args: ['-windowed'], cwd: 'C:\\Games\\TWA', windowTitle: 'TWA Client',
  } } });
  const launches = [];
  const computer = createComputer({
    directory: location, store, platform: 'win32', env: {}, runHost: async () => ({ ok: true }),
    startGame: async (...args) => launches.push(args),
  });
  t.after(() => computer.dispose());
  const result = await computer.run({ action: 'launch_game' });
  assert.equal(result.title, 'TWA Client');
  assert.equal(launches.length, 1);
  assert.equal(launches[0][0], 'C:\\Games\\TWA\\game.exe');
  assert.deepEqual(launches[0][1], ['-windowed']);
  assert.deepEqual(launches[0][2], {
    cwd: 'C:\\Games\\TWA', detached: true, env: {}, shell: false, stdio: 'ignore', windowsHide: false,
  });
  assert.match(result.text, /windows または screenshot/);
});

test('disabled computer status stays in the service snapshot and enable is persisted', async t => {
  const location = await directory(t);
  const store = createStore(location);
  await store.load();
  const computer = createComputer({ directory: location, store, platform: 'linux', runHost: async () => ({ ok: true }) });
  const service = createService({
    directory: location, store, computer,
    credentials: { resolve: async () => undefined }, enableOpenRouterRoute: async () => {},
    cliFactory: () => ({ status: async () => ({ auth: 'unknown', usage: { status: 'unavailable', windows: [], credits: null } }), dispose: async () => {} }),
    fetch: async () => { throw new Error('no network'); },
  });
  t.after(async () => { await service.dispose(); });
  const before = await service.status();
  assert.equal(before.computer.enabled, false);
  const after = await service.action({ action: 'enableComputer', provider: 'computer' });
  assert.equal(after.computer.enabled, true);
  const configured = await service.action({ action: 'saveComputerGame', provider: 'computer', config: {
    name: 'TWA', executable: 'C:\\Games\\TWA\\game.exe', args: [], cwd: '', windowTitle: 'TWA',
  } });
  assert.equal(configured.computer.game.name, 'TWA');
  assert.equal(JSON.parse(await readFile(path.join(location, 'preferences.json'), 'utf8')).computer.enabled, true);
  assert.equal(JSON.parse(await readFile(path.join(location, 'preferences.json'), 'utf8')).computer.game.executable, 'C:\\Games\\TWA\\game.exe');
  assert.equal(validateConfig(JSON.parse(await readFile(path.join(location, 'preferences.json'), 'utf8'))).computer.enabled, true);
  assert.equal(defaultConfig().computer.enabled, false);
});
