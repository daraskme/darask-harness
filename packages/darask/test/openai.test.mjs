import test from 'node:test';
import assert from 'node:assert/strict';
import {
  complimentaryAllotment, complimentaryGroup, createOpenAiProvider, nextUtcMidnight, normalizeOpenAiUsage, openAiModelCatalog,
  OPENAI_DEFAULT_MODEL, OPENAI_SIDEKICK_MODEL,
} from '../src/providers/openai.mjs';
import { candidates, validateConfig } from '../src/config.mjs';

test('complimentary groups treat sol as large, luna as small, and astra as ineligible', () => {
  assert.equal(OPENAI_DEFAULT_MODEL, 'gpt-5.6-sol');
  assert.equal(OPENAI_SIDEKICK_MODEL, 'gpt-5.6-luna');
  assert.equal(complimentaryGroup('gpt-5.6-sol'), 'large');
  assert.equal(complimentaryGroup('gpt-5.6-luna'), 'small');
  assert.equal(complimentaryGroup('gpt-5.4-mini'), 'small');
  assert.equal(complimentaryGroup('gpt-4o-2024-08-06'), 'large');
  assert.equal(complimentaryGroup('gpt-6-astra'), null);
  assert.equal(complimentaryGroup('gpt-5-pro'), null);
  assert.equal(complimentaryAllotment('t35', 'large'), 1_000_000);
  assert.equal(complimentaryAllotment('unknown', 'small'), null);
});

test('native model picker labels Sol and Luna with honest complimentary availability', () => {
  const available = openAiModelCatalog({ windows: [
    { id: 'complimentary-large', remainingPercent: 75.25 },
    { id: 'complimentary-small', remainingPercent: 100 },
  ] });
  assert.deepEqual(available.map(model => model.id), [OPENAI_DEFAULT_MODEL, OPENAI_SIDEKICK_MODEL]);
  assert.match(available[0].name, /OpenAI API · Sol／司令塔.*無料枠あり.*75\.3%/u);
  assert.match(available[1].name, /OpenAI API · Luna／実作業.*無料枠あり.*100%/u);
  const exhausted = openAiModelCatalog({ windows: [
    { id: 'complimentary-large', remainingPercent: 0 },
    { id: 'complimentary-small', remainingPercent: null },
  ] });
  assert.match(exhausted[0].name, /無料枠なし・有料注意/u);
  assert.match(exhausted[1].name, /無料枠未確認/u);
});

test('usage windows track standard eligible traffic and never invent remaining percent without a tier', () => {
  const rows = [
    { service_tier: 'default', model: 'gpt-5.6-sol', input_tokens: 800_000, output_tokens: 50_000 },
    { service_tier: 'priority', model: 'gpt-5.6-sol', input_tokens: 9_000_000, output_tokens: 1 },
    { service_tier: 'default', batch: true, model: 'gpt-5.6-sol', input_tokens: 7_000_000, output_tokens: 1 },
  ];
  const unknown = normalizeOpenAiUsage({ rows, usageTier: 'unknown', now: Date.parse('2026-09-15T10:00:00Z') });
  assert.equal(unknown.used.amount, 850_000);
  assert.equal(unknown.windows[0].remainingPercent, null);
  const t35 = normalizeOpenAiUsage({ rows, usageTier: 't35', now: Date.parse('2026-09-15T10:00:00Z') });
  assert.equal(t35.windows.find(w => w.id === 'complimentary-large').remainingPercent, 15);
  assert.equal(t35.windows.find(w => w.id === 'complimentary-small').remainingPercent, 100);
});

test('routing skips openai only when that model’s complimentary bucket is confirmed empty', () => {
  const now = Date.parse('2026-09-15T10:00:00Z');
  const config = validateConfig({
    openai: { usageTier: 't35', preferComplimentary: true },
    providers: { openai: { model: OPENAI_DEFAULT_MODEL } },
  });
  const emptyLarge = { openai: { auth: 'authenticated', usage: {
    status: 'available', updatedAt: new Date(now - 1000).toISOString(),
    windows: [{ id: 'complimentary-large', remainingPercent: 0, resetsAt: nextUtcMidnight(now) }, { id: 'complimentary-small', remainingPercent: 80, resetsAt: nextUtcMidnight(now) }],
  } } };
  assert.ok(!candidates(config, emptyLarge, 'model', now).includes('openai'));
  const luna = validateConfig({ openai: { preferComplimentary: true }, providers: { openai: { model: OPENAI_SIDEKICK_MODEL } } });
  assert.ok(candidates(luna, emptyLarge, 'model', now).includes('openai'));
  const unknown = { openai: { auth: 'authenticated', usage: {
    status: 'available', updatedAt: new Date(now - 1000).toISOString(),
    windows: [{ id: 'complimentary-large', remainingPercent: null, usedTokens: 10 }],
  } } };
  assert.ok(candidates(config, unknown, 'model', now).includes('openai'));
});

test('OpenAI provider authenticates with the project key and does not treat missing usage as zero', async () => {
  const values = new Map([['DARASK_OPENAI_API_KEY', 'sk-test']]);
  const requests = [];
  const provider = createOpenAiProvider({
    credentials: { resolve: async name => values.has(name) ? { value: values.get(name) } : undefined, set: async () => {}, unset: async () => {} },
    fetch: async url => {
      requests.push(url);
      if (String(url).endsWith('/models')) return Response.json({ data: [] });
      throw new Error('usage must not be fetched without an admin key');
    },
  });
  const status = await provider.status();
  assert.equal(status.auth, 'authenticated');
  assert.equal(status.usage.status, 'unavailable');
  assert.match(status.usage.message, /admin key/i);
  assert.equal(status.usage.windows.length, 0);
  assert.equal(requests.length, 1);
});

test('OpenAI provider refreshes default-tier usage and separates batch traffic', async () => {
  const values = new Map([['DARASK_OPENAI_API_KEY', 'sk-test'], ['DARASK_OPENAI_ADMIN_KEY', 'sk-admin-test']]);
  const requests = [];
  let used = 100;
  const provider = createOpenAiProvider({
    credentials: { resolve: async name => values.has(name) ? { value: values.get(name) } : undefined, set: async () => {}, unset: async () => {} },
    fetch: async url => {
      requests.push(String(url));
      if (String(url).endsWith('/models')) return Response.json({ data: [] });
      return Response.json({ data: [{ results: [{ service_tier: 'default', batch: false, model: OPENAI_DEFAULT_MODEL, input_tokens: used, output_tokens: 0 }] }], has_more: false, next_page: null });
    },
    now: () => Date.parse('2026-09-15T10:00:00Z'),
  });
  assert.equal((await provider.status({ usageTier: 't35' })).usage.used.amount, 100);
  used = 250;
  assert.equal((await provider.status({ usageTier: 't35' })).usage.used.amount, 250);
  const usageUrl = new URL(requests.find(url => url.includes('/organization/usage/completions')));
  assert.deepEqual(usageUrl.searchParams.getAll('group_by'), ['model', 'service_tier', 'batch']);
});
