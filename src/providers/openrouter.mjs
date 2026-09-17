import { randomBytes, createHash } from 'node:crypto';

const KEY = 'DARASK_OPENROUTER_API_KEY';
const MANAGEMENT = 'DARASK_OPENROUTER_MANAGEMENT_KEY';
const PENDING = 'DARASK_OPENROUTER_PKCE';
const API = 'https://openrouter.ai/api/v1';
class OpenRouterRequestError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
export function normalizeOpenRouterUsage(key, credits, at = new Date().toISOString()) {
  const data = key?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('OpenRouter returned invalid usage');
  const limit = number(data.limit);
  const remaining = number(data.limit_remaining);
  const used = number(data.usage);
  const total = number(credits?.data?.total_credits);
  const consumed = number(credits?.data?.total_usage);
  const windows = limit !== null && limit > 0 && remaining !== null
    ? [{ id: 'key-limit', label: 'API key limit', usedPercent: Math.max(0, Math.min(100, 100 - remaining / limit * 100)), remainingPercent: Math.max(0, Math.min(100, remaining / limit * 100)), resetsAt: null }] : [];
  return {
    status: 'available', source: 'OpenRouter /api/v1/key', updatedAt: at, windows,
    credits: total !== null && consumed !== null ? { balance: Math.max(0, total - consumed), unit: 'USD', label: 'Account credits', scope: 'account' } : remaining !== null ? { balance: remaining, unit: 'USD', label: 'API key remaining limit', scope: 'key-limit' } : null,
    used: { amount: used, unit: 'USD', scope: 'api-key', daily: number(data.usage_daily), weekly: number(data.usage_weekly), monthly: number(data.usage_monthly) },
    message: credits ? null : 'Account credits require a separate management key; API key limits are shown when available.',
  };
}
export function createOpenRouterProvider({ credentials, enableRoute, fetch = globalThis.fetch, now = Date.now }) {
  let pending;
  let revision = 0;
  let activeLogin;
  let disposed = false;
  let restoring;
  const resolve = async ref => (await credentials.resolve(ref))?.value;
  function validPending(value) {
    return value && typeof value.verifier === 'string' && typeof value.state === 'string' && typeof value.origin === 'string'
      && typeof value.url === 'string' && typeof value.expiresAt === 'number' && value.expiresAt > now();
  }
  async function restorePending() {
    if (pending || disposed) return pending;
    restoring ??= (async () => {
      const raw = await resolve(PENDING);
      if (!raw || pending) return;
      try {
        const value = JSON.parse(raw);
        if (validPending(value)) pending = value;
        else await credentials.unset(PENDING);
      } catch { await credentials.unset(PENDING).catch(() => {}); }
    })().finally(() => { restoring = undefined; });
    await restoring;
    return pending;
  }
  async function rememberPending(value) {
    pending = value;
    if (value) await credentials.set(PENDING, JSON.stringify({ verifier: value.verifier, state: value.state, origin: value.origin, url: value.url, expiresAt: value.expiresAt }));
    else if (typeof credentials.unset === 'function') await credentials.unset(PENDING);
  }
  async function request(endpoint, key, options = {}) {
    try {
      const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
      signal.throwIfAborted();
      const response = await fetch(`${API}${endpoint}`, { ...options, headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }, signal, redirect: 'error' });
      if (!response.ok) throw new OpenRouterRequestError(`OpenRouter request failed (${response.status})`, response.status);
      return await response.json();
    } catch (error) {
      if (error instanceof OpenRouterRequestError) throw error;
      throw new OpenRouterRequestError('OpenRouter request failed; check the connection and retry.');
    }
  }
  async function cancelAuth() {
    pending = undefined;
    revision++;
    const operation = activeLogin;
    operation?.controller.abort();
    if (typeof credentials.unset === 'function') await credentials.unset(PENDING).catch(() => {});
    await operation?.completion.catch(() => {});
  }
  async function status() {
    if (!pending) await restorePending();
    const key = await resolve(KEY);
    const login = pending && pending.expiresAt > now() ? { status: 'pending', url: pending.url } : undefined;
    if (!key) return { auth: 'unauthenticated', login, usage: { status: 'unavailable', source: 'OpenRouter', updatedAt: null, windows: [], credits: null } };
    try {
      const keyData = await request('/key', key);
      const management = await resolve(MANAGEMENT);
      let creditData;
      let creditError = false;
      if (management) { try { creditData = await request('/credits', management); } catch { creditError = true; } }
      const usage = normalizeOpenRouterUsage(keyData, creditData);
      if (creditError) usage.message = 'Management-key credits request failed; API-key usage remains available.';
      return { auth: 'authenticated', usage, login };
    } catch (error) {
      return { auth: error instanceof OpenRouterRequestError && [401, 403].includes(error.status) ? 'unauthenticated' : 'unknown', login, usage: { status: 'error', source: 'OpenRouter', updatedAt: null, windows: [], credits: null, message: error instanceof OpenRouterRequestError ? error.message : 'OpenRouter usage could not be retrieved.' } };
    }
  }
  async function saveKeys({ openrouterApiKey, openrouterManagementKey }) {
    if (disposed) throw new Error('OpenRouter provider has stopped');
    if (openrouterApiKey || openrouterManagementKey) await cancelAuth();
    if (openrouterApiKey) {
      await request('/key', openrouterApiKey);
      await credentials.set(KEY, openrouterApiKey);
      await enableRoute(KEY);
    }
    if (openrouterManagementKey) {
      await request('/credits', openrouterManagementKey);
      await credentials.set(MANAGEMENT, openrouterManagementKey);
    }
  }
  return {
    status, saveKeys,
    async login(origin) {
      if (disposed) throw new Error('OpenRouter provider has stopped');
      const base = new URL(origin);
      if (base.username || base.password || base.pathname !== '/' || base.search || base.hash || !['https:', 'http:'].includes(base.protocol) || (base.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname))) throw new Error('Login requires HTTPS or localhost');
      if (!pending) await restorePending();
      if (pending?.expiresAt > now()) {
        if (base.origin !== pending.origin) throw new Error('Login is already pending for another origin');
        return { status: 'pending', url: pending.url };
      }
      await cancelAuth();
      const verifier = randomBytes(32).toString('base64url');
      const state = randomBytes(24).toString('base64url');
      // OpenRouter returns only state/code and the root DSH page requires
      // browser authentication. Use the public callback route instead.
      const callback = new URL('/darask/openrouter/callback', base.origin);
      callback.searchParams.set('state', state);
      const url = new URL('https://openrouter.ai/auth');
      url.search = new URLSearchParams({ callback_url: callback.href, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
      await rememberPending({ verifier, state, origin: base.origin, expiresAt: now() + 600000, url: url.href });
      return { status: 'pending', url: url.href };
    },
    async callback(url) {
      if (!pending) await restorePending();
      const parsed = new URL(url);
      const flow = pending;
      const keys = [...parsed.searchParams.keys()];
      const rootCallback = parsed.pathname === '/' && parsed.searchParams.get('darask_openrouter_callback') === '1';
      const legacyCallback = parsed.pathname === '/darask/openrouter/callback';
      const allowed = rootCallback ? ['darask_openrouter_callback', 'state', 'code'] : ['state', 'code'];
      if (disposed || !flow || flow.expiresAt <= now() || parsed.origin !== flow.origin
        || parsed.username || parsed.password || parsed.hash || !(rootCallback || legacyCallback)
        || new Set(keys).size !== keys.length || keys.some(key => !allowed.includes(key))
        || parsed.searchParams.get('state') !== flow.state) throw new Error('Login expired or invalid state');
      const code = parsed.searchParams.get('code');
      if (!code || code.length > 8192 || /\s|[\x00-\x1f]/u.test(code)) throw new Error('Missing authorization code');
      pending = undefined;
      if (typeof credentials.unset === 'function') void credentials.unset(PENDING).catch(() => {});
      const captured = revision;
      const operation = { controller: new AbortController(), completion: undefined };
      activeLogin = operation;
      const current = () => !disposed && captured === revision && !operation.controller.signal.aborted;
      operation.completion = (async () => {
        const result = await request('/auth/keys', null, { method: 'POST', signal: operation.controller.signal,
          body: JSON.stringify({ code, code_verifier: flow.verifier, code_challenge_method: 'S256' }) });
        if (!current()) throw new Error('Login was cancelled');
        if (typeof result?.key !== 'string' || result.key.length < 8 || result.key.length > 8192 || /[\s\x00-\x1f]/u.test(result.key)) throw new Error('OpenRouter did not return a valid key');
        const previous = await resolve(KEY);
        if (!current()) throw new Error('Login was cancelled');
        await credentials.set(KEY, result.key);
        if (!current()) {
          if (previous) await credentials.set(KEY, previous); else await credentials.unset(KEY);
          throw new Error('Login was cancelled');
        }
        await enableRoute(KEY);
        if (!current()) {
          if (previous) await credentials.set(KEY, previous); else await credentials.unset(KEY);
          throw new Error('Login was cancelled');
        }
      })().finally(() => { if (activeLogin === operation) activeLogin = undefined; });
      return operation.completion;
    },
    async logout() { await cancelAuth(); await credentials.unset(KEY); await credentials.unset(MANAGEMENT); },
    async cancelLogin() { await cancelAuth(); },
    async dispose() {
      disposed = true;
      revision++;
      const operation = activeLogin;
      operation?.controller.abort();
      await operation?.completion.catch(() => {});
    },
  };
}
