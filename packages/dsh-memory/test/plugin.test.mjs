import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Config, apply, sliceTurnEvents } from '../src/index.mjs';
import { condenseTranscript } from '../src/transcript.mjs';

async function scratch() {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-memory-plugin-'));
  return { dir, [Symbol.asyncDispose]: () => rm(dir, { recursive: true, force: true, maxRetries: 5 }) };
}

/** Surface the primary failure instead of node's opaque SuppressedError when disposal also fails. */
function unsuppressed(body) {
  return async t => {
    try {
      await body(t);
    } catch (error) {
      let cause = error;
      while (cause instanceof SuppressedError) cause = cause.error;
      throw cause;
    }
  };
}

function userMessage(text, kind = 'human') {
  return { type: 'user/message', data: { role: 'user', content: [{ type: 'text', text }], source: { kind } } };
}

function turnEvents(turn, { user, assistant, tool }) {
  const events = [userMessage(user), { type: 'turn/start', data: { turn } }];
  if (tool) {
    events.push({ type: 'assistant/message', data: { turn, step: 0, message: { role: 'assistant', content: [{ type: 'tool-call', id: 't1', name: tool.name, arguments: tool.args }] } } });
    events.push({ type: 'tool/result', data: { turn, step: 0, message: { role: 'tool', toolCallId: 't1', content: [{ type: 'text', text: tool.result }] }, error: tool.error } });
  }
  events.push({ type: 'assistant/message', data: { turn, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: assistant }] } } });
  events.push({ type: 'turn/end', data: { turn, reason: 'completed' } });
  return events;
}

function fakeCtx({ replies }) {
  const listeners = new Map();
  const tools = new Map();
  const commands = new Map();
  const calls = [];
  const disposers = [];
  const warnings = [];
  const ctx = {
    logger: { debug() {}, info() {}, warn(...args) { warnings.push(args); } },
    on(event, handler) { listeners.set(event, handler); return () => listeners.delete(event); },
    tools: { register(tool) { tools.set(tool.name, tool); return () => tools.delete(tool.name); } },
    commands: { register(definition) { commands.set(definition.name, definition); return () => commands.delete(definition.name); } },
    effect(generator) {
      for (const disposer of generator()) disposers.push(disposer);
    },
    llm: {
      async *stream(options) {
        calls.push(options);
        const reply = replies.shift();
        if (reply === undefined) throw new Error('unexpected model call');
        yield { type: 'block-start', index: 0, blockType: 'text' };
        yield { type: 'text-delta', index: 0, text: reply };
        yield { type: 'block-end', index: 0, block: { type: 'text', text: reply } };
        yield { type: 'finish', reason: { kind: 'stop' } };
      },
    },
  };
  const dispose = async () => { for (const disposer of disposers.splice(0).reverse()) await disposer(); };
  return { ctx, listeners, tools, commands, calls, warnings, dispose, [Symbol.asyncDispose]: dispose };
}

function fakeSession({ id, cwd, events }) {
  return {
    id,
    header: { id, cwd, origin: 'user' },
    surface: { nodes: [] },
    eventAt() { return undefined; },
    snapshotEvents: () => events,
    requestContext: () => ({ provider: 'ctx-provider', model: 'ctx-model' }),
  };
}

test('sliceTurnEvents keeps the opening user message and stops at the requested turn end', () => {
  const events = [...turnEvents(1, { user: 'one', assistant: 'a1' }), ...turnEvents(2, { user: 'two', assistant: 'a2' }), ...turnEvents(3, { user: 'three', assistant: 'a3' })];
  const slice = sliceTurnEvents(events, 2, 2);
  assert.equal(slice[0].data.content[0].text, 'two');
  assert.equal(slice.at(-1).type, 'turn/end');
  assert.equal(slice.at(-1).data.turn, 2);
  assert.deepEqual(sliceTurnEvents(events, 9, 9), []);
  assert.equal(sliceTurnEvents(events, 1, 3).length, events.length);
});

test('condenseTranscript attributes user messages to turns, bounds tool output and drops non-human sources', () => {
  const events = [
    ...turnEvents(1, { user: 'first ask', assistant: 'done', tool: { name: 'bash', args: { command: 'npm test' }, result: 'x'.repeat(5000) } }),
    userMessage('plugin noise', 'plugin'),
    ...turnEvents(2, { user: 'second ask', assistant: 'ok' }),
  ];
  const { items, text } = condenseTranscript(events, { fromTurn: 1, throughTurn: 2 });
  assert.deepEqual(items.filter(item => item.role === 'user').map(item => [item.turn, item.text]), [[1, 'first ask'], [2, 'second ask']]);
  const toolResult = items.find(item => item.role === 'tool-result');
  assert.ok(Buffer.byteLength(toolResult.text) < 1400);
  assert.match(text, /## Turn 1\n\[user\]\nfirst ask/u);
  assert.match(text, /\[tool-call bash\] \{"command":"npm test"\}/u);
  assert.doesNotMatch(text, /plugin noise/u);
  const small = condenseTranscript(events, { fromTurn: 1, throughTurn: 2, budget: 200 });
  assert.ok(Buffer.byteLength(small.text) <= 200 + 64);
  assert.ok(small.items.every(item => item.role !== 'tool-result'), 'tool output is dropped first');
});

test('plugin captures completed turns into scoped stores, serves tools and injects context once', unsuppressed(async () => {
  await using home = await scratch();
  await using ws = await scratch();
  await mkdir(join(ws.dir, '.git'));
  const project = join(ws.dir, 'sub');
  await mkdir(project);

  const observations = JSON.stringify({ outcome: 'observations', observations: [
    { type: 'user', statement: 'Prefers Japanese answers', keywords: ['japanese'] },
    { type: 'project', topic_hint: 'testing', statement: 'Tests run with npm run check', keywords: ['npm', 'check'], body: 'PowerShell needs explicit paths.' },
  ] });
  await using harness = fakeCtx({ replies: [observations, '{"outcome":"noop"}'] });
  const config = new Config({ dshHome: home.dir, provider: 'p', model: 'm', dreamMinPending: 1000 });
  apply(harness.ctx, config);
  assert.deepEqual([...harness.tools.keys()].sort(), ['memory_get', 'memory_search']);
  assert.ok(harness.commands.has('memory'));

  const events = [...turnEvents(1, { user: 'How do I test?', assistant: 'Run npm run check.' })];
  const session = fakeSession({ id: 'sess-a', cwd: project, events });
  harness.listeners.get('session/event')(session, { type: 'turn/end', data: { turn: 1, reason: 'completed' } });
  harness.listeners.get('session/event')(session, { type: 'turn/end', data: { turn: 1, reason: 'interrupted' } });
  const agent = { session };
  const status = await harness.commands.get('memory').handler({ rawInput: '', agent });
  assert.equal(status.kind, 'success');
  assert.match(status.text, /pending=1/u);
  assert.match(status.text, /Capture progress for this session: turn 1/u);
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].provider, 'p');
  assert.equal(harness.calls[0].purpose, 'compaction');
  assert.match(harness.calls[0].messages[0].content[0].text, /How do I test\?/u);

  const globalDir = join(home.dir, 'darask', 'memory', 'global');
  const workspaces = await readdir(join(home.dir, 'darask', 'memory', 'workspaces'));
  assert.equal(workspaces.length, 1, 'workspace resolved to the .git root');
  assert.equal((await readdir(join(globalDir, 'observations', '_inbox'))).length, 1);
  assert.match(await readFile(join(globalDir, 'MEMORY.md'), 'utf8'), /Prefers Japanese answers/u);

  const exec = { agent };
  const search = await harness.tools.get('memory_search').execute({ query: 'npm check' }, exec);
  assert.equal(search.results.length, 1);
  assert.equal(search.results[0].scope, 'workspace');
  const rendered = harness.tools.get('memory_search').output.render({}, search);
  assert.match(rendered[0].text, /historical context/u);
  const got = await harness.tools.get('memory_get').execute({ path: search.results[0].path }, exec);
  assert.match(got.content, /PowerShell needs explicit paths/u);
  await assert.rejects(harness.tools.get('memory_get').execute({ path: '../MEMORY.md' }, exec), /must start with topics\//u);
  await assert.rejects(harness.tools.get('memory_get').execute({ path: 'topics/../../MEMORY.md' }, exec), /not allowed|depth/u);
  await assert.rejects(harness.tools.get('memory_search').execute({ query: 'x', scope: 'planet' }, exec), /scope must be/u);
  await assert.rejects(harness.tools.get('memory_search').execute({ query: 'x', limit: 0 }, exec), /limit/u);
  const globalOnly = await harness.tools.get('memory_search').execute({ query: 'japanese', scope: 'global' }, exec);
  assert.equal(globalOnly.results[0].scope, 'global');

  events.push(...turnEvents(2, { user: 'thanks', assistant: 'np' }));
  harness.listeners.get('session/event')(session, { type: 'turn/end', data: { turn: 2, reason: 'completed' } });
  const after = await harness.commands.get('memory').handler({ rawInput: 'status', agent });
  assert.match(after.text, /Capture progress for this session: turn 2/u);
  assert.equal(harness.calls.length, 2);
  assert.match(harness.calls[1].messages[0].content[0].text, /## Turn 2\n\[user\]\nthanks/u);
  assert.doesNotMatch(harness.calls[1].messages[0].content[0].text, /How do I test/u, 'captured range excludes already-captured turns');

  const preStep = harness.listeners.get('agent/pre-step');
  const base = { kind: 'proceed', messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }] };
  const decision = await preStep({ agent, messages: base.messages, signal: new AbortController().signal }, async () => base);
  assert.equal(decision.messages.length, 2);
  assert.match(decision.messages[1].content[0].text, /Tests run with npm run check/u);
  assert.match(decision.messages[1].content[0].text, /historical context/u);
  assert.equal(decision.messages[1].source.plugin, 'darask-memory');
  const again = await preStep({ agent, messages: base.messages, signal: new AbortController().signal }, async () => base);
  assert.equal(again.messages.length, 1, 'context is injected once per session');

  const cleared = await harness.commands.get('memory').handler({ rawInput: 'clear global', agent });
  assert.equal(cleared.kind, 'error');
  assert.equal((await harness.commands.get('memory').handler({ rawInput: 'clear global --yes', agent })).kind, 'success');
  assert.equal((await readdir(join(globalDir, 'observations', '_inbox'))).length, 0);
  assert.equal(harness.warnings.length, 0, JSON.stringify(harness.warnings));
  await harness.dispose();
}));

test('capture failures are logged, do not block later turns, and dream runs from the command', unsuppressed(async () => {
  await using home = await scratch();
  await using ws = await scratch();
  const dreamPlan = ({ observations }) => JSON.stringify({ operations: [{ op: 'create', path: 'topics/prefs.md', content: '# Preferences\n\n## Locale\nJapanese.', evidence: observations }] });
  const replies = ['this is not json', JSON.stringify({ outcome: 'observations', observations: [{ type: 'feedback', statement: 'Use Japanese', keywords: ['locale'] }] })];
  await using harness = fakeCtx({ replies });
  apply(harness.ctx, new Config({ dshHome: home.dir, dreamMinPending: 1000 }));
  const events = [...turnEvents(1, { user: 'a', assistant: 'b' })];
  const session = fakeSession({ id: 's', cwd: ws.dir, events });
  const fire = turn => harness.listeners.get('session/event')(session, { type: 'turn/end', data: { turn, reason: 'completed' } });
  fire(1);
  events.push(...turnEvents(2, { user: 'c', assistant: 'd' }));
  fire(2);
  const agent = { session };
  const status = await harness.commands.get('memory').handler({ rawInput: 'status', agent });
  assert.equal(harness.warnings.length, 1);
  assert.match(String(harness.warnings[0][0]), /capture failed/u);
  assert.match(status.text, /Capture progress for this session: turn 2/u);
  assert.equal(harness.calls[0].provider, 'ctx-provider', 'route falls back to the session request context');
  assert.match(harness.calls[1].messages[0].content[0].text, /## Turn 1\n\[user\]\na\n/u, 'failed range is retried with the next turn');

  const inbox = await readdir(join(home.dir, 'darask', 'memory', 'global', 'observations', '_inbox'));
  assert.equal(inbox.length, 1);
  replies.push(dreamPlan({ observations: inbox.map(file => `observations/_inbox/${file}`) }));
  const dreamed = await harness.commands.get('memory').handler({ rawInput: 'dream global', agent });
  assert.equal(dreamed.kind, 'success', dreamed.text);
  assert.match(dreamed.text, /\[global\] completed: 1 operations, 1 observations archived/u);
  assert.match(await readFile(join(home.dir, 'darask', 'memory', 'global', 'topics', 'prefs.md'), 'utf8'), /^# Preferences/u);
  assert.match(await readFile(join(home.dir, 'darask', 'memory', 'global', 'MEMORY.md'), 'utf8'), /\[Preferences\]\(topics\/prefs\.md\)/u);
  const skipped = await harness.commands.get('memory').handler({ rawInput: 'dream workspace', agent });
  assert.match(skipped.text, /skipped \(nothing-pending\)/u);
  const found = await harness.commands.get('memory').handler({ rawInput: 'search locale japanese', agent });
  assert.match(found.text, /topics\/prefs\.md/u);
  await harness.dispose();
}));
