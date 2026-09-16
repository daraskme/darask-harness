import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseModelOutcome, renderObservation } from '../src/observation.mjs';
import { MemoryPathError, findWorkspaceRoot, resolveContained, scopeDirFor, validateRelativePath, workspaceScopeName } from '../src/paths.mjs';
import { MemoryScopeStore, queryTerms, topicMetadata, trigramMatchExpression, wordsMatchExpression, writeAtomic } from '../src/store.mjs';
import { renderScopeManifest } from '../src/manifest.mjs';

async function scratch(prefix = 'dsh-memory-') {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  return { dir, [Symbol.asyncDispose]: () => rm(dir, { recursive: true, force: true }) };
}

const job = { sessionId: 'sess-1', fromTurn: 1, throughTurn: 2 };
let clock = 1_700_000_000_000;
const now = () => (clock += 1000);

function drafts(list) {
  return parseModelOutcome(JSON.stringify({ outcome: 'observations', observations: list }), { model: 'm', createdAt: now() }).observations;
}

test('scope-relative paths are validated and contained', () => {
  for (const ok of ['topics/build.md', 'observations/_inbox/1-01-abc.md', 'archive/1-01-abc.md', 'MEMORY.md']) assert.equal(validateRelativePath(ok), ok);
  assert.equal(validateRelativePath('topics\\build.md'), 'topics/build.md');
  for (const bad of ['', '../x.md', 'topics/../x.md', '/etc/passwd', 'C:\\x\\y.md', 'topics/.hidden.md', 'topics/a/b.md', 'observations/x.md/../y.md', 'memory.sqlite', 'topics/build.txt', 'observations/_inbox/../../x.md', 'topics/_inbox/x.md']) {
    assert.throws(() => validateRelativePath(bad), MemoryPathError, bad);
  }
  const { absolute } = resolveContained('/scope', 'topics/build.md');
  assert.ok(absolute.endsWith(join('scope', 'topics', 'build.md')));
});

test('workspace scope names are stable, slugged and hashed', async () => {
  await using ws = await scratch('proj-');
  const name = workspaceScopeName(ws.dir);
  assert.match(name, /^[a-z0-9-]+-[0-9a-f]{16}$/u);
  assert.equal(name, workspaceScopeName(`${ws.dir}${process.platform === 'win32' ? '\\' : '/'}`));
  assert.notEqual(name, workspaceScopeName(join(ws.dir, 'other')));
  assert.equal(scopeDirFor('/home', 'global'), join('/home', 'darask', 'memory', 'global'));
  assert.ok(scopeDirFor('/home', 'workspace', ws.dir).startsWith(join('/home', 'darask', 'memory', 'workspaces')));
  assert.throws(() => scopeDirFor('/home', 'workspace'), /requires a workspace root/u);
  assert.throws(() => scopeDirFor('/home', 'other', ws.dir), /unknown memory scope/u);
});

test('workspace root is the nearest ancestor with a marker, else cwd', async () => {
  await using ws = await scratch('root-');
  const nested = join(ws.dir, 'a', 'b');
  await writeFile(join(ws.dir, 'MARK'), '').catch(() => {});
  const { mkdir } = await import('node:fs/promises');
  await mkdir(nested, { recursive: true });
  assert.equal(await findWorkspaceRoot(nested, ['MARK']), ws.dir);
  assert.equal(await findWorkspaceRoot(nested, ['.definitely-missing-marker']), nested);
});

test('atomic writes leave no temp files behind and refuse to clobber via temp collision', async () => {
  await using ws = await scratch();
  const target = join(ws.dir, 'file.md');
  await writeAtomic(target, 'one');
  await writeAtomic(target, 'two');
  assert.equal(await readFile(target, 'utf8'), 'two');
  assert.deepEqual(await readdir(ws.dir), ['file.md']);
});

test('query terms and FTS expressions', () => {
  assert.deepEqual(queryTerms('  npm run "check"  (PowerShell) npm  '), ['npm', 'run', 'check', 'PowerShell']);
  assert.equal(wordsMatchExpression(['npm', 'ワイルドカード']), '"npm"*');
  assert.equal(trigramMatchExpression(['ab', 'ワイルドカード', 'check']), '"ワイルドカード" OR "check"');
  assert.equal(wordsMatchExpression(['日本']), undefined);
  assert.equal(trigramMatchExpression(['ab']), undefined);
  assert.equal(wordsMatchExpression(['say "hi"']), '"say ""hi"""*');
});

test('topic metadata reads the heading and first paragraph', () => {
  assert.deepEqual(topicMetadata('# Build & test\n\n> quote\n\nRun `npm run check`.\n\n## More'), { title: 'Build & test', description: 'Run `npm run check`.' });
  assert.deepEqual(topicMetadata('no heading'), { title: '', description: 'no heading' });
});

test('store persists observations, indexes them, searches (words + trigram) and renders MEMORY.md', async () => {
  await using ws = await scratch();
  const store = await MemoryScopeStore.open(ws.dir, { scope: 'workspace', now });
  try {
    const paths = [
      ...await store.persistObservations(drafts([{ type: 'project', topic_hint: 'ビルド手順', statement: 'テストは npm run check で実行する。', keywords: ['npm', 'check'], body: 'PowerShell does not expand wildcards.' }]), job),
      ...await store.persistObservations(drafts([{ type: 'user', statement: 'User prefers Japanese replies', keywords: ['locale'] }]), job),
    ];
    assert.equal(paths.length, 2);
    for (const path of paths) {
      assert.match(path, /^observations\/_inbox\/\d{10}-\d{2}-[0-9a-f]{12}\.md$/u);
      const text = await readFile(join(ws.dir, path), 'utf8');
      assert.match(text, /^---\nschema_version: 2/u);
    }
    assert.deepEqual(store.pendingObservations().map(entry => entry.path), paths);
    assert.equal(store.pendingStats().count, 2);

    assert.equal(store.search('wildcards')[0].path, paths[0]);
    assert.equal(store.search('実行する')[0].path, paths[0]);
    assert.equal(store.search('ビルド手順')[0].path, paths[0]);
    assert.equal(store.search('japanese locale')[0].path, paths[1]);
    assert.deepEqual(store.search(''), []);
    assert.deepEqual(store.search('   "  '), []);
    assert.equal(store.search('npm OR "', { limit: 1 }).length, 1);
    assert.equal(store.search('prefers', { kinds: ['topic'] }).length, 0);

    const manifest = await store.regenerateManifest();
    assert.equal(manifest.entries, 2);
    const text = await readFile(join(ws.dir, 'MEMORY.md'), 'utf8');
    assert.match(text, /^# Workspace memory\n/u);
    assert.match(text, /historical context/u);
    assert.match(text, /_No curated topics yet\._/u);
    assert.ok(text.indexOf(paths[1]) < text.indexOf(paths[0]), 'newest first');
    assert.equal(await store.manifestText(), text);

    const file = await store.read(paths[0]);
    assert.equal(file.truncated, false);
    assert.match(file.content, /PowerShell does not expand wildcards/u);
    assert.equal((await store.read(paths[0], { maxBytes: 10 })).truncated, true);
    await assert.rejects(store.read('topics/missing.md'), MemoryPathError);
    await assert.rejects(store.read('../MEMORY.md'), MemoryPathError);
    await assert.rejects(store.read('memory.sqlite'), MemoryPathError);

    store.setCaptureProgress('sess-1', 2);
    assert.equal(store.captureProgress('sess-1'), 2);
    assert.equal(store.captureProgress('other'), 0);
  } finally {
    store.close();
  }
});

test('reopening reconciles inbox and topic files written without database rows', async () => {
  await using ws = await scratch();
  const first = await MemoryScopeStore.open(ws.dir, { scope: 'workspace', now });
  first.close();
  const [draft] = drafts([{ type: 'project', statement: 'Orphan observation', keywords: ['orphan'] }]);
  await writeFile(join(ws.dir, 'observations', '_inbox', '1700000000-01-abcdefabcdef.md'), renderObservation(draft, job, 0, 1));
  await writeFile(join(ws.dir, 'topics', 'manual.md'), '# Manual topic\n\nWritten by hand.\n');
  await writeFile(join(ws.dir, 'topics', 'Bad Name.md'), '# ignored\n');
  const store = await MemoryScopeStore.open(ws.dir, { scope: 'workspace', now });
  try {
    assert.equal(store.pendingObservations().length, 1);
    assert.equal(store.pendingObservations()[0].statement, 'Orphan observation');
    assert.deepEqual(store.topics().map(topic => topic.path), ['topics/manual.md']);
    assert.equal(store.search('orphan')[0].kind, 'observation');
    assert.equal(store.search('hand')[0].path, 'topics/manual.md');
  } finally {
    store.close();
  }
});

test('dream plans are applied with containment, evidence checks and archiving', async () => {
  await using ws = await scratch();
  const store = await MemoryScopeStore.open(ws.dir, { scope: 'workspace', now });
  try {
    const paths = await store.persistObservations(drafts([
      { type: 'project', statement: 'Build uses npm run check', keywords: ['build'] },
      { type: 'project', statement: 'Deploy uses Cloudflare', keywords: ['deploy'] },
      { type: 'project', statement: 'Stale note', keywords: ['stale'] },
    ]), job);

    await assert.rejects(store.applyDreamPlan({ operations: [{ op: 'create', path: 'topics/build.md', content: '# Build\nx', evidence: ['observations/_inbox/not-claimed.md'] }] }, paths), /unclaimed/u);
    await assert.rejects(store.applyDreamPlan({ operations: [{ op: 'create', path: 'topics/build.md', content: 'no heading', evidence: [paths[0]] }] }, paths), /heading/u);
    await assert.rejects(store.applyDreamPlan({ operations: [{ op: 'update', path: 'topics/build.md', content: '# B', evidence: [paths[0]] }] }, paths), /does not exist/u);
    await assert.rejects(store.applyDreamPlan({ operations: [{ op: 'create', path: 'topics/x.md', content: `# X\n${'y'.repeat(40_000)}`, evidence: [paths[0]] }] }, paths), /exceeds/u);
    await assert.rejects(store.applyDreamPlan({ operations: [] }, ['topics/build.md']), /not in the inbox/u);
    assert.equal(store.pendingStats().count, 3, 'failed plans do not consume observations');
    assert.deepEqual(await readdir(join(ws.dir, 'topics')), []);

    const result = await store.applyDreamPlan({ operations: [
      { op: 'create', path: 'topics/build.md', content: '# Build\n\nRun `npm run check`.\n\n## Deploy\nCloudflare.', evidence: [paths[0], paths[1]] },
    ] }, paths);
    assert.deepEqual(result.written, ['topics/build.md']);
    assert.equal(result.archived.length, 3);
    assert.equal(store.pendingStats().count, 0);
    assert.deepEqual(await readdir(join(ws.dir, 'observations', '_inbox')), []);
    assert.equal((await readdir(join(ws.dir, 'archive'))).length, 3);
    assert.equal(store.search('stale').length, 0, 'archived observations leave the index');
    assert.equal(store.search('cloudflare')[0].path, 'topics/build.md');
    assert.equal((await store.read(result.archived[0])).path, result.archived[0]);

    const second = await store.persistObservations(drafts([{ type: 'project', statement: 'Tests live in test/', keywords: ['tests'] }]), job);
    const renamed = await store.applyDreamPlan({ operations: [
      { op: 'rename', from: 'topics/build.md', to: 'topics/engineering.md' },
      { op: 'update', path: 'topics/engineering.md', content: '# Engineering\n\nTests live in test/.', evidence: second },
    ] }, second);
    assert.deepEqual(renamed.deleted, ['topics/build.md']);
    assert.deepEqual(store.topics().map(topic => topic.path), ['topics/engineering.md']);
    assert.deepEqual(await readdir(join(ws.dir, 'topics')), ['engineering.md']);

    const third = await store.persistObservations(drafts([{ type: 'project', statement: 'Split me', keywords: ['split'] }]), job);
    await store.applyDreamPlan({ operations: [
      { op: 'split', from: 'topics/engineering.md', into: [{ path: 'topics/a.md', content: '# A' }, { path: 'topics/b.md', content: '# B' }], evidence: third },
    ] }, third);
    const fourth = await store.persistObservations(drafts([{ type: 'project', statement: 'Merge me', keywords: ['merge'] }]), job);
    await store.applyDreamPlan({ operations: [
      { op: 'merge', sources: ['topics/a.md', 'topics/b.md'], into: 'topics/ab.md', content: '# AB', evidence: fourth },
      { op: 'delete', path: 'topics/ab.md' },
    ] }, fourth);
    assert.deepEqual(store.topics(), []);
    assert.deepEqual(await readdir(join(ws.dir, 'topics')), []);

    const manifest = await store.regenerateManifest();
    assert.equal(manifest.entries, 0);
    const stats = await store.stats();
    assert.equal(stats.consolidated, 6);
    assert.equal(stats.pending, 0);

    clock += 100 * 24 * 60 * 60 * 1000;
    assert.equal(await store.pruneArchive(90 * 24 * 60 * 60 * 1000), 6);
    assert.deepEqual(await readdir(join(ws.dir, 'archive')), []);
  } finally {
    store.close();
  }
});

test('leases are exclusive until they expire and dreams are recorded', async () => {
  await using ws = await scratch();
  const store = await MemoryScopeStore.open(ws.dir, { scope: 'global', now });
  try {
    assert.equal(store.acquireLease('dream', 'a', 60_000), true);
    assert.equal(store.acquireLease('dream', 'b', 60_000), false);
    assert.equal(store.acquireLease('dream', 'a', 60_000), true, 'owner may renew');
    store.releaseLease('dream', 'b');
    assert.equal(store.acquireLease('dream', 'b', 60_000), false, 'release by non-owner is ignored');
    store.releaseLease('dream', 'a');
    assert.equal(store.acquireLease('dream', 'b', 1), true);
    clock += 10_000;
    assert.equal(store.acquireLease('dream', 'c', 60_000), true, 'expired lease is taken over');

    const id = store.recordDream({ startedAt: now(), model: 'm', claimed: 3 });
    assert.equal(store.lastDream().status, 'running');
    store.recordDream({ id, status: 'failed', error: 'boom' });
    assert.equal(store.lastDream().status, 'failed');
    assert.equal(store.lastDream().error, 'boom');
  } finally {
    store.close();
  }
});

test('clear removes every file and index row and rewrites the manifest', async () => {
  await using ws = await scratch();
  const store = await MemoryScopeStore.open(ws.dir, { scope: 'global', now });
  try {
    const paths = await store.persistObservations(drafts([{ type: 'user', statement: 'Likes tea', keywords: ['tea'] }]), job);
    await store.applyDreamPlan({ operations: [{ op: 'create', path: 'topics/prefs.md', content: '# Prefs\n\nTea.', evidence: paths }] }, paths);
    await store.clear();
    assert.deepEqual(store.topics(), []);
    assert.equal(store.search('tea').length, 0);
    assert.deepEqual(await readdir(join(ws.dir, 'topics')), []);
    assert.deepEqual(await readdir(join(ws.dir, 'archive')), []);
    assert.match(await store.manifestText(), /^# Global memory/u);
  } finally {
    store.close();
  }
});

test('manifest rendering honours entry and byte budgets', () => {
  const observations = Array.from({ length: 50 }, (_, i) => ({ path: `observations/_inbox/${i}.md`, type: 'project', statement: `Statement ${i} `.repeat(4), createdAt: 1_700_000_000_000 + i * 1000 }));
  const topics = [{ path: 'topics/b.md', title: 'B `tick`\nline' }, { path: 'topics/a.md', title: 'A', description: 'desc' }];
  const full = renderScopeManifest({ scope: 'global', scopeDir: '/x', topics, observations });
  assert.equal(full.truncated, false);
  assert.match(full.text, /- \[A\]\(topics\/a\.md\) — desc\n- \[B 'tick' line\]\(topics\/b\.md\)/u);
  const byEntries = renderScopeManifest({ scope: 'global', scopeDir: '/x', topics, observations }, { maxBytes: 1_000_000, maxEntries: 5 });
  assert.equal(byEntries.entries, 5);
  assert.match(byEntries.text, /Truncated: 47 more entries/u);
  const byBytes = renderScopeManifest({ scope: 'global', scopeDir: '/x', topics, observations }, { maxBytes: 1200, maxEntries: 500 });
  assert.ok(byBytes.truncated);
  assert.ok(Buffer.byteLength(byBytes.text) <= 1200);
});
