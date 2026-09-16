import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { IDS, NAMES, MODEL_ROUTES, validateConfig } from './config.mjs';
import { createCliProvider } from './providers/cli.mjs';
import { createOpenRouterProvider } from './providers/openrouter.mjs';
import { createOpenAiProvider, defaultOpenAi } from './providers/openai.mjs';

const blank = source => ({ status: 'unavailable', source, updatedAt: null, windows: [], credits: null });
export function normalizeClaudeStatusline(input) {
  if (!input || input.version !== 1 || !Number.isFinite(Date.parse(input.updatedAt))) throw new Error('Invalid Claude usage file');
  const windows = [];
  for (const [id, window] of Object.entries(input.rate_limits ?? {})) {
    if (!['five_hour', 'seven_day'].includes(id) || !window || typeof window.used_percentage !== 'number' || !Number.isFinite(window.used_percentage) || window.used_percentage < 0) continue;
    const usedPercent = Math.min(100, window.used_percentage);
    const resets = typeof window.resets_at === 'number' ? new Date(window.resets_at * 1000) : null;
    windows.push({ id, label: id === 'five_hour' ? '5 hours' : '7 days', usedPercent, remainingPercent: Math.max(0, 100 - usedPercent), resetsAt: resets && Number.isFinite(resets.getTime()) ? resets.toISOString() : null });
  }
  return { status: windows.length ? 'available' : 'unavailable', source: 'Claude Code statusLine', updatedAt: input.updatedAt, windows, credits: null, stale: Date.now() - Date.parse(input.updatedAt) > 120000, message: windows.length ? null : 'Claude Code has not supplied subscription limits.' };
}
export function createService({ store, credentials, enableOpenRouterRoute, enableOpenAiRoute, syncOpenAiModels, enableLocalRoute, enableClaudeRoute, directory, cliFactory = createCliProvider, fetch, tailscale, browserRun, localModel, computer, compatibility = () => ({}) }) {
  const providers = {};
  const snapshots = Object.fromEntries(IDS.map(id => [id, { auth: 'unknown', usage: blank(id) }]));
  const openrouter = createOpenRouterProvider({ credentials, enableRoute: enableOpenRouterRoute, fetch });
  const openai = createOpenAiProvider({ credentials, enableRoute: enableOpenAiRoute, fetch });
  let refreshing;
  let lastRefresh = 0;
  let disposed = false;
  let actionQueue = Promise.resolve();
  let tailscaleState;
  let browserRunState;
  let computerState;
  async function cli(id) {
    const executable = store.get().providers[id].executable;
    const old = providers[id];
    if (old?.executable === executable) return old.instance;
    await old?.instance.dispose();
    const instance = cliFactory(id, { executable: executable || undefined });
    providers[id] = { executable, instance };
    return instance;
  }
  async function refresh() {
    if (disposed) throw new Error('DARASK has stopped');
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const results = await Promise.allSettled([openrouter.status(), openai.status(store.get().openai ?? defaultOpenAi()), cli('cursor').then(p => p.status()), cli('claude').then(p => p.status())]);
      for (let i = 0; i < results.length; i++) {
        const id = ['openrouter', 'openai', 'cursor', 'claude'][i];
        const result = results[i];
        snapshots[id] = result.status === 'fulfilled' ? result.value : { auth: 'unknown', usage: { ...blank(id), status: 'error', message: 'Status could not be retrieved.' } };
      }
      if (syncOpenAiModels) {
        try { await syncOpenAiModels(snapshots.openai?.usage); }
        catch (error) { snapshots.openai.catalogError = error instanceof Error ? error.message : 'OpenAI model catalog could not be updated.'; }
      }
      // These two accounts are owned by the bundled plugins. Their browser
      // endpoints populate the native UI without copying OAuth credentials.
      for (const id of ['grok', 'codex']) snapshots[id] = { auth: 'unknown', usage: blank(`${id} bundled provider`), managedBy: id === 'grok' ? 'dsh-grok-provider' : 'dsh-codex-connect' };
      try {
        const text = await readFile(join(directory, 'claude-usage.json'), 'utf8');
        if (text.length <= 16384) snapshots.claude.usage = normalizeClaudeStatusline(JSON.parse(text));
      } catch (error) {
        if (error.code !== 'ENOENT') snapshots.claude.usage = { ...blank('Claude Code statusLine'), status: 'error', message: 'Claude statusLine snapshot is invalid or unreadable.' };
      }
      lastRefresh = Date.now();
      tailscaleState = await tailscale?.status();
      browserRunState = await browserRun?.status();
      computerState = computer?.status();
      if (localModel) snapshots.local = await localModel.status();
      if (enableClaudeRoute) await enableClaudeRoute();
    })().finally(() => { refreshing = undefined; });
    return refreshing;
  }
  function snapshot() {
    const config = store.get();
    return { priority: config.priority, routingEnabled: config.routingEnabled, modelVisibility: config.modelVisibility, local: config.local, openai: config.openai, computer: computerState ?? { enabled: config.computer?.enabled === true }, providers: config.priority.map(id => ({ id, name: NAMES[id], ...structuredClone(snapshots[id]), ...config.providers[id], capability: MODEL_ROUTES[id] ? 'model' : 'agent' })), tailscale: tailscaleState, browserRun: browserRunState, compatibility: compatibility() };
  }
  return {
    snapshots, refresh, snapshot,
    async status() { if (Date.now() - lastRefresh > 30000) await refresh(); return snapshot(); },
    async callback(url) { await openrouter.callback(url); await refresh(); },
    action(payload, origin) {
      const task = actionQueue.catch(() => {}).then(async () => {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).some(key => !['action', 'provider', 'config'].includes(key))) throw new Error('Invalid action');
        const { action, provider } = payload;
        if (provider === 'local' && ['startLocal', 'stopLocal', 'testLocal'].includes(action)) {
          if (!localModel) throw new Error('ローカルモデル機能を利用できません。');
          await localModel.action(action);
        } else if (provider === 'tailscale' && ['serveEnable', 'serveDisable'].includes(action)) {
          if (!tailscale) throw new Error('Tailscale: integration unavailable.');
          await tailscale.action(action);
        } else if (provider === 'browserRun' && ['saveBrowserRun', 'removeBrowserRun'].includes(action)) {
          if (!browserRun) throw new Error('Browser Run: integration unavailable.');
          if (action === 'saveBrowserRun') await browserRun.save(payload.config);
          else await browserRun.remove();
        } else if (provider === 'computer' && ['enableComputer', 'disableComputer'].includes(action)) {
          if (!computer) throw new Error('Computer: integration unavailable.');
          await store.save({ computer: { enabled: action === 'enableComputer' } });
        } else if (action === 'save') {
          const validated = validateConfig(payload.config, store.get());
          if (localModel && snapshots.local?.localRuntime?.owned && (JSON.stringify(validated.local) !== JSON.stringify(store.get().local) || JSON.stringify(validated.providers.local) !== JSON.stringify(store.get().providers.local))) throw new Error('ローカルモデルを停止してから実行設定を変更してください。');
          if (enableLocalRoute && (payload.config.local || payload.config.providers?.local || payload.config.localApiKey)) await enableLocalRoute(validated, payload.config.localApiKey);
          await openrouter.saveKeys(payload.config);
          await openai.saveKeys(payload.config);
          await store.save(payload.config);
        } else if (action === 'refresh') {
          // Refresh is shared across concurrent clients below.
        } else {
          if (!['openrouter', 'openai', 'cursor', 'claude'].includes(provider)) throw new Error('Use the bundled provider authentication endpoint for this service.');
          if (provider === 'openai' && action !== 'logout') throw new Error('Unknown action');
          if (!['login', 'logout', 'cancelLogin', 'submitCallback'].includes(action)) throw new Error('Unknown action');
          if (action === 'submitCallback') {
            if (provider !== 'openrouter') throw new Error('Use the bundled provider authentication endpoint for this service.');
            const callbackUrl = payload.config?.callbackUrl;
            if (typeof callbackUrl !== 'string' || !callbackUrl) throw new Error('Login expired or invalid state');
            await openrouter.callback(callbackUrl);
          } else {
            const adapter = provider === 'openrouter' ? openrouter : provider === 'openai' ? openai : await cli(provider);
            const result = await adapter[action](origin);
            if (result && action === 'login') snapshots[provider].login = result;
          }
        }
        await refresh();
        return snapshot();
      });
      actionQueue = task;
      return task;
    },
    async dispose() { disposed = true; await actionQueue.catch(() => {}); await Promise.all(Object.values(providers).map(p => p.instance.dispose())); await openrouter.dispose(); await openai.dispose(); await tailscale?.dispose(); await browserRun?.dispose(); await localModel?.dispose(); await computer?.dispose(); await refreshing; },
  };
}
