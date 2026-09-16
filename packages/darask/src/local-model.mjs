import { spawn } from 'node:child_process';
import { stat, mkdir, open, readFile, writeFile, unlink } from 'node:fs/promises';
import { basename, isAbsolute, join, win32 } from 'node:path';
import { providerEnvironment } from './providers/cli.mjs';
import { LOCAL_MODEL_ID, validateLocal, modelEndpoint, localModelHost } from './local-settings.mjs';

export function parseLocalLog(text) {
  const source = String(text ?? '');
  const percents = [...source.matchAll(/(?:^|[^\d.])(\d{1,3}(?:\.\d+)?)\s*%/g)]
    .map(match => Number(match[1]))
    .filter(value => Number.isFinite(value) && value >= 0 && value <= 100);
  const lastLine = source.trim().split(/\r?\n/).filter(Boolean).at(-1)?.slice(0, 200) ?? '';
  if (/error while|failed to load|failed to initialize|ggml_cuda_init:\s*failed|could not load model/i.test(source)) {
    return { stage: 'error', percent: percents.at(-1) ?? null, lastLine };
  }
  if (/listening on|http server is listening|started on http/i.test(source)) {
    return { stage: 'serving', percent: 100, lastLine };
  }
  if (/load_tensors|loading model|llama_model_loader|offloading .+ layers|llama_init_from_model/i.test(source)) {
    return { stage: 'loading', percent: percents.at(-1) ?? null, lastLine };
  }
  return { stage: 'starting', percent: percents.at(-1) ?? null, lastLine };
}

export function localServerArgs(config) {
  const value = validateLocal(config.local);
  const url = new URL(value.baseUrl);
  if (!modelEndpoint(value.baseUrl).loopback) throw new Error('リモートモデルの起動・停止は相手の PC で行ってください。');
  const model = config.providers.local.model || LOCAL_MODEL_ID;
  if (!model || /[\x00-\x1f]/.test(model)) throw new Error('Invalid local model ID');
  return ['--model', value.modelFile, '--alias', model, '--host', url.hostname.replace(/^\[|\]$/g, ''), '--port', url.port,
    '--ctx-size', String(value.contextSize), '--n-gpu-layers', String(value.gpuLayers), '--parallel', '1',
    '--batch-size', '512', '--ubatch-size', '128', '--flash-attn', 'on', '--jinja', '--metrics',
    '--reasoning', 'off', '--no-warmup', '--temp', '0.7', '--top-p', '0.8', '--top-k', '20', '--min-p', '0'];
}

export function createLocalModel({ store, directory, credentials, fetch: fetchImpl = globalThis.fetch, spawn: spawnImpl = spawn, identity = async () => ({}), platform = process.platform }) {
  let child;
  let closed;
  let phase = 'stopped';
  let queue = Promise.resolve();
  let disposed = false;
  let lastError = null;
  let startedAt = null;
  let lastTest = null;
  const logFile = join(directory, 'local-model.log');
  const pidFile = join(directory, 'local-model.pid');
  let identityCache = {}, identityAt = 0;
  async function self() {
    if (Date.now() - identityAt < 2000 && identityCache) return identityCache;
    identityCache = await identity() ?? {};
    identityAt = Date.now();
    return identityCache;
  }
  async function readPid() {
    try {
      const pid = Number((await readFile(pidFile, 'utf8')).trim());
      return Number.isInteger(pid) && pid > 0 ? pid : null;
    } catch { return null; }
  }
  async function clearPid() {
    await unlink(pidFile).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  function killTree(pid) {
    return new Promise(resolve => {
      if (!Number.isInteger(pid) || pid <= 0) return resolve();
      if (platform === 'win32') {
        const taskkill = win32.join(process.env.SystemRoot ?? process.env.SYSTEMROOT ?? 'C:\\Windows', 'System32', 'taskkill.exe');
        const killer = spawnImpl(taskkill, ['/PID', String(pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' });
        killer.once('error', () => resolve());
        killer.once('close', () => resolve());
        return;
      }
      try { process.kill(pid, 'SIGTERM'); } catch {}
      setTimeout(() => { try { process.kill(pid, 'SIGKILL'); } catch {} resolve(); }, 500);
    });
  }
  function killImage(name) {
    return new Promise(resolve => {
      if (platform !== 'win32' || !/^llama-server\.exe$/i.test(name)) return resolve();
      const taskkill = win32.join(process.env.SystemRoot ?? process.env.SYSTEMROOT ?? 'C:\\Windows', 'System32', 'taskkill.exe');
      const killer = spawnImpl(taskkill, ['/IM', name, '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' });
      killer.once('error', () => resolve());
      killer.once('close', () => resolve());
    });
  }
  async function progressFromLog() {
    try {
      const text = await readFile(logFile, 'utf8');
      return parseLocalLog(text.length > 98304 ? text.slice(-98304) : text);
    } catch {
      return parseLocalLog('');
    }
  }
  async function status() {
    const config = store.get();
    const local = validateLocal(config.local);
    const endpoint = modelEndpoint(local.baseUrl);
    const here = localModelHost(endpoint, await self());
    const key = (await credentials?.resolve('DARASK_LOCAL_API_KEY'))?.value;
    const headers = key ? { Authorization: `Bearer ${key}` } : {};
    let bytes = null;
    try { bytes = (await stat(local.modelFile)).size; } catch {}
    let models = [];
    let reachable = false;
    try {
      const response = await fetchImpl(`${local.baseUrl}/models`, { headers, signal: AbortSignal.timeout(1500), redirect: 'error' });
      reachable = true;
      const text = await response.text();
      if (response.ok && text.length < 1024 * 1024) {
        const value = JSON.parse(text);
        models = (Array.isArray(value.data) ? value.data : []).filter(m => typeof m?.id === 'string').map(m => m.id).slice(0, 100);
      }
    } catch {}
    const ready = models.includes(config.providers.local.model || LOCAL_MODEL_ID);
    const usage = { status: 'unavailable', source: 'llama.cpp（ローカル）', updatedAt: new Date().toISOString(), windows: [], credits: null,
      message: 'この推論 API の契約残量は取得対象外です。返された処理トークン数があれば表示します。' };
    if (ready) {
      try {
        const response = await fetchImpl(new URL('/metrics', local.baseUrl), { headers, signal: AbortSignal.timeout(1500), redirect: 'error' });
        const text = await response.text();
        if (response.ok && text.length < 1024 * 1024) {
          const metric = name => {
            const value = new RegExp(`^llamacpp:${name}(?:\\{[^\\n]*\\})?\\s+([0-9.e+]+)`, 'm').exec(text)?.[1];
            const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : null;
          };
          usage.local = { promptTokens: metric('prompt_tokens_total'), generatedTokens: metric('tokens_predicted_total') };
        }
      } catch {}
    }
    const log = await progressFromLog();
    const runtimePhase = ready ? 'ready' : phase;
    const stage = ready ? 'ready' : log.stage === 'starting' && runtimePhase === 'error' ? 'error' : log.stage === 'error' ? 'error' : runtimePhase === 'stopped' && !child ? 'stopped' : log.stage;
    const percent = ready ? 100 : stage === 'stopped' ? null : log.percent;
    return { auth: ready ? 'authenticated' : 'unavailable', usage,
      localRuntime: {
        phase: runtimePhase, local: here, owned: Boolean(child), reachable, models, modelBytes: bytes, logFile, error: lastError,
        startedAt, test: lastTest,
        progress: {
          stage, percent, lastLine: log.lastLine,
          elapsedMs: startedAt ? Math.max(0, Date.now() - startedAt) : null,
        },
      } };
  }
  async function stop() {
    const config = store.get();
    const endpoint = modelEndpoint(validateLocal(config.local).baseUrl);
    const here = localModelHost(endpoint, await self());
    const own = child;
    const pid = (Number.isInteger(own?.pid) && own.pid > 0 ? own.pid : null) ?? await readPid();
    const image = basename(config.providers.local.executable || '');
    if (!own && !pid && !here) return;
    phase = 'stopping';
    if (pid) await killTree(pid);
    else if (here) await killImage(image);
    try { own?.kill(); } catch {}
    let timer;
    try {
      if (closed && own) await Promise.race([closed, new Promise(resolve => { timer = setTimeout(resolve, 30000); })]);
    } finally { clearTimeout(timer); }
    if (child === own) child = undefined;
    startedAt = null;
    phase = 'stopped';
    await clearPid();
  }
  async function start() {
    if (disposed) throw new Error('ローカルモデル機能は停止しています。');
    if (child) return;
    const before = await status();
    if (before.auth === 'authenticated') return;
    if (before.localRuntime.reachable) throw new Error('指定ポートは別のサーバーが使用しています。');
    const config = store.get();
    const executable = config.providers.local.executable;
    const local = validateLocal(config.local);
    if (!executable || !isAbsolute(executable) || !/^llama-server(?:\.exe)?$/i.test(basename(executable))) throw new Error('llama-server の絶対パスを指定してください。');
    if (!(await stat(executable)).isFile() || !(await stat(local.modelFile)).isFile()) throw new Error('モデルまたは実行ファイルが見つかりません。');
    await mkdir(directory, { recursive: true });
    const apiKey = (await credentials?.resolve('DARASK_LOCAL_API_KEY'))?.value;
    const env = { ...providerEnvironment('local'), ...(apiKey ? { LLAMA_API_KEY: apiKey } : {}) };
    const log = await open(logFile, 'w', 0o600);
    try {
      const proc = spawnImpl(executable, localServerArgs(config), { shell: false, windowsHide: true, env, cwd: directory, stdio: ['ignore', log.fd, log.fd] });
      child = proc; phase = 'starting'; lastError = null; startedAt = Date.now(); lastTest = null;
      if (Number.isInteger(proc.pid) && proc.pid > 0) await writeFile(pidFile, String(proc.pid), { mode: 0o600 });
      closed = new Promise(resolve => {
        proc.once('error', () => { lastError = 'ローカルモデルを起動できません。ログを確認してください。'; phase = 'error'; });
        proc.once('close', code => {
          if (child === proc) {
            child = undefined;
            startedAt = null;
            phase = phase === 'stopping' || code === 0 || code === null ? 'stopped' : 'error';
            if (phase === 'error') lastError = 'モデルの読み込みに失敗しました。ログを確認してください。';
          }
          resolve();
        });
      });
    } finally { await log.close(); }
  }
  async function test() {
    const before = await status();
    if (before.auth !== 'authenticated') throw new Error('モデルがまだ応答していません。起動が終わるまで待ってからテストしてください。');
    const config = store.get();
    const local = validateLocal(config.local);
    const model = config.providers.local.model || LOCAL_MODEL_ID;
    const key = (await credentials?.resolve('DARASK_LOCAL_API_KEY'))?.value;
    const started = Date.now();
    const response = await fetchImpl(`${local.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Reply with OK' }], max_tokens: 8, stream: false, temperature: 0 }),
      signal: AbortSignal.timeout(60000),
      redirect: 'error',
    });
    const text = await response.text();
    if (text.length > 65536) throw new Error('ローカルモデルの応答が大きすぎます。');
    if (!response.ok) throw new Error(`llama-server のテストに失敗しました（HTTP ${response.status}）。`);
    let value;
    try { value = JSON.parse(text); } catch { throw new Error('ローカルモデルの応答を JSON として読めませんでした。'); }
    const reply = value?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) throw new Error('ローカルモデルは応答しましたが、本文を読めませんでした。');
    lastTest = { ok: true, latencyMs: Date.now() - started, model, reply: reply.trim().slice(0, 200) };
  }
  return {
    status,
    async initialize() { if (store.get().local.autoStart && modelEndpoint(store.get().local.baseUrl).loopback) await start(); },
    action(action) {
      const next = queue.catch(() => {}).then(async () => {
        if (action === 'startLocal') await start();
        else if (action === 'stopLocal') await stop();
        else if (action === 'testLocal') await test();
        else throw new Error('Unknown local model action');
        return status();
      });
      queue = next; return next;
    },
    async dispose() { disposed = true; await queue.catch(() => {}); await stop(); },
  };
}
