import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import LlmRuntime, { LlmAdapter } from '@deepseek-ai/dsh-llm';
import { createCodexRelay } from '../src/codex-relay.mjs';
import { createSharedModels } from '../src/shared-models.mjs';

const origin = 'https://hub.fixture.ts.net';
const node = '11111111-1111-4111-8111-111111111111';
const collect = async stream => { const out = []; for await (const part of stream) out.push(part); return out; };
test('remote OpenRouter catalog, exact reasoning and stream use native runtimes without worker credentials', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'darask-shared-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const hubLlm = new LlmRuntime(new Context()), workerLlm = new LlmRuntime(new Context());
  let models = ['vendor/chosen'], seen;
  class Adapter extends LlmAdapter {
    async listModels(provider) { return models.map(id => ({ provider, id, name: id })); }
    async resolveModel(provider, id) { return { provider, id, name: id, context: { contextWindow: 128000 }, inputModalities: ['text'], reasoning: { efforts: [{ id: 'low', name: 'Low' }], defaultEffort: 'low' } }; }
    async *stream(options) { seen = options; yield { type: 'finish', reason: { kind: 'stop' } }; }
  }
  hubLlm.registerAdapter(['openrouter'], new Adapter());
  workerLlm.registerAdapter(['openrouter'], new Adapter());
  const hubRelay = createCodexRelay({ directory, hub: {}, llm: hubLlm });
  const relay = createCodexRelay({ directory, llm: workerLlm, hub: { info: () => ({ id: 'worker' }), remoteConnection: async () => ({ node: { url: origin }, host: { id: 'hub' }, cookie: 'fixture-session' }) }, fetch: async (url, init) => {
    assert.equal(init.headers.Authorization, undefined);
    assert.equal(init.headers.Cookie, 'fixture-session');
    const route = hubRelay.routes.find(route => route.path === url.pathname);
    return route.fetch(new Request(url, init));
  } });
  const shared = createSharedModels({ llm: workerLlm, relay });
  t.after(() => { shared.dispose(); relay.dispose(); hubRelay.dispose(); });
  const connection = relay.routes[0];
  const select = value => connection.fetch(new Request(origin + connection.path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ node: value }) }));
  assert.equal((await select(node)).status, 200);
  await shared.refresh();
  const route = 'darask-shared-openrouter';
  assert.ok(workerLlm.listProviders().some(p => p.id === 'openrouter'), 'local route remains');
  assert.equal((await workerLlm.listModels(route))[0].id, 'vendor/chosen');
  const exact = await workerLlm.resolveModelInfo(route, 'vendor/chosen');
  assert.equal(exact.reasoning.defaultEffort, 'low');
  assert.equal(exact.context.contextWindow, 128000);
  const chunks = await collect(workerLlm.stream({ provider: route, model: 'vendor/chosen', reasoningEffort: 'low', messages: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }] }));
  assert.equal(chunks.at(-1).reason.kind, 'stop');
  assert.equal(seen.provider, 'openrouter');
  assert.equal(seen.model, 'vendor/chosen');
  models = ['vendor/updated']; await shared.refresh();
  assert.deepEqual((await workerLlm.listModels(route)).map(m => m.id), models);
  const before = await workerLlm.resolveModelInfo(route, 'vendor/not-listed');
  assert.equal(before.id, 'vendor/not-listed', 'advisory catalog does not reject exact routes');
  await select(null); await shared.refresh();
  assert.ok(!workerLlm.listProviders().some(p => p.id === route));
  assert.ok(workerLlm.listProviders().some(p => p.id === 'openrouter'));
});
