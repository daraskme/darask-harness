import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import { SettingsProvider } from '@deepseek-ai/dsh-settings';
import Schema from '@deepseek-ai/schemastery';
import { syncModelCatalogs } from '../src/model-catalog-sync.mjs';

class MemorySettings extends SettingsProvider {
  writable = true;
  writes = [];
  async load() { return {}; }
  async persist(namespace, section) { this.writes.push({ namespace, section }); }
}

const modelSchema = Schema.object({
  models: Schema.array(Schema.string()).default([]),
  enabled: Schema.boolean().default(true),
});

test('catalog sync tolerates absent provider namespaces and updates them when registered', async () => {
  const settings = new MemorySettings(new Context());
  await assert.rejects(settings.update('llm-grok', { models: [] }), /not registered/);
  await syncModelCatalogs(settings);
  assert.deepEqual(settings.writes, []);

  settings.register('llm-openai-codex', modelSchema);
  await syncModelCatalogs(settings);
  assert.deepEqual(settings.writes.map(write => write.namespace), ['llm-openai-codex']);
  assert.ok(settings.get('llm-openai-codex').models.includes('gpt-6-astra'));

  settings.register('llm-grok', modelSchema);
  await syncModelCatalogs(settings, { grok: ['grok-4.6'] });
  assert.deepEqual(settings.get('llm-grok'), { models: ['grok-4.6'], enabled: true });
  assert.deepEqual(settings.writes.map(write => write.namespace), ['llm-openai-codex', 'llm-grok']);

  await syncModelCatalogs(settings, { grok: ['grok-4.6'] });
  assert.equal(settings.writes.length, 2);
  await syncModelCatalogs(settings, { grok: [] });
  assert.deepEqual(settings.get('llm-grok').models, []);
});

test('API catalogs stay available without credentials and preserve provider configuration', async () => {
  const settings = new MemorySettings(new Context());
  settings.register('llm-pi-ai', Schema.object({ providers: Schema.dict(Schema.object({}).loose()).default({}) }), {
    base: { providers: { openai: { baseUrl: 'https://api.example.test/v1' }, custom: { models: [{ id: 'custom' }] } } },
  });
  await syncModelCatalogs(settings, { openai: ['gpt-5.6-luna'], openrouter: [] });
  const providers = settings.get('llm-pi-ai').providers;
  assert.equal(providers.openai.displayName, 'OpenAI API');
  assert.equal(providers.openai.baseUrl, 'https://api.example.test/v1');
  assert.deepEqual(providers.openai.models.map(model => model.id), ['gpt-5.6-luna']);
  assert.deepEqual(providers.openrouter.models, []);
  assert.deepEqual(providers.custom, { models: [{ id: 'custom' }] });
  assert.equal(settings.writes.length, 2);
  await syncModelCatalogs(settings, { openai: ['gpt-5.6-luna'], openrouter: [] });
  assert.equal(settings.writes.length, 2);
});

test('catalog sync propagates errors from a registered read-only settings provider', async () => {
  const settings = new MemorySettings(new Context());
  settings.register('llm-grok', modelSchema);
  settings.writable = false;
  await assert.rejects(syncModelCatalogs(settings), /read-only/);
});
