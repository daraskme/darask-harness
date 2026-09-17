import { catalogStatus } from './store.mjs';
import { createAddonState } from './state.mjs';
import { createAddonTools, formatAchievements } from './tools.mjs';
import { createAgentObservations, decorateRequest, maybeSessionCleanup, registerAddonHooks } from './hooks.mjs';
import { createAddonRoutes } from './http.mjs';
import { PLUGIN_IDS } from './catalog.mjs';

const SECRET_KEYS = Object.freeze([
  'DARASK_LANGFUSE_PUBLIC_KEY', 'DARASK_LANGFUSE_SECRET_KEY', 'DARASK_XAI_API_KEY',
  'DARASK_SPOTIFY_CLIENT_ID', 'DARASK_SPOTIFY_CLIENT_SECRET', 'DARASK_SPOTIFY_REFRESH_TOKEN',
  'DARASK_TELEGRAM_BOT_TOKEN', 'DARASK_SNYK_TOKEN',
  'DARASK_R2_ACCESS_KEY_ID', 'DARASK_R2_SECRET_ACCESS_KEY',
]);

export { createAddonRoutes, decorateRequest, PLUGIN_IDS };

export async function createAddons({ store, directory, credentials }) {
  const state = createAddonState(directory);
  await state.load();
  const observationFor = createAgentObservations();
  const api = { store, state, directory, credentials, observationFor, compaction: null };
  return {
    api,
    decorateRequest: (request, modelInfo) => decorateRequest(store, api.currentObservation?.(), request, modelInfo),
    async status() {
      const secrets = {};
      for (const key of SECRET_KEYS) secrets[key] = Boolean((await credentials?.resolve?.(key))?.value);
      return { ...catalogStatus(store), secrets, achievements: formatAchievements(state.get().achievements), kanban: state.get().kanban };
    },
    async action(payload) {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid addons action');
      if (payload.action !== 'save') throw new Error('Unknown addons action');
      const { config, secrets } = payload;
      if (secrets && typeof secrets === 'object') {
        for (const [key, value] of Object.entries(secrets)) {
          if (!SECRET_KEYS.includes(key) || typeof value !== 'string' || value.length > 8192 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new Error('Invalid addon secret');
          if (value.trim()) await credentials.set(key, value.trim());
        }
      }
      await store.save(config ?? {});
      return this.status();
    },
    async dispose() { await maybeSessionCleanup(api); },
  };
}

export function registerAddons(ctx, addons) {
  const { api } = addons;
  registerAddonHooks(ctx, api);
  ctx.inject(['tools'], toolsCtx => {
    for (const tool of createAddonTools(api)) toolsCtx.tools.register(tool);
  });
  ctx.inject(['compaction'], scope => { api.compaction = scope.compaction; });
  ctx.inject(['commands'], scope => {
    const disk = createAddonTools(api).find(tool => tool.name === 'darask_disk_cleanup');
    scope.commands.register({
      name: 'disk-cleanup',
      description: 'Track and clean ephemeral DARASK session files',
      async handler(invocation) {
        const argv = (invocation.rawInput ?? '').trim().split(/\s+/).filter(Boolean);
        const action = ['status', 'dry-run', 'quick', 'deep', 'track', 'forget'].includes(argv[0]) ? argv[0] : 'status';
        const result = await disk.execute({ action, path: argv[1], category: argv[2] }, { signal: invocation.signal, agent: invocation.agent });
        return { kind: 'success', text: result.text };
      },
    });
  });
  ctx.effect(() => () => { void addons.dispose(); }, 'darask-harness addons');
}
