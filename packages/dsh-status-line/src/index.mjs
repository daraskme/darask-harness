// @darask/dsh-status-line — host half of the status line.
// Registers the `daraskStatus` session projection (model / turn / per-model usage
// / cost) next to upstream `tokenUsage`, `contextPressure` and `sessionStats`,
// and serves the grok-build compatible context document plus the optional
// external command rendering on the authenticated DSH Connection carrier.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';

import { runStatusCommand } from './command.mjs';
import { statusProjectionDefinition } from './projection.mjs';
import {
  DEFAULT_ITEMS,
  PROJECTION_KEY,
  buildStatusContext,
  normalizeItems,
  normalizeType,
  renderStatusLine,
} from './status.mjs';

export * from './status.mjs';
export * from './projection.mjs';
export { runStatusCommand, shellFor } from './command.mjs';

export const name = 'darask-status-line';
export const inject = ['sessionProjections', 'sessions', 'connection'];

export const STATUS_LINE_PATH = '/api/darask/status-line';
export const STATUS_LINE_CONFIG_PATH = '/api/darask/status-line/config';
export const USER_CONFIG_FILE = 'status-line.json';
const MAX_USER_CONFIG_BYTES = 16384;

const Price = z.object({
  input: z.number().default(0),
  output: z.number().default(0),
  cacheRead: z.number(),
  cacheWrite: z.number(),
});

export const Config = z.object({
  type: z.union(['builtin', 'command', 'disabled']).default('builtin'),
  command: z.string().default(''),
  items: z.array(z.string()).default([...DEFAULT_ITEMS]),
  refreshIntervalMs: z.number().default(1000),
  commandRefreshIntervalMs: z.number().default(5000),
  commandTimeoutMs: z.number().default(5000),
  padding: z.number().default(0),
  /** USD per million tokens keyed by `provider/model` or `model` glob (`*` wildcard). */
  pricing: z.dict(Price).default({}),
  /** `$DSH_HOME/darask/status-line.json` overrides `type`/`command`/`items`/`padding`/refresh intervals/`pricing` without editing the bundle. */
  userConfigFile: z.string().default(''),
});

const require = createRequire(import.meta.url);

function packageVersion(id) {
  try { return require(`${id}/package.json`).version ?? null; } catch { return null; }
}

export function harnessVersion() {
  const own = packageVersion('@darask/dsh-status-line') ?? '0.0.0';
  const dsh = packageVersion('@deepseek-ai/dsh');
  return dsh === null ? `darask-harness ${own}` : `darask-harness ${own} (dsh ${dsh})`;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

/** Browser-initiated cross-site fetches never reach the command runner or the context document. */
export function crossSite(request) {
  const site = request.headers.get('sec-fetch-site');
  return site === 'cross-site';
}

/** Merge bundle config with the optional user JSON file; the file never widens `type` beyond the known values. */
export function mergeUserConfig(base, user) {
  if (!user || typeof user !== 'object' || Array.isArray(user)) return { ...base };
  const merged = { ...base };
  if ('type' in user) merged.type = normalizeType(user.type);
  if (typeof user.command === 'string') merged.command = user.command;
  if (Array.isArray(user.items)) merged.items = user.items;
  for (const key of ['refreshIntervalMs', 'commandRefreshIntervalMs', 'commandTimeoutMs', 'padding']) {
    if (typeof user[key] === 'number' && Number.isFinite(user[key]) && user[key] >= 0) merged[key] = user[key];
  }
  if (user.pricing && typeof user.pricing === 'object' && !Array.isArray(user.pricing)) merged.pricing = { ...base.pricing, ...user.pricing };
  return merged;
}

export function publicConfig(config) {
  const type = normalizeType(config.type);
  return {
    type: type === 'command' && config.command.trim() === '' ? 'builtin' : type,
    version: harnessVersion(),
    items: normalizeItems(config.items),
    refreshIntervalMs: Math.max(250, Math.min(60000, config.refreshIntervalMs)),
    commandRefreshIntervalMs: Math.max(1000, Math.min(300000, config.commandRefreshIntervalMs)),
    padding: Math.max(0, Math.min(8, Math.floor(config.padding))),
    hasCommand: config.command.trim() !== '',
    pricedModels: Object.keys(config.pricing ?? {}),
  };
}

export function createStatusLineService({ ctx, config, dshHome = resolveDshHome(), now = Date.now, runCommand = runStatusCommand }) {
  const userFile = config.userConfigFile !== '' ? resolve(config.userConfigFile) : join(dshHome, 'darask', USER_CONFIG_FILE);
  let cached = { at: 0, value: { ...config } };

  async function effectiveConfig() {
    const at = now();
    if (at - cached.at < 2000) return cached.value;
    let user = null;
    try {
      const text = await readFile(userFile, 'utf8');
      if (Buffer.byteLength(text) <= MAX_USER_CONFIG_BYTES) user = JSON.parse(text);
    } catch (error) {
      if (error?.code !== 'ENOENT') ctx?.logger?.warn?.('status-line: user config %s ignored: %s', userFile, error instanceof Error ? error.message : String(error));
    }
    cached = { at, value: mergeUserConfig(config, user) };
    return cached.value;
  }

  function projectionValues(session) {
    const snapshot = ctx.sessionProjections.snapshot(session, [PROJECTION_KEY, 'tokenUsage', 'contextPressure', 'sessionStats', 'title', 'modelSelection']);
    return snapshot.values;
  }

  async function contextFor(sessionId, trigger) {
    const session = ctx.sessions.get(sessionId);
    if (session === undefined) return null;
    const values = projectionValues(session);
    const agentStatus = ctx.get('agents')?.get(sessionId)?.status;
    const running = agentStatus === undefined ? undefined : agentStatus === 'running';
    return buildStatusContext({
      sessionId,
      header: session.header,
      status: values[PROJECTION_KEY],
      tokenUsage: values.tokenUsage,
      contextPressure: values.contextPressure,
      sessionStats: values.sessionStats,
      title: values.title,
      modelSelection: values.modelSelection,
      version: harnessVersion(),
      now: now(),
      trigger,
      ...(typeof running === 'boolean' ? { running } : {}),
    });
  }

  async function render(sessionId, trigger = 'refresh_interval') {
    const effective = await effectiveConfig();
    const visible = publicConfig(effective);
    const context = await contextFor(sessionId, trigger);
    if (context === null) return { error: 'session not found', status: 404 };
    if (visible.type === 'disabled') return { type: 'disabled', text: '', context };
    if (visible.type === 'command') {
      const result = await runCommand(effective.command, context, { cwd: context.cwd, timeoutMs: effective.commandTimeoutMs });
      return result.ok
        ? { type: 'command', text: result.text, context, ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }) }
        : { type: 'command', text: renderStatusLine(context, visible.items, { now: now() }), context, error: result.error };
    }
    return { type: 'builtin', text: renderStatusLine(context, visible.items, { now: now() }), context };
  }

  const routes = [
    {
      path: STATUS_LINE_CONFIG_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      async fetch() {
        try { return json(publicConfig(await effectiveConfig())); } catch { return json({ error: 'status line config unavailable' }, 503); }
      },
    },
    {
      path: STATUS_LINE_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      async fetch(request) {
        if (crossSite(request)) return json({ error: 'cross-site request rejected' }, 403);
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('session') ?? '';
        if (!/^[A-Za-z0-9_.:-]{1,128}$/u.test(sessionId)) return json({ error: 'session is required' }, 400);
        const trigger = url.searchParams.get('trigger') === 'turn' ? 'turn' : 'refresh_interval';
        try {
          const result = await render(sessionId, trigger);
          return result.error !== undefined && result.status !== undefined ? json({ error: result.error }, result.status) : json(result);
        } catch (error) {
          ctx?.logger?.warn?.('status-line: render failed: %o', error);
          return json({ error: 'status line unavailable' }, 500);
        }
      },
    },
  ];

  return { effectiveConfig, contextFor, render, routes, userFile, pricing: () => cached.value.pricing ?? config.pricing };
}

export function apply(ctx, rawConfig = {}) {
  const config = Config(rawConfig);
  const service = createStatusLineService({ ctx, config });
  ctx.sessionProjections.register(statusProjectionDefinition(service.pricing));
  for (const route of service.routes) ctx.connection.fetch.register(route);
  void service.effectiveConfig().catch(() => undefined);
  ctx.logger?.info?.('status line: type=%s items=%s user-config=%s', normalizeType(config.type), normalizeItems(config.items).join(','), service.userFile);
}
