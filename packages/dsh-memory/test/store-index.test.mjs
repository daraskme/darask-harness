import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { parseModelOutcome } from '../src/observation.mjs';
import { MemoryScopeStore } from '../src/store.mjs';

const now = () => 1_700_000_000_000;
const job = { sessionId: 'session', fromTurn: 2, throughTurn: 3 };
const tables = ['docs_words', 'docs_trigram'];

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'memory-index-'));
  const store = await MemoryScopeStore.open(dir, { scope: 'workspace', now });
  return {
    dir, store,
    [Symbol.asyncDispose]: async () => {
      store.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

function hits(store, table, query) {
  return store.db.prepare(`SELECT path FROM ${table} WHERE ${table} MATCH ?`).all(query).map(row => row.path);
}

function draft(statement) {
  return parseModelOutcome(JSON.stringify({ outcome: 'observations', observations: [{ type: 'project', statement }] }), { model: 'test', createdAt: now() }).observations;
}

test('FTS inserts, updates and deletes use a shared stable rowid without stale terms or duplicates', async () => {
  await using f = await fixture();
  const path = 'topics/build.md';
  f.store.indexTopicRow(path, '# Old\n\nobsoletecommand 古い手順です\n');
  const id = f.store.db.prepare('SELECT id FROM doc_ids WHERE path = ?').get(path).id;
  f.store.indexTopicRow(path, '# New\n\ncurrentcommand 新しい手順です\n');
  for (const table of tables) {
    assert.deepEqual(hits(f.store, table, 'obsoletecommand'), []);
    assert.deepEqual(hits(f.store, table, 'currentcommand'), [path]);
    assert.deepEqual(f.store.db.prepare(`SELECT rowid, path FROM ${table}`).all().map(row => ({ ...row })), [{ rowid: id, path }]);
  }
  assert.deepEqual(hits(f.store, 'docs_trigram', '古い手順'), []);
  assert.deepEqual(hits(f.store, 'docs_trigram', '新しい手順'), [path]);
  f.store.removeDoc(path);
  f.store.removeDoc(path);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM doc_ids').get().n, 0);
  for (const table of tables) assert.equal(f.store.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0);
  f.store.indexTopicRow(path, '# Again\n\nreplacementcommand');
  for (const table of tables) assert.deepEqual(hits(f.store, table, 'replacementcommand'), [path]);
});

test('fixed-size FTS updates use bounded statement counts and constrained lookups as the corpus grows', async t => {
  const counts = [];
  for (const size of [100, 5000]) {
    await using f = await fixture();
    f.store.db.exec('BEGIN');
    for (let i = 0; i < size; i++) f.store.replaceDoc(`topics/doc-${i}.md`, 'topic', 'Title', '', 'body');
    f.store.db.exec('COMMIT');
    const statements = [];
    const prepare = f.store.db.prepare.bind(f.store.db);
    const spy = t.mock.method(f.store.db, 'prepare', sql => {
      statements.push(sql);
      return prepare(sql);
    });
    for (let i = 0; i < 20; i++) {
      f.store.replaceDoc(`topics/doc-${i}.md`, 'topic', 'Changed', '', 'newbody');
      f.store.removeDoc(`topics/absent-${i}.md`);
    }
    spy.mock.restore();
    counts.push(statements.length);
    assert.ok(statements.length <= 200, `${statements.length} prepared statements`);
    const deletes = statements.filter(sql => /^DELETE FROM docs_/u.test(sql));
    assert.equal(deletes.length, 40, 'absent paths never delete from FTS');
    for (const sql of deletes) {
      assert.match(sql, /WHERE rowid = \?/u);
      assert.match(prepare(`EXPLAIN QUERY PLAN ${sql}`).all(1).map(row => row.detail).join('\n'), /INDEX \d+:=/u);
    }
    const lookup = statements.find(sql => /^SELECT id FROM doc_ids/u.test(sql));
    assert.ok(lookup);
    assert.match(prepare(`EXPLAIN QUERY PLAN ${lookup}`).all('topics/doc-0.md').map(row => row.detail).join('\n'), /SEARCH doc_ids USING COVERING INDEX/u);
    const insertStatements = [];
    const insertSpy = t.mock.method(f.store.db, 'prepare', sql => {
      insertStatements.push(sql);
      return prepare(sql);
    });
    f.store.replaceDoc('topics/brand-new.md', 'topic', 'New', '', 'newbody');
    insertSpy.mock.restore();
    assert.ok(insertStatements.every(sql => !/^DELETE FROM docs_/u.test(sql)), 'new paths skip FTS deletes');
  }
  assert.equal(counts[0], counts[1]);
});

test('failed second-index writes roll back metadata and both indexes and allow retry', async t => {
  await using f = await fixture();
  const path = 'topics/build.md';
  f.store.indexTopicRow(path, '# Old\n\noldcommand');
  const before = f.store.topics();
  const prepare = f.store.db.prepare.bind(f.store.db);
  const spy = t.mock.method(f.store.db, 'prepare', sql => {
    if (/^INSERT INTO docs_trigram/u.test(sql)) throw new Error('injected FTS failure');
    return prepare(sql);
  });
  assert.throws(() => f.store.indexTopicRow(path, '# New\n\nnewcommand'), /injected FTS failure/u);
  assert.throws(() => f.store.indexTopicRow('topics/new.md', '# New\n\nnewcommand'), /injected FTS failure/u);
  assert.deepEqual(f.store.topics(), before);
  assert.equal(prepare('SELECT COUNT(*) AS n FROM doc_ids').get().n, 1);
  for (const table of tables) {
    assert.deepEqual(hits(f.store, table, 'oldcommand'), [path]);
    assert.deepEqual(hits(f.store, table, 'newcommand'), []);
  }
  spy.mock.restore();
  f.store.indexTopicRow(path, '# New\n\nnewcommand');
  for (const table of tables) {
    assert.deepEqual(hits(f.store, table, 'oldcommand'), []);
    assert.deepEqual(hits(f.store, table, 'newcommand'), [path]);
  }
});

test('observation metadata and FTS updates roll back together on failure', async t => {
  await using f = await fixture();
  const prepare = f.store.db.prepare.bind(f.store.db);
  const spy = t.mock.method(f.store.db, 'prepare', sql => {
    if (/^INSERT INTO docs_trigram/u.test(sql)) throw new Error('injected FTS failure');
    return prepare(sql);
  });
  await assert.rejects(f.store.persistObservations(draft('Retry capture'), job), /injected FTS failure/u);
  assert.equal(f.store.pendingStats().count, 0);
  assert.equal(prepare('SELECT COUNT(*) AS n FROM doc_ids').get().n, 0);
  spy.mock.restore();
  await f.store.reconcile();
  assert.equal(f.store.pendingStats().count, 1);
  for (const table of tables) assert.equal(hits(f.store, table, 'capture').length, 1);
});

async function legacyFixture() {
  const f = await fixture();
  const archived = await f.store.persistObservations(draft('Archive this observation'), job);
  await f.store.applyDreamPlan({ operations: [{ op: 'create', path: 'topics/build.md', content: '# Build\n\nbuildcommand 日本語の手順', evidence: archived }] }, archived);
  await f.store.persistObservations(draft('Pending observation'), { ...job, throughTurn: 4 });
  f.store.setCaptureProgress(job.sessionId, 4);
  f.store.acquireLease('dream', 'owner', 60_000);
  const id = f.store.recordDream({ startedAt: now(), claimed: 1, model: 'test' });
  f.store.recordDream({ id, status: 'completed', operations: 1 });
  f.store.db.exec(`
    DROP TABLE IF EXISTS doc_ids;
    ${f.store.db.prepare('PRAGMA table_info(topics)').all().some(row => row.name === 'content_hash') ? 'ALTER TABLE topics DROP COLUMN content_hash;' : ''}
    UPDATE meta SET value = '1' WHERE key = 'schema_version';
    UPDATE docs_trigram SET rowid = rowid + 100;
  `);
  const metadata = Object.fromEntries(['observations', 'capture_progress', 'leases', 'dreams'].map(table => [table, f.store.db.prepare(`SELECT * FROM ${table}`).all()]));
  f.store.close();
  return { ...f, metadata };
}

test('v1 migration preserves capture, leases, history and observations while aligning FTS rowids on reopen', async () => {
  const f = await legacyFixture();
  const store = await MemoryScopeStore.open(f.dir, { scope: 'workspace', now });
  try {
    assert.equal(store.db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get().value, '2');
    for (const [table, rows] of Object.entries(f.metadata)) assert.deepEqual(store.db.prepare(`SELECT * FROM ${table}`).all(), rows);
    for (const table of tables) {
      assert.deepEqual(hits(store, table, 'buildcommand'), ['topics/build.md']);
      assert.equal(hits(store, table, 'Pending').length, 1);
      assert.deepEqual(hits(store, table, 'Archive'), []);
      assert.equal(store.db.prepare(`SELECT COUNT(*) AS n FROM ${table} d JOIN doc_ids i ON d.rowid = i.id AND d.path = i.path`).get().n, 2);
      assert.equal(store.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 2);
    }
    assert.deepEqual(hits(store, 'docs_trigram', '日本語'), ['topics/build.md']);
    assert.equal(store.captureProgress(job.sessionId), 4);
    assert.equal(store.acquireLease('dream', 'other', 60_000), false);
    assert.equal(store.lastDream().status, 'completed');
    store.close();
    const reopened = await MemoryScopeStore.open(f.dir, { scope: 'workspace', now });
    try {
      for (const table of tables) assert.equal(reopened.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 2);
      await reopened.clear();
      assert.equal(reopened.db.prepare('SELECT COUNT(*) AS n FROM doc_ids').get().n, 0);
    } finally {
      reopened.close();
    }
  } finally {
    if (store.db.isOpen) store.close();
    await rm(f.dir, { recursive: true, force: true });
  }
});

test('an interrupted migration rolls back schema and indexes and can be retried', async t => {
  const f = await legacyFixture();
  const exec = DatabaseSync.prototype.exec;
  const spy = t.mock.method(DatabaseSync.prototype, 'exec', function (sql) {
    const result = exec.call(this, sql);
    if (/INSERT INTO docs_trigram/u.test(sql)) throw new Error('injected migration failure');
    return result;
  });
  try {
    await assert.rejects(MemoryScopeStore.open(f.dir, { scope: 'workspace', now }), /injected migration failure/u);
    spy.mock.restore();
    const db = new DatabaseSync(join(f.dir, 'memory.sqlite'));
    try {
      assert.equal(db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get().value, '1');
      assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'doc_ids'").get().n, 0);
      assert.ok(db.prepare('PRAGMA table_info(topics)').all().every(row => row.name !== 'content_hash'));
      for (const [table, rows] of Object.entries(f.metadata)) assert.deepEqual(db.prepare(`SELECT * FROM ${table}`).all(), rows);
      for (const table of tables) assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 2);
    } finally {
      db.close();
    }
    const store = await MemoryScopeStore.open(f.dir, { scope: 'workspace', now });
    try {
      assert.equal(store.db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get().value, '2');
      assert.equal(store.search('buildcommand').length, 1);
    } finally {
      store.close();
    }
  } finally {
    spy.mock.restore();
    await rm(f.dir, { recursive: true, force: true });
  }
});
