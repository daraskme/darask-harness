import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isIP } from 'node:net';

const REF = 'DARASK_CLOUDFLARE_BROWSER_RUN';
const ACTIONS = ['markdown', 'content', 'links', 'screenshot', 'pdf', 'accessibilityTree'];
export function browserRunConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['accountId', 'apiToken'].includes(k))) throw new Error('Browser Run: invalid settings.');
  if (!/^[a-f0-9]{32}$/i.test(value.accountId ?? '')) throw new Error('Browser Run: account ID must have 32 hexadecimal characters.');
  if (typeof value.apiToken !== 'string' || value.apiToken.length < 16 || value.apiToken.length > 8192 || /[\s\x00-\x1f]/.test(value.apiToken)) throw new Error('Browser Run: invalid API token.');
  return { accountId: value.accountId, apiToken: value.apiToken };
}
export function browserRunUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Browser Run: enter a public HTTPS URL.'); }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (url.protocol !== 'https:' || url.username || url.password || isIP(host) || !host.includes('.') || /(?:^|\.)(?:localhost|local|internal|ts\.net)$/.test(host)) throw new Error('Browser Run: enter a public HTTPS URL.');
  return url.href;
}
async function limitedBody(response, limit) {
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  let length = 0;
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) throw new Error('Browser Run: response exceeds the 20 MB limit.');
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally { await reader.cancel().catch(() => {}); }
}
export function createBrowserRun({ credentials, directory, fetch = globalThis.fetch, onConnection = async () => {} }) {
  let connected = false;
  let lastRun = null;
  let totalMs = 0;
  let disposed = false;
  const pending = new Set();
  const read = async () => {
    const value = (await credentials.resolve(REF))?.value;
    return value ? browserRunConfig(JSON.parse(value)) : null;
  };
  async function configure(value) { await onConnection(value); }
  return {
    async initialize() { await configure(await read()); },
    async status() {
      const config = await read();
      return { configured: Boolean(config), connected, accountId: config?.accountId ?? '', lastRun, observedMs: totalMs, dashboardUrl: config ? `https://dash.cloudflare.com/${config.accountId}/workers/browser-run` : 'https://dash.cloudflare.com/?to=/:account/workers/browser-run' };
    },
    async save(value) {
      const config = browserRunConfig(value);
      if (disposed) throw new Error('Browser Run: stopped.');
      await credentials.set(REF, JSON.stringify(config));
      connected = false;
      await configure(config);
    },
    async remove() {
      await configure(null);
      await credentials.unset(REF);
      connected = false;
    },
    async run({ action, url }, signal) {
      if (!ACTIONS.includes(action)) throw new Error('Browser Run: unsupported Quick Action.');
      const target = browserRunUrl(url);
      const config = await read();
      if (!config) throw new Error('Browser Run: save an account ID and API token in DARASK settings.');
      if (disposed) throw new Error('Browser Run: stopped.');
      const controller = new AbortController();
      pending.add(controller);
      const combined = AbortSignal.any([controller.signal, AbortSignal.timeout(65000), ...(signal ? [signal] : [])]);
      try {
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/browser-rendering/${action}`, {
          method: 'POST', headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: target, gotoOptions: { waitUntil: 'domcontentloaded', timeout: 30000 } }),
          redirect: 'error', signal: combined,
        });
        if (!response.ok) {
          if ([401, 403].includes(response.status)) connected = false;
          throw new Error(`Browser Run: request failed (HTTP ${response.status}).`);
        }
        const body = await limitedBody(response, 20 * 1024 * 1024);
        const rawMs = response.headers.get('x-browser-ms-used');
        const ms = rawMs !== null && /^\d+(?:\.\d+)?$/.test(rawMs) ? Number(rawMs) : null;
        let output;
        if (['screenshot', 'pdf'].includes(action)) {
          const expected = action === 'pdf' ? 'application/pdf' : 'image/';
          if (!(response.headers.get('content-type') ?? '').startsWith(expected)) throw new Error('Browser Run: unexpected artifact format.');
          const extension = action === 'pdf' ? 'pdf' : (response.headers.get('content-type') ?? '').includes('jpeg') ? 'jpg' : 'png';
          await mkdir(join(directory, 'browser-run'), { recursive: true });
          const filename = join(directory, 'browser-run', `${randomUUID()}.${extension}`);
          await writeFile(filename, body, { mode: 0o600 });
          output = { file: filename, text: `Saved ${action}: ${filename}` };
        } else {
          const envelope = JSON.parse(body.toString('utf8'));
          if (envelope.success !== true || envelope.result === undefined) throw new Error('Browser Run: the Quick Action was not successful.');
          const rendered = typeof envelope.result === 'string' ? envelope.result : JSON.stringify(envelope.result);
          output = { text: rendered.slice(0, 100000), truncated: rendered.length > 100000 };
        }
        connected = true;
        lastRun = { action, at: new Date().toISOString(), browserMs: ms };
        if (ms !== null) totalMs += ms;
        return { action, ...output, ...(ms === null ? {} : { browserMs: ms }) };
      } catch (error) {
        if (combined.aborted) throw new Error('Browser Run: request cancelled or timed out.');
        if (error.message?.startsWith('Browser Run:')) throw error;
        throw new Error('Browser Run: request failed. Check the API token and connection.');
      } finally { pending.delete(controller); }
    },
    async dispose() { disposed = true; for (const controller of pending) controller.abort(); await configure(null); },
  };
}
