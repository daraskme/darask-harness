import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LOCAL_MODEL_ID } from '../src/local-settings.mjs';
import { MODEL_ROUTES } from '../src/config.mjs';
import {
  UNSEEN_GEMMA4_PROMPT,
  UNSEEN_GEMMA4_SKILL_FILE,
  UNSEEN_GEMMA4_SKILL_PROVIDER,
  isUnseenGemma4Route,
  loadUnseenGemma4Skill,
  registerUnseenGemma4Skill,
  routeFromLookup,
  unseenGemma4Prompt,
} from '../src/skill-unseen-gemma4.mjs';

test('unseen Gemma 4 route matches only the local UNSEEN model', () => {
  assert.equal(isUnseenGemma4Route({ provider: MODEL_ROUTES.local, model: LOCAL_MODEL_ID }), true);
  assert.equal(isUnseenGemma4Route({ provider: 'darask-local', model: 'unseen-gemma4-26b-iq3' }), true);
  assert.equal(isUnseenGemma4Route({ provider: 'local', model: 'UNSEEN_Gemma_4_26B_NSFW' }), true);
  assert.equal(isUnseenGemma4Route({ provider: 'grok', model: LOCAL_MODEL_ID }), false);
  assert.equal(isUnseenGemma4Route({ provider: 'grok', model: 'grok-4' }), false);
  assert.equal(isUnseenGemma4Route({ provider: 'openai-codex', model: 'gpt-5' }), false);
  assert.equal(isUnseenGemma4Route({}), false);
});

test('routeFromLookup prefers live agent options over the last header', () => {
  const agent = {
    options: { provider: MODEL_ROUTES.local, model: LOCAL_MODEL_ID },
    session: { requestHeader: () => ({ config: { provider: 'grok', model: 'grok-4' } }) },
  };
  assert.deepEqual(routeFromLookup({ scope: agent }), { provider: MODEL_ROUTES.local, model: LOCAL_MODEL_ID });
  assert.equal(unseenGemma4Prompt({ agent }), UNSEEN_GEMMA4_PROMPT);
  assert.equal(unseenGemma4Prompt({ agent: { options: { provider: 'grok', model: 'grok-4' } } }), '');
  assert.equal(unseenGemma4Prompt({}), '');
});

test('unseen-gemma4-prompts skill is not a project .agents skill and gates the catalog', async () => {
  const raw = await readFile(UNSEEN_GEMMA4_SKILL_FILE, 'utf8');
  assert.match(raw, /^---\nname: unseen-gemma4-prompts\n/);
  assert.match(raw, /Grok/);
  assert.match(raw, /child sexual content/i);
  const loaded = loadUnseenGemma4Skill();
  assert.equal(loaded.name, 'unseen-gemma4-prompts');
  assert.equal(loaded.provider, UNSEEN_GEMMA4_SKILL_PROVIDER);
  assert.match(loaded.content, /local UNSEEN Gemma 4/);

  let provider;
  let invalidated = 0;
  const inject = [];
  registerUnseenGemma4Skill({
    inject(deps, fn) {
      inject.push(deps);
      fn({
        skills: {
          registerProvider(create) {
            provider = create({ invalidate() { invalidated += 1; } });
          },
        },
        on(_name, fn) {
          return fn({}, { agent: { options: { provider: MODEL_ROUTES.local, model: LOCAL_MODEL_ID } } }, async () => ({ variables: { provider: MODEL_ROUTES.local, model: LOCAL_MODEL_ID } }));
        },
      });
    },
  });
  assert.deepEqual(inject, [['skills']]);
  assert.equal(provider.name, UNSEEN_GEMMA4_SKILL_PROVIDER);
  const hidden = await provider.list({ scope: { options: { provider: 'grok', model: 'grok-4' } } });
  const shown = await provider.list({ scope: { options: { provider: MODEL_ROUTES.local, model: LOCAL_MODEL_ID } } });
  assert.equal(hidden.length, 0);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].name, 'unseen-gemma4-prompts');
  const body = await provider.get(shown[0]);
  assert.equal(body.name, 'unseen-gemma4-prompts');
  assert.equal(invalidated, 1);
});
