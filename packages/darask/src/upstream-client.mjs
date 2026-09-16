/** Browser adapters for the bundled providers' own authentication and quota stores.
 * No credentials are copied into dsh-darask or read from unrelated CLI stores.
 * Contract verified against dsh-grok-provider 1.0.5 and
 * dsh-codex-connect 0.1.0-alpha.4.35.
 */

const SOURCES = Object.freeze({ grok: 'dsh-grok-provider', codex: 'dsh-codex-connect' });
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const percent = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const shortString = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const amount = value => typeof value === 'string' && value.length <= 64 && /^-?\d+(?:\.\d+)?$/u.test(value);
const iso = value => typeof value === 'string' && value.length <= 64 && Number.isFinite(Date.parse(value))
  ? new Date(value).toISOString() : null;

class UpstreamError extends Error {
  constructor(message, unavailable = false) {
    super(message);
    this.unavailable = unavailable;
  }
}

function invalid() { throw new UpstreamError('Provider returned an invalid response.'); }

function emptyUsage(provider, status = 'unknown', message) {
  return { status, source: SOURCES[provider], updatedAt: null, windows: [], credits: null,
    ...(message ? { message } : {}) };
}

function grokSession(session) {
  if (session === undefined) return undefined;
  if (!record(session) || !shortString(session.sessionId)
    || !['running', 'succeeded', 'cancelled', 'failed'].includes(session.state)) invalid();
  return { status: session.state, sessionId: session.sessionId,
    ...(session.state === 'running' ? { message: 'Complete login in the browser opened by the official Grok CLI on the DSH host.' } : {}),
    ...(session.state === 'failed' ? { message: 'The official Grok CLI login did not complete.' } : {}) };
}

function grokStatus(value) {
  if (!record(value) || typeof value.available !== 'boolean' || typeof value.driver !== 'boolean') invalid();
  const login = grokSession(value.session);
  return { auth: value.available ? 'authenticated' : value.driver ? 'unauthenticated' : 'unavailable',
    usage: emptyUsage('grok', 'unavailable', value.available ? 'Quota has not been retrieved.' : 'Sign in to read Grok usage.'),
    ...(login ? { login } : {}) };
}

function grokUsage(value) {
  if (!record(value) || !record(value.quota) || !['ready', 'unavailable'].includes(value.quota.state)) invalid();
  const updatedAt = iso(value.fetchedAt);
  if (updatedAt === null) invalid();
  const quota = value.quota;
  if (quota.state === 'unavailable') return { ...emptyUsage('grok', 'unavailable', 'Grok quota is unavailable.'), updatedAt };
  if (quota.usedPercent === undefined && quota.remainingPercent === undefined) {
    return { ...emptyUsage('grok', 'unknown', 'Grok did not disclose a remaining quota or credit balance.'), updatedAt };
  }
  if (!percent(quota.usedPercent) || !percent(quota.remainingPercent)) invalid();
  const resetsAt = quota.resetsAt === undefined ? null : iso(quota.resetsAt);
  if (quota.resetsAt !== undefined && resetsAt === null) invalid();
  const period = ['weekly', 'monthly'].includes(quota.periodKind) ? quota.periodKind : 'billing';
  return { status: 'available', source: SOURCES.grok, updatedAt,
    windows: [{ id: `grok:${period}`, label: `Grok ${period}`, usedPercent: quota.usedPercent,
      remainingPercent: quota.remainingPercent, resetsAt }], credits: null };
}

function windowLabel(seconds) {
  if (seconds % 604800 === 0) return `${seconds / 604800} week`;
  if (seconds % 86400 === 0) return `${seconds / 86400} day`;
  if (seconds % 3600 === 0) return `${seconds / 3600} hour`;
  if (seconds % 60 === 0) return `${seconds / 60} minute`;
  return `${seconds} second`;
}

function codexUsage(value, quotaError) {
  if (!record(value) || !Array.isArray(value.rateLimits) || value.rateLimits.length > 100) invalid();
  const windows = value.rateLimits.flatMap(bucket => {
    if (!record(bucket) || !shortString(bucket.id) || !Array.isArray(bucket.windows)
      || bucket.windows.length > 100 || (bucket.name !== undefined && !shortString(bucket.name))) invalid();
    return bucket.windows.map((window, index) => {
      if (!record(window) || !percent(window.remainingPercent)
        || !Number.isSafeInteger(window.windowSeconds) || window.windowSeconds <= 0) invalid();
      let resetsAt = null;
      if (window.resetAt !== undefined) {
        if (!Number.isSafeInteger(window.resetAt) || window.resetAt <= 0
          || !Number.isFinite(new Date(window.resetAt * 1000).getTime())) invalid();
        resetsAt = new Date(window.resetAt * 1000).toISOString();
      }
      return { id: `${bucket.id}:${window.windowSeconds}:${index}`,
        label: `${bucket.name ?? bucket.id} · ${windowLabel(window.windowSeconds)}`,
        windowSeconds: window.windowSeconds, usedPercent: 100 - window.remainingPercent,
        remainingPercent: window.remainingPercent, resetsAt };
    });
  });
  let credits = null;
  if (value.credits !== undefined) {
    if (!record(value.credits) || typeof value.credits.unlimited !== 'boolean'
      || (value.credits.balance !== undefined && !amount(value.credits.balance))) invalid();
    // No currency is supplied by this endpoint. Preserve the exact decimal text.
    credits = { unlimited: value.credits.unlimited, balance: value.credits.balance ?? null, unit: null };
  }
  let individualLimit;
  if (value.individualLimit !== undefined) {
    const limit = value.individualLimit;
    if (!record(limit) || !amount(limit.limit) || !amount(limit.used) || !amount(limit.remaining)
      || !percent(limit.remainingPercent)) invalid();
    individualLimit = { limit: limit.limit, used: limit.used, remaining: limit.remaining,
      remainingPercent: limit.remainingPercent };
  }
  const hasData = windows.length > 0 || credits !== null || individualLimit !== undefined;
  // The upstream cached response does not disclose a fetch timestamp.
  return { status: quotaError ? 'error' : hasData ? 'available' : 'unknown', source: SOURCES.codex,
    updatedAt: null, windows, credits, ...(individualLimit ? { individualLimit } : {}),
    ...(quotaError ? { message: 'Codex is signed in, but usage could not be retrieved.' }
      : hasData ? {} : { message: 'Codex did not disclose a remaining quota or credit balance.' }) };
}

function codexStatus(value) {
  const state = codexState(value);
  if (shortString(value.authenticationSource)) state.authenticationSource = value.authenticationSource;
  if (value.accounts !== undefined) {
    if (!Array.isArray(value.accounts) || value.accounts.length > 16) invalid();
    state.accounts = value.accounts.map(account => {
      if (!record(account) || !/^acct_[A-Za-z0-9_-]{43}$/.test(account.accountKey)
        || !shortString(account.displayName) || typeof account.active !== 'boolean') invalid();
      let usage;
      try { usage = codexUsage(account.usage, account.quotaError); }
      catch { usage = emptyUsage('codex', 'error', 'Codex is signed in, but usage could not be retrieved.'); }
      if (iso(account.fetchedAt)) usage.updatedAt = iso(account.fetchedAt);
      return { accountKey: account.accountKey, displayName: account.displayName,
        ...(shortString(account.maskedEmail) ? { maskedEmail: account.maskedEmail } : {}), active: account.active, usage };
    });
    if (new Set(state.accounts.map(a => a.accountKey)).size !== state.accounts.length) invalid();
    if (state.accounts.length && value.status === 'signing-in') state.auth = 'authenticated';
  }
  if (iso(value.fetchedAt)) state.usage.updatedAt = iso(value.fetchedAt);
  return state;
}

function codexState(value) {
  if (!record(value)) invalid();
  if (value.status === 'signed-in') {
    if (value.quotaError !== undefined && typeof value.quotaError !== 'string') invalid();
    let usage;
    try { usage = codexUsage(value.usage, value.quotaError); }
    catch { usage = emptyUsage('codex', 'error', 'Codex is signed in, but returned invalid usage data.'); }
    return { auth: 'authenticated', usage };
  }
  if (value.status === 'signed-out' || value.status === 'reauth-required') {
    return { auth: 'unauthenticated', usage: emptyUsage('codex', 'unavailable',
      value.status === 'reauth-required' ? 'Codex authorization must be renewed.' : 'Sign in to read Codex usage.') };
  }
  if (value.status === 'signing-in') {
    return { auth: 'unknown', usage: emptyUsage('codex'), login: { status: 'running', message: 'Complete Codex authorization in the browser.' } };
  }
  if (value.status === 'error') {
    return { auth: 'unknown', usage: emptyUsage('codex', 'error', 'The Codex provider could not read account status.') };
  }
  invalid();
}

/** Create one in-memory UI client. Each mutation sends exactly one request;
 * the UI owns polling, browser navigation and explicit Grok logout confirmation.
 * Every operation resolves to a public status; arbitrary provider error text is never exposed.
 */
export function createUpstreamClient(provider, { fetch: fetchImpl = globalThis.fetch } = {}) {
  if (!Object.hasOwn(SOURCES, provider)) throw new TypeError('Unsupported upstream provider.');
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  let sequence = 0;
  let last = { auth: 'unknown', usage: emptyUsage(provider) };
  let activeSession;
  let mutation;

  async function request(endpoint, method = 'POST', payload = {}, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), 35000);
    const rpcId = `darask-${++sequence}`;
    const path = provider === 'grok' ? `/api/grok-auth/${endpoint}` : `/api/darask/codex/${endpoint}`;
    try {
      if (controller.signal.aborted) throw new UpstreamError('Provider request was cancelled; check status before retrying.');
      const response = await fetchImpl(path, { method, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: { accept: 'application/json', ...(method !== 'GET' ? { 'content-type': 'application/json' } : {}) },
        ...(method !== 'GET' ? { body: JSON.stringify(provider === 'grok' ? { type: 'client-request', rpcId, method: `grok-auth/${endpoint}`, payload } : payload) } : {}),
        signal: controller.signal });
      if (!response.ok) {
        if (response.status === 404) throw new UpstreamError('The bundled provider endpoint is unavailable.', true);
        if (response.status === 401 || response.status === 403) throw new UpstreamError('The DSH session or browser origin is not authorized for this provider.');
        throw new UpstreamError(`Provider request failed (HTTP ${Number.isInteger(response.status) ? response.status : 'error'}).`);
      }
      const value = await response.json();
      if (provider === 'codex') return value;
      if (!record(value) || value.type !== 'server-response' || value.rpcId !== rpcId || !record(value.result)) invalid();
      if (value.result.ok !== true) throw new UpstreamError('The Grok provider operation failed.');
      if (!record(value.result.value)) invalid();
      return value.result.value;
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      throw new UpstreamError(signal?.aborted ? 'Provider request was cancelled; check status before retrying.'
        : controller.signal.aborted ? 'Provider request timed out; check status before retrying.' : 'Provider request could not be completed.');
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
  }

  function remember(status) {
    activeSession = status.login?.status === 'running' ? status.login.sessionId : undefined;
    last = status;
    return status;
  }

  function failure(error, action = false) {
    const message = error instanceof UpstreamError ? error.message : 'Provider returned an invalid response.';
    const auth = error?.unavailable ? 'unavailable' : action ? last.auth : 'unknown';
    return { ...(provider === 'codex' && action ? { accounts: last.accounts } : {}), auth, usage: emptyUsage(provider, error?.unavailable ? 'unavailable' : 'error', message), message,
      ...(action ? { login: { status: 'failed', message } } : {}) };
  }

  async function status({ signal } = {}) {
    try {
      const value = await request('status', provider === 'codex' ? 'GET' : 'POST', {}, signal);
      if (provider === 'codex') return remember(codexStatus(value));
      if (value.kind !== 'status') invalid();
      const current = grokStatus(value.status);
      if (current.auth === 'authenticated') {
        try {
          const result = await request('dashboard', 'POST', {}, signal);
          if (result.kind !== 'dashboard') invalid();
          current.usage = grokUsage(result.dashboard);
        } catch (error) { current.usage = failure(error).usage; }
      }
      return remember(current);
    } catch (error) { return remember(failure(error)); }
  }

  function mutate(operation) {
    // Join accidental concurrent invocations, especially the two-phase Grok logout.
    if (mutation) return mutation;
    mutation = operation().catch(error => failure(error, true)).finally(() => { mutation = undefined; });
    return mutation;
  }

  function login({ signal } = {}) {
    return mutate(async () => {
      const result = await request('login', 'POST', {}, signal);
      if (provider === 'codex') {
        if (!record(result) || typeof result.url !== 'string' || result.url.length > 16384) invalid();
        let url;
        try { url = new URL(result.url); } catch { invalid(); }
        if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') invalid();
        return remember({ ...last, login: { status: 'running', url: url.href,
          message: 'Open the authorization URL, then complete Codex sign-in.' } });
      }
      if (result.kind === 'busy' || result.kind === 'unavailable') {
        return remember({ ...grokStatus(result.status), login: { status: result.kind,
          message: result.kind === 'busy' ? 'A Grok authentication operation is already running.' : 'The official Grok CLI authentication driver is unavailable.' } });
      }
      if (result.kind !== 'login-started' || result.status?.state !== 'running') invalid();
      const session = grokSession(result.status);
      return remember({ auth: last.auth, usage: emptyUsage(provider), login: session });
    });
  }

  function logout({ signal } = {}) {
    return mutate(async () => {
      const result = await request('logout', 'POST', {}, signal);
      if (provider === 'codex') {
        if (!record(result) || result.ok !== true) invalid();
        return remember(codexStatus({ status: 'signed-out' }));
      }
      if (result.kind === 'logout-confirmation-required') {
        if (!shortString(result.confirmationId) || iso(result.expiresAt) === null) invalid();
        return { ...last, logoutConfirmation: { required: true, expiresAt: iso(result.expiresAt),
          message: 'Grok logout also signs out the official Grok CLI. Click Sign out again within 30 seconds to confirm.' } };
      }
      if (!['logout-succeeded', 'logout-cancelled', 'logout-failed', 'logout-cleanup-failed', 'busy', 'unavailable'].includes(result.kind)) invalid();
      const current = grokStatus(result.status);
      if (result.kind !== 'logout-succeeded') current.message = 'Grok logout did not complete; check the account status.';
      return remember(current);
    });
  }

  function cancelLogin({ signal } = {}) {
    return mutate(async () => {
      if (provider === 'grok') {
        if (!activeSession) {
          return { ...last, login: { status: 'unavailable', message: 'No observed Grok login is running. Refresh status before cancelling.' } };
        }
        const result = await request('cancel', 'POST', { sessionId: activeSession }, signal);
        if (!['cancelled', 'not-running'].includes(result.kind)) invalid();
        return remember(grokStatus(result.status));
      }
      return remember({ ...last, login: undefined, ...codexStatus(await request('cancel', 'POST', {}, signal)) });
    });
  }

  function accountMutation(endpoint, method, payload, signal) {
    if (provider !== 'codex') return Promise.reject(new TypeError('Codex accounts only.'));
    return mutate(async () => {
      await request(endpoint, method, payload, signal);
      return status({ signal });
    });
  }
  const selectAccount = ({ accountKey, signal } = {}) => accountMutation('accounts', 'POST', { accountKey }, signal);
  const removeAccount = ({ accountKey, signal } = {}) => accountMutation('accounts', 'DELETE', { accountKey }, signal);
  const submitCallback = ({ callbackUrl, signal } = {}) => accountMutation('callback', 'POST', { callbackUrl }, signal);
  return Object.freeze({ status, login, logout, cancelLogin, selectAccount, removeAccount, submitCallback });
}
