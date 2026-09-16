import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSkillMarkdown } from './skill-dsh-dev.mjs';
import { routeFromLookup } from './skill-unseen-gemma4.mjs';

export const FUSION_SKILL_FILE = fileURLToPath(new URL('../skills/cognition-fusion/SKILL.md', import.meta.url));
export const FUSION_SKILL_PROVIDER = 'darask-cognition-fusion';

export const FUSION_PROMPT = [
  'Cognition Fusion harness (Codex / Claude-family lead):',
  'You are the lead. The user talks only to you. Keep a cheaper sidekick with its own persistent context and tools for execution.',
  'Do not pass this conversation to the sidekick. Exchange only a brief (objective, constraints, success criteria, relevant paths), then results and feedback.',
  'Use subagent — not subagent_fork — after list_subagent_models. Pick a cheaper coding route (SWE-2 if listed, else grok or another non-Codex/non-Claude coding model). Do not use this same frontier model as the executor.',
  'Reuse the same child with send_message so the sidekick cache stays warm. Start independent sidekicks together when work is independent.',
  'You own planning, ambiguity, and review: explore the codebase yourself before planning. The sidekick implements, tests, and reports. Review its work and take native tools back if it is out of its depth.',
  'Trivial Q&A, status, and media/computer tasks stay with you. darask_agent remains plan/ask only.',
].join('\n');

export const SOL_LUNA_PROMPT = [
  'Cognition Fusion harness (OpenAI complimentary: gpt-5.6-sol lead, gpt-5.6-luna executor):',
  'You are gpt-5.6-sol, the lead. The user talks only to you. Sol is the large complimentary bucket; do not spend it on mechanical edits.',
  'Keep a sidekick on provider openai, model gpt-5.6-luna (small complimentary bucket) with its own persistent context and tools for execution.',
  'Do not pass this conversation to Luna. Exchange only a brief (objective, constraints, success criteria, relevant paths), then results and feedback.',
  'Use subagent — not subagent_fork — with provider openai and model gpt-5.6-luna. Do not use sol, astra, or this same lead as the executor.',
  'Reuse the same child with send_message so Luna’s cache stays warm. Start independent sidekicks together when work is independent.',
  'You own planning, ambiguity, and review. Luna implements, tests, and reports. Review its work and take native tools back if it is out of its depth.',
  'Trivial Q&A, status, and media/computer tasks stay with you. darask_agent remains plan/ask only.',
].join('\n');

const CLAUDE_MARK = /claude|anthropic|fable/;
const CODEX_MARK = /(?:\bgpt[\s._-]*6\b|\bastra\b|\bcodex\b)/;

export function isOpenAiSolLead(route) {
  const provider = String(route?.provider ?? '').trim().toLowerCase();
  const model = String(route?.model ?? '').trim().toLowerCase();
  return provider === 'openai' && /(?:^|[/.])gpt-5\.6-sol(?:$|-)/.test(model);
}

export function isFusionLeadRoute(route) {
  const provider = String(route?.provider ?? '').trim().toLowerCase();
  const model = String(route?.model ?? '').trim().toLowerCase();
  if (!provider && !model) return false;
  if (isOpenAiSolLead(route)) return true;
  if (provider === 'openai-codex' || provider === 'codex') return true;
  if (provider.includes('claude') || provider.includes('anthropic')) return true;
  return CLAUDE_MARK.test(model) || CODEX_MARK.test(model);
}

export function fusionPrompt(context = {}) {
  const fromAgent = routeFromLookup({ scope: context.agent });
  const route = {
    provider: String(context.variables?.provider || fromAgent.provider || ''),
    model: String(context.variables?.model || fromAgent.model || ''),
  };
  if (isOpenAiSolLead(route)) return SOL_LUNA_PROMPT;
  return isFusionLeadRoute(route) ? FUSION_PROMPT : '';
}

export function loadFusionSkill(file = FUSION_SKILL_FILE) {
  const parsed = parseSkillMarkdown(readFileSync(file, 'utf8'));
  return {
    name: parsed.name,
    description: parsed.description,
    ...(parsed.whenToUse ? { whenToUse: parsed.whenToUse } : {}),
    source: 'runtime',
    provider: FUSION_SKILL_PROVIDER,
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
    rank: 270,
    locator: skill,
    path: skill.path,
  };
}

export function registerFusionSkill(ctx, skill = loadFusionSkill()) {
  const offered = new WeakMap();
  ctx.inject(['skills'], scope => {
    let invalidate = () => {};
    scope.skills.registerProvider(control => {
      invalidate = () => control.invalidate();
      return {
        name: FUSION_SKILL_PROVIDER,
        list(options) {
          return Promise.resolve(isFusionLeadRoute(routeFromLookup(options)) ? [candidateFrom(skill)] : []);
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
      const eligible = isFusionLeadRoute(selected) || isFusionLeadRoute(routeFromLookup({ scope: agent }));
      if (agent && offered.get(agent) !== eligible) {
        offered.set(agent, eligible);
        try { invalidate(); }
        catch (error) { scope.logger?.warn?.(`cognition-fusion skill catalog invalidate failed: ${error}`); }
      }
      return assembled;
    });
  });
}
