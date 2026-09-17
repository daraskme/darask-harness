import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import LlmRuntime, { LlmAdapter } from '@deepseek-ai/dsh-llm';
import { createCodexRelay } from '../src/codex-relay.mjs';
import { createSharedModels } from '../src/shared-models.mjs';

test('a remote with a saved hub exposes every hub provider after restart, retaining its own local models', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'darask-model-restart-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const hubDirectory = join(directory, 'hub'), workerDirectory = join(directory, 'worker');
  await Promise.all([mkdir(hubDirectory), mkdir(workerDirectory)]);
  const node = '11111111-1111-4111-8111-111111111111', origin = 'https://hub.fixture.ts.net';
  await writeFile(join(workerDirectory, 'codex-hub.json'), JSON.stringify({ version: 1, node }));
  const models = {
    'deepseek-official': ['deepseek-v4-pro'], grok: ['grok-4.6'],
    'openai-codex': ['gpt-6-astra'], anthropic: ['claude-opus-5'],
    openai: ['gpt-5.6-sol'], openrouter: ['vendor/chosen'], 'darask-local': ['hub-model'],
  };
  const hubLlm = new LlmRuntime(new Context());
  const seen = [];
  class Adapter extends LlmAdapter {
    async listModels(provider) { return models[provider].map(id => ({ provider, id, name: id })); }
    async resolveModel(provider, id) { return { provider, id, name: id, inputModalities: ['text'] }; }
    async *stream(options) { seen.push([options.provider, options.model]); yield { type: 'finish', reason: { kind: 'stop' } }; }
  }
  hubLlm.registerAdapter(Object.keys(models), new Adapter());
  const hubRelay = createCodexRelay({ directory: hubDirectory, hub: {}, llm: hubLlm });
  await hubRelay.initialize(); t.after(() => hubRelay.dispose());
  for (let restart = 0; restart < 2; restart++) {
    const workerLlm = new LlmRuntime(new Context());
    class Local extends Adapter { async listModels(provider) { return [{ provider, id: 'worker-q4', name: 'Worker Q4' }]; } }
    workerLlm.registerAdapter(['darask-local'], new Local());
    const relay = createCodexRelay({ directory: workerDirectory, llm: workerLlm,
      hub: { info: () => ({ id: 'worker' }), remoteConnection: async selected => {
        assert.equal(selected, node); return { node: { url: origin }, host: { id: 'hub' }, cookie: 'fixture-session' };
      } }, fetch: async (url, init) => {
        assert.equal(init.headers.Cookie, 'fixture-session');
        return hubRelay.routes.find(route => route.path === url.pathname).fetch(new Request(url, init));
      },
    });
    await relay.initialize();
    const shared = createSharedModels({ llm: workerLlm, relay });
    try {
      await shared.refresh();
      assert.deepEqual(workerLlm.listProviders().map(row => row.id).sort(),
        ['darask-local', ...Object.keys(models).map(id => 'darask-shared-' + id)].sort());
      assert.equal((await workerLlm.listModels('darask-local'))[0].id, 'worker-q4');
      for (const [provider, ids] of Object.entries(models)) {
        const route = 'darask-shared-' + provider;
        assert.deepEqual((await workerLlm.listModels(route)).map(row => row.id), ids);
        for (const model of ids) {
          assert.equal((await workerLlm.resolveModelInfo(route, model)).provider, route);
          const chunks = [];
          for await (const chunk of workerLlm.stream({ provider: route, model, messages: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }] })) chunks.push(chunk);
          assert.equal(chunks.at(-1).reason.kind, 'stop');
          assert.deepEqual(seen.at(-1), [provider, model]);
        }
      }
    } finally { shared.dispose(); relay.dispose(); }
    assert.deepEqual(workerLlm.listProviders().map(row => row.id), ['darask-local']);
  }
});
