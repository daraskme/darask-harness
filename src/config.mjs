import path from 'node:path';
import { defaultComputer, validateComputer } from './computer.mjs';
import { defaultLocal, validateLocal } from './local-settings.mjs';
import { complimentaryGroup, defaultOpenAi, OPENAI_DEFAULT_MODEL, validateOpenAi } from './providers/openai.mjs';
import { defaultModelVisibility, validateModelVisibility } from './model-catalogs.mjs';
import { defaultBitwarden, validateBitwarden } from './bitwarden.mjs';

export const DEEPSEEK_CREDENTIAL = 'DEEPSEEK_API_KEY';
export const DEEPSEEK_ROUTE = 'deepseek-official';
export const DEEPSEEK_PRO_MODEL = 'deepseek-v4-pro';
export const DEEPSEEK_FLASH_MODEL = 'deepseek-flash';
export const DEEPSEEK_MODEL = DEEPSEEK_FLASH_MODEL;
export const IDS = Object.freeze(['deepseek', 'grok', 'openai', 'openrouter', 'cursor', 'codex', 'claude', 'local']);
export const NAMES = Object.freeze({ deepseek: 'DeepSeek API', openai: 'OpenAI API', openrouter: 'OpenRouter', grok: 'Grok Build', cursor: 'Cursor', codex: 'Codex', claude: 'Claude Code', local: 'ローカルモデル' });
export const MODEL_ROUTES = Object.freeze({ deepseek: DEEPSEEK_ROUTE, openai: 'openai', openrouter: 'openrouter', grok: 'grok', codex: 'openai-codex', claude: 'anthropic', local: 'darask-local' });
export const PURPOSE_IDS = Object.freeze(['architecture', 'research', 'collaboration', 'refactor', 'new', 'medium', 'simple', 'spec_driven']);
export function defaultPurposeRoutes() {
  return Object.fromEntries(PURPOSE_IDS.map(id => [id, id === 'research' ? 'grok' : 'deepseek']));
}
export function defaultConfig() {
  return { priority: [...IDS], routingEnabled: true, purposeRoutes: defaultPurposeRoutes(), modelVisibility: defaultModelVisibility(), bitwarden: defaultBitwarden(), local: defaultLocal(), computer: defaultComputer(), openai: defaultOpenAi(), providers: Object.fromEntries(IDS.map(id => [id, { enabled: id !== 'local', model: id === 'deepseek' ? DEEPSEEK_MODEL : id === 'grok' ? 'grok-4.6' : id === 'openai' ? OPENAI_DEFAULT_MODEL : '', executable: '' }])) };
}
export function validateConfig(input, base = defaultConfig()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid configuration');
  const allowed = new Set(['priority', 'routingEnabled', 'purposeRoutes', 'modelVisibility', 'providers', 'bitwarden', 'bitwardenAccessToken', 'deepseekApiKey', 'openrouterApiKey', 'openrouterManagementKey', 'openaiApiKey', 'openaiAdminKey', 'aiGatewayApiKey', 'localApiKey', 'local', 'computer', 'openai']);
  if (Object.keys(input).some(key => !allowed.has(key))) throw new Error('Unknown configuration field');
  const result = structuredClone(base);
  if (input.bitwarden !== undefined) result.bitwarden = validateBitwarden(input.bitwarden, result.bitwarden);
  if (input.local !== undefined) result.local = validateLocal(input.local, result.local);
  if (input.computer !== undefined) result.computer = validateComputer(input.computer, result.computer);
  if (input.openai !== undefined) result.openai = validateOpenAi(input.openai, result.openai);
  if (input.modelVisibility !== undefined) result.modelVisibility = validateModelVisibility(input.modelVisibility, result.modelVisibility);
  if (input.priority !== undefined) {
    // Legacy five-provider order gains local, then six-provider order gains OpenAI API first.
    const priority = Array.isArray(input.priority) ? input.priority.map(id => id === 'gateway' ? 'deepseek' : id) : [];
    if (priority.length === 5 && new Set(priority).size === 5 && priority.every(id => IDS.includes(id) && id !== 'local' && id !== 'openai')) priority.push('local');
    if (priority.length === 6 && new Set(priority).size === 6 && priority.every(id => IDS.includes(id) && id !== 'openai' && id !== 'deepseek')) priority.unshift('openai');
    if (priority.length === 7 && new Set(priority).size === 7 && priority.every(id => IDS.includes(id) && id !== 'deepseek')) priority.unshift('deepseek');
    if (priority.length !== IDS.length || new Set(priority).size !== IDS.length || priority.some(id => !IDS.includes(id))) throw new Error('Priority must contain each provider exactly once');
    result.priority = priority;
  }
  if (input.routingEnabled !== undefined) {
    if (typeof input.routingEnabled !== 'boolean') throw new Error('Invalid routing setting');
    result.routingEnabled = input.routingEnabled;
  }
  if (input.purposeRoutes !== undefined) {
    if (!input.purposeRoutes || typeof input.purposeRoutes !== 'object' || Array.isArray(input.purposeRoutes) || Object.keys(input.purposeRoutes).some(id => !PURPOSE_IDS.includes(id))) throw new Error('Invalid purpose routes');
    for (const [id, configuredProvider] of Object.entries(input.purposeRoutes)) {
      const provider = configuredProvider === 'gateway' ? 'deepseek' : configuredProvider;
      if (typeof provider !== 'string' || (provider && !MODEL_ROUTES[provider])) throw new Error('Invalid purpose route');
      result.purposeRoutes[id] = provider;
    }
  }
  if (input.providers !== undefined) {
    if (!input.providers || typeof input.providers !== 'object' || Array.isArray(input.providers)) throw new Error('Invalid providers');
    const providers = { ...input.providers };
    if (providers.gateway !== undefined) {
      if (providers.deepseek === undefined) providers.deepseek = { ...providers.gateway, model: providers.gateway.model === 'deepseek/deepseek-v4-pro' ? DEEPSEEK_PRO_MODEL : providers.gateway.model };
      delete providers.gateway;
    }
    if (Object.keys(providers).some(id => !IDS.includes(id))) throw new Error('Invalid providers');
    for (const [id, value] of Object.entries(providers)) {
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['enabled', 'model', 'executable'].includes(k))) throw new Error('Invalid provider setting');
      if (value.enabled !== undefined && typeof value.enabled !== 'boolean') throw new Error('Invalid provider enabled value');
      for (const key of ['model', 'executable']) {
        if (value[key] !== undefined && (typeof value[key] !== 'string' || value[key].length > 2048 || /[\x00-\x1f]/.test(value[key]))) throw new Error(`Invalid ${key}`);
      }
      const executable = value.executable?.trim();
      if (executable && !(path.isAbsolute(executable) || path.win32.isAbsolute(executable))) throw new Error('Use an absolute executable path');
      if (id === 'cursor' && executable && /[\\/]\.grok[\\/]/i.test(executable)) throw new Error('Cursor cannot use the Grok executable');
      if (id === 'grok' && executable && /[\\/]cursor-agent[\\/]/i.test(executable)) throw new Error('Grok cannot use the Cursor executable');
      result.providers[id] = { ...result.providers[id], ...value, ...(executable === undefined ? {} : { executable }) };
    }
  }
  const cursor = result.providers.cursor.executable;
  const grok = result.providers.grok.executable;
  if (cursor && grok && path.win32.normalize(cursor).toLowerCase() === path.win32.normalize(grok).toLowerCase()) throw new Error('Cursor and Grok must use different executables');
  for (const key of ['bitwardenAccessToken', 'deepseekApiKey', 'openrouterApiKey', 'openrouterManagementKey', 'openaiApiKey', 'openaiAdminKey', 'aiGatewayApiKey', 'localApiKey']) {
    if (input[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > 8192 || /[\s\x00-\x1f]/.test(input[key]))) throw new Error('Invalid API key');
  }
  return result;
}

/** Select only within a supported capability; unknown usage never means exhausted. */
export function candidates(config, snapshots, capability = 'model', now = Date.now()) {
  return config.priority.filter(id => {
    const settings = config.providers[id];
    if (!settings.enabled || (capability === 'model' ? !MODEL_ROUTES[id] || !settings.model : !['cursor', 'claude', 'grok'].includes(id))) return false;
    const state = snapshots[id];
    if (state?.auth === 'unauthenticated' || state?.auth === 'unavailable') return false;
    const usage = state?.usage;
    const age = usage?.updatedAt ? now - Date.parse(usage.updatedAt) : NaN;
    const fresh = Number.isFinite(age) && age >= 0 && age < 120000;
    if (!fresh || usage?.status !== 'available') return true;
    if (usage.credits?.balance !== null && usage.credits?.balance !== undefined && usage.credits?.unlimited !== true && Number(usage.credits.balance) <= 0) return false;
    if (id === 'openai' && config.openai?.preferComplimentary !== false) {
      const group = complimentaryGroup(settings.model);
      if (!group) return true;
      const window = (usage.windows ?? []).find(w => w.id === `complimentary-${group}`);
      return !(window && window.remainingPercent === 0 && (!window.resetsAt || Date.parse(window.resetsAt) > now));
    }
    return !(usage.windows ?? []).some(w => w.remainingPercent === 0 && (!w.resetsAt || Date.parse(w.resetsAt) > now));
  });
}

export function candidatesForPurpose(config, snapshots, purpose, now = Date.now()) {
  const available = candidates(config, snapshots, 'model', now);
  const preferred = config.purposeRoutes?.[purpose];
  return preferred && available.includes(preferred)
    ? [preferred, ...available.filter(id => id !== preferred)]
    : available;
}
