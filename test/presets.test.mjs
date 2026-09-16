import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listShippedPresets, syncPreset, MARKER_FILE, PRESETS_ROOT } from '../src/presets.mjs';

async function scratch() {
  const dir = await mkdtemp(join(tmpdir(), 'darask-presets-'));
  return { dir, [Symbol.asyncDispose]: () => rm(dir, { recursive: true, force: true }) };
}

test('shipped presets are discovered and each has a composition', async () => {
  const presets = await listShippedPresets();
  assert.ok(presets.includes('darask'));
  for (const id of presets) {
    const files = await readdir(join(PRESETS_ROOT, id));
    assert.ok(files.includes('agent.cordis.yml'), `${id}: agent.cordis.yml`);
    assert.ok(files.includes('preset.yml'), `${id}: preset.yml`);
  }
});

test('darask preset extends agent-instructions with grok-build file names and keeps the tools rows', async () => {
  const text = await readFile(join(PRESETS_ROOT, 'darask/agent.cordis.yml'), 'utf8');
  for (const candidate of ['AGENTS.md', 'AGENT.md', 'GROK.md', 'CLAUDE.md', 'GROK.local.md']) assert.match(text, new RegExp(`- ${candidate.replace('.', '\\.')}$`, 'm'));
  for (const row of ['tool-fs', 'tool-fs-search', 'tool-jobs', 'plan-mode', 'tool-subagent']) assert.match(text, new RegExp(`^\\s*- id: ${row}$`, 'm'));
});

test('syncPreset creates, updates, prunes and never overwrites a user-authored preset', async () => {
  await using home = await scratch();
  await using src = await scratch();
  const source = join(src.dir, 'p');
  await mkdir(join(source, 'skills'), { recursive: true });
  await writeFile(join(source, 'agent.cordis.yml'), '[]\n');
  await writeFile(join(source, 'preset.yml'), 'name: P\n');
  await writeFile(join(source, 'skills/a.md'), 'a\n');

  const created = await syncPreset({ id: 'p', source, dshHome: home.dir, version: '1' });
  assert.equal(created.status, 'created');
  const target = join(home.dir, '.agent-presets', 'p');
  assert.equal(await readFile(join(target, 'skills/a.md'), 'utf8'), 'a\n');
  assert.deepEqual(JSON.parse(await readFile(join(target, MARKER_FILE), 'utf8')).files, ['agent.cordis.yml', 'preset.yml', 'skills/a.md']);

  assert.equal((await syncPreset({ id: 'p', source, dshHome: home.dir, version: '1' })).status, 'unchanged');

  await writeFile(join(source, 'agent.cordis.yml'), '- id: x\n');
  await rm(join(source, 'skills'), { recursive: true });
  await writeFile(join(target, 'stale.txt'), 'old');
  const updated = await syncPreset({ id: 'p', source, dshHome: home.dir, version: '2' });
  assert.equal(updated.status, 'updated');
  assert.equal(await readFile(join(target, 'agent.cordis.yml'), 'utf8'), '- id: x\n');
  assert.deepEqual((await readdir(target)).sort(), [MARKER_FILE, 'agent.cordis.yml', 'preset.yml']);

  await rm(join(target, MARKER_FILE));
  await writeFile(join(target, 'agent.cordis.yml'), '- id: mine\n');
  const kept = await syncPreset({ id: 'p', source, dshHome: home.dir, version: '3' });
  assert.equal(kept.status, 'user-owned');
  assert.equal(await readFile(join(target, 'agent.cordis.yml'), 'utf8'), '- id: mine\n');
});
