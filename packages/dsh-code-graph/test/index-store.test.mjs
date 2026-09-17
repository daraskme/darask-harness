import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CodeIndex, assignContainers, languageForPath, toPosix } from '../src/index.mjs';

const def = (name, kind, line, extra = {}) => ({ name, kind, line, column: 0, endLine: line, ...extra });
const ref = (name, kind, line) => ({ name, kind, line, column: 4 });

function sample() {
  const index = new CodeIndex();
  index.setFile('src/a.js', { language: 'javascript', hash: 'h1', size: 10, indexedAt: 1, definitions: [def('foo', 'function', 1), def('Bar', 'class', 5)], references: [ref('baz', 'call', 2)] });
  index.setFile('src/b.js', { language: 'javascript', hash: 'h2', size: 10, indexedAt: 1, definitions: [def('baz', 'function', 1), def('foo', 'method', 3, { container: 'Widget' })], references: [ref('foo', 'call', 4), ref('Bar', 'class', 5)] });
  index.setFile('lib/c.py', { language: 'python', hash: 'h3', size: 10, indexedAt: 1, definitions: [def('foo', 'function', 7)], references: [ref('foo', 'call', 9)] });
  return index;
}

test('languageForPath maps extensions case-insensitively and ignores dotfiles', () => {
  assert.equal(languageForPath('a/b.ts'), 'typescript');
  assert.equal(languageForPath('C:\\x\\y.TSX'), 'tsx');
  assert.equal(languageForPath('m.mjs'), 'javascript');
  assert.equal(languageForPath('x.PY'), 'python');
  assert.equal(languageForPath('.bashrc'), undefined);
  assert.equal(languageForPath('README'), undefined);
  assert.equal(languageForPath('style.css'), undefined);
  assert.equal(toPosix('a\\b\\c.go'), 'a/b/c.go');
});

test('definitions are looked up by exact name, filtered by kind and ranked by proximity', () => {
  const index = sample();
  assert.deepEqual(index.definitions('foo').map(d => d.path), ['lib/c.py', 'src/a.js', 'src/b.js']);
  assert.deepEqual(index.definitions('foo', { from: 'src/b.js' }).map(d => d.path), ['src/b.js', 'src/a.js', 'lib/c.py']);
  assert.deepEqual(index.definitions('foo', { from: 'src/other.js' }).map(d => d.path), ['src/a.js', 'src/b.js', 'lib/c.py']);
  assert.deepEqual(index.definitions('foo', { kind: 'method' }).map(d => [d.path, d.container]), [['src/b.js', 'Widget']]);
  assert.deepEqual(index.definitions('nope'), []);
  assert.equal(index.definitions('foo', { limit: 1 }).length, 1);
});

test('references collect call sites, optionally with definitions, and report totals', () => {
  const index = sample();
  const plain = index.references('foo');
  assert.equal(plain.total, 2);
  assert.deepEqual(plain.results.map(r => [r.path, r.line, r.kind]), [['lib/c.py', 9, 'call'], ['src/b.js', 4, 'call']]);
  const withDefs = index.references('foo', { includeDefinitions: true, from: 'src/a.js' });
  assert.equal(withDefs.total, 5);
  assert.equal(withDefs.results[0].path, 'src/a.js');
  assert.ok(withDefs.results.some(r => r.kind === 'definition.method'));
  const limited = index.references('foo', { limit: 1 });
  assert.equal(limited.total, 2);
  assert.equal(limited.results.length, 1);
});

test('search ranks exact, prefix, then substring matches', () => {
  const index = sample();
  index.setFile('src/d.js', { language: 'javascript', hash: 'h4', size: 1, indexedAt: 1, definitions: [def('fooBar', 'function', 1), def('unfoo', 'constant', 2), def('FOO', 'class', 3)], references: [] });
  const names = index.search('foo').map(d => `${d.name}@${d.path}`);
  assert.deepEqual(names.slice(0, 4).map(n => n.split('@')[0]).sort(), ['FOO', 'foo', 'foo', 'foo']);
  assert.equal(names.at(-1), 'unfoo@src/d.js');
  assert.deepEqual(index.search('foo', { kind: 'constant' }).map(d => d.name), ['unfoo']);
  assert.deepEqual(index.search('zzz'), []);
});

test('removing or replacing a file drops stale entries and stats reflect the index', () => {
  const index = sample();
  assert.deepEqual(index.stats(), { files: 3, definitions: 5, references: 4, symbols: 3, languages: { javascript: 2, python: 1 } });
  index.setFile('src/a.js', { language: 'javascript', hash: 'h9', size: 1, indexedAt: 2, definitions: [def('Bar', 'class', 1)], references: [] });
  assert.deepEqual(index.definitions('foo').map(d => d.path), ['lib/c.py', 'src/b.js']);
  assert.equal(index.references('baz').total, 0);
  assert.equal(index.removeFile('lib/c.py'), true);
  assert.equal(index.removeFile('lib/c.py'), false);
  assert.deepEqual(index.outline('src/b.js').map(d => d.name), ['baz', 'foo']);
  assert.equal(index.outline('missing.js'), undefined);
  assert.equal(index.stats().symbols, 3);
});

test('snapshots round-trip and reject foreign versions', () => {
  const index = sample();
  const restored = CodeIndex.fromSnapshot(JSON.parse(JSON.stringify(index.snapshot())));
  assert.deepEqual(restored.stats(), index.stats());
  assert.deepEqual(restored.definitions('Bar'), index.definitions('Bar'));
  assert.equal(CodeIndex.fromSnapshot({ version: 99, files: {} }).size, 0);
  assert.equal(CodeIndex.fromSnapshot(undefined).size, 0);
  assert.equal(CodeIndex.fromSnapshot({ version: 1, files: { 'x.js': { definitions: 'bad' } } }).size, 0);
});

test('assignContainers nests definitions by byte range', () => {
  const defs = [
    { name: 'inner', kind: 'method', startIndex: 20, endIndex: 30 },
    { name: 'Outer', kind: 'class', startIndex: 0, endIndex: 50 },
    { name: 'free', kind: 'function', startIndex: 60, endIndex: 70 },
    { name: 'deep', kind: 'function', startIndex: 22, endIndex: 28 },
  ];
  assert.deepEqual(assignContainers(defs).map(d => [d.name, d.container]), [['Outer', undefined], ['inner', 'Outer'], ['deep', 'inner'], ['free', undefined]]);
});
