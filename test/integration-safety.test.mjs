import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Context } from '@deepseek-ai/cordis';
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local';
import { apply as observationPolicy } from '@deepseek-ai/dsh-fs-observation-policy';
import { apply as rules, Config as RulesConfig } from '../packages/dsh-rules/src/index.mjs';
import { apply as hunks, Config as HunksConfig } from '../packages/dsh-hunk-tracker/src/index.mjs';
import { apply as graph, Config as GraphConfig } from '../packages/dsh-code-graph/src/index.mjs';
import { apply as worktrees, Config as WorktreeConfig } from '../packages/dsh-worktree/src/index.mjs';
import { WorktreeRegistry } from '../packages/dsh-worktree/src/registry.mjs';

const execute = promisify(execFile);
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'darask-integration-'));
  const bus = new Context(), disposers = [], tools = new Map(), commands = new Map();
  const fs = new LocalFileSystem(new Context(), { cwd: root, diffBasisMaxBytes: 2 * 1024 * 1024 });
  const ctx = {
    fs, on: bus.on.bind(bus), get: () => undefined,
    logger: { debug() {}, warn() {} },
    tools: { register(tool) { tools.set(tool.name, tool); return () => tools.delete(tool.name); } },
    commands: { register(command) { commands.set(command.name, command); return () => commands.delete(command.name); } },
    effect(generator) { for (const dispose of generator()) disposers.push(dispose); },
  };
  const events = [];
  const session = { id: 'integration', header: { cwd: root }, snapshotEvents: () => events,
    surface: { get nodes() { return events.map((_, index) => index); } }, eventAt: index => events[index] };
  const agent = { session, inbox: { prepend() { assert.fail('rules must enter the current pre-step decision'); } } };
  const config = { dshHome: join(root, 'home'), persist: false };
  t.after(async () => {
    for (const dispose of disposers.reverse()) await dispose();
    await rm(root, { recursive: true, force: true });
  });
  return { root, bus, ctx, fs, tools, commands, events, session, agent, config };
}

test('rules include root and nested cwd, and read discoveries enter the immediate next step exactly once', async t => {
  const f = await fixture(t);
  await mkdir(join(f.root, '.git'));
  await mkdir(join(f.root, '.grok', 'rules'), { recursive: true });
  await mkdir(join(f.root, 'nested', '.grok', 'rules'), { recursive: true });
  await writeFile(join(f.root, '.grok', 'rules', 'base.md'), 'ROOT_INSTRUCTION');
  await writeFile(join(f.root, 'nested', '.grok', 'rules', 'base.md'), 'NESTED_INSTRUCTION');
  await writeFile(join(f.root, '.grok', 'rules', 'ts.mdc'), '---\nglobs: "**/*.ts"\n---\nCONDITIONAL_INSTRUCTION');
  rules(f.ctx, new RulesConfig({ userHome: join(f.root, 'user') }));
  const enter = agent => f.bus.waterfall('agent/pre-step', { agent, messages: [], signal: new AbortController().signal }, () => ({ kind: 'enter', messages: [] }));
  const first = await enter(f.agent);
  assert.match(JSON.stringify(first.messages), /ROOT_INSTRUCTION/);
  assert.doesNotMatch(JSON.stringify(first.messages), /NESTED_INSTRUCTION|CONDITIONAL_INSTRUCTION/);
  f.events.push(...first.messages.map(message => ({ type: 'user/message', data: message })));
  f.bus.emit('tools/result', { agent: f.agent, signal: new AbortController().signal, name: 'read', arguments: { file_path: 'nested/code.ts' } }, {});
  const second = await enter(f.agent);
  assert.match(JSON.stringify(second.messages), /CONDITIONAL_INSTRUCTION/);
  assert.equal(second.messages.length, 1);
  f.bus.emit('tools/result', { agent: f.agent, signal: new AbortController().signal, name: 'read', arguments: { file_path: 'nested/code.ts' } }, {});
  assert.equal((await enter(f.agent)).messages.length, 0);
  const nested = { session: { ...f.session, id: 'nested', header: { cwd: join(f.root, 'nested') }, surface: { nodes: [] }, snapshotEvents: () => [] } };
  const nestedDecision = await enter(nested);
  assert.match(JSON.stringify(nestedDecision.messages), /ROOT_INSTRUCTION/);
  assert.match(JSON.stringify(nestedDecision.messages), /NESTED_INSTRUCTION/);
});

test('Cordis observers compose ahead of DSH policy and preserve guards, attribution and graph updates', async t => {
  const f = await fixture(t);
  observationPolicy(f.bus);
  hunks(f.ctx, new HunksConfig(f.config));
  graph(f.ctx, new GraphConfig({ ...f.config, useGit: false }));
  await writeFile(join(f.root, 'a.js'), 'export function beforeEdit() {}\n');
  await f.tools.get('code_definitions').execute({ symbol: 'beforeEdit' }, { agent: f.agent });
  const target = await f.fs.resolve('a.js');
  const observed = await f.fs.stat(target);
  const actor = { agent: f.agent, callId: 'edit-one' };
  f.bus.emit('fs/observed', target, { kind: 'present', version: observed.version }, actor);
  const guard = await f.bus.waterfall('fs/write-intent', target, actor, () => undefined);
  assert.deepEqual(guard, { kind: 'replaceIfVersion', version: observed.version });
  const editGuard = await f.bus.waterfall('fs/edit-intent', target, actor, () => undefined);
  assert.deepEqual(editGuard, { version: observed.version });
  await f.fs.writeText(target, 'export function afterEdit() {}\n', guard);
  f.bus.emit('tools/result', actor, {});
  const status = await f.tools.get('hunks_status').execute({}, { agent: f.agent });
  assert.equal(status.pendingHunks, 1);
  const definitions = await f.tools.get('code_definitions').execute({ symbol: 'afterEdit' }, { agent: f.agent });
  assert.equal(definitions.results.length, 1);
  const unseen = await f.fs.resolve('unseen.js');
  await assert.rejects(f.bus.waterfall('fs/edit-intent', unseen, actor, () => undefined), { code: 'FS_NOT_OBSERVED' });
});

test('hunk rejects preserve tracker state on failed and stale guarded writes', async t => {
  const f = await fixture(t);
  observationPolicy(f.bus);
  hunks(f.ctx, new HunksConfig({ ...f.config, trackExternal: false }));
  const target = await f.fs.resolve('a.txt');
  await f.fs.writeText(target, 'original\n');
  const actor = { agent: f.agent, callId: 'one' };
  await f.bus.waterfall('fs/write-intent', target, actor, () => undefined);
  await f.fs.writeText(target, 'agent\n');
  f.bus.emit('tools/result', actor, {});
  const status = () => f.tools.get('hunks_status').execute({}, { agent: f.agent });
  const reject = () => f.commands.get('hunks').handler({ agent: f.agent, rawInput: 'reject all --yes' });
  assert.equal((await status()).pendingHunks, 1);
  const write = f.fs.writeText.bind(f.fs);
  f.fs.writeText = async () => { throw new Error('simulated write failure'); };
  assert.equal((await reject()).kind, 'error');
  assert.equal((await status()).pendingHunks, 1);
  assert.equal(await f.fs.readText(target), 'agent\n');
  f.fs.writeText = write;
  await writeFile(join(f.root, 'a.txt'), 'external change\n');
  assert.equal((await reject()).kind, 'error');
  assert.equal((await status()).pendingHunks, 1);
  assert.equal(await f.fs.readText(target), 'external change\n');
});

test('hunk rejection refuses unguarded deletion and confined writes without losing pending review', async t => {
  const f = await fixture(t);
  observationPolicy(f.bus);
  hunks(f.ctx, new HunksConfig({ ...f.config, trackExternal: false }));
  const target = await f.fs.resolve('new.txt');
  const actor = { agent: f.agent, callId: 'create' };
  const command = rawInput => f.commands.get('hunks').handler({ rawInput, agent: f.agent });
  const status = () => f.tools.get('hunks_status').execute({}, { agent: f.agent });
  await f.bus.waterfall('fs/write-intent', target, actor, () => undefined);
  await f.fs.writeText(target, 'created\n');
  f.bus.emit('tools/result', actor, {});
  assert.equal((await status()).pendingHunks, 1);
  assert.match((await command('reject all --yes')).text, /guarded deletion/);
  assert.equal((await status()).pendingHunks, 1);
  assert.equal(await f.fs.readText(target), 'created\n');
  assert.equal((await command('accept all')).kind, 'success');
  await f.bus.waterfall('fs/write-intent', target, actor, () => undefined);
  await f.fs.writeText(target, 'changed\n');
  f.bus.emit('tools/result', actor, {});
  await status();
  f.ctx.get = name => name === 'sandboxPolicy' ? { resolve: () => ({ mode: 'read-only', workspaceRoot: f.root }) } : undefined;
  assert.match((await command('reject all --yes')).text, /confined sandbox policy/);
  assert.equal((await status()).pendingHunks, 1);
  assert.equal(await f.fs.readText(target), 'changed\n');
  f.ctx.get = () => undefined;
  assert.equal((await command('reject all --yes')).kind, 'success');
  assert.equal((await status()).pendingHunks, 0);
  assert.equal(await f.fs.readText(target), 'created\n');
});

test('worktree create/remove/GC fail closed under confined policies without filesystem effects', async t => {
  for (const mode of ['read-only', 'workspace-write']) {
    const f = await fixture(t);
    f.ctx.get = name => name === 'shell' ? { sandboxMode: mode } : name === 'sandboxPolicy'
      ? { resolve: () => ({ mode, workspaceRoot: f.root }) } : undefined;
    worktrees(f.ctx, new WorktreeConfig(f.config));
    for (const name of ['worktree_create', 'worktree_remove']) {
      await assert.rejects(f.tools.get(name).execute({ name: 'blocked' }, { agent: f.agent }), /confined sandbox policy/);
    }
    for (const rawInput of ['create blocked', 'remove blocked --force', 'gc --all']) {
      const result = await f.commands.get('worktree').handler({ rawInput, agent: f.agent });
      assert.equal(result.kind, 'error');
      assert.match(result.text, /confined sandbox policy/);
    }
    await assert.rejects(readFile(join(f.root, 'home', 'darask', 'worktrees', 'registry.json')), { code: 'ENOENT' });
  }
});

test('independent registry writers serialize across processes and readers reload fresh state', async t => {
  const f = await fixture(t);
  const file = join(f.root, 'registry.json'), reader = new WorktreeRegistry(file);
  assert.deepEqual(await reader.load(), []);
  const module = new URL('../packages/dsh-worktree/src/registry.mjs', import.meta.url).href;
  const script = `import { WorktreeRegistry } from ${JSON.stringify(module)};
    const [file, repoRoot, prefix] = process.argv.slice(1);
    const registry = new WorktreeRegistry(file);
    await registry.load();
    for (let i = 0; i < 6; i++) await registry.transaction(async entries => {
      await new Promise(resolve => setTimeout(resolve, 20));
      entries.push({ repoRoot, path: repoRoot + '/' + prefix + i, name: prefix + i });
    });`;
  await Promise.all(['a', 'b'].map(prefix => execute(process.execPath, ['--input-type=module', '-e', script, file, f.root, prefix])));
  const rows = await reader.forRepo(f.root);
  assert.equal(rows.length, 12);
  assert.equal(new Set(rows.map(row => row.name)).size, 12);
  await assert.rejects(reader.transaction(entries => { entries.length = 0; throw new Error('rollback'); }), /rollback/);
  await reader.transaction(entries => assert.equal(entries.length, 12));
});
