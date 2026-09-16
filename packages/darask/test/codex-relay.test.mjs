import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import LlmRuntime, { LlmAdapter } from '@deepseek-ai/dsh-llm';
import { LocalAttachmentStore } from '@deepseek-ai/dsh-attachment-local';
import sharp from 'sharp';
import { createCodexRelay, exportCodexRequest, importCodexRequest, readCodexChunks } from '../src/codex-relay.mjs';
import { codexRoutes } from '../src/codex-accounts.mjs';
import { OPENAI_DEFAULT_MODEL, OPENAI_SIDEKICK_MODEL } from '../src/providers/openai.mjs';

const node = '11111111-1111-4111-8111-111111111111';
const origin = 'https://hub.example.com';
const endpoint = '/api/darask/codex';
const request = { provider: 'openai-codex', model: 'test-codex', messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply OK' }], source: { kind: 'user' } }] };
const finish = { type: 'finish', reason: { kind: 'stop' } };
const req = (path, body, extra = {}) => new Request(origin + endpoint + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
async function dir(t) { const d = await mkdtemp(join(tmpdir(), 'darask-relay-')); t.after(() => rm(d, { recursive: true, force: true })); return d; }
const collect = async stream => { const chunks = []; for await (const chunk of stream) chunks.push(chunk); return chunks; };
const host = { info: () => ({ id: 'worker' }), async remoteConnection(id) { assert.equal(id, node); return { node: { url: origin, name: '共有ハブ' }, host: { id: 'hub' }, cookie: 'private-native-cookie' }; } };

test('signed-out worker uses selected hub through native LLM and keeps tool stream, usage and selection after reload', async t => {
  const ctx = new Context(); const llm = new LlmRuntime(ctx);
  class Adapter extends LlmAdapter {
    async listModels() { return [{ id: 'test-codex', name: 'Test' }]; }
    async *stream(value) {
      assert.deepEqual(value.tools, [{ name: 'write', description: 'Write locally', parameters: { type: 'object' } }]);
      yield { type: 'tool-call-delta', index: 0, id: 'test-call', name: 'write', argumentsDelta: '{"path":"src/a.mjs"}' };
      yield { type: 'usage', usage: { inputTokens: 10, outputTokens: 3 } };
      yield finish;
    }
  }
  llm.registerAdapter(['openai-codex', 'openai'], new Adapter());
  const hubRelay = createCodexRelay({ directory: await dir(t), hub: { info: () => ({ id: 'hub' }) }, llm });
  const directory = await dir(t); let requests = 0;
  const fetch = async (url, init) => {
    assert.equal(init.headers.Cookie, 'private-native-cookie');
    assert.equal(init.headers.Origin, origin);
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Authorization, undefined);
    if (url.pathname.endsWith('/connection')) return Response.json({ node: null });
    requests++;
    assert.doesNotMatch(init.body, /private-native-cookie|refresh_token|access_token/);
    return hubRelay.routes[1].fetch(new Request(url, init));
  };
  const connections = [];
  const relay = createCodexRelay({ directory, hub: host, llm: {}, fetch, onConnection: async value => connections.push(value) });
  await relay.initialize();
  assert.equal((await relay.routes[0].fetch(req('/connection', { node }))).status, 200);
  assert.deepEqual(connections, [null, node]);
  const input = { ...request, tools: [{ name: 'write', description: 'Write locally', parameters: { type: 'object' } }] };
  const chunks = await collect(relay.stream(input, () => { throw new Error('OpenAI Codex request account is unavailable'); }));
  assert.equal(chunks[0].type, 'tool-call-delta'); assert.deepEqual(chunks.at(-1), finish);
  const apiChunks = await collect(relay.stream({ ...input, provider: 'openai', model: OPENAI_DEFAULT_MODEL }, () => { throw new Error('Worker OpenAI API key must not be used'); }));
  assert.deepEqual(apiChunks, chunks);
  assert.equal(requests, 2);
  const saved = JSON.parse(await readFile(join(directory, 'codex-hub.json'), 'utf8'));
  assert.deepEqual(saved, { version: 1, node });
  relay.dispose();
  const reloaded = createCodexRelay({ directory, hub: host, llm: {}, fetch }); await reloaded.initialize();
  assert.deepEqual(await collect(reloaded.stream(input, () => { throw new Error('Local account missing'); })), chunks);
  reloaded.dispose(); hubRelay.dispose();
});

test('origin fences precede account access, chains and unsupported providers are rejected', async t => {
  let calls = 0;
  const relay = createCodexRelay({ directory: await dir(t), hub: { ...host, remoteConnection: async () => { calls++; throw new Error('secret'); } }, llm: {} });
  const response = await relay.routes[0].fetch(req('/connection', { node }, { Origin: 'https://evil.example' }));
  assert.equal(response.status, 403); assert.equal(calls, 0);
  const response2 = await relay.routes[1].fetch(req('/relay', { version: 1, request, images: [] }));
  assert.equal(response2.status, 409);
  await assert.rejects(importCodexRequest({ version: 1, request: { ...request, provider: 'other' }, images: [] }));
  await assert.rejects(importCodexRequest({ version: 1, request: { ...request, model: 'gpt-reserve' }, images: [] }));
  assert.equal((await importCodexRequest({ version: 1, request: { ...request, provider: 'openai', model: OPENAI_SIDEKICK_MODEL }, images: [] })).provider, 'openai');
  await assert.rejects(importCodexRequest({ version: 1, request: { ...request, provider: 'openai', model: 'gpt-unlisted' }, images: [] }));
  const chained = createCodexRelay({ directory: await dir(t), hub: host, llm: {}, fetch: async () => Response.json({ node }) });
  assert.equal((await chained.routes[0].fetch(req('/connection', { node }))).status, 400);
  assert.equal((await chained.routes[0].fetch(new Request(origin + endpoint + '/connection'))).status, 200);
  relay.dispose(); chained.dispose();
});

test('native attachment stores preserve image identity and worker file handles', async t => {
  const worker = new LocalAttachmentStore(new Context(), { dshHome: await dir(t) });
  const hub = new LocalAttachmentStore(new Context(), { dshHome: await dir(t) });
  const data = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#247bc1' } }).png().toBuffer();
  const ref = await worker.saveImage({ data, mediaType: 'image/png' });
  const input = { ...request, messages: [{ ...request.messages[0], content: [{ type: 'image', attachment: ref }, { type: 'file', attachment: { attachmentId: 'sha256:' + 'a'.repeat(64), name: 'readme.txt', bytes: 10 } }] }] };
  const exported = JSON.parse(await exportCodexRequest(input, worker, () => 'D:\\project\\readme.txt'));
  const imported = await importCodexRequest(exported, hub);
  assert.equal(imported.messages[0].content[0].attachment.attachmentId, ref.attachmentId);
  assert.match(imported.messages[0].content[1].text, /D:\\\\project/);
  assert.deepEqual((await hub.readImage(imported.messages[0].content[0].attachment)).data, (await worker.readImage(ref)).data);
  exported.images[0].ref.attachmentId = 'sha256:' + 'b'.repeat(64);
  await assert.rejects(importCodexRequest(exported, hub));
});

test('shared account routes preserve account actions and never forward browser credentials', async t => {
  const relay = createCodexRelay({ directory: await dir(t), hub: host, llm: {}, fetch: async (url, init) => {
    assert.equal(init.headers.Cookie, 'private-native-cookie');
    if (url.pathname.endsWith('/connection')) return Response.json({ node: null });
    if (url.pathname.endsWith('/accounts')) { assert.deepEqual(JSON.parse(init.body), { accountKey: 'example' }); return Response.json({ ok: true }); }
    return Response.json({ status: 'signed-in', accounts: [] });
  } });
  await relay.routes[0].fetch(req('/connection', { node }));
  const routes = codexRoutes({ accounts: { status() { throw new Error('Do not mask hub auth with local auth'); } }, upstream: relay.auth });
  const response = await routes.find(r => r.path.endsWith('/status')).fetch(new Request(origin + endpoint + '/status', { headers: { Origin: origin } }));
  assert.equal((await response.json()).authenticationSource, '共有ハブ');
  assert.equal((await routes.find(r => r.path.endsWith('/accounts')).fetch(req('/accounts', { accountKey: 'example' }, { Cookie: 'browser-cookie' }))).status, 200);
  assert.equal((await relay.auth(req('/status', {}, { 'X-Darask-Codex-Hop': '1' }), 'status')).status, 409);
  relay.dispose();
});

test('stream parser preserves UTF-8, rejects truncation, and closes on cancellation', async () => {
  const text = JSON.stringify({ type: 'text-delta', index: 0, text: '日本語' }) + '\n' + JSON.stringify(finish) + '\n';
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream({ start(c) { for (const byte of bytes) c.enqueue(Uint8Array.of(byte)); c.close(); } });
  const response = new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } });
  assert.equal((await collect(readCodexChunks(response)))[0].text, '日本語');
  await assert.rejects(collect(readCodexChunks(new Response('{"type":"text-delta"}\n', { headers: { 'Content-Type': 'application/x-ndjson' } }))));
  let canceled = false;
  const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"type":"text-delta","text":"a"}\n')); }, cancel() { canceled = true; } });
  for await (const _ of readCodexChunks(new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } }))) break;
  assert.equal(canceled, true);
});
