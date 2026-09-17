import test from 'node:test';
import assert from 'node:assert/strict';
import { createJev, createJevPurposeRouter, JEV_CREDENTIAL, JEV_MODEL, JEV_PURPOSE_CRITERIA, normalizeJevQuestions } from '../src/jev.mjs';

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

test('Jev purpose routing runs once per user turn and falls back when unavailable', async () => {
  let calls = 0;
  const route = createJevPurposeRouter(async state => { calls += 1; return state.includes('public') ? 'research' : null; });
  const agent = {};
  assert.equal(await route({ agent, state: 'current public facts', fallback: 'medium' }), 'research');
  assert.equal(await route({ agent, state: 'current public facts', fallback: 'simple' }), 'research');
  assert.equal(calls, 1);
  assert.equal(await route({ agent, state: 'local files', fallback: 'medium' }), 'medium');
  assert.equal(calls, 2);
  assert.equal(await route({ agent: null, state: 'current public facts', fallback: 'simple' }), 'simple');
});

test('Jev automatically classifies public research with the evaluation model and ZDR', async () => {
  let request;
  const jev = createJev({
    credentials: { resolve: async () => ({ value: 'private-gateway-key' }) },
    createGatewayImpl: () => ({ evaluationModel: id => ({ id }) }),
    evaluateImpl: async options => { request = options; return { answers: { purpose: { type: 'choice', choice: 'research' } }, usage: {} }; },
  });
  assert.equal(await jev.classifyPurpose('Find current public release information.'), 'research');
  assert.equal(request.model.id, JEV_MODEL);
  assert.deepEqual(request.questions.purpose.criteria, JEV_PURPOSE_CRITERIA);
  assert.deepEqual(request.providerOptions, { gateway: { zeroDataRetention: true } });
  assert.match(request.questions.purpose.instructions, /public Web or X/);
});

test('Jev routing exposes only safe Gateway diagnostics', async () => {
  const jev = createJev({
    credentials: { resolve: async () => ({ value: 'private-gateway-key' }) },
    createGatewayImpl: () => ({ evaluationModel: () => ({}) }),
    evaluateImpl: async () => { throw Object.assign(new Error('private-gateway-key and response body'), { statusCode: 401, type: 'authentication_error', data: 'private-response' }); },
  });
  await assert.rejects(jev.classifyPurpose('current public facts'), error => error.diagnostic === 'HTTP 401 / authentication_error' && !JSON.stringify(error).includes('private'));
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
