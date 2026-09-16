import { dirname, join, resolve, sep } from 'node:path';
import { rm } from 'node:fs/promises';
import { publicOrigin } from './http.mjs';

export const SESSION_ARCHIVE_PATH = '/api/darask/archives';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
const fail = message => { throw new Error(message); };
// SessionId is an opaque host identity. In particular, imported histories may
// use the supported `session-<uuid>` spelling, so do not narrow it to UUIDs.
const sessionId = value => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256 || /[\x00-\x1f\x7f]/u.test(value)) fail('セッションを指定してください。');
  return value;
};

export function describeArchivedSession(id, { workspaces = [], snapshots = [], live = [], titles = [] } = {}) {
  const snapshot = snapshots.find(item => item.header?.id === id);
  const titleSnapshot = titles.find(item => item.sessionId === id && item.status === 'fulfilled')?.value;
  const liveSession = live.find(item => item.id === id);
  const workspace = workspaces.find(item => item.sessionIds?.includes(id));
  const title = liveSession?.displayTitle || liveSession?.title || titleSnapshot?.title?.title || snapshot?.header?.title || 'アーカイブした会話';
  const header = titleSnapshot?.session ?? snapshot?.header;
  return {
    id,
    title,
    workspaceId: workspace?.id ?? null,
    workspaceTitle: workspace?.title ?? 'ワークスペース未登録',
    path: workspace?.path ?? header?.cwd ?? '',
    updatedAt: titleSnapshot?.title?.updatedAt ?? header?.createdAt ?? workspace?.updatedAt ?? null,
  };
}

function underRoot(root, target) {
  const base = resolve(root);
  const next = resolve(target);
  return next === base || next.startsWith(base + sep);
}

export function createSessionArchive({ registry, sessions, sessionPersistence, sessionQuery, rmDir = rm }) {
  async function list() {
    const ids = [...(registry.archivedSessionIds ?? [])];
    const [snapshots, titles] = await Promise.all([
      sessionPersistence?.list?.() ?? [],
      sessionQuery?.readTitleSnapshots?.(ids) ?? [],
    ]);
    const workspaces = registry.list().map(item => ({ id: item.id, title: item.title, path: item.path, sessionIds: [...item.sessionIds], updatedAt: item.updatedAt }));
    const live = [];
    for (const id of ids) {
      const session = sessions?.get?.(id);
      if (session) live.push({ id, title: session.title, displayTitle: session.displayTitle });
    }
    return { items: ids.map(id => describeArchivedSession(id, { workspaces, snapshots, live, titles })) };
  }

  async function unarchive(id) {
    await registry.enqueueOperation(async () => {
      const state = registry.requireState();
      if (!state.archivedSessionIds.includes(id)) return;
      await registry.setState({ ...state, archivedSessionIds: state.archivedSessionIds.filter(item => item !== id) });
    });
  }

  async function restore(id) {
    sessionId(id);
    if (!registry.archivedSessionIds.includes(id)) fail('アーカイブにありません。');
    await unarchive(id);
    return list();
  }

  async function remove(id) {
    sessionId(id);
    if (!registry.archivedSessionIds.includes(id)) fail('アーカイブにありません。');
    const snapshot = await sessionPersistence?.stat?.(id);
    const workspace = registry.list().find(item => item.sessionIds.includes(id) || item.record?.sessionIds?.includes(id));
    await unarchive(id);
    if (workspace?.detachSession) await workspace.detachSession(id);
    const location = snapshot?.header && sessionPersistence?.locate?.(snapshot.header);
    const root = sessionPersistence?.root;
    if (location?.path && root && underRoot(root, location.path)) {
      const directory = dirname(location.path);
      if (underRoot(join(root), directory) && directory !== resolve(root)) await rmDir(directory, { recursive: true, force: true });
    }
    return list();
  }

  const routes = [{ path: SESSION_ARCHIVE_PATH, methods: ['GET', 'POST'], requestBody: 'buffered', async fetch(request) {
    try {
      if (request.method === 'GET') return json(await list());
      publicOrigin(request);
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'JSON 形式で送信してください。' }, 415);
      const input = JSON.parse(await request.text());
      if (input.action === 'restore') return json(await restore(input.sessionId));
      if (input.action === 'delete') return json(await remove(input.sessionId));
      return json({ error: '操作を指定してください。' }, 400);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message.slice(0, 200) : 'アーカイブを操作できません。' }, 400);
    }
  } }];

  return { list, restore, delete: remove, routes };
}
