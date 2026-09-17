import { spawn, execSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chmod, stat, unlink, rename } from 'node:fs/promises';
import { homedir, platform, arch } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { get as httpsGet } from 'node:https';

const CLOUDFLARED_VERSION = '2026.9.1';
const DOWNLOAD_TIMEOUT = 5 * 60 * 1000;
const MIN_BINARY_SIZE = 5 * 1024 * 1024;
const HANDSHAKE_TIMEOUT_MS = 90 * 1000;
const RETRY_BASE_MS = 5 * 1000;
const RETRY_MAX_MS = 5 * 60 * 1000;
const DEFAULT_MAX_RETRIES = 12;

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const QUICK_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
const NAMED_READY_RE = /registered tunnel(?: connection)?|registered connindex/i;
const URL_INGRESS_CONFLICT_RE = /can'?t set the --url flag|TUNNEL_URL.*ingress|incompatible with ingress/i;
const FATAL_RE = /Incorrect Usage|flag provided but not defined|invalid.*token|unauthorized|couldn'?t unmarshal tunnel token|error parsing token/i;

export function stripAnsi(text) {
  return String(text ?? '').replace(ANSI_RE, '');
}

export function parseCloudflaredVersion(output) {
  const m = /version\s+(\d{4}\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/.exec(output || '');
  return m ? m[1] : null;
}

export function isFatalCloudflaredError(stderrTail) {
  if (!stderrTail) return false;
  return FATAL_RE.test(stripAnsi(stderrTail));
}

export function isUrlIngressConflict(stderrTail) {
  if (!stderrTail) return false;
  return URL_INGRESS_CONFLICT_RE.test(stripAnsi(stderrTail));
}

/**
 * Build cloudflared argv.
 * --no-autoupdate / --protocol / --url are tunnel-level flags and MUST come
 * before `run` (cloudflared 2024.10.0 treats them as unknown on `run`).
 */
export function buildCloudflaredArgs({
  token = null,
  port,
  noAutoupdate = true,
  protocol = 'http2',
  configPath = null,
  originUrl = null,
  includeOriginUrl = true,
  tokenInEnvironment = false,
} = {}) {
  const origin = originUrl || `http://127.0.0.1:${port}`;
  const args = ['tunnel'];
  if (noAutoupdate) args.push('--no-autoupdate');
  if (protocol) args.push('--protocol', protocol);
  if (configPath) args.push('--config', configPath);
  // Remotely managed named tunnels use their dashboard ingress. Mixing --url
  // with that ingress fails startup or directs the connector at the wrong app.
  if (includeOriginUrl && !token) args.push('--url', origin);
  if (token) args.push('run', ...(tokenInEnvironment ? [] : ['--token', token]));
  return args;
}

export function namedTunnelUrl(hostname) {
  if (!hostname) return null;
  try {
    const h = String(hostname).trim();
    const url = new URL(h.includes('://') ? h : `https://${h}`);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

/**
 * Parse one log fragment (already ANSI-stripped, ideally a complete line).
 * Returns { ready, url, mode } or null.
 */
export function parseTunnelLog(text, { token = null, hostname = null } = {}) {
  const clean = stripAnsi(text);
  if (!clean) return null;

  if (token) {
    const namedHit = NAMED_READY_RE.test(clean)
      || (/\bconnection\b/i.test(clean) && /\bregistered\b/i.test(clean));
    if (!namedHit) return null;
    return { ready: true, url: namedTunnelUrl(hostname), mode: 'named' };
  }

  const match = clean.match(QUICK_URL_RE);
  if (!match) return null;
  // A Quick Tunnel URL is allocated before an edge connection is registered.
  return { ready: false, url: match[0], mode: 'quick' };
}

export function cloudflaredEnvironment(ambient, token, noAutoupdate = true) {
  const env = Object.fromEntries(Object.entries(ambient).filter(([key]) => !/^TUNNEL_/i.test(key)));
  return { ...env, ...(noAutoupdate ? { NO_AUTOUPDATE: 'true' } : {}), TUNNEL_TRANSPORT_PROTOCOL: 'http2', ...(token ? { TUNNEL_TOKEN: token } : {}) };
}

/** Feed stdout/stderr chunks; invoke onLine for each complete line. */
export function createLineBuffer(onLine) {
  let buf = '';
  return (data) => {
    buf += data.toString();
    const parts = buf.split(/\r?\n/);
    buf = parts.pop() ?? '';
    for (const line of parts) onLine(line);
    // Flush a long unterminated chunk so a boxed URL still parses
    if (buf.length > 4000) {
      onLine(buf);
      buf = '';
    }
  };
}

function getCloudflaredInfo() {
  const os = platform();
  const cpuArch = arch();

  const platformMap = {
    'win32-x64':   { file: 'cloudflared-windows-amd64.exe', name: 'cloudflared.exe' },
    'win32-arm64': { file: 'cloudflared-windows-arm64.exe', name: 'cloudflared.exe' },
    'darwin-x64':  { file: 'cloudflared-darwin-amd64.tgz',  name: 'cloudflared' },
    'darwin-arm64':{ file: 'cloudflared-darwin-arm64.tgz',  name: 'cloudflared' },
    'linux-x64':   { file: 'cloudflared-linux-amd64',       name: 'cloudflared' },
    'linux-arm64': { file: 'cloudflared-linux-arm64',       name: 'cloudflared' },
  };

  const key = `${os}-${cpuArch}`;
  const info = platformMap[key];
  if (!info) throw new Error(`未対応の環境: ${os}-${cpuArch}`);

  const url = `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/${info.file}`;
  return { url, name: info.name };
}

async function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ダウンロードがタイムアウトしました（5 分）')), DOWNLOAD_TIMEOUT);

    function doGet(targetUrl, redirects = 0) {
      if (redirects > 5) {
        clearTimeout(timer);
        return reject(new Error('転送回数が上限を超えました'));
      }
      httpsGet(targetUrl, {
        headers: { 'User-Agent': 'dsh-bridge-gateway', Accept: '*/*' },
      }, (res) => {
        const code = res.statusCode ?? 0;
        if ([301, 302, 303, 307, 308].includes(code) && res.headers.location) {
          res.resume();
          return doGet(res.headers.location, redirects + 1);
        }
        if (code !== 200) {
          res.resume();
          clearTimeout(timer);
          return reject(new Error(`ダウンロード失敗: HTTP ${code}`));
        }

        const total = parseInt(res.headers['content-length'] ?? '0', 10);
        let downloaded = 0;
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          if (onProgress && total > 0) {
            onProgress(Math.round(downloaded / total * 100), downloaded, total);
          }
        });

        const fileStream = createWriteStream(dest);
        pipeline(res, fileStream)
          .then(() => { clearTimeout(timer); resolve(); })
          .catch((err) => { clearTimeout(timer); reject(err); });
      }).on('error', (err) => { clearTimeout(timer); reject(err); });
    }

    doGet(url);
  });
}

function findSystemCloudflared() {
  const isWin = platform() === 'win32';
  const candidates = [];
  if (isWin) {
    candidates.push('cloudflared.exe', 'cloudflared', 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe', 'C:\\Program Files\\cloudflared\\cloudflared.exe');
  } else {
    candidates.push('cloudflared', '/opt/homebrew/bin/cloudflared', '/usr/local/bin/cloudflared', '/usr/bin/cloudflared', '/bin/cloudflared');
  }

  for (const bin of candidates) {
    try {
      if (bin.includes('/') || bin.includes('\\')) {
        if (!existsSync(bin)) continue;
      }
      execSync(`"${bin}" --version`, { stdio: 'ignore', timeout: 3000 });
      return bin;
    } catch {}
  }
  return null;
}

function writeIsolatedConfig(home) {
  mkdirSync(home, { recursive: true });
  const path = join(home, 'cloudflared-run.yml');
  writeFileSync(
    path,
    '# Generated by dsh-bridge-gateway. Isolates this process from ~/.cloudflared/config.yml.\nprotocol: http2\n',
    'utf8',
  );
  return path;
}

export class CloudflaredManager {
  constructor({
    port, home, token, hostname, onStateChange, logger,
    binaryPath, retryPolicy, noAutoupdate = true, binaryVersion = CLOUDFLARED_VERSION,
    handshakeTimeoutMs = HANDSHAKE_TIMEOUT_MS, spawnOptions = null,
  }) {
    this.port = port;
    this.home = home || join(homedir(), '.dsh-bridge');
    this.token = token ? String(token).trim() : null;
    this.hostname = hostname ? String(hostname).trim() : null;
    this.onStateChange = onStateChange;
    this.logger = logger;

    this._injectedBinaryPath = binaryPath || null;

    if (retryPolicy === false || retryPolicy === null) {
      this.retry = null;
    } else {
      const p = retryPolicy && typeof retryPolicy === 'object' ? retryPolicy : {};
      this.retry = {
        baseDelayMs: p.baseDelayMs ?? RETRY_BASE_MS,
        maxDelayMs: p.maxDelayMs ?? RETRY_MAX_MS,
        maxRetries: p.maxRetries ?? DEFAULT_MAX_RETRIES,
      };
    }

    this.noAutoupdate = noAutoupdate !== false;
    this.binaryVersion = binaryVersion || CLOUDFLARED_VERSION;
    this.handshakeTimeoutMs = handshakeTimeoutMs ?? HANDSHAKE_TIMEOUT_MS;
    this._spawnOptions = spawnOptions || null;

    this.process = null;
    this.url = null;
    this.binaryPath = null;
    this._stopped = false;
    this._retryTimer = null;
    this._restartCount = 0;
    this._omitOriginUrl = false;
  }

  start() {
    this._stopped = false;
    this._restartCount = 0;
    this._omitOriginUrl = false;
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    this._setState('connecting', '初期化しています…');
    this._run().catch((err) => {
      this.logger?.error('cloudflared の起動に失敗しました: %s', err.message);
      if (err && err.fatal) {
        this._setState('error', err.message);
        return;
      }
      this._scheduleRestart(`cloudflared の起動に失敗しました: ${err.message}`);
    });
  }

  async _run() {
    await this._ensureBinary();
    if (this._stopped) return;
    await this._startProcess();
  }

  _scheduleRestart(reason) {
    if (this._stopped) return;
    if (this._retryTimer) return;
    if (!this.retry) {
      this._setState('error', reason);
      return;
    }
    this._restartCount++;
    if (this._restartCount > this.retry.maxRetries) {
      this._setState('error', `${reason}（自動再試行 ${this.retry.maxRetries} 回で失敗しました。ネットワークとトークンを確認してください）`);
      return;
    }
    const delay = Math.min(
      this.retry.baseDelayMs * 2 ** (this._restartCount - 1),
      this.retry.maxDelayMs,
    );
    this._setState('reconnecting',
      `${reason}，${Math.max(1, Math.round(delay / 1000))}s 後に再接続します（ ${this._restartCount}/${this.retry.maxRetries} 回目）`);
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      this._restartAttempt();
    }, delay);
  }

  _restartAttempt() {
    if (this._stopped) return;
    this._setState('connecting', '再接続しています…');
    this._run().catch((err) => {
      this.logger?.error('cloudflared の自動再接続に失敗しました: %s', err.message);
      if (err && err.fatal) {
        this._setState('error', err.message);
        return;
      }
      this._scheduleRestart(`cloudflared の起動に失敗しました: ${err.message}`);
    });
  }

  _terminateProcess() {
    const p = this.process;
    if (!p) return;
    try {
      if (platform() === 'win32') {
        spawn('taskkill', ['/pid', String(p.pid), '/f', '/t'], { stdio: 'ignore', windowsHide: true });
      } else {
        p.kill('SIGTERM');
      }
    } catch {}
  }

  _checkManagedBinaryVersion(binPath) {
    try {
      const out = execSync(`"${binPath}" --version`, { encoding: 'utf8', timeout: 3000 });
      const ver = parseCloudflaredVersion(out);
      if (!ver) return { ok: false, reason: `バージョンを読み取れません: ${(out || '').trim().slice(0, 80)}` };
      if (ver !== this.binaryVersion) {
        return { ok: false, reason: `バージョンが一致しません: 必要 ${this.binaryVersion}、現在 ${ver}` };
      }
      return { ok: true, version: ver };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  async _ensureBinary() {
    if (this._injectedBinaryPath) {
      this.binaryPath = this._injectedBinaryPath;
      return;
    }

    const systemBin = findSystemCloudflared();
    if (systemBin) {
      this.binaryPath = systemBin;
      this.logger?.info('インストール済みの cloudflared を使用します: %s', systemBin);
      return;
    }

    const { url, name } = getCloudflaredInfo();
    const binDir = join(this.home, 'bin');
    const binPath = join(binDir, name);
    this.binaryPath = binPath;

    if (existsSync(binPath)) {
      try {
        const s = await stat(binPath);
        if (s.size > MIN_BINARY_SIZE) {
          const fd = readFileSync(binPath);
          const isGzip = fd.length >= 2 && fd[0] === 0x1f && fd[1] === 0x8b;
          if (isGzip) {
            this.logger?.warn('未展開の cloudflared アーカイブを検出しました。準備をやり直します…');
            await unlink(binPath).catch(() => {});
          } else {
            if (platform() !== 'win32') {
              await chmod(binPath, 0o755).catch(() => {});
              if (platform() === 'darwin') {
                try { execSync(`xattr -d com.apple.quarantine "${binPath}"`, { stdio: 'ignore' }); } catch {}
              }
            }
            execSync(`"${binPath}" --version`, { stdio: 'ignore', timeout: 3000 });
            this.logger?.info('既存の cloudflared を確認しました: %s', binPath);
            return;
          }
        }
      } catch (verifyErr) {
        this.logger?.warn('既存の cloudflared を確認できません（%s）。再ダウンロードします', verifyErr.message);
      }
      await unlink(binPath).catch(() => {});
    }

    this._setState('downloading', 'cloudflared をダウンロードしています…');
    this.logger?.info('cloudflared をダウンロードします: %s', url);

    mkdirSync(binDir, { recursive: true });
    const tempPath = `${binPath}.tmp`;

    try {
      await downloadFile(url, tempPath, (percent, downloaded, total) => {
        if (this._stopped) return;
        const mb = (downloaded / 1024 / 1024).toFixed(1);
        const totalMb = (total / 1024 / 1024).toFixed(1);
        this._setState('downloading', `ダウンロード cloudflared: ${mb}/${totalMb} MB (${percent}%)`);
      });

      if (url.endsWith('.tgz') || url.endsWith('.tar.gz')) {
        try {
          execSync(`tar -xzf "${tempPath}" -C "${binDir}"`);
          await unlink(tempPath).catch(() => {});
        } catch (tarErr) {
          this.logger?.error('cloudflared の展開に失敗しました: %s', tarErr.message);
          throw new Error(`cloudflared を展開できません: ${tarErr.message}`);
        }
      } else {
        if (existsSync(binPath)) await unlink(binPath).catch(() => {});
        await rename(tempPath, binPath);
      }

      if (platform() !== 'win32') {
        await chmod(binPath, 0o755).catch(() => {});
        if (platform() === 'darwin') {
          try { execSync(`xattr -d com.apple.quarantine "${binPath}"`, { stdio: 'ignore' }); } catch {}
        }
      }

      execSync(`"${binPath}" --version`, { stdio: 'ignore', timeout: 3000 });
      this.logger?.info('cloudflared のダウンロードと準備が完了しました');
    } catch (err) {
      await unlink(tempPath).catch(() => {});
      throw new Error(`cloudflared を準備できません: ${err.message}`);
    }
  }

  _startProcess() {
    return new Promise((resolve, reject) => {
      if (this._stopped) return reject(new Error('中止しました'));

      this._setState('connecting', this._restartCount > 0 ? '再接続しています…' : 'Cloudflare に接続しています…');

      let configPath = null;
      try {
        configPath = writeIsolatedConfig(this.home);
      } catch (err) {
        this.logger?.warn('専用 cloudflared 設定を書き込めません: %s', err.message);
      }

      const args = buildCloudflaredArgs({
        token: this.token,
        port: this.port,
        noAutoupdate: this.noAutoupdate,
        protocol: 'http2',
        configPath,
        includeOriginUrl: !this._omitOriginUrl,
        tokenInEnvironment: true,
      });

      const safeArgs = this.token ? args.map((a) => (a === this.token ? '***' : a)) : args;
      this.logger?.info('cloudflared を起動します: %s %s', this.binaryPath, safeArgs.join(' '));

      const spawnEnv = cloudflaredEnvironment(process.env, this.token, this.noAutoupdate);

      const proc = spawn(this.binaryPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: spawnEnv,
        windowsHide: true,
        ...(this._spawnOptions || {}),
      });
      this.process = proc;

      let resolved = false;
      let timeoutTimer = null;
      let stderrTail = '';
      let edgeRegistered = false;

      const tryResolve = () => {
        if (!resolved) {
          resolved = true;
          if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            timeoutTimer = null;
          }
          this._restartCount = 0;
          resolve();
        }
      };

      const handleLog = (text) => {
        if (this.process !== proc || this._stopped) return;
        if (NAMED_READY_RE.test(stripAnsi(text))) edgeRegistered = true;
        const parsed = parseTunnelLog(text, { token: this.token, hostname: this.hostname });
        if (parsed?.url) this.url = parsed.url;
        if ((parsed?.ready || (!this.token && this.url && edgeRegistered)) && !resolved) {
          if (this.token) {
            this._setState('ready', this.url ? `固定トンネルに接続しました (${this.url})` : '固定トンネルに接続しました');
            this.logger?.info('cloudflared の固定トンネルに接続しました: %s', this.url || 'トークン方式');
          } else {
            this._setState('ready', '一時トンネルに接続しました');
            this.logger?.info('cloudflared の一時トンネルに接続しました: %s', this.url);
          }
          tryResolve();
        }
      };

      const onStdout = createLineBuffer((line) => handleLog(line));
      const onStderr = createLineBuffer((line) => {
        const clean = stripAnsi(line);
        const text = this.token ? clean.replaceAll(this.token, '[非表示]') : clean;
        this.logger?.debug?.('cloudflared: %s', text.trim());
        stderrTail = (stderrTail + '\n' + text).slice(-2000);
        handleLog(text);
        if (/registered tunnel/i.test(text) && !resolved) {
          this._setState('connecting', 'トンネルを登録しました。接続先 URL を待っています…');
        }
      });

      proc.stdout.on('data', onStdout);
      proc.stderr.on('data', onStderr);

      proc.on('exit', (code, signal) => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
        const stillCurrent = this.process === proc;
        if (!stillCurrent) { if (!resolved) reject(new Error('接続処理を中止しました')); return; }
        if (stillCurrent) this.process = null;
        this.url = null;
        if (!resolved) {
          if (isUrlIngressConflict(stderrTail) && !this._omitOriginUrl) {
            this._omitOriginUrl = true;
            this.logger?.warn('cloudflared の --url と配信先設定が競合しました。再試行時に --url を省略します');
          }
          const fatal = isFatalCloudflaredError(stderrTail);
          const lastLine = stripAnsi(stderrTail).trim().split('\n').pop() || '';
          const msg = fatal
            ? `cloudflared の起動に失敗しました: 設定エラー（${lastLine || 'トークンと起動設定を確認してください'}）`
            : `cloudflared が終了しました，code=${code ?? ''} signal=${signal ?? ''}${lastLine ? ` — ${lastLine.slice(0, 180)}` : ''}`;
          const err = new Error(msg);
          if (fatal) err.fatal = true;
          reject(err);
        } else if (!this._stopped && stillCurrent) {
          this._scheduleRestart(`cloudflared が予期せず終了しました (code=${code ?? ''}${signal ? `, ${signal}` : ''})`);
        } else {
          this._setState('idle', '');
        }
      });

      proc.on('error', (err) => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
        if (!resolved) reject(err);
      });

      timeoutTimer = setTimeout(() => {
        if (!resolved) {
          this.logger?.warn('トンネルの接続待ちがタイムアウトしました（%s 秒）。終了後に再試行します', Math.round(this.handshakeTimeoutMs / 1000));
          this._terminateProcess();
          const hint = stderrTail.trim().split('\n').slice(-3).join(' | ');
          reject(new Error(`トンネルの接続待ちがタイムアウトしました（${Math.round(this.handshakeTimeoutMs / 1000)}秒）${hint ? ` — ${hint.slice(0, 180)}` : ''}`));
        }
      }, this.handshakeTimeoutMs);
    });
  }

  _setState(phase, detail) {
    this.onStateChange?.({ phase, detail });
  }

  stop() {
    this._stopped = true;
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    this._restartCount = 0;
    if (this.process) {
      this.logger?.info('cloudflared を停止します…');
      this._terminateProcess();
      this.process = null;
    }
    this.url = null;
    this._setState('idle', '');
  }
}
