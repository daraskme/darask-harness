import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeHunks, MAX_DIFF_BYTES } from '../src/diff.mjs';
import { HunkTracker, full } from '../src/tracker.mjs';

const baseline = 'A\nB\nC\n';
const current = `${'x\n'.repeat(10)}A\nx\nB\nx\nC\n`;

function repeatedInsertions(options) {
  const tracker = new HunkTracker(options);
  tracker.recordAgentWrite({ key: 'k', path: 'f', before: full(baseline), after: full(`${'x\n'.repeat(10)}A\nB\nC\n`), turn: 1 });
  tracker.recordAgentWrite({ key: 'k', path: 'f', after: full(`${'x\n'.repeat(10)}A\nx\nB\nC\n`), turn: 2 });
  tracker.recordExternalContent({ key: 'k', path: 'f', current: full(current) });
  assert.equal(tracker.pending().length, 3);
  return tracker;
}

test('150,000-line appends and removals below the byte cap compute and review exactly', () => {
  const small = 'a\n';
  const large = small + 'x\n'.repeat(150_000);
  assert.ok(Buffer.byteLength(large) < MAX_DIFF_BYTES);
  for (const [before, after, added, removed] of [[small, large, 150_000, 0], [large, small, 0, 150_000]]) {
    const [hunk] = computeHunks('f', before, after, { type: 'agentEdit', turn: 1 });
    assert.deepEqual([hunk.newCount, hunk.oldCount], [added, removed]);
    const tracker = new HunkTracker();
    tracker.recordAgentWrite({ key: 'k', path: 'f', before: full(before), after: full(after), turn: 1 });
    assert.equal(tracker.reject(tracker.pending()[0].id).content, before);
    tracker.recordAgentWrite({ key: 'k', path: 'f', after: full(after), turn: 2 });
    assert.equal(tracker.accept(tracker.pending()[0].id), true);
    assert.equal(tracker.baselineText('k'), after);
    assert.equal(tracker.pending().length, 0);
  }
});

test('failed recomputation leaves current content and hunks retryable', () => {
  let fail = false;
  const tracker = new HunkTracker({ now: () => {
    if (fail) throw new Error('injected recompute failure');
    return 123;
  } });
  tracker.recordAgentWrite({ key: 'k', path: 'f', before: full(baseline), after: full('A\nb\nC\n'), turn: 1 });
  const before = structuredClone(tracker.snapshot());
  fail = true;
  assert.throws(() => tracker.recordExternalContent({ key: 'k', path: 'f', current: full(current) }), /injected/u);
  assert.deepEqual(tracker.snapshot(), before);
  fail = false;
  assert.equal(tracker.recordExternalContent({ key: 'k', path: 'f', current: full(current) }).changed, true);
  assert.equal(tracker.currentText('k'), current);
  assert.equal(tracker.pending().length, 3);
});

test('rejecting the first insertion retains both shifted duplicate IDs and sources', () => {
  const tracker = repeatedInsertions();
  const [first, ...remaining] = tracker.pending();
  assert.equal(tracker.reject(first.id).content, 'A\nx\nB\nx\nC\n');
  assert.deepEqual(tracker.pending().map(h => [h.id, h.source, h.createdAt]), remaining.map(h => [h.id, h.source, h.createdAt]));
  assert.deepEqual(tracker.pending().map(h => [h.oldStart, h.newStart]), [[2, 2], [3, 4]]);
});

test('accepting the first insertion shifts baseline positions and retains duplicate identities', () => {
  const tracker = repeatedInsertions();
  const [first, ...remaining] = tracker.pending();
  assert.equal(tracker.accept(first.id), true);
  assert.deepEqual(tracker.pending().map(h => [h.id, h.source, h.createdAt]), remaining.map(h => [h.id, h.source, h.createdAt]));
  assert.deepEqual(tracker.pending().map(h => [h.oldStart, h.newStart]), [[12, 12], [13, 14]]);
});

test('external shifts cannot claim the same old insertion twice', () => {
  const tracker = new HunkTracker();
  tracker.recordAgentWrite({ key: 'k', path: 'f', before: full(baseline), after: full('A\nx\nB\nx\nC\n'), turn: 1 });
  const originalIds = tracker.pending().map(h => h.id);
  tracker.recordExternalContent({ key: 'k', path: 'f', current: full(`z\n${'z\n'.repeat(10)}A\nx\nB\nx\nC\n`) });
  assert.deepEqual(new Set(tracker.pending().filter(h => h.newText === 'x\n').map(h => h.id)), new Set(originalIds));
});

test('400-hunk bulk reviews recompute once and preserve unselected identities', () => {
  const before = Array.from({ length: 400 }, (_, i) => `old-${i}\nkeep-${i}\n`).join('');
  const after = Array.from({ length: 400 }, (_, i) => `new-${i}\nextra-${i}\nkeep-${i}\n`).join('');
  for (const accepted of [true, false]) {
    for (const all of [true, false]) {
      let recomputes = 0;
      const tracker = new HunkTracker({ now: () => ++recomputes });
      tracker.recordAgentWrite({ key: 'k', path: 'f', before: full(before), after: full(after), turn: 1 });
      const hunks = tracker.pending();
      assert.equal(hunks.length, 400);
      const selected = hunks.filter((_, i) => all || i % 2 === 0);
      const unselected = hunks.filter(h => !selected.includes(h));
      const ids = selected.map(h => h.id);
      recomputes = 0;
      if (accepted) {
        assert.equal(tracker.acceptMany('k', ids), selected.length);
      } else {
        const original = structuredClone(tracker.snapshot());
        const proposal = tracker.prepareReject('k', ids);
        assert.equal(proposal.count, selected.length);
        assert.deepEqual(tracker.snapshot(), original, 'preparation cannot commit state or stats');
        proposal.commit();
        assert.throws(() => proposal.commit(), /state changed/u, 'a proposal cannot count twice');
      }
      assert.equal(recomputes, 1);
      assert.equal(tracker.stats[accepted ? 'acceptedHunks' : 'rejectedHunks'], selected.length);
      assert.deepEqual(tracker.pending().map(h => [h.id, h.source, h.createdAt]), unselected.map(h => [h.id, h.source, h.createdAt]));
      const expected = Array.from({ length: 400 }, (_, i) => {
        const changed = accepted ? all || i % 2 === 0 : !all && i % 2 === 1;
        return changed ? `new-${i}\nextra-${i}\nkeep-${i}\n` : `old-${i}\nkeep-${i}\n`;
      }).join('');
      assert.equal(accepted ? tracker.baselineText('k') : tracker.currentText('k'), expected);
    }
  }
});

test('failed review preparation does not commit baseline, current, identities or statistics', () => {
  let fail = false;
  const tracker = repeatedInsertions({ now: () => {
    if (fail) throw new Error('injected review failure');
    return 123;
  } });
  const before = structuredClone(tracker.snapshot());
  const ids = tracker.pending().map(h => h.id);
  fail = true;
  assert.throws(() => tracker.acceptMany('k', ids), /injected/u);
  assert.deepEqual(tracker.snapshot(), before);
  assert.throws(() => tracker.prepareReject('k', ids), /injected/u);
  assert.deepEqual(tracker.snapshot(), before);
  fail = false;
  assert.equal(tracker.acceptMany('k', ids), 3);
  assert.equal(tracker.stats.acceptedHunks, 3);
});

test('mixed bulk edits preserve CRLF and an unterminated tail byte-exactly', () => {
  for (const accepted of [true, false]) {
    const tracker = new HunkTracker();
    tracker.recordAgentWrite({ key: 'k', path: 'f', before: full('A\r\nB\r\nC\r\nD\r\nE\r\nF'), after: full('a\r\nextra\r\nB\r\nD\r\nE\r\nf'), turn: 1 });
    const [first, middle, last] = tracker.pending();
    const ids = [first.id, last.id];
    if (accepted) {
      assert.equal(tracker.acceptMany('k', ids), 2);
      assert.equal(tracker.baselineText('k'), 'a\r\nextra\r\nB\r\nC\r\nD\r\nE\r\nf');
    } else {
      const proposal = tracker.prepareReject('k', ids);
      assert.equal(proposal.content, 'A\r\nB\r\nD\r\nE\r\nF');
      proposal.commit();
    }
    assert.deepEqual(tracker.pending().map(h => [h.id, h.source]), [[middle.id, middle.source]]);
  }
});
