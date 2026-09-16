import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStatusEvent,
  buildStatusContext,
  formatCost,
  formatDuration,
  formatTokens,
  initialStatusState,
  normalizeItems,
  normalizeType,
  pricingFor,
  renderStatusLine,
  renderStatusSegments,
  sanitizeCommandOutput,
  statusProjectionDefinition,
  statusStateSchema,
  statusViewSchema,
  totalCostUsd,
} from '../src/index.mjs';

const fold = events => events.reduce(applyStatusEvent, initialStatusState({ createdAt: 1000 }));
const assistant = (turn, step, usage, source = { provider: 'deepseek', model: 'deepseek-chat' }, time = 5000) =>
  ({ type: 'assistant/message', time, data: { turn, step, usage, message: { source } } });

test('fold tracks model, context window, turns and per-model usage; retries replace the same step', () => {
  let state = fold([
    { type: 'request/context', time: 1000, data: { provider: 'deepseek', model: 'deepseek-chat', contextWindow: 128000 } },
    { type: 'turn/start', time: 2000, data: { turn: 1 } },
    assistant(1, 0, { inputTokens: 100, outputTokens: 10, cacheReadTokens: 5, cacheWriteTokens: 0 }),
  ]);
  assert.deepEqual(state.model, { provider: 'deepseek', id: 'deepseek-chat' });
  assert.equal(state.contextWindow, 128000);
  assert.deepEqual(state.turn, { number: 1, startedAt: 2000 });
  assert.equal(state.usageByModel['deepseek/deepseek-chat'].inputTokens, 100);

  state = applyStatusEvent(state, assistant(1, 0, { inputTokens: 120, outputTokens: 12, cacheReadTokens: 0, cacheWriteTokens: 0 }));
  assert.equal(state.usageByModel['deepseek/deepseek-chat'].inputTokens, 120, 'same turn/step replaces instead of adding');
  assert.equal(state.usageByModel['deepseek/deepseek-chat'].cacheReadTokens, 0);

  state = applyStatusEvent(state, { type: 'llm/retry-started', time: 5500, data: { turn: 1, step: 0 } });
  state = applyStatusEvent(state, assistant(1, 0, { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }, { provider: 'xai', model: 'grok-4' }, 6000));
  assert.equal(state.usageByModel['deepseek/deepseek-chat'].inputTokens, 120, 'retry-started clears the replace target');
  assert.equal(state.usageByModel['xai/grok-4'].inputTokens, 1);
  assert.deepEqual(state.model, { provider: 'xai', id: 'grok-4' });

  state = applyStatusEvent(state, { type: 'turn/end', time: 7000, data: { turn: 1, reason: { kind: 'completed' } } });
  assert.equal(state.turn, null);
  assert.equal(state.turns, 1);
  assert.equal(state.startedAt, 1000);
  assert.equal(state.lastEventAt, 7000);
  assert.equal(statusStateSchema.safeParse(state).success, true);
});

test('projection view is schema-valid and prices usage via the pricing getter', () => {
  let pricing = {};
  const definition = statusProjectionDefinition(() => pricing);
  const state = fold([
    { type: 'turn/start', time: 2000, data: { turn: 1 } },
    assistant(1, 0, { inputTokens: 1_000_000, outputTokens: 500_000, cacheReadTokens: 2_000_000, cacheWriteTokens: 0 }),
  ]);
  let view = definition.wire.view(state);
  assert.equal(statusViewSchema.safeParse(view).success, true);
  assert.equal(view.totalCostUsd, null, 'unpriced models report null rather than $0');
  pricing = { 'deepseek/deepseek-*': { input: 0.28, output: 0.42, cacheRead: 0.028 } };
  view = definition.wire.view(state);
  assert.ok(Math.abs(view.totalCostUsd - (0.28 + 0.21 + 0.056)) < 1e-9);
});

test('pricingFor prefers the most specific glob and matches bare model ids', () => {
  const table = { '*': { input: 1, output: 1 }, 'deepseek-*': { input: 2, output: 2 }, 'deepseek/deepseek-chat': { input: 3, output: 3 } };
  assert.equal(pricingFor(table, { provider: 'deepseek', id: 'deepseek-chat' }).input, 3);
  assert.equal(pricingFor(table, { provider: 'deepseek', id: 'deepseek-reasoner' }).input, 2);
  assert.equal(pricingFor(table, { provider: 'xai', id: 'grok-4' }).input, 1);
  assert.equal(pricingFor({}, { provider: 'xai', id: 'grok-4' }), null);
  assert.equal(totalCostUsd({ 'xai/grok-4': { inputTokens: 1e6, outputTokens: 0, cacheReadTokens: 1e6, cacheWriteTokens: 0 } }, { 'grok-4': { input: 3, output: 15 } }), 6, 'cache buckets fall back to the input rate');
});

test('buildStatusContext prefers upstream projections and emits the grok-build shape', () => {
  const status = { startedAt: 1000, lastEventAt: 9000, model: { provider: 'deepseek', id: 'deepseek-chat' }, contextWindow: 64000, turn: { number: 2, startedAt: 8000 }, turns: 1, usageByModel: {}, totalCostUsd: 0.5 };
  const context = buildStatusContext({
    sessionId: 's1',
    header: { cwd: 'C:\\work\\repo', createdAt: 1000 },
    status,
    tokenUsage: { uncachedInputTokens: 10, outputTokens: 20, cacheReadTokens: 30, cacheWriteTokens: 40 },
    contextPressure: { pressureTokens: 32000, projectedTokens: 48000, contextWindow: 128000 },
    sessionStats: { turns: 1, steps: 3, llmMs: 1234.6, toolMs: 10, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 },
    title: 'My session',
    version: 'darask-harness 0.1.0',
    now: 11000,
  });
  assert.equal(context.schema_version, 1);
  assert.equal(context.session_id, 's1');
  assert.equal(context.session_name, 'My session');
  assert.equal(context.model.id, 'deepseek-chat');
  assert.equal(context.context_window.context_window_size, 128000, 'contextPressure window wins over request/context');
  assert.equal(context.context_window.context_tokens, 48000);
  assert.equal(context.context_window.used_percentage, 38);
  assert.equal(context.context_window.remaining_percentage, 62);
  assert.equal(context.context_window.session_input_tokens, 10);
  assert.equal(context.context_window.session_usage.cache_read_input_tokens, 30);
  assert.equal(context.cost.total_cost_usd, 0.5);
  assert.equal(context.cost.total_duration_ms, 10000);
  assert.equal(context.cost.total_api_duration_ms, 1235);
  assert.equal(context.turn.running, true);
  assert.equal(context.turn.number, 2);
  assert.equal(context.trigger, 'refresh_interval');
  assert.equal(JSON.parse(JSON.stringify(context)).cwd, 'C:\\work\\repo');
});

test('buildStatusContext degrades to nulls without projections', () => {
  const context = buildStatusContext({ sessionId: 's2', header: { cwd: '/tmp/x' }, version: 'v', now: 5 });
  assert.equal(context.model.id, null);
  assert.equal(context.context_window.used_percentage, null);
  assert.equal(context.cost.total_cost_usd, null);
  assert.equal(context.cost.total_duration_ms, 0);
  assert.equal(context.turn.running, false);
  assert.equal(renderStatusLine(context, ['model', 'context', 'cost', 'turn-timer']), '');
  assert.equal(renderStatusLine(context, ['cwd', 'turns']), 'x │ T0');
});

test('buildStatusContext falls back to the upstream modelSelection before the first request', () => {
  const selection = { lastUsed: null, next: { provider: 'deepseek', model: 'deepseek-reasoner' } };
  const fresh = buildStatusContext({ sessionId: 's2b', header: { cwd: '/tmp/x' }, modelSelection: selection, version: 'v', now: 5 });
  assert.deepEqual(fresh.model, { id: 'deepseek-reasoner', display_name: 'deepseek-reasoner', provider: 'deepseek' });
  assert.equal(renderStatusLine(fresh, ['model', 'context', 'cost', 'turn-timer']), 'deepseek-reasoner');
  const folded = buildStatusContext({
    sessionId: 's2c',
    header: { cwd: '/tmp/x' },
    status: { startedAt: 0, lastEventAt: 0, model: { provider: 'xai', id: 'grok-4' }, contextWindow: null, turn: null, turns: 1, usageByModel: {}, totalCostUsd: null },
    modelSelection: selection,
    version: 'v',
    now: 5,
  });
  assert.equal(folded.model.id, 'grok-4', 'the fold wins once a request has run');
  assert.equal(buildStatusContext({ sessionId: 's2d', header: {}, modelSelection: { lastUsed: null, next: null }, version: 'v', now: 5 }).model.id, null);
});

test('built-in renderer follows the configured item order and skips empty items', () => {
  const context = buildStatusContext({
    sessionId: 's3',
    header: { cwd: '/home/me/proj' },
    status: { startedAt: 0, lastEventAt: 0, model: { provider: 'xai', id: 'grok-4' }, contextWindow: 100000, turn: { number: 1, startedAt: 0 }, turns: 0, usageByModel: {}, totalCostUsd: 0.0042 },
    contextPressure: { pressureTokens: 25000, projectedTokens: 25000, contextWindow: 100000 },
    tokenUsage: { uncachedInputTokens: 1500, outputTokens: 250, cacheReadTokens: 0, cacheWriteTokens: 0 },
    version: 'v',
    now: 65000,
    running: true,
  });
  const segments = renderStatusSegments(context, ['turn-timer', 'cost', 'context', 'model', 'cwd', 'tokens', 'session-name'], { now: 65000 });
  assert.deepEqual(segments.map(segment => segment.item), ['turn-timer', 'cost', 'context', 'model', 'cwd', 'tokens']);
  assert.deepEqual(segments.map(segment => segment.text), ['⏱ 1m 05s', '$0.0042', '25% (25K/100K)', 'grok-4', 'proj', '↑1.5K ↓250']);
  assert.equal(renderStatusLine(context, ['model', 'context'], { separator: ' | ' }), 'grok-4 | 25% (25K/100K)');
});

test('formatters', () => {
  assert.equal(formatTokens(999), '999');
  assert.equal(formatTokens(1500), '1.5K');
  assert.equal(formatTokens(128000), '128K');
  assert.equal(formatTokens(2_500_000), '2.50M');
  assert.equal(formatTokens(undefined), '—');
  assert.equal(formatDuration(59_000), '59s');
  assert.equal(formatDuration(3_725_000), '1h 02m');
  assert.equal(formatDuration(-1), '—');
  assert.equal(formatCost(12.345), '$12.35');
  assert.equal(formatCost(0.0012), '$0.0012');
  assert.equal(formatCost(null), '—');
});

test('config normalization mirrors grok-build: unknown items dropped, aliases folded', () => {
  assert.deepEqual(normalizeItems(['Model', 'turn_timer', 'bogus', 'model', 'context']), ['model', 'turn-timer', 'context']);
  assert.deepEqual(normalizeItems(undefined), ['model', 'context', 'cost', 'turn-timer']);
  assert.equal(normalizeType('COMMAND'), 'command');
  assert.equal(normalizeType('off'), 'disabled');
  assert.equal(normalizeType('weird'), 'builtin');
});

test('sanitizeCommandOutput keeps the first non-empty line, strips ANSI/control bytes and caps length', () => {
  assert.equal(sanitizeCommandOutput('\n\u001b[32mok\u001b[0m \u0007tail\r\nsecond'), 'ok tail');
  assert.equal(sanitizeCommandOutput('x'.repeat(500), 10), `${'x'.repeat(9)}…`);
  assert.equal(sanitizeCommandOutput(undefined), '');
});
