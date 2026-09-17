import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { candidates, candidatesForPurpose, DEEPSEEK_CREDENTIAL, DEEPSEEK_MODEL, DEEPSEEK_ROUTE, defaultConfig, MODEL_ROUTES, PURPOSE_IDS, validateConfig } from '../src/config.mjs';
import { createStore } from '../src/store.mjs';
import { createOpenRouterCallbackRoute, createRoutes } from '../src/http.mjs';
import { createService, normalizeClaudeStatusline } from '../src/service.mjs';
import { delegate, delegationArgs, parseDelegationOutput } from '../src/delegation.mjs';

async function directory(t) {
  const parent = path.resolve(tmpdir());
  const value = await mkdtemp(path.join(parent, 'darask-core-test-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(value)), parent);
    assert.ok(path.basename(value).startsWith('darask-core-test-'));
    await rm(value, { recursive: true, force: true });
  });
  return value;
}

test('configuration rejects incomplete priority, unknown keys, and command injection paths', () => {
  for (const input of [
    { priority: ['grok'] }, { priority: ['grok', 'grok', 'cursor', 'codex', 'claude'] },
    { credentials: 'secret' }, { providers: { fake: {} } },
    { providers: { cursor: { executable: 'agent.cmd' } } },
    { providers: { cursor: { executable: 'C:\\tools\\agent.cmd\nwhoami' } } },
    { openrouterApiKey: 'token with spaces' }, { routingEnabled: 'true' },
    { purposeRoutes: { unknown: 'grok' } }, { purposeRoutes: { research: 'cursor' } },
  ]) assert.throws(() => validateConfig(input));
});

test('default orchestration uses official DeepSeek lead with Grok search fallback', () => {
  const config = defaultConfig();
  assert.equal(config.routingEnabled, true);
  assert.deepEqual(config.priority.slice(0, 2), ['deepseek', 'grok']);
  assert.equal(MODEL_ROUTES.deepseek, DEEPSEEK_ROUTE);
  assert.equal(config.providers.deepseek.model, DEEPSEEK_MODEL);
  assert.equal(config.providers.grok.model, 'grok-4.6');
  for (const purpose of PURPOSE_IDS) assert.equal(config.purposeRoutes[purpose], 'deepseek');
  assert.equal(candidatesForPurpose(config, { deepseek: { auth: 'authenticated' } }, 'research')[0], 'deepseek');
  assert.equal(candidatesForPurpose(config, { deepseek: { auth: 'unauthenticated' } }, 'research')[0], 'grok');
});

test('saved Vercel conversation settings migrate to official DeepSeek without sharing the Jev key', () => {
  const config = validateConfig({
    priority: ['gateway', 'grok', 'openai', 'openrouter', 'cursor', 'codex', 'claude', 'local'],
    purposeRoutes: { research: 'gateway' },
    modelVisibility: { gateway: ['deepseek/deepseek-v4-pro'] },
    providers: { gateway: { enabled: true, model: 'deepseek/deepseek-v4-pro', executable: '' } },
    aiGatewayApiKey: 'jev-only-key',
  });
  assert.equal(config.priority[0], 'deepseek');
  assert.equal(config.purposeRoutes.research, 'deepseek');
  assert.deepEqual(config.modelVisibility.deepseek, ['deepseek-v4-pro']);
  assert.equal(config.providers.deepseek.model, 'deepseek-v4-pro');
  assert.ok(!JSON.stringify(config).includes('jev-only-key'));
});

test('configuration keeps Cursor and Grok executable identities separate', () => {
  for (const providers of [
    { cursor: { executable: 'C:\\Users\\person\\.grok\\bin\\agent.exe' } },
    { grok: { executable: 'C:\\Users\\person\\cursor-agent\\agent.cmd' } },
    { cursor: { executable: 'C:\\TOOLS\\agent.exe' }, grok: { executable: 'c:\\tools\\agent.exe' } },
  ]) assert.throws(() => validateConfig({ providers }));
  const good = validateConfig({ providers: {
    cursor: { executable: ' C:\\tools\\cursor\\agent.cmd ' }, grok: { executable: 'C:\\tools\\grok\\grok.exe' },
  } });
  assert.equal(good.providers.cursor.executable, 'C:\\tools\\cursor\\agent.cmd');
});

test('routing respects capability and user priority without treating unknown usage as zero', () => {
  const config = validateConfig({ priority: ['cursor', 'codex', 'grok', 'claude', 'openrouter'],
    providers: { deepseek: { enabled: false }, openai: { enabled: false }, codex: { model: 'model-a' }, grok: { model: 'model-b' }, openrouter: { model: 'model-c' } } });
  assert.deepEqual(candidates(config, {}), ['codex', 'grok', 'openrouter']);
  assert.deepEqual(candidates(config, {}, 'agent'), ['cursor', 'grok', 'claude']);
  assert.ok(MODEL_ROUTES.claude === 'anthropic');
  assert.deepEqual(candidates(config, { codex: { auth: 'unauthenticated' }, grok: { auth: 'unavailable' } }), ['openrouter']);
});

test('purpose routing prefers its configured conversation model and preserves priority fallback', () => {
  const config = validateConfig({
    priority: ['openai', 'openrouter', 'codex', 'grok', 'claude', 'cursor', 'local'],
    purposeRoutes: { research: 'grok', architecture: 'claude' },
    providers: {
      deepseek: { enabled: false },
      openai: { model: 'gpt-model' },
      openrouter: { model: 'router-model' },
      grok: { model: 'grok-model' },
      claude: { model: 'claude-model' },
    },
  });
  assert.deepEqual(candidatesForPurpose(config, {}, 'research').slice(0, 3), ['grok', 'openai', 'openrouter']);
  assert.equal(candidatesForPurpose(config, { grok: { auth: 'unavailable' } }, 'research')[0], 'openai');
  assert.equal(candidatesForPurpose(config, {}, 'architecture')[0], 'claude');
  assert.equal(candidatesForPurpose(config, {}, 'medium')[0], 'openai');
});

test('routing excludes only fresh confirmed exhaustion and rechecks expired limits', () => {
  const now = Date.parse('2026-09-14T10:00:00Z');
  const config = validateConfig({ providers: { deepseek: { enabled: false }, grok: { model: 'grok-model' }, openai: { enabled: false } } });
  const snapshot = (age, reset, status = 'available') => ({ grok: { auth: 'authenticated', usage: {
    status, updatedAt: new Date(now - age).toISOString(), windows: [{ remainingPercent: 0, resetsAt: reset }], credits: null,
  } } });
  assert.deepEqual(candidates(config, snapshot(1000, null), 'model', now), []);
  assert.deepEqual(candidates(config, snapshot(1000, new Date(now + 60000).toISOString()), 'model', now), []);
  assert.deepEqual(candidates(config, snapshot(1000, new Date(now - 1).toISOString()), 'model', now), ['grok']);
  assert.deepEqual(candidates(config, snapshot(121000, null), 'model', now), ['grok']);
  assert.deepEqual(candidates(config, snapshot(1000, null, 'error'), 'model', now), ['grok']);
});

test('preferences store never persists supplied keys and serializes concurrent partial changes', async t => {
  const location = await directory(t);
  const store = createStore(location);
  await store.load();
  await Promise.all([
    store.save({ openrouterApiKey: 'secret-api-value', openrouterManagementKey: 'secret-management-value', aiGatewayApiKey: 'secret-gateway-value', routingEnabled: true }),
    store.save({ providers: { cursor: { enabled: false } } }),
  ]);
  const raw = await readFile(path.join(location, 'preferences.json'), 'utf8');
  assert.ok(!raw.includes('secret-'));
  assert.ok(!raw.includes('openrouterApiKey'));
  assert.ok(!raw.includes('aiGatewayApiKey'));
  const parsed = JSON.parse(raw);
  assert.equal(parsed.routingEnabled, true);
  assert.equal(parsed.providers.cursor.enabled, false);
  const copy = store.get();
  copy.providers.cursor.enabled = true;
  assert.equal(store.get().providers.cursor.enabled, false);
  const reloaded = createStore(location);
  assert.deepEqual(await reloaded.load(), store.get());
});

test('failed preference writes leave prior settings intact and do not poison later updates', async t => {
  const store = createStore(await directory(t));
  await store.load();
  await assert.rejects(store.save({ priority: ['cursor'] }));
  await store.save({ providers: { claude: { enabled: false } } });
  assert.equal(store.get().providers.claude.enabled, false);
});

test('corrupt persisted preferences fail visibly instead of silently overwriting user settings', async t => {
  const location = await directory(t);
  await writeFile(path.join(location, 'preferences.json'), '{broken', 'utf8');
  const store = createStore(location);
  await assert.rejects(store.load(), /repair preferences/u);
  assert.equal(await readFile(path.join(location, 'preferences.json'), 'utf8'), '{broken');
});

test('action HTTP route rejects wrong origins, malformed JSON, oversized and non-JSON bodies before dispatch', async () => {
  let dispatched = 0;
  const route = createRoutes({ action: async () => { dispatched++; return {}; } }).find(route => route.path.endsWith('/action'));
  const make = (body, headers = {}) => new Request('http://localhost:9000/api/darask/action', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body,
  });
  assert.equal((await route.fetch(make('{}', { origin: 'https://untrusted.example' }))).status, 403);
  assert.equal((await route.fetch(make('{bad'))).status, 400);
  assert.equal((await route.fetch(make(' '.repeat(32769)))).status, 413);
  assert.equal((await route.fetch(make('{}', { 'content-type': 'text/plain' }))).status, 415);
  assert.equal(dispatched, 0);
  const response = await route.fetch(make('{}', { origin: 'http://localhost:9000' }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(dispatched, 1);
});

test('HTTP route hides unexpected service errors and callback credentials', async () => {
  const routes = createRoutes({ action: async () => { throw new Error('Bearer private-token'); } });
  const action = await routes[1].fetch(new Request('http://localhost/api/darask/action', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  }));
  assert.ok(!(await action.text()).includes('private-token'));
  const chunks = [];
  const res = { statusCode: 0, headers: {}, writeHead(status, headers) { this.statusCode = status; this.headers = headers; }, end(body) { chunks.push(body); } };
  await createOpenRouterCallbackRoute({ callback: async () => { throw new Error('code=private-code'); } }).handler(
    { method: 'GET', url: '/darask/openrouter/callback?code=private-code', headers: { host: 'localhost' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(chunks.join(''), /ログインを完了できません/u);
  assert.ok(!chunks.join('').includes('private-code'));
  assert.equal(res.headers['Referrer-Policy'], 'no-referrer');
});

test('service shares concurrent refreshes and leaves Grok/Codex auth to their bundled adapters', async t => {
  const location = await directory(t);
  const store = createStore(location);
  let statusCalls = 0;
  const syncedOpenAiUsage = [];
  const service = createService({ directory: location, store,
    credentials: { resolve: async () => undefined }, enableOpenRouterRoute: async () => {}, syncOpenAiModels: async usage => { syncedOpenAiUsage.push(usage); },
    cliFactory: () => ({ status: async () => { statusCalls++; return { auth: 'authenticated', usage: { status: 'unavailable', windows: [], credits: null } }; }, dispose: async () => {} }),
    fetch: async () => { throw new Error('No API key means no network requests'); },
  });
  t.after(() => service.dispose());
  await Promise.all([service.refresh(), service.refresh(), service.refresh()]);
  assert.equal(statusCalls, 2);
  assert.equal(syncedOpenAiUsage.length, 1);
  assert.equal(syncedOpenAiUsage[0].status, 'unavailable');
  assert.equal(service.snapshots.grok.managedBy, 'dsh-grok-provider');
  assert.equal(service.snapshots.codex.managedBy, 'dsh-codex-connect');
  assert.equal(service.snapshots.codex.auth, 'unknown');
  assert.deepEqual(service.snapshot().modelVisibility.openai, ['gpt-5.6-sol', 'gpt-5.6-luna']);
  await assert.rejects(service.action({ action: 'login', provider: 'codex' }, 'http://localhost'), /bundled provider/u);
});

test('service keeps the official DeepSeek key separate from the Jev Gateway key', async t => {
  const location = await directory(t);
  const store = createStore(location);
  await store.load();
  const values = new Map();
  const credentials = {
    resolve: async key => values.has(key) ? { value: values.get(key) } : undefined,
    set: async (key, value) => values.set(key, value),
    unset: async key => values.delete(key),
  };
  const service = createService({ directory: location, store, credentials, enableOpenRouterRoute: async () => {},
    cliFactory: () => ({ status: async () => ({ auth: 'unknown', usage: { status: 'unavailable', windows: [], credits: null } }), dispose: async () => {} }),
    fetch: async () => { throw new Error('No provider status request expected'); },
  });
  t.after(() => service.dispose());
  await service.action({ action: 'save', config: { deepseekApiKey: 'official-deepseek-key', aiGatewayApiKey: 'jev-gateway-key' } });
  assert.equal(values.get(DEEPSEEK_CREDENTIAL), 'official-deepseek-key');
  assert.equal(values.get('AI_GATEWAY_API_KEY'), 'jev-gateway-key');
  assert.equal(service.snapshot().providers.find(provider => provider.id === 'deepseek').auth, 'authenticated');
  await service.action({ action: 'logout', provider: 'deepseek' });
  assert.equal(values.has(DEEPSEEK_CREDENTIAL), false);
  assert.equal(values.get('AI_GATEWAY_API_KEY'), 'jev-gateway-key');
});

test('Claude statusLine exposes only known subscription windows without inventing credits', () => {
  const usage = normalizeClaudeStatusline({ version: 1, updatedAt: new Date().toISOString(), rate_limits: {
    five_hour: { used_percentage: 12.5, resets_at: 1800000000 }, seven_day: { used_percentage: 103 },
    unexpected: { used_percentage: 50 },
  } });
  assert.equal(usage.windows.length, 2);
  assert.equal(usage.windows[0].remainingPercent, 87.5);
  assert.equal(usage.windows[1].remainingPercent, 0);
  assert.equal(usage.credits, null);
  assert.throws(() => normalizeClaudeStatusline({ version: 1, updatedAt: 'invalid' }));
});

test('delegation CLI arguments preserve prompt boundaries and use restricted modes', () => {
  const prompt = '--dangerous-option & echo payload';
  const cursor = delegationArgs('cursor', prompt, 'model-name');
  assert.deepEqual(cursor.slice(-2), ['--', prompt]);
  assert.ok(cursor.includes('ask'));
  assert.ok(delegationArgs('grok', prompt).includes('plan'));
  assert.ok(delegationArgs('claude', prompt).includes('plan'));
  assert.throws(() => delegationArgs('codex', prompt));
  assert.equal(parseDelegationOutput(JSON.stringify({ result: 'Token Bearer sensitive.abc and sk-1234567890abcdef' })), 'Token Bearer [redacted] and [redacted]');
});

test('delegation falls back only before launch, and never resends failed started work', async t => {
  const cwd = await directory(t);
  const config = defaultConfig();
  const resolved = [];
  const launched = [];
  const options = { cwd, config, snapshots: {}, prompt: 'inspect',
    resolve: id => { resolved.push(id); if (id === 'grok') throw new Error('missing'); return { id }; },
    run: launch => { launched.push(launch.id); return { cancel() {}, completion: Promise.resolve({ code: 1, stdout: '' }) }; },
  };
  await assert.rejects(delegate(options), /No task was automatically resent/u);
  assert.deepEqual(resolved, ['grok', 'cursor']);
  assert.deepEqual(launched, ['cursor']);
});

test('workspace lock holds through cancellation until the child confirms teardown', async t => {
  const cwd = await directory(t);
  let finish;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const controller = new AbortController();
  const reason = new Error('user cancelled');
  let cancels = 0;
  const base = { cwd, config: defaultConfig(), snapshots: {}, provider: 'cursor', prompt: 'inspect', resolve: id => ({ id }) };
  const first = delegate({ ...base, signal: controller.signal, run: () => {
    started();
    return { cancel() { cancels++; }, completion: new Promise(resolve => { finish = resolve; }) };
  } });
  await ready;
  await assert.rejects(delegate({ ...base, run: () => { throw new Error('must not start'); } }), /owns this workspace/u);
  controller.abort(reason);
  assert.equal(cancels, 1);
  await assert.rejects(delegate({ ...base, run: () => { throw new Error('must not start during teardown'); } }), /owns this workspace/u);
  const rejected = assert.rejects(first, error => error === reason);
  finish({ code: 0, stdout: '{"result":"late response"}' });
  await rejected;
  const next = await delegate({ ...base, run: () => ({ cancel() {}, completion: Promise.resolve({ code: 0, stdout: '{"result":"ready"}' }) }) });
  assert.equal(next.output, 'ready');
});
