import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MODEL_ROUTES } from '../src/config.mjs';
import { LOCAL_MODEL_ID } from '../src/local-settings.mjs';
import {
  DEEPSEEK_MANAGER_PROMPT,
  FUSION_PROMPT,
  FUSION_SKILL_FILE,
  FUSION_SKILL_PROVIDER,
  SOL_LUNA_PROMPT,
  fusionPrompt,
  isDeepseekV4Lead,
  isFusionLeadRoute,
  isOpenAiSolLead,
  loadFusionSkill,
  registerFusionSkill,
} from '../src/fusion.mjs';

test('Fusion lead matches Codex and Claude-family routes only', () => {
  assert.equal(isFusionLeadRoute({ provider: MODEL_ROUTES.codex, model: 'gpt-5.1-codex' }), true);
  assert.equal(isFusionLeadRoute({ provider: 'openai-codex', model: 'gpt-6-astra' }), true);
  assert.equal(isFusionLeadRoute({ provider: 'codex', model: '' }), true);
  assert.equal(isFusionLeadRoute({ provider: 'openrouter', model: 'anthropic/claude-sonnet-4' }), true);
  assert.equal(isFusionLeadRoute({ provider: 'anthropic', model: 'claude-opus-5' }), true);
  assert.equal(isFusionLeadRoute({ provider: 'openrouter', model: 'fable-5.1' }), true);
  assert.equal(isFusionLeadRoute({ provider: 'openrouter', model: 'openai/gpt-6' }), true);
  assert.equal(isFusionLeadRoute({ provider: 'grok', model: 'grok-4.6' }), false);
  assert.equal(isFusionLeadRoute({ provider: MODEL_ROUTES.local, model: LOCAL_MODEL_ID }), false);
  assert.equal(isFusionLeadRoute({ provider: 'openrouter', model: 'openai/gpt-5' }), false);
  assert.equal(isFusionLeadRoute({ provider: 'openrouter', model: 'google/gemini-3' }), false);
  assert.equal(isFusionLeadRoute({}), false);
  assert.equal(isOpenAiSolLead({ provider: 'openai', model: 'gpt-5.6-sol' }), true);
  assert.equal(isFusionLeadRoute({ provider: 'openai', model: 'gpt-5.6-sol' }), true);
  assert.equal(isFusionLeadRoute({ provider: 'openai', model: 'gpt-5.6-luna' }), false);
  assert.equal(isOpenAiSolLead({ provider: 'openai', model: 'gpt-5.6-luna' }), false);
});

test('DeepSeek V4 Pro manages work and delegates only typed evaluation and live search', () => {
  const route = { provider: 'vercel-ai-gateway', model: 'deepseek/deepseek-v4-pro' };
  assert.equal(isDeepseekV4Lead(route), true);
  assert.equal(fusionPrompt({ agent: { options: route } }), DEEPSEEK_MANAGER_PROMPT);
  assert.match(DEEPSEEK_MANAGER_PROMPT, /darask_jev_evaluate/);
  assert.match(DEEPSEEK_MANAGER_PROMPT, /provider grok/);
  assert.match(DEEPSEEK_MANAGER_PROMPT, /grok-4\.6/);
  assert.match(DEEPSEEK_MANAGER_PROMPT, /web_search/);
  assert.match(DEEPSEEK_MANAGER_PROMPT, /x_search/);
});

test('fusionPrompt is empty off the lead route and stable on it', () => {
  const claude = { agent: { options: { provider: 'openrouter', model: 'anthropic/claude-opus-4.6' } } };
  const grok = { agent: { options: { provider: 'grok', model: 'grok-4.6' } } };
  assert.equal(fusionPrompt(claude), FUSION_PROMPT);
  assert.equal(fusionPrompt(grok), '');
  assert.equal(fusionPrompt({}), '');
  assert.equal(fusionPrompt({ agent: { options: { provider: 'openai', model: 'gpt-5.6-sol' } } }), SOL_LUNA_PROMPT);
  assert.match(SOL_LUNA_PROMPT, /gpt-5\.6-luna/);
  assert.match(FUSION_PROMPT, /subagent_fork/);
  assert.match(FUSION_PROMPT, /brief/);
});

test('cognition-fusion skill is gated to Fusion leads', async () => {
  const raw = await readFile(FUSION_SKILL_FILE, 'utf8');
  assert.match(raw, /^---\nname: cognition-fusion\n/);
  assert.match(raw, /subagent_fork/);
  assert.match(raw, /send_message/);
  const loaded = loadFusionSkill();
  assert.equal(loaded.name, 'cognition-fusion');
  assert.equal(loaded.provider, FUSION_SKILL_PROVIDER);
  assert.match(loaded.content, /Lead/);

  let provider;
  let invalidated = 0;
  const inject = [];
  registerFusionSkill({
    inject(deps, fn) {
      inject.push(deps);
      fn({
        skills: {
          registerProvider(create) {
            provider = create({ invalidate() { invalidated += 1; } });
          },
        },
        on(_name, fn) {
          return fn({}, { agent: { options: { provider: 'openai-codex', model: 'gpt-6-astra' } } }, async () => ({ variables: { provider: 'openai-codex', model: 'gpt-6-astra' } }));
        },
      });
    },
  });
  assert.deepEqual(inject, [['skills']]);
  assert.equal(provider.name, FUSION_SKILL_PROVIDER);
  const hidden = await provider.list({ scope: { options: { provider: 'grok', model: 'grok-4.6' } } });
  const shown = await provider.list({ scope: { options: { provider: 'openai-codex', model: 'gpt-6-astra' } } });
  assert.equal(hidden.length, 0);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].name, 'cognition-fusion');
  const body = await provider.get(shown[0]);
  assert.equal(body.name, 'cognition-fusion');
  assert.equal(invalidated, 1);
});
