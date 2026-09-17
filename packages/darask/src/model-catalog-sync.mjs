import { openAiModelCatalog } from './providers/openai.mjs';
import { visibleModelCatalog } from './model-catalogs.mjs';

export async function syncModelCatalogs(settings, visibility, usage) {
  const current = settings.get('llm-pi-ai');
  if (current !== undefined) {
    const provider = current.providers?.openai ?? {};
    const models = openAiModelCatalog(usage, visibility?.openai);
    if (JSON.stringify(provider.models) !== JSON.stringify(models) || provider.displayName !== 'OpenAI API') {
      await settings.update('llm-pi-ai', { providers: { openai: { ...provider, displayName: 'OpenAI API', models } } });
    }
    const openrouter = current.providers?.openrouter ?? {};
    const openrouterModels = visibleModelCatalog('openrouter', visibility);
    if (JSON.stringify(openrouter.models) !== JSON.stringify(openrouterModels) || openrouter.displayName !== 'OpenRouter') {
      await settings.update('llm-pi-ai', { providers: { openrouter: { ...openrouter, displayName: 'OpenRouter', models: openrouterModels } } });
    }
  }
  for (const [provider, namespace] of [['codex', 'llm-openai-codex'], ['grok', 'llm-grok']]) {
    const current = settings.get(namespace);
    if (current === undefined) continue;
    const models = visibility?.[provider] ?? visibleModelCatalog(provider).map(model => model.id);
    if (JSON.stringify(current.models) !== JSON.stringify(models)) await settings.update(namespace, { models });
  }
}
