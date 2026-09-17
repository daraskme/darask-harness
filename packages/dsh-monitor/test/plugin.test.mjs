import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { Config, UnreadBuffer, apply, outcomeDetail, resolveWorkdir } from '../src/index.mjs';

class FakeProcess {
  status = 'running';
  exitCode = null;
  signal = null;
  #pending = '';
  #lossy = false;
  #resolve;

  constructor() {
    this.done = new Promise(resolve => { this.#resolve = resolve; });
  }

  write(text, { lossy = false } = {}) {
    this.#pending += text;
    if (lossy) this.#lossy = true;
  }

  readOutput() {
    const delta = this.#pending;
    const lossy = this.#lossy;
    this.#pending = '';
    this.#lossy = false;
    return { delta, lossy };
  }

  exit(code) {
    if (this.status !== 'running') return;
    this.status = 'completed';
    this.exitCode = code;
    this.#resolve();
  }

  kill() {
    if (this.status !== 'running') return false;
    this.status = 'killed';
    this.signal = 'SIGTERM';
    this.#resolve();
    return true;
  }
}

function fakeCtx({ sandboxMode, procs }) {
  const listeners = new Map();
  const tools = new Map();
  const jobs = [];
  const specs = [];
  const ctx = {
    logger: { debug() {}, info() {}, warn() {} },
    on(event, handler) { listeners.set(event, handler); return () => listeners.delete(event); },
    get(name) { return name === 'sandboxPolicy' && sandboxMode !== undefined ? { resolve: () => ({ mode: sandboxMode, workspaceRoot: '/sandbox/root' }) } : undefined; },
    tools: { register(tool) { tools.set(tool.name, tool); return () => tools.delete(tool.name); } },
    shell: {
      sandboxMode,
      resolve(request) { specs.push(request); return { ...request, workdir: request.workdir ?? '/default', timeoutMs: 0, stdoutMaxBytes: 1024 }; },
      start(spec) { const proc = new FakeProcess(); procs.push({ proc, spec }); return proc; },
    },
    shellEnv: { collect: () => ({ DSH_SESSION_ID: 's1' }) },
    jobs: {
      start(spec) {
        const id = `${spec.kind}-${jobs.length + 1}`;
        const hooks = spec.run();
        const job = { id, spec, hooks, status: 'running', outcome: undefined };
        job.settled = hooks.done.then(outcome => { job.status = outcome.status; job.outcome = outcome; return outcome; });
        jobs.push(job);
        return id;
      },
    },
  };
  return { ctx, listeners, tools, jobs, specs };
}

function fakeAgent(status = 'running') {
  const delivered = [];
  return {
    status,
    session: { id: 'session/1', header: { cwd: '/work/space' } },
    followup(message) { delivered.push({ via: 'followup', text: message.content[0].text, source: message.source }); },
    inject(message) { delivered.push({ via: 'inject', text: message.content[0].text, source: message.source }); },
    delivered,
  };
}

async function harness({ sandboxMode, agentStatus, config = {} } = {}) {
  const procs = [];
  const h = fakeCtx({ sandboxMode, procs });
  const agent = fakeAgent(agentStatus);
  apply(h.ctx, new Config({ debounceMs: 5, rateLimitRefillMs: 200, rateLimitCapacity: 3, autoKillMs: 150, ...config }));
  const monitor = (args, exec = {}) => h.tools.get('monitor').execute(args, { agent, callId: 'c1', signal: { aborted: false }, ...exec });
  return { h, agent, procs, monitor };
}

const settle = () => sleep(25);

test('helpers: workdir resolution, outcome detail, unread buffer', () => {
  assert.equal(resolveWorkdir(undefined, '/ws'), '/ws');
  assert.equal(resolveWorkdir('', '/ws'), '/ws');
  assert.equal(resolveWorkdir('sub', '/ws'), resolve('/ws', 'sub'));
  assert.equal(resolveWorkdir('/abs', '/ws'), '/abs');
  assert.equal(outcomeDetail({ exitCode: 0 }), 'exit code: 0');
  assert.equal(outcomeDetail({ exitCode: null, signal: 'SIGTERM', killed: true }), 'killed (SIGTERM)');
  assert.equal(outcomeDetail({ timedOut: true, timeoutMs: 90_000 }), 'timed out after 90s');
  assert.equal(outcomeDetail({ autoKilled: true }), 'auto-killed: output rate too high');

  const unread = new UnreadBuffer(12);
  unread.push('aaaa');
  unread.push('bbbb');
  unread.push('cccc');
  assert.equal(unread.drain(), '[1 earlier lines dropped]\nbbbb\ncccc\n');
  assert.equal(unread.drain(), '');
});

test('monitor validates input and rejects calls without an agent', async () => {
  const t = await harness();
  await assert.rejects(t.monitor({ command: 'x', description: 'd' }, { agent: undefined }), /requires an agent/u);
  await assert.rejects(t.monitor({ command: ' ', description: 'd' }), /command/u);
  await assert.rejects(t.monitor({ command: 'x', description: '' }), /description/u);
  await assert.rejects(t.monitor({ command: 'x', description: 'd', timeout_ms: 36_000_001 }), /persistent/u);
  assert.equal(t.procs.length, 0);
});

test('monitor starts a job through the shell executor and streams lines as injected events while running', async () => {
  const t = await harness();
  const result = await t.monitor({ command: 'tail -F app.log', description: 'watch "app" log' });
  assert.deepEqual(result, { jobId: 'monitor-1', timeoutMs: 36_000_000, persistent: false });
  const [{ proc, spec }] = t.procs;
  assert.equal(spec.command, 'tail -F app.log');
  assert.equal(spec.workdir, '/work/space');
  assert.deepEqual(spec.env, { PYTHONUNBUFFERED: '1' });
  assert.deepEqual(spec.dshEnv, { DSH_SESSION_ID: 's1' });
  assert.equal(spec.sandboxPolicy, undefined);
  const [job] = t.h.jobs;
  assert.equal(job.spec.kind, 'monitor');
  assert.equal(job.spec.label, '[monitor] watch "app" log');
  assert.equal(job.spec.owner, t.agent);

  proc.write('ERROR one\npartial');
  await settle();
  assert.equal(t.agent.delivered.length, 1);
  assert.equal(t.agent.delivered[0].via, 'inject');
  assert.equal(t.agent.delivered[0].text, '<monitor-event description="watch \'app\' log" job_id="monitor-1">\nERROR one\n</monitor-event>');
  assert.equal(t.agent.delivered[0].source.form, 'notice');
  assert.match(t.agent.delivered[0].source.summary, /monitor monitor-1: watch "app" log/u);

  proc.write(' line\n');
  await settle();
  assert.equal(t.agent.delivered.length, 2);
  assert.match(t.agent.delivered[1].text, /\npartial line\n/u);
  assert.equal(job.hooks.readOutput(), 'ERROR one\npartial line\n');
  assert.equal(job.hooks.readOutput(), '');

  proc.write('DONE');
  proc.exit(0);
  const outcome = await job.settled;
  assert.deepEqual(outcome, { status: 'completed', detail: 'exit code: 0' });
  assert.equal(t.agent.delivered.at(-1).via, 'inject');
  assert.match(t.agent.delivered.at(-1).text, /\nDONE\n<\/monitor-event>$/u);
  assert.equal(job.hooks.readOutput(), 'DONE\n');
});

test('idle agents are woken with followup up to the wake budget, then events are injected', async () => {
  const t = await harness({ agentStatus: 'idle', config: { maxConsecutiveWakes: 2, rateLimitCapacity: 10 } });
  await t.monitor({ command: 'watch', description: 'pr' });
  const [{ proc }] = t.procs;
  for (const line of ['a', 'b', 'c']) {
    proc.write(`${line}\n`);
    await settle();
  }
  assert.deepEqual(t.agent.delivered.map(event => event.via), ['followup', 'followup', 'inject']);
  // A user prompt resets the budget.
  t.h.listeners.get('agent/inbox/claimed')({ agent: t.agent, message: { source: { kind: 'user' } } });
  proc.write('d\n');
  await settle();
  assert.equal(t.agent.delivered.at(-1).via, 'followup');
  proc.kill();
  const outcome = await t.h.jobs[0].settled;
  assert.equal(outcome.status, 'killed');
});

test('bursts are rate-limited with a catch-up notice; sustained overload auto-kills the process', async () => {
  const t = await harness({ config: { rateLimitCapacity: 2, rateLimitRefillMs: 100, autoKillMs: 60 } });
  await t.monitor({ command: 'spam', description: 'noisy' });
  const [{ proc }] = t.procs;
  const [job] = t.h.jobs;
  proc.write('1\n');
  await settle();
  proc.write('2\n');
  await settle();
  proc.write('3\n');
  await settle();
  assert.equal(t.agent.delivered.length, 2, 'third event suppressed');
  await sleep(110);
  proc.write('4\n');
  await settle();
  assert.equal(t.agent.delivered.length, 3);
  assert.match(t.agent.delivered[2].text, /\[1 events suppressed -- output rate too high[^\n]*\]\n4\n/u);

  for (let index = 0; index < 20 && proc.status === 'running'; index += 1) {
    proc.write(`x${index}\n`);
    await sleep(10);
  }
  const outcome = await job.settled;
  assert.deepEqual(outcome, { status: 'failed', detail: 'auto-killed: output rate too high' });
  assert.match(t.agent.delivered.at(-1).text, /Monitor stopped -- your script produced too much output/u);
  assert.match(job.hooks.readOutput(), /x0\n/u);
});

test('timeouts kill the process and report failure; persistent monitors have no deadline', async () => {
  const t = await harness();
  const finite = await t.monitor({ command: 'sleep', description: 'deadline', timeout_ms: 30 });
  assert.equal(finite.persistent, false);
  const outcome = await t.h.jobs[0].settled;
  assert.deepEqual(outcome, { status: 'failed', detail: 'timed out after 0s' });
  assert.equal(t.procs[0].proc.status, 'killed');

  const persistent = await t.monitor({ command: 'forever', description: 'forever', persistent: true, timeout_ms: 5 });
  assert.deepEqual(persistent, { jobId: 'monitor-2', timeoutMs: 0, persistent: true });
  await sleep(30);
  assert.equal(t.procs[1].proc.status, 'running');
  t.h.jobs[1].hooks.cancel('teardown');
  assert.equal((await t.h.jobs[1].settled).status, 'killed');
});

test('a confining executor supplies the sandbox policy and its workspace root', async () => {
  const t = await harness({ sandboxMode: 'workspace-write' });
  await t.monitor({ command: 'x', description: 'sandboxed', workdir: 'sub' });
  const [{ spec }] = t.procs;
  assert.deepEqual(spec.sandboxPolicy, { mode: 'workspace-write', workspaceRoot: '/sandbox/root' });
  assert.equal(spec.workdir, resolve('/sandbox/root', 'sub'));
  t.procs[0].proc.exit(0);
  await t.h.jobs[0].settled;
});

test('lossy executor reads are surfaced through job_output', async () => {
  const t = await harness();
  await t.monitor({ command: 'x', description: 'lossy' });
  const [{ proc }] = t.procs;
  proc.write('kept\n', { lossy: true });
  await settle();
  assert.equal(t.h.jobs[0].hooks.readOutput(), '[monitor output truncated by the executor]\nkept\n');
  proc.exit(1);
  assert.deepEqual(await t.h.jobs[0].settled, { status: 'failed', detail: 'exit code: 1' });
});
