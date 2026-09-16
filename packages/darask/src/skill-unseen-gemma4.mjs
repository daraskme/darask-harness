import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL_ROUTES } from './config.mjs';
import { LOCAL_MODEL_ID } from './local-settings.mjs';
import { parseSkillMarkdown } from './skill-dsh-dev.mjs';

export const UNSEEN_GEMMA4_SKILL_FILE = fileURLToPath(new URL('../skills/unseen-gemma4-prompts/SKILL.md', import.meta.url));
export const UNSEEN_GEMMA4_SKILL_PROVIDER = 'darask-unseen-gemma4';
export const UNSEEN_GEMMA4_PROMPT = 'This session is on the local UNSEEN Gemma 4 model. If the user wants prompts that hosted models such as Grok may refuse (adult fiction, dark themes, uncensored roleplay), load the unseen-gemma4-prompts skill first. Do not use that skill to jailbreak a cloud model.';

const GEMMA4_MODEL = /unseen[-_]?gemma[-_]?4|gemma[-_]?4.*unseen/i;

export function isUnseenGemma4Route(route) {
  const provider = String(route?.provider ?? '').trim().toLowerCase();
  const model = String(route?.model ?? '').trim().toLowerCase();
  const local = provider === MODEL_ROUTES.local || provider === 'local';
  if (provider && !local) return false;
  if (model === LOCAL_MODEL_ID.toLowerCase() || GEMMA4_MODEL.test(model)) return local || !provider;
  return local && !model;
}

export function routeFromLookup(options = {}) {
  const scope = options.scope;
  if (!scope || typeof scope !== 'object') return { provider: '', model: '' };
  const header = typeof scope.session?.requestHeader === 'function' ? scope.session.requestHeader()?.config : undefined;
  const opts = scope.options && typeof scope.options === 'object' ? scope.options : {};
  return {
    provider: String(opts.provider || header?.provider || ''),
    model: String(opts.model || header?.model || ''),
  };
}

export function unseenGemma4Prompt(context = {}) {
  return isUnseenGemma4Route(routeFromLookup({ scope: context.agent })) ? UNSEEN_GEMMA4_PROMPT : '';
}

export function loadUnseenGemma4Skill(file = UNSEEN_GEMMA4_SKILL_FILE) {
  const parsed = parseSkillMarkdown(readFileSync(file, 'utf8'));
  return {
    name: parsed.name,
    description: parsed.description,
    ...(parsed.whenToUse ? { whenToUse: parsed.whenToUse } : {}),
    source: 'runtime',
    provider: UNSEEN_GEMMA4_SKILL_PROVIDER,
    invocation: { modelInvocable: true, userInvocable: true },
    content: parsed.content,
    path: file,
    resourceBase: { kind: 'directory', path: dirname(file) },
  };
}

function candidateFrom(skill) {
  return {
    name: skill.name,
    description: skill.description,
    ...(skill.whenToUse ? { whenToUse: skill.whenToUse } : {}),
    invocation: skill.invocation,
    source: skill.source,
    provider: skill.provider,
    resourceBase: skill.resourceBase,
    rank: 280,
    locator: skill,
    path: skill.path,
  };
}

export function registerUnseenGemma4Skill(ctx, skill = loadUnseenGemma4Skill()) {
  const offered = new WeakMap();
  ctx.inject(['skills'], scope => {
    let invalidate = () => {};
    scope.skills.registerProvider(control => {
      invalidate = () => control.invalidate();
      return {
        name: UNSEEN_GEMMA4_SKILL_PROVIDER,
        list(options) {
          return Promise.resolve(isUnseenGemma4Route(routeFromLookup(options)) ? [candidateFrom(skill)] : []);
        },
        get(entry) {
          return Promise.resolve(entry?.locator ?? skill);
        },
      };
    });
    scope.on('system-prompt/assemble', async (_assembly, context, next) => {
      const assembled = await next();
      const agent = context?.agent;
      const selected = {
        provider: assembled.variables?.provider || routeFromLookup({ scope: agent }).provider,
        model: assembled.variables?.model || routeFromLookup({ scope: agent }).model,
      };
      const eligible = isUnseenGemma4Route(selected) || isUnseenGemma4Route(routeFromLookup({ scope: agent }));
      if (agent && offered.get(agent) !== eligible) {
        offered.set(agent, eligible);
        try { invalidate(); }
        catch (error) { scope.logger?.warn?.(`unseen-gemma4 skill catalog invalidate failed: ${error}`); }
      }
      return assembled;
    });
  });
}
