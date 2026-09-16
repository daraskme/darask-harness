import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { Config, apply, renderStatus, safeSessionFileName, truncateText } from '../src/index.mjs';

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

  async writeText(target, content) {
    await writeFile(target.processPath, content, 'utf8');
    return { operation: 'update', version: 'v', before: null, after: content };
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
  const root = await mkdtemp(join(tmpdir(), 'dsh-hunks-'));
  const workspace = join(root, 'ws');
  await mkdir(workspace);
  const fs = new FakeFs();
  const h = fakeCtx(fs);
  const session = { id: 'session/1', header: { cwd: workspace }, snapshotEvents: () => [{ type: 'turn/start', data: { turn: 1 } }] };
  const agent = { session };
  const config = new Config({ dshHome: join(root, 'home'), ...configOverrides });
  apply(h.ctx, config);
  let calls = 0;

  /** Simulate an upstream file tool: write-intent gate, the write itself, then tools/result. */
  async function agentWrite(relative, content) {
    calls += 1;
    const exec = { callId: `call-${calls}`, agent, name: 'write' };
    const target = await fs.resolve(relative, { cwd: workspace });
    await h.listeners.get('fs/write-intent')(target, exec, async () => undefined);
    if (content === null) await rm(target.processPath, { force: true });
    else await writeFile(target.processPath, content, 'utf8');
    h.listeners.get('tools/result')(exec, { kind: 'success' });
  }

  const turn = n => h.listeners.get('session/event')(session, { type: 'turn/start', data: { turn: n } });
  const tool = (name, args = {}) => h.tools.get(name).execute(args, { agent });
  const command = input => h.commands.get('hunks').handler({ rawInput: input, agent });
  const cleanup = async () => { await h.dispose(); await rm(root, { recursive: true, force: true }); };
  return { h, root, workspace, fs, session, agentWrite, turn, tool, command, cleanup, [Symbol.asyncDispose]: cleanup };
}

test('helpers: session file names and bounded output', () => {
  assert.equal(safeSessionFileName('a/b:c d'), 'a_b_c_d.json');
  assert.deepEqual(truncateText('abc', 10), { text: 'abc', truncated: false });
  const cut = truncateText('日本語テキスト', 7);
  assert.ok(cut.truncated);
  assert.ok(cut.text.startsWith('日本'), cut.text);
  assert.match(renderStatus({ pendingHunks: 0, filesWithPending: 0, filesModified: 0, pendingLinesAdded: 0, pendingLinesRemoved: 0, unattributedPending: 0, stats: { acceptedHunks: 0, acceptedLinesAdded: 0, acceptedLinesRemoved: 0, rejectedHunks: 0, rejectedLinesAdded: 0, rejectedLinesRemoved: 0 }, turns: [] }, []), /Pending hunks: 0/u);
});

test('agent writes observed through the fs gates are attributed to the current turn and persisted', async () => {
  await using t = await harness();
  await writeFile(join(t.workspace, 'a.txt'), '1\n2\n3\n', 'utf8');
  await t.agentWrite('a.txt', '1\nTWO\n3\n');
  await t.agentWrite('b.txt', 'new file\n');

  const status = await t.tool('hunks_status');
  assert.equal(status.pendingHunks, 2);
  assert.equal(status.filesModified, 2);
  assert.deepEqual(status.turns, [{ turn: 1, files: ['a.txt', 'b.txt'], hunks: 2, linesAdded: 2, linesRemoved: 1 }]);
  assert.deepEqual(status.files.map(file => [file.path, file.kind]), [['a.txt', 'modified'], ['b.txt', 'created']]);
  assert.match(status.text, /Turn 1: 2 hunks/u);

  const diff = await t.tool('hunks_diff', { path: 'a.txt' });
  assert.match(diff.diff, /-2\n\+TWO\n/u);
  assert.equal(diff.truncated, false);
  const agentOnly = await t.tool('hunks_diff', { agent_only: true });
  assert.match(agentOnly.diff, /--- a\/b\.txt\n\+\+\+ b\/b\.txt\n@@ -1,0 \+1 @@\n\+new file\n/u);
  await assert.rejects(t.tool('hunks_diff', { path: 'nope.txt' }), /not tracked/u);
  await assert.rejects(t.tool('hunks_diff', { context: -1 }), /context/u);

  const stateFile = join(t.root, 'home', 'darask', 'hunks', safeSessionFileName(t.session.id));
  const snapshot = JSON.parse(await readFile(stateFile, 'utf8'));
  assert.equal(snapshot.files.length, 2);
  assert.equal(snapshot.files[0].baseline.text, '1\n2\n3\n');
  assert.deepEqual(t.h.warnings, []);
});

test('external edits are detected at turn boundaries and distinguished from agent hunks', async () => {
  await using t = await harness();
  await writeFile(join(t.workspace, 'a.txt'), '1\n2\n3\n4\n5\n', 'utf8');
  await t.agentWrite('a.txt', '1\nTWO\n3\n4\n5\n');
  await new Promise(resolve => setTimeout(resolve, 20));
  await writeFile(join(t.workspace, 'a.txt'), '1\nTWO\n3\n4\nFIVE\n', 'utf8');
  await t.turn(2);
  const list = await t.command('list');
  assert.match(list.text, /\[agent turn 1\]/u);
  assert.match(list.text, /\[external \(agent file\)\]/u);
  const status = await t.tool('hunks_status');
  assert.equal(status.unattributedPending, 1);
  assert.equal(status.files[0].hasExternalChanges, true);

  await t.agentWrite('a.txt', '1\nTWO\n3\nFOUR\nFIVE\n');
  const merged = await t.tool('hunks_status');
  assert.deepEqual(merged.turns.map(turn => [turn.turn, turn.hunks]), [[1, 1], [2, 1]], 'adjacent agent edit absorbs the external hunk');
  assert.equal(merged.unattributedPending, 0);

  await writeFile(join(t.workspace, 'a.txt'), 'ZERO\n1\nTWO\n3\nFOUR\nFIVE\n', 'utf8');
  await t.turn(3);
  const after = await t.tool('hunks_status');
  assert.deepEqual(after.turns.map(turn => [turn.turn, turn.hunks]), [[1, 1], [2, 1]]);
  assert.equal(after.unattributedPending, 1);
});

test('/hunks accept folds into the baseline and reject reverts the file on disk', async () => {
  await using t = await harness();
  await writeFile(join(t.workspace, 'a.txt'), '1\n2\n3\n4\n5\n', 'utf8');
  await t.agentWrite('a.txt', '1\nX\n3\n4\nY\n');
  await t.agentWrite('new.txt', 'created\n');

  const listing = (await t.command('list')).text.split('\n');
  assert.equal(listing.length, 3);
  const firstId = listing[0].split(/\s+/u)[0];
  assert.match((await t.command(`accept ${firstId}`)).text, /Accepted 1 hunks/u);
  assert.equal((await t.tool('hunks_status')).pendingHunks, 2);

  const denied = await t.command('reject all');
  assert.equal(denied.kind, 'error');
  assert.match(denied.text, /--yes/u);
  const reverted = await t.command('reject all --yes');
  assert.equal(reverted.kind, 'success', reverted.text);
  assert.match(reverted.text, /Reverted 2 hunks/u);
  assert.equal(await readFile(join(t.workspace, 'a.txt'), 'utf8'), '1\nX\n3\n4\n5\n');
  await assert.rejects(stat(join(t.workspace, 'new.txt')), /ENOENT/u);
  const status = await t.tool('hunks_status');
  assert.equal(status.pendingHunks, 0);
  assert.match(status.text, /accepted 1 .*rejected 2/u);

  assert.match((await t.command('forget a.txt')).text, /Stopped tracking/u);
  assert.equal((await t.tool('hunks_status')).filesModified, 1);
  assert.equal((await t.command('bogus')).kind, 'error');
  assert.deepEqual(t.h.warnings, []);
});

test('binary and deleted files are tracked without text hunks', async () => {
  await using t = await harness();
  await t.agentWrite('img.bin', 'x\0y');
  await writeFile(join(t.workspace, 'gone.txt'), 'bye\n', 'utf8');
  await t.agentWrite('gone.txt', null);
  const status = await t.tool('hunks_status');
  assert.deepEqual(status.files.map(file => [file.path, file.kind, file.hunkCount]), [['img.bin', 'binary', 0], ['gone.txt', 'deleted', 1]]);
  const diff = await t.tool('hunks_diff');
  assert.match(diff.diff, /img\.bin: binary \(no text diff available\)/u);
  assert.match(diff.diff, /-bye/u);
});

test('state survives a plugin restart and persistence can be disabled', async () => {
  await using t = await harness();
  await t.agentWrite('a.txt', 'v1\n');
  await t.h.dispose();
  const again = fakeCtx(t.fs);
  apply(again.ctx, new Config({ dshHome: join(t.root, 'home') }));
  const status = await again.tools.get('hunks_status').execute({}, { agent: { session: t.session } });
  assert.equal(status.pendingHunks, 1);
  await again.dispose();

  await using off = await harness({ persist: false });
  await off.agentWrite('a.txt', 'v1\n');
  await assert.rejects(stat(join(off.root, 'home', 'darask', 'hunks')), /ENOENT/u);
});
