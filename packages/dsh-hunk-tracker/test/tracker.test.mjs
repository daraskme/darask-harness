import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HunkTracker, binary, full, missing } from '../src/tracker.mjs';

test('agent writes create attributed hunks and later writes keep hunk identity', () => {
  const tracker = new HunkTracker();
  const created = tracker.recordAgentWrite({ key: 'k1', path: 'new.txt', before: missing(), after: full('hello\n'), turn: 1 });
  assert.equal(created.hunks.length, 1);
  assert.deepEqual(created.hunks[0].source, { type: 'agentEdit', turn: 1 });
  assert.equal(created.hunks[0].oldText, null);

  tracker.recordAgentWrite({ key: 'k2', path: 'lib.js', before: full('a\nb\nc\n'), after: full('a\nB\nc\n'), turn: 1 });
  const [first] = tracker.pending({ key: 'k2' });
  tracker.recordAgentWrite({ key: 'k2', path: 'lib.js', after: full('a\nB\nc\nd\n'), turn: 2 });
  const hunks = tracker.pending({ key: 'k2' });
  assert.equal(hunks.length, 2);
  assert.equal(hunks[0].id, first.id, 'unchanged hunk keeps its id');
  assert.equal(hunks[0].source.turn, 1, 'unchanged hunk keeps its turn');
  assert.equal(hunks[1].source.turn, 2);
  const summary = tracker.summary();
  assert.equal(summary.pendingHunks, 3);
  assert.equal(summary.filesModified, 2);
  assert.deepEqual(summary.turns.map(turn => [turn.turn, turn.files, turn.pendingHunks.length]), [[1, ['lib.js', 'new.txt'], 2], [2, ['lib.js'], 1]]);
  assert.equal(summary.unattributedPending, 0);
});

test('external edits on an agent file are reported separately while agent hunks keep attribution', () => {
  const tracker = new HunkTracker();
  tracker.recordAgentWrite({ key: 'k', path: 'f', before: full('1\n2\n3\n4\n5\n'), after: full('1\nTWO\n3\n4\n5\n'), turn: 3 });
  const unchanged = tracker.recordExternalContent({ key: 'k', path: 'f', current: full('1\nTWO\n3\n4\n5\n') });
  assert.equal(unchanged.changed, false);
  tracker.recordExternalContent({ key: 'k', path: 'f', current: full('1\nTWO\n3\n4\nFIVE\n') });
  const hunks = tracker.pending();
  assert.deepEqual(hunks.map(hunk => hunk.source), [{ type: 'agentEdit', turn: 3 }, { type: 'externalEditOnAgentFile' }]);
  assert.equal(tracker.pending({ source: 'external' }).length, 1);
  assert.equal(tracker.pending({ turn: 3 }).length, 1);
  const summary = tracker.summary();
  assert.equal(summary.unattributedPending, 1);
  assert.deepEqual(tracker.files()[0], { key: 'k', path: 'f', hunkCount: 2, hasAgentChanges: true, hasExternalChanges: true, isAgentFile: true, baseline: { status: 'full', byteLength: 10 }, current: { status: 'full', byteLength: 15 } });

  tracker.recordExternalContent({ key: 'ext', path: 'g', baseline: full('x\n'), current: full('y\n') });
  assert.deepEqual(tracker.pending({ key: 'ext' })[0].source, { type: 'external' });
  assert.equal(tracker.files()[1].isAgentFile, false);
});

test('accept folds a hunk into the baseline; reject yields the reverting content', () => {
  const tracker = new HunkTracker();
  tracker.recordAgentWrite({ key: 'k', path: 'f', before: full('1\n2\n3\n4\n5\n'), after: full('1\nX\n3\n4\nY\n'), turn: 1 });
  const [a, b] = tracker.pending();
  assert.ok(tracker.accept(a.id));
  assert.equal(tracker.pending().length, 1);
  assert.equal(tracker.pending()[0].id, b.id, 'remaining hunk keeps its id after recompute');
  assert.equal(tracker.baselineText('k'), '1\nX\n3\n4\n5\n');
  assert.equal(tracker.stats.acceptedHunks, 1);
  assert.equal(tracker.stats.acceptedLinesAdded, 1);

  const revert = tracker.reject(b.id);
  assert.deepEqual(revert, { key: 'k', path: 'f', content: '1\nX\n3\n4\n5\n' });
  assert.equal(tracker.pending().length, 0);
  assert.equal(tracker.currentText('k'), '1\nX\n3\n4\n5\n');
  assert.equal(tracker.stats.rejectedHunks, 1);
  assert.equal(tracker.accept('nope'), false);
  assert.equal(tracker.reject('nope'), undefined);
});

test('created and deleted files reject to a delete or a restore', () => {
  const tracker = new HunkTracker();
  tracker.recordAgentWrite({ key: 'new', path: 'new.txt', before: missing(), after: full('x\n'), turn: 1 });
  const [created] = tracker.pending({ key: 'new' });
  assert.equal(tracker.reject(created.id).content, null);
  assert.equal(tracker.file('new').current.status, 'missing');

  tracker.recordAgentWrite({ key: 'gone', path: 'gone.txt', before: full('keep\n'), after: missing(), turn: 1 });
  const [deleted] = tracker.pending({ key: 'gone' });
  assert.equal(deleted.oldText, 'keep\n');
  assert.equal(tracker.reject(deleted.id).content, 'keep\n');

  tracker.recordAgentWrite({ key: 'bin', path: 'img.png', before: binary(10), after: binary(12), turn: 1 });
  assert.equal(tracker.pending({ key: 'bin' }).length, 0);
  assert.equal(tracker.files().find(file => file.key === 'bin').current.status, 'binary');
});

test('snapshot round-trips files, hunks and stats', () => {
  const tracker = new HunkTracker();
  tracker.recordAgentWrite({ key: 'k', path: 'f', before: full('a\n'), after: full('b\n'), turn: 2 });
  tracker.recordAgentWrite({ key: 'k2', path: 'f2', before: full('1\n2\n'), after: full('1\n3\n'), turn: 2 });
  tracker.accept(tracker.pending({ key: 'k2' })[0].id);
  const copy = HunkTracker.fromSnapshot(JSON.parse(JSON.stringify(tracker.snapshot())));
  assert.deepEqual(copy.summary(), tracker.summary());
  assert.deepEqual(copy.files(), tracker.files());
  assert.equal(copy.baselineText('k2'), '1\n3\n');
  assert.throws(() => HunkTracker.fromSnapshot({ version: 99, files: [] }), /unsupported/u);
  assert.throws(() => HunkTracker.fromSnapshot({ version: 1, files: [{ key: 1 }] }), /malformed/u);
});
