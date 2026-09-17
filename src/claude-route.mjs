import { homedir } from 'node:os';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { credentialKey } from '@deepseek-ai/dsh-credentials';

export const CLAUDE_LLM_PROVIDER = 'anthropic';
export const CLAUDE_MODELS = Object.freeze([
  Object.freeze({ id: 'claude-fable-5-1', name: 'Claude Fable 5.1' }),
  Object.freeze({ id: 'claude-opus-5', name: 'Claude Opus 5' }),
  Object.freeze({ id: 'claude-sonnet-5', name: 'Claude Sonnet 5' }),
]);
export const CLAUDE_ROUTE = Object.freeze({ displayName: 'Claude', models: CLAUDE_MODELS });

export function claudeConfigDir(env = process.env, home = homedir()) {
  const custom = typeof env.CLAUDE_CONFIG_DIR === 'string' ? env.CLAUDE_CONFIG_DIR.trim() : '';
  if (custom && (path.isAbsolute(custom) || path.win32.isAbsolute(custom))) return custom;
  return path.join(home, '.claude');
}

export function parseClaudeCodeOAuth(text) {
  let value;
  try { value = JSON.parse(text); } catch { return null; }
  const oauth = value?.claudeAiOauth;
  if (!oauth || typeof oauth !== 'object' || Array.isArray(oauth)) return null;
  const access = oauth.accessToken;
  const refresh = oauth.refreshToken;
  if (typeof access !== 'string' || !access.startsWith('sk-ant-o') || access.length > 8192) return null;
  if (typeof refresh !== 'string' || !refresh.startsWith('sk-ant-o') || refresh.length > 8192) return null;
  let expires = Number(oauth.expiresAt);
  if (!Number.isFinite(expires) || expires <= 0) return null;
  if (expires < 1e12) expires *= 1000;
  return { access, refresh, expires };
}

export async function readClaudeCodeOAuth({ env = process.env, home = homedir(), readFileImpl = readFile } = {}) {
  try {
    const text = await readFileImpl(path.join(claudeConfigDir(env, home), '.credentials.json'), 'utf8');
    if (typeof text !== 'string' || text.length > 65536) return null;
    return parseClaudeCodeOAuth(text);
  } catch (error) {
    if (error && error.code !== 'ENOENT') throw error;
    return null;
  }
}

export async function enableClaudeRoute({ settings, credentials, env, home, readFileImpl, visibleModels } = {}) {
  const oauth = await readClaudeCodeOAuth({ env, home, readFileImpl });
  if (!oauth) return false;
  if (typeof credentials?.modifyRecord === 'function') {
    await credentials.modifyRecord(credentialKey('llm-pi-ai', CLAUDE_LLM_PROVIDER), async () => ({
      kind: 'grant',
      payload: { type: 'oauth', access: oauth.access, refresh: oauth.refresh, expires: oauth.expires },
    }));
  }
  if (settings && typeof settings.get === 'function' && typeof settings.update === 'function') {
    if (settings.get('llm-pi-ai') === undefined) throw new Error('DSH llm-pi-ai settings are unavailable.');
    const existing = settings.get('llm-pi-ai')?.providers?.[CLAUDE_LLM_PROVIDER];
    const visible = visibleModels === undefined ? CLAUDE_MODELS : CLAUDE_MODELS.filter(model => new Set(visibleModels).has(model.id));
    if (!existing || typeof existing !== 'object' || JSON.stringify(existing.models) !== JSON.stringify(visible) || existing.displayName !== CLAUDE_ROUTE.displayName) {
      await settings.update('llm-pi-ai', { providers: { [CLAUDE_LLM_PROVIDER]: { ...CLAUDE_ROUTE, models: visible } } });
    }
  }
  return true;
}
