import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

async function credential(credentials, name) {
  const resolved = await credentials?.resolve?.(name);
  return typeof resolved?.value === 'string' ? resolved.value : '';
}

const GROK_OIDC_SCOPE = 'https://auth.x.ai::b1a00492-073a-47ea-816f-4c329264a828';
const EXPIRY_SKEW_MS = 5 * 60 * 1000;

export const MISSING_XAI_AUTH = '「設定 → アカウント」で Grok / SuperGrok にログインしてください。API キーを使う場合は「設定 → プラグイン」に DARASK_XAI_API_KEY を設定してください。';

export function defaultGrokAuthPath() {
  return join(homedir(), '.grok', 'auth.json');
}

export function parseGrokOidcAccessToken(raw, now = new Date()) {
  let parsed;
  try { parsed = JSON.parse(String(raw)); }
  catch { return { error: 'Grok のログイン情報を読み取れません。「設定 → アカウント」で再ログインしてください。' }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { error: MISSING_XAI_AUTH };
  const record = parsed[GROK_OIDC_SCOPE];
  if (!record || typeof record !== 'object' || record.auth_mode !== 'oidc' || typeof record.key !== 'string' || !record.key) {
    return { error: MISSING_XAI_AUTH };
  }
  const expiresAt = Date.parse(record.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt - now.getTime() <= EXPIRY_SKEW_MS) {
    return { error: 'Grok のログイン期限が切れています。「設定 → アカウント」で再ログインしてください。' };
  }
  return { token: record.key, source: 'grok-subscription' };
}

export async function readGrokOidcAccessToken({ grokAuthPath = defaultGrokAuthPath(), now = new Date(), readFileImpl = readFile } = {}) {
  try {
    const raw = await readFileImpl(grokAuthPath, 'utf8');
    return parseGrokOidcAccessToken(raw, now);
  } catch {
    return { error: MISSING_XAI_AUTH };
  }
}

export async function resolveXaiBearer({ credentials, grokAuthPath, now, readFileImpl } = {}) {
  const key = await credential(credentials, 'DARASK_XAI_API_KEY');
  if (key) return { token: key, source: 'api-key' };
  return readGrokOidcAccessToken({ grokAuthPath, now, readFileImpl });
}
