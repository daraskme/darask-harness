import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_CATALOGS, defaultModelVisibility, updateModelCatalogIfRegistered, validateModelVisibility, visibleModelCatalog } from '../src/model-catalogs.mjs';

test('default model visibility exposes only the requested provider catalogs', () => {
  const defaults = defaultModelVisibility();
  assert.deepEqual(defaults.deepseek, ['deepseek-flash', 'deepseek-v4-pro']);
  assert.deepEqual(defaults.openai, ['gpt-5.6-sol', 'gpt-5.6-luna']);
  assert.deepEqual(defaults.codex, ['gpt-6-astra', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']);
  assert.deepEqual(defaults.grok, ['grok-4.6']);
  assert.deepEqual(defaults.claude, ['claude-fable-5-1', 'claude-opus-5', 'claude-sonnet-5']);
  assert.deepEqual(defaults.openrouter, MODEL_CATALOGS.openrouter.map(model => model.id));
});

test('model visibility persists empty selections and rejects unknown ids', () => {
  const visibility = validateModelVisibility({ openrouter: [], openai: ['gpt-5.6-luna'], deepseek: ['deepseek-v4-pro'] });
  assert.deepEqual(visibleModelCatalog('deepseek', visibility).map(model => model.id), ['deepseek-flash', 'deepseek-v4-pro']);
  assert.deepEqual(visibleModelCatalog('openrouter', visibility), []);
  assert.deepEqual(visibleModelCatalog('openai', visibility).map(model => model.id), ['gpt-5.6-luna']);
  assert.throws(() => validateModelVisibility({ openai: ['made-up-model'] }), /visible models/u);
});

test('optional provider catalogs are skipped when their settings namespace is absent', async () => {
  const writes = [];
  const settings = {
    get: namespace => namespace === 'llm-grok' ? undefined : {},
    update: async (namespace, value) => writes.push({ namespace, value }),
  };
  assert.equal(await updateModelCatalogIfRegistered(settings, 'llm-grok', ['grok-4.6']), false);
  assert.equal(await updateModelCatalogIfRegistered(settings, 'llm-openai-codex', ['gpt-6-astra']), true);
  assert.deepEqual(writes, [{ namespace: 'llm-openai-codex', value: { models: ['gpt-6-astra'] } }]);
});
