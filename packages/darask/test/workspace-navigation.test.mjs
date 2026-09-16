import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceNavigation, REMOTE_PANEL } from '../src/workspace-navigation.mjs';
const response = (node, workspace) => ({ url: '/api/darask/remote?' + new URLSearchParams({ node, workspace }), host: { workspaces: [{ id: workspace, title: 'テスト' }] } });
function fixture(request = async ({ node, workspaceId }) => response(node, workspaceId), initial = 'https://hub.test/') {
  let location = new URL(initial), panel = null, pending = new AbortController(); const visits = [];
  const browser = { get location() { return location; }, history: Object.fromEntries(['pushState', 'replaceState'].map(method => [method, (_state, _title, path) => { location = new URL(path, location); visits.push({ method, path }); }])) };
  const layout = { selectPanel(value) { pending.abort(); panel = value; }, beginNavigation() { pending.abort(); pending = new AbortController(); return pending.signal; }, closeRightbar() {} };
  const navigation = createWorkspaceNavigation({ getLayout: () => layout, getWindow: () => browser, request });
  return { navigation, layout, browser, visits, panel: () => panel };
}
test('remote selection stays in the native hub and restores on reload without an auth token in history', async () => {
  const f = fixture(undefined, 'https://hub.test/?token=test-secret');
  await f.navigation.open('win', 'project');
  assert.equal(f.panel(), REMOTE_PANEL); assert.equal(f.browser.location.pathname, '/');
  assert.equal(f.browser.location.searchParams.get('token'), null); assert.equal(f.browser.location.searchParams.get('pc'), 'win');
  const frame = new URL(f.navigation.getSnapshot().src, f.browser.location);
  assert.equal(frame.searchParams.get('embedded'), '1'); assert.equal(frame.searchParams.get('resource'), '/');
  const reload = fixture(undefined, f.browser.location.href); await reload.navigation.restore();
  assert.equal(reload.navigation.getSnapshot().workspace, 'project'); assert.equal(reload.visits.length, 0);
  reload.layout.selectPanel(null); reload.navigation.observePanel(null);
  assert.equal(reload.navigation.getSnapshot(), null); assert.equal(reload.browser.location.search, '');
  assert.equal(reload.navigation.getOpenedSnapshot().length, 1);
  f.navigation.dispose(); reload.navigation.dispose();
});
test('slow PC responses cannot replace a later PC or a local workspace', async () => {
  const waiting = [];
  const f = fixture(body => new Promise(resolve => waiting.push({ body, resolve })));
  const win = f.navigation.open('win', 'one'), mac = f.navigation.open('mac', 'two');
  waiting[1].resolve(response('mac', 'two')); await mac;
  waiting[0].resolve(response('win', 'one')); await win;
  assert.equal(f.navigation.getSnapshot().node, 'mac');
  const slow = f.navigation.open('win', 'three'); f.layout.selectPanel(null); f.navigation.observePanel(null);
  waiting[2].resolve(response('win', 'three')); await slow;
  assert.equal(f.navigation.getSnapshot(), null); assert.equal(f.panel(), null);
  assert.equal(f.navigation.getOpenedSnapshot().length, 3, 'background loads are retained without replacing the local view'); f.navigation.dispose();
});
test('a failed or invalid connection remains retryable and cannot navigate outside the hub', async () => {
  for (const value of [{ url: 'https://foreign.test/' }, response('other-pc', 'project'), { ...response('win', 'project'), host: { workspaces: [] } }]) {
    const f = fixture(async () => value); await f.navigation.open('win', 'project');
    assert.ok(f.navigation.getSnapshot().error); assert.equal(f.navigation.getSnapshot().src, null);
    assert.equal(f.browser.location.origin, 'https://hub.test'); f.navigation.dispose();
  }
});
test('session commands belong to the selected PC and workspace and detach on unmount', async () => {
  const f = fixture(), commands = []; await f.navigation.open('win', 'project');
  const detach = f.navigation.attachFrame('win', 'project', command => commands.push(command));
  f.navigation.receiveSessions({ node: 'mac', workspace: 'project', sessions: [{ id: 'bad', title: 'other' }] });
  f.navigation.openSession('bad'); assert.equal(commands.length, 0);
  f.navigation.receiveSessions({ node: 'win', workspace: 'project', current: 'one', sessions: [{ id: 'one', title: '既存の会話', running: true, pendingInteraction: 'hack', extra: 'drop' }] });
  assert.equal(f.navigation.getSnapshot().sessions[0].running, true);
  assert.equal(f.navigation.getSnapshot().sessions[0].pendingInteraction, undefined);
  assert.equal(f.navigation.getSnapshot().sessions[0].extra, undefined);
  f.navigation.openSession('one'); assert.equal(commands.length, 1); assert.equal(commands[0].node, 'win');
  f.navigation.receiveSessions({ node: 'win', workspace: 'project', current: 'one', sessions: [{ id: 'one', title: '既存の会話', running: false }] });
  assert.equal(f.navigation.getSnapshot().sessions[0].completed, true);
  f.navigation.startSession('win', 'project'); assert.equal(commands[1].type, 'darask-new-session');
  assert.equal(f.navigation.getSnapshot().current, 'one', 'the host confirms the new selection');
  f.navigation.workspaceChanged('win', 'project', { title: '変更した名前' }); assert.equal(f.navigation.getSnapshot().title, '変更した名前');
  detach(); f.navigation.openSession('one'); assert.equal(commands.length, 2);
  f.navigation.workspaceChanged('win', 'project', { deleted: true }); assert.equal(f.navigation.getSnapshot(), null); assert.equal(f.panel(), null); f.navigation.dispose();
});

test('session rename and archive wait for the matching host confirmation without changing other workspaces', async () => {
  const f = fixture(), commands = [];
  await f.navigation.open('win', 'project');
  const detach = f.navigation.attachFrame('win', 'project', command => commands.push(command));
  f.navigation.receiveSessions({ node: 'win', workspace: 'project', current: 'one', sessions: [{ id: 'one', title: '前の名前' }, { id: 'two', title: '別の会話' }] });
  const renamed = f.navigation.manageSession('win', 'project', 'one', 'rename', '変更後');
  assert.equal(f.navigation.getSnapshot().sessions[0].title, '前の名前');
  f.navigation.receiveSessionResult({ ...commands[0], node: 'wrong', ok: true });
  assert.equal(f.navigation.getSnapshot().sessions[0].title, '前の名前');
  f.navigation.receiveSessionResult({ ...commands[0], ok: true }); await renamed;
  assert.equal(f.navigation.getSnapshot().sessions[0].title, '変更後');
  const failed = f.navigation.manageSession('win', 'project', 'one', 'archive');
  f.navigation.receiveSessionResult({ ...commands[1], ok: false }); await assert.rejects(failed);
  assert.equal(f.navigation.getSnapshot().sessions.length, 2);
  const archived = f.navigation.manageSession('win', 'project', 'one', 'archive');
  f.navigation.receiveSessionResult({ ...commands[2], ok: true }); await archived;
  assert.equal(f.navigation.getSnapshot().sessions[0].id, 'two');
  assert.equal(f.navigation.getSnapshot().sessions[0].title, '別の会話');
  assert.equal(f.navigation.getSnapshot().current, null);
  const forked = f.navigation.manageSession('win', 'project', 'two', 'fork');
  f.navigation.receiveSessionResult({ ...commands[3], ok: true }); await forked;
  assert.equal(f.navigation.getSnapshot().sessions[0].id, 'two');
  await assert.rejects(f.navigation.manageSession('win', 'other', 'two', 'rename', 'wrong'));
  const canceled = f.navigation.manageSession('win', 'project', 'two', 'rename', '未保存');
  detach(); await assert.rejects(canceled); f.navigation.dispose();
});

test('returning to open workspaces reuses frames and sessions without any connection request', async () => {
  let calls = 0;
  const f = fixture(async ({node,workspaceId}) => { calls++; return response(node,workspaceId); });
  const commands = [];
  await f.navigation.open('win','one');
  const first = f.navigation.getSnapshot();
  f.navigation.attachFrame('win','one',command=>commands.push(command));
  f.navigation.receiveSessions({node:'win',workspace:'one',current:'session-a',sessions:[{id:'session-a',title:'会話 A'},{id:'session-b',title:'会話 B'}]});
  await f.navigation.open('win','two');
  const second = f.navigation.getSnapshot();
  f.layout.selectPanel(null); f.navigation.observePanel(null);
  assert.equal(f.navigation.getOpenedSnapshot().length,2);
  const began = performance.now();
  await f.navigation.open('win','one');
  assert.ok(performance.now()-began<100,'returning should only select the retained view');
  assert.equal(calls,2); assert.equal(f.navigation.getSnapshot().src,first.src);
  assert.equal(f.navigation.getSnapshot().sessions.length,2);
  assert.equal(f.navigation.getOpenedSnapshot()[1],second);
  f.layout.selectPanel(null); f.navigation.observePanel(null);
  f.navigation.openSession('session-b','win','one');
  assert.equal(f.navigation.getSnapshot().workspace,'one'); assert.equal(commands[0].session,'session-b');
  assert.equal(calls,2);
  await f.navigation.startSession('win','one');
  assert.equal(commands[1].type,'darask-new-session'); assert.equal(calls,2);
  f.navigation.workspaceChanged('win','two',{deleted:true});
  assert.equal(f.navigation.getOpenedSnapshot().length,1); assert.equal(f.navigation.getSnapshot().workspace,'one');
  f.navigation.dispose(); assert.deepEqual(f.navigation.getOpenedSnapshot(),[]);
});

test('an empty remote hydrate does not close retained session tabs', async () => {
  const f = fixture();
  await f.navigation.open('win', 'project');
  f.navigation.receiveSessions({ node: 'win', workspace: 'project', current: 'one', sessions: [{ id: 'one', title: '開いた会話' }] });
  f.navigation.receiveSessions({ node: 'win', workspace: 'project', sessions: [] });
  assert.equal(f.navigation.getSnapshot().sessions[0].id, 'one');
  f.navigation.receiveSessions({ node: 'win', workspace: 'project', current: 'two', sessions: [{ id: 'two', title: '新しい会話' }] });
  assert.equal(f.navigation.getSnapshot().sessions[0].id, 'two');
  f.navigation.dispose();
});

test('a plus click before the remote UI is ready is delivered when its session list arrives', async () => {
  const f=fixture(), commands=[];
  await f.navigation.open('win','one');
  await f.navigation.startSession('win','one');
  f.navigation.attachFrame('win','one',command=>commands.push(command));
  assert.equal(commands.length,0);
  f.navigation.receiveSessions({node:'win',workspace:'one',sessions:[]});
  assert.equal(commands[0].type,'darask-new-session');
  f.navigation.receiveSessions({node:'win',workspace:'one',sessions:[]});
  assert.equal(commands.length,1); f.navigation.dispose();
});
