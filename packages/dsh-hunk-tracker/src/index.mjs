// @darask/dsh-hunk-tracker — session change tracking for DeepSeek Harness, a
// JavaScript port of grok-build's xai-hunk-tracker. Agent writes are observed
// through the upstream `fs/write-intent` / `fs/edit-intent` gates and the
// `tools/result` settle event, so no file tool is replaced or duplicated: the
// plugin snapshots a file's content before its first agent mutation (or the
// git HEAD blob), re-reads it after the tool settles, and keeps the hunks
// between baseline and current attributed to the agent turn that produced
// them. Files edited outside the harness are re-read at turn boundaries and
// on demand, so external hunks are reported separately. Review happens through
// read-only tools (`hunks_status`, `hunks_diff`) and the `/hunks` command,
// which owns accept (fold into baseline) and reject (revert on disk).

import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import z from '@deepseek-ai/schemastery';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { defineTool } from '@deepseek-ai/dsh-tools';

import { formatHunk, unifiedPatch } from './diff.mjs';
import { HunkTracker, binary, full, isAgentEdit, missing, tooLarge } from './tracker.mjs';

export * from './diff.mjs';
export * from './tracker.mjs';

export const name = 'darask-hunk-tracker';
export const inject = ['tools', 'commands', 'fs'];

export const Config = z.object({
  dshHome: z.string(),
  persist: z.boolean().default(true),
  trackExternal: z.boolean().default(true),
  baseline: z.union(['session', 'git-head']).default('session'),
  maxFileBytes: z.number().default(2 * 1024 * 1024),
  diffOutputMaxBytes: z.number().default(64 * 1024),
  gitTimeoutMs: z.number().default(10_000),
});

const execFileAsync = promisify(execFile);

export function safeSessionFileName(sessionId) {
  return `${String(sessionId).replace(/[^A-Za-z0-9._-]/gu, '_').slice(0, 120)}.json`;
}

export function describeSource(source) {
  switch (source.type) {
    case 'agentEdit': return `agent turn ${source.turn}`;
    case 'externalEditOnAgentFile': return 'external (agent file)';
    default: return 'external';
  }
}

function fileKind(file) {
  if (file.baseline.status === 'missing' && file.current.status === 'full') return 'created';
  if (file.baseline.status === 'full' && file.current.status === 'missing') return 'deleted';
  if (file.current.status === 'binary' || file.baseline.status === 'binary') return 'binary';
  if (file.current.status === 'too-large' || file.baseline.status === 'too-large') return 'too large';
  return 'modified';
}

export function renderStatus(summary, files) {
  const lines = [
    `Pending hunks: ${summary.pendingHunks} in ${summary.filesWithPending} of ${summary.filesModified} tracked files (+${summary.pendingLinesAdded}/-${summary.pendingLinesRemoved}); external pending: ${summary.unattributedPending}`,
    `Reviewed: accepted ${summary.stats.acceptedHunks} (+${summary.stats.acceptedLinesAdded}/-${summary.stats.acceptedLinesRemoved}), rejected ${summary.stats.rejectedHunks} (+${summary.stats.rejectedLinesAdded}/-${summary.stats.rejectedLinesRemoved})`,
  ];
  for (const turn of summary.turns) lines.push(`Turn ${turn.turn}: ${turn.pendingHunks.length} hunks (+${turn.linesAdded}/-${turn.linesRemoved}) in ${turn.files.join(', ')}`);
  if (files.length > 0) {
    lines.push('Files:');
    for (const file of files) {
      const flags = [file.isAgentFile ? 'agent' : 'external-only', ...file.hasExternalChanges ? ['has external edits'] : []];
      lines.push(`  ${file.path} — ${fileKind(file)}, ${file.hunkCount} pending (${flags.join(', ')})`);
    }
  }
  return lines.join('\n');
}

export function truncateText(text, maxBytes) {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return { text, truncated: false };
  const bytes = Buffer.from(text, 'utf8');
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end -= 1;
  return { text: `${bytes.subarray(0, end).toString('utf8')}\n…[truncated]`, truncated: true };
}

export function apply(ctx, config) {
  const resolved = { ...config, dshHome: resolveDshHome(config.dshHome) };
  const stateDir = join(resolved.dshHome, 'darask', 'hunks');
  const sessions = new Map();
  const pendingWrites = new Map();
  const inflight = new Set();

  const track = promise => {
    inflight.add(promise);
    const retire = () => inflight.delete(promise);
    promise.then(retire, retire);
    return promise;
  };

  // ---- content probes ------------------------------------------------------

  async function readState(target) {
    let info;
    try {
      info = await ctx.fs.stat(target);
    } catch (error) {
      if (error?.code === 'FS_NOT_FOUND') return { state: missing() };
      throw error;
    }
    if (info === undefined) return { state: missing() };
    if (info.type !== 'file') return { state: { status: 'other' }, version: info.version };
    if (info.size !== undefined && info.size > resolved.maxFileBytes) return { state: tooLarge(info.size), version: info.version };
    try {
      return { state: full(await ctx.fs.readText(target)), version: info.version };
    } catch (error) {
      switch (error?.code) {
        case 'FS_NOT_FOUND': return { state: missing() };
        case 'FS_NOT_TEXT': return { state: binary(info.size), version: info.version };
        case 'FS_TOO_LARGE': return { state: tooLarge(info.size), version: info.version };
        case 'FS_NOT_REGULAR_FILE': return { state: { status: 'other' }, version: info.version };
        default: throw error;
      }
    }
  }

  async function gitHeadState(target) {
    const processPath = ctx.fs.processPath(target);
    try {
      const { stdout } = await execFileAsync('git', ['show', `HEAD:./${basename(processPath)}`], {
        cwd: dirname(processPath),
        encoding: 'buffer',
        maxBuffer: resolved.maxFileBytes + 1,
        timeout: resolved.gitTimeoutMs,
        windowsHide: true,
      });
      if (stdout.length > resolved.maxFileBytes) return tooLarge(stdout.length);
      if (stdout.includes(0)) return binary(stdout.length);
      return full(stdout.toString('utf8'));
    } catch {
      return undefined;
    }
  }

  // ---- per-session state ---------------------------------------------------

  function turnOf(session) {
    const events = session.snapshotEvents?.() ?? [];
    for (let index = events.length - 1; index >= 0; index -= 1) {
      if (events[index].type === 'turn/start') return events[index].data.turn;
    }
    return 0;
  }

  function entryFor(session) {
    let entry = sessions.get(session.id);
    if (entry) return entry;
    entry = { session, tracker: undefined, turn: turnOf(session), targets: new Map(), versions: new Map(), queue: Promise.resolve(), stateFile: join(stateDir, safeSessionFileName(session.id)) };
    entry.loaded = (async () => {
      if (resolved.persist) {
        try {
          entry.tracker = HunkTracker.fromSnapshot(JSON.parse(await readFile(entry.stateFile, 'utf8')));
          return;
        } catch (error) {
          if (error?.code !== 'ENOENT') ctx.logger.warn('hunk tracker: discarding unreadable state %s: %o', entry.stateFile, error);
        }
      }
      entry.tracker = new HunkTracker();
    })();
    sessions.set(session.id, entry);
    return entry;
  }

  async function persist(entry) {
    if (!resolved.persist) return;
    await mkdir(stateDir, { recursive: true });
    const tmp = `${entry.stateFile}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(entry.tracker.snapshot()), 'utf8');
    await rename(tmp, entry.stateFile);
  }

  /** Serialize tracker mutations per session; failures are logged, never propagated to tools. */
  function enqueue(entry, job) {
    const next = entry.queue.then(() => entry.loaded).then(job).catch(error => {
      ctx.logger.warn('hunk tracker: %o', error);
    });
    entry.queue = next;
    return track(next);
  }

  async function targetFor(entry, key, path) {
    let target = entry.targets.get(key);
    if (!target) {
      target = await ctx.fs.resolve(path, { cwd: entry.session.header.cwd });
      entry.targets.set(key, target);
    }
    return target;
  }

  async function refresh(entry) {
    if (!resolved.trackExternal) return;
    for (const file of entry.tracker.files()) {
      let target;
      try {
        target = await targetFor(entry, file.key, file.path);
      } catch {
        continue;
      }
      const known = entry.versions.get(file.key);
      if (known !== undefined) {
        const info = await ctx.fs.stat(target).catch(() => undefined);
        if (info?.version === known) continue;
      }
      const { state, version } = await readState(target);
      entry.versions.set(file.key, version);
      entry.tracker.recordExternalContent({ key: file.key, path: file.path, current: state });
    }
    await persist(entry);
  }

  async function recordAgentWrites(entry, writes) {
    for (const { target, before } of writes) {
      const key = target.targetKey;
      entry.targets.set(key, target);
      const { state, version } = await readState(target);
      entry.versions.set(key, version);
      let baseline = before;
      if (!entry.tracker.has(key) && resolved.baseline === 'git-head') baseline = (await gitHeadState(target)) ?? before;
      entry.tracker.recordAgentWrite({ key, path: target.displayPath, before: baseline, after: state, turn: entry.turn });
    }
    await persist(entry);
  }

  // ---- hooks ---------------------------------------------------------------

  const intentListener = async (target, actor, next) => {
    const session = actor?.agent?.session;
    if (session && typeof actor.callId === 'string') {
      try {
        const entry = entryFor(session);
        await entry.loaded;
        let bucket = pendingWrites.get(actor.callId);
        if (!bucket) { bucket = { entry, writes: new Map() }; pendingWrites.set(actor.callId, bucket); }
        if (!bucket.writes.has(target.targetKey)) {
          const before = entry.tracker.has(target.targetKey) ? undefined : (await readState(target)).state;
          bucket.writes.set(target.targetKey, { target, before });
        }
      } catch (error) {
        ctx.logger.warn('hunk tracker: pre-write probe failed for %s: %o', target.displayPath, error);
      }
    }
    return next();
  };
  ctx.on('fs/write-intent', intentListener, { prepend: true });
  ctx.on('fs/edit-intent', intentListener, { prepend: true });

  const settle = callId => {
    const bucket = pendingWrites.get(callId);
    if (!bucket) return;
    pendingWrites.delete(callId);
    enqueue(bucket.entry, () => recordAgentWrites(bucket.entry, [...bucket.writes.values()]));
  };
  ctx.on('tools/result', exec => { settle(exec.callId); });

  ctx.on('session/event', (session, event) => {
    switch (event.type) {
      case 'turn/start': {
        const entry = entryFor(session);
        entry.turn = event.data.turn;
        enqueue(entry, () => refresh(entry));
        break;
      }
      case 'turn/end': {
        for (const [callId, bucket] of pendingWrites) if (bucket.entry.session.id === session.id) settle(callId);
        break;
      }
      default:
        break;
    }
  });

  // ---- shared query helpers ------------------------------------------------

  async function ready(session) {
    const entry = entryFor(session);
    await enqueue(entry, () => refresh(entry));
    return entry;
  }

  async function keyForPath(entry, path) {
    const target = await ctx.fs.resolve(path, { cwd: entry.session.header.cwd });
    if (entry.tracker.has(target.targetKey)) return target.targetKey;
    const byDisplay = entry.tracker.files().find(file => file.path === path || file.path === target.displayPath);
    if (byDisplay) return byDisplay.key;
    throw new Error(`${path} is not tracked in this session`);
  }

  function renderDiff(entry, keys, { context, agentOnly }) {
    const parts = [];
    for (const key of keys) {
      const file = entry.tracker.file(key);
      const baseline = entry.tracker.baselineText(key);
      const current = entry.tracker.currentText(key);
      if (agentOnly) {
        const hunks = file.hunks.filter(hunk => isAgentEdit(hunk.source));
        if (hunks.length === 0) continue;
        parts.push(`--- a/${file.path}\n+++ b/${file.path}\n${hunks.map(formatHunk).join('')}`);
        continue;
      }
      if (baseline === undefined && current === undefined) { parts.push(`# ${file.path}: ${fileKind(file)} (no text diff available)\n`); continue; }
      const patch = unifiedPatch(file.path, baseline ?? '', current ?? '', { context });
      if (patch !== undefined) parts.push(patch);
    }
    return parts.join('\n');
  }

  // ---- tools ---------------------------------------------------------------

  ctx.tools.register(defineTool({
    name: 'hunks_status',
    description: [
      'Summarize the files this session has changed: pending hunks per agent turn, files with external (non-agent) edits, and accept/reject counts.',
      'Use hunks_diff for the content of a change. Accepting or reverting hunks is done by the user with /hunks.',
    ].join('\n'),
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          pendingHunks: { type: 'number', required: true },
          filesModified: { type: 'number', required: true },
          unattributedPending: { type: 'number', required: true },
          turns: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: { turn: { type: 'number', required: true }, files: { type: 'array', required: true, items: { type: 'string' } }, hunks: { type: 'number', required: true }, linesAdded: { type: 'number', required: true }, linesRemoved: { type: 'number', required: true } } } },
          files: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: { path: { type: 'string', required: true }, kind: { type: 'string', required: true }, hunkCount: { type: 'number', required: true }, hasAgentChanges: { type: 'boolean', required: true }, hasExternalChanges: { type: 'boolean', required: true } } } },
          text: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    isConcurrencySafe: () => true,
    async execute(_args, exec) {
      const session = exec.agent?.session;
      if (!session) throw new Error('hunks_status requires an agent session');
      const entry = await ready(session);
      const summary = entry.tracker.summary();
      const files = entry.tracker.files();
      return {
        pendingHunks: summary.pendingHunks,
        filesModified: summary.filesModified,
        unattributedPending: summary.unattributedPending,
        turns: summary.turns.map(turn => ({ turn: turn.turn, files: turn.files, hunks: turn.pendingHunks.length, linesAdded: turn.linesAdded, linesRemoved: turn.linesRemoved })),
        files: files.map(file => ({ path: file.path, kind: fileKind(file), hunkCount: file.hunkCount, hasAgentChanges: file.hasAgentChanges, hasExternalChanges: file.hasExternalChanges })),
        text: renderStatus(summary, files),
      };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'hunks_diff',
    description: 'Show the unified diff between the session baseline (content before this session first touched the file, or git HEAD when configured) and the current content of one tracked file, or of every tracked file when path is omitted.',
    parameters: {
      path: { type: 'string', description: 'Tracked file path as reported by hunks_status. Omit for all tracked files.' },
      context: { type: 'number', description: 'Context lines around each change (default 3).' },
      agent_only: { type: 'boolean', description: 'Render only hunks attributed to the agent, without context lines.' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { files: { type: 'number', required: true }, diff: { type: 'string', required: true }, truncated: { type: 'boolean', required: true } } },
      render: (_args, value) => [{ type: 'text', text: value.diff === '' ? 'No pending changes.' : value.diff }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const session = exec.agent?.session;
      if (!session) throw new Error('hunks_diff requires an agent session');
      const context = args.context === undefined ? 3 : Number(args.context);
      if (!Number.isInteger(context) || context < 0 || context > 50) throw new Error('context must be an integer between 0 and 50');
      const entry = await ready(session);
      const keys = typeof args.path === 'string' && args.path !== '' ? [await keyForPath(entry, args.path)] : entry.tracker.keys();
      const { text, truncated } = truncateText(renderDiff(entry, keys, { context, agentOnly: args.agent_only === true }), resolved.diffOutputMaxBytes);
      return { files: keys.length, diff: text, truncated };
    },
  }));

  // ---- /hunks command ------------------------------------------------------

  async function rejectHunk(entry, hunkId) {
    const policy = ctx.get?.('sandboxPolicy')?.resolve({ session: entry.session });
    const mode = policy?.mode ?? ctx.get?.('shell')?.sandboxMode;
    if (mode !== undefined && mode !== 'danger-full-access') throw new Error('Hunk rejection is unavailable under a confined sandbox policy.');
    if (!policy && mode !== undefined) throw new Error('Cannot resolve the hunk rejection sandbox policy.');
    const proposed = HunkTracker.fromSnapshot(entry.tracker.snapshot());
    const outcome = proposed.reject(hunkId);
    if (!outcome) return false;
    const target = await targetFor(entry, outcome.key, outcome.path);
    const expected = entry.versions.get(outcome.key);
    let version;
    if (outcome.content === null) {
      throw new Error('DSH does not provide guarded deletion. Review and delete this newly created file manually, then refresh hunks.');
    } else {
      const intent = expected === undefined ? { kind: 'createIfAbsent' } : { kind: 'replaceIfVersion', version: expected };
      const written = await ctx.fs.writeText(target, outcome.content, intent, undefined, policy);
      version = written.version;
    }
    entry.tracker = proposed;
    entry.versions.set(outcome.key, version);
    return true;
  }

  async function selectHunks(entry, selector) {
    const [head, ...rest] = selector;
    if (head === undefined || head === 'all') return entry.tracker.pending();
    if (head === 'turn') {
      const turn = Number(rest[0]);
      if (!Number.isInteger(turn)) throw new Error('Usage: turn <number>');
      return entry.tracker.pending({ turn });
    }
    const byId = entry.tracker.pending().filter(hunk => hunk.id === head);
    if (byId.length > 0) return byId;
    return entry.tracker.pending({ key: await keyForPath(entry, selector.join(' ')) });
  }

  async function hunksCommand(invocation) {
    const [sub = 'status', ...rest] = invocation.rawInput.trim().split(/\s+/u).filter(Boolean);
    const entry = await ready(invocation.agent.session);
    switch (sub) {
      case 'status':
        return { kind: 'success', text: renderStatus(entry.tracker.summary(), entry.tracker.files()) };
      case 'list': {
        const hunks = rest.length > 0 ? entry.tracker.pending({ key: await keyForPath(entry, rest.join(' ')) }) : entry.tracker.pending();
        if (hunks.length === 0) return { kind: 'success', text: 'No pending hunks.' };
        return { kind: 'success', text: hunks.map(hunk => `${hunk.id}  ${hunk.path} @@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount}  [${describeSource(hunk.source)}]`).join('\n') };
      }
      case 'diff': {
        const keys = rest.length > 0 ? [await keyForPath(entry, rest.join(' '))] : entry.tracker.keys();
        const { text } = truncateText(renderDiff(entry, keys, { context: 3, agentOnly: false }), resolved.diffOutputMaxBytes);
        return { kind: 'success', text: text === '' ? 'No pending changes.' : text };
      }
      case 'accept': {
        const hunks = await selectHunks(entry, rest);
        let accepted = 0;
        await enqueue(entry, async () => {
          for (const hunk of hunks) if (entry.tracker.accept(hunk.id)) accepted += 1;
          await persist(entry);
        });
        return { kind: 'success', text: `Accepted ${accepted} hunks (folded into the session baseline).` };
      }
      case 'reject': {
        const confirm = rest.at(-1) === '--yes';
        const selector = confirm ? rest.slice(0, -1) : rest;
        const hunks = await selectHunks(entry, selector);
        if (hunks.length > 1 && !confirm) return { kind: 'error', text: `This reverts ${hunks.length} hunks on disk. Re-run with --yes to confirm.` };
        let rejected = 0;
        let failure;
        await enqueue(entry, async () => {
          try {
            for (const hunk of hunks) if (await rejectHunk(entry, hunk.id)) rejected += 1;
          } catch (error) {
            failure = error;
          }
          await persist(entry);
        });
        if (failure) return { kind: 'error', text: `Reverted ${rejected} hunks before failing: ${failure.message}` };
        return { kind: 'success', text: `Reverted ${rejected} hunks on disk.` };
      }
      case 'forget': {
        if (rest.length === 0) return { kind: 'error', text: 'Usage: /hunks forget <path>' };
        const key = await keyForPath(entry, rest.join(' '));
        await enqueue(entry, async () => { entry.tracker.forget(key); entry.targets.delete(key); entry.versions.delete(key); await persist(entry); });
        return { kind: 'success', text: `Stopped tracking ${rest.join(' ')}.` };
      }
      default:
        return { kind: 'error', text: 'Usage: /hunks [status | list [path] | diff [path] | accept <all|turn N|path|hunkId> | reject <all|turn N|path|hunkId> [--yes] | forget <path>]' };
    }
  }

  ctx.effect(function* () {
    yield async () => {
      await Promise.allSettled(inflight);
      sessions.clear();
      pendingWrites.clear();
    };
    yield ctx.commands.register({
      name: 'hunks',
      description: 'Session change review: status, list, diff, accept, reject (revert on disk), forget',
      handler: invocation => track(hunksCommand(invocation).catch(error => ({ kind: 'error', text: `hunks: ${error instanceof Error ? error.message : String(error)}` }))),
    });
  }, 'darask-hunk-tracker lifecycle');

  ctx.logger.debug('hunk tracker ready (baseline=%s) under %s', resolved.baseline, stateDir);
}
