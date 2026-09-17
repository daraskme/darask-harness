/**
 * Hub → remote sharing of provider credentials.
 *
 * The hub owns the keys a user already registered (Account screens), and a
 * remote PC's DSH owns its own credential store. A remote workspace runs on
 * that other PC. This module copies only the selected provider keys when the
 * user explicitly starts a push. Model relaying is separate and keeps its
 * provider credentials on the selected authentication host.
 *
 * Only entries in CATALOG can ever cross the link, values leave the hub only
 * in a push the user started, and no code path returns a secret value to the
 * browser. Workspace launch tokens and stored PC session cookies are
 * deliberately absent: they belong to the connection, not to a provider.
 */

/** Credential references a remote DSH may hold on the hub's behalf. */
export const CATALOG = Object.freeze([
  { ref: 'DEEPSEEK_API_KEY', label: 'DeepSeek API', group: 'モデル', hint: 'DeepSeek のモデル（DeepSeek API キー）' },
  { ref: 'AI_GATEWAY_API_KEY', label: 'Vercel AI Gateway', group: 'モデル', hint: 'Jev 評価専用の Vercel AI Gateway API キー' },
  { ref: 'DARASK_OPENAI_API_KEY', label: 'OpenAI API', group: 'モデル', hint: 'OpenAI の API キー' },
  { ref: 'DARASK_OPENAI_ADMIN_KEY', label: 'OpenAI 管理キー', group: 'モデル', hint: 'OpenAI の利用量取得に使う管理キー' },
  { ref: 'DARASK_OPENROUTER_API_KEY', label: 'OpenRouter', group: 'モデル', hint: 'OpenRouter の API キー' },
  { ref: 'DARASK_OPENROUTER_MANAGEMENT_KEY', label: 'OpenRouter 管理キー', group: 'モデル', hint: 'OpenRouter の利用量取得に使う管理キー' },
  { ref: 'DARASK_XAI_API_KEY', label: 'xAI / Grok', group: 'その他', hint: '画像生成などで使う xAI のキー' },
  { ref: 'DARASK_R2_ACCESS_KEY_ID', label: 'R2 アクセスキー ID', group: 'その他', hint: '共有メディア保存のアクセスキー ID' },
  { ref: 'DARASK_R2_SECRET_ACCESS_KEY', label: 'R2 シークレット', group: 'その他', hint: '共有メディア保存のシークレット' },
  { ref: 'DARASK_CLOUDFLARE_BROWSER_RUN', label: 'Cloudflare Browser Run', group: 'その他', hint: 'Browser Run の接続情報（アカウント ID とトークン）' },
]);

export const CATALOG_REFS = Object.freeze(CATALOG.map(row => row.ref));
const REF_SET = new Set(CATALOG_REFS);


/** Where a pushed credential came from and when, kept next to the value. */
export const SHARED_AT_REF = 'DARASK_SHARED_CREDENTIALS_AT';

export const MAX_SECRET_LENGTH = 8192;

/** A reference in the catalog and a value the provider stores as text. */
export function credentialValue(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_SECRET_LENGTH && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value);
}

/** Whether a caller may address this reference at all. */
export function isShareableRef(ref) {
  return typeof ref === 'string' && REF_SET.has(ref);
}

/** Catalog rows as the UI receives them: labels only, never values. */
export function catalogRows() {
  return CATALOG.map(row => ({ ...row }));
}

/** Reject anything outside the catalog rather than silently dropping it. */
export function selectSecretRefs(value, allowed = CATALOG_REFS) {
  if (value === undefined) return [...allowed];
  if (!Array.isArray(value) || value.length > allowed.length) throw new Error('共有するキーの選択が正しくありません。');
  const refs = [...new Set(value)];
  if (refs.some(ref => !allowed.includes(ref))) throw new Error('共有するキーの選択が正しくありません。');
  return refs;
}

/**
 * Which catalog references this host can resolve right now, and which came
 * from another PC. Values are read once and reported as presence only.
 */
export async function shareStatus(credentials, { refs = CATALOG_REFS, sharedAt = {} } = {}) {
  const rows = [];
  for (const row of catalogRows()) {
    if (!refs.includes(row.ref)) continue;
    const resolved = await credentials?.resolve?.(row.ref).catch(() => undefined);
    const source = resolved?.source;
    rows.push({ ...row, configured: credentialValue(resolved?.value), source: typeof source === 'string' ? source : null,
      ...(source === 'file' && sharedAt[row.ref] ? { sharedAt: sharedAt[row.ref] } : {}) });
  }
  return rows;
}

/** Read the timestamp map a remote wrote when it accepted a push. */
export async function readSharedAt(credentials) {
  const raw = (await credentials?.resolve?.(SHARED_AT_REF).catch(() => undefined))?.value;
  if (typeof raw !== 'string' || raw.length > 4096) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([ref, at]) => isShareableRef(ref) && typeof at === 'string' && at.length <= 40));
  } catch { return {}; }
}

/**
 * Apply a hub push on the receiving PC. An entry with a value is stored; an
 * entry without one is removed, so the hub can also take a key back. Anything
 * outside the catalog fails the whole request before the first write.
 */
export async function applySecretPush(credentials, secrets, { now = () => new Date().toISOString() } = {}) {
  if (!secrets || typeof secrets !== 'object' || Array.isArray(secrets)) throw new Error('共有するキーの内容が正しくありません。');
  const entries = Object.entries(secrets);
  if (entries.length > CATALOG_REFS.length) throw new Error('共有するキーが多すぎます。');
  for (const [ref, value] of entries) {
    if (!isShareableRef(ref)) throw new Error('共有できないキーが含まれています。');
    if (value !== null && !credentialValue(value)) throw new Error('共有するキーの値が正しくありません。');
  }
  const at = now(), saved = {}, removed = [];
  for (const [ref, value] of entries) {
    if (value === null) { await credentials.unset(ref); removed.push(ref); }
    else { await credentials.set(ref, value); saved[ref] = at; }
  }
  const timestamps = await readSharedAt(credentials);
  for (const ref of removed) delete timestamps[ref];
  const next = { ...timestamps, ...saved };
  if (Object.keys(next).length) await credentials.set(SHARED_AT_REF, JSON.stringify(next));
  else await credentials.unset(SHARED_AT_REF);
  return { saved: Object.keys(saved), removed, sharedAt: next };
}

/**
 * Hub side: resolve the selected references and build the push payload. A
 * reference with nothing configured is omitted rather than failing the batch;
 * the caller reports which ones the remote could not receive.
 */
export async function pushPayload(credentials, selection, { refs = CATALOG_REFS } = {}) {
  const requested = selectSecretRefs(selection, refs);
  const secrets = {}, missing = [];
  for (const ref of requested) {
    const value = (await credentials?.resolve?.(ref).catch(() => undefined))?.value;
    if (credentialValue(value)) secrets[ref] = value;
    else missing.push(ref);
  }
  return { secrets, missing, requested };
}
