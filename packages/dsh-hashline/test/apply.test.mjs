import test from 'node:test';
import assert from 'node:assert/strict';

import { applyEdits, detectAnchorPrefix, normalizeEdits, rangeWarning } from '../src/apply.mjs';
import { ARROW, formatHashline } from '../src/format.mjs';
import { ChunkFingerprint, ContentOnly, anchorSuffix, splitLines } from '../src/scheme.mjs';

const scheme = new ChunkFingerprint();
const CONTENT = ['fn main() {', '    let x = 1;', '    let y = 2;', '    println!("{}", x + y);', '}', ''].join('\n');

function anchorAt(content, line, s = scheme) {
  const anchors = s.generateAnchors(splitLines(content));
  return `${line}:${anchorSuffix(anchors[line - 1])}`;
}

test('formatHashline renders LINE:ANCHOR→CONTENT rows for the requested window', () => {
  const full = formatHashline(CONTENT, {}, scheme);
  assert.equal(full.totalLines, 6);
  assert.equal(full.shown, 6);
  const rows = full.text.split('\n');
  assert.match(rows[0], new RegExp(`^1:[a-z]{3}:[a-z]{3}${ARROW}fn main\\(\\) \\{$`));
  const window = formatHashline(CONTENT, { offset: 2, limit: 2 }, scheme);
  assert.equal(window.shown, 2);
  assert.ok(window.text.startsWith('2:'));
  assert.equal(formatHashline(CONTENT, { offset: 1, limit: 1 }, new ContentOnly()).text.split(':').length, 2);
});

test('replace a single line and return fresh anchors', () => {
  const result = applyEdits(CONTENT, [{ op: 'replace', anchor: anchorAt(CONTENT, 2), content: '    let x = 42;' }], scheme);
  assert.equal(result.output.status, 'ok');
  assert.equal(result.output.applied, 1);
  assert.equal(splitLines(result.newContent)[1], '    let x = 42;');
  assert.equal(result.output.snippetStartLine, 1);
  assert.ok(result.output.snippet.includes(`${ARROW}    let x = 42;`));
  assert.deepEqual(result.details, [{ oldLine: 2, oldText: '    let x = 1;', newLine: 2, newText: '    let x = 42;' }]);
});

test('replace a range inclusively and delete with empty content', () => {
  const range = applyEdits(CONTENT, [{ op: 'replace', anchor: anchorAt(CONTENT, 2), endAnchor: anchorAt(CONTENT, 3), content: '    let sum = 3;' }], scheme);
  assert.deepEqual(splitLines(range.newContent), ['fn main() {', '    let sum = 3;', '    println!("{}", x + y);', '}', '']);
  const deleted = applyEdits(CONTENT, [{ op: 'replace', anchor: anchorAt(CONTENT, 3), content: '' }], scheme);
  assert.deepEqual(splitLines(deleted.newContent), ['fn main() {', '    let x = 1;', '    println!("{}", x + y);', '}', '']);
});

test('insert_after supports anchors, 0: and EOF and keeps the trailing newline', () => {
  const afterAnchor = applyEdits(CONTENT, [{ op: 'insert_after', anchor: anchorAt(CONTENT, 1), content: '    // start' }], scheme);
  assert.equal(splitLines(afterAnchor.newContent)[1], '    // start');
  const bof = applyEdits(CONTENT, [{ op: 'insert_after', anchor: '0:', content: '#![allow(unused)]' }], scheme);
  assert.equal(splitLines(bof.newContent)[0], '#![allow(unused)]');
  const eof = applyEdits(CONTENT, [{ op: 'insert_after', anchor: 'EOF', content: '// end' }], scheme);
  assert.deepEqual(splitLines(eof.newContent).slice(-2), ['// end', '']);
  const blank = applyEdits(CONTENT, [{ op: 'insert_after', anchor: anchorAt(CONTENT, 1), content: '' }], scheme);
  assert.equal(splitLines(blank.newContent)[1], '');
});

test('batch edits apply bottom-up and preserve request order at the same position', () => {
  const result = applyEdits(CONTENT, [
    { op: 'insert_after', anchor: anchorAt(CONTENT, 1), content: 'A' },
    { op: 'insert_after', anchor: anchorAt(CONTENT, 1), content: 'B' },
    { op: 'replace', anchor: anchorAt(CONTENT, 4), content: '    println!("{}", x * y);' },
  ], scheme);
  assert.equal(result.output.status, 'ok');
  assert.equal(result.output.applied, 3);
  assert.deepEqual(splitLines(result.newContent), ['fn main() {', 'A', 'B', '    let x = 1;', '    let y = 2;', '    println!("{}", x * y);', '}', '']);
});

test('stale anchors report a shifted candidate and apply nothing', () => {
  const stale = anchorAt(CONTENT, 2, new ContentOnly());
  const shifted = `// header\n${CONTENT}`;
  const result = applyEdits(shifted, [{ op: 'replace', anchor: stale, content: 'x' }], new ContentOnly());
  assert.equal(result.output.status, 'error');
  assert.equal(result.output.error, 'anchor_stale');
  assert.equal(result.output.shiftedTo, 3);
  assert.equal(result.output.shiftedAnchor, anchorAt(shifted, 3, new ContentOnly()));
  assert.ok(result.output.context.includes(ARROW));
  assert.equal(result.newContent, undefined);
});

test('ambiguous recovery and out-of-range anchors are classified', () => {
  const content = 'x\ndup\ny\ndup\nz';
  const contentOnly = new ContentOnly();
  const dup = anchorAt(content, 2, contentOnly).replace(/^2:/, '3:');
  const ambiguous = applyEdits(content, [{ op: 'replace', anchor: dup, content: '' }], contentOnly);
  assert.equal(ambiguous.output.error, 'ambiguous_anchor');
  assert.deepEqual(ambiguous.output.ambiguousCandidates, [2, 4]);
  const outOfRange = applyEdits(content, [{ op: 'replace', anchor: '99:abc', content: '' }], contentOnly);
  assert.equal(outOfRange.output.error, 'anchor_not_found');
});

test('a failing anchor in a batch rejects the whole batch with a batch hint', () => {
  const result = applyEdits(CONTENT, [
    { op: 'replace', anchor: anchorAt(CONTENT, 1), content: 'ok' },
    { op: 'replace', anchor: '2:zzz:zzz', content: 'bad' },
  ], scheme);
  assert.equal(result.output.status, 'error');
  assert.match(result.output.message, /^Edit 2\/2 \(replace\)/);
  assert.match(result.output.message, /none of the edits were applied/);
});

test('overlapping ranges and insertions inside a replaced span are rejected', () => {
  const overlap = applyEdits(CONTENT, [
    { op: 'replace', anchor: anchorAt(CONTENT, 1), endAnchor: anchorAt(CONTENT, 3), content: 'a' },
    { op: 'replace', anchor: anchorAt(CONTENT, 2), endAnchor: anchorAt(CONTENT, 4), content: 'b' },
  ], scheme);
  assert.equal(overlap.output.error, 'overlapping_edits');
  const inside = applyEdits(CONTENT, [
    { op: 'replace', anchor: anchorAt(CONTENT, 1), endAnchor: anchorAt(CONTENT, 3), content: 'a' },
    { op: 'insert_after', anchor: anchorAt(CONTENT, 1), content: 'b' },
  ], scheme);
  assert.equal(inside.output.error, 'overlapping_edits');
});

test('malformed anchors are recovered by unique suffix or rejected with a format hint', () => {
  const suffix = anchorAt(CONTENT, 3).split(':').slice(1).join(':');
  const recovered = applyEdits(CONTENT, [{ op: 'replace', anchor: suffix, content: 'recovered' }], scheme);
  assert.equal(recovered.output.status, 'ok');
  assert.equal(splitLines(recovered.newContent)[2], 'recovered');
  const arrow = applyEdits(CONTENT, [{ op: 'replace', anchor: `${anchorAt(CONTENT, 3)}${ARROW}    let y = 2;`, content: 'trimmed' }], scheme);
  assert.equal(arrow.output.status, 'ok');
  const bad = applyEdits(CONTENT, [{ op: 'replace', anchor: 'not an anchor', content: 'x' }], scheme);
  assert.equal(bad.output.error, 'invalid_input');
  assert.match(bad.output.message, /LINE:HASH1:HASH2/);
});

test('content that still carries anchor prefixes is rejected', () => {
  assert.equal(detectAnchorPrefix(`22:abc:rst${ARROW}let x = 1;`), 1);
  assert.equal(detectAnchorPrefix('abc:def->x'), 1);
  assert.equal(detectAnchorPrefix('const map = { a: 1 }; // fine'), undefined);
  const result = applyEdits(CONTENT, [{ op: 'replace', anchor: anchorAt(CONTENT, 1), content: `1:abc:rst${ARROW}fn main() {` }], scheme);
  assert.equal(result.output.error, 'invalid_input');
  assert.match(result.output.message, /anchor prefixes/);
});

test('write replaces the whole file and must be alone in the batch', () => {
  const write = applyEdits(CONTENT, [{ op: 'write', content: 'brand new\n' }], scheme);
  assert.equal(write.output.status, 'ok');
  assert.equal(write.newContent, 'brand new\n');
  const mixed = applyEdits(CONTENT, [{ op: 'write', content: 'x' }, { op: 'replace', anchor: anchorAt(CONTENT, 1), content: 'y' }], scheme);
  assert.equal(mixed.output.error, 'invalid_input');
  assert.match(mixed.output.message, /Write op must be the only operation/);
});

test('range warnings are tiered and far-apart edits render gap markers', () => {
  assert.equal(rangeWarning(0, 3), undefined);
  assert.match(rangeWarning(0, 10), /medium range/);
  assert.match(rangeWarning(0, 30), /large range/);
  const big = Array.from({ length: 200 }, (_, index) => `line ${index + 1}`).join('\n');
  const result = applyEdits(big, [
    { op: 'replace', anchor: anchorAt(big, 5), content: 'top' },
    { op: 'replace', anchor: anchorAt(big, 150), content: 'bottom' },
  ], scheme);
  assert.equal(result.output.status, 'ok');
  assert.match(result.output.snippet, /\.\.\. \d+ lines not shown \.\.\./);
  assert.ok(result.output.snippet.includes(`${ARROW}top`));
  assert.ok(result.output.snippet.includes(`${ARROW}bottom`));
});

test('normalizeEdits accepts arrays, single objects and JSON strings', () => {
  assert.equal(normalizeEdits([{ op: 'write', content: 'x' }]).length, 1);
  assert.equal(normalizeEdits({ op: 'write', content: 'x' }).length, 1);
  assert.equal(normalizeEdits('[{"op":"replace","anchor":"1:ab:cd","end_anchor":"2:ab:cd","content":"x"}]')[0].endAnchor, '2:ab:cd');
  assert.throws(() => normalizeEdits('not json'), /could not be parsed/);
  assert.throws(() => normalizeEdits(42), /must be an array/);
  assert.throws(() => normalizeEdits([]), /at least one/);
});
