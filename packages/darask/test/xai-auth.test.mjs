import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGrokOidcAccessToken, resolveXaiBearer, MISSING_XAI_AUTH } from '../src/addons/xai-auth.mjs';
import { generateXaiVideo } from '../src/addons/integrations.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SCOPE = 'https://auth.x.ai::b1a00492-073a-47ea-816f-4c329264a828';

test('Grok OIDC login is used when no xAI API key is set', async () => {
  const now = new Date('2026-09-14T00:00:00Z');
  const parsed = parseGrokOidcAccessToken(JSON.stringify({
    [SCOPE]: { auth_mode: 'oidc', key: 'grok-oidc-token', expires_at: '2026-09-15T00:00:00Z' },
  }), now);
  assert.equal(parsed.source, 'grok-subscription');
  assert.equal(parsed.token, 'grok-oidc-token');

  const auth = await resolveXaiBearer({
    credentials: { resolve: async () => null },
    now,
    readFileImpl: async () => JSON.stringify({
      [SCOPE]: { auth_mode: 'oidc', key: 'grok-oidc-token', expires_at: '2026-09-15T00:00:00Z' },
    }),
  });
  assert.equal(auth.source, 'grok-subscription');

  const keyed = await resolveXaiBearer({
    credentials: { resolve: async () => ({ value: 'prepaid-key' }) },
    now,
    readFileImpl: async () => { throw new Error('should not read grok file'); },
  });
  assert.equal(keyed.source, 'api-key');
  assert.equal(keyed.token, 'prepaid-key');
});

test('expired Grok login is rejected without leaking the token', () => {
  const now = new Date('2026-09-14T00:00:00Z');
  const parsed = parseGrokOidcAccessToken(JSON.stringify({
    [SCOPE]: { auth_mode: 'oidc', key: 'secret-token', expires_at: '2026-09-14T00:04:00Z' },
  }), now);
  assert.equal(parsed.token, undefined);
  assert.match(parsed.error, /期限/);
  assert.doesNotMatch(JSON.stringify(parsed), /secret-token/);
  assert.match(MISSING_XAI_AUTH, /SuperGrok/);
});

test('video generation can authorize with Grok subscription token', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'darask-video-auth-'));
  t.after(async () => { assert.equal(path.dirname(directory), path.resolve(tmpdir())); await rm(directory, { recursive: true, force: true }); });
  const now = new Date('2026-09-14T00:00:00Z');
  let bearer;
  const fetchImpl = async (url, options = {}) => {
    if (String(url).endsWith('/videos/generations')) {
      bearer = options.headers.Authorization;
      return { ok: true, status: 200, json: async () => ({ request_id: 'req-sub' }) };
    }
    if (String(url).includes('/videos/req-sub')) {
      return {
        ok: true, status: 200,
        json: async () => ({ status: 'done', video: { url: 'https://vidgen.x.ai/clip.mp4', duration: 5, respect_moderation: true } }),
      };
    }
    if (String(url) === 'https://vidgen.x.ai/clip.mp4') {
      return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    }
    throw new Error(String(url));
  };
  const result = await generateXaiVideo({
    credentials: { resolve: async () => null },
    prompt: 'a wave',
    directory,
    fetchImpl,
    sleep: async () => {},
    now,
    readFileImpl: async () => JSON.stringify({
      [SCOPE]: { auth_mode: 'oidc', key: 'grok-oidc-token', expires_at: '2026-09-15T00:00:00Z' },
    }),
  });
  assert.equal(bearer, 'Bearer grok-oidc-token');
  assert.match(result, /動画 URL:/);
});
