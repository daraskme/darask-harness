// @darask/dsh-memory — cross-session memory for DeepSeek Harness, a JavaScript
// port of grok-build's Memory v2: completed turns are distilled by a tool-less
// auxiliary model call into immutable observations (global scope for user /
// feedback, workspace scope for project / reference), indexed with SQLite FTS5,
// listed in a generated MEMORY.md, and periodically consolidated into curated
// topics ("Dream"). Session persistence and compaction stay with upstream DSH.

import { createHash, randomUUID } from 'node:crypto';
import z from '@deepseek-ai/schemastery';
import { BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { deadline } from '@deepseek-ai/dsh-timeout';
import { defineTool } from '@deepseek-ai/dsh-tools';

import { renderScopeManifest } from './manifest.mjs';
import { PROMPT_VERSION, parseModelOutcome } from './observation.mjs';
import { MemoryPathError, SCOPES, findWorkspaceRoot, scopeDirFor } from './paths.mjs';
import {
  CAPTURE_SYSTEM_PROMPT,
  DREAM_SYSTEM_PROMPT,
  parseDreamPlan,
  renderCaptureUserMessage,
  renderDreamUserMessage,
  renderMemoryContext,
} from './prompts.mjs';
import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT, MemoryScopeStore } from './store.mjs';
import { condenseTranscript } from './transcript.mjs';
import { utf8Length } from './text.mjs';

export { renderScopeManifest };
export * from './manifest.mjs';
export * from './observation.mjs';
export * from './paths.mjs';
export * from './prompts.mjs';
export * from './store.mjs';
export * from './transcript.mjs';

export const name = 'darask-memory';
export const inject = ['tools', 'llm', 'commands'];

export const Config = z.object({
  dshHome: z.string(),
  capture: z.boolean().default(true),
  injectContext: z.boolean().default(true),
  dream: z.boolean().default(true),
  provider: z.string(),
  model: z.string(),
  workspaceRootMarkers: z.array(z.string()).default(['.git']),
  captureMaxTurnsPerJob: z.number().default(6),
  captureMaxInputBytes: z.number().default(48 * 1024),
  captureMaxOutputTokens: z.number().default(4096),
  captureTimeoutMs: z.number().default(4 * 60 * 1000),
  dreamMinPending: z.number().default(20),
  dreamMaxPendingAgeMs: z.number().default(24 * 60 * 60 * 1000),
  dreamMaxClaimed: z.number().default(128),
  dreamMaxOutputTokens: z.number().default(16 * 1024),
  dreamTimeoutMs: z.number().default(4 * 60 * 1000),
  dreamLeaseMs: z.number().default(10 * 60 * 1000),
  archiveRetentionDays: z.number().default(90),
  manifestMaxBytes: z.number().default(24 * 1024),
  manifestMaxEntries: z.number().default(200),
  contextBudgetBytes: z.number().default(32 * 1024),
});

const CONTEXT_MARKER = 'darask-memory:context:';
const GLOBAL_TYPES = new Set(['user', 'feedback']);

function pluginMessage(text) {
  return createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'plugin', plugin: name, form: 'instructions' } });
}

function finishError(finish) {
  if (finish.kind === 'stop') return undefined;
  if (finish.kind === 'error' || finish.kind === 'aborted') {
    const error = new Error(finish.failure?.message ?? `model finished with ${finish.kind}`);
    error.code = finish.failure?.code ?? finish.kind;
    return error;
  }
  return new Error(`model finished with ${finish.kind}`);
}

/** Session events from the first turn's opening user message through the last turn's end. */
export function sliceTurnEvents(events, fromTurn, throughTurn) {
  let start = events.findIndex(event => event.type === 'turn/start' && event.data?.turn === fromTurn);
  if (start < 0) return [];
  while (start > 0 && events[start - 1].type === 'user/message') start -= 1;
  let end = events.findIndex((event, index) => index >= start && event.type === 'turn/end' && event.data?.turn === throughTurn);
  if (end < 0) end = events.length - 1;
  return events.slice(start, end + 1);
}

export function apply(ctx, config) {
  const resolved = { ...config, dshHome: resolveDshHome(config.dshHome) };
  const manifestBudget = { maxBytes: resolved.manifestMaxBytes, maxEntries: resolved.manifestMaxEntries };
  const owner = `${process.pid}:${randomUUID()}`;
  const stores = new Map();
  const captureQueues = new Map();
  const injected = new WeakMap();
  const pending = new Set();

  const track = promise => {
    pending.add(promise);
    const retire = () => pending.delete(promise);
    promise.then(retire, retire);
    return promise;
  };

  const storeFor = (scope, workspaceRoot) => {
    const dir = scopeDirFor(resolved.dshHome, scope, workspaceRoot);
    let opening = stores.get(dir);
    if (opening === undefined) {
      opening = MemoryScopeStore.open(dir, { scope, manifestBudget }).catch(error => {
        stores.delete(dir);
        throw error;
      });
      stores.set(dir, opening);
    }
    return opening;
  };

  const workspaceRootFor = async cwd => findWorkspaceRoot(cwd ?? process.cwd(), resolved.workspaceRootMarkers);

  const scopeStores = async cwd => {
    const workspaceRoot = await workspaceRootFor(cwd);
    const [global, workspace] = await Promise.all([storeFor('global', undefined), storeFor('workspace', workspaceRoot)]);
    return { workspaceRoot, global, workspace };
  };

  const routeFor = session => {
    if (resolved.provider !== undefined && resolved.model !== undefined) return { provider: resolved.provider, model: resolved.model };
    const context = session?.requestContext?.();
    return context ? { provider: context.provider, model: context.model } : undefined;
  };

  async function auxiliaryCall({ session, route, system, text, maxTokens, timeoutMs, signal }) {
    const callDeadline = deadline(signal, timeoutMs, 'DARASK_MEMORY_TIMEOUT');
    try {
      const assembler = new BlockAssembler();
      const stream = ctx.llm.stream({
        provider: route.provider,
        model: route.model,
        messages: [createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'plugin', plugin: name } })],
        system,
        maxTokens,
        sessionId: session?.id,
        purpose: 'compaction',
        signal: callDeadline.signal,
      });
      for await (const chunk of stream) {
        callDeadline.signal.throwIfAborted();
        assembler.push(chunk);
      }
      const failure = finishError(assembler.finish);
      if (failure) throw failure;
      const blocks = assembler.blocks();
      if (blocks.some(block => block.type === 'tool-call')) throw new Error('memory: auxiliary model output must be text only');
      return blocks.filter(block => block.type === 'text').map(block => block.text).join('\n');
    } finally {
      callDeadline[Symbol.dispose]?.();
    }
  }

  // ---- capture -------------------------------------------------------------

  async function captureRange(session, throughTurn) {
    const route = routeFor(session);
    if (!route) return;
    const { workspaceRoot, global, workspace } = await scopeStores(session.header.cwd);
    const done = workspace.captureProgress(session.id);
    if (throughTurn <= done) return;
    const fromTurn = Math.max(done + 1, throughTurn - resolved.captureMaxTurnsPerJob + 1);
    const events = sliceTurnEvents(session.snapshotEvents(), fromTurn, throughTurn);
    const transcript = condenseTranscript(events, { fromTurn, throughTurn, budget: resolved.captureMaxInputBytes });
    if (transcript.items.length === 0) {
      workspace.setCaptureProgress(session.id, throughTurn);
      return;
    }
    const text = await auxiliaryCall({
      session,
      route,
      system: CAPTURE_SYSTEM_PROMPT,
      text: renderCaptureUserMessage({ scope: 'workspace', workspaceRoot, fromTurn, throughTurn, transcript: transcript.text, existingTopics: [...global.topics(), ...workspace.topics()] }),
      maxTokens: resolved.captureMaxOutputTokens,
      timeoutMs: resolved.captureTimeoutMs,
    });
    const outcome = parseModelOutcome(text, { model: route.model, createdAt: Date.now() });
    const job = { sessionId: session.id, fromTurn, throughTurn };
    const touched = new Set();
    if (outcome.outcome === 'observations') {
      const globalDrafts = outcome.observations.filter(draft => GLOBAL_TYPES.has(draft.type));
      const workspaceDrafts = outcome.observations.filter(draft => !GLOBAL_TYPES.has(draft.type));
      if (globalDrafts.length > 0) { await global.persistObservations(globalDrafts, job); touched.add(global); }
      if (workspaceDrafts.length > 0) { await workspace.persistObservations(workspaceDrafts, job); touched.add(workspace); }
    }
    workspace.setCaptureProgress(session.id, throughTurn);
    for (const store of touched) {
      await store.regenerateManifest();
      if (resolved.dream) await maybeDream(store, session);
    }
    ctx.logger.debug('memory capture %s turns %d-%d: %s (%d observations)', session.id, fromTurn, throughTurn, outcome.outcome, outcome.observations.length);
  }

  const enqueueCapture = (session, throughTurn) => {
    const previous = captureQueues.get(session.id) ?? Promise.resolve();
    const next = previous.then(() => captureRange(session, throughTurn)).catch(error => {
      ctx.logger.warn('memory capture failed for %s: %o', session.id, error);
    });
    captureQueues.set(session.id, next);
    track(next).finally(() => {
      if (captureQueues.get(session.id) === next) captureQueues.delete(session.id);
    });
  };

  // ---- Dream ---------------------------------------------------------------

  function dreamEligible(store) {
    const stats = store.pendingStats();
    if (stats.count === 0) return false;
    if (stats.count >= resolved.dreamMinPending) return true;
    return stats.oldestCreatedAt !== undefined && Date.now() - stats.oldestCreatedAt >= resolved.dreamMaxPendingAgeMs;
  }

  async function dream(store, session, route, { force = false } = {}) {
    if (!force && !dreamEligible(store)) return { status: 'skipped', reason: 'not-eligible' };
    if (!store.acquireLease('dream', owner, resolved.dreamLeaseMs)) return { status: 'skipped', reason: 'lease-held' };
    const claimed = store.pendingObservations(resolved.dreamMaxClaimed);
    if (claimed.length === 0) { store.releaseLease('dream', owner); return { status: 'skipped', reason: 'nothing-pending' }; }
    const dreamId = store.recordDream({ startedAt: Date.now(), model: route.model, claimed: claimed.length });
    try {
      const topics = [];
      for (const topic of store.topics()) topics.push({ path: topic.path, content: (await store.read(topic.path)).content });
      const observations = [];
      for (const observation of claimed) observations.push({ path: observation.path, content: (await store.read(observation.path)).content });
      const text = await auxiliaryCall({
        session,
        route,
        system: DREAM_SYSTEM_PROMPT,
        text: renderDreamUserMessage({ scope: store.scope, topics, observations }),
        maxTokens: resolved.dreamMaxOutputTokens,
        timeoutMs: resolved.dreamTimeoutMs,
      });
      const plan = parseDreamPlan(text);
      const result = await store.applyDreamPlan(plan, claimed.map(observation => observation.path));
      await store.pruneArchive(resolved.archiveRetentionDays * 24 * 60 * 60 * 1000);
      await store.regenerateManifest();
      store.recordDream({ id: dreamId, finishedAt: Date.now(), operations: plan.operations.length, status: 'completed' });
      ctx.logger.info('memory dream (%s): %d operations, %d observations archived', store.scope, plan.operations.length, result.archived.length);
      return { status: 'completed', operations: plan.operations.length, archived: result.archived.length, written: result.written, deleted: result.deleted };
    } catch (error) {
      store.recordDream({ id: dreamId, finishedAt: Date.now(), status: 'failed', error: String(error instanceof Error ? error.message : error).slice(0, 1024) });
      throw error;
    } finally {
      store.releaseLease('dream', owner);
    }
  }

  async function maybeDream(store, session) {
    const route = routeFor(session);
    if (!route || !dreamEligible(store)) return;
    try {
      await dream(store, session, route);
    } catch (error) {
      ctx.logger.warn('memory dream failed (%s): %o', store.scope, error);
    }
  }

  // ---- hooks ---------------------------------------------------------------

  if (resolved.capture) {
    ctx.on('session/event', (session, event) => {
      if (event.type !== 'turn/end' || event.data?.reason !== 'completed') return;
      if (session.header.origin === 'subagent') return;
      enqueueCapture(session, event.data.turn);
    });
  }

  if (resolved.injectContext) {
    ctx.on('agent/pre-step', async ({ agent, messages, signal }, next) => {
      const decision = await next();
      if (decision.kind === 'reject') return decision;
      const session = agent.session;
      if (session.header.origin === 'subagent' || injected.has(session)) return decision;
      let alreadyInjected = false;
      for (const seq of session.surface.nodes) {
        const event = session.eventAt(seq);
        if (event?.type === 'user/message' && event.data.source.kind === 'plugin' && event.data.source.plugin === name) { alreadyInjected = true; break; }
      }
      injected.set(session, true);
      if (alreadyInjected) return decision;
      let context;
      try {
        const { global, workspace } = await scopeStores(session.header.cwd);
        context = renderMemoryContext({
          scopes: [{ scope: 'global', manifest: await global.manifestText() }, { scope: 'workspace', manifest: await workspace.manifestText() }],
          budget: resolved.contextBudgetBytes,
        });
      } catch (error) {
        ctx.logger.warn('memory context injection failed: %o', error);
        return decision;
      }
      signal.throwIfAborted();
      if (context === undefined) return decision;
      const identity = createHash('sha1').update(context).digest('hex');
      const message = pluginMessage(`${context}\n<!-- ${CONTEXT_MARKER}${identity} -->`);
      const lastClaimed = decision.messages.findLastIndex(entry => messages.includes(entry));
      return { ...decision, messages: decision.messages.toSpliced(lastClaimed + 1, 0, message) };
    });
  }

  // ---- tools ---------------------------------------------------------------

  const scopeArg = value => {
    if (value === undefined || value === null || value === 'all') return 'all';
    if (!SCOPES.includes(value)) throw new Error(`scope must be one of all, ${SCOPES.join(', ')}`);
    return value;
  };

  ctx.tools.register(defineTool({
    name: 'memory_search',
    description: [
      'Search durable memory from past sessions (curated topics and recent observations) with a lexical query.',
      'Results are historical context: verify paths, commands and repository state with live tools before relying on them.',
      'Use memory_get with a returned path to read the full entry.',
    ].join('\n'),
    parameters: {
      query: { type: 'string', required: true, description: 'Keywords or a short phrase. Terms are OR-combined and ranked; Japanese text is matched by character trigrams.' },
      scope: { type: 'string', description: 'all (default), global (user-wide) or workspace (this repository).' },
      limit: { type: 'number', description: `Maximum results, 1-${MAX_SEARCH_LIMIT}. Defaults to ${DEFAULT_SEARCH_LIMIT}.` },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', required: true },
          results: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                scope: { type: 'string', required: true },
                path: { type: 'string', required: true },
                kind: { type: 'string', required: true },
                title: { type: 'string', required: true },
                snippet: { type: 'string', required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => {
        if (value.results.length === 0) return [{ type: 'text', text: `No memory matched "${value.query}".` }];
        const lines = value.results.map(result => `- [${result.scope}] ${result.path} (${result.kind}) — ${result.title}${result.snippet ? `\n  ${result.snippet}` : ''}`);
        return [{ type: 'text', text: `Memory results for "${value.query}" (historical context; verify before use):\n${lines.join('\n')}` }];
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      if (typeof args.query !== 'string' || args.query.trim() === '') throw new Error('query must be a non-empty string');
      if (utf8Length(args.query) > 1024) throw new Error('query is too long');
      const scope = scopeArg(args.scope);
      const limit = args.limit === undefined ? DEFAULT_SEARCH_LIMIT : Number(args.limit);
      if (!Number.isFinite(limit) || limit < 1 || limit > MAX_SEARCH_LIMIT) throw new Error(`limit must be between 1 and ${MAX_SEARCH_LIMIT}`);
      const { global, workspace } = await scopeStores(exec.agent?.session.header.cwd);
      const results = [];
      for (const [scopeName, store] of [['global', global], ['workspace', workspace]]) {
        if (scope !== 'all' && scope !== scopeName) continue;
        for (const hit of store.search(args.query, { limit })) results.push({ scope: scopeName, path: hit.path, kind: hit.kind, title: hit.title, snippet: hit.snippet, score: hit.score });
      }
      results.sort((a, b) => a.score - b.score);
      return { query: args.query.trim(), results: results.slice(0, limit).map(({ score: _score, ...rest }) => rest) };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'memory_get',
    description: 'Read one memory file by its scope-relative path (topics/<slug>.md, observations/_inbox/<file>.md, archive/<file>.md or MEMORY.md) as returned by memory_search. Content is historical context; verify before relying on it.',
    parameters: {
      path: { type: 'string', required: true, description: 'Scope-relative memory path.' },
      scope: { type: 'string', description: 'global or workspace (default).' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          scope: { type: 'string', required: true },
          path: { type: 'string', required: true },
          content: { type: 'string', required: true },
          truncated: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `<memory scope="${value.scope}" path="${value.path}">\n${value.content}${value.truncated ? '\n\n(truncated)' : ''}\n</memory>` }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      if (typeof args.path !== 'string' || args.path.trim() === '') throw new Error('path must be a non-empty string');
      const scope = args.scope === undefined || args.scope === null ? 'workspace' : args.scope;
      if (!SCOPES.includes(scope)) throw new Error(`scope must be one of ${SCOPES.join(', ')}`);
      const { global, workspace } = await scopeStores(exec.agent?.session.header.cwd);
      const store = scope === 'global' ? global : workspace;
      try {
        const file = await store.read(args.path.trim());
        return { scope, path: file.path, content: file.content, truncated: file.truncated };
      } catch (error) {
        if (error instanceof MemoryPathError) throw new Error(error.message);
        throw error;
      }
    },
  }));

  // ---- /memory command -----------------------------------------------------

  async function memoryCommand(invocation) {
    const [sub = 'status', ...rest] = invocation.rawInput.trim().split(/\s+/u).filter(Boolean);
    const session = invocation.agent.session;
    await captureQueues.get(session.id);
    const { workspaceRoot, global, workspace } = await scopeStores(session.header.cwd);
    switch (sub) {
      case 'status': {
        const lines = [`Workspace root: ${workspaceRoot}`];
        for (const store of [global, workspace]) {
          const stats = await store.stats();
          lines.push(`[${stats.scope}] ${stats.scopeDir}`, `  topics=${stats.topics} pending=${stats.pending} archived=${stats.consolidated} manifest=${stats.manifestBytes}B`);
          if (stats.lastDream) lines.push(`  last dream: ${stats.lastDream.status} at ${new Date(stats.lastDream.startedAt).toISOString()}${stats.lastDream.error ? ` (${stats.lastDream.error})` : ''}`);
        }
        lines.push(`Capture progress for this session: turn ${workspace.captureProgress(session.id)}`);
        return { kind: 'success', text: lines.join('\n') };
      }
      case 'dream': {
        const route = routeFor(session);
        if (!route) return { kind: 'error', text: 'No model route is available yet; send one message first or configure provider/model.' };
        const target = rest[0] ?? 'all';
        const summaries = [];
        for (const store of target === 'all' ? [global, workspace] : [target === 'global' ? global : workspace]) {
          const result = await dream(store, session, route, { force: true });
          summaries.push(`[${store.scope}] ${result.status}${result.reason ? ` (${result.reason})` : ''}${result.status === 'completed' ? `: ${result.operations} operations, ${result.archived} observations archived` : ''}`);
        }
        return { kind: 'success', text: summaries.join('\n') };
      }
      case 'search': {
        const query = rest.join(' ');
        if (query === '') return { kind: 'error', text: 'Usage: /memory search <query>' };
        const hits = [...global.search(query).map(hit => ({ ...hit, scope: 'global' })), ...workspace.search(query).map(hit => ({ ...hit, scope: 'workspace' }))].sort((a, b) => a.score - b.score).slice(0, DEFAULT_SEARCH_LIMIT);
        return { kind: 'success', text: hits.length === 0 ? 'No matches.' : hits.map(hit => `[${hit.scope}] ${hit.path} — ${hit.title}`).join('\n') };
      }
      case 'clear': {
        if (rest[0] !== 'workspace' && rest[0] !== 'global') return { kind: 'error', text: 'Usage: /memory clear <workspace|global> --yes' };
        if (rest[1] !== '--yes') return { kind: 'error', text: `This permanently deletes all ${rest[0]} memory. Re-run with --yes to confirm.` };
        await (rest[0] === 'global' ? global : workspace).clear();
        return { kind: 'success', text: `Cleared ${rest[0]} memory.` };
      }
      default:
        return { kind: 'error', text: 'Usage: /memory [status | dream [global|workspace] | search <query> | clear <workspace|global> --yes]' };
    }
  }

  ctx.effect(function* () {
    yield async () => {
      await Promise.allSettled(pending);
      for (const opening of stores.values()) {
        try { (await opening).close(); } catch { /* already closed */ }
      }
      stores.clear();
    };
    yield ctx.commands.register({
      name: 'memory',
      description: 'Cross-session memory: status, dream (consolidate now), search, clear',
      handler: invocation => track(memoryCommand(invocation).catch(error => ({ kind: 'error', text: `memory: ${error instanceof Error ? error.message : String(error)}` }))),
    });
  }, 'darask-memory lifecycle');

  ctx.logger.debug('memory ready (prompt %s) under %s', PROMPT_VERSION, resolved.dshHome);
}
