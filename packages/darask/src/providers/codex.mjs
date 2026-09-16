import { spawn as nodeSpawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { resolveCliExecutable, providerEnvironment, safeLoginUrl, cleanText, unavailableUsage, spawnBounded } from './cli.mjs';

const SOURCE = 'codex-app-server';
const numberOrNull = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const textOrNull = value => typeof value === 'string' ? cleanText(value).slice(0, 160) : null;

export function normalizeCodexUsage(result) {
  const records = result?.rateLimitsByLimitId && typeof result.rateLimitsByLimitId === 'object'
    ? Object.entries(result.rateLimitsByLimitId)
    : result?.rateLimits ? [[result.rateLimits.limitId ?? 'codex', result.rateLimits]] : [];
  const windows = [];
  const balances = [];
  for (const [key, bucket] of records) {
    if (!bucket || typeof bucket !== 'object') continue;
    for (const slot of ['primary', 'secondary']) {
      const value = bucket[slot];
      const used = numberOrNull(value?.usedPercent);
      if (used === null) continue;
      windows.push({
        id: `${key}:${slot}`, label: textOrNull(bucket.limitName) ?? key,
        usedPercent: Math.max(0, Math.min(100, used)),
        remainingPercent: Math.max(0, Math.min(100, 100 - used)),
        windowDurationMins: numberOrNull(value.windowDurationMins),
        resetsAt: numberOrNull(value.resetsAt),
      });
    }
    const credits = bucket.credits;
    if (credits && typeof credits === 'object') {
      // Codex credit balances are service units; never label them USD.
      const balance = credits.balance === null || credits.balance === undefined ? null : Number(credits.balance);
      balances.push({ id: key, balance: Number.isFinite(balance) ? balance : null,
        hasCredits: typeof credits.hasCredits === 'boolean' ? credits.hasCredits : null,
        unlimited: typeof credits.unlimited === 'boolean' ? credits.unlimited : null,
        unit: 'credits' });
    }
  }
  return {
    status: windows.length || balances.length ? 'available' : 'unavailable', source: SOURCE,
    updatedAt: new Date().toISOString(), windows, credits: balances.length ? balances : null,
    resetCredits: numberOrNull(result?.rateLimitResetCredits?.availableCount),
    ...(!windows.length && !balances.length ? { message: 'Codex has not returned usage limits for this account.' } : {}),
  };
}

/** Account-only stdio JSON-RPC client. Does not read auth.json or initiate turns. */
export function createCodexProvider(options = {}) {
  const spawn = options.spawn ?? nodeSpawn;
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxLineBytes = options.maxLineBytes ?? 524288;
  const maxStderrBytes = options.maxStderrBytes ?? 65536;
  let connection = null, starting = null, disposed = false, nextId = 1;
  let loginState = null, loginStarting = null, loginTimer = null, loginGeneration = 0;
  const completions = new Map();
  const activeJobs = new Set();

  function fail(conn, reason) {
    if (conn.closed) return;
    conn.closed = true;
    for (const request of conn.requests.values()) { clearTimeout(request.timer); request.reject(new Error(reason)); }
    conn.requests.clear();
    if (connection === conn) connection = null;
    clearTimeout(loginTimer);
    if (loginState?.status === 'pending') loginState = { status: 'pending', message: 'Codex connection closed. Start sign-in again.' };
    if (!conn.exited) conn.job.cancel();
  }

  function write(conn, message) {
    if (conn.closed || !conn.child.stdin?.writable) throw new Error('Codex connection is closed.');
    conn.child.stdin.write(JSON.stringify(message) + '\n', error => { if (error) fail(conn, 'Codex input stream failed.'); });
  }

  function request(conn, method, params) {
    if (conn.closed) return Promise.reject(new Error('Codex connection is closed.'));
    if (conn.requests.size >= 32) return Promise.reject(new Error('Too many pending Codex requests.'));
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => fail(conn, `Codex request timed out (${method}).`), timeoutMs);
      conn.requests.set(id, { resolve, reject, timer });
      try { write(conn, { id, method, ...(params === undefined ? {} : { params }) }); }
      catch { fail(conn, 'Codex input stream failed.'); }
    });
  }

  function notification(message) {
    if (message.method === 'account/login/completed') {
      const params = message.params ?? {};
      if (typeof params.loginId !== 'string') return;
      completions.set(params.loginId, params.success === true);
      if (completions.size > 8) completions.delete(completions.keys().next().value);
      if (loginState?.loginId === params.loginId) {
        clearTimeout(loginTimer);
        loginState = params.success === true ? { status: 'authenticated' }
          : { status: 'pending', message: 'Codex sign-in did not complete. Start sign-in again.' };
      }
    } else if (message.method === 'account/updated' && message.params?.authMode === null) {
      loginState = null;
    }
  }

  function handleLine(conn, line) {
    if (!line.trim() || conn.closed) return;
    let message;
    try { message = JSON.parse(line); } catch { fail(conn, 'Invalid JSON from Codex app-server.'); return; }
    if (!message || typeof message !== 'object' || Array.isArray(message)) { fail(conn, 'Invalid Codex protocol message.'); return; }
    if (message.method && message.id !== undefined) {
      // This account-only client cannot grant tool permissions or supply tokens.
      try { write(conn, { id: message.id, error: { code: -32601, message: 'Unsupported server request in account-only client.' } }); } catch {}
    } else if (message.id !== undefined) {
      const pending = conn.requests.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      conn.requests.delete(message.id);
      if (message.error) pending.reject(new Error(`Codex request rejected (${Number.isInteger(message.error.code) ? message.error.code : 'protocol'}).`));
      else pending.resolve(message.result);
    } else notification(message);
  }

  async function ensureConnection() {
    if (disposed) throw new Error('Provider disposed.');
    if (starting) return starting;
    if (connection && !connection.closed) return connection;
    starting = (async () => {
      const launch = resolveCliExecutable('codex', options);
      const job = spawnBounded(launch, ['app-server'], {
        ...options, spawn, timeoutMs: 0, capture: false, keepStdinOpen: true,
        env: providerEnvironment('codex', options.env ?? process.env), cwd: options.cwd,
      });
      const child = job.child;
      if (!child) throw new Error('Cannot start Codex app-server.');
      activeJobs.add(job);
      job.completion.finally(() => activeJobs.delete(job));
      const conn = { child, job, requests: new Map(), closed: false, exited: false, buffer: '', stderrBytes: 0, decoder: new StringDecoder('utf8'), epoch: Date.now(), bytes: 0 };
      connection = conn;
      child.stdin?.on('error', () => fail(conn, 'Codex input stream failed.'));
      child.on('error', () => fail(conn, 'Cannot start Codex app-server.'));
      child.on('exit', () => { conn.exited = true; fail(conn, 'Codex app-server exited.'); });
      child.on('close', () => { conn.exited = true; fail(conn, 'Codex app-server closed.'); });
      child.stderr?.on('data', chunk => {
        conn.stderrBytes += Buffer.byteLength(chunk);
        if (conn.stderrBytes > maxStderrBytes) fail(conn, 'Codex stderr exceeded the output limit.');
      });
      child.stdout?.on('data', chunk => {
        if (conn.closed) return;
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if (Date.now() - conn.epoch >= 1000) { conn.epoch = Date.now(); conn.bytes = 0; }
        conn.bytes += buffer.length;
        if (conn.bytes > (options.maxBytesPerSecond ?? 4194304)) return fail(conn, 'Codex output exceeded the rate limit.');
        conn.buffer += conn.decoder.write(buffer);
        let newline;
        while ((newline = conn.buffer.indexOf('\n')) >= 0) {
          const line = conn.buffer.slice(0, newline);
          conn.buffer = conn.buffer.slice(newline + 1);
          if (Buffer.byteLength(line) > maxLineBytes) return fail(conn, 'Codex protocol line exceeded the output limit.');
          handleLine(conn, line);
          if (conn.closed) return;
        }
        if (Buffer.byteLength(conn.buffer) > maxLineBytes) fail(conn, 'Codex protocol line exceeded the output limit.');
      });
      await request(conn, 'initialize', { clientInfo: { name: 'dsh_darask', title: 'DSH Darask', version: '0.1.0' } });
      write(conn, { method: 'initialized' });
      return conn;
    })();
    try { return await starting; }
    catch (error) { if (connection) fail(connection, 'Codex initialization failed.'); throw error; }
    finally { starting = null; }
  }

  async function call(method, params) { return request(await ensureConnection(), method, params); }
  function publicLogin(state) {
    if (!state) return undefined;
    const { loginId, ...view } = state;
    return view;
  }

  async function status() {
    try {
      const result = await call('account/read', { refreshToken: false });
      const account = result?.account;
      let usage = unavailableUsage(SOURCE, 'Sign in with ChatGPT to read Codex usage.');
      if (account) {
        try { usage = normalizeCodexUsage(await call('account/rateLimits/read')); }
        catch { usage = { ...usage, status: 'error', message: 'Codex did not return account rate limits.' }; }
      }
      return {
        auth: account ? 'authenticated' : 'unauthenticated',
        ...(typeof account?.email === 'string' ? { label: textOrNull(account.email) } : {}),
        ...(typeof account?.planType === 'string' ? { plan: textOrNull(account.planType) } : {}),
        usage, login: publicLogin(loginState),
      };
    } catch (error) { return { auth: 'unavailable', usage: unavailableUsage(SOURCE, 'Codex app-server is unavailable.'), message: error.message }; }
  }

  async function login(params = {}) {
    if (loginStarting) return loginStarting;
    if (loginState?.loginId) return publicLogin(loginState);
    const generation = loginGeneration;
    loginStarting = (async () => {
      const before = await call('account/read', { refreshToken: false });
      if (generation !== loginGeneration || disposed) return { status: 'pending', message: 'Login cancelled.' };
      if (before?.account) return { status: 'authenticated' };
      const deviceCode = params.deviceCode ?? options.deviceCode ?? false;
      const result = await call('account/login/start', { type: deviceCode ? 'chatgptDeviceCode' : 'chatgpt' });
      if (generation !== loginGeneration || disposed) {
        if (typeof result?.loginId === 'string' && !disposed) await call('account/login/cancel', { loginId: result.loginId });
        return { status: 'pending', message: 'Login cancelled.' };
      }
      const url = safeLoginUrl('codex', result?.authUrl ?? result?.verificationUrl);
      if (typeof result?.loginId !== 'string' || !url) {
        if (typeof result?.loginId === 'string') await call('account/login/cancel', { loginId: result.loginId }).catch(() => {});
        throw new Error('Codex returned no valid provider login URL.');
      }
      if (completions.has(result.loginId)) return completions.get(result.loginId)
        ? { status: 'authenticated' } : { status: 'pending', message: 'Codex sign-in did not complete. Start sign-in again.' };
      loginState = { status: 'pending', loginId: result.loginId, url,
        ...(typeof result.userCode === 'string' && /^[A-Z0-9-]{4,32}$/i.test(result.userCode) ? { userCode: result.userCode } : {}) };
      loginTimer = setTimeout(() => { cancelLogin().catch(() => {}); }, options.loginTimeoutMs ?? 300000);
      loginTimer.unref?.();
      return publicLogin(loginState);
    })();
    try { return await loginStarting; } finally { loginStarting = null; }
  }

  async function cancelLogin() {
    loginGeneration++;
    clearTimeout(loginTimer);
    const id = loginState?.loginId;
    loginState = null;
    if (id && connection && !connection.closed) await request(connection, 'account/login/cancel', { loginId: id });
    return { status: 'cancelled' };
  }
  async function logout() {
    await cancelLogin();
    await call('account/logout');
    loginState = null;
    return { status: 'unauthenticated' };
  }
  async function dispose() {
    disposed = true;
    loginGeneration++;
    clearTimeout(loginTimer);
    const conn = connection;
    if (conn) fail(conn, 'Codex provider disposed.');
    await Promise.all([...activeJobs].map(job => job.cancel()));
    loginState = null;
  }
  return { status, login, cancelLogin, logout, dispose };
}
