import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { parseConnectionLink } from '../src/connection-link.mjs';
import { createWorkspaceHub } from '../src/workspaces.mjs';
import { decodeQrPixels, startQrCamera } from '../src/qr-reader.mjs';
const require = createRequire(import.meta.url);
const { PNG } = createRequire(require.resolve('qrcode'))('pngjs');
const token = 'a'.repeat(43);
const origin = 'https://win.tail123.ts.net:8443';
const link = `${origin}/?token=${token}`;

test('connection QR imports only a complete Tailscale HTTPS DSH link', () => {
  assert.deepEqual(parseConnectionLink(` ${link} `), { name: 'win', url: origin, token });
  for (const invalid of ['javascript:alert(1)', 'https://evil.test/?token='+token,
    'https://win.tail123.ts.net.evil.test/?token='+token, 'http://win.tail123.ts.net/?token='+token,
    'http://127.0.0.1:3080/?token='+token, `${origin}/?token=short`, `${link}&token=${token}`,
    `${link}&redirect=https://evil.test`, `${link}#another`, `${origin}/api/?token=${token}`,
    `https://user:password@win.tail123.ts.net/?token=${token}`, 'x'.repeat(2049)]) assert.throws(() => parseConnectionLink(invalid));
});

test('exported QR decodes to the live Tailscale authentication link and is absent from ordinary status', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'darask-qr-'));
  t.after(async () => { assert.equal(path.dirname(directory), path.resolve(tmpdir())); assert.ok(path.basename(directory).startsWith('darask-qr-')); await rm(directory, { recursive: true, force: true }); });
  let serving = true;
  const hub = createWorkspaceHub({ directory, credentials: {}, registry: { list: () => [] },
    tailscale: { status: async () => ({ connected: true, serve: serving ? 'on' : 'off', url: `${origin}/` }) },
    connection: { authenticatedUrl(base) { assert.equal(base, `${origin}/`); return link; } } });
  await hub.initialize();
  const result = await hub.action({ action: 'connectionQr' });
  const image = PNG.sync.read(Buffer.from(result.image.split(',')[1], 'base64'));
  assert.equal(decodeQrPixels(image), link);
  assert.equal(parseConnectionLink(decodeQrPixels(image)).url, origin);
  const status = await (await hub.routes[0].fetch(new Request('http://127.0.0.1/api/darask/workspaces'))).text();
  assert.ok(!status.includes(token)); assert.ok(!status.includes('data:image'));
  const rejected = await hub.routes[0].fetch(new Request('http://127.0.0.1/api/darask/workspaces', { method: 'POST', headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json' }, body: '{"action":"connectionQr"}' }));
  assert.equal(rejected.status, 400);
  serving = false;
  await assert.rejects(hub.action({ action: 'connectionQr' }), /Tailscale/);
});

test('camera permission resolved after closing cannot leave camera tracks running', async () => {
  const ready = Promise.withResolvers(), controller = new AbortController();
  let stops = 0, scans = 0;
  const stream = { getTracks: () => [{ stop() { stops++; } }] };
  const video = { srcObject: null, pause() {}, async play() { throw new Error('closed camera must not play'); } };
  const task = startQrCamera(video, { signal: controller.signal, onScan() { scans++; }, onError() {}, mediaDevices: { getUserMedia: () => ready.promise } });
  controller.abort(); ready.resolve(stream); await task;
  assert.equal(stops, 1); assert.equal(scans, 0); assert.equal(video.srcObject, null);
});

test('successful camera scan stops the video before delivering the connection link', async () => {
  let stopped = false, received;
  const controller = new AbortController();
  const video = { srcObject: null, videoWidth: 640, videoHeight: 480, pause() {}, async play() {} };
  await startQrCamera(video, { signal: controller.signal,
    mediaDevices: { async getUserMedia(constraints) { assert.equal(constraints.audio, false); return { getTracks: () => [{ stop() { stopped = true; } }] }; } },
    readFrame: () => link, onScan(value) { assert.ok(stopped); received = value; }, onError(error) { throw error; } });
  assert.equal(received, link); assert.equal(video.srcObject, null);
  controller.abort();
});
