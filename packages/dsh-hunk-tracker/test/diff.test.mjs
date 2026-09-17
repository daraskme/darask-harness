import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeHunks, findMatchingOldHunk, formatHunk, hunksOverlap, patchLines, splitLines, unifiedPatch } from '../src/diff.mjs';

const agent = { type: 'agentEdit', turn: 1 };

test('splitLines keeps terminators and an unterminated tail', () => {
  assert.deepEqual(splitLines(''), []);
  assert.deepEqual(splitLines('a\nb\n'), ['a\n', 'b\n']);
  assert.deepEqual(splitLines('a\r\nb'), ['a\r\n', 'b']);
});

test('computeHunks yields one hunk per contiguous change run', () => {
  assert.deepEqual(computeHunks('f', 'same\n', 'same\n', agent), []);
  const [modify] = computeHunks('f', 'a\nb\nc\n', 'a\nB\nc\n', agent);
  assert.deepEqual([modify.oldStart, modify.oldCount, modify.newStart, modify.newCount, modify.oldText, modify.newText], [2, 1, 2, 1, 'b\n', 'B\n']);
  const [insert] = computeHunks('f', 'a\nb\n', 'a\nx\ny\nb\n', agent);
  assert.deepEqual([insert.oldStart, insert.oldCount, insert.newStart, insert.newCount, insert.oldText, insert.newText], [2, 0, 2, 2, null, 'x\ny\n']);
  const [remove] = computeHunks('f', 'a\nb\nc\n', 'a\nc\n', agent);
  assert.deepEqual([remove.oldStart, remove.oldCount, remove.newCount, remove.oldText, remove.newText], [2, 1, 0, 'b\n', '']);
  const many = computeHunks('f', '1\n2\n3\n4\n5\n', '1\nX\n3\n4\nY\n', agent);
  assert.equal(many.length, 2);
  assert.equal(many[1].oldStart, 5);
  assert.ok(many.every(hunk => hunk.source === agent && hunk.path === 'f'));
});

test('patchLines applies and reverts a hunk byte-exactly', () => {
  const baseline = 'a\nb\nc\n';
  const current = 'a\nB1\nB2\nc';
  const [hunk] = computeHunks('f', baseline, current, agent);
  assert.equal(patchLines(baseline, hunk.oldStart, hunk.oldCount, hunk.newText), current);
  assert.equal(patchLines(current, hunk.newStart, hunk.newCount, hunk.oldText), baseline);
  assert.equal(patchLines('a\n', 5, 3, 'z\n'), 'a\nz\n');
});

test('hunksOverlap treats touching ranges and same-position insertions as overlapping', () => {
  const at = (oldStart, oldCount) => ({ path: 'f', oldStart, oldCount, newStart: oldStart, newCount: 1, oldText: 'x', newText: 'y' });
  assert.ok(hunksOverlap(at(2, 2), at(4, 1)));
  assert.ok(!hunksOverlap(at(2, 2), at(6, 1)));
  assert.ok(hunksOverlap(at(3, 0), at(3, 0)));
  assert.ok(!hunksOverlap(at(3, 0), at(4, 0)));
  assert.ok(hunksOverlap(at(3, 0), at(1, 2)));
  assert.ok(!hunksOverlap({ ...at(1, 1), path: 'g' }, at(1, 1)));
});

test('findMatchingOldHunk prefers identical content nearest by position, then the largest overlap', () => {
  const make = (id, oldStart, oldCount, newStart, text) => ({ id, path: 'f', oldStart, oldCount, newStart, newCount: 1, oldText: 'o', newText: text });
  const olds = [make('far', 1, 1, 1, 'same'), make('near', 40, 1, 40, 'same'), make('overlap', 20, 5, 20, 'other')];
  assert.equal(findMatchingOldHunk(make('n', 38, 1, 38, 'same'), olds).id, 'near');
  assert.equal(findMatchingOldHunk(make('n', 22, 2, 22, 'different'), olds).id, 'overlap');
  assert.equal(findMatchingOldHunk(make('n', 90, 1, 90, 'different'), olds), undefined);
});

test('formatHunk and unifiedPatch render unified diffs', () => {
  const [hunk] = computeHunks('src/a.js', 'a\nb\n', 'a\nB\n', agent);
  assert.equal(formatHunk(hunk), '@@ -2 +2 @@\n-b\n+B\n');
  const patch = unifiedPatch('src/a.js', 'a\nb\nc\n', 'a\nB\nc');
  assert.match(patch, /^--- a\/src\/a\.js/u);
  assert.match(patch, /\n-b\n\+B\n/u);
  assert.equal(unifiedPatch('x', 'same', 'same'), undefined);
});
