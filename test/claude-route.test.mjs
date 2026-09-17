import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { candidates, MODEL_ROUTES, validateConfig } from '../src/config.mjs';
import { CLAUDE_LLM_PROVIDER, enableClaudeRoute, parseClaudeCodeOAuth } from '../src/claude-route.mjs';

test('Claude subscription credentials become an Anthropic conversation route without copying secrets into settings', async () => {
  assert.equal(MODEL_ROUTES.claude, 'anthropic');
  const access = 'sk-ant-oat-fixture-access-token';
  const refresh = 'sk-ant-oat-fixture-refresh-token';
  const parsed = parseClaudeCodeOAuth(JSON.stringify({
    claudeAiOauth: { accessToken: access, refreshToken: refresh, expiresAt: 2_000_000_000_000, scopes: ['user:inference'] },
  }));
  assert.equal(parsed.expires, 2_000_000_000_000);
  assert.ok(parsed.access.startsWith('sk-ant-oat'));
  assert.equal(parseClaudeCodeOAuth('{"claudeAiOauth":{}}'), null);
  const records = [];
  const settings = {
    providers: { 'darask-local': { displayName: 'ローカルモデル' } },
    get(ns) { return ns === 'llm-pi-ai' ? { providers: this.providers } : undefined; },
    async update(ns, patch) {
      assert.equal(ns, 'llm-pi-ai');
      this.providers = { ...this.providers, ...patch.providers };
    },
  };
  const credentials = {
    async modifyRecord(key, mutate) {
      const next = await mutate(undefined);
      records.push({ key, kind: next.kind, type: next.payload.type });
      return next;
    },
  };
  const files = { [join('/tmp/claude-home', '.claude', '.credentials.json')]: JSON.stringify({
    claudeAiOauth: { accessToken: access, refreshToken: refresh, expiresAt: 1_800_000_000, scopes: ['user:inference'] },
  }) };
  assert.equal(await enableClaudeRoute({
    settings, credentials, home: '/tmp/claude-home',
    readFileImpl: async path => { if (!files[path]) { const error = new Error('missing'); error.code = 'ENOENT'; throw error; } return files[path]; },
  }), true);
  assert.equal(settings.providers.anthropic.displayName, 'Claude');
  assert.equal(settings.providers['darask-local'].displayName, 'ローカルモデル');
  assert.equal(Object.hasOwn(settings.providers.anthropic, 'apiKeyEnv'), false);
  assert.equal(records[0].kind, 'grant');
  assert.equal(records[0].type, 'oauth');
  assert.ok(String(records[0].key).includes(CLAUDE_LLM_PROVIDER));
  const config = validateConfig({ providers: { gateway: { enabled: false }, grok: { enabled: false }, claude: { model: 'claude-sonnet-4-5' }, openai: { enabled: false } } });
  assert.deepEqual(candidates(config, { claude: { auth: 'authenticated' } }), ['claude']);
  assert.equal(await enableClaudeRoute({
    settings, credentials, home: '/tmp/missing-home',
    readFileImpl: async () => { const error = new Error('missing'); error.code = 'ENOENT'; throw error; },
  }), false);
});
