import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { publicOrigin } from './http.mjs';
import { projectFilesToText } from '@deepseek-ai/dsh-llm';
import { OPENAI_DEFAULT_MODEL, OPENAI_SIDEKICK_MODEL } from './providers/openai.mjs';

const BASE = '/api/darask/codex';
const LIMIT = 32 * 1024 * 1024;
const uuid = value => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const json = (value, status = 200) => Response.json(value, { status, headers });
const failure = message => ({ type: 'finish', reason: { kind: 'error', failure: { code: 'CODEX_HUB', message } } });
const message = '共有モデルの認証元に接続できません。アカウントの認証元 PC と対象サービスのログイン状態を確認してください。';

function checkOrigin(request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.method !== 'GET' && !request.headers.get('origin'))) throw new Error();
  publicOrigin(request);
}

async function boundedJson(request) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new Error('JSON required');
  const text = await request.text();
  if (Buffer.byteLength(text) > LIMIT) throw new Error('Request too large');
  return JSON.parse(text);
}

async function mapContent(content, image) {
  return Promise.all(content.map(async block => block.type === 'image' ? { ...block, attachment: await image(block.attachment) }
    : block.type === 'tool-result' ? { ...block, content: await mapContent(block.content, image) } : block));
}

// Only immutable image bytes cross hosts. No filesystem paths are opened on the
// hub from remote input; tools and file handles continue to belong to the worker.
export async function exportCodexRequest(options, attachments, resolveFilePath = () => undefined) {
  const images = new Map();
  const capture = async ref => {
    if (!images.has(ref.attachmentId)) {
      if (!attachments) throw new Error('Attachments unavailable');
      const saved = await attachments.readImage(ref, options.signal);
      images.set(ref.attachmentId, { ref: saved.ref, data: Buffer.from(saved.data).toString('base64') });
    }
    return ref;
  };
  const messages = await Promise.all(projectFilesToText(options.messages, resolveFilePath).map(async entry => ({ ...entry, content: await mapContent(entry.content, capture) })));
  const { signal, ...request } = options;
  const body = JSON.stringify({ version: 1, request: { ...request, messages }, images: [...images.values()] });
  if (Buffer.byteLength(body) > LIMIT) throw new Error('Request too large');
  return body;
}

export async function importCodexRequest(input, attachments, signal, acceptsProvider = () => false) {
  const value = input?.request;
  const supported = value?.provider === 'openai-codex'
    ? value.model !== 'gpt-reserve'
    : (value?.provider === 'openai' && [OPENAI_DEFAULT_MODEL, OPENAI_SIDEKICK_MODEL].includes(value.model)) || acceptsProvider(value?.provider);
  if (input?.version !== 1 || !supported || typeof value.model !== 'string'
    || !Array.isArray(value.messages) || !Array.isArray(input.images) || input.images.length > 128) throw new Error('Invalid relay request');
  const images = new Map();
  for (const item of input.images) {
    signal?.throwIfAborted();
    if (!attachments || !item?.ref || typeof item.data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(item.data)) throw new Error('Invalid image');
    const data = Buffer.from(item.data, 'base64');
    if (data.toString('base64') !== item.data || data.length !== item.ref.bytes) throw new Error('Invalid image');
    const ref = await attachments.saveImage({ data, mediaType: item.ref.mediaType, name: item.ref.name });
    if (ref.attachmentId !== item.ref.attachmentId) throw new Error('Image identity changed');
    images.set(ref.attachmentId, ref);
  }
  const messages = await Promise.all(value.messages.map(async entry => ({ ...entry, content: await mapContent(entry.content, async ref => {
    const saved = images.get(ref.attachmentId);
    if (!saved) throw new Error('Missing image');
    return { ...saved, ...(ref.name ? { name: ref.name } : {}) };
  }) })));
  const request = { provider: value.provider, model: value.model, messages, signal };
  for (const key of ['reasoningEffort', 'system', 'tools', 'temperature', 'maxTokens', 'stop', 'sessionId', 'purpose']) {
    if (value[key] !== undefined) request[key] = value[key];
  }
  return request;
}

export async function* readCodexChunks(response, signal) {
  if (!response.ok || !response.body || !response.headers.get('content-type')?.startsWith('application/x-ndjson')) throw new Error(message);
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let pending = '', finished = false;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      if (pending.length > LIMIT) throw new Error(message);
      let newline;
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
        if (!line) continue;
        const chunk = JSON.parse(line);
        if (finished || !['block-start', 'text-delta', 'reasoning-delta', 'tool-call-delta', 'block-end', 'usage', 'finish'].includes(chunk.type)) throw new Error(message);
        finished = chunk.type === 'finish';
        yield chunk;
      }
    }
    if (!finished || pending.trim()) throw new Error(message);
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

/** Uses the existing native DSH session carrier; OAuth credentials stay on the
 * selected host. Neither an arbitrary URL nor a browser-supplied cookie is used. */
export function createCodexRelay({ directory, hub, llm, attachments = () => undefined, resolveFilePath, fetch: fetchImpl = globalThis.fetch, onConnection = async () => {} }) {
  const file = join(directory, 'codex-hub.json');
  let selected = null, writes = Promise.resolve();
  const lifetime = new AbortController();
  const connections = new Set();
  async function remote() {
    if (!selected) return;
    const connection = await hub.remoteConnection(selected);
    if (connection.host.id === hub.info().id) throw new Error('Self relay');
    return connection;
  }
  async function send(connection, endpoint, { method = 'GET', body, signal } = {}) {
    return fetchImpl(new URL(`${BASE}/${endpoint}`, connection.node.url), { method, body,
      headers: { ...headers, Cookie: connection.cookie, Origin: connection.node.url, 'Content-Type': 'application/json', 'X-Darask-Codex-Hop': '1' },
      redirect: 'error', signal });
  }
  async function setNode(node) {
    if (node !== null && !uuid(node)) throw new Error('Invalid node');
    if (node) {
      const connection = await hub.remoteConnection(node);
      if (connection.host.id === hub.info().id) throw new Error('Self relay');
      const response = await send(connection, 'connection', { signal: AbortSignal.timeout(15000) });
      const status = await response.json();
      if (!response.ok || status.node !== null) throw new Error('Relay chains are not supported');
    }
    const task = writes.catch(() => {}).then(async () => {
      const tmp = `${file}.${randomUUID()}.tmp`;
      await writeFile(tmp, JSON.stringify({ version: 1, node }), { mode: 0o600 }); await rename(tmp, file);
      selected = node;
      await onConnection(node);
    });
    writes = task; await task;
  }
  const routes = [{ path: `${BASE}/connection`, methods: ['GET', 'POST'], requestBody: 'buffered', async fetch(request) {
    try { checkOrigin(request); } catch { return json({ error: 'DSH と同じ接続元から操作してください。' }, 403); }
    try {
      if (request.method === 'POST') await setNode((await boundedJson(request)).node);
      return json({ node: selected, mode: selected ? 'hub' : 'local' });
    } catch { return json({ error: '認証元に接続できません。接続済みの PC を選択してください。多段中継は使用できません。' }, 400); }
  } }, { path: `${BASE}/relay`, methods: ['POST'], requestBody: 'buffered', async fetch(request) {
    try { checkOrigin(request); } catch { return json({ error: 'この接続元からは操作できません。' }, 403); }
    if (selected || request.headers.get('X-Darask-Codex-Hop') !== '1') return json({ error: '認証元の設定を確認してください。' }, 409);
    const controller = new AbortController(); connections.add(controller);
    const signal = AbortSignal.any([request.signal, controller.signal, lifetime.signal]);
    let iterator;
    try { iterator = llm.stream(await importCodexRequest(await boundedJson(request), attachments(), signal,
      provider => typeof provider === 'string' && !provider.startsWith('darask-shared-') && llm.listProviders?.().some(item => item.id === provider)))[Symbol.asyncIterator](); }
    catch { connections.delete(controller); return json({ error: 'Codex の中継リクエストを読み込めません。' }, 400); }
    const encoder = new TextEncoder();
    return new Response(new ReadableStream({
      async pull(stream) {
        try {
          const next = await iterator.next();
          if (next.done) { connections.delete(controller); stream.close(); }
          else stream.enqueue(encoder.encode(JSON.stringify(next.value) + '\n'));
        } catch {
          connections.delete(controller);
          stream.enqueue(encoder.encode(JSON.stringify(failure(message)) + '\n')); stream.close();
        }
      },
      async cancel() { controller.abort(); connections.delete(controller); await iterator.return?.(); },
    }), { headers: { ...headers, 'Content-Type': 'application/x-ndjson' } });
  } }, { path: `${BASE}/models`, methods: ['GET'], requestBody: 'buffered', async fetch(request) {
    try { checkOrigin(request); } catch { return json({ error: 'この接続元からは操作できません。' }, 403); }
    if (selected) return json({ error: 'モデルの多段中継は使用できません。' }, 409);
    try {
      const query = new URL(request.url).searchParams;
      const providers = llm.listProviders().filter(item => !item.id.startsWith('darask-shared-'));
      if (query.has('provider')) {
        const provider = query.get('provider'), model = query.get('model');
        if (!providers.some(item => item.id === provider) || !model || model.length > 512) return json({ error: 'モデルの指定を確認してください。' }, 400);
        return json(await llm.resolveModelInfo(provider, model, request.signal));
      }
      const groups = await Promise.all(providers.map(async provider => {
        try { return { id: provider.id, name: provider.name, models: await llm.listModels(provider.id) }; }
        catch { return { id: provider.id, name: provider.name, models: [], error: 'モデル一覧を取得できません。' }; }
      }));
      return json({ groups });
    } catch { return json({ error: '認証元のモデル情報を読み込めません。' }, 502); }
  } }];
  return {
    routes,
    async sharedModels(provider, model, signal) {
      const connection = await remote();
      if (!connection) return null;
      const suffix = provider ? '?' + new URLSearchParams({ provider, model }) : '';
      const response = await send(connection, `models${suffix}`, { signal: AbortSignal.any([signal ?? lifetime.signal, lifetime.signal, AbortSignal.timeout(15000)]) });
      if (!response.ok) throw new Error('認証元のモデル情報を取得できません。両方の PC の DARASK を更新してください。');
      return response.json();
    },
    selectedNode: () => selected,
    async *sharedStream(options, node) {
      if (!node || selected !== node) throw new Error('モデルの認証元が変更されました。モデルを選び直してください。');
      const signal = AbortSignal.any([options.signal ?? lifetime.signal, lifetime.signal]);
      const connection = await hub.remoteConnection(node);
      const body = await exportCodexRequest(options, attachments(), resolveFilePath);
      const response = await send(connection, 'relay', { method: 'POST', body, signal });
      yield* readCodexChunks(response, signal);
    },
    async initialize() { try { const value = JSON.parse(await readFile(file, 'utf8')); if (value.version !== 1 || (value.node !== null && !uuid(value.node))) throw new Error('Invalid Codex hub config'); selected = value.node; } catch (e) { if (e.code !== 'ENOENT') throw e; } await onConnection(selected); },
    async auth(request, endpoint, body) {
      if (request.headers.get('X-Darask-Codex-Hop') && selected) return json({ error: 'Codex の多段中継は使用できません。' }, 409);
      const connection = await remote();
      if (!connection) return;
      const response = await send(connection, endpoint, { method: request.method, body, signal: AbortSignal.any([request.signal, lifetime.signal, AbortSignal.timeout(45000)]) });
      const value = await response.json();
      if (endpoint === 'status') value.authenticationSource = connection.node.name || connection.host.name;
      return json(value, response.status);
    },
    async *stream(options, next) {
      if (!['openai-codex', 'openai'].includes(options.provider) || !selected) { yield* next(); return; }
      if (options.provider === 'openai-codex' && options.model === 'gpt-reserve') { yield failure('共有 Codex では通常のモデルを選択してください。'); return; }
      if (options.provider === 'openai' && ![OPENAI_DEFAULT_MODEL, OPENAI_SIDEKICK_MODEL].includes(options.model)) { yield failure('共有 OpenAI API では Sol または Luna を選択してください。'); return; }
      const signal = AbortSignal.any([options.signal ?? new AbortController().signal, lifetime.signal]);
      try {
        const connection = await remote();
        const body = await exportCodexRequest(options, attachments(), resolveFilePath);
        const response = await send(connection, 'relay', { method: 'POST', body, signal });
        yield* readCodexChunks(response, signal);
      } catch {
        if (signal.aborted) yield { type: 'finish', reason: { kind: 'aborted' } };
        else yield failure(message);
      }
    },
    dispose() { lifetime.abort(); for (const controller of connections) controller.abort(); connections.clear(); },
  };
}
