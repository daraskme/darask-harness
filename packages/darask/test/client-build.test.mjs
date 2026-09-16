import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildClients } from '../scripts/client-build.mjs';

test('a broken edit preserves both last working bundles; correcting it publishes new bytes', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'darask-build-'));
  t.after(async () => { assert.equal(path.dirname(root), path.resolve(tmpdir())); assert.ok(path.basename(root).startsWith('darask-build-')); await rm(root, { recursive: true, force: true }); });
  const vendor = path.join(root, 'vendor/dsh-bridge-gateway');
  await mkdir(path.join(root, 'src'), { recursive: true }); await mkdir(path.join(vendor, 'client'), { recursive: true });
  await writeFile(path.join(vendor, 'package.json'), '{"name":"dsh-bridge-gateway"}');
  await writeFile(path.join(vendor, 'client/index.js'), 'export const label = "before";');
  const mainSource = path.join(root, 'src/client.jsx');
  await writeFile(mainSource, 'export const label = "before"; export function apply() {}');
  await buildClients(root);
  const outputs = [path.join(root, 'dist/client.js'), path.join(vendor, 'client/client.js')];
  const before = await Promise.all(outputs.map(file => readFile(file, 'utf8')));
  await writeFile(mainSource, 'export const label = ;');
  await writeFile(path.join(vendor, 'client/index.js'), 'export const label = "after";');
  await assert.rejects(buildClients(root));
  assert.deepEqual(await Promise.all(outputs.map(file => readFile(file, 'utf8'))), before);
  await writeFile(mainSource, `export function apply(ctx) {
    ctx.effect(() => ctx.locale.register('settings.permission', 'ja', { 'preset.auto': '自動' }));
  }`);
  await assert.rejects(buildClients(root), /already has locale "ja"/);
  assert.deepEqual(await Promise.all(outputs.map(file => readFile(file, 'utf8'))), before);
  await writeFile(mainSource, 'export const label = "after"; export function apply() {}');
  await buildClients(root);
  for (const file of outputs) assert.ok((await readFile(file, 'utf8')).includes('after'));
});
