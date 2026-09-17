import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Config, apply, samePath } from '../src/index.mjs';

const execFileAsync = promisify(execFile);
const git = (cwd, ...args) => execFileAsync('git', args, { cwd, encoding: 'utf8', windowsHide: true }).then(result => result.stdout.trim());

async function makeRepo(dir) {
  await git(dir, 'init', '-q', '-b', 'main');
  await git(dir, 'config', 'user.email', 'test@example.com');
  await git(dir, 'config', 'user.name', 'test');
  await git(dir, 'config', 'commit.gpgsign', 'false');
  await writeFile(join(dir, 'README.md'), 'hello\n');
  await git(dir, 'add', 'README.md');
  await git(dir, 'commit', '-q', '-m', 'init');
  return git(dir, 'rev-parse', 'HEAD');
}

function fakeCtx({ sandbox } = {}) {
  const tools = new Map();
  const commands = new Map();
  const ctx = {
    logger: { debug() {}, info() {}, warn() {} },
    get(name) {
      if (name === 'shell') return sandbox ? { sandboxMode: 'workspace-write' } : undefined;
      if (name === 'sandboxPolicy') return sandbox ? { resolve: () => ({ mode: 'workspace-write', workspaceRoot: sandbox }) } : undefined;
      return undefined;
    },
    tools: { register(tool) { tools.set(tool.name, tool); return () => tools.delete(tool.name); } },
    commands: { register(command) { commands.set(command.name, command); return () => commands.delete(command.name); } },
    effect(generator) { for (const step of generator()) if (typeof step !== 'function') step; },
  };
  return { ctx, tools, commands };
}

async function harness({ config = {}, sandbox } = {}) {
  const base = await realpath(await mkdtemp(join(tmpdir(), 'dsh-worktree-')));
  const repo = join(base, 'repo');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(repo);
  const head = await makeRepo(repo);
  const h = fakeCtx({ sandbox: sandbox === true ? repo : undefined });
  apply(h.ctx, new Config({ dshHome: join(base, 'home'), ...config }));
  const agent = { session: { id: 'session/1', header: { cwd: repo } } };
  const call = (name, args = {}) => h.tools.get(name).execute(args, { agent, callId: 'c', signal: { aborted: false } });
  const command = rawInput => h.commands.get('worktree').handler({ rawInput, agent });
  return { base, repo, head, h, call, command, cleanup: () => rm(base, { recursive: true, force: true }) };
}

test('worktree_create makes a linked worktree under .darask/worktrees on a new branch and excludes the directory', async () => {
  const t = await harness();
  try {
    const created = await t.call('worktree_create', { name: 'feat' });
    assert.equal(created.name, 'feat');
    assert.equal(created.branch, 'wt/feat');
    assert.equal(created.base, 'HEAD');
    assert.equal(created.head, t.head);
    assert.equal(created.createdBranch, true);
    assert.ok(samePath(created.path, join(t.repo, '.darask', 'worktrees', 'feat')));
    assert.equal((await stat(join(created.path, 'README.md'))).isFile(), true);
    assert.equal(await git(created.path, 'rev-parse', '--abbrev-ref', 'HEAD'), 'wt/feat');
    assert.match(await readFile(join(t.repo, '.git', 'info', 'exclude'), 'utf8'), /^\/\.darask\/$/mu);
    assert.equal(await git(t.repo, 'status', '--porcelain'), '', 'main tree stays clean');

    const registry = JSON.parse(await readFile(join(t.base, 'home', 'darask', 'worktrees', 'registry.json'), 'utf8'));
    assert.equal(registry.worktrees.length, 1);
    assert.equal(registry.worktrees[0].sessionId, 'session/1');

    const listed = await t.call('worktree_list');
    assert.ok(samePath(listed.repoRoot, t.repo));
    assert.equal(listed.worktrees.length, 1);
    assert.deepEqual({ dirty: listed.worktrees[0].dirty, missing: listed.worktrees[0].missing, stale: listed.worktrees[0].stale }, { dirty: false, missing: false, stale: false });

    // Second create with the same name is refused; existing branch requires explicit branch.
    await assert.rejects(t.call('worktree_create', { name: 'feat' }), /already exists/u);
    await assert.rejects(t.call('worktree_create', { name: 'feat2', branch: 'wt/feat' }), /already exists|already checked out|is already used/u);
    await git(t.repo, 'branch', 'existing');
    const checkedOut = await t.call('worktree_create', { name: 'ex', branch: 'existing' });
    assert.equal(checkedOut.createdBranch, false);
    assert.equal(await git(checkedOut.path, 'rev-parse', '--abbrev-ref', 'HEAD'), 'existing');
  } finally {
    await t.cleanup();
  }
});

test('worktree_create validates names, branches, and bases; derives a name from the branch; resolves from inside a linked worktree', async () => {
  const t = await harness();
  try {
    await assert.rejects(t.call('worktree_create', { name: '../escape' }), /invalid worktree name/u);
    await assert.rejects(t.call('worktree_create', { name: 'x', branch: '-bad' }), /invalid branch/u);
    await assert.rejects(t.call('worktree_create', { name: 'x', base: '--output=/tmp/pwn' }), /invalid base ref/u);
    await assert.rejects(t.call('worktree_create', { name: 'x', base: 'no-such-ref' }), /git worktree failed/u);
    assert.equal((await t.call('worktree_list')).worktrees.length, 0, 'failed create leaves no registry entry');

    const derived = await t.call('worktree_create', { branch: 'topic/some-fix' });
    assert.equal(derived.name, 'topic-some-fix');

    // Calling from inside a linked worktree still targets the main repository.
    const nested = await t.h.tools.get('worktree_create').execute({ name: 'from-linked' }, { agent: { session: { id: 's2', header: { cwd: derived.path } } }, callId: 'c', signal: { aborted: false } });
    assert.ok(samePath(nested.path, join(t.repo, '.darask', 'worktrees', 'from-linked')));
    assert.equal((await t.call('worktree_list')).worktrees.length, 2);
  } finally {
    await t.cleanup();
  }
});

test('worktree_remove refuses dirty trees without force, deletes branches on request, and only touches registered worktrees', async () => {
  const t = await harness();
  try {
    const created = await t.call('worktree_create', { name: 'dirty' });
    await writeFile(join(created.path, 'scratch.txt'), 'wip\n');
    assert.equal((await t.call('worktree_list')).worktrees[0].dirty, true);
    await assert.rejects(t.call('worktree_remove', { name: 'dirty' }), /uncommitted changes/u);
    assert.equal((await stat(created.path)).isDirectory(), true);

    const removed = await t.call('worktree_remove', { name: 'dirty', force: true, delete_branch: true });
    assert.equal(removed.result, 'worktree and branch wt/dirty removed');
    await assert.rejects(stat(created.path));
    assert.equal((await git(t.repo, 'branch', '--list', 'wt/dirty')), '');
    assert.equal((await t.call('worktree_list')).worktrees.length, 0);

    await git(t.repo, 'worktree', 'add', '-q', join(t.base, 'manual'), '-b', 'manual');
    await assert.rejects(t.call('worktree_remove', { name: 'manual' }), /unknown worktree/u);
    assert.equal((await stat(join(t.base, 'manual'))).isDirectory(), true);
  } finally {
    await t.cleanup();
  }
});

test('/worktree command: list, create, remove, gc of vanished and stale entries', async () => {
  const t = await harness({ config: { staleAfterMs: 50 } });
  try {
    assert.match((await t.command('')).text, /No worktrees/u);
    const created = await t.command('create cmd wt/cmd HEAD');
    assert.equal(created.kind, 'success');
    assert.match(created.text, /created cmd at .* on wt\/cmd/u);
    await t.command('create keep');
    await writeFile(join(t.repo, '.darask', 'worktrees', 'keep', 'edit.txt'), 'x\n');
    const listed = await t.command('list');
    assert.match(listed.text, /^cmd  wt\/cmd/mu);
    assert.match(listed.text, /^keep  wt\/keep.*\[dirty/mu);

    // Vanished directory -> collected; dirty but stale -> kept; clean stale -> collected.
    await rm(join(t.repo, '.darask', 'worktrees', 'cmd'), { recursive: true, force: true });
    await new Promise(r => setTimeout(r, 80));
    const gc = await t.command('gc');
    assert.equal(gc.kind, 'success');
    assert.match(gc.text, /Removed 1 worktrees \(cmd\); kept 1 \(keep\)/u);
    assert.equal(await git(t.repo, 'worktree', 'list', '--porcelain').then(text => text.split('\n').filter(line => line.startsWith('worktree ')).length), 2);

    const forced = await t.command('remove keep --force --delete-branch');
    assert.equal(forced.kind, 'success');
    assert.match(forced.text, /branch wt\/keep removed/u);
    assert.match((await t.command('bogus')).text, /^Usage:/u);
    assert.equal((await t.command('remove nope')).kind, 'error');
  } finally {
    await t.cleanup();
  }
});

test('sandboxed sessions refuse worktree creation inside and outside the workspace without side effects', async () => {
  for (const config of [{ root: '../outside-trees' }, {}]) {
    const t = await harness({ sandbox: true, config });
    try {
      const excludePath = join(t.repo, '.git', 'info', 'exclude');
      const exclude = await readFile(excludePath, 'utf8');
      const worktrees = await git(t.repo, 'worktree', 'list', '--porcelain');
      const branches = await git(t.repo, 'for-each-ref', 'refs/heads');
      await assert.rejects(t.call('worktree_create', { name: 'blocked' }), /confined sandbox policy/u);
      assert.equal(await readFile(excludePath, 'utf8'), exclude);
      assert.equal(await git(t.repo, 'worktree', 'list', '--porcelain'), worktrees);
      assert.equal(await git(t.repo, 'for-each-ref', 'refs/heads'), branches);
      await assert.rejects(stat(join(t.repo, config.root ?? '.darask/worktrees')), { code: 'ENOENT' });
      await assert.rejects(stat(join(t.base, 'home', 'darask', 'worktrees', 'registry.json')), { code: 'ENOENT' });
    } finally {
      await t.cleanup();
    }
  }
});

test('the per-repository limit is enforced', async () => {
  const t = await harness({ config: { maxWorktrees: 1 } });
  try {
    await t.call('worktree_create', { name: 'one' });
    await assert.rejects(t.call('worktree_create', { name: 'two' }), /worktree limit \(1\)/u);
  } finally {
    await t.cleanup();
  }
});

test('remove and GC protect the invoking session worktree even when force is requested', async () => {
  const t = await harness();
  try {
    const created = await t.call('worktree_create', { name: 'active' });
    const agent = { session: { id: 'active-session', header: { cwd: created.path } } };
    await assert.rejects(t.h.tools.get('worktree_remove').execute({ name: 'active', force: true }, { agent }), /current session workspace/);
    const result = await t.h.commands.get('worktree').handler({ rawInput: 'gc --all', agent });
    assert.match(result.text, /Removed 0/);
    assert.match(result.text, /current session workspace/);
    assert.equal((await stat(join(created.path, 'README.md'))).isFile(), true);
  } finally { await t.cleanup(); }
});
