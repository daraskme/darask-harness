const KEY = 'DARASK_OPENAI_API_KEY';
const ADMIN = 'DARASK_OPENAI_ADMIN_KEY';
const API = 'https://api.openai.com/v1';
export const OPENAI_DEFAULT_MODEL = 'gpt-5.6-sol';
export const OPENAI_SIDEKICK_MODEL = 'gpt-5.6-luna';
export const DATA_CONTROLS_URL = 'https://platform.openai.com/settings/organization/data-controls/sharing';

class OpenAiRequestError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

const SMALL = Object.freeze([
  'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5-mini', 'gpt-5-nano',
  'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o-mini', 'o4-mini', 'o1-mini', 'codex-mini-latest',
]);
const LARGE = Object.freeze([
  'gpt-5.6-sol', 'gpt-5.5', 'gpt-5.4', 'gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-5-codex', 'gpt-5.1-codex',
  'gpt-5-chat-latest', 'gpt-4.1', 'gpt-4o', 'o3', 'o1', 'o1-preview',
]);

export function defaultOpenAi() {
  return { usageTier: 'unknown', preferComplimentary: true };
}

export function validateOpenAi(value, base = defaultOpenAi()) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !(k in defaultOpenAi()))) throw new Error('Invalid OpenAI settings');
  const out = { ...base, ...value };
  if (!['unknown', 't12', 't35'].includes(out.usageTier)) throw new Error('Invalid OpenAI usage tier');
  if (typeof out.preferComplimentary !== 'boolean') throw new Error('Invalid OpenAI complimentary preference');
  return out;
}

function matchesBase(id, base) {
  if (id === base) return true;
  const rest = id.startsWith(`${base}-`) ? id.slice(base.length + 1) : '';
  return /^\d{4}(?:-\d{2}){2}/.test(rest);
}

export function complimentaryGroup(model) {
  const id = String(model ?? '').trim().toLowerCase();
  if (!id) return null;
  if (SMALL.some(base => matchesBase(id, base))) return 'small';
  if (LARGE.some(base => matchesBase(id, base))) return 'large';
  return null;
}

export function complimentaryAllotment(tier, group) {
  if (group !== 'large' && group !== 'small') return null;
  if (tier === 't12') return group === 'large' ? 250_000 : 2_500_000;
  if (tier === 't35') return group === 'large' ? 1_000_000 : 10_000_000;
  return null;
}

export function nextUtcMidnight(now = Date.now()) {
  const date = new Date(now);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)).toISOString();
}

function complimentaryModelName(role, group, usage) {
  const window = Array.isArray(usage?.windows) ? usage.windows.find(item => item?.id === `complimentary-${group}`) : null;
  const remaining = typeof window?.remainingPercent === 'number' && Number.isFinite(window.remainingPercent) ? Math.max(0, Math.min(100, window.remainingPercent)) : null;
  if (remaining === null) return `OpenAI API · ${role}（無料枠未確認）`;
  if (remaining === 0) return `OpenAI API · ${role}（無料枠なし・有料注意）`;
  return `OpenAI API · ${role}（無料枠あり・残り ${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(remaining)}%）`;
}

/** Narrow the native DSH model picker to the Sol lead and Luna executor. */
export function openAiModelCatalog(usage, visibleModels) {
  const visible = visibleModels === undefined ? null : new Set(visibleModels);
  return [
    { id: OPENAI_DEFAULT_MODEL, name: complimentaryModelName('Sol／司令塔', 'large', usage) },
    { id: OPENAI_SIDEKICK_MODEL, name: complimentaryModelName('Luna／実作業', 'small', usage) },
  ].filter(model => visible === null || visible.has(model.id));
}

function utcDayBounds(now = Date.now()) {
  const date = new Date(now);
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000;
  return { start, end: start + 86400 };
}

function isComplimentaryEligible(row) {
  if (row?.batch === true) return false;
  const tier = String(row?.service_tier ?? '').trim().toLowerCase();
  return !tier || tier === 'default' || /data.?shar|incentive/i.test(tier);
}

function tokensOf(row) {
  const input = Number(row?.input_tokens);
  const output = Number(row?.output_tokens);
  return (Number.isFinite(input) && input > 0 ? input : 0) + (Number.isFinite(output) && output > 0 ? output : 0);
}

export function normalizeOpenAiUsage({ rows = [], usageTier = 'unknown', at = new Date().toISOString(), now = Date.now() } = {}) {
  const used = { large: 0, small: 0, other: 0 };
  for (const row of rows) {
    if (!isComplimentaryEligible(row)) continue;
    const group = complimentaryGroup(row?.model) ?? 'other';
    used[group] += tokensOf(row);
  }
  const resetsAt = nextUtcMidnight(now);
  const windows = ['large', 'small'].map(group => {
    const allotment = complimentaryAllotment(usageTier, group);
    const consumed = used[group];
    if (allotment === null) {
      return consumed > 0 ? { id: `complimentary-${group}`, label: group === 'large' ? 'Complimentary large models' : 'Complimentary small models', usedPercent: null, remainingPercent: null, resetsAt, usedTokens: consumed } : null;
    }
    const remainingPercent = Math.max(0, Math.min(100, (allotment - consumed) / allotment * 100));
    return {
      id: `complimentary-${group}`,
      label: group === 'large' ? 'Complimentary large models' : 'Complimentary small models',
      usedPercent: Math.max(0, Math.min(100, consumed / allotment * 100)),
      remainingPercent,
      resetsAt,
      usedTokens: consumed,
    };
  }).filter(Boolean);
  const complimentary = used.large + used.small;
  return {
    status: 'available',
    source: 'OpenAI organization usage',
    updatedAt: at,
    windows,
    credits: null,
    used: complimentary > 0 || windows.length ? { amount: complimentary, unit: 'tokens', scope: 'complimentary-daily' } : null,
    message: usageTier === 'unknown'
      ? 'Complimentary remaining percent needs a usage tier; used tokens are shown when the admin key can read organization usage.'
      : null,
  };
}

export function createOpenAiProvider({ credentials, enableRoute = async () => {}, fetch = globalThis.fetch, now = Date.now }) {
  let disposed = false;
  const resolve = async ref => (await credentials.resolve(ref))?.value;
  async function request(path, key, options = {}) {
    try {
      const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
      signal.throwIfAborted();
      const response = await fetch(`${API}${path}`, { ...options, headers: { ...(options.headers ?? {}), Authorization: `Bearer ${key}` }, signal, redirect: 'error' });
      if (!response.ok) throw new OpenAiRequestError(`OpenAI request failed (${response.status})`, response.status);
      return await response.json();
    } catch (error) {
      if (error instanceof OpenAiRequestError) throw error;
      throw new OpenAiRequestError('OpenAI request failed; check the connection and retry.');
    }
  }
  async function usageRows(key) {
    const { start, end } = utcDayBounds(now());
    const rows = [];
    let page;
    do {
      const query = new URLSearchParams({ start_time: String(start), end_time: String(end), bucket_width: '1d' });
      query.append('group_by', 'model');
      query.append('group_by', 'service_tier');
      query.append('group_by', 'batch');
      if (page) query.set('page', page);
      const data = await request(`/organization/usage/completions?${query}`, key);
      for (const bucket of Array.isArray(data?.data) ? data.data : []) {
        if (Array.isArray(bucket?.results)) rows.push(...bucket.results);
      }
      page = data?.has_more && typeof data.next_page === 'string' ? data.next_page : null;
    } while (page);
    return rows;
  }
  return {
    async status(settings = defaultOpenAi()) {
      const key = await resolve(KEY);
      if (!key) return { auth: 'unauthenticated', usage: { status: 'unavailable', source: 'OpenAI API', updatedAt: null, windows: [], credits: null } };
      try {
        await request('/models', key);
        const admin = await resolve(ADMIN);
        let usage = { status: 'unavailable', source: 'OpenAI API', updatedAt: new Date(now()).toISOString(), windows: [], credits: null, message: 'Organization usage requires an admin key. Complimentary remaining is unknown until that key can be read.' };
        if (admin) {
          try { usage = normalizeOpenAiUsage({ rows: await usageRows(admin), usageTier: settings.usageTier, at: new Date(now()).toISOString(), now: now() }); }
          catch { usage = { ...usage, status: 'error', message: 'Admin-key usage request failed; the project API key remains usable.' }; }
        }
        return { auth: 'authenticated', usage };
      } catch (error) {
        return { auth: error instanceof OpenAiRequestError && [401, 403].includes(error.status) ? 'unauthenticated' : 'unknown', usage: { status: 'error', source: 'OpenAI API', updatedAt: null, windows: [], credits: null, message: error instanceof OpenAiRequestError ? error.message : 'OpenAI usage could not be retrieved.' } };
      }
    },
    async saveKeys({ openaiApiKey, openaiAdminKey }) {
      if (disposed) throw new Error('OpenAI provider has stopped');
      if (openaiApiKey) {
        await request('/models', openaiApiKey);
        await credentials.set(KEY, openaiApiKey);
        await enableRoute(KEY);
      }
      if (openaiAdminKey) {
        await usageRows(openaiAdminKey);
        await credentials.set(ADMIN, openaiAdminKey);
      }
    },
    async logout() { await credentials.unset(KEY); await credentials.unset(ADMIN); },
    async dispose() { disposed = true; },
  };
}
