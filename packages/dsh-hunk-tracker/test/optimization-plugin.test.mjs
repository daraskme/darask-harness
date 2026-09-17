import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { resolve } from 'node:path';

import { Config, apply, HunkTracker } from '../src/index.mjs';

function harness(t, overrides = {}) {
  const disk = new Map();
  const saved = new Map();
  const listeners = new Map();
  const tools = new Map();
  const commands = new Map();
  const disposers = [];
  const warnings = [];
  const counts = { stats: 0, reads: 0, writes: 0, snapshots: 0, renames: 0, bytes: 0 };
  let sequence = 0;
  const h = { counts, warnings, failSave: false, failSnapshotWrite: false, policy: undefined, failWrite: undefined };
  const put = (path, text) => disk.set(path, { text, version: String(++sequence) });
  const targetFor = path => ({ targetKey: path, displayPath: path });
  const ctx = {
    fs: {
      async resolve(path) { return targetFor(path); },
      async stat(target) {
        counts.stats++;
        const file = disk.get(target.targetKey);
        return file ? { type: 'file', size: Buffer.byteLength(file.text), version: file.version } : undefined;
      },
      async readText(target) { counts.reads++; return disk.get(target.targetKey).text; },
      async writeText(target, text, intent, actor, policy) {
        counts.writes++;
        if (h.failWrite) h.failWrite(target, intent);
        const file = disk.get(target.targetKey);
        assert.deepEqual(intent, file ? { kind: 'replaceIfVersion', version: file.version } : { kind: 'createIfAbsent' });
        assert.equal(policy, h.policy);
        put(target.targetKey, text);
        return { version: disk.get(target.targetKey).version };
      },
    },
    get(name) { return name === 'sandboxPolicy' && h.policy ? { resolve: () => h.policy } : undefined; },
    logger: { debug() {}, warn(...args) { warnings.push(args); } },
    on(name, listener) { listeners.set(name, listener); },
    tools: { register(tool) { tools.set(tool.name, tool); } },
    commands: { register(command) { commands.set(command.name, command); return () => {}; } },
    effect(generator) { disposers.push(...generator()); },
  };
  t.mock.method(fs, 'mkdir', async () => {});
  t.mock.method(fs, 'readFile', async path => {
    if (!saved.has(path)) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    return saved.get(path);
  });
  t.mock.method(fs, 'writeFile', async (path, text) => {
    counts.snapshots++;
    counts.bytes += Buffer.byteLength(text);
    if (h.failSnapshotWrite) throw new Error('injected snapshot write failure');
    saved.set(path, text);
  });
  t.mock.method(fs, 'rename', async (from, to) => {
    counts.renames++;
    if (h.failSave) throw new Error('injected rename failure');
    saved.set(to, saved.get(from));
    saved.delete(from);
  });
  syncBuiltinESMExports();
  const session = { id: 'optimization', header: { cwd: resolve('.') }, snapshotEvents: () => [] };
  const agent = { session };
  apply(ctx, new Config({ dshHome: resolve('hunk-regression-home'), ...overrides }));
  t.after(async () => {
    for (const dispose of disposers.reverse()) await dispose();
    t.mock.restoreAll();
    syncBuiltinESMExports();
  });
  return Object.assign(h, {
    put,
    content: path => disk.get(path)?.text,
    tool: (name, args = {}) => tools.get(name).execute(args, { agent }),
    command: rawInput => commands.get('hunks').handler({ rawInput, agent }),
    turn: turn => listeners.get('session/event')(session, { type: 'turn/start', data: { turn } }),
    async agentWrite(path, text) {
      const exec = { agent, callId: `call-${++sequence}` };
      await listeners.get('fs/write-intent')(targetFor(path), exec, async () => {});
      if (text === null) disk.delete(path);
      else put(path, text);
      listeners.get('tools/result')(exec);
    },
    resetCounts() { for (const key of Object.keys(counts)) counts[key] = 0; },
    snapshot() { return JSON.parse([...saved.entries()].find(([path]) => path.endsWith('optimization.json'))[1]); },
  });
}

test('large appends stay pending on repeated plugin queries', async t => {
  const h = harness(t);
  h.put('f', 'a\n');
  await h.agentWrite('f', `a\n${'x\n'.repeat(150_000)}`);
  assert.equal((await h.tool('hunks_status')).pendingHunks, 1);
  assert.equal((await h.tool('hunks_status')).pendingHunks, 1);
  assert.deepEqual(h.warnings, []);
});

test('external version cache advances only after successful tracking', async t => {
  const h = harness(t);
  h.put('f', 'A\nB\nC\n');
  await h.agentWrite('f', 'a\nB\nC\n');
  await h.tool('hunks_status');
  h.put('f', 'a\nB\nc\n');
  t.mock.method(HunkTracker.prototype, 'recordExternalContent', () => { throw new Error('injected tracking failure'); }, { times: 1 });
  assert.equal((await h.tool('hunks_status')).pendingHunks, 1);
  assert.equal((await h.tool('hunks_status')).pendingHunks, 2);
  assert.equal(h.warnings.length, 1);
});

test('agent version cache does not hide a failed tracked write', async t => {
  const h = harness(t);
  h.put('f', 'A\nB\nC\n');
  await h.agentWrite('f', 'a\nB\nC\n');
  await h.tool('hunks_status');
  t.mock.method(HunkTracker.prototype, 'recordAgentWrite', () => { throw new Error('injected tracking failure'); }, { times: 1 });
  await h.agentWrite('f', 'a\nB\nc\n');
  assert.equal((await h.tool('hunks_status')).pendingHunks, 2);
  assert.equal(h.warnings.length, 1);
});

test('reject all uses the original three insertion selections', async t => {
  const h = harness(t);
  h.put('f', 'A\nB\nC\n');
  await h.agentWrite('f', `${'x\n'.repeat(10)}A\nx\nB\nx\nC\n`);
  assert.equal((await h.tool('hunks_status')).pendingHunks, 3);
  h.resetCounts();
  assert.deepEqual(await h.command('reject all --yes'), { kind: 'success', text: 'Reverted 3 hunks on disk.' });
  assert.equal(h.content('f'), 'A\nB\nC\n');
  assert.equal((await h.tool('hunks_status')).pendingHunks, 0);
  assert.equal(h.counts.writes, 1);
});

test('unchanged status, diff and turn-start do not serialize or save', async t => {
  const h = harness(t);
  h.put('f', 'A\nB\nC\n');
  await h.agentWrite('f', 'a\nB\nC\n');
  await h.tool('hunks_status');
  h.resetCounts();
  const snapshots = t.mock.method(HunkTracker.prototype, 'snapshot');
  await h.tool('hunks_status');
  await h.tool('hunks_diff');
  h.turn(2);
  await h.tool('hunks_status');
  assert.deepEqual(h.counts, { stats: 4, reads: 0, writes: 0, snapshots: 0, renames: 0, bytes: 0 });
  assert.equal(snapshots.mock.callCount(), 0);
  h.put('f', 'a\nB\nc\n');
  assert.equal((await h.tool('hunks_status')).pendingHunks, 2);
  assert.equal(h.counts.snapshots, 1);
  assert.equal(h.counts.renames, 1);
  assert.equal(snapshots.mock.callCount(), 1);
  h.resetCounts();
  h.put('f', 'a\nB\nc\n');
  await h.tool('hunks_status');
  await h.tool('hunks_status');
  assert.equal(h.counts.reads, 1);
  assert.equal(h.counts.snapshots, 0);
  assert.equal(h.counts.renames, 0);
});

test('external refresh aggregates changed files into one save even when a later probe is unchanged', async t => {
  const h = harness(t);
  for (const path of ['a', 'b', 'c']) {
    h.put(path, 'A\n');
    await h.agentWrite(path, 'a\n');
  }
  await h.tool('hunks_status');
  h.resetCounts();
  h.put('a', 'changed-a\n');
  h.put('b', 'changed-b\n');
  h.put('c', 'a\n');
  await h.tool('hunks_status');
  assert.equal(h.counts.reads, 3);
  assert.equal(h.counts.snapshots, 1);
  assert.equal(h.counts.renames, 1);
  assert.deepEqual(h.snapshot().files.map(file => file.current.text), ['changed-a\n', 'changed-b\n', 'a\n']);
});

test('failed snapshot writes retry even when external tracking is disabled', async t => {
  const h = harness(t, { trackExternal: false });
  h.failSnapshotWrite = true;
  h.put('f', 'A\n');
  await h.agentWrite('f', 'a\n');
  await h.tool('hunks_status');
  assert.ok(h.counts.snapshots > 0);
  assert.equal(h.counts.renames, 0);
  h.failSnapshotWrite = false;
  await h.tool('hunks_status');
  assert.equal(h.counts.renames, 1);
  assert.equal(h.snapshot().files[0].current.text, 'a\n');
  await h.tool('hunks_status');
  assert.equal(h.counts.renames, 1);
});

test('accept and forget persist their metadata once while empty reviews stay clean', async t => {
  const h = harness(t);
  h.put('f', 'A\n');
  await h.agentWrite('f', 'a\n');
  await h.tool('hunks_status');
  h.resetCounts();
  await h.command('accept all');
  assert.equal(h.counts.snapshots, 1);
  assert.equal(h.snapshot().stats.acceptedHunks, 1);
  assert.equal(h.snapshot().files[0].baseline.text, 'a\n');
  assert.equal(h.snapshot().files[0].baselineAccepted, true);
  await h.command('accept all');
  await h.command('reject all --yes');
  assert.equal(h.counts.snapshots, 1);
  await h.command('forget f');
  assert.equal(h.counts.snapshots, 2);
  assert.deepEqual(h.snapshot().files, []);
  await h.tool('hunks_status');
  assert.equal(h.counts.snapshots, 2);
});

test('failed snapshot rename remains dirty and retries on the next unchanged query', async t => {
  const h = harness(t);
  h.failSave = true;
  h.put('f', 'A\n');
  await h.agentWrite('f', 'a\n');
  await h.tool('hunks_status');
  const attempts = h.counts.renames;
  assert.ok(attempts > 0);
  h.failSave = false;
  await h.tool('hunks_status');
  assert.equal(h.counts.renames, attempts + 1);
  assert.equal(h.snapshot().files[0].current.text, 'a\n');
  await h.tool('hunks_status');
  assert.equal(h.counts.renames, attempts + 1);
});

test('persist:false keeps all snapshot I/O inert after queries and reviews', async t => {
  const h = harness(t, { persist: false });
  h.put('f', 'A\n');
  await h.agentWrite('f', 'a\n');
  await h.tool('hunks_status');
  await h.tool('hunks_diff');
  h.turn(2);
  await h.command('accept all');
  await h.command('forget f');
  assert.equal(h.counts.snapshots, 0);
  assert.equal(h.counts.renames, 0);
  assert.equal(fs.mkdir.mock.callCount(), 0);
  assert.equal(fs.readFile.mock.callCount(), 0);
});

test('400-hunk commands review once and write once per file without cloning the session', async t => {
  const h = harness(t, { persist: false });
  const before = Array.from({ length: 400 }, (_, i) => `old-${i}\nkeep-${i}\n`).join('');
  const after = Array.from({ length: 400 }, (_, i) => `new-${i}\nkeep-${i}\n`).join('');
  for (const path of ['accept', 'reject-a', 'reject-b']) {
    h.put(path, before);
    await h.agentWrite(path, after);
  }
  assert.equal((await h.tool('hunks_status')).pendingHunks, 1200);
  const accepts = t.mock.method(HunkTracker.prototype, 'acceptMany');
  const rejects = t.mock.method(HunkTracker.prototype, 'prepareReject');
  const snapshots = t.mock.method(HunkTracker.prototype, 'snapshot');
  h.resetCounts();
  assert.match((await h.command('accept accept')).text, /Accepted 400 hunks/u);
  assert.match((await h.command('reject all --yes')).text, /Reverted 800 hunks on disk/u);
  assert.equal(accepts.mock.callCount(), 1);
  assert.equal(rejects.mock.callCount(), 2);
  assert.equal(snapshots.mock.callCount(), 0);
  assert.equal(h.counts.writes, 2);
  assert.equal(h.content('accept'), after);
  assert.equal(h.content('reject-a'), before);
  assert.equal(h.content('reject-b'), before);
  assert.equal((await h.tool('hunks_status')).pendingHunks, 0);
});

test('a guarded rejection conflict leaves its whole file and statistics uncommitted', async t => {
  const h = harness(t);
  const baseline = 'A\nB\nC\n';
  h.put('f', baseline);
  await h.agentWrite('f', `${'x\n'.repeat(10)}A\nx\nB\nx\nC\n`);
  await h.tool('hunks_status');
  const before = h.snapshot();
  h.failWrite = (target, intent) => {
    assert.equal(intent.kind, 'replaceIfVersion');
    h.put(target.targetKey, 'concurrent edit\n');
    throw Object.assign(new Error('version conflict'), { code: 'FS_VERSION_CONFLICT' });
  };
  const result = await h.command('reject all --yes');
  assert.equal(result.kind, 'error');
  assert.match(result.text, /Reverted 0 hunks before failing: version conflict/u);
  assert.deepEqual(h.snapshot(), before);
  assert.equal(h.content('f'), 'concurrent edit\n');
  h.failWrite = undefined;
  assert.match((await h.tool('hunks_diff')).diff, /concurrent edit/u);
  assert.equal(h.snapshot().stats.rejectedHunks, 0);
});

test('bulk rejection preserves completed files on later failure and retries only remaining hunks', async t => {
  const h = harness(t);
  for (const path of ['a', 'b']) {
    h.put(path, 'A\nB\nC\n');
    await h.agentWrite(path, 'a\nB\nc\n');
  }
  await h.tool('hunks_status');
  const beforeB = h.snapshot().files[1];
  h.failWrite = target => { if (target.targetKey === 'b') throw new Error('injected write failure'); };
  const result = await h.command('reject all --yes');
  assert.equal(result.kind, 'error');
  assert.match(result.text, /Reverted 2 hunks before failing: injected write failure/u);
  assert.equal(h.content('a'), 'A\nB\nC\n');
  assert.equal(h.content('b'), 'a\nB\nc\n');
  assert.deepEqual(h.snapshot().files[1], beforeB);
  assert.equal(h.snapshot().stats.rejectedHunks, 2);
  h.failWrite = undefined;
  assert.match((await h.command('reject all --yes')).text, /Reverted 2 hunks on disk/u);
  assert.equal(h.content('b'), 'A\nB\nC\n');
  assert.equal(h.snapshot().stats.rejectedHunks, 4);
});

test('bulk rejection refuses new-file deletion after committing preceding files', async t => {
  const h = harness(t);
  h.put('existing', 'A\nB\nC\n');
  await h.agentWrite('existing', 'a\nB\nc\n');
  await h.agentWrite('new', 'new content\n');
  await h.tool('hunks_status');
  const newFile = h.snapshot().files[1];
  const result = await h.command('reject all --yes');
  assert.equal(result.kind, 'error');
  assert.match(result.text, /Reverted 2 hunks before failing: DSH does not provide guarded deletion/u);
  assert.equal(h.content('existing'), 'A\nB\nC\n');
  assert.equal(h.content('new'), 'new content\n');
  assert.deepEqual(h.snapshot().files[1], newFile);
  assert.equal(h.counts.writes, 1);
});

test('confined policies refuse bulk rejection before writes or state changes', async t => {
  const h = harness(t);
  h.put('f', 'A\nB\nC\n');
  await h.agentWrite('f', 'a\nB\nc\n');
  await h.tool('hunks_status');
  const before = h.snapshot();
  for (const mode of ['read-only', 'workspace-write']) {
    h.policy = { mode };
    const result = await h.command('reject all --yes');
    assert.equal(result.kind, 'error');
    assert.match(result.text, /confined sandbox policy/u);
    assert.deepEqual(h.snapshot(), before);
    assert.equal(h.counts.writes, 0);
    assert.equal(h.content('f'), 'a\nB\nc\n');
  }
  h.policy = { mode: 'danger-full-access' };
  assert.equal((await h.command('reject all --yes')).kind, 'success');
  assert.equal(h.content('f'), 'A\nB\nC\n');
});

test('restoring an agent deletion remains guarded by createIfAbsent', async t => {
  const h = harness(t);
  h.put('f', 'keep\n');
  await h.agentWrite('f', null);
  await h.tool('hunks_status');
  assert.equal((await h.command('reject all --yes')).kind, 'success');
  assert.equal(h.content('f'), 'keep\n');
  assert.equal(h.counts.writes, 1);
});
