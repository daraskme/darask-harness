// @darask/dsh-monitor — background event monitor for DeepSeek Harness, a port of
// grok-build's `monitor` tool. A script started through the upstream shell
// executor (`ctx.shell.start`, so bash/pwsh selection, credential scrub, and the
// file sandbox all apply) is registered with the upstream job registry
// (`ctx.jobs`), which gives it an id, owner isolation, `job_list` / `job_output`
// / `job_kill`, and session-teardown cancellation. What this plugin adds on top
// of `bash run_in_background` is the event stream: every output line is
// delivered to the owning agent as a `<monitor-event>` while the script runs
// (mid-turn via `agent.inject`, or waking an idle agent via `agent.followup`),
// rate-limited by a token bucket so a chatty script degrades into catch-up
// notices and eventually an auto-kill instead of a wakeup storm.

import { isAbsolute, resolve } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm';
import { defineTool } from '@deepseek-ai/dsh-tools';

import {
  AUTO_KILL_THRESHOLD_MS,
  DEBOUNCE_MS,
  LineProcessor,
  MAX_TIMEOUT_MS,
  MonitorRateLimiter,
  RATE_LIMIT_CAPACITY,
  RATE_LIMIT_REFILL_MS,
  batchLines,
  resolveTimeout,
  wrapMonitorEvent,
} from './events.mjs';

export * from './events.mjs';

export const name = 'darask-monitor';
export const inject = ['tools', 'shell', 'shellEnv', 'jobs'];

export const Config = z.object({
  debounceMs: z.number().default(DEBOUNCE_MS),
  rateLimitCapacity: z.number().default(RATE_LIMIT_CAPACITY),
  rateLimitRefillMs: z.number().default(RATE_LIMIT_REFILL_MS),
  autoKillMs: z.number().default(AUTO_KILL_THRESHOLD_MS),
  maxConsecutiveWakes: z.number().default(10),
  outputLimitBytes: z.number().default(64 * 1024),
  unreadTailBytes: z.number().default(256 * 1024),
});

const PLUGIN = 'darask-monitor';

function toolDescription() {
  return [
    'Start a background monitor that streams events from a long-running script. Each stdout line is delivered to you as a <monitor-event> while you keep working (or wakes you when idle); the script exiting ends the watch and you receive the usual background-job completion notice. Returns a job id: list with job_list, read unread lines with job_output, stop with job_kill.',
    'Write the script so it emits only the events you need (e.g. DONE, FAILED, CANCELLED, or one summary line per state change) — every line is a wakeup, and a script that prints progress or raw logs is rate-limited (10 events per 20 s burst, then suppression notices) and auto-killed after 30 s of sustained overload. Use `grep --line-buffered` / `awk` (or PYTHONUNBUFFERED, already set) in pipelines so lines are not held in a buffer.',
    'Examples: poll a PR every 60 s and print MERGED/CLOSED once; `tail -F app.log | grep --line-buffered -E "ERROR|FATAL"`; wait on a build and print DONE or FAILED. Set persistent: true for session-length watches (no deadline); otherwise the monitor is killed at timeout_ms (default and max 10 h).',
  ].join('\n');
}

/** Session workspace (sandbox root when confined) with an optional relative override. */
export function resolveWorkdir(modelWorkdir, sessionCwd) {
  if (modelWorkdir === undefined || modelWorkdir === '') return sessionCwd;
  if (sessionCwd !== undefined && !isAbsolute(modelWorkdir)) return resolve(sessionCwd, modelWorkdir);
  return modelWorkdir;
}

export function outcomeDetail({ exitCode, signal, timedOut, timeoutMs, autoKilled, killed }) {
  if (autoKilled) return 'auto-killed: output rate too high';
  if (timedOut) return `timed out after ${Math.round(timeoutMs / 1000)}s`;
  if (killed) return signal ? `killed (${signal})` : 'killed';
  if (exitCode !== null && exitCode !== undefined) return `exit code: ${exitCode}`;
  return signal ? `signal: ${signal}` : 'exited';
}

/** Bounded FIFO of undelivered lines for `job_output`; keeps the tail when over budget. */
export class UnreadBuffer {
  #lines = [];
  #head = 0;
  #bytes = 0;
  #dropped = 0;

  constructor(maxBytes) {
    this.maxBytes = maxBytes;
  }

  push(line) {
    this.#lines.push(line);
    this.#bytes += Buffer.byteLength(line, 'utf8') + 1;
    while (this.#bytes > this.maxBytes && this.#lines.length - this.#head > 1) {
      const removed = this.#lines[this.#head];
      this.#lines[this.#head++] = undefined;
      this.#bytes -= Buffer.byteLength(removed, 'utf8') + 1;
      this.#dropped += 1;
    }
    if (this.#head > 0 && this.#head * 2 >= this.#lines.length) {
      this.#lines = this.#lines.slice(this.#head);
      this.#head = 0;
    }
  }

  drain() {
    const notice = this.#dropped > 0 ? `[${this.#dropped} earlier lines dropped]\n` : '';
    const tail = this.#lines.length > this.#head ? `${this.#lines.slice(this.#head).join('\n')}\n` : '';
    this.#lines = [];
    this.#head = 0;
    this.#bytes = 0;
    this.#dropped = 0;
    return notice + tail;
  }
}

export function apply(ctx, config) {
  const wakeBudget = config.maxConsecutiveWakes;
  const spentWakes = new WeakMap();
  ctx.on('agent/inbox/claimed', ({ agent, message }) => {
    if (message.source.kind === 'user') spentWakes.delete(agent);
  });

  const confined = ctx.shell.sandboxMode !== undefined;
  const sandboxPolicy = confined ? ctx.get('sandboxPolicy') : undefined;
  if (confined && sandboxPolicy === undefined) throw new Error('darask-monitor: the mounted shell executor confines but ctx.sandboxPolicy is missing');

  function deliver(owner, jobId, description, text) {
    const message = createUserMessage({
      content: [{ type: 'text', text: wrapMonitorEvent(description, text, jobId) }],
      source: { kind: 'plugin', plugin: PLUGIN, form: 'notice', summary: boundContextSummary(`monitor ${jobId}: ${description}`) },
    });
    const spent = spentWakes.get(owner) ?? 0;
    if (owner.status === 'idle' && spent < wakeBudget) {
      spentWakes.set(owner, spent + 1);
      owner.followup(message);
      return 'followup';
    }
    owner.inject(message);
    return 'inject';
  }

  /**
   * Drive one monitor process: poll its consuming output handle, split lines,
   * rate-limit, deliver. Returns the job hooks the registry expects.
   */
  function startMonitor({ proc, owner, description, timeoutMs, jobIdRef }) {
    const lines = new LineProcessor();
    const limiter = new MonitorRateLimiter({ capacity: config.rateLimitCapacity, refillMs: config.rateLimitRefillMs, autoKillMs: config.autoKillMs });
    const unread = new UnreadBuffer(config.unreadTailBytes);
    const state = { timedOut: false, autoKilled: false, killed: false, timeoutMs };
    let settled = false;

    const jobId = () => jobIdRef.id ?? 'monitor';

    function emit(batch, { final = false } = {}) {
      if (batch.length === 0) return;
      for (const line of batch) unread.push(line);
      if (final) {
        deliver(owner, jobId(), description, batchLines(batch));
        return;
      }
      const outcome = limiter.process();
      switch (outcome.kind) {
        case 'allowed':
          deliver(owner, jobId(), description, outcome.catchUpNotice === undefined ? batchLines(batch) : `${outcome.catchUpNotice}\n${batchLines(batch)}`);
          break;
        case 'auto-kill':
          state.autoKilled = true;
          proc.kill();
          deliver(owner, jobId(), description, outcome.message);
          break;
        default:
          break;
      }
    }

    function pump() {
      if (settled) return;
      let read;
      try {
        read = proc.readOutput();
      } catch (error) {
        ctx.logger.warn('monitor: readOutput failed: %o', error);
        return;
      }
      if (read.lossy) unread.push('[monitor output truncated by the executor]');
      if (read.delta !== '') emit(lines.push(read.delta));
    }

    const poller = setInterval(pump, config.debounceMs);
    poller.unref?.();
    const deadline = timeoutMs > 0
      ? setTimeout(() => { state.timedOut = true; proc.kill(); }, timeoutMs)
      : undefined;
    deadline?.unref?.();

    const done = proc.done.then(() => {
      settled = true;
      clearInterval(poller);
      if (deadline !== undefined) clearTimeout(deadline);
      // Final drain: the last lines (DONE / FAILED) ride one injected event so
      // the upstream completion notice that follows opens at most one turn.
      let tail = [];
      try {
        const read = proc.readOutput();
        tail = lines.push(read.delta);
      } catch (error) {
        ctx.logger.warn('monitor: final readOutput failed: %o', error);
      }
      const partial = lines.flush();
      if (partial !== undefined) tail.push(partial);
      if (tail.length > 0) {
        for (const line of tail) unread.push(line);
        owner.inject(createUserMessage({
          content: [{ type: 'text', text: wrapMonitorEvent(description, batchLines(tail), jobId()) }],
          source: { kind: 'plugin', plugin: PLUGIN, form: 'notice', summary: boundContextSummary(`monitor ${jobId()} final output: ${description}`) },
        }));
      }
      const detail = outcomeDetail({ exitCode: proc.exitCode, signal: proc.signal, ...state });
      const status = state.autoKilled || state.timedOut ? 'failed' : state.killed || proc.status === 'killed' ? 'killed' : proc.exitCode === 0 ? 'completed' : 'failed';
      return { status, detail };
    });

    return {
      cancel: () => { state.killed = true; proc.kill(); },
      done,
      readOutput: () => unread.drain(),
    };
  }

  ctx.tools.register(defineTool({
    name: 'monitor',
    description: toolDescription(),
    parameters: {
      command: { type: 'string', required: true, description: 'Shell command or script. Each stdout line is an event; exit ends the watch.' },
      description: { type: 'string', required: true, description: 'Short human-readable description of what you are monitoring (shown in every event).' },
      timeout_ms: { type: 'number', description: `Kill the monitor after this deadline (ms). Default and max: ${MAX_TIMEOUT_MS} (10 h). Ignored when persistent is true.` },
      persistent: { type: 'boolean', description: 'Run for the lifetime of the session (no deadline). Stop with job_kill.' },
      workdir: { type: 'string', description: 'Working directory. Defaults to the session workspace; a relative path is resolved against it.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          jobId: { type: 'string', required: true },
          timeoutMs: { type: 'number', required: true },
          persistent: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `started monitor ${value.jobId}${value.persistent ? ' (persistent; stop with job_kill)' : ` (deadline ${Math.round(value.timeoutMs / 60_000)} min)`}. Events arrive as <monitor-event> blocks; unread lines via job_output.` }],
    },
    presentCall: args => ({ card: 'generic', title: `[monitor] ${args.description}`, kind: 'monitor', rawInput: args.command }),
    async execute(args, exec) {
      const owner = exec.agent;
      if (owner === undefined) throw new Error('monitor requires an agent session to deliver events to');
      if (typeof args.command !== 'string' || args.command.trim() === '') throw new Error('command must be a non-empty string');
      if (typeof args.description !== 'string' || args.description.trim() === '') throw new Error('description must be a non-empty string');
      const timeoutMs = resolveTimeout({ timeoutMs: args.timeout_ms, persistent: args.persistent });
      if (exec.signal?.aborted) throw new Error('tool call aborted');

      const policy = sandboxPolicy?.resolve({ session: owner.session });
      const workdir = resolveWorkdir(args.workdir, policy?.workspaceRoot ?? owner.session.header.cwd);
      const description = args.description.trim();
      const spec = ctx.shell.resolve({
        command: args.command,
        ...workdir !== undefined ? { workdir } : {},
        env: { PYTHONUNBUFFERED: '1' },
        dshEnv: ctx.shellEnv.collect(exec),
        ...policy !== undefined ? { sandboxPolicy: policy } : {},
      });

      const jobIdRef = { id: undefined };
      jobIdRef.id = ctx.jobs.start({
        kind: 'monitor',
        label: `[monitor] ${description}`,
        owner,
        outputLimitBytes: config.outputLimitBytes,
        run: () => startMonitor({ proc: ctx.shell.start(spec), owner, description, timeoutMs, jobIdRef }),
      });
      return { jobId: jobIdRef.id, timeoutMs, persistent: timeoutMs === 0 };
    },
  }));
}
