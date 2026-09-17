import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LANGUAGES, SymbolExtractor } from '../src/index.mjs';

const extractor = new SymbolExtractor();
const available = new Set(await extractor.available());
const skip = id => (available.has(id) ? false : `grammar ${id} not fetched (npm run build)`);

const tags = extracted => ({
  defs: extracted.definitions.map(d => `${d.kind}:${d.name}@${d.line}${d.container ? `<${d.container}` : ''}`),
  refs: extracted.references.map(r => `${r.kind}:${r.name}@${r.line}`),
});

test('javascript: classes, methods, functions, calls', { skip: skip('javascript') }, async () => {
  const out = tags(await extractor.extract('javascript', 'class A {\n  m() { return f(1); }\n}\nfunction f(x) { return new A(); }\nconst g = () => f(2);\n'));
  assert.deepEqual(out.defs, ['class:A@1', 'method:m@2<A', 'function:f@4', 'function:g@5']);
  assert.deepEqual(out.refs, ['call:f@2', 'class:A@4', 'call:f@5']);
});

test('typescript / tsx: interfaces, type references and JSX', { skip: skip('typescript') || skip('tsx') }, async () => {
  const ts = tags(await extractor.extract('typescript', 'interface I { a(): void }\nclass A implements I { a() { f(); } }\nfunction f(): I { return new A(); }\n'));
  assert.deepEqual(ts.defs, ['interface:I@1', 'method:a@1<I', 'class:A@2', 'method:a@2<A', 'function:f@3']);
  assert.ok(ts.refs.includes('type:I@3'));
  assert.ok(ts.refs.includes('class:A@3'));
  const tsx = tags(await extractor.extract('tsx', 'export function View(): JSX.Element { return <div>{render()}</div>; }\n'));
  assert.deepEqual(tsx.defs, ['function:View@1']);
  assert.deepEqual(tsx.refs, ['call:render@1']);
});

test('python: constants, classes, nested methods', { skip: skip('python') }, async () => {
  const out = tags(await extractor.extract('python', 'X = 1\nclass A:\n    def m(self):\n        return f(1)\ndef f(x):\n    return A().m()\n'));
  assert.deepEqual(out.defs, ['constant:X@1', 'class:A@2', 'function:m@3<A', 'function:f@5']);
  assert.deepEqual(out.refs, ['call:f@4', 'call:A@6', 'call:m@6']);
});

test('go: types, methods, functions, type references', { skip: skip('go') }, async () => {
  const out = tags(await extractor.extract('go', 'package main\ntype T struct{}\nfunc (t T) M() { F() }\nfunc F() { var x T; x.M() }\n'));
  assert.deepEqual(out.defs, ['type:T@2', 'method:M@3', 'function:F@4']);
  assert.deepEqual(out.refs, ['type:T@2', 'type:T@3', 'call:F@3', 'type:T@4', 'call:M@4']);
});

test('rust: structs, impls, macros', { skip: skip('rust') }, async () => {
  const out = tags(await extractor.extract('rust', 'struct S;\nimpl S {\n    fn m(&self) { f(); }\n}\nfn f() { S.m(); println!("x"); }\n'));
  assert.deepEqual(out.defs, ['class:S@1', 'method:m@3', 'function:f@5']);
  assert.deepEqual(out.refs, ['implementation:S@2', 'call:f@3', 'call:m@5', 'call:println@5']);
});

test('syntax errors still yield the recoverable symbols', { skip: skip('javascript') }, async () => {
  const out = tags(await extractor.extract('javascript', 'function ok() {}\nfunction broken( {\nclass Later {}\n'));
  assert.ok(out.defs.includes('function:ok@1'));
});

test('missing grammar directory yields undefined instead of throwing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-code-graph-empty-'));
  try {
    const empty = new SymbolExtractor(dir);
    assert.deepEqual(await empty.available(), []);
    assert.equal(await empty.extract('javascript', 'let x;'), undefined);
    await assert.rejects(empty.extract('cobol', ''), /unknown language/u);
    empty.dispose();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  assert.deepEqual(Object.keys(LANGUAGES), ['javascript', 'typescript', 'tsx', 'python', 'go', 'rust']);
});

test.after(() => extractor.dispose());
