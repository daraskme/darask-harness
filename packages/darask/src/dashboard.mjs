import { sessionActivity, sessionActivityLabel } from './session-activity.mjs';

// Agent Dashboard model (grok-build xai-grok-dashboard-store の設計を移植)。
// 行は毎回 DSH のセッション一覧・リモート監視・コールド一覧から組み直し、
// このモジュールはグループ化・絞り込み・並べ替え・設定の検証だけを担う。

export const DASHBOARD_PANEL = 'darask-dashboard';
export const DASHBOARD_PREFS_KEY = 'darask-dashboard:prefs';

export const STATES = ['attention', 'running', 'done', 'idle', 'unobserved'];
const STATE_RANK = Object.fromEntries(STATES.map((state, index) => [state, index]));
export const GROUPINGS = ['state', 'host', 'workspace'];
export const FILTERS = ['all', 'attention', 'active', 'live', 'top'];
export const SORTS = ['activity', 'updated', 'title'];
const PENDING = new Set(['approval', 'plan-review', 'question']);

export const DEFAULT_PREFS = Object.freeze({ grouping: 'state', filter: 'all', sort: 'activity', showSubagents: true, collapsed: [] });

export function stateLabel(state) {
  return { attention: '要対応', running: '作業中', done: '完了', idle: '待機', unobserved: '未接続' }[state] ?? '';
}

export function stateOf(row) {
  if (!row) return 'idle';
  if (row.unobserved === true) return row.live === true ? 'running' : 'unobserved';
  const activity = sessionActivity(row);
  if (activity === 'warning' || activity === 'error') return 'attention';
  if (activity === 'ongoing') return 'running';
  if (activity === 'done') return 'done';
  return 'idle';
}

const pendingKind = kind => PENDING.has(kind) ? kind : undefined;
const short = id => String(id ?? '').replace(/^session-/, '').slice(0, 8);
const clampInt = (value, max) => Number.isInteger(value) && value > 0 ? Math.min(value, max) : 0;

/** ローカル PC の行。上流 SessionListState / pendingInteractions / WorkspaceSnapshot を直接読む。 */
export function localRows({ sessions, pending, workspaces, hostName = 'この PC', archived = [] }) {
  if (!sessions || sessions.phase !== 'ready') return [];
  const byId = sessions.byId ?? {};
  const workspaceOf = new Map();
  for (const workspace of workspaces?.items ?? []) for (const id of workspace.sessionIds ?? []) workspaceOf.set(id, workspace);
  const subagents = new Map();
  for (const summary of Object.values(byId)) if (summary?.parentId && summary.running) subagents.set(summary.parentId, (subagents.get(summary.parentId) ?? 0) + 1);
  const hidden = new Set(Array.isArray(archived) ? archived : []);
  const rows = [];
  for (const id of sessions.ids ?? []) {
    const summary = byId[id];
    if (!summary || hidden.has(id) || summary.blank === true) continue;
    const workspace = workspaceOf.get(id);
    const jobs = sessions.jobsBySession?.[id] ?? [];
    const kind = pendingKind(pending?.get?.(id)?.kind);
    const selection = summary.projectionValues?.modelSelection;
    const model = selection?.next?.model ?? selection?.lastUsed?.model;
    rows.push({
      key: `local:${id}`, id, node: 'local', hostName, hostStatus: 'online',
      workspaceId: workspace?.workspaceId, workspaceTitle: workspace?.title ?? summary.cwd ?? '', cwd: summary.cwd ?? workspace?.path ?? '',
      title: summary.displayTitle || summary.title || '新しい会話', subagent: summary.origin === 'subagent' || Boolean(summary.parentId), parentId: summary.parentId,
      running: summary.running === true, completed: summary.completed === true, error: jobs.some(job => job.status === 'failed'),
      runningSubagentCount: clampInt(subagents.get(id), 99), runningJobs: jobs.filter(job => job.status === 'running' || job.status === 'stopping').length, failedJobs: jobs.filter(job => job.status === 'failed').length,
      ...kind ? { pendingInteraction: kind } : {}, model: typeof model === 'string' ? model : undefined,
      updatedAt: Number.isFinite(summary.updatedAt) ? summary.updatedAt : 0, current: sessions.current === id, observed: true,
    });
  }
  return rows;
}

/** 登録済みリモート PC の行。開いているワークスペースは iframe が届けた状態、その他は読み取り専用一覧。 */
export function remoteRows({ groups = [], opened = [], cold = {} }) {
  const openedBy = new Map(opened.map(entry => [`${entry.node}:${entry.workspace}`, entry]));
  const rows = [];
  for (const group of groups) {
    if (!group || group.node === 'local') continue;
    if (group.status !== 'online' && !(group.workspaces ?? []).some(workspace => openedBy.has(`${group.node}:${workspace.id}`) || cold[`${group.node}:${workspace.id}`])) {
      rows.push({ key: `${group.node}:offline`, id: null, node: group.node, hostName: group.name, hostStatus: group.status, workspaceId: undefined, workspaceTitle: '', cwd: '', title: group.status === 'connecting' ? '接続中…' : 'オフライン', unobserved: true, observed: false, updatedAt: 0, placeholder: true });
      continue;
    }
    for (const workspace of group.workspaces ?? []) {
      const key = `${group.node}:${workspace.id}`, entry = openedBy.get(key);
      const base = { node: group.node, hostName: group.name, hostStatus: group.status, workspaceId: workspace.id, workspaceTitle: workspace.title ?? workspace.path ?? '', cwd: workspace.path ?? '' };
      if (entry?.sessions?.length) {
        for (const session of entry.sessions) rows.push({ ...base, key: `${key}:${session.id}`, id: session.id, title: session.title, running: session.running, completed: session.completed, error: session.error,
          runningSubagentCount: clampInt(session.runningSubagentCount, 99), ...session.pendingInteraction ? { pendingInteraction: session.pendingInteraction } : {}, current: entry.current === session.id, observed: true, updatedAt: 0 });
        continue;
      }
      const list = cold[key];
      if (!Array.isArray(list?.items)) { if (entry) rows.push({ ...base, key: `${key}:connecting`, id: null, title: entry.error || (entry.loading ? '接続中…' : 'セッションなし'), unobserved: true, observed: false, updatedAt: 0, placeholder: true }); continue; }
      for (const item of list.items) {
        const createdAt = Date.parse(item.createdAt ?? '');
        rows.push({ ...base, key: `${key}:${item.sessionId}`, id: item.sessionId, title: `セッション ${short(item.sessionId)}`, live: item.live === true, persisted: item.persisted === true,
          unobserved: true, observed: false, updatedAt: Number.isFinite(createdAt) ? createdAt : 0 });
      }
    }
  }
  return rows;
}

export function matchesQuery(row, query) {
  const needle = String(query ?? '').trim().toLocaleLowerCase();
  if (!needle) return true;
  return [row.title, row.hostName, row.workspaceTitle, row.cwd, row.id, row.model].some(value => typeof value === 'string' && value.toLocaleLowerCase().includes(needle));
}

export function matchesFilter(row, filter, state = stateOf(row)) {
  switch (filter) {
    case 'attention': return state === 'attention';
    case 'active': return state === 'attention' || state === 'running';
    case 'live': return row.observed === true || row.live === true;
    case 'top': return !row.subagent;
    default: return true;
  }
}

export function compareRows(a, b, sort) {
  if (sort === 'title') return String(a.title).localeCompare(String(b.title), 'ja') || String(a.key).localeCompare(String(b.key));
  if (sort === 'updated') return (b.updatedAt - a.updatedAt) || String(a.key).localeCompare(String(b.key));
  const rank = STATE_RANK[stateOf(a)] - STATE_RANK[stateOf(b)];
  if (rank) return rank;
  if (Boolean(b.current) !== Boolean(a.current)) return b.current ? 1 : -1;
  return (b.updatedAt - a.updatedAt) || String(a.key).localeCompare(String(b.key));
}

function groupKey(row, grouping) {
  if (grouping === 'host') return { id: `host:${row.node}`, label: row.hostName || row.node, hint: row.hostStatus === 'offline' ? 'オフライン' : '' };
  if (grouping === 'workspace') return { id: `ws:${row.node}:${row.workspaceId ?? row.cwd}`, label: `${row.hostName || row.node} · ${row.workspaceTitle || row.cwd || '（ワークスペースなし）'}`, hint: '' };
  const state = stateOf(row);
  return { id: `state:${state}`, label: stateLabel(state), hint: '' };
}

/** 一覧を 1 回の純粋計算で組み立てる（Grok の frame ごとの再構築と同じ考え）。 */
export function buildDashboard(rows, prefs = DEFAULT_PREFS, query = '') {
  const settings = sanitizePrefs(prefs);
  const counts = Object.fromEntries(STATES.map(state => [state, 0]));
  const grouped = new Map();
  let shown = 0;
  for (const row of rows) {
    if (!row) continue;
    const state = stateOf(row);
    counts[state]++;
    if (!settings.showSubagents && row.subagent) continue;
    if (!matchesQuery(row, query) || !matchesFilter(row, settings.filter, state)) continue;
    const group = groupKey(row, settings.grouping);
    if (!grouped.has(group.id)) grouped.set(group.id, { ...group, rows: [] });
    grouped.get(group.id).rows.push(row);
    shown++;
  }
  const groups = [...grouped.values()].map(group => ({ ...group, rows: group.rows.slice().sort((a, b) => compareRows(a, b, settings.sort)), collapsed: settings.collapsed.includes(group.id) }));
  if (settings.grouping === 'state') groups.sort((a, b) => STATE_RANK[a.id.slice(6)] - STATE_RANK[b.id.slice(6)]);
  else groups.sort((a, b) => (a.id.startsWith('host:local') || a.id.startsWith('ws:local:') ? -1 : 0) - (b.id.startsWith('host:local') || b.id.startsWith('ws:local:') ? -1 : 0) || a.label.localeCompare(b.label, 'ja'));
  return { groups, counts, total: rows.length, shown };
}

/** 行の補足チップ（Grok の chips）。 */
export function rowChips(row) {
  const chips = [];
  if (row.subagent) chips.push('サブエージェント');
  if (row.runningSubagentCount > 0) chips.push(`サブ ${row.runningSubagentCount}`);
  if (row.runningJobs > 0) chips.push(`ジョブ ${row.runningJobs}`);
  if (row.failedJobs > 0) chips.push(`ジョブ失敗 ${row.failedJobs}`);
  if (row.pendingInteraction) chips.push({ approval: '許可待ち', 'plan-review': '計画レビュー', question: '質問' }[row.pendingInteraction]);
  if (row.model) chips.push(row.model);
  if (row.unobserved && row.live) chips.push('稼働中');
  if (row.unobserved && !row.live && row.persisted) chips.push('保存済み');
  if (row.hostStatus === 'offline') chips.push('オフライン');
  return chips;
}

export function rowStatusLabel(row) {
  const state = stateOf(row);
  if (state === 'unobserved') return row.placeholder ? row.title : '未接続（読み取り専用）';
  const activity = sessionActivity(row);
  return activity ? sessionActivityLabel(activity) : stateLabel(state);
}

export function sanitizePrefs(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    grouping: GROUPINGS.includes(input.grouping) ? input.grouping : DEFAULT_PREFS.grouping,
    filter: FILTERS.includes(input.filter) ? input.filter : DEFAULT_PREFS.filter,
    sort: SORTS.includes(input.sort) ? input.sort : DEFAULT_PREFS.sort,
    showSubagents: input.showSubagents !== false,
    collapsed: Array.isArray(input.collapsed) ? [...new Set(input.collapsed.filter(id => typeof id === 'string' && id.length <= 120))].slice(0, 200) : [],
  };
}

export function loadPrefs(storage) {
  try { return sanitizePrefs(JSON.parse(storage?.getItem(DASHBOARD_PREFS_KEY) ?? 'null')); } catch { return { ...DEFAULT_PREFS, collapsed: [] }; }
}

export function savePrefs(storage, prefs) {
  try { storage?.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(sanitizePrefs(prefs))); } catch { /* 保存できなくても一覧は動く */ }
}

export function toggleCollapsed(prefs, groupId) {
  const settings = sanitizePrefs(prefs);
  const collapsed = settings.collapsed.includes(groupId) ? settings.collapsed.filter(id => id !== groupId) : [...settings.collapsed, groupId];
  return { ...settings, collapsed };
}
