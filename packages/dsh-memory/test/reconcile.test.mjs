import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Config, apply } from '../src/index.mjs';
import { parseModelOutcome } from '../src/observation.mjs';
import { MemoryScopeStore, writeAtomic } from '../src/store.mjs';

const now = () => 1_700_000_000_000;

async function fixture(t) {
  const home = await mkdtemp(join(tmpdir(), 'memory-reconcile-'));
  const dir = join(home, 'darask', 'memory', 'global');
  const stores = [];
  const open = async () => {
    const store = await MemoryScopeStore.open(dir, { scope: 'global', now });
    stores.push(store);
    return store;
  };
  t.after(async () => {
    for (const store of stores) if (store.db.isOpen) store.close();
    await rm(home, { recursive: true, force: true });
  });
  const store = await open();
  const write = async (path, content) => {
    await writeAtomic(join(dir, path), content);
    store.indexTopicRow(path, content);
  };
  return { home, dir, store, open, write };
}

function assertTerms(store, oldTerm, newTerm, expectedPath) {
  for (const table of ['docs_words', 'docs_trigram']) {
    const search = term => store.db.prepare(`SELECT path FROM ${table} WHERE ${table} MATCH ?`).all(term).map(row => row.path);
    assert.deepEqual(search(oldTerm), []);
    if (newTerm) assert.deepEqual(search(newTerm), [expectedPath]);
  }
}

test('reopen repairs replaced/deleted topics before the next Dream reads them', async t => {
  const f = await fixture(t);
  const changed = 'topics/changed.md', deleted = 'topics/deleted.md';
  const oldContent = '# Old\n\nobsoletecommand 古い手順です\n';
  const newContent = '# New\n\ncurrentcommands 新しい手順だ\n';
  assert.equal(Buffer.byteLength(newContent), Buffer.byteLength(oldContent));
  await f.write(changed, oldContent);
  await f.write(deleted, '# Deleted\n\ndeletedcommand 削除された\n');
  const metadata = await stat(join(f.dir, changed));
  const drafts = parseModelOutcome('{"outcome":"observations","observations":[{"type":"user","statement":"Pending feedback"}]}', { model: 'test', createdAt: now() }).observations;
  await f.store.persistObservations(drafts, { sessionId: 's', fromTurn: 1, throughTurn: 1 });
  f.store.setCaptureProgress('s', 1);
  f.store.close();
  await writeAtomic(join(f.dir, changed), newContent);
  await utimes(join(f.dir, changed), metadata.atime, metadata.mtime);
  await rm(join(f.dir, deleted));

  const store = await f.open();
  assert.deepEqual(store.topics().map(topic => [topic.path, topic.title]), [[changed, 'New']]);
  assert.equal((await store.read(changed)).content, newContent);
  assert.equal(store.captureProgress('s'), 1);
  assertTerms(store, 'obsoletecommand', 'currentcommands', changed);
  assertTerms(store, 'deletedcommand');
  assert.equal(store.search('古い手順').length, 0);
  assert.equal(store.search('新しい手順')[0].path, changed);
  assert.equal(store.db.prepare('SELECT id FROM doc_ids WHERE path = ?').get(deleted), undefined);

  const commands = new Map(), disposers = [], calls = [];
  const ctx = {
    logger: { info() {}, warn() {}, debug() {} },
    tools: { register() {} },
    commands: { register(command) { commands.set(command.name, command); return () => {}; } },
    effect(generator) { for (const dispose of generator()) disposers.push(dispose); },
    llm: { async *stream(options) {
      calls.push(options);
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'text-delta', index: 0, text: '{"operations":[]}' };
      yield { type: 'block-end', index: 0, block: { type: 'text', text: '{"operations":[]}' } };
      yield { type: 'finish', reason: { kind: 'stop' } };
    } },
  };
  apply(ctx, new Config({ dshHome: f.home, capture: false, injectContext: false, dream: false }));
  try {
    const agent = { session: { id: 's', header: { cwd: f.home }, requestContext: () => ({ provider: 'test', model: 'test' }) } };
    const result = await commands.get('memory').handler({ rawInput: 'dream global', agent });
    assert.equal(result.kind, 'success', result.text);
    assert.match(result.text, /completed: 0 operations, 1 observations archived/u);
    assert.equal(calls.length, 1);
    assert.match(calls[0].messages[0].content[0].text, /currentcommands/u);
    assert.doesNotMatch(calls[0].messages[0].content[0].text, /obsoletecommand|deletedcommand/u);
    assert.equal(store.pendingStats().count, 0);
    assert.equal(store.lastDream().status, 'completed');
  } finally {
    for (const dispose of disposers.reverse()) await dispose();
  }
});

test('unchanged topic hashes avoid index rewrites across reopen and content changes invalidate them', async t => {
  const f = await fixture(t);
  const path = 'topics/build.md';
  await f.write(path, '# Build\n\noriginalcommand');
  const before = f.store.db.prepare('SELECT * FROM topics').all();
  f.store.close();
  const spy = t.mock.method(MemoryScopeStore.prototype, 'indexTopicRow');
  const store = await f.open();
  assert.equal(spy.mock.callCount(), 0);
  assert.deepEqual(store.db.prepare('SELECT * FROM topics').all(), before);
  await writeAtomic(join(f.dir, path), '# Build\n\nreplacementcommand');
  await store.reconcile();
  assert.equal(spy.mock.callCount(), 1);
  assertTerms(store, 'originalcommand', 'replacementcommand', path);
  await store.reconcile();
  assert.equal(spy.mock.callCount(), 1);
});

test('failed topic reconciliation leaves the old hash and indexes intact and retries the change', async t => {
  const f = await fixture(t);
  const path = 'topics/build.md';
  await f.write(path, '# Old\n\noldcommand');
  const before = f.store.db.prepare('SELECT * FROM topics').all();
  await writeAtomic(join(f.dir, path), '# New\n\nnewcommand');
  const prepare = f.store.db.prepare.bind(f.store.db);
  const spy = t.mock.method(f.store.db, 'prepare', sql => {
    if (/^INSERT INTO docs_trigram/u.test(sql)) throw new Error('injected failure');
    return prepare(sql);
  });
  await assert.rejects(f.store.reconcile(), /injected failure/u);
  assert.deepEqual(prepare('SELECT * FROM topics').all(), before);
  for (const table of ['docs_words', 'docs_trigram']) {
    assert.deepEqual(prepare(`SELECT path FROM ${table} WHERE ${table} MATCH 'oldcommand'`).all().map(row => row.path), [path]);
  }
  spy.mock.restore();
  await f.store.reconcile();
  assertTerms(f.store, 'oldcommand', 'newcommand', path);
  assert.notEqual(prepare('SELECT content_hash FROM topics').get().content_hash, before[0].content_hash);
});

test('failed topic deletion rolls back metadata and both indexes before a successful retry', async t => {
  const f = await fixture(t);
  const path = 'topics/build.md';
  await f.write(path, '# Build\n\noldcommand');
  await rm(join(f.dir, path));
  const prepare = f.store.db.prepare.bind(f.store.db);
  const spy = t.mock.method(f.store.db, 'prepare', sql => {
    if (/^DELETE FROM docs_trigram/u.test(sql)) throw new Error('injected failure');
    return prepare(sql);
  });
  await assert.rejects(f.store.reconcile(), /injected failure/u);
  assert.equal(f.store.topics().length, 1);
  for (const table of ['doc_ids', 'docs_words', 'docs_trigram']) assert.equal(prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 1);
  spy.mock.restore();
  await f.store.reconcile();
  assert.deepEqual(f.store.topics(), []);
  assertTerms(f.store, 'oldcommand');
  assert.equal(prepare('SELECT COUNT(*) AS n FROM doc_ids').get().n, 0);
});

test('a later Dream indexing failure preserves earlier successful topics and pending evidence', async t => {
  const f = await fixture(t);
  const drafts = parseModelOutcome('{"outcome":"observations","observations":[{"type":"user","statement":"Pending feedback"}]}', { model: 'test', createdAt: now() }).observations;
  const evidence = await f.store.persistObservations(drafts, { sessionId: 's', fromTurn: 1, throughTurn: 1 });
  const prepare = f.store.db.prepare.bind(f.store.db);
  let inserts = 0;
  const spy = t.mock.method(f.store.db, 'prepare', sql => {
    if (/^INSERT INTO docs_trigram/u.test(sql) && ++inserts === 2) throw new Error('injected failure');
    return prepare(sql);
  });
  await assert.rejects(f.store.applyDreamPlan({ operations: [
    { op: 'create', path: 'topics/first.md', content: '# First\n\nfirstcommand', evidence },
    { op: 'create', path: 'topics/second.md', content: '# Second\n\nsecondcommand', evidence },
  ] }, evidence), /injected failure/u);
  assert.deepEqual(f.store.topics().map(topic => topic.path), ['topics/first.md']);
  assert.equal(f.store.pendingStats().count, 1);
  assertTerms(f.store, 'secondcommand', 'firstcommand', 'topics/first.md');
  spy.mock.restore();
  f.store.close();
  const recovered = await f.open();
  assert.deepEqual(recovered.topics().map(topic => topic.path), ['topics/first.md', 'topics/second.md']);
  assert.equal(recovered.search('secondcommand')[0].path, 'topics/second.md');
  assert.equal(recovered.pendingStats().count, 1);
});
