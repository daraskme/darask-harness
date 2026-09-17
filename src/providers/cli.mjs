import { spawn as nodeSpawn } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { readClaudeCodeOAuth } from '../claude-route.mjs';

const IDS = new Set(['grok', 'cursor', 'claude', 'codex']);
const URL_HOSTS = {
  grok: ['auth.x.ai', 'accounts.x.ai', 'grok.com'],
  cursor: ['cursor.com', 'www.cursor.com', 'auth.cursor.com'],
  claude: ['claude.ai', 'claude.com', 'console.anthropic.com', 'platform.claude.com'],
  codex: ['auth.openai.com', 'chatgpt.com'],
};
const ANSI = /\x1b\[[0-?]*[ -/]*[@-~]/g;
export const cleanText = value => String(value ?? '').replace(ANSI, '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
const labelText = value => cleanText(value).slice(0, 160);

export function unavailableUsage(source, message) {
  return { status: 'unavailable', source, updatedAt: new Date().toISOString(), windows: [], credits: null, message };
}

/** Only login/verification URLs from this provider can cross the bridge boundary. */
export function safeLoginUrl(id, value) {
  if (typeof value !== 'string' || value.length > 8192) return undefined;
  try {
    const url = new URL(value.replace(/[).,;]+$/, ''));
    if (url.protocol !== 'https:' || url.username || url.password || !URL_HOSTS[id]?.includes(url.hostname)) return undefined;
    // Authorization request state and PKCE challenges are intended for this browser.
    // Returned tokens and callback codes must never be displayed.
    for (const key of url.searchParams.keys()) {
      if (/^(?:access_token|refresh_token|id_token|api_key|apikey|token|code)$/i.test(key)) return undefined;
    }
    if (url.hash && /(?:token|code)=/i.test(url.hash)) return undefined;
    return url.href;
  } catch { return undefined; }
}

export function providerEnvironment(id, supplied = process.env) {
  const allowed = /^(?:PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|HOME|HOMEDRIVE|HOMEPATH|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|LANG|LC_ALL|TERM|COLORTERM|HTTP_PROXY|HTTPS_PROXY|NO_PROXY|ALL_PROXY|SSL_CERT_FILE|SSL_CERT_DIR)$/i;
  const own = { grok: /^(?:GROK_HOME|XAI_API_KEY)$/, cursor: /^(?:CURSOR_API_KEY|CURSOR_AUTH_TOKEN)$/, claude: /^(?:CLAUDE_CONFIG_DIR|ANTHROPIC_API_KEY)$/, codex: /^(?:CODEX_HOME|OPENAI_API_KEY)$/ }[id];
  return Object.fromEntries(Object.entries(supplied).filter(([key, value]) => typeof value === 'string' && (allowed.test(key) || own?.test(key))));
}

function pathMatchesProvider(id, filename, paths) {
  const normalized = filename.replaceAll('\\', '/').toLowerCase();
  const base = paths.basename(filename).toLowerCase().replace(/\.(exe|cmd|bat|mjs|cjs|js)$/, '');
  const markers = {
    grok: /(?:^|\/)(?:\.grok|@xai-official|grok)(?:\/|$)/,
    cursor: /(?:^|\/)(?:\.cursor|cursor-agent|@cursor)(?:\/|$)/,
    claude: /(?:^|\/)(?:\.claude|@anthropic-ai)(?:\/|$)/,
    codex: /(?:^|\/)(?:\.codex|@openai)(?:\/|$)/,
  };
  for (const [other, re] of Object.entries(markers)) {
    if (other !== id && re.test(normalized)) throw new Error(`${id}: another provider's executable was selected.`);
  }
  if (base === 'agent' && !markers[id].test(normalized)) throw new Error(`${id}: ambiguous agent executable; choose the provider's absolute installation path.`);
  if (id === 'cursor' && !['agent', 'cursor-agent', 'index', 'cli'].includes(base)) throw new Error('cursor: choose Cursor Agent, not the editor or another CLI.');
  if (id === 'grok' && !['grok', 'agent', 'index', 'cli'].includes(base)) throw new Error('grok: choose the Grok Build executable.');
  if (id === 'claude' && !['claude', 'cli', 'index'].includes(base)) throw new Error('claude: choose the Claude Code executable.');
  if (id === 'codex' && !['codex', 'cli', 'index'].includes(base)) throw new Error('codex: choose the Codex executable.');
}

function resolveCursorPowerShellShim(selected, content, options, exists, readFile) {
  // This recognizes the official layout; it does not interpret PowerShell or
  // invoke the .cmd/.ps1 scripts. No extracted shell commands are executed.
  if (!/set\s+"SCRIPT_DIR=%~dp0"/i.test(content)
    || !/-File\s+"%SCRIPT_DIR%[\\/]cursor-agent\.ps1"\s+%\*/i.test(content)) return null;
  const root = path.win32.dirname(selected);
  const scriptPath = path.win32.join(root, 'cursor-agent.ps1');
  if (!exists(scriptPath)) throw new Error('cursor: cursor-agent.ps1 is missing. Repair the Cursor Agent installation.');
  const script = readFile(scriptPath);
  if (script.length > 65536
    || !script.includes('$scriptPath = Split-Path -parent $MyInvocation.MyCommand.Definition')
    || !script.includes('"$scriptPath\\node.exe" "$scriptPath\\index.js" $args')
    || !script.includes('"$scriptPath\\versions\\$versionName\\node.exe"')
    || !script.includes('"$scriptPath\\versions\\$versionName\\index.js" $args')) {
    throw new Error('cursor: unrecognized PowerShell launcher. Set the direct Cursor CLI index.js path.');
  }
  let directory = root;
  if (!exists(path.win32.join(root, 'node.exe'))) {
    const versionsPath = path.win32.join(root, 'versions');
    const readDirectory = options.readdir ?? (filename => readdirSync(filename, { withFileTypes: true }));
    let entries;
    try { entries = readDirectory(versionsPath); } catch { throw new Error('cursor: no installed version directory. Repair Cursor Agent.'); }
    const versionPattern = /^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:-(\d{2})-(\d{2})-(\d{2}))?-[a-f0-9]+$/;
    const versions = entries.filter(entry => typeof entry.isDirectory === 'function' && entry.isDirectory())
      .map(entry => ({ name: entry.name, match: versionPattern.exec(entry.name) }))
      .filter(entry => entry.match)
      .map(entry => ({ name: entry.name, order: entry.match.slice(1).map(part => Number(part ?? 0)) }))
      .sort((a, b) => {
        for (let i = 0; i < a.order.length; i++) if (a.order[i] !== b.order[i]) return b.order[i] - a.order[i];
        return b.name.localeCompare(a.name);
      });
    if (!versions.length) throw new Error('cursor: no valid installed version. Repair Cursor Agent.');
    directory = path.win32.join(versionsPath, versions[0].name);
  }
  const command = path.win32.join(directory, 'node.exe');
  const entry = path.win32.join(directory, 'index.js');
  if (!exists(command) || !exists(entry)) throw new Error('cursor: the installed version lacks node.exe or index.js. Repair Cursor Agent.');
  if (!options.exists) {
    const canonicalRoot = realpathSync(root);
    for (const filename of [command, entry]) {
      const relative = path.win32.relative(canonicalRoot, realpathSync(filename));
      if (relative.startsWith('..') || path.win32.isAbsolute(relative)) throw new Error('cursor: launcher target escapes the Cursor installation.');
    }
  }
  return { command, args: [entry], executable: selected, env: { CURSOR_INVOKED_AS: 'agent.cmd' } };
}

/** Resolve once, then spawn an absolute executable with an argument array and shell:false. */
export function resolveCliExecutable(id, options = {}) {
  if (!IDS.has(id)) throw new Error('Unknown CLI provider.');
  const platform = options.platform ?? process.platform;
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const home = options.home ?? homedir();
  const env = options.env ?? process.env;
  const exists = options.exists ?? existsSync;
  const readFile = options.readFile ?? (filename => readFileSync(filename, 'utf8'));
  const local = env.LOCALAPPDATA ?? paths.join(home, 'AppData', 'Local');
  const binNames = { grok: ['grok'], cursor: ['cursor-agent'], claude: ['claude'], codex: ['codex'] }[id];
  let candidates = [];
  if (options.executable) {
    if (typeof options.executable !== 'string' || !paths.isAbsolute(options.executable) || /[\x00\r\n]/.test(options.executable)) {
      throw new Error(`${id}: executable must be an absolute path, without command arguments.`);
    }
    candidates = [options.executable];
  } else {
    if (platform === 'win32') {
      if (id === 'grok') candidates.push(paths.join(home, '.grok', 'bin', 'agent.exe'), paths.join(home, '.grok', 'bin', 'grok.exe'));
      if (id === 'cursor') candidates.push(paths.join(local, 'cursor-agent', 'agent.cmd'), paths.join(local, 'cursor-agent', 'agent.exe'));
      if (id === 'claude') candidates.push(paths.join(home, '.local', 'bin', 'claude.exe'));
    } else {
      if (id === 'grok') candidates.push(paths.join(home, '.grok', 'bin', 'grok'));
      if (id === 'cursor') candidates.push(paths.join(home, '.local', 'bin', 'cursor-agent'));
      if (id === 'claude') candidates.push(paths.join(home, '.local', 'bin', 'claude'));
    }
    const pathValue = Object.entries(env).find(([key]) => key.toUpperCase() === 'PATH')?.[1] ?? '';
    for (const folder of pathValue.split(platform === 'win32' ? ';' : ':')) {
      if (!paths.isAbsolute(folder)) continue; // Never search the current working directory.
      for (const name of binNames) for (const ext of platform === 'win32' ? ['.exe', '.cmd'] : ['']) candidates.push(paths.join(folder, name + ext));
    }
  }
  const selected = candidates.find(filename => exists(filename));
  if (!selected) throw new Error(`${id}: CLI not found. Install it or set its absolute executable path.`);
  pathMatchesProvider(id, selected, paths);
  // On real filesystems also reject a symlink to another provider.
  if (!options.exists) pathMatchesProvider(id, realpathSync(selected), paths);
  const ext = paths.extname(selected).toLowerCase();
  if (ext === '.bat') throw new Error(`${id}: batch launchers are unsupported; select the direct .exe or CLI .js path.`);
  if (ext === '.cmd') {
    const content = readFile(selected);
    if (content.length > 32768) throw new Error(`${id}: oversized launcher. Select the direct executable.`);
    if (id === 'cursor' && platform === 'win32') {
      const native = resolveCursorPowerShellShim(selected, content, options, exists, readFile);
      if (native) return native;
    }
    // Extract a literal sibling Node entry point from npm/Cursor shims. No batch
    // code, variable expansion, redirection, or shell invocation is ever executed.
    const targets = new Set([...content.matchAll(/"(?:%~dp0|%dp0%)[\\/]?([^"%\r\n]+\.(?:[cm]?js|exe))"/gi)]
      .map(match => paths.resolve(paths.dirname(selected), match[1]))
      .filter(filename => paths.basename(filename).toLowerCase() !== 'node.exe'));
    if (targets.size !== 1) throw new Error(`${id}: cannot safely resolve this .cmd launcher. Set the direct CLI .exe or Node .js entry point.`);
    const target = [...targets][0];
    const relative = paths.relative(paths.dirname(selected), target);
    if (relative.startsWith('..') || paths.isAbsolute(relative) || !exists(target)) throw new Error(`${id}: invalid launcher target; set a direct CLI executable.`);
    pathMatchesProvider(id, target, paths);
    const targetExtension = paths.extname(target).toLowerCase();
    return targetExtension === '.exe'
      ? { command: target, args: [], executable: selected }
      : { command: options.nodeExecutable ?? process.execPath, args: [target], executable: selected };
  }
  if (['.js', '.cjs', '.mjs'].includes(ext)) return { command: options.nodeExecutable ?? process.execPath, args: [selected], executable: selected };
  if (platform === 'win32' && ext !== '.exe') throw new Error(`${id}: select a direct .exe or CLI JavaScript entry point.`);
  return { command: selected, args: [], executable: selected };
}

/** Output is private to parsers. Never return raw child output to API callers. */
export function spawnBounded(launch, args, options = {}) {
  const spawn = options.spawn ?? nodeSpawn;
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxBytes = options.maxBytes ?? 65536;
  const platform = options.platform ?? process.platform;
  let child, timer, hardKill, killDeadline, treeKiller, done = false, stopping = null, waitingForTree = false;
  let output = '', errors = '', total = 0;
  let finish;
  const completion = new Promise(resolve => { finish = resolve; });
  const settle = result => {
    if (done) return;
    done = true;
    clearTimeout(timer); clearTimeout(hardKill); clearTimeout(killDeadline);
    finish({ stdout: output, stderr: errors, ...result });
  };
  const stop = reason => {
    if (done || stopping) return completion;
    stopping = reason;
    clearTimeout(timer);
    // A cancelled writer still owns its workspace until termination is confirmed.
    killDeadline = setTimeout(() => {
      treeKiller?.kill?.('SIGKILL');
      settle({ code: null, error: 'termination-unconfirmed', cause: reason, terminated: false, pid: child?.pid });
    }, options.killTimeoutMs ?? 5000);
    if (platform === 'win32' && Number.isInteger(child?.pid) && child.pid > 0) {
      // Kill the tree BEFORE killing the root, or descendants may be orphaned.
      waitingForTree = true;
      const taskkill = path.win32.join(process.env.SystemRoot ?? process.env.SYSTEMROOT ?? 'C:\\Windows', 'System32', 'taskkill.exe');
      try {
        treeKiller = (options.killSpawn ?? nodeSpawn)(taskkill, ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' });
        treeKiller.once('error', () => {}); // Deadline reports failure without exposing raw stderr.
        treeKiller.once('close', code => {
          if (code === 0) settle({ code: null, error: reason, terminated: true });
        });
      } catch {} // Do not claim successful termination if the helper cannot start.
    } else {
      try { child?.kill?.('SIGTERM'); } catch {}
      hardKill = setTimeout(() => { try { child?.kill?.('SIGKILL'); } catch {} }, options.killGraceMs ?? 500);
    }
    return completion;
  };
  try {
    child = spawn(launch.command, [...launch.args, ...args], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: launch.env ? { ...(options.env ?? process.env), ...launch.env } : options.env, cwd: options.cwd });
    child.stdin?.on?.('error', () => {});
    const receive = (chunk, stderr) => {
      if (done || stopping) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.byteLength;
      if (total > maxBytes) return stop('output-limit');
      const text = buffer.toString('utf8');
      if (stderr) errors += text; else output += text;
      try { options.onOutput?.(cleanText(output + '\n' + errors)); }
      catch { stop('output-parser-failed'); }
    };
    if (options.capture !== false) {
      child.stdout?.on('data', chunk => receive(chunk, false));
      child.stderr?.on('data', chunk => receive(chunk, true));
    }
    child.once('error', () => { if (!stopping) settle({ code: null, error: 'spawn-failed', terminated: true }); });
    child.once('close', code => {
      if (!waitingForTree) settle({ code, ...(stopping ? { error: stopping } : {}), terminated: true });
    });
    if (timeoutMs > 0) timer = setTimeout(() => stop('timeout'), timeoutMs);
    // CLI login flows receive no prompts or secret input from the bridge.
    if (!options.keepStdinOpen) child.stdin?.end();
  } catch { settle({ code: null, error: 'spawn-failed', terminated: true }); }
  return { completion, cancel: () => { stop('cancelled'); return completion; }, child };
}

function loginDetails(id, text) {
  const urls = text.match(/https:\/\/[^\s<>"\x1b]+/g) ?? [];
  const url = urls.map(value => safeLoginUrl(id, value)).find(Boolean);
  const match = text.match(/(?:user\s+code|device\s+code|enter(?:\s+the)?(?:\s+following)?\s+code|code)\s*[:：]?\s*([A-Z0-9]{4}(?:-[A-Z0-9]{4}){1,2})\b/i);
  return { ...(url ? { url } : {}), ...(url && match ? { userCode: match[1] } : {}) };
}

const commands = {
  cursor: { status: ['status', '--format', 'json'], login: ['login'], logout: ['logout'] },
  grok: { status: ['--version'], login: ['login', '--device-auth'], logout: ['logout'] },
  claude: { status: ['auth', 'status'], login: ['auth', 'login'], logout: ['auth', 'logout'] },
};

export function createCliProvider(id, options = {}) {
  if (!commands[id]) throw new Error('Unsupported CLI provider.');
  const env = providerEnvironment(id, options.env ?? process.env);
  let pending = null, activeStart = null, disposed = false, observedAuth = 'unknown', loginGeneration = 0;
  const active = new Set();
  const usage = () => unavailableUsage(`${id}-cli`, id === 'claude'
    ? 'Subscription usage is supplied by Claude Code statusLine during a session; account status does not expose a balance.'
    : 'This CLI does not expose a documented account balance command.');
  const launch = () => { if (disposed) throw new Error('Provider disposed.'); return resolveCliExecutable(id, options); };
  const run = (args, extra = {}) => {
    const job = spawnBounded(launch(), args, { ...options, env, ...extra });
    active.add(job);
    job.completion.finally(() => active.delete(job));
    return job;
  };
  async function status() {
    try {
      const result = await run(commands[id].status).completion;
      if (result.error) return { auth: 'unavailable', usage: usage(), message: `CLI status failed (${result.error}).`, login: pending?.view };
      if (id === 'grok') return { auth: result.code === 0 ? observedAuth : 'unavailable', usage: usage(), login: pending?.view, message: 'Grok Build has no documented authentication-status command; saved credentials are not read.' };
      let info;
      try { info = JSON.parse(cleanText(result.stdout).trim()); } catch { info = null; }
      const authenticated = info?.authenticated ?? info?.loggedIn ?? info?.logged_in ?? info?.isAuthenticated;
      let auth = typeof authenticated === 'boolean' ? (authenticated ? 'authenticated' : 'unauthenticated')
        : result.code === 1 && id === 'claude' ? 'unauthenticated' : 'unknown';
      if (id === 'claude' && auth === 'unknown' && await readClaudeCodeOAuth({ env, home: options.home })) auth = 'authenticated';
      const email = info?.email ?? info?.user?.email ?? info?.account?.email;
      return { auth, ...(typeof email === 'string' ? { label: labelText(email) } : {}), usage: usage(), login: pending?.view };
    } catch (error) { return { auth: 'unavailable', usage: usage(), message: error.message }; }
  }
  async function login() {
    if (pending) return { ...pending.view };
    if (activeStart) return activeStart;
    const generation = loginGeneration;
    activeStart = (async () => {
      // Reuse existing login and never replace the account automatically.
      const before = await status();
      if (generation !== loginGeneration || disposed) return { status: 'pending', message: 'Login cancelled.' };
      if (before.auth === 'authenticated') return { status: 'authenticated' };
      const state = { view: { status: 'pending', message: 'Complete sign-in in the provider browser flow.' }, job: null };
      pending = state;
      let ready;
      const first = new Promise(resolve => { ready = resolve; });
      let waitTimer, outputTimer;
      try {
        state.job = run(commands[id].login, {
          timeoutMs: options.loginTimeoutMs ?? 300000,
          env: { ...env, ...(id === 'cursor' ? { NO_OPEN_BROWSER: '1' } : {}) },
          onOutput: text => {
            clearTimeout(outputTimer);
            outputTimer = setTimeout(() => {
              if (pending !== state) return;
              const details = loginDetails(id, text);
              if (details.url) { state.view = { status: 'pending', ...details }; ready({ ...state.view }); }
            }, 40);
          },
        });
        state.job.completion.then(result => {
          clearTimeout(waitTimer);
          clearTimeout(outputTimer);
          if (pending !== state) { ready({ status: 'pending', message: 'Login cancelled.' }); return; }
          pending = null;
          if (!result.error && result.code === 0) {
            observedAuth = 'authenticated';
            state.view = { status: 'authenticated' };
          } else {
            state.view = { status: 'pending', message: result.error === 'cancelled' ? 'Login cancelled.' : 'Login did not complete. Start sign-in again.' };
          }
          ready({ ...state.view });
        });
        waitTimer = setTimeout(() => ready({ ...state.view }), options.loginWaitMs ?? 2000);
        return await first;
      } catch (error) { pending = null; throw error; }
    })();
    try { return await activeStart; } finally { activeStart = null; }
  }
  async function cancelLogin() {
    loginGeneration++;
    const job = pending?.job;
    pending = null;
    if (job) await job.cancel();
    return { status: 'cancelled' };
  }
  async function logout() {
    await cancelLogin();
    const result = await run(commands[id].logout).completion;
    if (result.error || result.code !== 0) throw new Error('CLI logout failed.');
    observedAuth = 'unauthenticated';
    return { status: 'unauthenticated' };
  }
  async function dispose() { disposed = true; loginGeneration++; pending = null; await Promise.all([...active].map(job => job.cancel())); }
  return { status, login, logout, cancelLogin, dispose };
}
