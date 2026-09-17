// @darask/dsh-rules — directory-style project rules for DeepSeek Harness.
// Ports grok-build's `.grok/rules` / `.claude/rules` / `.cursor/rules` loading
// (baseline rules at the first step, glob-scoped rules after a matching read).
// Single-file AGENTS.md / GROK.md discovery stays with @deepseek-ai/dsh-agent-instructions.

import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import z from '@deepseek-ai/schemastery';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';

import {
  HOME_RULE_DIRS,
  PROJECT_RULE_DIRS,
  RuleTracker,
  ancestorScopeDirs,
  findProjectRoot,
  renderBaseline,
  renderReadReminder,
  scanScopeDir,
} from './rules.mjs';

export * from './rules.mjs';

export const name = 'darask-rules';
export const inject = ['tools'];

export const Config = z.object({
  dshHome: z.string(),
  projectRootMarkers: z.array(z.string()).default(['.git']),
  ruleDirs: z.array(z.string()).default([...PROJECT_RULE_DIRS]),
  homeRuleDirs: z.array(z.string()).default([...HOME_RULE_DIRS]),
  extraRuleDirs: z.array(z.string()).default([]),
  maxSourceBytes: z.number().default(1048576),
  maxBaselineBytes: z.number().default(65536),
  readTools: z.array(z.string()).default(['read', 'hashline_read', 'edit', 'write', 'hashline_edit', 'str_replace_editor']),
  injectOnRead: z.boolean().default(true),
});

const BASELINE_MARKER = 'darask-rules:baseline:';
const READ_MARKER = 'darask-rules:read';

function digest(text) {
  return createHash('sha1').update(text).digest('hex');
}

function filePathFromExecution(exec, readTools) {
  if (!readTools.has(exec.name)) return undefined;
  const args = exec.arguments;
  if (typeof args !== 'object' || args === null) return undefined;
  const candidate = args.file_path ?? args.path;
  if (typeof candidate !== 'string' || candidate.trim() === '') return undefined;
  return candidate.trim();
}

function pluginMessage(text, form = 'instructions') {
  return createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'plugin', plugin: name, form } });
}

function messageText(message) {
  return message.content.filter(block => block.type === 'text').map(block => block.text).join('\n');
}

function* sessionPluginTexts(session) {
  for (const seq of session.surface.nodes) {
    const event = session.eventAt(seq);
    if (event?.type !== 'user/message') continue;
    const source = event.data.source;
    if (source.kind !== 'plugin' || source.plugin !== name) continue;
    yield messageText(event.data);
  }
}

function truncateUtf8(text, maxBytes) {
  const bytes = Buffer.from(text, 'utf8');
  if (bytes.length <= maxBytes) return text;
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end -= 1;
  return `${bytes.subarray(0, end).toString('utf8')}\n\n(Project rules truncated to ${maxBytes} bytes.)`;
}

/** Discover the rule set for one session: home scopes, extra dirs, then project root → cwd. */
export async function collectBaselineRules(cwd, resolved, cache) {
  const projectRoot = await findProjectRoot(cwd, resolved.projectRootMarkers);
  const options = { maxSourceBytes: resolved.maxSourceBytes, cache };
  const rules = [];
  const seen = new Set();
  const push = list => {
    for (const rule of list) {
      if (seen.has(rule.fullPath)) continue;
      seen.add(rule.fullPath);
      rules.push(rule);
    }
  };
  push(await scanScopeDir(resolved.dshHome, ['rules'], options));
  push(await scanScopeDir(homedir(), resolved.homeRuleDirs, options));
  for (const dir of resolved.extraRuleDirs) {
    const absolute = isAbsolute(dir) ? dir : resolve(cwd, dir);
    push(await scanScopeDir(absolute, ['.'], options));
  }
  for (const scope of ancestorScopeDirs(projectRoot, join(cwd, '__rules_scope__'))) {
    push(await scanScopeDir(scope, resolved.ruleDirs, options));
  }
  if (cache) for (const file of cache.keys()) if (!seen.has(file)) cache.delete(file);
  return { projectRoot, rules };
}

export function apply(ctx, config) {
  const resolved = { ...config, dshHome: resolveDshHome(config.dshHome) };
  const readTools = new Set(resolved.readTools);
  const trackers = new WeakMap();
  const baselines = new WeakMap();
  const discoveries = new WeakMap();
  const discoveryFor = session => {
    let state = discoveries.get(session);
    if (!state) { state = { queue: Promise.resolve(), messages: [] }; discoveries.set(session, state); }
    return state;
  };

  const trackerFor = session => {
    let tracker = trackers.get(session);
    if (tracker === undefined) {
      tracker = new RuleTracker({ ruleDirs: resolved.ruleDirs, maxSourceBytes: resolved.maxSourceBytes });
      const injected = [];
      for (const text of sessionPluginTexts(session)) {
        if (!text.startsWith(`<!-- ${READ_MARKER} -->`)) continue;
        for (const line of text.split('\n')) if (line.startsWith('- ')) injected.push(line.slice(2).trim());
      }
      tracker.markInjected(injected);
      trackers.set(session, tracker);
    }
    return tracker;
  };

  const baselineFor = async agent => {
    const session = agent.session;
    const cwd = session.header.cwd ?? process.cwd();
    let state = baselines.get(session);
    if (state === undefined) {
      state = { known: new Set(), files: new Map(), snapshot: undefined };
      for (const existing of sessionPluginTexts(session)) {
        const marker = existing.indexOf(BASELINE_MARKER);
        if (marker >= 0) state.known.add(existing.slice(marker + BASELINE_MARKER.length, marker + BASELINE_MARKER.length + 40));
      }
      baselines.set(session, state);
    }
    const { projectRoot, rules } = await collectBaselineRules(cwd, resolved, state.files);
    const previous = state.snapshot;
    if (previous?.projectRoot !== projectRoot || previous.maxBytes !== resolved.maxBaselineBytes
      || previous.rules.length !== rules.length || rules.some((rule, index) => rule !== previous.rules[index])) {
      const rendered = renderBaseline(rules, { relativeTo: projectRoot });
      const text = rendered === undefined ? undefined : truncateUtf8(rendered, resolved.maxBaselineBytes);
      state.snapshot = { projectRoot, rules, maxBytes: resolved.maxBaselineBytes, text, identity: text === undefined ? undefined : digest(text) };
    }
    const { text, identity } = state.snapshot;
    if (identity === undefined || state.known.has(identity)) return undefined;
    return { message: pluginMessage(`${text}\n<!-- ${BASELINE_MARKER}${identity} -->`), identity, known: state.known };
  };

  ctx.on('agent/pre-step', async ({ agent, messages, signal }, next) => {
    const decision = await next();
    if (decision.kind === 'reject') return decision;
    const discovery = discoveryFor(agent.session);
    await discovery.queue;
    let desired;
    try {
      desired = await baselineFor(agent);
    } catch (error) {
      ctx.logger.warn('project rules baseline failed: %o', error);
    }
    signal.throwIfAborted();
    const additions = [...(desired ? [desired.message] : []), ...discovery.messages];
    if (!additions.length) return decision;
    if (desired) desired.known.add(desired.identity);
    discovery.messages = [];
    const lastClaimed = decision.messages.findLastIndex(message => messages.includes(message));
    return { ...decision, messages: decision.messages.toSpliced(lastClaimed + 1, 0, ...additions) };
  });

  if (!resolved.injectOnRead) return;

  ctx.on('tools/result', (exec, result) => {
    if (result.isError || exec.agent === undefined || exec.signal.aborted) return;
    const requested = filePathFromExecution(exec, readTools);
    if (requested === undefined) return;
    const agent = exec.agent;
    const cwd = agent.session.header.cwd ?? process.cwd();
    const readPath = isAbsolute(requested) ? requested : resolve(cwd, requested);
    const discovery = discoveryFor(agent.session);
    discovery.queue = discovery.queue.then(async () => {
      const projectRoot = await findProjectRoot(cwd, resolved.projectRootMarkers);
      const tracker = trackerFor(agent.session);
      const rules = await tracker.rulesForRead(projectRoot, readPath);
      const reminder = renderReadReminder(rules);
      if (reminder === undefined) return;
      discovery.messages.push(pluginMessage(`<!-- ${READ_MARKER} -->\n${reminder}`));
    }).catch(error => ctx.logger.warn('project rules on read failed: %o', error));
  });
}
