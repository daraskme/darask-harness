import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CodeIndex } from '../src/index-store.mjs';

const def = (name, line, kind = 'function') => ({ name, kind, line, column: 0, endLine: line });
const record = definitions => ({ language: 'javascript', hash: 'hash', definitions, references: [] });

test('common-prefix search traverses each candidate file once with bounded name reads', () => {
  const index = new CodeIndex();
  const count = 4096;
  let nameReads = 0;
  let fileReads = 0;
  const definitions = Array.from({ length: count }, (_, i) => ({
    ...def('', i + 1),
    get name() { nameReads += 1; return `fn_${String(i).padStart(4, '0')}`; },
  }));
  index.setFile('large.js', {
    ...record([]),
    get definitions() { fileReads += 1; return definitions; },
  });
  index.setFile('other.js', record([def('unrelated', 1)]));
  nameReads = 0;
  fileReads = 0;

  assert.deepEqual(index.search('FN_', { limit: 1 }).map(item => item.name), ['fn_0000']);
  assert.equal(fileReads, 1, 'a file containing many matching names is visited only once');
  assert.ok(nameReads <= count * 3, `${nameReads} name reads for ${count} definitions`);
});

test('search preserves score, name length, path, line, kind filtering and limits', () => {
  const index = new CodeIndex();
  index.setFile('z.js', record([def('foo', 2), def('foo', 1, 'method'), def('fooLong', 3)]));
  index.setFile('a.js', record([
    def('unfoo', 1, 'constant'), def('food', 9), def('FOO', 8, 'class'),
    def('foo', 7), def('foo', 3, 'method'), def('fooLong', 2), def('fo', 10),
  ]));
  const rows = results => results.map(item => [item.name, item.path, item.line]);
  const expected = [
    ['foo', 'a.js', 3], ['foo', 'a.js', 7], ['FOO', 'a.js', 8],
    ['foo', 'z.js', 1], ['foo', 'z.js', 2], ['food', 'a.js', 9],
    ['fooLong', 'a.js', 2], ['fooLong', 'z.js', 3], ['unfoo', 'a.js', 1],
  ];
  assert.deepEqual(rows(index.search('fOo')), expected);
  assert.deepEqual(rows(index.search('foo', { limit: 4 })), expected.slice(0, 4));
  assert.deepEqual(rows(index.search('foo', { kind: 'method', limit: 1 })), [['foo', 'a.js', 3]]);
  assert.deepEqual(rows(index.search('foo', { kind: 'constant' })), [['unfoo', 'a.js', 1]]);
  assert.deepEqual(index.search('missing'), []);

  index.setFile('a.js', record([def('replacement', 1)]));
  index.removeFile('z.js');
  assert.deepEqual(index.search('foo'), [], 'replacing/removing files invalidates search candidates');
});

test('fully tied search results retain the original name insertion order', () => {
  const index = new CodeIndex();
  index.setFile('z.js', record([def('fooB', 1), def('fooA', 1)]));
  index.setFile('a.js', record([def('fooA', 1), def('fooB', 1)]));
  assert.deepEqual(index.search('foo').map(item => `${item.name}@${item.path}`), [
    'fooB@a.js', 'fooA@a.js', 'fooB@z.js', 'fooA@z.js',
  ]);
});
