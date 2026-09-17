import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSkillMarkdown } from './skill-dsh-dev.mjs';
import { routeFromLookup } from './skill-unseen-gemma4.mjs';
import { DEEPSEEK_FLASH_MODEL, DEEPSEEK_PRO_MODEL, DEEPSEEK_ROUTE } from './config.mjs';

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

export const DEEPSEEK_MANAGER_PROMPT = [
  'DARASK orchestration (DeepSeek V4 Pro lead):',
  'You own the user conversation, planning, tool selection, integration, verification, and final answer. Do not hand overall control to Jev or Grok.',
  'Jev performs one typed purpose classification automatically at the start of each user turn. Use darask_jev_evaluate again for rubric scoring or final verification when predefined answer types are useful. Jev does not chat, browse, code, or manage tools.',
  'For facts that require current public Web or X data, you MUST use subagent with provider grok and model grok-4.6, instruct it to run web_search or x_search, and require cited sources. Do not answer current public claims from memory or generic search when Grok is available.',
  'Handle coding, local files, system coordination, synthesis, and every task Jev or Grok cannot or should not perform yourself with native tools. If either specialist is unavailable, explicitly report the fallback and continue safely without pretending it ran.',
].join('\n');

export const GROK_RESEARCH_PROMPT = [
  'DARASK public research specialist (Grok 4.6):',
  'For current public Web facts, run web_search before answering. For X posts or current X discourse, run x_search as well. Do not answer current claims from memory alone.',
  'Return source URLs and distinguish observed facts from inference. If server search is unavailable, say so instead of pretending it ran.',
  'Local files, installed software, private Tailnet services, and repository state are not public research; do not fabricate external evidence for them.',
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

export function isDeepseekV4Lead(route) {
  const model = String(route?.model ?? '').trim().toLowerCase();
  return String(route?.provider ?? '').trim().toLowerCase() === DEEPSEEK_ROUTE && [DEEPSEEK_FLASH_MODEL, DEEPSEEK_PRO_MODEL].includes(model);
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
  if (route.provider.toLowerCase() === 'grok' && route.model.toLowerCase() === 'grok-4.6') return GROK_RESEARCH_PROMPT;
  if (isDeepseekV4Lead(route)) return DEEPSEEK_MANAGER_PROMPT;
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
