import { verifiedOAuthOrigin } from '../vendor/dsh-bridge-gateway/lib/oauth-origin.mjs';

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
export const OPENROUTER_CALLBACK_PATH = '/darask/openrouter/callback';
const CALLBACK_OK = '<!doctype html><meta charset="utf-8"><title>DARASK</title><p>OpenRouter の連携が完了しました。このタブを閉じて DSH に戻ってください。</p>';
const CALLBACK_FAIL = '<!doctype html><meta charset="utf-8"><title>DARASK</title><p>OpenRouter のログインを完了できませんでした。</p><p>DSH のアカウント画面に戻り、OpenRouter のログインをやり直してください。この認証 URL は再利用できません。</p>';

// The HTTP Connection carrier uses http://dsh.internal as its Request URL.
// Host/Origin have already passed its trust fence; never accept forwarded hosts.
export function publicOrigin(request, httpsHosts = []) {
  const url = new URL(request.url);
  const authority = request.headers.get('host') ?? url.host;
  const origin = request.headers.get('origin');
  if (origin) {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.host !== authority || parsed.origin !== origin) throw new Error('Origin rejected.');
    return parsed.origin;
  }
  const parsed = new URL(`${httpsHosts.includes(authority) ? 'https' : 'http'}://${authority}`);
  if (parsed.host !== authority || parsed.username || parsed.password) throw new Error('Host rejected.');
  return parsed.origin;
}

export function callbackOrigin(request, httpsHosts = []) {
  const gatewayOrigin = verifiedOAuthOrigin(request);
  if (gatewayOrigin) return gatewayOrigin;
  const origin = request.headers.get('origin');
  if (!origin) return publicOrigin(request, httpsHosts);
  try {
    return publicOrigin(request, httpsHosts);
  } catch {
    const headers = new Headers(request.headers);
    headers.delete('origin');
    return publicOrigin(new Request(request.url, { headers }), httpsHosts);
  }
}

export async function completeOpenRouterCallback(service, request, httpsHosts = []) {
  const callback = new URL(request.url);
  await service.callback(new URL(callback.pathname + callback.search, callbackOrigin(request, httpsHosts)).href);
}

function nodeHeaders(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) for (const item of value) headers.append(key, item);
  }
  return headers;
}

/** OpenRouter redirects here from another site. Must not live under /api (Sec-Fetch-Site: cross-site is 403 there). */
export function createOpenRouterCallbackRoute(service, options = {}) {
  return {
    kind: 'prefix',
    path: '/darask/openrouter',
    handler: async (req, res) => {
      const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname.replace(/\/$/u, '') || '/';
      if (pathname !== OPENROUTER_CALLBACK_PATH) {
        res.writeHead(404, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
        res.end();
        return;
      }
      if (req.method !== 'GET') {
        res.writeHead(405, { Allow: 'GET', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
        res.end();
        return;
      }
      const host = typeof req.headers.host === 'string' ? req.headers.host : '';
      const incoming = new URL(req.url ?? '/', 'http://dsh.internal');
      const request = new Request(`http://${host}${OPENROUTER_CALLBACK_PATH}${incoming.search}`, { method: 'GET', headers: nodeHeaders(req) });
      try {
        await completeOpenRouterCallback(service, request, options.httpsHosts ?? []);
        res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer' });
        res.end(CALLBACK_OK);
      } catch {
        // Keep Chromium from replacing the useful callback explanation with
        // its generic localhost "page not found" response.
        res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer' });
        res.end(CALLBACK_FAIL);
      }
    },
  };
}

/** Called only by DSH Connection's authenticated carrier. */
export function createRoutes(service, { httpsHosts = [] } = {}) {
  return [
    { path: '/api/darask/status', methods: ['GET'], requestBody: 'buffered', async fetch() { try { return json(await service.status()); } catch { return json({ error: 'DARASK status is unavailable.' }, 503); } } },
    { path: '/api/darask/action', methods: ['POST'], requestBody: 'buffered', async fetch(request) {
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'JSON required.' }, 415);
      let origin;
      try { origin = publicOrigin(request, httpsHosts); } catch { return json({ error: 'Origin rejected.' }, 403); }
      const body = await request.text();
      if (new TextEncoder().encode(body).length > 32768) return json({ error: 'Request too large.' }, 413);
      try {
        const payload = JSON.parse(body);
        // Retain the native carrier's Host/Origin fence above. Only OpenRouter
        // login needs the separately authenticated public-facing authority.
        if (payload?.provider === 'openrouter' && payload.action === 'login') origin = verifiedOAuthOrigin(request) ?? origin;
        return json(await service.action(payload, origin));
      }
      catch (error) { return json({ error: safeError(error) }, 400); }
    } },
  ];
}
function safeError(error) {
  const message = error instanceof Error ? error.message : '';
  if (/^[ぁ-んァ-ヶ一-龯]|^llama-server/.test(message)) return message.slice(0, 200);
  return /^(Invalid|Unknown|Priority|Use an absolute|Cursor cannot|Grok cannot|Cursor and Grok|OpenRouter request failed|OpenAI request failed|Login requires|Use the bundled|Tailscale:|Browser Run:|Computer:)/.test(message) ? message.slice(0,200) : 'The action failed. Check the connection or executable path.';
}
