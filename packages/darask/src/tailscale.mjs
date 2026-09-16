import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { isIP } from 'node:net';
import { spawnBounded, providerEnvironment } from './providers/cli.mjs';

export function tailscaleExecutable() {
  const paths = process.platform === 'win32'
    ? [join(process.env.ProgramFiles || 'C:\\Program Files', 'Tailscale', 'tailscale.exe')]
    : ['/usr/bin/tailscale', '/usr/local/bin/tailscale', '/Applications/Tailscale.app/Contents/MacOS/Tailscale'];
  return paths.find(existsSync);
}
export function selfStatus(raw) {
  const dns = String(raw?.Self?.DNSName ?? '').replace(/\.$/, '').toLowerCase();
  const dnsName = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.[a-z0-9-]+\.ts\.net$/.test(dns) ? dns : null;
  const addresses = (raw?.Self?.TailscaleIPs ?? raw?.TailscaleIPs ?? []).filter(value => typeof value === 'string' && isIP(value));
  return { connected: raw?.BackendState === 'Running', state: String(raw?.BackendState ?? 'Unknown').slice(0, 40), dnsName, addresses };
}
export function serveState(config, authority, target, port) {
  const hosts = Object.keys(config.Web ?? {}).filter(host => host.endsWith(`:${port}`));
  const tcp = config.TCP?.[String(port)];
  const funnel = config.AllowFunnel?.[authority] === true;
  if (!tcp && hosts.length === 0 && !funnel) return 'off';
  const handlers = config.Web?.[authority]?.Handlers;
  const exact = tcp?.HTTPS === true && Object.keys(tcp).length === 1 && hosts.length === 1 && hosts[0] === authority
    && handlers && Object.keys(handlers).length === 1 && handlers['/']?.Proxy === target
    && Object.keys(handlers['/']).length === 1 && !funnel;
  return exact ? 'on' : 'conflict';
}

export function createTailscale({ directory, localPort = 3080, httpsPort = 8443, executable = tailscaleExecutable(), run } = {}) {
  for (const port of [localPort, httpsPort]) if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid Tailscale port');
  const marker = join(directory, 'tailscale-serve.json');
  const target = `http://127.0.0.1:${localPort}`;
  const active = new Set();
  let disposed = false;
  let queue = Promise.resolve();
  const execute = run ?? (async args => {
    if (disposed || !executable || !isAbsolute(executable)) throw new Error('Tailscale CLI is unavailable.');
    const task = spawnBounded({ command: executable, args: [] }, args, { env: providerEnvironment('tailscale'), timeoutMs: 15000, maxBytes: 4 * 1024 * 1024 });
    active.add(task);
    try { return await task.completion; } finally { active.delete(task); }
  });
  async function read(args) {
    const result = await execute(args);
    if (result.code !== 0 || result.error) throw new Error('Tailscale command failed.');
    const value = JSON.parse(result.stdout);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Tailscale returned invalid state.');
    return value;
  }
  async function status() {
    try {
      const self = selfStatus(await read(['status', '--json']));
      const authority = self.dnsName ? `${self.dnsName}:${httpsPort}` : null;
      const serving = authority ? serveState(await read(['serve', 'status', '--json']), authority, target, httpsPort) : 'unavailable';
      let owned = false;
      try {
        const saved = JSON.parse(await readFile(marker, 'utf8'));
        owned = saved.authority === authority && saved.target === target && saved.version === 1;
      } catch {}
      return { available: true, ...self, serve: serving, owned, url: authority ? `https://${authority}/` : null, target, httpsPort };
    } catch { return { available: false, connected: false, state: 'Unavailable', addresses: [], dnsName: null, serve: 'unavailable', owned: false, url: null, target, httpsPort }; }
  }
  return {
    status,
    async devices() {
      try {
        const value = await read(['status', '--json']);
        return Object.values(value.Peer ?? {}).map(peer => ({ name: peer.HostName, dnsName: selfStatus({ Self: peer }).dnsName, online: peer.Online === true, os: peer.OS }))
          .filter(peer => peer.dnsName);
      } catch { return []; }
    },
    action(action) {
      const task = queue.catch(() => {}).then(async () => {
        if (disposed) throw new Error('Tailscale integration stopped.');
        if (!['serveEnable', 'serveDisable'].includes(action)) throw new Error('Unknown Tailscale action');
        const before = await status();
        if (!before.available || !before.connected || !before.dnsName) throw new Error('Tailscale: connect this device first.');
        if (before.serve === 'conflict') throw new Error('Tailscale: this HTTPS port belongs to another configuration.');
        if (action === 'serveEnable' && before.serve === 'on') return before;
        if (action === 'serveDisable') {
          if (before.serve === 'off') return before;
          if (!before.owned) throw new Error('Tailscale: this Serve configuration was not created by DARASK.');
        }
        const args = ['serve', '--bg', `--https=${httpsPort}`, '--set-path=/', target, ...(action === 'serveDisable' ? ['off'] : [])];
        const result = await execute(args);
        // Never forward CLI output (which can include device authorization URLs).
        if (result.code !== 0 || result.error) throw new Error('Tailscale: Serve failed. Check HTTPS enablement and permissions in the Tailscale app.');
        const after = await status();
        if (after.serve !== (action === 'serveEnable' ? 'on' : 'off')) throw new Error('Tailscale: Serve state could not be verified.');
        if (action === 'serveEnable') {
          await mkdir(directory, { recursive: true });
          await writeFile(marker, JSON.stringify({ version: 1, authority: `${before.dnsName}:${httpsPort}`, target }), { mode: 0o600 });
        } else await unlink(marker).catch(error => { if (error.code !== 'ENOENT') throw error; });
        return status();
      });
      queue = task;
      return task;
    },
    async dispose() { disposed = true; for (const task of active) task.cancel(); await queue.catch(() => {}); },
  };
}
