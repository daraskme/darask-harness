import test from 'node:test';
import assert from 'node:assert/strict';
import { createJev, JEV_CREDENTIAL, JEV_MODEL, normalizeJevQuestions } from '../src/jev.mjs';

test('Jev converts typed tool questions to AI SDK evaluation questions', () => {
  assert.deepEqual(normalizeJevQuestions([
    { id: 'refunded', type: 'boolean', instructions: 'Was a refund issued?' },
    { id: 'route', type: 'choice', instructions: 'Choose a route', criteria: [
      { id: 'billing', description: 'Payment or invoice problem' },
      { id: 'technical', description: 'Product malfunction' },
    ] },
    { id: 'quality', type: 'score', instructions: 'Score the answer', criteria: [
      { id: 'bad', description: 'Incorrect' },
      { id: 'good', description: 'Complete and correct' },
    ] },
  ]), {
    refunded: { type: 'boolean', instructions: 'Was a refund issued?' },
    route: { type: 'choice', instructions: 'Choose a route', criteria: { billing: 'Payment or invoice problem', technical: 'Product malfunction' } },
    quality: { type: 'score', instructions: 'Score the answer', criteria: ['Incorrect', 'Complete and correct'] },
  });
  assert.throws(() => normalizeJevQuestions([{ id: 'bad id', type: 'boolean', instructions: 'Check' }]));
  assert.throws(() => normalizeJevQuestions([{ id: 'route', type: 'choice', instructions: 'Route', criteria: [] }]));
});

test('Jev stores only the Gateway credential and calls the evaluation model with ZDR', async () => {
  let stored;
  let removed;
  let gatewayOptions;
  let request;
  const credentials = {
    resolve: async key => key === JEV_CREDENTIAL && stored ? { value: stored } : undefined,
    set: async (key, value) => { assert.equal(key, JEV_CREDENTIAL); stored = value; },
    unset: async key => { removed = key; stored = undefined; },
  };
  const model = {};
  const jev = createJev({
    credentials,
    createGatewayImpl(options) {
      gatewayOptions = options;
      return { evaluationModel(id) { assert.equal(id, JEV_MODEL); return model; } };
    },
    async evaluateImpl(options) {
      request = options;
      return { answers: { refunded: { type: 'boolean', probability: 0.99 } }, usage: { inputTokens: 14 } };
    },
  });
  assert.deepEqual(await jev.status(), { model: JEV_MODEL, configured: false });
  await jev.save({ aiGatewayApiKey: 'private-gateway-key' });
  assert.deepEqual(await jev.status(), { model: JEV_MODEL, configured: true });
  const result = await jev.run({ state: 'A refund was issued.', questions: [{ id: 'refunded', type: 'boolean', instructions: 'Was a refund issued?' }] });
  assert.equal(gatewayOptions.apiKey, 'private-gateway-key');
  assert.equal(request.model, model);
  assert.deepEqual(request.providerOptions, { gateway: { zeroDataRetention: true } });
  assert.equal(request.state, 'A refund was issued.');
  assert.equal(result.inputTokens, 14);
  assert.ok(!JSON.stringify(result).includes('private-gateway-key'));
  await jev.remove();
  assert.equal(removed, JEV_CREDENTIAL);
  assert.equal((await jev.status()).configured, false);
});

test('Jev errors do not expose Gateway credentials', async () => {
  const jev = createJev({
    credentials: { resolve: async () => ({ value: 'private-gateway-key' }) },
    createGatewayImpl: () => ({ evaluationModel: () => ({}) }),
    evaluateImpl: async () => { throw new Error('Authorization private-gateway-key'); },
  });
  await assert.rejects(
    jev.run({ state: 'state', questions: [{ id: 'valid', type: 'boolean', instructions: 'Check' }] }),
    error => error.message.includes('評価に失敗') && !error.message.includes('private-gateway-key'),
  );
});
