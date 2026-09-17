/** Exchange the official Host Connection launch URL for an upstream-only cookie.
 * No credential-file parsing or cookie signing is performed by this plugin.
 * The proxy must finish its own visitor authorization before forwarding traffic.
 */
export function createDshSession(connection, targetPort) {
  const authority = `127.0.0.1:${targetPort}`;
  let cached = '';
  let expires = 0;
  return () => {
    if (cached && Date.now() < expires) return cached;
    if (typeof connection?.authenticatedUrl !== 'function' || typeof connection?.authorizeIndex !== 'function') return '';
    let cookie;
    connection.authorizeIndex({ method: 'GET', url: connection.authenticatedUrl(`http://${authority}`), headers: { host: authority } }, {
      writeHead(status, headers) { if (status === 303) cookie = headers['set-cookie']; }, end() {},
    });
    const value = Array.isArray(cookie) ? cookie.find(c => c.startsWith('dsh-auth-')) : cookie;
    if (typeof value !== 'string' || !value.startsWith('dsh-auth-')) return '';
    const maxAge = Number(/Max-Age=(\d+)/i.exec(value)?.[1] ?? 0);
    cached = value.split(';')[0];
    expires = Date.now() + Math.max(0, Math.min(60000, maxAge * 1000 - 1000));
    return cached;
  };
}

export function upstreamHeaders(headers, targetPort, sessionCookie = '') {
  const authority = `127.0.0.1:${targetPort}`;
  const out = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  out.host = authority;
  if (out.origin) out.origin = `http://${authority}`;
  delete out['accept-encoding'];
  if (sessionCookie) {
    const ownName = sessionCookie.slice(0, sessionCookie.indexOf('='));
    const existing = String(out.cookie ?? '').split(';').map(s => s.trim()).filter(s => s && s.slice(0, s.indexOf('=')) !== ownName);
    out.cookie = [...existing, sessionCookie].join('; ');
  }
  return out;
}
