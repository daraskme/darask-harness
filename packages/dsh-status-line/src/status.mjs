// Pure status-line model (shared by host and browser): the `daraskStatus`
// projection fold, the grok-build compatible context document, and the
// built-in line renderer. Token totals and context occupancy are NOT
// re-derived here — the context document is assembled from the upstream
// `tokenUsage`, `contextPressure`, `sessionStats` and `title` projections plus
// this fold's own model/turn/time bookkeeping.

export const PROJECTION_KEY = 'daraskStatus';
export const SCHEMA_VERSION = 1;
export const STATUS_LINE_TYPES = ['builtin', 'command', 'disabled'];
export const STATUS_LINE_ITEMS = ['cwd', 'model', 'context', 'cost', 'turn-timer', 'session-name', 'tokens', 'elapsed', 'turns'];
export const DEFAULT_ITEMS = ['model', 'context', 'cost', 'turn-timer'];

export const zeroBuckets = () => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });

function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function bucketsFrom(usage) {
  return {
    inputTokens: finiteNonNegative(usage?.inputTokens),
    outputTokens: finiteNonNegative(usage?.outputTokens),
    cacheReadTokens: finiteNonNegative(usage?.cacheReadTokens),
    cacheWriteTokens: finiteNonNegative(usage?.cacheWriteTokens),
  };
}

function addBuckets(base, next, previous) {
  const out = {};
  for (const key of Object.keys(base)) out[key] = base[key] - (previous?.[key] ?? 0) + next[key];
  return out;
}

export function modelKey(model) {
  return model === null || model === undefined ? 'unknown' : `${model.provider}/${model.id}`;
}

/** Last usage sample reported by an assistant settlement (mirrors dsh-token-meter's `usageOf`). */
function usageOf(event) {
  if (event.type === 'assistant/message' && event.data.usage !== undefined) return event.data.usage;
  if (event.type !== 'assistant/message' && event.type !== 'assistant/attempt') return undefined;
  const stream = event.data.stream;
  if (!Array.isArray(stream)) return undefined;
  for (let index = stream.length - 1; index >= 0; index--) {
    const chunk = stream[index];
    if (chunk?.type === 'usage' && chunk.usage !== undefined) return chunk.usage;
  }
  return undefined;
}

export function initialStatusState(header) {
  const createdAt = typeof header?.createdAt === 'number' && Number.isFinite(header.createdAt) ? header.createdAt : null;
  return {
    startedAt: createdAt,
    lastEventAt: null,
    model: null,
    contextWindow: null,
    turn: null,
    turns: 0,
    usageByModel: {},
    last: null,
  };
}

/** Pure fold: one committed session event → next status state. */
export function applyStatusEvent(state, event) {
  let next = state;
  const time = typeof event.time === 'number' && Number.isFinite(event.time) ? event.time : null;
  if (time !== null) {
    if (next.startedAt === null || time < next.startedAt) next = { ...next, startedAt: time };
    if (next.lastEventAt === null || time > next.lastEventAt) next = { ...next, lastEventAt: time };
  }
  switch (event.type) {
    case 'request/context': {
      const { provider, model, contextWindow } = event.data;
      if (typeof provider === 'string' && typeof model === 'string' && (next.model?.provider !== provider || next.model.id !== model)) {
        next = { ...next, model: { provider, id: model } };
      }
      const window = typeof contextWindow === 'number' && Number.isInteger(contextWindow) && contextWindow > 0 ? contextWindow : null;
      if (window !== next.contextWindow) next = { ...next, contextWindow: window };
      return next;
    }
    case 'turn/start': {
      const number = finiteNonNegative(event.data.turn);
      return { ...next, turn: { number, startedAt: time ?? next.lastEventAt ?? 0 } };
    }
    case 'turn/end':
      return { ...next, turn: null, turns: next.turns + 1 };
    case 'llm/retry-started': {
      const { turn, step } = event.data;
      return next.last !== null && next.last.turn === turn && next.last.step === step ? { ...next, last: null } : next;
    }
    case 'assistant/attempt':
    case 'assistant/message': {
      const source = event.type === 'assistant/message' ? event.data.message?.source : undefined;
      if (source && typeof source.provider === 'string' && typeof source.model === 'string' && (next.model?.provider !== source.provider || next.model.id !== source.model)) {
        next = { ...next, model: { provider: source.provider, id: source.model } };
      }
      const sample = usageOf(event);
      if (sample === undefined) return next;
      const { turn, step } = event.data;
      const key = modelKey(source ? { provider: source.provider, id: source.model } : next.model);
      const buckets = bucketsFrom(sample);
      const replaces = next.last !== null && next.last.turn === turn && next.last.step === step ? next.last : null;
      const usageByModel = { ...next.usageByModel };
      if (replaces !== null && replaces.modelKey !== key) {
        usageByModel[replaces.modelKey] = addBuckets(usageByModel[replaces.modelKey] ?? zeroBuckets(), zeroBuckets(), replaces.buckets);
        usageByModel[key] = addBuckets(usageByModel[key] ?? zeroBuckets(), buckets, undefined);
      } else {
        usageByModel[key] = addBuckets(usageByModel[key] ?? zeroBuckets(), buckets, replaces?.buckets);
      }
      return { ...next, usageByModel, last: { turn: finiteNonNegative(turn), step: finiteNonNegative(step), modelKey: key, buckets } };
    }
    default:
      return next;
  }
}

/** Glob-ish model matcher: `*` wildcards, case-insensitive, optional `provider/` prefix. */
export function pricingFor(pricing, model) {
  if (!pricing || model === null || model === undefined) return null;
  const candidates = [modelKey(model).toLowerCase(), model.id.toLowerCase()];
  let best = null;
  for (const [pattern, price] of Object.entries(pricing)) {
    const regex = new RegExp(`^${pattern.toLowerCase().split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/gu, '\\$&')).join('.*')}$`, 'u');
    if (!candidates.some(candidate => regex.test(candidate))) continue;
    const specificity = pattern.replace(/\*/gu, '').length;
    if (best === null || specificity > best.specificity) best = { specificity, price };
  }
  return best?.price ?? null;
}

const perMillion = (tokens, rate) => typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 ? tokens * rate / 1e6 : 0;

/** USD cost of the whole session from per-model buckets; `null` when no model matched a price. */
export function totalCostUsd(usageByModel, pricing) {
  let total = 0;
  let priced = false;
  for (const [key, buckets] of Object.entries(usageByModel)) {
    const slash = key.indexOf('/');
    const model = slash === -1 ? { provider: '', id: key } : { provider: key.slice(0, slash), id: key.slice(slash + 1) };
    const price = pricingFor(pricing, model);
    if (price === null) continue;
    priced = true;
    total += perMillion(buckets.inputTokens, price.input)
      + perMillion(buckets.outputTokens, price.output)
      + perMillion(buckets.cacheReadTokens, price.cacheRead ?? price.input)
      + perMillion(buckets.cacheWriteTokens, price.cacheWrite ?? price.input);
  }
  return priced ? total : null;
}

export function statusView(state, pricing) {
  return {
    startedAt: state.startedAt,
    lastEventAt: state.lastEventAt,
    model: state.model,
    contextWindow: state.contextWindow,
    turn: state.turn,
    turns: state.turns,
    usageByModel: state.usageByModel,
    totalCostUsd: totalCostUsd(state.usageByModel, pricing),
  };
}

export function sumBuckets(usageByModel) {
  let total = zeroBuckets();
  for (const buckets of Object.values(usageByModel ?? {})) total = addBuckets(total, buckets, undefined);
  return total;
}

const percent = (used, size) => size > 0 ? Math.min(100, Math.max(0, Math.round(used * 100 / size))) : null;

/**
 * Assemble the grok-build compatible status-line context (`schema_version: 1`).
 * Every field is derived from projections and the session header; `now` is the
 * clock used for elapsed figures.
 */
export function buildStatusContext({ sessionId, header, status, tokenUsage, contextPressure, sessionStats, title, modelSelection, version, now = Date.now(), trigger = 'refresh_interval', running }) {
  const usage = sumBuckets(status?.usageByModel);
  // Before the first request the fold has no model; upstream `modelSelection.next`
  // (pending pick or last used) is what the next turn will run with.
  const selected = modelSelection?.next;
  const model = status?.model ?? (selected && typeof selected.model === 'string' ? { provider: selected.provider, id: selected.model } : null);
  const contextWindow = contextPressure?.contextWindow ?? status?.contextWindow ?? null;
  const contextTokens = contextPressure?.projectedTokens ?? contextPressure?.pressureTokens ?? null;
  const used = contextWindow !== null && contextTokens !== null ? percent(contextTokens, contextWindow) : null;
  const startedAt = status?.startedAt ?? header?.createdAt ?? null;
  const turnRunning = running ?? (status?.turn !== null && status?.turn !== undefined);
  const cwd = header?.cwd ?? '';
  return {
    schema_version: SCHEMA_VERSION,
    cwd,
    session_id: sessionId ?? header?.id ?? null,
    session_name: typeof title === 'string' && title !== '' ? title : null,
    model: {
      id: model?.id ?? null,
      display_name: model?.id ?? null,
      provider: model?.provider ?? null,
    },
    workspace: { current_dir: cwd },
    version,
    cost: {
      total_cost_usd: status?.totalCostUsd ?? null,
      total_duration_ms: startedAt === null ? 0 : Math.max(0, now - startedAt),
      total_api_duration_ms: sessionStats === undefined ? null : Math.round(sessionStats.llmMs),
      total_tool_duration_ms: sessionStats === undefined ? null : Math.round(sessionStats.toolMs),
    },
    context_window: {
      context_window_size: contextWindow,
      context_tokens: contextTokens,
      session_input_tokens: tokenUsage === undefined ? usage.inputTokens : tokenUsage.uncachedInputTokens,
      session_output_tokens: tokenUsage === undefined ? usage.outputTokens : tokenUsage.outputTokens,
      session_usage: {
        input_tokens: tokenUsage === undefined ? usage.inputTokens : tokenUsage.uncachedInputTokens,
        output_tokens: tokenUsage === undefined ? usage.outputTokens : tokenUsage.outputTokens,
        cache_creation_input_tokens: tokenUsage === undefined ? usage.cacheWriteTokens : tokenUsage.cacheWriteTokens,
        cache_read_input_tokens: tokenUsage === undefined ? usage.cacheReadTokens : tokenUsage.cacheReadTokens,
      },
      used_percentage: used,
      remaining_percentage: used === null ? null : 100 - used,
    },
    turn: {
      number: status?.turn?.number ?? status?.turns ?? 0,
      running: turnRunning,
      started_at_ms: status?.turn?.startedAt ?? null,
      completed_turns: status?.turns ?? 0,
      steps: sessionStats?.steps ?? null,
    },
    trigger,
  };
}

export function formatTokens(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  if (value < 1000) return String(Math.round(value));
  if (value < 1e6) return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}K`;
  return `${(value / 1e6).toFixed(value < 1e7 ? 2 : 1)}M`;
}

export function formatDuration(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '—';
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

export function formatCost(usd) {
  if (typeof usd !== 'number' || !Number.isFinite(usd)) return '—';
  if (usd < 0.01 && usd > 0) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function shortCwd(cwd) {
  if (typeof cwd !== 'string' || cwd === '') return '';
  const parts = cwd.replace(/[\\/]+$/u, '').split(/[\\/]/u);
  return parts.at(-1) || cwd;
}

/** Built-in renderer: each item becomes one segment; empty segments drop out. */
export function renderStatusSegments(context, items = DEFAULT_ITEMS, { now = Date.now() } = {}) {
  const segments = [];
  for (const item of items) {
    switch (item) {
      case 'cwd': {
        const text = shortCwd(context.cwd);
        if (text !== '') segments.push({ item, text });
        break;
      }
      case 'model':
        if (context.model.id) segments.push({ item, text: context.model.display_name ?? context.model.id });
        break;
      case 'context': {
        const { context_tokens: tokens, context_window_size: size, used_percentage: used } = context.context_window;
        if (tokens === null && size === null) break;
        segments.push({ item, text: used === null ? formatTokens(tokens) : `${used}% (${formatTokens(tokens)}/${formatTokens(size)})` });
        break;
      }
      case 'tokens': {
        const usage = context.context_window.session_usage;
        segments.push({ item, text: `↑${formatTokens(usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens)} ↓${formatTokens(usage.output_tokens)}` });
        break;
      }
      case 'cost':
        if (context.cost.total_cost_usd !== null) segments.push({ item, text: formatCost(context.cost.total_cost_usd) });
        break;
      case 'turn-timer':
        if (context.turn.running && context.turn.started_at_ms !== null) segments.push({ item, text: `⏱ ${formatDuration(now - context.turn.started_at_ms)}` });
        break;
      case 'elapsed':
        segments.push({ item, text: formatDuration(context.cost.total_duration_ms) });
        break;
      case 'turns':
        segments.push({ item, text: `T${context.turn.completed_turns}` });
        break;
      case 'session-name':
        if (context.session_name) segments.push({ item, text: context.session_name });
        break;
      default:
        break;
    }
  }
  return segments;
}

export function renderStatusLine(context, items = DEFAULT_ITEMS, options = {}) {
  const separator = options.separator ?? ' │ ';
  return renderStatusSegments(context, items, options).map(segment => segment.text).join(separator);
}

/** Normalize a status line emitted by an external command: first line, control characters removed, length-capped. */
export function sanitizeCommandOutput(output, maxChars = 400) {
  if (typeof output !== 'string') return '';
  const line = output.split(/\r?\n/u).find(candidate => candidate.trim() !== '') ?? '';
  // eslint-disable-next-line no-control-regex
  const clean = line.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/gu, '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/gu, '').trim();
  return clean.length > maxChars ? `${clean.slice(0, maxChars - 1)}…` : clean;
}

/** Validate the user-supplied `items` list, keeping known items in order (grok-build semantics: unknown entries are dropped). */
export function normalizeItems(items) {
  if (!Array.isArray(items)) return [...DEFAULT_ITEMS];
  const seen = new Set();
  const out = [];
  for (const raw of items) {
    const item = String(raw).trim().toLowerCase().replace(/_/gu, '-');
    if (!STATUS_LINE_ITEMS.includes(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function normalizeType(type) {
  const text = String(type ?? 'builtin').trim().toLowerCase();
  if (text === 'off' || text === 'none' || text === 'hidden') return 'disabled';
  return STATUS_LINE_TYPES.includes(text) ? text : 'builtin';
}
