import { join, resolve } from 'node:path';
import Schema from '@deepseek-ai/schemastery';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { createStore } from './store.mjs';
import { createService } from './service.mjs';
import { createRoutes, createOpenRouterCallbackRoute } from './http.mjs';
import { candidates, MODEL_ROUTES } from './config.mjs';
import { enableClaudeRoute } from './claude-route.mjs';
import { fileURLToPath } from 'node:url';
import * as mcpClient from '@deepseek-ai/dsh-mcp-client';
import { createTailscale } from './tailscale.mjs';
import { createBrowserRun } from './browser-run.mjs';
import { createComputer } from './computer.mjs';
import { registerCoreTools } from './core-tools.mjs';
import { createComputerRemote } from './computer-remote.mjs';
import { createWorkspaceSets, registerWorkspaceSetTools } from './workspace-sets.mjs';
import { mkdir, readFile } from 'node:fs/promises';
import { createLocalModel } from './local-model.mjs';
import { localRoute } from './local-settings.mjs';
import { installClientCompatibility } from './client-compat.mjs';
import { createWorkspaceHub } from './workspaces.mjs';
import { createSessionArchive } from './session-archive.mjs';
import { createRemoteProxy } from './remote-proxy.mjs';
import { developmentRoutes } from './development.mjs';
import { createHostUpdateRoutes, createDistribution } from './host-update.mjs';
import { restartRoutes } from './restart.mjs';
import { createCodexAccounts, codexRoutes } from './codex-accounts.mjs';
import { createCodexRelay } from './codex-relay.mjs';
import { createSharedModels } from './shared-models.mjs';
import { DEV_PROMPT, registerDaraskSkills } from './skill-dsh-dev.mjs';
import { COMPUTER_PROMPT, registerComputerSkill } from './skill-computer-use.mjs';
import { MEDIA_PROMPT, registerMediaSkills } from './skill-media.mjs';
import { mediaSettingsRoute } from './media-settings.mjs';
import { registerUnseenGemma4Skill, unseenGemma4Prompt } from './skill-unseen-gemma4.mjs';
import { registerRemoteSessions } from './remote-sessions.mjs';
import { fusionPrompt, registerFusionSkill } from './fusion.mjs';
import { installAutoApproval } from './auto-approval.mjs';
import { OpenAICodexProxyManager, readOpenAICodexRateLimits, resolveOpenAICodexProxyUrl, resolveOpenAICodexSettings } from 'dsh-codex-connect';
import { createAddonStore } from './addons/store.mjs';
import { createAddons, registerAddons, createAddonRoutes } from './addons/register.mjs';
import { openAiModelCatalog } from './providers/openai.mjs';
import { visibleModelCatalog } from './model-catalogs.mjs';

const release = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;

export const name = 'dsh-darask';
export const inject = ['llm', 'settings', 'credentials', 'connection', 'agents'];
export const Config = Schema.object({ dataDirectory: Schema.string().default(''), cliTimeoutMs: Schema.number().min(1000).max(600000).default(180000), kitesurf: Schema.boolean().default(true), localPort: Schema.number().step(1).min(1024).max(65535).default(3080), tailscaleHttpsPort: Schema.number().step(1).min(1024).max(65535).default(8443) });

export async function apply(ctx, config) {
  if (typeof ctx.connection.fetch?.register !== 'function') throw new Error('dsh-darask requires DSH 0.1.5-rc.2 Connection fetch routes.');
  let serviceRef;
  const tls = { httpsHosts: [] };
  ctx.inject(['webServer'], webCtx => {
    webCtx.effect(() => webCtx.webServer.register(createOpenRouterCallbackRoute({
      async callback(url) {
        if (!serviceRef) throw new Error('OpenRouter login is still starting. Please retry.');
        return serviceRef.callback(url);
      },
    }, tls)), 'dsh-darask: OpenRouter callback');
  });
  ctx.inject(['clientModules', 'connection'], installClientCompatibility);
  installAutoApproval(ctx);
  registerDaraskSkills(ctx);
  registerMediaSkills(ctx);
  registerComputerSkill(ctx);
  ctx.inject(['tools'], scope => scope.connection.fetch.register(mediaSettingsRoute({ settings: scope.settings, tools: scope.tools })));
  registerUnseenGemma4Skill(ctx);
  registerFusionSkill(ctx);
  const directory = config.dataDirectory ? resolve(config.dataDirectory) : join(resolveDshHome(), 'darask');
  const store = createStore(directory);
  await store.load();
  await mkdir(directory, { recursive: true });
  const addonStore = createAddonStore(directory);
  await addonStore.load();
  const addons = await createAddons({ store: addonStore, directory, credentials: ctx.credentials });
  for (const route of createAddonRoutes(addons)) ctx.connection.fetch.register(route);
  registerAddons(ctx, addons);
  const developmentHost = { directory, hub: null, distribution: null };
  for (const route of developmentRoutes(process.env, globalThis.fetch, () => developmentHost)) ctx.connection.fetch.register(route);
  for (const route of restartRoutes()) ctx.connection.fetch.register(route);
  const codexProxy = new OpenAICodexProxyManager();
  const codexAccounts = createCodexAccounts({ readUsage: credentials => codexProxy.run(
    resolveOpenAICodexProxyUrl(resolveOpenAICodexSettings(ctx.settings.get('llm-openai-codex') ?? {})),
    () => readOpenAICodexRateLimits(credentials)) });
  ctx.effect(() => () => codexProxy.dispose(), 'dsh-darask Codex accounts');
  const enableLocalRoute = async (current, apiKey) => {
    if (!current.providers.local.model) return;
    if (apiKey) await ctx.credentials.set('DARASK_LOCAL_API_KEY', apiKey);
    if (!(await ctx.credentials.resolve('DARASK_LOCAL_API_KEY'))?.value) await ctx.credentials.set('DARASK_LOCAL_API_KEY', 'local-only');
    await ctx.settings.update('llm-pi-ai', { providers: { 'darask-local': localRoute(current) } });
  };
  const tailscale = createTailscale({ directory, localPort: config.localPort, httpsPort: config.tailscaleHttpsPort });
  const localModel = createLocalModel({ store, directory, credentials: ctx.credentials, identity: async () => {
    const self = await tailscale.status();
    return { dnsName: self.dnsName, addresses: self.addresses };
  } });
  await enableLocalRoute(store.get());
  await enableClaudeRoute({ settings: ctx.settings, credentials: ctx.credentials, visibleModels: store.get().modelVisibility?.claude });
  await localModel.initialize();
  const computer = createComputer({ directory, store });
  let computerControl = computer;
  ctx.inject(['workspaceRegistry', 'connection', 'credentials'], async scope => {
    const hub = createWorkspaceHub({ directory, credentials: scope.credentials, registry: scope.workspaceRegistry, peers: () => tailscale.devices(), connection: scope.connection, tailscale });
    await hub.initialize();
    developmentHost.hub = hub;
    developmentHost.distribution = createDistribution({ directory, hub, version: release, env: process.env, log: message => scope.logger.warn(message) });
    developmentHost.distribution.resume().catch(error => scope.logger.warn(`dsh-darask: 配布を再開できませんでした。${error.message}`));
    const distribution = developmentHost.distribution;
    scope.effect(() => () => { distribution.dispose(); if (developmentHost.distribution === distribution) { developmentHost.distribution = null; developmentHost.hub = null; } });
    for (const route of createHostUpdateRoutes({ directory, hostId: () => hub.info().id })) scope.connection.fetch.register(route);
    registerRemoteSessions(scope, hub);
    scope.inject(['sessionPersistence', 'sessionQuery'], archiveScope => {
      for (const route of createSessionArchive({ registry: archiveScope.workspaceRegistry, sessions: archiveScope.get('sessions'), sessionPersistence: archiveScope.sessionPersistence, sessionQuery: archiveScope.sessionQuery }).routes) archiveScope.connection.fetch.register(route);
    });
    scope.inject(['fs', 'sandboxPolicy', 'sessionQuery'], async filesScope => {
      const sets = createWorkspaceSets({ directory, hub, registry: filesScope.workspaceRegistry, fs: filesScope.fs, policy: filesScope.sandboxPolicy, getSessionHeader: async id => (await filesScope.sessionQuery.listSessions()).find(row => row.header.id === id)?.header });
      await sets.initialize();
      for (const route of sets.routes) filesScope.connection.fetch.register(route);
      registerWorkspaceSetTools(filesScope, sets);
    });
    const remoteComputer = createComputerRemote({ computer, hub, directory });
    computerControl = remoteComputer;
    scope.connection.fetch.register(remoteComputer.route);
    scope.effect(() => () => { if (computerControl === remoteComputer) computerControl = computer; }, 'darask: remote computer');
    for (const route of hub.routes) scope.connection.fetch.register(route);
    let sharedModels;
    const codexRelay = createCodexRelay({ directory, hub, llm: scope.llm, attachments: () => scope.get('attachments'), resolveFilePath: ref => {
      try { const path = scope.get('attachments')?.fileHostPath(ref); return path && scope.get('fs')?.processPathFromHostPath(path); } catch { return undefined; }
    }, onConnection: async node => {
      await sharedModels?.refresh();
      const localKey = await ctx.credentials.resolve('DARASK_OPENAI_API_KEY');
      if (!node && !localKey?.value) return;
      const apiKeyEnv = node ? 'DARASK_OPENAI_RELAY' : 'DARASK_OPENAI_API_KEY';
      if (node && !(await ctx.credentials.resolve(apiKeyEnv))?.value) await ctx.credentials.set(apiKeyEnv, 'relay-only');
      await ctx.settings.update('llm-pi-ai', { providers: { openai: { apiKeyEnv, displayName: node ? 'OpenAI API（共有）' : 'OpenAI API', models: openAiModelCatalog(undefined, store.get().modelVisibility?.openai) } } });
    } });
    await codexRelay.initialize();
    sharedModels = createSharedModels({ llm: scope.llm, relay: codexRelay });
    const refreshSharedModels = () => sharedModels.refresh().catch(() => scope.logger.warn('認証元のモデル一覧を更新できません。両方の PC の DARASK と接続状態を確認してください。'));
    await refreshSharedModels();
    scope.effect(() => {
      const timer = setInterval(refreshSharedModels, 60000);
      return () => { clearInterval(timer); sharedModels.dispose(); };
    }, 'darask: shared model catalog');
    for (const route of [...codexRelay.routes, ...codexRoutes({ accounts: codexAccounts, port: config.localPort, upstream: codexRelay.auth })]) scope.connection.fetch.register(route);
    scope.on('llm/stream', (options, next) => codexRelay.stream(options, next), { prepend: true });
    scope.effect(() => () => codexRelay.dispose(), 'darask: shared Codex connection');
    scope.inject(['webServer'], webScope => {
      const proxy = createRemoteProxy({ hub, connection: scope.connection });
      webScope.connection.fetch.register(proxy.route);
      webScope.effect(() => webScope.webServer.register(proxy.assets), 'darask: remote workspace assets');
      webScope.effect(() => webScope.webServer.registerUpgrade(proxy.upgrade), 'darask: remote workspace stream');
      webScope.effect(() => () => proxy.dispose(), 'darask: remote workspace carrier');
    });
  });
  let browserRunFork;
  const browserRun = createBrowserRun({ credentials: ctx.credentials, directory, onConnection: async settings => {
    await browserRunFork?.dispose();
    browserRunFork = undefined;
    if (settings) browserRunFork = ctx.plugin(mcpClient, { transport: 'stdio', serverName: 'browserrun', command: process.execPath,
      args: [fileURLToPath(new URL('../scripts/browser-run-mcp.mjs', import.meta.url))], env: { DARASK_CF_ACCOUNT_ID: settings.accountId, DARASK_CF_API_TOKEN: settings.apiToken },
      cwd: directory, toolCallTimeoutMs: 65000, failOnStartupError: false });
  } });
  await browserRun.initialize();
  if (config.kitesurf) ctx.plugin(mcpClient, { transport: 'stdio', serverName: 'kitesurf', command: process.execPath,
    args: [fileURLToPath(new URL('../scripts/kitesurf.mjs', import.meta.url))], env: {}, cwd: directory, toolCallTimeoutMs: 65000, failOnStartupError: false });
  ctx.inject(['systemPrompt'], promptCtx => {
    promptCtx.systemPrompt.section({ name: 'darask:fusion', order: 989, text: fusionPrompt });
    promptCtx.systemPrompt.section({ name: 'darask:computer', order: 989, text: COMPUTER_PROMPT });
    promptCtx.systemPrompt.section({ name: 'darask:browser', order: 990, text: 'Use DSH native tools for coding work at Cursor/Grok Build level: read, write, edit, grep, glob, and pwsh. Prefer those over darask_agent for implementation in this workspace. darask_agent is extra analysis by a logged-in Cursor/Claude/Grok CLI and stays in plan/ask mode. Use Kitesurf (mcp__kitesurf__*) for public web pages and darask_computer for local apps and the desktop. Cloudflare Browser Run (mcp__browserrun__* and darask_browser_run) is available when explicitly selected by the user. Do not silently switch to a local browser. These remote browsers do not inherit local logins and cannot reach localhost or a private Tailscale network. Report an unsupported operation rather than claiming it was performed.' });
    promptCtx.systemPrompt.section({ name: 'darask:dev', order: 991, text: DEV_PROMPT });
    promptCtx.systemPrompt.section({ name: 'darask:media-skills', order: 991.5, text: MEDIA_PROMPT });
    promptCtx.systemPrompt.section({ name: 'darask:unseen-gemma4-prompts', order: 992, text: unseenGemma4Prompt });
  });
  const enablePiAiKey = async (provider, ref) => {
    if (ctx.settings.get('llm-pi-ai') === undefined) throw new Error('DSH llm-pi-ai settings are unavailable.');
    await ctx.settings.update('llm-pi-ai', { providers: { [provider]: { apiKeyEnv: ref } } });
  };
  const syncModelCatalogs = async usage => {
    const visibility = store.get().modelVisibility;
    const current = ctx.settings.get('llm-pi-ai');
    const provider = current?.providers?.openai ?? {};
    const models = openAiModelCatalog(usage, visibility?.openai);
    if (JSON.stringify(provider.models) !== JSON.stringify(models) || provider.displayName !== 'OpenAI API') {
      // Keep the catalog visible on hosts without a local key: a remote session
      // may execute this route through its selected authenticated relay.
      await ctx.settings.update('llm-pi-ai', { providers: { openai: { ...provider, displayName: 'OpenAI API', models } } });
    }
    const openrouter = current?.providers?.openrouter ?? {};
    const openrouterModels = visibleModelCatalog('openrouter', visibility);
    if (JSON.stringify(openrouter.models) !== JSON.stringify(openrouterModels) || openrouter.displayName !== 'OpenRouter') await ctx.settings.update('llm-pi-ai', { providers: { openrouter: { ...openrouter, displayName: 'OpenRouter', models: openrouterModels } } });
    await ctx.settings.update('llm-openai-codex', { models: visibility?.codex ?? visibleModelCatalog('codex').map(model => model.id) });
    await ctx.settings.update('llm-grok', { models: visibility?.grok ?? visibleModelCatalog('grok').map(model => model.id) });
  };
  const service = createService({ store, directory, credentials: ctx.credentials, tailscale, browserRun, localModel, computer, enableLocalRoute, enableClaudeRoute: () => enableClaudeRoute({ settings: ctx.settings, credentials: ctx.credentials, visibleModels: store.get().modelVisibility?.claude }), enableOpenRouterRoute: ref => enablePiAiKey('openrouter', ref), enableOpenAiRoute: ref => enablePiAiKey('openai', ref), syncOpenAiModels: syncModelCatalogs, compatibility: () => ({ dsh: '0.1.5-rc.2', subagentPackagesRequired: false, cursor: 'isolated-cli', grok: 'isolated-cli', routing: 'before-request', claudeUsage: 'statusLine', kitesurf: config.kitesurf, computer: store.get().computer?.enabled ? 'desktop' : 'opt-in' }) });
  await syncModelCatalogs(service.snapshots.openai?.usage);
  serviceRef = service;
  const tailState = await tailscale.status();
  tls.httpsHosts = tailState.url ? [new URL(tailState.url).host] : [];
  for (const route of createRoutes(service, tls)) ctx.connection.fetch.register(route);
  ctx.on('agent/request', async ({ signal }, next) => {
    const original = await next();
    const current = store.get();
    let request = original;
    if (current.routingEnabled) {
      signal.throwIfAborted();
      const choices = candidates(current, service.snapshots);
      let routed;
      for (const id of choices) {
        const provider = MODEL_ROUTES[id];
        const model = current.providers[id].model;
        try { await ctx.llm.resolveModelInfo(provider, model, signal); }
        catch { signal.throwIfAborted(); continue; }
        // Route change happens before Harness records request/header. Preserve
        // conversation messages and drop the previous provider's effort value.
        const { reasoningEffort, ...rest } = original;
        routed = { ...rest, provider, model };
        break;
      }
      if (!routed) throw new Error('DARASK: no enabled model route is available. Configure a model or turn off priority routing.');
      request = routed;
    }
    signal.throwIfAborted();
    const modelInfo = await ctx.llm.resolveModelInfo(request.provider, request.model, signal);
    signal.throwIfAborted();
    return addons.decorateRequest(request, modelInfo);
  }, { prepend: true });
  ctx.inject(['tools'], toolsCtx => registerCoreTools(toolsCtx, { browserRun, store, service, config, computer: { run: (args, exec) => computerControl.run(args, exec) } }));
  ctx.effect(() => () => service.dispose(), 'dsh-darask lifecycle');
}
