import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import SessionStore from '@deepseek-ai/dsh-session';
import { SessionPersistence, SessionPersistenceNotFoundError } from '@deepseek-ai/dsh-session-persistence';
import { SessionQueryEngine } from '@deepseek-ai/dsh-session-query';
import { createUserMessage, createMessage } from '@deepseek-ai/dsh-llm';
import { createRemoteSessions, REMOTE_SESSIONS_PATH } from '../src/remote-sessions.mjs';

const host = { id: '11111111-1111-4111-8111-111111111111', name: 'Worker', platform: 'linux' };
const sessionId = 'session-22222222-2222-4222-8222-222222222222';
const unknownId = 'session-33333333-3333-4333-8333-333333333333';
const cwd = '/workspace', origin = 'https://worker.example';

class ListingPersistence extends SessionPersistence {
  calls = 0;
  failing = false;
  async list() {
    this.calls++;
    if (this.failing) throw new Error('unrelated persistence listing failure');
    return [];
  }
  async stat(id) { throw new SessionPersistenceNotFoundError(id); }
}

function fixture(t, transform = observation => observation) {
  const ctx = new Context(), sessions = new SessionStore(ctx);
  const persistence = new ListingPersistence(ctx), engine = new SessionQueryEngine(ctx);
  const session = sessions.prepare(sessionId, { meta: { cwd, isSeeded: false }, seed: [
    { type: 'user/message', seq: 0, time: 1, surfaceOp: 'append', data: createUserMessage({ content: [{ type: 'text', text: 'needle' }], source: { kind: 'user' } }) },
    { type: 'assistant/message', seq: 1, time: 2, surfaceOp: 'append', data: { turn: 1, step: 1, stream: [], message: createMessage({
      role: 'assistant', source: { kind: 'model', provider: 'grok', model: 'grok-4.6' },
      content: [{ type: 'reasoning', text: 'private reasoning' }, { type: 'text', text: 'answer token=synthetic-redaction-fixture' }, { type: 'tool-call', id: 'call-1', name: 'write', arguments: '{}' }],
    }) } },
  ] });
  t.after(sessions.enter(session));
  const counts = { lists: 0, observations: 0, disposals: 0 };
  const query = {
    listSessions(signal) { counts.lists++; return engine.listSessions(signal); },
    async observeSession(id, options) {
      counts.observations++;
      assert.equal(options.projectionMode, 'none');
      const observation = await engine.observeSession(id, options);
      const dispose = observation[Symbol.dispose].bind(observation);
      observation[Symbol.dispose] = () => { counts.disposals++; dispose(); };
      return transform(observation);
    },
  };
  const worker = createRemoteSessions({ hub: { info: () => host }, query });
  const input = { action: 'read', cwd, sessionId, expectedHost: host.id, limit: 1 };
  const post = (body, headers = {}) => worker.route.fetch(new Request(origin + REMOTE_SESSIONS_PATH, {
    method: 'POST', headers: { Host: 'worker.example', Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }));
  return { worker, input, post, counts, persistence, sessions, session };
}

test('known-ID page reads observe directly without listing and dispose every lease', async t => {
  const f = fixture(t);
  for (let i = 0; i < 5; i++) {
    const offset = i % 3;
    const response = await f.post({ ...f.input, offset });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.nextOffset, offset < 2 ? offset + 1 : null);
    assert.equal(result.items.length, offset < 2 ? 1 : 0);
    assert.doesNotMatch(JSON.stringify(result), /private reasoning|synthetic-redaction-fixture|arguments|tool-call/);
  }
  assert.deepEqual(f.counts, { lists: 0, observations: 5, disposals: 5 });
  assert.equal(f.persistence.calls, 0);
  assert.equal(f.sessions.get(sessionId), f.session);
});

test('live reads survive persistence list failure, while list failure remains retryable', async t => {
  const f = fixture(t);
  f.persistence.failing = true;
  const listing = { action: 'list', cwd, expectedHost: host.id };
  assert.equal((await f.post(listing)).status, 400);
  assert.equal(f.persistence.calls, 1, 'real query reached the failing persistence backend');
  const response = await f.post(f.input);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).items[0].text, 'needle');
  assert.deepEqual(f.counts, { lists: 1, observations: 1, disposals: 1 });
  assert.equal(f.persistence.calls, 1);
  f.persistence.failing = false;
  assert.equal((await f.post(listing)).status, 200);
  assert.equal(f.persistence.calls, 2);
});

test('remote search lists the corpus exactly once and disposes its observation', async t => {
  const f = fixture(t);
  const response = await f.post({ action: 'search', cwd, expectedHost: host.id, query: 'needle' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).items[0].sessionId, sessionId);
  assert.deepEqual(f.counts, { lists: 1, observations: 1, disposals: 1 });
  assert.equal(f.persistence.calls, 1);
});

test('direct reads preserve host, origin, cwd, ID, paging and cancellation fences', async t => {
  const f = fixture(t);
  for (const invalid of [
    { expectedHost: unknownId.slice(8) }, { sessionId: '../escape' }, { cwd: 'relative' },
    { cwd: '/workspace/../other' }, { offset: -1 }, { offset: 1.5 }, { limit: 0 }, { limit: 51 },
  ]) assert.equal((await f.post({ ...f.input, ...invalid })).status, 400);
  assert.equal((await f.post(f.input, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.post(f.input, { Host: 'evil.example' })).status, 403);
  await assert.rejects(f.worker.local(f.input, AbortSignal.abort()));
  assert.deepEqual(f.counts, { lists: 0, observations: 0, disposals: 0 });
  assert.equal((await f.post({ ...f.input, cwd: '/other' })).status, 400);
  assert.deepEqual(f.counts, { lists: 0, observations: 1, disposals: 1 });
  assert.equal((await f.post({ ...f.input, sessionId: unknownId })).status, 400);
  assert.deepEqual(f.counts, { lists: 0, observations: 2, disposals: 1 });
});

test('observed ID mismatch and message-read failure both reject and dispose', async t => {
  for (const transform of [
    observation => ({ ...observation, header: { ...observation.header, id: unknownId } }),
    observation => { Object.defineProperty(observation, 'events', { get() { throw new Error('read failure'); } }); return observation; },
  ]) {
    const f = fixture(t, transform);
    assert.equal((await f.post(f.input)).status, 400);
    assert.deepEqual(f.counts, { lists: 0, observations: 1, disposals: 1 });
  }
});
