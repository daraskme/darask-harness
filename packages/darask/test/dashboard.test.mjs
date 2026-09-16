import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFS, buildDashboard, loadPrefs, localRows, remoteRows, rowChips, rowStatusLabel, sanitizePrefs, savePrefs, stateOf, toggleCollapsed } from '../src/dashboard.mjs';

const node = '11111111-1111-4111-8111-111111111111';
const sessions = {
  phase: 'ready', current: 's-current',
  ids: ['s-current', 's-sub', 's-done', 's-blank', 's-old'],
  byId: {
    's-current': { id: 's-current', displayTitle: 'キャプション修正', cwd: 'C:/work/app', running: true, blank: false, updatedAt: 50, projectionValues: { modelSelection: { lastUsed: { provider: 'grok', model: 'grok-4.6' } } } },
    's-sub': { id: 's-sub', displayTitle: 'テスト実行', cwd: 'C:/work/app', parentId: 's-current', origin: 'subagent', running: true, blank: false, updatedAt: 40 },
    's-done': { id: 's-done', displayTitle: 'README 更新', cwd: 'C:/work/docs', running: false, completed: true, blank: false, updatedAt: 30 },
    's-blank': { id: 's-blank', displayTitle: '新しいセッション', blank: true, running: false, updatedAt: 20 },
    's-old': { id: 's-old', displayTitle: '古い作業', cwd: 'C:/work/app', running: false, blank: false, updatedAt: 10 },
  },
  subagentsByParent: { 's-current': { running: 1 } },
  jobsBySession: { 's-done': [{ id: 'j1', status: 'failed' }, { id: 'j2', status: 'running' }] },
};
const pending = new Map([['s-old', { key: 'k1', kind: 'approval', sessionId: 's-old' }]]);
const workspaces = { items: [{ workspaceId: 'w-app', title: 'app', path: 'C:/work/app', sessionIds: ['s-current', 's-sub', 's-old'] }], archivedSessionIds: [], state: 'idle', phase: 'ready' };

test('local rows derive state, hierarchy, jobs and model from the DSH session snapshot without a second registry', () => {
  const rows = localRows({ sessions, pending, workspaces, hostName: 'この PC' });
  const byId = Object.fromEntries(rows.map(row => [row.id, row]));
  assert.deepEqual(Object.keys(byId).sort(), ['s-current', 's-done', 's-old', 's-sub']);
  assert.equal(byId['s-current'].current, true);
  assert.equal(byId['s-current'].runningSubagentCount, 1);
  assert.equal(byId['s-current'].workspaceTitle, 'app');
  assert.equal(byId['s-current'].model, 'grok-4.6');
  assert.equal(stateOf(byId['s-current']), 'running');
  assert.equal(byId['s-sub'].parentId, 's-current');
  assert.equal(byId['s-sub'].subagent, true);
  assert.equal(localRows({ sessions, pending, workspaces, archived: ['s-old'] }).some(row => row.id === 's-old'), false);
  assert.deepEqual(localRows({ sessions: { ...sessions, phase: 'pending' }, pending, workspaces }), []);
  assert.equal(stateOf(byId['s-old']), 'attention');
  assert.equal(rowStatusLabel(byId['s-old']), '作業の許可待ち');
  assert.equal(stateOf(byId['s-done']), 'attention', 'failed job outranks completed');
  assert.ok(rowChips(byId['s-done']).includes('ジョブ失敗 1'));
  assert.ok(rowChips(byId['s-done']).includes('ジョブ 1'));
  assert.ok(rowChips(byId['s-current']).includes('grok-4.6'));
  assert.ok(rowChips(byId['s-current']).includes('サブ 1'));
  assert.ok(rowChips(byId['s-old']).includes('許可待ち'));
});

test('remote rows merge live iframe sessions, cold read-only lists and offline placeholders', () => {
  const groups = [
    { node: 'local', name: 'Hub', status: 'online', workspaces: [{ id: 'w-app', title: 'app', path: 'C:/work/app' }] },
    { node, name: 'Worker', status: 'online', workspaces: [{ id: 'w-1', title: 'api', path: '/srv/api' }, { id: 'w-2', title: 'web', path: '/srv/web' }] },
    { node: '22222222-2222-4222-8222-222222222222', name: 'Laptop', status: 'offline', workspaces: [{ id: 'w-3', title: 'notes', path: '/home/notes' }] },
  ];
  const opened = [{ node, workspace: 'w-1', current: 'r-1', sessions: [{ id: 'r-1', title: 'API 修正', running: true }, { id: 'r-2', title: 'ログ調査', pendingInteraction: 'question' }] }];
  const cold = { [`${node}:w-2`]: { items: [{ sessionId: 'r-3', cwd: '/srv/web', createdAt: 5, live: true, persisted: true }, { sessionId: 'r-4', cwd: '/srv/web', createdAt: 4, live: false, persisted: true }] } };
  const rows = remoteRows({ groups, opened, cold });
  assert.ok(!rows.some(row => row.node === 'local'), 'local group is covered by localRows');
  const byId = Object.fromEntries(rows.filter(row => row.id).map(row => [row.id, row]));
  assert.equal(byId['r-1'].observed, true); assert.equal(byId['r-1'].current, true); assert.equal(stateOf(byId['r-1']), 'running');
  assert.equal(stateOf(byId['r-2']), 'attention');
  assert.equal(byId['r-3'].observed, false); assert.equal(stateOf(byId['r-3']), 'running', 'live but unobserved counts as running');
  assert.equal(stateOf(byId['r-4']), 'unobserved');
  assert.equal(byId['r-4'].workspaceTitle, 'web');
  const offline = rows.find(row => row.placeholder && row.hostName === 'Laptop');
  assert.equal(offline.title, 'オフライン'); assert.equal(stateOf(offline), 'unobserved');
});

test('dashboard groups, filters, sorts and searches merged rows', () => {
  const rows = [...localRows({ sessions, pending, workspaces }), ...remoteRows({ groups: [{ node, name: 'Worker', status: 'online', workspaces: [{ id: 'w-1', title: 'api', path: '/srv/api' }] }], opened: [{ node, workspace: 'w-1', sessions: [{ id: 'r-1', title: 'API 修正', running: true }] }] })];
  const byState = buildDashboard(rows, DEFAULT_PREFS);
  assert.deepEqual(byState.groups.map(group => group.id), ['state:attention', 'state:running']);
  assert.deepEqual(byState.groups[0].rows.map(row => row.id), ['s-done', 's-old'], 'same state falls back to most recently updated');
  assert.equal(byState.counts.attention, 2); assert.equal(byState.counts.running, 3); assert.equal(byState.total, 5);
  const byHost = buildDashboard(rows, { ...DEFAULT_PREFS, grouping: 'host' });
  assert.deepEqual(byHost.groups.map(group => group.label), ['この PC', 'Worker']);
  const byWorkspace = buildDashboard(rows, { ...DEFAULT_PREFS, grouping: 'workspace', sort: 'title' });
  assert.deepEqual(byWorkspace.groups.map(group => group.label), ['この PC · app', 'この PC · C:/work/docs', 'Worker · api']);
  assert.deepEqual(byWorkspace.groups[0].rows.map(row => row.id), ['s-current', 's-sub', 's-old']);
  const top = buildDashboard(rows, { ...DEFAULT_PREFS, filter: 'top', showSubagents: false });
  assert.ok(!top.groups.flatMap(group => group.rows).some(row => row.id === 's-sub'));
  const attention = buildDashboard(rows, { ...DEFAULT_PREFS, filter: 'attention' });
  assert.equal(attention.shown, 2);
  const live = buildDashboard(rows, { ...DEFAULT_PREFS, filter: 'live' });
  assert.ok(live.groups.flatMap(group => group.rows).every(row => row.live !== false));
  const searched = buildDashboard(rows, DEFAULT_PREFS, 'grok');
  assert.deepEqual(searched.groups.flatMap(group => group.rows).map(row => row.id), ['s-current']);
  const collapsed = buildDashboard(rows, toggleCollapsed(DEFAULT_PREFS, 'state:running'));
  assert.equal(collapsed.groups[1].collapsed, true);
  assert.equal(toggleCollapsed(toggleCollapsed(DEFAULT_PREFS, 'x'), 'x').collapsed.length, 0);
});

test('preferences are validated before persisting and tolerate broken storage', () => {
  assert.deepEqual(sanitizePrefs({ grouping: 'host', filter: 'nope', sort: 'title', showSubagents: 'yes', collapsed: ['a', 1, 'b'.repeat(200), 'a'] }), { grouping: 'host', filter: 'all', sort: 'title', showSubagents: true, collapsed: ['a'] });
  assert.equal(sanitizePrefs({ showSubagents: false }).showSubagents, false);
  assert.deepEqual(sanitizePrefs(null), DEFAULT_PREFS);
  assert.deepEqual(loadPrefs({ getItem() { throw new Error('denied'); } }), DEFAULT_PREFS);
  assert.deepEqual(loadPrefs({ getItem: () => '{"grouping":"workspace"' }), DEFAULT_PREFS);
  const store = new Map();
  savePrefs({ setItem: (key, value) => store.set(key, value) }, { ...DEFAULT_PREFS, grouping: 'workspace' });
  assert.equal(JSON.parse(store.get('darask-dashboard:prefs')).grouping, 'workspace');
  assert.doesNotThrow(() => savePrefs({ setItem() { throw new Error('quota'); } }, DEFAULT_PREFS));
});
