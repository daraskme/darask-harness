import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UnreadBuffer } from '../src/index.mjs';

test('default unread budget drains 131072 short lines and resets for reuse', () => {
  const unread = new UnreadBuffer(256 * 1024);
  for (let i = 0; i < 131072; i++) unread.push('x');
  assert.equal(unread.drain(), 'x\n'.repeat(131072));
  assert.equal(unread.drain(), '');
  unread.push('next');
  assert.equal(unread.drain(), 'next\n');
});

test('overflow preserves the exact tail with linear array movement', () => {
  const count = 250000, retained = 32768;
  const unread = new UnreadBuffer(retained * 7);
  let moved = 0;
  const shift = Array.prototype.shift, slice = Array.prototype.slice;
  Array.prototype.shift = function () {
    moved += Math.max(0, this.length - 1);
    return shift.call(this);
  };
  Array.prototype.slice = function (...args) {
    const result = slice.apply(this, args);
    moved += result.length;
    return result;
  };
  let output;
  try {
    for (let i = 0; i < count; i++) unread.push(String(i).padStart(6, '0'));
    output = unread.drain();
  } finally {
    Array.prototype.shift = shift;
    Array.prototype.slice = slice;
  }
  assert.ok(moved <= 2 * count, `moved ${moved} array entries for ${count} lines`);
  const expected = Array.from({ length: retained }, (_, i) => String(count - retained + i).padStart(6, '0'));
  assert.equal(output, `[${count - retained} earlier lines dropped]\n${expected.join('\n')}\n`);
  assert.equal(unread.drain(), '');
});

test('UTF-8 budgets include newlines and preserve one oversized newest line', () => {
  const unread = new UnreadBuffer(8);
  for (const line of ['a', '界', '界', '']) unread.push(line);
  assert.equal(unread.drain(), '[2 earlier lines dropped]\n界\n\n');
  unread.push('界'.repeat(10));
  assert.equal(unread.drain(), `${'界'.repeat(10)}\n`);
  unread.push('界'.repeat(10));
  unread.push('tail');
  assert.equal(unread.drain(), '[1 earlier lines dropped]\ntail\n');
  const zero = new UnreadBuffer(0);
  zero.push('old');
  zero.push('');
  assert.equal(zero.drain(), '[1 earlier lines dropped]\n\n');
});
