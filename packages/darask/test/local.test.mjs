import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, validateConfig, candidates } from '../src/config.mjs';
import { modelEndpoint, localRoute, LOCAL_MODEL_ID, MODEL_DOWNLOAD, withoutLocalReasoningEffort, localModelHost } from '../src/local-settings.mjs';
import { localServerArgs, createLocalModel, parseLocalLog } from '../src/local-model.mjs';

test('local upgrade preserves the entire existing priority and never starts a model implicitly', () => {
  const config = validateConfig({ priority: ['cursor', 'codex', 'grok', 'claude', 'openrouter'] });
  assert.deepEqual(config.priority, ['openai', 'cursor', 'codex', 'grok', 'claude', 'openrouter', 'local']);
  assert.equal(config.local.autoStart, false);
  assert.equal(config.local.gpuLayers, 999);
  assert.equal(config.providers.local.enabled, false);
  assert.equal(LOCAL_MODEL_ID, 'unseen-gemma4-26b-q4');
  assert.equal(Object.hasOwn(withoutLocalReasoningEffort({ provider: 'darask-local', model: LOCAL_MODEL_ID, reasoningEffort: 'low' }), 'reasoningEffort'), false);
  assert.equal(withoutLocalReasoningEffort({ provider: 'grok', model: 'grok-4', reasoningEffort: 'low' }).reasoningEffort, 'low');
  assert.equal(MODEL_DOWNLOAD.filename, 'UNSEEN_Gemma_4_26B_NSFW_Q4_K_M.gguf');
  assert.equal(MODEL_DOWNLOAD.bytes, 16796017312);
  assert.equal(MODEL_DOWNLOAD.sha256, '730c1bbe22729c7069e502098103ba3c2d66d8dc4e2912f5a986c8c15d06dcce');
  assert.throws(() => validateConfig({ priority: ['local', 'codex', 'grok', 'claude', 'openrouter'] }));
});

test('model endpoints accept only local loopback and Tailscale, preserving API keys outside preferences', () => {
  for (const value of ['http://127.0.0.1:18081/v1', 'http://100.104.1.2:18081/v1', 'https://gpu.testnet.ts.net:8444/v1']) assert.ok(modelEndpoint(value));
  for (const value of ['https://example.com/v1', 'http://192.168.1.2:8080/v1', 'http://100.128.1.2:8080/v1', 'https://user:password@gpu.test.ts.net/v1', 'https://gpu.test.ts.net/v1?token=secret', 'http://127.0.0.1:8080/other']) assert.throws(() => modelEndpoint(value));
  const mine = modelEndpoint('https://win.tail7f0d3a.ts.net:8444/v1');
  assert.equal(localModelHost(mine, { dnsName: 'win.tail7f0d3a.ts.net', addresses: [] }), true);
  assert.equal(localModelHost(mine, { dnsName: 'hub.tail7f0d3a.ts.net', addresses: [] }), false);
  const config = validateConfig({ localApiKey: 'private-fixture-value' });
  assert.ok(!JSON.stringify(config).includes('private-fixture-value'));
});

test('local launch has bounded context, separate GPU settings and no shell interpolation or remote launch', () => {
  const config = validateConfig({ local: { modelFile: 'C:/models/model name.gguf', gpuLayers: 40, contextSize: 8192 }, providers: { local: { model: LOCAL_MODEL_ID } } });
  const args = localServerArgs(config);
  assert.equal(args[args.indexOf('--model') + 1], 'C:/models/model name.gguf');
  assert.equal(args[args.indexOf('--host') + 1], '127.0.0.1');
  assert.equal(args[args.indexOf('--n-gpu-layers') + 1], '40');
  assert.equal(args[args.indexOf('--reasoning') + 1], 'off');
  assert.ok(args.includes('--no-warmup'));
  assert.equal(localRoute(config).models[0].contextWindow, 8192);
  assert.throws(() => localServerArgs(validateConfig({ local: { baseUrl: 'https://gpu.testnet.ts.net/v1' } })));
});

test('local log parser maps llama-server load stages without inventing percents', () => {
  assert.deepEqual(parseLocalLog(''), { stage: 'starting', percent: null, lastLine: '' });
  const loading = parseLocalLog('llama_model_loader: loading tensors\nload_tensors: 42%\n');
  assert.equal(loading.stage, 'loading');
  assert.equal(loading.percent, 42);
  const serving = parseLocalLog('main: server is listening on http://127.0.0.1:18081\n');
  assert.equal(serving.stage, 'serving');
  assert.equal(serving.percent, 100);
  assert.equal(parseLocalLog('failed to load model from file\n').stage, 'error');
});

test('local status uses real model presence and real metrics; it neither launches nor invents remaining credits', async () => {
  const config = validateConfig({ providers: { local: { model: LOCAL_MODEL_ID, enabled: true }, openai: { enabled: false } } });
  const seen = [];
  const adapter = createLocalModel({ store: { get: () => config }, directory: '.', credentials: { resolve: async () => ({ value: 'fixture' }) }, spawn: () => { throw new Error('must not spawn'); },
    fetch: async (url, init) => {
      seen.push(String(url)); assert.equal(init.headers.Authorization, 'Bearer fixture');
      if (String(url).endsWith('/chat/completions')) {
        assert.equal(init.method, 'POST');
        return Response.json({ choices: [{ message: { content: 'OK' } }] });
      }
      return String(url).endsWith('/models') ? Response.json({ data: [{ id: LOCAL_MODEL_ID }] }) : new Response('llamacpp:prompt_tokens_total 120\nllamacpp:tokens_predicted_total 25\n');
    } });
  const status = await adapter.status();
  assert.equal(status.auth, 'authenticated');
  assert.equal(status.localRuntime.owned, false);
  assert.equal(status.localRuntime.progress.stage, 'ready');
  assert.equal(status.localRuntime.progress.percent, 100);
  assert.equal(status.usage.local.generatedTokens, 25);
  assert.equal(status.usage.credits, null);
  assert.deepEqual(candidates(config, { local: status }), ['local']);
  const tested = await adapter.action('testLocal');
  assert.equal(tested.localRuntime.test.ok, true);
  assert.equal(tested.localRuntime.test.reply, 'OK');
  assert.ok(Number.isFinite(tested.localRuntime.test.latencyMs));
  await adapter.action('stopLocal');
  await adapter.dispose();
  assert.ok(seen.some(url => String(url).endsWith('/chat/completions')));
  assert.equal(seen.filter(url => url.endsWith('/models')).length >= 2, true);
});

test('owned llama-server receives the stored API key without leaking it into arguments', async t => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { EventEmitter } = await import('node:events');
  const dir = await mkdtemp(join(tmpdir(), 'darask-local-auth-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const executable = join(dir, 'llama-server.exe'), modelFile = join(dir, 'model.gguf');
  await writeFile(executable, 'fixture');
  await writeFile(modelFile, 'fixture');
  const config = validateConfig({ providers: { local: { executable, enabled: true, model: LOCAL_MODEL_ID } }, local: { modelFile, baseUrl: 'http://127.0.0.1:18081/v1' } });
  let spawned = false;
  const child = new EventEmitter();
  child.pid = 4242;
  child.kill = () => { setImmediate(() => child.emit('close', 0)); };
  const kills = [];
  const adapter = createLocalModel({
    store: { get: () => config }, directory: dir, credentials: { resolve: async () => ({ value: 'fixture-private-key' }) },
    fetch: async () => { throw new Error('offline'); }, platform: 'win32',
    spawn: (exe, args, options) => {
      if (/taskkill/i.test(String(exe))) {
        kills.push(args);
        const killer = new EventEmitter();
        setImmediate(() => killer.emit('close', 0));
        return killer;
      }
      spawned = true;
      assert.equal(exe, executable);
      assert.equal(options.env.LLAMA_API_KEY, 'fixture-private-key');
      assert.doesNotMatch(JSON.stringify(args), /fixture-private-key/);
      assert.equal(options.windowsHide, true);
      return child;
    },
  });
  await adapter.action('startLocal');
  assert.equal(spawned, true);
  await adapter.dispose();
  assert.ok(kills.some(args => args.includes('/PID') && args.includes('4242') && args.includes('/T') && args.includes('/F')));
});

test('this GPU PC can stop a Tailscale-published llama-server it no longer owns', async t => {
  const { EventEmitter } = await import('node:events');
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const dir = await mkdtemp(join(tmpdir(), 'darask-local-stop-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const config = validateConfig({
    providers: { local: { executable: 'C:\\llama-server.exe', enabled: true, model: LOCAL_MODEL_ID } },
    local: { baseUrl: 'https://win.tail7f0d3a.ts.net:8444/v1' },
  });
  const kills = [];
  let live = true;
  const adapter = createLocalModel({
    store: { get: () => config }, directory: dir, platform: 'win32',
    identity: async () => ({ dnsName: 'win.tail7f0d3a.ts.net', addresses: [] }),
    fetch: async () => { if (!live) throw new Error('offline'); return Response.json({ data: [{ id: LOCAL_MODEL_ID }] }); },
    spawn: (exe, args) => { kills.push({ exe, args }); live = false; const killer = new EventEmitter(); setImmediate(() => killer.emit('close', 0)); return killer; },
  });
  const before = await adapter.status();
  assert.equal(before.localRuntime.local, true);
  assert.equal(before.localRuntime.owned, false);
  await adapter.action('stopLocal');
  assert.ok(kills.some(item => /taskkill/i.test(String(item.exe)) && item.args.includes('/IM') && item.args.includes('llama-server.exe') && item.args.includes('/T') && item.args.includes('/F')));
  const after = await adapter.status();
  assert.equal(after.localRuntime.phase, 'stopped');
});
