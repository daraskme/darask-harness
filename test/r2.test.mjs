import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { r2Endpoint, signAwsV4, r2Action, uploadGeneratedMedia, R2_PREFIX } from '../src/addons/r2.mjs';
import { generateXaiImage } from '../src/addons/integrations.mjs';

const ACCOUNT = 'a'.repeat(32);
const BUCKET = 'darask-media';

function creds() {
  const values = {
    DARASK_R2_ACCESS_KEY_ID: 'AKIAEXAMPLE',
    DARASK_R2_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    DARASK_XAI_API_KEY: 'xai-test',
  };
  return { resolve: async name => values[name] ? { value: values[name] } : undefined };
}

function store() {
  return { get: () => ({ r2AccountId: ACCOUNT, r2Bucket: BUCKET, r2PublicBase: 'https://media.example.com' }) };
}

test('R2 endpoint and SigV4 headers stay on the account host', () => {
  assert.equal(r2Endpoint(ACCOUNT), `https://${ACCOUNT}.r2.cloudflarestorage.com`);
  const headers = signAwsV4({
    method: 'PUT',
    url: `https://${ACCOUNT}.r2.cloudflarestorage.com/${BUCKET}/${R2_PREFIX}clip.mp4`,
    body: Buffer.from('abc'),
    accessKey: 'AKID',
    secretKey: 'secret',
    now: new Date('2026-01-02T03:04:05Z'),
  });
  assert.equal(headers.host, `${ACCOUNT}.r2.cloudflarestorage.com`);
  assert.match(headers.Authorization, /^AWS4-HMAC-SHA256 Credential=AKID\/20260102\/auto\/s3\/aws4_request/);
  assert.equal(headers['x-amz-date'], '20260102T030405Z');
});

test('r2Action put/list/get stay under darask/media/', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'darask-r2-'));
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });
  const local = path.join(directory, 'still.png');
  await writeFile(local, Buffer.from('png'));
  const objects = new Map();
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    assert.equal(parsed.host, `${ACCOUNT}.r2.cloudflarestorage.com`);
    assert.match(options.headers.Authorization, /AWS4-HMAC-SHA256/);
    if (options.method === 'PUT') {
      const key = decodeURIComponent(parsed.pathname.replace(`/${BUCKET}/`, ''));
      assert.ok(key.startsWith(R2_PREFIX));
      objects.set(key, Buffer.from(options.body));
      return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array().buffer, headers: new Headers() };
    }
    if (parsed.searchParams.get('list-type') === '2') {
      const xml = `<ListBucketResult>${[...objects.keys()].map(key => `<Key>${key}</Key>`).join('')}</ListBucketResult>`;
      return { ok: true, status: 200, arrayBuffer: async () => Uint8Array.from(Buffer.from(xml)).buffer, headers: new Headers() };
    }
    const key = decodeURIComponent(parsed.pathname.replace(`/${BUCKET}/`, ''));
    const body = objects.get(key);
    assert.ok(body);
    return { ok: true, status: 200, arrayBuffer: async () => Uint8Array.from(body).buffer, headers: new Headers({ 'content-type': 'image/png' }) };
  };
  const common = { credentials: creds(), store: store(), directory, fetchImpl };
  const put = await r2Action({ ...common, action: 'put', path: local });
  assert.match(put, /https:\/\/media\.example\.com\/darask\/media\//);
  const listed = await r2Action({ ...common, action: 'list' });
  assert.match(listed, /darask\/media\//);
  const key = listed.split(' → ')[0];
  const got = await r2Action({ ...common, action: 'get', key });
  assert.match(got, /Downloaded /);
  const saved = await readFile(got.replace(/^Downloaded .* to /, ''));
  assert.equal(saved.toString(), 'png');
});

test('image generation uploads to R2 when configured', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'darask-r2-img-'));
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });
  const fetchImpl = async (url, options = {}) => {
    if (String(url).includes('/images/generations')) {
      return { ok: true, status: 200, json: async () => ({ data: [{ b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM1sAAAAASUVORK5CYII=' }] }) };
    }
    assert.equal(options.method, 'PUT');
    return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers() };
  };
  const result = await generateXaiImage({
    credentials: creds(), store: store(), directory, prompt: 'cat', fetchImpl,
  });
  assert.match(result, /画像を保存しました: /);
  assert.match(result, /R2: https:\/\/media\.example\.com\/darask\/media\//);
});

test('uploadGeneratedMedia is a no-op without credentials', async () => {
  const extra = await uploadGeneratedMedia({
    credentials: { resolve: async () => undefined },
    store: { get: () => ({ r2AccountId: '', r2Bucket: '', r2PublicBase: '' }) },
    file: 'x.png',
  });
  assert.equal(extra, '');
});
