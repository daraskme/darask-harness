export const MODEL_CATALOGS = Object.freeze({
  deepseek: Object.freeze([
    Object.freeze({ id: 'deepseek-flash', name: 'DeepSeek API · DeepSeek V4.1 Flash' }),
    Object.freeze({ id: 'deepseek-v4-pro', name: 'DeepSeek API · DeepSeek V4 Pro' }),
  ]),
  openai: Object.freeze([
    Object.freeze({ id: 'gpt-5.6-sol', name: 'OpenAI API · Sol' }),
    Object.freeze({ id: 'gpt-5.6-luna', name: 'OpenAI API · Luna' }),
  ]),
  openrouter: Object.freeze([
    Object.freeze({ id: 'openai/gpt-5.6-sol', name: 'OpenRouter · OpenAI Sol' }),
    Object.freeze({ id: 'anthropic/claude-opus-5', name: 'OpenRouter · Claude Opus 5' }),
    Object.freeze({ id: 'anthropic/claude-sonnet-5', name: 'OpenRouter · Claude Sonnet 5' }),
    Object.freeze({ id: 'x-ai/grok-4.6', name: 'OpenRouter · Grok 4.6' }),
  ]),
  codex: Object.freeze([
    Object.freeze({ id: 'gpt-6-astra', name: 'Codex · Astra' }),
    Object.freeze({ id: 'gpt-5.6-sol', name: 'Codex · Sol' }),
    Object.freeze({ id: 'gpt-5.6-terra', name: 'Codex · Terra' }),
    Object.freeze({ id: 'gpt-5.6-luna', name: 'Codex · Luna' }),
  ]),
  grok: Object.freeze([
    Object.freeze({ id: 'grok-4.6', name: 'Grok 4.6' }),
  ]),
  claude: Object.freeze([
    Object.freeze({ id: 'claude-fable-5-1', name: 'Claude Fable 5.1' }),
    Object.freeze({ id: 'claude-opus-5', name: 'Claude Opus 5' }),
    Object.freeze({ id: 'claude-sonnet-5', name: 'Claude Sonnet 5' }),
  ]),
});

export function defaultModelVisibility() {
  return Object.fromEntries(Object.entries(MODEL_CATALOGS).map(([provider, models]) => [provider, models.map(model => model.id)]));
}

export function visibleModelCatalog(provider, visibility) {
  const catalog = MODEL_CATALOGS[provider] ?? [];
  const selected = new Set(Array.isArray(visibility?.[provider]) ? visibility[provider] : catalog.map(model => model.id));
  return catalog.filter(model => selected.has(model.id));
}

export async function updateModelCatalogIfRegistered(settings, namespace, models) {
  if (settings.get(namespace) === undefined) return false;
  await settings.update(namespace, { models });
  return true;
}

export function validateModelVisibility(value, base = defaultModelVisibility()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid model visibility');
  const migrated = { ...value };
  if (migrated.gateway !== undefined) {
    if (migrated.deepseek === undefined) migrated.deepseek = Array.isArray(migrated.gateway) ? migrated.gateway.map(model => model === 'deepseek/deepseek-v4-pro' ? 'deepseek-v4-pro' : model) : migrated.gateway;
    delete migrated.gateway;
  }
  if (Array.isArray(migrated.deepseek) && migrated.deepseek.includes('deepseek-v4-pro') && !migrated.deepseek.includes('deepseek-flash')) migrated.deepseek = [...migrated.deepseek, 'deepseek-flash'];
  if (Object.keys(migrated).some(provider => !(provider in MODEL_CATALOGS))) throw new Error('Invalid model visibility');
  const result = structuredClone(base);
  for (const [provider, models] of Object.entries(migrated)) {
    const allowed = new Set(MODEL_CATALOGS[provider].map(model => model.id));
    if (!Array.isArray(models) || models.some(model => typeof model !== 'string' || !allowed.has(model)) || new Set(models).size !== models.length) throw new Error('Invalid visible models');
    result[provider] = [...models];
  }
  return result;
}
