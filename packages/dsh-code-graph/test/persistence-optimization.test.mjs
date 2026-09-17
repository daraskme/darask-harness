import { test } from 'node:test';
import assert from 'node:assert/strict';
import fsPromises, { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { CodeIndex, Config, GRAMMARS_DIR, apply, workspaceFileName } from '../src/index.mjs';

const initialSource = 'export function oldName() { return oldCall(); }\n';
const changedSource = 'export function newName() { return newCall(); }\n';

async function harness(t, overrides = {}) {
  const root = await mkdtemp(join(homedir(), '.code-graph-regression-'));
  const workspace = join(root, 'ws');
  const home = join(root, 'home');
  const stateFile = join(home, 'darask', 'code-graph', workspaceFileName(workspace));
  await mkdir(workspace);
  const versions = new Map();
  const reads = new Map();
  const agent = { session: { id: 'regression', header: { cwd: workspace } } };
  const fs = {
    async resolve(path, { cwd }) {
      const absolute = resolve(cwd, path);
      return { processPath: absolute, displayPath: path };
    },
    processPath(target) { return target.processPath; },
    async stat(target) {
      try {
        const info = await stat(target.processPath);
        return { type: info.isFile() ? 'file' : 'other', size: info.size, version: versions.get(target.processPath) };
      } catch (error) {
        if (error.code === 'ENOENT') return undefined;
        throw error;
      }
    },
    async readText(target) {
      reads.set(target.processPath, (reads.get(target.processPath) ?? 0) + 1);
      const text = await readFile(target.processPath, 'utf8');
      if (text.includes('\0')) throw Object.assign(new Error('binary'), { code: 'FS_NOT_TEXT' });
      return text;
    },
  };
  const serializations = t.mock.method(CodeIndex.prototype, 'snapshot');
  const saves = t.mock.method(fsPromises, 'rename');
  syncBuiltinESMExports();
  t.after(() => { saves.mock.restore(); syncBuiltinESMExports(); });
  let current;
  let calls = 0;

  async function start(config = {}) {
    await current?.dispose();
    const listeners = new Map();
    const tools = new Map();
    const commands = new Map();
    const disposers = [];
    const warnings = [];
    apply({
      fs,
      logger: { debug() {}, warn(...args) { warnings.push(args); } },
      on(event, listener) { listeners.set(event, listener); },
      tools: { register(tool) { tools.set(tool.name, tool); return () => tools.delete(tool.name); } },
      commands: { register(command) { commands.set(command.name, command); return () => commands.delete(command.name); } },
      effect(generator) { disposers.push(...generator()); },
    }, new Config({ dshHome: home, useGit: false, ...overrides, ...config }));
    current = {
      listeners, tools, commands, warnings,
      async dispose() { for (const disposer of disposers.splice(0).reverse()) await disposer(); },
    };
  }

  async function write(path, text) {
    const absolute = join(workspace, path);
    if (text === null) await rm(absolute);
    else await writeFile(absolute, text, 'utf8');
    versions.set(absolute, (versions.get(absolute) ?? 0) + 1);
  }

  async function agentEdit(path, text) {
    const exec = { callId: `edit-${++calls}`, agent };
    const target = await fs.resolve(path, { cwd: workspace });
    await current.listeners.get('fs/write-intent')(target, exec, async () => undefined);
    if (text !== undefined) await write(path, text);
    current.listeners.get('tools/result')(exec);
  }

  t.after(async () => { await current?.dispose(); await rm(root, { recursive: true, force: true }); });
  await write('a.js', initialSource);
  await start();
  return {
    root, workspace, stateFile, start, write, agentEdit, saves,
    readCount: path => reads.get(join(workspace, path)) ?? 0,
    saveCount: () => saves.mock.callCount(),
    serializationCount: () => serializations.mock.callCount(),
    snapshot: async () => JSON.parse(await readFile(stateFile, 'utf8')),
    tool: (name, args) => current.tools.get(name).execute(args, { agent }),
    command: rawInput => current.commands.get('code-graph').handler({ rawInput, agent }),
  };
}

test('unchanged scans, no-op code edits and non-code edits do not serialize or save', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  const h = await harness(t);
  await h.tool('code_definitions', { symbol: 'oldName' });
  const original = await readFile(h.stateFile, 'utf8');
  assert.equal(h.saveCount(), 1);
  for (let i = 0; i < 3; i += 1) {
    t.mock.timers.tick(31_000);
    assert.equal((await h.tool('code_definitions', { symbol: 'oldName' })).results.length, 1);
  }
  assert.equal(h.readCount('a.js'), 1);
  await h.agentEdit('a.js');
  await h.tool('code_definitions', { symbol: 'oldName' });
  await h.agentEdit('notes.txt', 'updated notes');
  await h.tool('code_definitions', { symbol: 'oldName' });
  assert.equal(h.readCount('a.js'), 2, 'a forced no-op edit reads but does not reindex the file');
  assert.equal(h.serializationCount(), 1);
  assert.equal(h.saveCount(), 1);
  assert.equal(await readFile(h.stateFile, 'utf8'), original);
});

test('stat-version changes, changed content and scan removals persist and survive restart', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  const h = await harness(t);
  await h.tool('code_definitions', { symbol: 'oldName' });
  const original = (await h.snapshot()).files['a.js'];

  await h.agentEdit('a.js', initialSource);
  await h.tool('code_definitions', { symbol: 'oldName' });
  const touched = (await h.snapshot()).files['a.js'];
  assert.equal(touched.version, 2);
  assert.equal(touched.hash, original.hash);
  assert.equal(touched.indexedAt, original.indexedAt);
  assert.equal(h.saveCount(), 2);

  await h.start();
  assert.equal((await h.tool('code_definitions', { symbol: 'oldName' })).results.length, 1);
  assert.equal(h.readCount('a.js'), 2, 'restart reuses the persisted stat version without reading source');
  assert.equal(h.saveCount(), 2);

  await h.write('a.js', changedSource);
  t.mock.timers.tick(31_000);
  assert.equal((await h.tool('code_definitions', { symbol: 'newName' })).results.length, 1);
  assert.equal((await h.tool('code_references', { symbol: 'oldCall' })).total, 0);
  assert.equal((await h.snapshot()).files['a.js'].version, 3);
  assert.equal(h.saveCount(), 3);

  await h.write('a.js', null);
  t.mock.timers.tick(31_000);
  assert.deepEqual((await h.tool('code_definitions', { symbol: 'newName' })).results, []);
  assert.deepEqual((await h.snapshot()).files, {});
  assert.equal(h.saveCount(), 4);
  await h.start();
  assert.deepEqual((await h.tool('code_definitions', { symbol: 'newName' })).results, []);
  assert.equal(h.saveCount(), 4);
});

for (const [reason, text] of [['missing', null], ['binary', '\0'], ['too large', 'x'.repeat(101)]]) {
  test(`agent edits persist removal when source becomes ${reason}`, async t => {
    const h = await harness(t, { maxFileBytes: 100 });
    await h.tool('code_definitions', { symbol: 'oldName' });
    await h.agentEdit('a.js', text);
    assert.deepEqual((await h.tool('code_definitions', { symbol: 'oldName' })).results, []);
    assert.equal((await h.tool('code_references', { symbol: 'oldCall' })).total, 0);
    assert.deepEqual((await h.snapshot()).files, {});
    assert.equal(h.saveCount(), 2);
    await h.start();
    assert.deepEqual((await h.tool('code_definitions', { symbol: 'oldName' })).results, []);
    assert.equal(h.saveCount(), 2);
  });
}

test('failed atomic saves retain dirty state and retry on the next cached query', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  const h = await harness(t);
  await h.tool('code_definitions', { symbol: 'oldName' });
  const original = await readFile(h.stateFile, 'utf8');
  await h.write('a.js', changedSource);
  h.saves.mock.mockImplementationOnce(async () => { throw new Error('injected rename failure'); });
  const result = await h.command('reindex');
  assert.equal(result.kind, 'error');
  assert.match(result.text, /injected rename failure/u);
  assert.equal(await readFile(h.stateFile, 'utf8'), original);
  assert.equal(h.saveCount(), 2);

  assert.equal((await h.tool('code_definitions', { symbol: 'newName' })).results.length, 1);
  assert.equal(h.readCount('a.js'), 2, 'the retry does not require a rescan');
  assert.equal(h.saveCount(), 3);
  assert.equal((await h.snapshot()).files['a.js'].definitions[0].name, 'newName');
  await h.tool('code_definitions', { symbol: 'newName' });
  assert.equal(h.saveCount(), 3, 'a successful retry clears dirty state');
  await h.start();
  assert.equal((await h.tool('code_definitions', { symbol: 'newName' })).results.length, 1);
  assert.equal(h.saveCount(), 3);
});

test('tool and command outlines persist changes made between workspace scans', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  const h = await harness(t);
  await h.tool('code_definitions', { symbol: 'oldName' });
  await h.write('b.js', changedSource);
  assert.equal((await h.tool('code_outline', { path: 'b.js' })).definitions[0].name, 'newName');
  assert.equal((await h.snapshot()).files['b.js'].definitions[0].name, 'newName');
  await h.write('b.js', initialSource);
  assert.equal((await h.command('outline b.js')).kind, 'success');
  assert.equal((await h.snapshot()).files['b.js'].definitions[0].name, 'oldName');
  await h.write('a.js', null);
  await assert.rejects(h.tool('code_outline', { path: 'a.js' }), /not indexed/u);
  assert.deepEqual(Object.keys((await h.snapshot()).files), ['b.js']);
  assert.equal(h.saveCount(), 4);
});

test('restart removes obsolete symbols when changed source has no grammar, then rebuilds when available', async t => {
  const h = await harness(t);
  await h.tool('code_definitions', { symbol: 'oldName' });
  const grammarsDir = join(h.root, 'missing-grammars');
  await h.start({ grammarsDir });
  assert.equal((await h.tool('code_definitions', { symbol: 'oldName' })).results.length, 1);
  assert.equal((await h.tool('code_outline', { path: 'a.js' })).definitions[0].name, 'oldName');
  assert.equal(h.readCount('a.js'), 1, 'an unchanged persisted version remains reusable without a grammar');
  assert.equal(h.saveCount(), 1);

  await h.write('a.js', changedSource);
  await h.start({ grammarsDir });
  assert.deepEqual((await h.tool('code_definitions', { symbol: 'oldName' })).results, []);
  assert.equal((await h.tool('code_references', { symbol: 'oldCall' })).total, 0);
  assert.deepEqual((await h.snapshot()).files, {});
  assert.equal(h.saveCount(), 2);
  await assert.rejects(h.tool('code_outline', { path: 'a.js' }), /not indexed/u);
  assert.equal((await h.command('outline a.js')).kind, 'error');
  assert.equal((await h.command('reindex')).kind, 'success');
  assert.deepEqual((await h.tool('code_definitions', { symbol: 'oldName' })).results, []);
  assert.deepEqual((await h.snapshot()).files, {});
  assert.equal(h.saveCount(), 2);

  await h.start();
  assert.equal((await h.tool('code_definitions', { symbol: 'newName' })).results.length, 1);
  assert.equal((await h.tool('code_references', { symbol: 'newCall' })).total, 1);
  assert.equal((await h.tool('code_references', { symbol: 'oldCall' })).total, 0);
  assert.equal((await h.tool('code_outline', { path: 'a.js' })).definitions[0].name, 'newName');
  assert.equal((await h.snapshot()).files['a.js'].version, 2);
  assert.equal(h.saveCount(), 3);
});

test('a missing grammar can become available without caching the skipped source version', async t => {
  const h = await harness(t);
  await h.tool('code_definitions', { symbol: 'oldName' });
  await h.write('a.js', changedSource);
  const grammarsDir = join(h.root, 'missing-grammars');
  await h.start({ grammarsDir });
  assert.deepEqual((await h.tool('code_definitions', { symbol: 'oldName' })).results, []);
  await mkdir(grammarsDir);
  for (const name of ['javascript.wasm', 'javascript.tags.scm']) {
    await copyFile(join(GRAMMARS_DIR, name), join(grammarsDir, name));
  }
  assert.equal((await h.tool('code_outline', { path: 'a.js' })).definitions[0].name, 'newName');
  const reads = h.readCount('a.js');
  assert.equal((await h.tool('code_outline', { path: 'a.js' })).definitions[0].name, 'newName');
  assert.equal(h.readCount('a.js'), reads, 'successful extraction caches the source version');
  assert.equal((await h.snapshot()).files['a.js'].version, 2);
  assert.equal(h.saveCount(), 3);
});
