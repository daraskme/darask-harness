import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  WorktreeRegistry,
  defaultBranch,
  isInside,
  parseWorktreeList,
  renderList,
  samePath,
  validateBranch,
  validateName,
  validateRef,
  worktreeRoot,
} from '../src/registry.mjs';

test('validateName accepts slugs and rejects traversal, reserved, and odd names', () => {
  for (const ok of ['feature-1', 'a', 'x.y_z', '0abc', 'A'.repeat(64)]) assert.equal(validateName(ok), ok);
  for (const bad of ['', '-dash', '.hidden', '..', 'a/b', 'a\\b', 'a b', 'HEAD', 'con', 'a..b', 'x.lock', 'A'.repeat(65), 42, undefined]) {
    assert.throws(() => validateName(bad), /invalid worktree name/u, String(bad));
  }
});

test('validateBranch follows git-check-ref-format essentials', () => {
  for (const ok of ['wt/feature', 'main', 'user/topic-1', 'v1.2.3']) assert.equal(validateBranch(ok), ok);
  for (const bad of ['', '-x', '/x', 'x/', 'x.', 'a..b', 'a b', 'a~b', 'a^b', 'a:b', 'a?b', 'a*b', 'a[b', 'a\\b', 'a@{b', 'a//b', 'a/.b', 'x.lock', 'a\u0001b']) {
    assert.throws(() => validateBranch(bad), /invalid branch name/u, JSON.stringify(bad));
  }
  assert.throws(() => validateBranch('a'.repeat(201)), /at most 200/u);
});

test('validateRef rejects option-like and whitespace refs', () => {
  assert.equal(validateRef('HEAD~2'), 'HEAD~2');
  assert.equal(validateRef('origin/main'), 'origin/main');
  for (const bad of ['', '--exec=x', 'a b', 'a\nb']) assert.throws(() => validateRef(bad), /invalid base ref/u);
});

test('paths: default branch, root layout, containment, comparison', () => {
  assert.equal(defaultBranch('fix'), 'wt/fix');
  assert.equal(worktreeRoot('/repo', undefined), join('/repo', '.darask', 'worktrees'));
  assert.equal(worktreeRoot('/repo', 'trees'), resolve('/repo', 'trees'));
  assert.equal(worktreeRoot('/repo', resolve('/elsewhere')), resolve('/elsewhere'));
  assert.equal(isInside('/repo', '/repo/x/y'), true);
  assert.equal(isInside('/repo', '/repo'), true);
  assert.equal(isInside('/repo', '/repository'), false);
  assert.equal(isInside('/repo', '/other'), false);
  assert.equal(samePath('/repo/a/', '/repo/a'), true);
  assert.equal(samePath('/repo/a', '/repo/b'), false);
});

test('parseWorktreeList handles main, linked, detached, locked, and prunable entries', () => {
  const porcelain = [
    'worktree /repo',
    'HEAD 1111111111111111111111111111111111111111',
    'branch refs/heads/main',
    '',
    'worktree /repo/.darask/worktrees/a',
    'HEAD 2222222222222222222222222222222222222222',
    'branch refs/heads/wt/a',
    'locked',
    '',
    'worktree /repo/.darask/worktrees/b',
    'HEAD 3333333333333333333333333333333333333333',
    'detached',
    'prunable gitdir file points to non-existent location',
    '',
    'worktree /bare.git',
    'bare',
    '',
  ].join('\n');
  const entries = parseWorktreeList(porcelain);
  assert.equal(entries.length, 4);
  assert.deepEqual(entries[0], { path: '/repo', head: '1111111111111111111111111111111111111111', branch: 'main', bare: false, detached: false, locked: false, prunable: false });
  assert.equal(entries[1].branch, 'wt/a');
  assert.equal(entries[1].locked, true);
  assert.equal(entries[2].detached, true);
  assert.equal(entries[2].prunable, 'gitdir file points to non-existent location');
  assert.equal(entries[3].bare, true);
  assert.deepEqual(parseWorktreeList(''), []);
});

test('WorktreeRegistry persists atomically, filters by repo, and serializes transactions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-worktree-registry-'));
  try {
    const file = join(dir, 'nested', 'registry.json');
    const registry = new WorktreeRegistry(file);
    assert.deepEqual(await registry.load(), []);
    const order = [];
    await Promise.all([
      registry.transaction(async entries => { order.push('a:start'); await new Promise(r => setTimeout(r, 20)); entries.push({ name: 'a', repoRoot: '/r1', path: '/r1/.darask/worktrees/a' }); order.push('a:end'); }),
      registry.transaction(async entries => { order.push('b:start'); entries.push({ name: 'b', repoRoot: '/r2', path: '/r2/.darask/worktrees/b' }); order.push('b:end'); }),
    ]);
    assert.deepEqual(order, ['a:start', 'a:end', 'b:start', 'b:end']);
    const onDisk = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(onDisk.version, 1);
    assert.equal(onDisk.worktrees.length, 2);
    assert.deepEqual((await registry.forRepo('/r1')).map(entry => entry.name), ['a']);

    // A failing transaction does not block later ones and leaves the file consistent.
    await assert.rejects(registry.transaction(async () => { throw new Error('boom'); }), /boom/u);
    await registry.transaction(async entries => { entries.splice(0, entries.length); });
    const reloaded = new WorktreeRegistry(file);
    assert.deepEqual(await reloaded.load(), []);

    // Corrupt shapes are ignored rather than crashing.
    const garbage = new WorktreeRegistry(join(dir, 'garbage.json'));
    await garbage.transaction(async entries => { entries.push({ bogus: true }, { name: 'ok', repoRoot: '/r', path: '/r/x' }); });
    assert.deepEqual((await new WorktreeRegistry(join(dir, 'garbage.json')).load()).map(entry => entry.name), ['ok']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('renderList summarizes rows with flags', () => {
  assert.match(renderList([]), /No worktrees/u);
  const text = renderList([
    { name: 'a', branch: 'wt/a', head: 'abcdef1234567890', path: '/p/a', dirty: true, stale: true },
    { name: 'b', branch: undefined, head: undefined, path: '/p/b', missing: true },
  ]);
  assert.equal(text, 'a  wt/a  abcdef1234  /p/a  [dirty, stale]\nb  (detached)  -  /p/b  [missing]');
});
