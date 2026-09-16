// @darask/dsh-status-line — browser half. Renders one status line in the
// upstream `conversation.session.header.utilities` slot from the session's own
// projections (`daraskStatus`, `tokenUsage`, `contextPressure`, `sessionStats`,
// `title`); when the host is configured for an external command, the rendered
// text is fetched from `/api/darask/status-line` instead.

import React, { useEffect, useMemo, useState } from 'react';
import { buildStatusContext, formatCost, formatDuration, formatTokens, renderStatusSegments } from './status.mjs';

export const name = 'darask-status-line-client';
export const inject = ['slots', 'locale'];

const NS = 'darask-status-line';
const CONFIG_PATH = '/api/darask/status-line/config';
const LINE_PATH = '/api/darask/status-line';
const STYLE_ID = '@darask/dsh-status-line/status.css';

const ja = {
  'label.cwd': '作業ディレクトリ',
  'label.model': 'モデル',
  'label.context': 'コンテキスト使用率',
  'label.cost': '推定コスト (USD)',
  'label.turn-timer': 'このターンの経過時間',
  'label.elapsed': 'セッション経過時間',
  'label.tokens': '入出力トークン',
  'label.turns': '完了ターン数',
  'label.session-name': 'セッション名',
  'detail.input': '入力',
  'detail.output': '出力',
  'detail.cacheRead': 'キャッシュ読取',
  'detail.cacheWrite': 'キャッシュ書込',
  'detail.api': 'LLM 時間',
  'detail.tool': 'ツール時間',
  'detail.noPrice': '料金表未設定 (status-line.json の pricing で設定)',
  'state.running': '実行中',
  'state.idle': '待機中',
  'error.command': '外部コマンドが失敗したため内蔵表示にフォールバックしました',
};

const en = {
  'label.cwd': 'Working directory',
  'label.model': 'Model',
  'label.context': 'Context usage',
  'label.cost': 'Estimated cost (USD)',
  'label.turn-timer': 'Elapsed in this turn',
  'label.elapsed': 'Session elapsed',
  'label.tokens': 'Input / output tokens',
  'label.turns': 'Completed turns',
  'label.session-name': 'Session name',
  'detail.input': 'Input',
  'detail.output': 'Output',
  'detail.cacheRead': 'Cache read',
  'detail.cacheWrite': 'Cache write',
  'detail.api': 'LLM time',
  'detail.tool': 'Tool time',
  'detail.noPrice': 'No pricing configured (set pricing in status-line.json)',
  'state.running': 'Running',
  'state.idle': 'Idle',
  'error.command': 'External command failed; showing the built-in line',
};

const css = `
.darask-status-line{display:inline-flex;align-items:center;gap:6px;max-width:48vw;overflow:hidden;font:11px/1 var(--dsw-font-mono,ui-monospace,Menlo,Consolas,monospace);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.darask-status-line[data-running="true"] .darask-status-line__seg[data-item="turn-timer"]{color:var(--dsw-alias-label-primary)}
.darask-status-line__seg{display:inline-flex;align-items:center;overflow:hidden;text-overflow:ellipsis}
.darask-status-line__seg+.darask-status-line__seg::before{content:"│";margin-right:6px;opacity:.45}
.darask-status-line__seg[data-item="context"][data-level="warn"]{color:var(--dsw-alias-warning,#c58a00)}
.darask-status-line__seg[data-item="context"][data-level="critical"]{color:var(--dsw-alias-danger,#d33)}
.darask-status-line__error{color:var(--dsw-alias-danger,#d33)}
`;

function ensureStyle() {
  if (typeof document === 'undefined' || document.querySelector(`style[data-plugin-css=${JSON.stringify(STYLE_ID)}]`) !== null) return;
  const tag = document.createElement('style');
  tag.dataset.plugin = '@darask/dsh-status-line';
  tag.dataset.pluginCss = STYLE_ID;
  tag.textContent = css;
  document.head.appendChild(tag);
}

async function fetchJson(path, signal) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body;
}

function useNow(intervalMs, enabled) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), Math.max(250, intervalMs));
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
}

function contextLevel(used) {
  if (used === null) return 'ok';
  if (used >= 90) return 'critical';
  if (used >= 75) return 'warn';
  return 'ok';
}

function tooltipFor(item, context, t) {
  const usage = context.context_window.session_usage;
  switch (item) {
    case 'context':
      return `${t('label.context')}: ${formatTokens(context.context_window.context_tokens)} / ${formatTokens(context.context_window.context_window_size)}`;
    case 'cost':
      return `${t('label.cost')}: ${formatCost(context.cost.total_cost_usd)} · ${t('detail.input')} ${formatTokens(usage.input_tokens)} · ${t('detail.output')} ${formatTokens(usage.output_tokens)} · ${t('detail.cacheRead')} ${formatTokens(usage.cache_read_input_tokens)} · ${t('detail.cacheWrite')} ${formatTokens(usage.cache_creation_input_tokens)}`;
    case 'tokens':
      return `${t('detail.input')} ${formatTokens(usage.input_tokens)} · ${t('detail.output')} ${formatTokens(usage.output_tokens)} · ${t('detail.cacheRead')} ${formatTokens(usage.cache_read_input_tokens)} · ${t('detail.cacheWrite')} ${formatTokens(usage.cache_creation_input_tokens)}`;
    case 'elapsed':
    case 'turn-timer':
      return `${t(`label.${item}`)} · ${t('detail.api')} ${formatDuration(context.cost.total_api_duration_ms)} · ${t('detail.tool')} ${formatDuration(context.cost.total_tool_duration_ms)}`;
    case 'model':
      return `${t('label.model')}: ${context.model.provider ?? ''}/${context.model.id ?? ''} · ${context.turn.running ? t('state.running') : t('state.idle')}`;
    case 'cwd':
      return `${t('label.cwd')}: ${context.cwd}`;
    default:
      return t(`label.${item}`);
  }
}

export function StatusLine(props) {
  const { sessionId, useProjection, useSessions, useStatusConfig, useModelDirectory, t } = props;
  const config = useStatusConfig(state => state);
  const status = useProjection('daraskStatus');
  const tokenUsage = useProjection('tokenUsage');
  const contextPressure = useProjection('contextPressure');
  const sessionStats = useProjection('sessionStats');
  const title = useProjection('title');
  const modelSelection = useProjection('modelSelection');
  const directoryModel = useModelDirectory(state => state?.current ?? null);
  const entry = useSessions(list => list.byId[String(sessionId)]);
  const running = entry?.running ?? (status?.turn !== null && status?.turn !== undefined);
  const tickingItems = config.type === 'builtin' && config.items.includes('turn-timer') && running;
  const now = useNow(config.refreshIntervalMs, tickingItems);
  useEffect(ensureStyle, []);

  const context = useMemo(() => buildStatusContext({
    sessionId: String(sessionId),
    header: { cwd: entry?.cwd ?? '', createdAt: status?.startedAt ?? undefined },
    status: status ?? undefined,
    tokenUsage: tokenUsage ?? undefined,
    contextPressure: contextPressure ?? undefined,
    sessionStats: sessionStats ?? undefined,
    title: title ?? undefined,
    modelSelection: modelSelection?.next ? modelSelection : (directoryModel ? { next: directoryModel } : undefined),
    version: config.version ?? '',
    now,
    running,
  }), [sessionId, entry?.cwd, status, tokenUsage, contextPressure, sessionStats, title, modelSelection, directoryModel, now, running, config.version]);

  const [remote, setRemote] = useState(null);
  useEffect(() => {
    if (config.type !== 'command') { setRemote(null); return undefined; }
    const controller = new AbortController();
    let timer;
    const tick = async () => {
      try {
        const result = await fetchJson(`${LINE_PATH}?session=${encodeURIComponent(String(sessionId))}&trigger=${running ? 'turn' : 'refresh_interval'}`, controller.signal);
        if (!controller.signal.aborted) setRemote(result);
      } catch (error) {
        if (!controller.signal.aborted) setRemote({ text: '', error: error instanceof Error ? error.message : String(error) });
      }
      if (!controller.signal.aborted) timer = setTimeout(tick, Math.max(1000, config.commandRefreshIntervalMs));
    };
    void tick();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [config.type, config.commandRefreshIntervalMs, sessionId, running, status?.turns, status?.lastEventAt]);

  if (config.type === 'disabled') return null;
  const padding = config.padding > 0 ? { padding: `0 ${config.padding * 4}px` } : undefined;
  if (config.type === 'command') {
    if (remote === null) return null;
    return (
      <div className="darask-status-line" data-running={String(running)} style={padding} title={remote.error ? `${t('error.command')}: ${remote.error}` : undefined}>
        <span className={remote.error && remote.text === '' ? 'darask-status-line__seg darask-status-line__error' : 'darask-status-line__seg'} data-item="command">{remote.text !== '' ? remote.text : (remote.error ? t('error.command') : '')}</span>
      </div>
    );
  }
  const segments = renderStatusSegments(context, config.items, { now });
  if (segments.length === 0) return null;
  return (
    <div className="darask-status-line" data-running={String(running)} style={padding} aria-live="off">
      {segments.map(segment => (
        <span
          key={segment.item}
          className="darask-status-line__seg"
          data-item={segment.item}
          data-level={segment.item === 'context' ? contextLevel(context.context_window.used_percentage) : undefined}
          title={tooltipFor(segment.item, context, t)}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
}

const DEFAULT_CONFIG = { type: 'builtin', items: ['model', 'context', 'cost', 'turn-timer'], refreshIntervalMs: 1000, commandRefreshIntervalMs: 5000, padding: 0, version: '' };

/** Tiny observable store for the host-provided public config. */
function configStore() {
  let value = DEFAULT_CONFIG;
  const listeners = new Set();
  return {
    getSnapshot: () => value,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    set(next) { value = { ...DEFAULT_CONFIG, ...next }; for (const listener of listeners) listener(); },
  };
}

const NULL_STORE = { getSnapshot: () => null, subscribe: () => () => {} };

/** Upstream per-session model directory (`ctx.modelDirectories`): supplies the
 * catalog default when the session has not picked or used a model yet. */
function modelDirectoryStore(ctx, sessionId) {
  const directories = ctx.get('modelDirectories');
  if (directories === undefined || sessionId === undefined) return NULL_STORE;
  try {
    return directories.directoryFor(sessionId).store;
  } catch {
    return NULL_STORE;
  }
}

export function apply(ctx) {
  const store = configStore();
  ctx.effect(() => ctx.locale.register(NS, { ja, en }), 'darask-status-line: dictionaries');
  const controller = new AbortController();
  const load = async () => {
    try {
      store.set(await fetchJson(CONFIG_PATH, controller.signal));
    } catch (error) {
      if (!controller.signal.aborted) console.warn('darask-status-line: config unavailable', error);
    }
  };
  void load();
  const refresh = setInterval(load, 60000);
  ctx.effect(() => () => { controller.abort(); clearInterval(refresh); }, 'darask-status-line: config polling');
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'darask-status-line',
    order: -20,
    locale: NS,
    inject: sessionId => ({ hooks: { statusConfig: store, modelDirectory: modelDirectoryStore(ctx, sessionId) } }),
  }, StatusLine));
}
