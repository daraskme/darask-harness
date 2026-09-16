import { OpenAICodexCredentialStore, readOpenAICodexRateLimits } from 'dsh-codex-connect';
import { publicOrigin } from './http.mjs';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const methods = { status: ['GET'], login: ['POST'], callback: ['POST'], cancel: ['POST'], logout: ['POST'], accounts: ['GET', 'POST', 'DELETE'] };

// dsh-codex-connect is pinned to alpha.4.35. Capture its validated document once,
// using its own account labels and refresh lock. Never activate accounts to read usage.
export async function captureCodexAccounts(store) {
  const document = await store.readDocument();
  if (!document) return [];
  const credentials = document.version === 1 ? [document.credential] : document.credentials;
  const snapshot = await store.captureActiveAccount.call({ readDocument: async () => document,
    modifyCapturedAccount: store.modifyCapturedAccount.bind(store) });
  const summaries = await snapshot.accounts();
  if (summaries.length !== credentials.length || summaries.length > 16) throw new Error('Codex account format changed');
  return Promise.all(summaries.map(async (summary, index) => ({ summary,
    credentials: await store.captureActiveAccount.call({
      readDocument: async () => ({ version: 2, credentials, activeAccountId: credentials[index].accountId }),
      modifyCapturedAccount: store.modifyCapturedAccount.bind(store),
    }),
  })));
}

export function createCodexAccounts({ store = new OpenAICodexCredentialStore(), readUsage = readOpenAICodexRateLimits, now = Date.now } = {}) {
  const cache = new Map();
  let epoch = 0;
  return {
    invalidate() { epoch++; cache.clear(); },
    async status() {
      const captured = await captureCodexAccounts(store);
      const currentEpoch = epoch;
      const keys = new Set(captured.map(a => a.summary.accountKey));
      for (const key of cache.keys()) if (!keys.has(key)) cache.delete(key);
      return Promise.all(captured.map(async ({ summary, credentials }) => {
        const key = summary.accountKey;
        let entry = cache.get(key);
        if (!entry || entry.expires <= now()) {
          entry = { expires: Infinity };
          entry.result = Promise.resolve().then(() => readUsage(credentials)).then(usage => ({ status: 'signed-in', usage, fetchedAt: new Date(now()).toISOString() }),
            () => ({ status: 'error', quotaError: 'Codex の使用量を取得できません。接続を確認し、必要ならこのアカウントを再認証してください。' }))
            .then(result => { entry.expires = now() + (result.status === 'error' ? 15000 : 60000); return result; });
          if (currentEpoch === epoch) cache.set(key, entry);
        }
        return { ...summary, ...await entry.result };
      }));
    },
  };
}

/** Only register on DSH Connection: its HTTP carrier authenticates before dispatch.
 * The upstream native route assumes direct HTTP and cannot understand TLS terminators.
 * Forward only fixed OAuth routes after the carrier and same-origin checks succeed.
 */
export function codexRoutes({ accounts, port = 3080, upstream: sharedAuth, fetch: fetchImpl = globalThis.fetch }) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid DSH port');
  return Object.entries(methods).map(([endpoint, allowed]) => ({ path: `/api/darask/codex/${endpoint}`, methods: allowed, requestBody: 'buffered',
    async fetch(request) {
      if (!allowed.includes(request.method)) return json({ error: '操作に対応していません。' }, 405);
      try {
        if (request.headers.get('sec-fetch-site') === 'cross-site') throw new Error();
        if (request.method !== 'GET' && !request.headers.get('origin')) throw new Error();
        publicOrigin(request);
      } catch { return json({ error: 'DSH と同じ接続元から操作してください。' }, 403); }
      let body;
      if (request.method !== 'GET') {
        if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'JSON が必要です。' }, 415);
        body = await request.text();
        if (Buffer.byteLength(body) > 4096) return json({ error: '入力が長すぎます。' }, 413);
        try { JSON.parse(body); } catch { return json({ error: '入力を確認してください。' }, 400); }
      }
      try {
        const shared = await sharedAuth?.(request, endpoint, body);
        if (shared) return shared;
        const origin = `http://127.0.0.1:${port}`;
        const upstream = await fetchImpl(`${origin}/plugins/dsh-openai-codex/auth/${endpoint}`, { method: request.method,
          headers: { Origin: origin, Accept: 'application/json', 'Content-Type': 'application/json' },
          ...(body === undefined ? {} : { body }), redirect: 'error', signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]) });
        if (!upstream.ok) {
          await upstream.body?.cancel();
          return json({ error: endpoint === 'callback' ? '認証待ちの状態と戻り先 URL を確認してください。' : 'Codex の操作を完了できませんでした。状態を更新してください。' }, upstream.status);
        }
        const value = await upstream.json();
        if (request.method !== 'GET') accounts.invalidate();
        if (endpoint === 'status') {
          const rows = await accounts.status();
          const active = rows.find(row => row.active);
          return json({ status: ['signing-in', 'reauth-required'].includes(value.status) ? value.status : active ? 'signed-in' : value.status,
            ...(active ? { usage: active.usage, quotaError: active.quotaError, fetchedAt: active.fetchedAt } : {}), accounts: rows });
        }
        return json(value);
      } catch { return json({ error: 'Codex に接続できません。DSH の起動状態を確認してください。' }, 503); }
    },
  }));
}
