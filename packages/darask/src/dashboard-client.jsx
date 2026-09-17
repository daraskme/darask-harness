import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Button, Input, StateDot, Switch } from '@deepseek-ai/dsh-client-ui-primitives';
import { sessionActivity } from './session-activity.mjs';
import { createPeekReader } from './dashboard-peek.mjs';
import { DASHBOARD_PANEL, FILTERS, GROUPINGS, SORTS, buildDashboard, loadPrefs, localRows, remoteRows, rowChips, rowStatusLabel, savePrefs, stateLabel, stateOf, toggleCollapsed } from './dashboard.mjs';

export const DASHBOARD_ENDPOINT = '/api/darask/sessions/dashboard';
const REFRESH_MS = 30000, COLD_CONCURRENCY = 4;
const GROUPING_LABEL = { state: '状態別', host: 'PC 別', workspace: 'ワークスペース別' };
const FILTER_LABEL = { all: 'すべて', attention: '要対応のみ', active: '作業中・要対応', live: '接続中のみ', top: 'トップレベルのみ' };
const SORT_LABEL = { activity: '状態順', updated: '更新順', title: 'タイトル順' };

async function post(body, signal) {
  const response = await fetch(DASHBOARD_ENDPOINT, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: signal ?? AbortSignal.timeout(20000) });
  const value = await response.json();
  if (!response.ok || value.error) throw new Error(value.error || 'セッションを取得できません。');
  return value;
}

export function DashboardIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>;
}

function StatusMark({ row }) {
  const state = stateOf(row), activity = sessionActivity(row), label = rowStatusLabel(row);
  return <span className="darask-session-status darask-dashboard-mark" title={label} data-state={state}>
    {activity === 'error' ? <span className="darask-session-error" aria-hidden="true">×</span>
      : activity ? <StateDot state={activity} />
        : <span className="darask-dashboard-dot" data-state={state} aria-hidden="true" />}
    <span className="darask-visually-hidden">{label}</span>
  </span>;
}

function useRemoteGroups(loadGroups) {
  const [groups, setGroups] = useState([]), [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let reading = false, again = false;
    const refresh = async () => {
      if (reading) { again = true; return; } reading = true;
      do {
        again = false;
        try { const value = await loadGroups(controller.signal); if (!controller.signal.aborted) { setGroups(value?.groups ?? []); setError(''); } }
        catch (e) { if (!controller.signal.aborted) setError(e.message); }
        finally { if (!controller.signal.aborted) setTick(value => value + 1); }
      } while (again && !controller.signal.aborted);
      reading = false;
    };
    void refresh();
    window.addEventListener('darask-workspaces-changed', refresh); window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('darask-workspaces-changed', refresh); window.removeEventListener('focus', refresh); };
  }, [loadGroups]);
  return { groups, error, tick };
}

/** 開いていないリモートワークスペースは読み取り専用一覧（本文は読まない）で状態を補う。 */
function useColdSessions(groups, opened, tick) {
  const [cold, setCold] = useState({});
  const targetKey = useMemo(() => {
    const live = new Set(opened.filter(entry => entry.sessions?.length).map(entry => `${entry.node}:${entry.workspace}`));
    const list = [];
    for (const group of groups) if (group.node !== 'local' && group.status === 'online') for (const workspace of group.workspaces ?? []) {
      const key = `${group.node}:${workspace.id}`;
      if (!live.has(key) && typeof workspace.path === 'string') list.push({ key, node: group.node, cwd: workspace.path });
    }
    return JSON.stringify(list.sort((a, b) => a.key.localeCompare(b.key) || a.cwd.localeCompare(b.cwd)));
  }, [groups, opened]);
  useEffect(() => {
    const queue = JSON.parse(targetKey);
    if (!queue.length) return;
    const controller = new AbortController();
    const worker = async () => {
      for (let target = queue.shift(); target && !controller.signal.aborted; target = queue.shift()) {
        try { const value = await post({ action: 'list', node: target.node, cwd: target.cwd, limit: 50 }, controller.signal); if (!controller.signal.aborted) setCold(current => ({ ...current, [target.key]: { cwd: target.cwd, items: value.items, at: Date.now() } })); }
        catch (e) { if (!controller.signal.aborted) setCold(current => ({ ...current, [target.key]: { cwd: target.cwd, items: current[target.key]?.cwd === target.cwd ? current[target.key].items : [], error: e.message, at: Date.now() } })); }
      }
    };
    void Promise.all(Array.from({ length: Math.min(COLD_CONCURRENCY, queue.length) }, worker));
    return () => controller.abort();
  }, [targetKey, tick]);
  return useMemo(() => {
    const visible = {};
    for (const group of groups) for (const workspace of group.workspaces ?? []) {
      const key = `${group.node}:${workspace.id}`;
      if (cold[key]?.cwd === workspace.path) visible[key] = cold[key];
    }
    return visible;
  }, [groups, cold]);
}

function PeekPane({ target, onClose }) {
  const [state, setState] = useState({ items: [], loading: true, error: '', nextOffset: null, notice: '' });
  const reader = useMemo(() => createPeekReader(post, setState), []);
  const read = (offset, append) => reader.read(target, offset, append);
  useEffect(() => {
    setState({ items: [], loading: true, error: '', nextOffset: null, notice: '' }); void read(0, false);
    return () => reader.cancel();
  }, [target.key, reader]);
  return <aside className="darask-dashboard-peek" aria-label="セッション内容（読み取り専用）">
    <header><div><strong>{target.title}</strong><small>{target.hostName} · {target.workspaceTitle || target.cwd}</small></div><Button variant="ghost" size="sm" onClick={onClose} aria-label="閉じる">×</Button></header>
    {state.notice && <p className="darask-dashboard-notice">{state.notice}</p>}
    <div className="darask-dashboard-messages">
      {state.items.map(item => <div key={item.seq} className="darask-dashboard-message" data-role={item.role}><small>{item.role === 'user' ? 'ユーザー' : 'アシスタント'} · #{item.seq}</small><p>{item.text}{item.truncated ? ' …' : ''}</p></div>)}
      {!state.loading && !state.items.length && !state.error && <p className="darask-dashboard-empty">表示できる本文はありません。</p>}
    </div>
    {state.error && <p className="darask-error" role="alert">{state.error}</p>}
    <footer>{state.loading ? <span>読み込み中…</span> : state.nextOffset !== null && <Button variant="outline" size="sm" onClick={() => read(state.nextOffset, true)}>さらに読む</Button>}</footer>
  </aside>;
}

function DashboardRow({ row, onAttach, onPeek, peeking }) {
  const chips = rowChips(row);
  return <div className="darask-dashboard-row" data-state={stateOf(row)} data-current={row.current || undefined} data-peeking={peeking || undefined}>
    <StatusMark row={row} />
    <button type="button" className="darask-dashboard-title" onClick={() => onAttach(row)} disabled={row.placeholder || undefined} aria-current={row.current ? 'page' : undefined} title={row.node === 'local' ? 'このセッションを開く' : row.observed ? 'リモートのセッションを開く' : 'リモートワークスペースに接続して開く'}>
      <strong>{row.title}</strong>
      <small>{row.hostName}{row.workspaceTitle ? ` · ${row.workspaceTitle}` : ''}{chips.map(chip => <span key={chip} className="darask-dashboard-chip">{chip}</span>)}</small>
    </button>
    {row.id && <Button variant="ghost" size="sm" className="darask-workspace-action" onClick={() => onPeek(row)} aria-label="内容を確認（読み取り専用）" aria-pressed={peeking}>≡</Button>}
  </div>;
}

export function DashboardPanel({ navigation, openLocal, loadGroups, hostName, useSessions, useSessionPendingInteraction, useWorkspaces }) {
  const sessions = useSessions(snapshot => snapshot);
  const pending = useSessionPendingInteraction(snapshot => snapshot);
  const workspaces = useWorkspaces(snapshot => snapshot);
  const opened = useSyncExternalStore(navigation.subscribe, navigation.getOpenedSnapshot, navigation.getOpenedSnapshot);
  const { groups, error, tick } = useRemoteGroups(loadGroups);
  const cold = useColdSessions(groups, opened, tick);
  const [prefs, setPrefs] = useState(() => loadPrefs(window.localStorage));
  const [query, setQuery] = useState(''), [peek, setPeek] = useState(null);
  useEffect(() => savePrefs(window.localStorage, prefs), [prefs]);
  const rows = useMemo(() => [...localRows({ sessions, pending, workspaces, hostName, archived: workspaces?.archivedSessionIds }), ...remoteRows({ groups, opened, cold })], [sessions, pending, workspaces, hostName, groups, opened, cold]);
  const view = useMemo(() => buildDashboard(rows, prefs, query), [rows, prefs, query]);
  const update = patch => setPrefs(current => ({ ...current, ...patch }));
  const attach = row => {
    if (row.placeholder) return;
    if (row.node === 'local') { openLocal(row.id); return; }
    if (row.observed) { navigation.openSession(row.id, row.node, row.workspaceId); return; }
    void navigation.open(row.node, row.workspaceId, { sessionId: row.id });
  };
  return <div className="darask darask-dashboard" data-peek={peek ? '' : undefined}>
    <div className="darask-dashboard-list">
      <header className="darask-dashboard-header">
        <h2>エージェント ダッシュボード</h2>
        <p className="darask-dashboard-counts">{['attention', 'running', 'done', 'idle', 'unobserved'].filter(state => view.counts[state]).map(state => <span key={state} className="darask-dashboard-count" data-state={state}>{stateLabel(state)} {view.counts[state]}</span>)}<span className="darask-dashboard-count">全 {view.total} 件</span></p>
      </header>
      <div className="darask-dashboard-toolbar">
        <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="タイトル・PC・フォルダー・モデルで絞り込み" aria-label="絞り込み" />
        <label className="darask-dashboard-control"><span>グループ化</span><select value={prefs.grouping} onChange={event => update({ grouping: event.target.value })}>{GROUPINGS.map(value => <option key={value} value={value}>{GROUPING_LABEL[value]}</option>)}</select></label>
        <label className="darask-dashboard-control"><span>フィルター</span><select value={prefs.filter} onChange={event => update({ filter: event.target.value })}>{FILTERS.map(value => <option key={value} value={value}>{FILTER_LABEL[value]}</option>)}</select></label>
        <label className="darask-dashboard-control"><span>並べ替え</span><select value={prefs.sort} onChange={event => update({ sort: event.target.value })}>{SORTS.map(value => <option key={value} value={value}>{SORT_LABEL[value]}</option>)}</select></label>
        <span className="darask-dashboard-control"><Switch checked={prefs.showSubagents} onChange={checked => update({ showSubagents: checked })} label="サブエージェントを表示" /><span aria-hidden="true">サブエージェント</span></span>
        <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new Event('darask-workspaces-changed'))}>更新</Button>
      </div>
      {error && <p className="darask-error" role="alert">{error}</p>}
      {view.groups.map(group => <section key={group.id} className="darask-dashboard-group" data-collapsed={group.collapsed || undefined}>
        <h3><button type="button" onClick={() => setPrefs(current => toggleCollapsed(current, group.id))} aria-expanded={!group.collapsed}>
          <span className="darask-dashboard-caret" aria-hidden="true">{group.collapsed ? '▸' : '▾'}</span>{group.label}{group.hint && <small> {group.hint}</small>}<span className="darask-dashboard-group-count">{group.rows.length}</span>
        </button></h3>
        {!group.collapsed && group.rows.map(row => <DashboardRow key={row.key} row={row} onAttach={attach} onPeek={target => setPeek(current => current?.key === target.key ? null : target)} peeking={peek?.key === row.key} />)}
      </section>)}
      {!view.groups.length && <p className="darask-dashboard-empty">{sessions?.phase === 'ready' ? '条件に合うセッションはありません。' : '読み込み中…'}</p>}
    </div>
    {peek && <PeekPane key={peek.key} target={peek} onClose={() => setPeek(null)} />}
  </div>;
}

export function registerDashboardUi(ctx, { navigation, loadGroups }) {
  const inject = () => ({
    navigation, loadGroups,
    hostName: 'この PC',
    openLocal: id => { ctx.sessions.open(id); ctx.layout.selectPanel(null); },
  });
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: DASHBOARD_PANEL, inject }, DashboardPanel));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: DASHBOARD_PANEL, order: 20, label: () => 'ダッシュボード' }, DashboardIcon));
}
