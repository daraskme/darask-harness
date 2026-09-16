import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionArchive, describeArchivedSession } from '../src/session-archive.mjs';

const ID = '11111111-1111-4111-8111-111111111111';
const ARCHIVED_ID = `session-${ID}`;

test('archived session list shows the folded title and restore/delete accept opaque session ids', async () => {
  assert.equal(describeArchivedSession(ARCHIVED_ID, { workspaces: [{ id: 'w1', title: '作業', sessionIds: [ARCHIVED_ID], path: 'C:\\proj' }] }).workspaceTitle, '作業');
  let archived = [ARCHIVED_ID];
  const registry = {
    get archivedSessionIds() { return archived; },
    list() { return [{ id: 'w1', title: '作業', path: 'C:\\proj', sessionIds: [ARCHIVED_ID], updatedAt: '2026-01-01T00:00:00.000Z', detachSession: async () => { this.sessionIds = []; } }]; },
    enqueueOperation(fn) { return fn(); },
    requireState() { return { initialized: true, workspaceIds: ['w1'], archivedSessionIds: archived }; },
    async setState(state) { archived = [...state.archivedSessionIds]; },
  };
  const removed = [];
  const archives = createSessionArchive({
    registry,
    sessionPersistence: {
      root: 'C:\\logs',
      async list() { return [{ header: { id: ARCHIVED_ID, cwd: 'C:\\proj', title: '古い会話' } }]; },
      async stat(id) { return id === ARCHIVED_ID ? { header: { id: ARCHIVED_ID, cwd: 'C:\\proj' } } : undefined; },
      locate() { return { kind: 'jsonl', path: 'C:\\logs\\proj\\' + ARCHIVED_ID + '\\session.v2.jsonl.zstd' }; },
    },
    sessionQuery: {
      async readTitleSnapshots(ids) { return ids.map(sessionId => ({ sessionId, status: 'fulfilled', value: { session: { id: sessionId, cwd: 'C:\\proj' }, title: { title: '実際の会話タイトル', updatedAt: 2 } } })); },
    },
    rmDir: async (path, options) => { removed.push({ path, options }); },
  });
  const listed = await archives.list();
  assert.equal(listed.items[0].title, '実際の会話タイトル');
  await archives.restore(ARCHIVED_ID);
  assert.deepEqual(archived, []);
  archived = [ARCHIVED_ID];
  await archives.delete(ARCHIVED_ID);
  assert.deepEqual(archived, []);
  assert.equal(removed.length, 1);
  assert.match(removed[0].path, /11111111-1111-4111-8111-111111111111$/);
});
