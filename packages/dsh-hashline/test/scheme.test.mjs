import test from 'node:test';
import assert from 'node:assert/strict';

import { encodeHash, fnv1a32, lineHash } from '../src/hash.mjs';
import {
  CheckpointChain,
  ChunkFingerprint,
  ContentOnly,
  buildScheme,
  parseAnchor,
  renderAnchor,
  splitLines,
} from '../src/scheme.mjs';

const SAMPLE = [
  "import React from 'react';",
  '',
  'export function App() {',
  '  return <div>Hello</div>;',
  '}',
];

test('fnv1a32 of empty input is the offset basis', () => {
  assert.equal(fnv1a32(new Uint8Array()), 2_166_136_261);
  assert.notEqual(fnv1a32(new TextEncoder().encode('hello')), fnv1a32(new TextEncoder().encode('world')));
});

test('lineHash normalises whitespace but keeps content differences', () => {
  assert.equal(lineHash('    let x = 1;'), lineHash('\tlet x = 1;'));
  assert.equal(lineHash('let x = 1;'), lineHash('let x = 1;   '));
  assert.equal(lineHash('let  x   =  1;'), lineHash('let x = 1;'));
  assert.notEqual(lineHash('return x'), lineHash('returnx'));
});

test('encodeHash yields lowercase letters of the requested length', () => {
  for (const len of [1, 2, 3, 4]) {
    assert.match(encodeHash(0xdeadbeef, len), new RegExp(`^[a-z]{${len}}$`));
  }
  assert.throws(() => encodeHash(1, 0), RangeError);
  assert.throws(() => encodeHash(1, 5), RangeError);
});

test('splitLines keeps a trailing empty logical line and treats empty content as one line', () => {
  assert.deepEqual(splitLines('a\nb'), ['a', 'b']);
  assert.deepEqual(splitLines('a\nb\n'), ['a', 'b', '']);
  assert.deepEqual(splitLines('a\r\nb\r\n'), ['a', 'b', '']);
  assert.deepEqual(splitLines(''), ['']);
});

test('parseAnchor accepts two- and three-part anchors and rejects malformed ones', () => {
  assert.deepEqual(parseAnchor('22:abc'), { line: 22, local: 'abc', context: undefined });
  assert.deepEqual(parseAnchor('22:abc:rst'), { line: 22, local: 'abc', context: 'rst' });
  for (const input of ['1:abc', '100:xyz:def', '42:ab']) assert.equal(renderAnchor(parseAnchor(input)), input);
  for (const bad of ['', 'abc', ':abc', '22:', '0:abc', '22:ABC', '22:abc:', '22:abc:XYZ', 'abc:def', '22:abc:rst:x']) {
    assert.equal(parseAnchor(bad), undefined, bad);
  }
});

for (const scheme of [new ContentOnly(), new ChunkFingerprint(), new CheckpointChain()]) {
  test(`${scheme.name}: generated anchors validate and stale content is detected`, () => {
    const anchors = scheme.generateAnchors(SAMPLE);
    assert.equal(anchors.length, SAMPLE.length);
    anchors.forEach((anchor, index) => {
      assert.equal(anchor.line, index + 1);
      assert.equal(anchor.local.length, 3);
      assert.equal(anchor.context === undefined, !scheme.hasContext);
      assert.equal(scheme.validate(anchor, SAMPLE), 'valid');
    });

    const modified = [...SAMPLE];
    modified[3] = '  return <div>Goodbye</div>;';
    assert.equal(scheme.validate(anchors[3], modified), 'stale');
    assert.equal(scheme.validate({ line: 99, local: 'abc' }, SAMPLE), 'out-of-range');

  });
}

test('content-only anchors recover after an arbitrary shift', () => {
  const scheme = new ContentOnly();
  const anchors = scheme.generateAnchors(SAMPLE);
  assert.deepEqual(scheme.findShifted(anchors[2], ['// header', ...SAMPLE], 15), { kind: 'found', newLine: 4 });
});

test('context schemes recover when the shift preserves the surrounding block', () => {
  for (const scheme of [new ChunkFingerprint(3, 2), new CheckpointChain(3, 2)]) {
    const anchors = scheme.generateAnchors(SAMPLE);
    const shifted = ['// a', '// b', ...SAMPLE];
    assert.deepEqual(scheme.findShifted(anchors[2], shifted, 15), { kind: 'found', newLine: 5 }, scheme.name);
    assert.deepEqual(scheme.findShifted(anchors[2], ['// only one', ...SAMPLE], 15), { kind: 'not-found' }, scheme.name);
  }
});

test('chunk scheme rejects anchors without context and detects context drift', () => {
  const scheme = new ChunkFingerprint(3, 2);
  const anchors = scheme.generateAnchors(SAMPLE);
  assert.equal(scheme.validate({ line: 1, local: anchors[0].local }, SAMPLE), 'stale');
  const drift = [...SAMPLE];
  drift[1] = 'changed sibling';
  assert.equal(scheme.validate(anchors[0], drift), 'stale');
  assert.equal(scheme.validate(anchors[2], drift), 'valid');
});

test('ambiguous shifted recovery reports every candidate', () => {
  const scheme = new ContentOnly();
  const lines = ['x', 'dup', 'y', 'dup', 'z'];
  const anchor = { line: 3, local: scheme.generateAnchors(lines)[1].local };
  assert.deepEqual(scheme.findShifted(anchor, lines, 15), { kind: 'ambiguous', candidates: [2, 4] });
  assert.deepEqual(scheme.findShifted({ line: 3, local: 'zzz' }, lines, 15), { kind: 'not-found' });
});

test('buildScheme honours configuration and rejects unknown schemes', () => {
  assert.equal(buildScheme().name, 'chunk_v1');
  assert.equal(buildScheme({ scheme: 'content_only', hashLen: 2 }).hashLen, 2);
  assert.equal(buildScheme({ scheme: 'checkpoint' }).name, 'checkpoint_v1');
  assert.throws(() => buildScheme({ scheme: 'nope' }), RangeError);
  assert.throws(() => buildScheme({ hashLen: 9 }), RangeError);
});
