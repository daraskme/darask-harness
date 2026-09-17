import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Host-only process state, shared across linked package copies and HMR reloads.
// Never serialized into settings, client bundles, logs, or HTTP responses.
const slot = Symbol.for('darask.gateway.oauth-origin.v1');
const secret = globalThis[slot] ??= randomBytes(32);
const ORIGIN = 'x-darask-oauth-origin';
const PROOF = 'x-darask-oauth-proof';
const paths = new Set(['/api/darask/action', '/darask/openrouter/callback']);
const sign = value => createHmac('sha256', secret).update(value).digest('hex');
const payload = (method, pathname, origin, timestamp) => JSON.stringify([method, pathname, origin, timestamp]);

/** Called only AFTER Gateway visitor authentication; inbound proofs are discarded. */
export function attachOAuthOrigin(headers, req, secure = false, now = Date.now()) {
  delete headers[ORIGIN];
  delete headers[PROOF];
  const pathname = new URL(req.url ?? '/', 'http://internal').pathname;
  if (!paths.has(pathname)) return headers;
  const authority = req.headers.host;
  if (typeof authority !== 'string') return headers;
  const protocol = secure || req.headers['x-forwarded-proto'] === 'https' ? 'https:' : 'http:';
  const origin = new URL(`${protocol}//${authority}`).origin;
  if (new URL(origin).host !== authority) throw new Error('Invalid gateway authority');
  // OAuth navigation can originate at OpenRouter; API mutations must be same-origin.
  if (pathname === '/api/darask/action' && req.headers.origin !== origin) throw new Error('Invalid gateway origin');
  const timestamp = String(now);
  headers[ORIGIN] = origin;
  headers[PROOF] = `${timestamp}.${sign(payload(req.method, pathname, origin, timestamp))}`;
  return headers;
}

/** Only a process-authenticated Gateway receipt can override OAuth public origin. */
export function verifiedOAuthOrigin(request, now = Date.now()) {
  const origin = request.headers.get(ORIGIN);
  const proof = request.headers.get(PROOF);
  if (!origin && !proof) return undefined;
  const pathname = new URL(request.url).pathname;
  if (!paths.has(pathname) || !origin || !proof) throw new Error('Invalid gateway receipt');
  const match = /^(\d+)\.([a-f0-9]{64})$/.exec(proof);
  if (!match || Math.abs(now - Number(match[1])) > 60000) throw new Error('Expired gateway receipt');
  const expected = sign(payload(request.method, pathname, origin, match[1]));
  if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(match[2], 'hex'))) throw new Error('Invalid gateway receipt');
  const parsed = new URL(origin);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.origin !== origin) throw new Error('Invalid gateway origin');
  return origin;
}
