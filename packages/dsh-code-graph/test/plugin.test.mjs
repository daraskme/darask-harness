import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { Config, SymbolExtractor, apply, formatLocation, renderStatus, workspaceFileName } from '../src/index.mjs';

const hasJs = (await new SymbolExtractor().available()).includes('javascript');
const needsGrammar = hasJs ? false : 'javascript grammar not fetched (npm run build)';

class FakeFs {
  async resolve(path, opts = {}) {
    const absolute = resolve(opts.cwd ?? process.cwd(), path);
    return { targetKey: absolute.toLowerCase(), processPath: absolute, displayPath: path };
  }

  processPath(target) {
    return target.processPath;
  }

  async stat(target) {
    try {
      const info = await stat(target.processPath);
      return { version: `${info.mtimeMs}:${info.size}`, type: info.isFile() ? 'file' : 'other', size: info.size };
    } catch (error) {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async readText(target) {
    const bytes = await readFile(target.processPath);
    if (bytes.includes(0)) throw Object.assign(new Error('not text'), { code: 'FS_NOT_TEXT' });
    return bytes.toString('utf8');
  }
}

function fakeCtx(fs) {
  const listeners = new Map();
  const tools = new Map();
  const commands = new Map();
  const disposers = [];
  const warnings = [];
  const ctx = {
    fs,
    logger: { debug() {}, info() {}, warn(...args) { warnings.push(args); } },
    on(event, handler) { listeners.set(event, handler); return () => listeners.delete(event); },
    tools: { register(tool) { tools.set(tool.name, tool); return () => tools.delete(tool.name); } },
    commands: { register(definition) { commands.set(definition.name, definition); return () => commands.delete(definition.name); } },
    effect(generator) { for (const disposer of generator()) disposers.push(disposer); },
  };
  const dispose = async () => { for (const disposer of disposers.splice(0).reverse()) await disposer(); };
  return { ctx, listeners, tools, commands, warnings, dispose, [Symbol.asyncDispose]: dispose };
}

async function harness(configOverrides = {}) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-code-graph-'));
  const workspace = join(root, 'ws');
  await mkdir(join(workspace, 'src'), { recursive: true });
  await mkdir(join(workspace, 'node_modules', 'dep'), { recursive: true });
  await writeFile(join(workspace, 'src', 'a.js'), 'export function alpha() { return beta(); }\nexport class Widget { render() { alpha(); } }\n', 'utf8');
  await writeFile(join(workspace, 'src', 'b.js'), 'import { alpha } from "./a.js";\nexport function beta() { return alpha() + 1; }\n', 'utf8');
  await writeFile(join(workspace, 'node_modules', 'dep', 'index.js'), 'function alpha() {}\n', 'utf8');
  await writeFile(join(workspace, 'notes.txt'), 'alpha beta\n', 'utf8');
  await writeFile(join(workspace, 'blob.js'), 'x\0y', 'utf8');
  const fs = new FakeFs();
  const h = fakeCtx(fs);
  const session = { id: 'session/1', header: { cwd: workspace } };
  const agent = { session };
  const config = new Config({ dshHome: join(root, 'home'), useGit: false, ...configOverrides });
  apply(h.ctx, config);
  let calls = 0;

  async function agentWrite(relative, content) {
    calls += 1;
    const exec = { callId: `call-${calls}`, agent, name: 'write' };
    const target = await fs.resolve(relative, { cwd: workspace });
    await h.listeners.get('fs/write-intent')(target, exec, async () => undefined);
    if (content === null) await rm(target.processPath, { force: true });
    else await writeFile(target.processPath, content, 'utf8');
    h.listeners.get('tools/result')(exec, { kind: 'success' });
  }

  const tool = (name, args = {}) => h.tools.get(name).execute(args, { agent });
  const command = input => h.commands.get('code-graph').handler({ rawInput: input, agent });
  const cleanup = async () => { await h.dispose(); await rm(root, { recursive: true, force: true }); };
  return { h, root, workspace, fs, session, agentWrite, tool, command, cleanup, [Symbol.asyncDispose]: cleanup };
}

test('helpers: workspace file names, location formatting, status rendering', () => {
  assert.equal(workspaceFileName('C:\\Repo\\X'), workspaceFileName('c:/repo/x'));
  assert.match(workspaceFileName('/a'), /^[0-9a-f]{24}\.json$/u);
  assert.equal(formatLocation({ path: 'src/a.js', line: 3, column: 4, kind: 'method', name: 'render', container: 'Widget' }), 'src/a.js:3:5  method render (in Widget)');
  const text = renderStatus({ cwd: '/w', files: 2, definitions: 5, symbols: 4, references: 3, skipped: 1, truncated: 7, source: 'walk', lastScanAt: 0, languages: { javascript: 2 }, availableLanguages: ['javascript'] });
  assert.match(text, /Indexed: 2 files, 5 definitions \(4 names\), 3 references; 1 skipped/u);
  assert.match(text, /exceeds maxFiles; 7/u);
  assert.match(text, /last full scan never/u);
});

test('registers read-only navigation tools and the /code-graph command without touching upstream tools', async () => {
  await using t = await harness();
  assert.deepEqual([...t.h.tools.keys()].sort(), ['code_definitions', 'code_outline', 'code_references', 'code_symbols']);
  assert.deepEqual([...t.h.commands.keys()], ['code-graph']);
  assert.ok(t.h.listeners.has('fs/write-intent') && t.h.listeners.has('fs/edit-intent') && t.h.listeners.has('tools/result'));
  const usage = await t.command('bogus');
  assert.equal(usage.kind, 'error');
  assert.match(usage.text, /Usage/u);
  assert.match((await t.command('languages')).text, /javascript\s+\.js/u);
});

test('indexes the workspace lazily, skipping ignored dirs, non-code and binary files', { skip: needsGrammar }, async () => {
  await using t = await harness();
  const defs = await t.tool('code_definitions', { symbol: 'alpha' });
  assert.deepEqual(defs.results.map(d => [d.path, d.line, d.kind]), [['src/a.js', 1, 'function']]);

  const refs = await t.tool('code_references', { symbol: 'alpha', path: 'src/b.js' });
  assert.equal(refs.total, 2);
  assert.deepEqual(refs.results.map(r => r.path), ['src/b.js', 'src/a.js'], 'same-file references rank first');
  const withDefs = await t.tool('code_references', { symbol: 'alpha', include_definitions: true });
  assert.equal(withDefs.total, 3);
  assert.ok(withDefs.results.some(r => r.kind === 'definition.function'));

  const outline = await t.tool('code_outline', { path: 'src/a.js' });
  assert.deepEqual(outline.definitions.map(d => `${d.kind}:${d.name}${d.container ? `<${d.container}` : ''}`), ['function:alpha', 'class:Widget', 'method:render<Widget']);
  await assert.rejects(t.tool('code_outline', { path: 'notes.txt' }), /unsupported language/u);
  await assert.rejects(t.tool('code_outline', { path: 'blob.js' }), /not indexed/u);

  const symbols = await t.tool('code_symbols', { query: 'al' });
  assert.deepEqual(symbols.results.map(d => d.name), ['alpha']);
  await assert.rejects(t.tool('code_symbols', { query: 'a' }), /at least 2/u);
  await assert.rejects(t.tool('code_definitions', { symbol: 'alpha', kind: 'banana' }), /kind must be/u);
  await assert.rejects(t.tool('code_definitions', { symbol: 'alpha', limit: 0 }), /limit/u);

  const status = await t.command('status');
  assert.match(status.text, /Indexed: 2 files, 4 definitions/u);
  assert.match(status.text, /1 skipped/u);
  assert.match(status.text, /listed via walk/u);
  assert.deepEqual(t.h.warnings, []);
});

test('agent writes observed through fs gates re-index incrementally; reindex picks up external changes', { skip: needsGrammar }, async () => {
  await using t = await harness();
  assert.equal((await t.tool('code_definitions', { symbol: 'gamma' })).results.length, 0);
  await t.agentWrite('src/c.js', 'export function gamma() { return alpha(); }\n');
  const defs = await t.tool('code_definitions', { symbol: 'gamma' });
  assert.deepEqual(defs.results.map(d => d.path), ['src/c.js']);
  assert.equal((await t.tool('code_references', { symbol: 'alpha' })).total, 3);

  await t.agentWrite('src/c.js', null);
  assert.equal((await t.tool('code_definitions', { symbol: 'gamma' })).results.length, 0);

  await writeFile(join(t.workspace, 'src', 'd.js'), 'export function delta() {}\n', 'utf8');
  assert.equal((await t.tool('code_definitions', { symbol: 'delta' })).results.length, 0, 'external creation is not visible until the next scan');
  const reindexed = await t.command('reindex');
  assert.match(reindexed.text, /Reindexed: 1 files parsed, 2 unchanged, 0 removed, 1 skipped/u, 'unchanged content is not re-parsed even on a forced scan');
  assert.equal((await t.tool('code_definitions', { symbol: 'delta' })).results.length, 1);
  const find = await t.command('find alpha');
  assert.match(find.text, /Definitions \(1\):\nsrc\/a\.js:1:\d+  function alpha\nReferences \(2\):/u);
  assert.match((await t.command('outline src/a.js')).text, /class Widget/u);
});

test('index persists per workspace and can be disabled', { skip: needsGrammar }, async () => {
  await using t = await harness();
  await t.tool('code_definitions', { symbol: 'alpha' });
  const stateFile = join(t.root, 'home', 'darask', 'code-graph', workspaceFileName(t.workspace));
  const snapshot = JSON.parse(await readFile(stateFile, 'utf8'));
  assert.deepEqual(Object.keys(snapshot.files).sort(), ['src/a.js', 'src/b.js']);
  await t.h.dispose();

  const again = fakeCtx(t.fs);
  apply(again.ctx, new Config({ dshHome: join(t.root, 'home'), useGit: false, staleAfterMs: 60_000 }));
  const status = await again.commands.get('code-graph').handler({ rawInput: 'status', agent: { session: t.session } });
  assert.match(status.text, /Indexed: 2 files/u);
  await again.dispose();

  await using off = await harness({ persist: false });
  await off.tool('code_symbols', { query: 'alpha' });
  await assert.rejects(stat(join(off.root, 'home', 'darask', 'code-graph')), /ENOENT/u);
});
