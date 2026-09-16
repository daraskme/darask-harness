import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import LlmRuntime from '@deepseek-ai/dsh-llm';
import { DeepSeekAdapter, resolveAdapterOptions } from '@deepseek-ai/dsh-llm-deepseek';
import { decorateRequest, createObservation, observeMessages } from '../src/addons/hooks.mjs';

const require = createRequire(import.meta.url);
const { installModelSelectionProjection } = await import(pathToFileURL(join(dirname(require.resolve('@deepseek-ai/dsh-api-session-controller')), 'types/model-selection-projection.js')));
const store = { enabled: () => true };
const observe = text => { const observation = createObservation(); observeMessages(observation, [{ role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text }] }]); return observation; };
function native(t, config = {}) {
  const runtime = new LlmRuntime(new Context());
  const adapter = new DeepSeekAdapter({ options: () => resolveAdapterOptions(config), resolveApiKey: async () => { throw new Error('Network must not be used by regression tests'); } });
  const handle = runtime.registerAdapter(['deepseek-official'], adapter); t.after(handle);
  return runtime;
}
for (const model of ['deepseek-v4-pro', 'deepseek-flash']) {
  test(`${model}: the real adapter accepts the decorated bugfix request without medium`, async t => {
    const llm = native(t); const original = Object.freeze({ provider: 'deepseek-official', model, reasoningEffort: 'medium' });
    await assert.rejects(llm.prepareCall(original), error => error.code === 'UNSUPPORTED_REASONING_EFFORT');
    const fixed = decorateRequest(store, observe('エラーを修正して'), original, await llm.resolveModelInfo(original.provider, model));
    const prepared = await llm.prepareCall(fixed);
    assert.equal(prepared.config.reasoningEffort, 'high');
    assert.equal(original.reasoningEffort, 'medium');
    assert.equal(prepared.config.provider, original.provider); assert.equal(prepared.config.model, model);
  });
}
test('manual selection stays consistent with request headers and clears the native pending selection', async t => {
  const llm = native(t); let projection;
  installModelSelectionProjection({ sessionProjections: { register(value) { projection = value; } } });
  for (const effort of ['off', 'low', 'high', 'max']) {
    const resolved = await llm.resolveCallConfig({ provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: effort });
    const selection = { provider: resolved.provider, model: resolved.model, reasoningEffort: resolved.reasoningEffort };
    let state = projection.apply(projection.init(), { type: 'model/selection', data: selection });
    const decorated = decorateRequest(store, observe('hello'), selection, await llm.resolveModelInfo(selection.provider, selection.model));
    const prepared = await llm.prepareCall(decorated);
    state = projection.apply(state, { type: 'request/header', data: { header: { config: prepared.config, adapterDefaults: prepared.adapterDefaults } } });
    assert.equal(state.pending, null, 'a stale pending selection must not disagree with the active request');
    assert.deepEqual(projection.wire.view(state).next, selection);
  }
});
test('thinking-disabled deployment stays off for research and retries, including inherited effort', async t => {
  const llm = native(t, { thinking: 'disabled' });
  const request = { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'medium' };
  const info = await llm.resolveModelInfo(request.provider, request.model);
  const fixed = decorateRequest(store, observe('調査して'), request, info);
  assert.equal((await llm.prepareCall(fixed)).config.reasoningEffort, 'off');
  const again = decorateRequest(store, observe('調査して'), { ...request, reasoningEffort: 'off' }, info);
  assert.equal((await llm.prepareCall(again)).config.reasoningEffort, 'off');
});
test('capability matching applies to arbitrary and non-reasoning models, including disabled addons', () => {
  const request = { provider: 'example', model: 'custom', reasoningEffort: 'medium', maxTokens: 512 };
  const textOnly = { provider: 'example', id: 'custom', name: 'Custom' };
  const fixed = decorateRequest({ enabled: () => false }, undefined, request, textOnly);
  assert.deepEqual(fixed, { provider: 'example', model: 'custom', maxTokens: 512 });
  const capable = { ...textOnly, reasoning: { efforts: ['low', 'medium', 'high'].map(id => ({ id, name: id })), defaultEffort: 'medium' } };
  assert.equal(decorateRequest(store, observe('調査して'), { ...request, reasoningEffort: undefined }, capable).reasoningEffort, 'high');
  assert.equal(decorateRequest(store, observe('調査して'), request, capable).reasoningEffort, 'medium');
  const unknown = { provider: 'example', model: 'custom' };
  assert.strictEqual(decorateRequest(store, observe('調査して'), unknown), unknown, 'unknown capability must not receive an invented effort');
});
