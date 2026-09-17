// One memory scope on disk: markdown files (topics/, observations/_inbox/,
// archive/, MEMORY.md) plus `memory.sqlite` holding metadata, capture
// progress, leases and the FTS5 search index. Files are the source of truth;
// the database is rebuilt from the inbox on open when it falls behind.

import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { DEFAULT_MANIFEST_BUDGET, renderScopeManifest } from './manifest.mjs';
import { observationFileName, parseObservationFile, renderObservation } from './observation.mjs';
import {
  MANIFEST_FILE,
  MemoryPathError,
  SCOPE_DIRS,
  STATE_FILE,
  isInboxPath,
  isTopicPath,
  resolveContained,
  validateRelativePath,
} from './paths.mjs';
import { scrubBlock, scrubInline, truncateUtf8, utf8Length } from './text.mjs';

export const MAX_TOPIC_CONTENT_BYTES = 32 * 1024;
export const MAX_READ_BYTES = 64 * 1024;
export const DEFAULT_SEARCH_LIMIT = 8;
export const MAX_SEARCH_LIMIT = 25;
const SCHEMA_VERSION = 2;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS observations (
  path TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  topic_hint TEXT,
  statement TEXT NOT NULL,
  keywords TEXT NOT NULL,
  aliases TEXT NOT NULL,
  session_id TEXT NOT NULL,
  from_turn INTEGER NOT NULL,
  through_turn INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  archived_at INTEGER
);
CREATE INDEX IF NOT EXISTS observations_status ON observations (status, created_at);
CREATE TABLE IF NOT EXISTS topics (
  path TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  updated_at INTEGER NOT NULL,
  content_hash TEXT
);
CREATE TABLE IF NOT EXISTS capture_progress (
  session_id TEXT PRIMARY KEY,
  through_turn INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS leases (name TEXT PRIMARY KEY, owner TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dreams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  model TEXT,
  claimed INTEGER NOT NULL,
  operations INTEGER,
  status TEXT NOT NULL,
  error TEXT
);
CREATE VIRTUAL TABLE IF NOT EXISTS docs_words USING fts5(path UNINDEXED, kind UNINDEXED, title, terms, body, tokenize = 'unicode61 remove_diacritics 2');
CREATE VIRTUAL TABLE IF NOT EXISTS docs_trigram USING fts5(path UNINDEXED, kind UNINDEXED, title, terms, body, tokenize = 'trigram');
CREATE TABLE IF NOT EXISTS doc_ids (id INTEGER PRIMARY KEY, path TEXT NOT NULL UNIQUE);
`;

function initializeSchema(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(SCHEMA);
    const version = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get()?.value;
    if (version === '1') {
      db.exec(`
        ALTER TABLE topics ADD COLUMN content_hash TEXT;
        INSERT INTO doc_ids (id, path) SELECT MAX(rowid), path FROM docs_words GROUP BY path;
        CREATE TEMP TABLE migrating_docs AS
          SELECT d.rowid AS id, d.path, d.kind, d.title, d.terms, d.body
          FROM doc_ids i JOIN docs_words d ON d.rowid = i.id;
        DELETE FROM docs_words;
        DELETE FROM docs_trigram;
        INSERT INTO docs_words (rowid, path, kind, title, terms, body)
          SELECT id, path, kind, title, terms, body FROM migrating_docs;
        INSERT INTO docs_trigram (rowid, path, kind, title, terms, body)
          SELECT id, path, kind, title, terms, body FROM migrating_docs;
        DROP TABLE migrating_docs;
      `);
    } else if (version !== undefined && version !== String(SCHEMA_VERSION)) {
      throw new Error(`unsupported memory schema version: ${version}`);
    }
    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('schema_version', String(SCHEMA_VERSION));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

let sqliteModule;
async function loadSqlite() {
  sqliteModule ??= await import('node:sqlite');
  return sqliteModule;
}

/** Write `text` to `absolute` atomically (temp file in the same directory, then rename). */
export async function writeAtomic(absolute, text) {
  const tmp = join(dirname(absolute), `.tmp-${randomUUID()}`);
  try {
    await writeFile(tmp, text, { encoding: 'utf8', flag: 'wx' });
    await rename(tmp, absolute);
  } catch (error) {
    await rm(tmp, { force: true });
    throw error;
  }
}

const TERM_SPLIT = /[\s"'`(),;:!?[\]{}<>|/\\]+/u;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/** Tokenize a free-text query into search terms (deduplicated, bounded). */
export function queryTerms(query, maxTerms = 12) {
  const seen = new Set();
  const terms = [];
  for (const raw of String(query).split(TERM_SPLIT)) {
    const term = raw.trim().replace(/^[.*_-]+|[.*_-]+$/gu, '');
    if (term === '' || seen.has(term.toLowerCase())) continue;
    seen.add(term.toLowerCase());
    terms.push(term);
    if (terms.length >= maxTerms) break;
  }
  return terms;
}

/** unicode61 MATCH expression: every term quoted, prefix-expanded, OR-combined. */
export function wordsMatchExpression(terms) {
  const quoted = terms.filter(term => !CJK.test(term)).map(term => `"${term.replace(/"/gu, '""')}"*`);
  return quoted.length > 0 ? quoted.join(' OR ') : undefined;
}

/** trigram MATCH expression: terms of at least three characters, OR-combined. */
export function trigramMatchExpression(terms) {
  const quoted = terms.filter(term => [...term].length >= 3).map(term => `"${term.replace(/"/gu, '""')}"`);
  return quoted.length > 0 ? quoted.join(' OR ') : undefined;
}

export function topicMetadata(content) {
  const lines = String(content).split('\n');
  const headingIndex = lines.findIndex(line => /^# \S/u.test(line));
  const title = headingIndex >= 0 ? scrubInline(lines[headingIndex].slice(2)) : '';
  let description;
  for (const line of lines.slice(headingIndex + 1)) {
    const clean = scrubInline(line);
    if (clean === '' || clean.startsWith('#') || clean.startsWith('>')) continue;
    description = truncateUtf8(clean, 160);
    break;
  }
  return { title, description };
}

export class MemoryScopeStore {
  /** @private */
  constructor(scopeDir, scope, db, options) {
    this.scopeDir = scopeDir;
    this.scope = scope;
    this.db = db;
    this.now = options.now ?? (() => Date.now());
    this.manifestBudget = options.manifestBudget ?? DEFAULT_MANIFEST_BUDGET;
  }

  static async open(scopeDir, { scope, now, manifestBudget } = {}) {
    for (const dir of SCOPE_DIRS) await mkdir(join(scopeDir, dir), { recursive: true });
    const { DatabaseSync } = await loadSqlite();
    const db = new DatabaseSync(join(scopeDir, STATE_FILE));
    try {
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA busy_timeout = 5000;');
      initializeSchema(db);
      const store = new MemoryScopeStore(scopeDir, scope ?? 'workspace', db, { now, manifestBudget });
      await store.reconcile();
      return store;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  close() {
    this.db.close();
  }

  /** @private */
  transaction(action) {
    this.db.exec('SAVEPOINT memory_write');
    try {
      const result = action();
      this.db.exec('RELEASE memory_write');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK TO memory_write; RELEASE memory_write');
      throw error;
    }
  }

  /** Recover inbox additions and topic changes after interrupted file/database writes. */
  async reconcile() {
    const known = new Set(this.db.prepare('SELECT path FROM observations').all().map(row => row.path));
    const inboxDir = join(this.scopeDir, 'observations', '_inbox');
    for (const entry of await readdir(inboxDir)) {
      if (!entry.endsWith('.md') || entry.startsWith('.')) continue;
      const rel = `observations/_inbox/${entry}`;
      if (known.has(rel)) continue;
      const parsed = parseObservationFile(await readFile(join(inboxDir, entry), 'utf8'));
      if (!parsed || parsed.statement === '') continue;
      this.indexObservationRow(rel, {
        type: parsed.meta.type,
        topicHint: parsed.meta.topic_hint ?? undefined,
        statement: parsed.statement,
        keywords: Array.isArray(parsed.meta.keywords) ? parsed.meta.keywords : [],
        aliases: Array.isArray(parsed.meta.aliases) ? parsed.meta.aliases : [],
        createdAt: typeof parsed.meta.created_at === 'number' ? parsed.meta.created_at * 1000 : this.now(),
      }, {
        sessionId: String(parsed.meta.session_id ?? 'unknown'),
        fromTurn: Number(parsed.meta.from_turn ?? 0),
        throughTurn: Number(parsed.meta.through_turn ?? 0),
      }, parsed.body);
    }
    const knownTopics = new Map(this.db.prepare('SELECT path, content_hash FROM topics').all().map(row => [row.path, row.content_hash]));
    const topicsDir = join(this.scopeDir, 'topics');
    for (const entry of await readdir(topicsDir)) {
      const rel = `topics/${entry}`;
      if (!isTopicPath(rel)) continue;
      let content;
      try {
        content = await readFile(join(topicsDir, entry), 'utf8');
      } catch (error) {
        if (error?.code === 'ENOENT') continue;
        throw error;
      }
      const hash = createHash('sha256').update(content).digest('hex');
      if (knownTopics.get(rel) !== hash) this.indexTopicRow(rel, content);
      knownTopics.delete(rel);
    }
    for (const rel of knownTopics.keys()) this.removeTopicRow(rel);
  }

  /** @private */
  indexObservationRow(rel, draft, job, body) {
    this.transaction(() => {
      this.db.prepare(`INSERT OR REPLACE INTO observations (path, type, topic_hint, statement, keywords, aliases, session_id, from_turn, through_turn, created_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`).run(
        rel, draft.type, draft.topicHint ?? null, draft.statement, JSON.stringify(draft.keywords), JSON.stringify(draft.aliases),
        job.sessionId, job.fromTurn, job.throughTurn, draft.createdAt,
      );
      this.replaceDoc(rel, 'observation', draft.statement, [...draft.keywords, ...draft.aliases, draft.topicHint ?? ''].join(' '), body ?? draft.body ?? '');
    });
  }

  /** @private */
  indexTopicRow(rel, content) {
    const { title, description } = topicMetadata(content);
    this.transaction(() => {
      this.db.prepare('INSERT OR REPLACE INTO topics (path, title, description, updated_at, content_hash) VALUES (?, ?, ?, ?, ?)').run(rel, title || basename(rel, '.md'), description ?? null, this.now(), createHash('sha256').update(content).digest('hex'));
      this.replaceDoc(rel, 'topic', title, description ?? '', content);
    });
  }

  /** @private */
  removeTopicRow(rel) {
    this.transaction(() => {
      this.db.prepare('DELETE FROM topics WHERE path = ?').run(rel);
      this.removeDoc(rel);
    });
  }

  /** @private */
  replaceDoc(path, kind, title, terms, body) {
    this.transaction(() => {
      const existing = this.db.prepare('SELECT id FROM doc_ids WHERE path = ?').get(path);
      const id = existing?.id ?? this.db.prepare('INSERT INTO doc_ids (path) VALUES (?)').run(path).lastInsertRowid;
      for (const table of ['docs_words', 'docs_trigram']) {
        if (existing) this.db.prepare(`DELETE FROM ${table} WHERE rowid = ?`).run(id);
        this.db.prepare(`INSERT INTO ${table} (rowid, path, kind, title, terms, body) VALUES (?, ?, ?, ?, ?, ?)`).run(id, path, kind, title, terms, body);
      }
    });
  }

  /** @private */
  removeDoc(path) {
    this.transaction(() => {
      const row = this.db.prepare('SELECT id FROM doc_ids WHERE path = ?').get(path);
      if (!row) return;
      for (const table of ['docs_words', 'docs_trigram']) this.db.prepare(`DELETE FROM ${table} WHERE rowid = ?`).run(row.id);
      this.db.prepare('DELETE FROM doc_ids WHERE id = ?').run(row.id);
    });
  }

  /** Persist observation drafts as immutable inbox files; returns their scope-relative paths. */
  async persistObservations(drafts, job) {
    const paths = [];
    for (const [ordinal, draft] of drafts.entries()) {
      const rel = `observations/_inbox/${observationFileName(draft, job, ordinal)}`;
      const { absolute } = resolveContained(this.scopeDir, rel);
      await writeAtomic(absolute, renderObservation(draft, job, ordinal, drafts.length));
      this.indexObservationRow(rel, draft, job);
      paths.push(rel);
    }
    return paths;
  }

  captureProgress(sessionId) {
    const row = this.db.prepare('SELECT through_turn FROM capture_progress WHERE session_id = ?').get(sessionId);
    return row ? Number(row.through_turn) : 0;
  }

  setCaptureProgress(sessionId, throughTurn) {
    this.db.prepare('INSERT OR REPLACE INTO capture_progress (session_id, through_turn, updated_at) VALUES (?, ?, ?)').run(sessionId, throughTurn, this.now());
  }

  pendingObservations(limit = 10_000) {
    return this.db.prepare(`SELECT path, type, topic_hint, statement, keywords, aliases, session_id, from_turn, through_turn, created_at
      FROM observations WHERE status = 'pending' ORDER BY created_at ASC, path ASC LIMIT ?`).all(limit).map(rowToObservation);
  }

  pendingStats() {
    const row = this.db.prepare(`SELECT COUNT(*) AS count, MIN(created_at) AS oldest FROM observations WHERE status = 'pending'`).get();
    return { count: Number(row.count), oldestCreatedAt: row.oldest === null ? undefined : Number(row.oldest) };
  }

  topics() {
    return this.db.prepare('SELECT path, title, description, updated_at FROM topics ORDER BY path ASC').all()
      .map(row => ({ path: row.path, title: row.title, description: row.description ?? undefined, updatedAt: Number(row.updated_at) }));
  }

  /** Read one memory file, bounded and contained. */
  async read(relPath, { maxBytes = MAX_READ_BYTES } = {}) {
    const { absolute, relative } = resolveContained(this.scopeDir, relPath);
    let text;
    try {
      text = await readFile(absolute, 'utf8');
    } catch (error) {
      if (error && error.code === 'ENOENT') throw new MemoryPathError(`memory file not found: ${relative}`);
      throw error;
    }
    const truncated = utf8Length(text) > maxBytes;
    return { path: relative, content: truncated ? truncateUtf8(text, maxBytes) : text, truncated };
  }

  /** Lexical search across topics and observations (unicode61 words + trigram fallback for CJK / substrings). */
  search(query, { limit = DEFAULT_SEARCH_LIMIT, kinds } = {}) {
    const terms = queryTerms(query);
    const cap = Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(limit)));
    if (terms.length === 0) return [];
    const kindFilter = Array.isArray(kinds) && kinds.length > 0 ? kinds : undefined;
    const merged = new Map();
    const run = (table, expression) => {
      if (!expression) return;
      const where = kindFilter ? ` AND kind IN (${kindFilter.map(() => '?').join(', ')})` : '';
      let rows;
      try {
        rows = this.db.prepare(`SELECT path, kind, title, bm25(${table}, 4.0, 2.0, 1.0) AS score,
            snippet(${table}, 4, '[', ']', '…', 24) AS snippet
          FROM ${table} WHERE ${table} MATCH ?${where} ORDER BY score LIMIT ?`).all(expression, ...(kindFilter ?? []), cap * 2);
      } catch {
        return;
      }
      for (const row of rows) {
        const existing = merged.get(row.path);
        const score = Number(row.score);
        if (!existing || score < existing.score) merged.set(row.path, { path: row.path, kind: row.kind, title: row.title, score, snippet: scrubInline(row.snippet) });
      }
    };
    run('docs_words', wordsMatchExpression(terms));
    if (merged.size < cap || terms.some(term => CJK.test(term))) run('docs_trigram', trigramMatchExpression(terms));
    return [...merged.values()].sort((a, b) => a.score - b.score || a.path.localeCompare(b.path)).slice(0, cap);
  }

  /** Regenerate MEMORY.md from the database view of topics and pending observations. */
  async regenerateManifest() {
    const rendered = renderScopeManifest({
      scope: this.scope,
      scopeDir: this.scopeDir,
      topics: this.topics(),
      observations: this.pendingObservations(this.manifestBudget.maxEntries),
    }, this.manifestBudget);
    await writeAtomic(join(this.scopeDir, MANIFEST_FILE), rendered.text);
    return rendered;
  }

  async manifestText() {
    try {
      return await readFile(join(this.scopeDir, MANIFEST_FILE), 'utf8');
    } catch (error) {
      if (error && error.code === 'ENOENT') return undefined;
      throw error;
    }
  }

  /** Acquire a named lease unless another live owner holds it. */
  acquireLease(name, owner, ttlMs) {
    const now = this.now();
    const result = this.db.prepare(`INSERT INTO leases (name, owner, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET owner = excluded.owner, expires_at = excluded.expires_at
      WHERE leases.owner = excluded.owner OR leases.expires_at <= ?`).run(name, owner, now + ttlMs, now);
    return Number(result.changes) === 1;
  }

  assertLease(name, owner) {
    const row = this.db.prepare('SELECT owner, expires_at FROM leases WHERE name = ?').get(name);
    if (!row || row.owner !== owner || Number(row.expires_at) <= this.now()) throw new MemoryPathError('memory lease expired or changed owner');
  }

  releaseLease(name, owner) {
    this.db.prepare('DELETE FROM leases WHERE name = ? AND owner = ?').run(name, owner);
  }

  recordDream(entry) {
    if (entry.id === undefined) {
      const result = this.db.prepare('INSERT INTO dreams (started_at, model, claimed, status) VALUES (?, ?, ?, ?)').run(entry.startedAt, entry.model ?? null, entry.claimed, 'running');
      return Number(result.lastInsertRowid);
    }
    this.db.prepare('UPDATE dreams SET finished_at = ?, operations = ?, status = ?, error = ? WHERE id = ?').run(entry.finishedAt ?? this.now(), entry.operations ?? null, entry.status, entry.error ?? null, entry.id);
    return entry.id;
  }

  lastDream() {
    const row = this.db.prepare('SELECT * FROM dreams ORDER BY id DESC LIMIT 1').get();
    return row ? { id: Number(row.id), startedAt: Number(row.started_at), finishedAt: row.finished_at === null ? undefined : Number(row.finished_at), model: row.model ?? undefined, claimed: Number(row.claimed), operations: row.operations === null ? undefined : Number(row.operations), status: row.status, error: row.error ?? undefined } : undefined;
  }

  /**
   * Apply a validated Dream plan: topic operations, then archive every claimed
   * observation. Topic content is bounded and confined to `topics/<slug>.md`.
   */
  async applyDreamPlan(plan, claimedPaths, { leaseOwner } = {}) {
    const checkLease = () => { if (leaseOwner !== undefined) this.assertLease('dream', leaseOwner); };
    checkLease();
    const claimed = new Set(claimedPaths);
    for (const path of claimed) if (!isInboxPath(path)) throw new MemoryPathError(`claimed observation is not in the inbox: ${path}`);
    const writes = new Map();
    const deletes = new Set();
    const existing = new Set(this.topics().map(topic => topic.path));
    const exists = rel => writes.has(rel) || (existing.has(rel) && !deletes.has(rel));
    const stage = (path, content) => {
      const rel = validateRelativePath(path);
      if (!isTopicPath(rel)) throw new MemoryPathError(`topic path must match topics/<slug>.md: ${path}`);
      const clean = scrubBlock(String(content)).replace(/\r\n/gu, '\n').trim();
      if (utf8Length(clean) > MAX_TOPIC_CONTENT_BYTES) throw new MemoryPathError(`topic content exceeds ${MAX_TOPIC_CONTENT_BYTES} bytes: ${path}`);
      if (!/^# \S/u.test(clean)) throw new MemoryPathError(`topic content must start with a "# Title" heading: ${path}`);
      writes.set(rel, `${clean}\n`);
      deletes.delete(rel);
    };
    const remove = path => {
      const rel = validateRelativePath(path);
      if (!isTopicPath(rel)) throw new MemoryPathError(`only topics can be deleted: ${path}`);
      if (!exists(rel)) throw new MemoryPathError(`topic does not exist: ${path}`);
      writes.delete(rel);
      if (existing.has(rel)) deletes.add(rel);
    };
    const checkEvidence = (evidence, where) => {
      if (!Array.isArray(evidence) || evidence.length === 0) throw new MemoryPathError(`${where} requires evidence paths`);
      for (const path of evidence) if (!claimed.has(path)) throw new MemoryPathError(`${where} cites an unclaimed observation: ${String(path)}`);
    };
    for (const [index, op] of plan.operations.entries()) {
      const where = `operation ${index} (${op.op})`;
      switch (op.op) {
        case 'create':
          if (exists(validateRelativePath(op.path))) throw new MemoryPathError(`${where}: topic already exists, use update`);
          checkEvidence(op.evidence, where);
          stage(op.path, op.content);
          break;
        case 'update':
          if (!exists(validateRelativePath(op.path))) throw new MemoryPathError(`${where}: topic does not exist, use create`);
          checkEvidence(op.evidence, where);
          stage(op.path, op.content);
          break;
        case 'delete':
          remove(op.path);
          break;
        case 'rename': {
          const from = validateRelativePath(op.from);
          if (!exists(from)) throw new MemoryPathError(`${where}: source topic does not exist`);
          const to = validateRelativePath(op.to);
          if (to !== from && exists(to)) throw new MemoryPathError(`${where}: destination topic already exists`);
          const content = writes.get(from) ?? (await readFile(resolveContained(this.scopeDir, from).absolute, 'utf8'));
          remove(from);
          stage(to, content);
          break;
        }
        case 'merge':
          if (!Array.isArray(op.sources) || op.sources.length === 0) throw new MemoryPathError(`${where} requires sources`);
          checkEvidence(op.evidence, where);
          for (const source of op.sources) remove(source);
          if (exists(validateRelativePath(op.into))) throw new MemoryPathError(`${where}: destination topic already exists`);
          stage(op.into, op.content);
          break;
        case 'split':
          if (!Array.isArray(op.into) || op.into.length === 0) throw new MemoryPathError(`${where} requires targets`);
          checkEvidence(op.evidence, where);
          remove(op.from);
          for (const target of op.into) {
            if (exists(validateRelativePath(target.path))) throw new MemoryPathError(`${where}: destination topic already exists`);
            stage(target.path, target.content);
          }
          break;
        default:
          throw new MemoryPathError(`${where}: unsupported operation`);
      }
    }

    for (const [rel, content] of writes) {
      checkLease();
      await writeAtomic(resolveContained(this.scopeDir, rel).absolute, content);
      this.indexTopicRow(rel, content);
    }
    for (const rel of deletes) {
      checkLease();
      await rm(resolveContained(this.scopeDir, rel).absolute, { force: true });
      this.removeTopicRow(rel);
    }
    const archived = [];
    for (const rel of claimed) {
      checkLease();
      archived.push(await this.archiveObservation(rel));
    }
    return { written: [...writes.keys()], deleted: [...deletes], archived };
  }

  /** Move an inbox observation into `archive/` and mark it consolidated. */
  async archiveObservation(rel) {
    const from = resolveContained(this.scopeDir, rel).absolute;
    const target = `archive/${basename(rel)}`;
    const to = resolveContained(this.scopeDir, target).absolute;
    try {
      await rename(from, to);
    } catch (error) {
      if (!error || error.code !== 'ENOENT') throw error;
    }
    this.transaction(() => {
      this.db.prepare(`UPDATE observations SET path = ?, status = 'consolidated', archived_at = ? WHERE path = ?`).run(target, this.now(), rel);
      this.removeDoc(rel);
    });
    return target;
  }

  /** Delete archived observations older than `retentionMs`. */
  async pruneArchive(retentionMs) {
    const cutoff = this.now() - retentionMs;
    const rows = this.db.prepare(`SELECT path FROM observations WHERE status = 'consolidated' AND archived_at IS NOT NULL AND archived_at < ?`).all(cutoff);
    for (const row of rows) {
      await rm(resolveContained(this.scopeDir, row.path).absolute, { force: true });
      this.db.prepare('DELETE FROM observations WHERE path = ?').run(row.path);
    }
    return rows.length;
  }

  /** Permanently delete every topic, observation and index entry in this scope. */
  async clear() {
    for (const topic of this.topics()) await rm(resolveContained(this.scopeDir, topic.path).absolute, { force: true });
    for (const row of this.db.prepare('SELECT path FROM observations').all()) await rm(resolveContained(this.scopeDir, row.path).absolute, { force: true });
    this.transaction(() => {
      for (const table of ['observations', 'topics', 'capture_progress', 'docs_words', 'docs_trigram', 'doc_ids']) this.db.exec(`DELETE FROM ${table}`);
    });
    await this.regenerateManifest();
  }

  async stats() {
    const counts = this.db.prepare(`SELECT status, COUNT(*) AS count FROM observations GROUP BY status`).all();
    const byStatus = Object.fromEntries(counts.map(row => [row.status, Number(row.count)]));
    let manifestBytes = 0;
    try { manifestBytes = (await stat(join(this.scopeDir, MANIFEST_FILE))).size; } catch { /* absent */ }
    return { scope: this.scope, scopeDir: this.scopeDir, topics: this.topics().length, pending: byStatus.pending ?? 0, consolidated: byStatus.consolidated ?? 0, manifestBytes, lastDream: this.lastDream() };
  }
}

function rowToObservation(row) {
  return {
    path: row.path,
    type: row.type,
    topicHint: row.topic_hint ?? undefined,
    statement: row.statement,
    keywords: JSON.parse(row.keywords),
    aliases: JSON.parse(row.aliases),
    sessionId: row.session_id,
    fromTurn: Number(row.from_turn),
    throughTurn: Number(row.through_turn),
    createdAt: Number(row.created_at),
  };
}
