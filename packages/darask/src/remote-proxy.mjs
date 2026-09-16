import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { REMOTE_PATH, REMOTE_SOCKET, REMOTE_ASSETS, remoteHubLocation, remoteUrl, rewriteRemoteHtml, patchRemoteWorkspace, patchRemoteLayout, remoteBootstrap } from './remote-browser.mjs';
import { publicOrigin } from './http.mjs';
// Reuse the explicitly bundled Gateway's WebSocket transport dependency.
const { WebSocket, WebSocketServer } = createRequire(new URL('../vendor/dsh-bridge-gateway/package.json', import.meta.url))('ws');
const MAX_BUFFER = 8 * 1024 * 1024;
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const fail = (message, status = 502) => new Response(message, { status, headers: { ...headers, 'Content-Type': 'text/plain;charset=utf-8' } });

export function remoteResource(value, origin) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x1f]/.test(value)) throw new Error('中継先のパスが無効です。');
  const result = new URL(value, origin);
  if (result.origin !== origin || result.username || result.password || result.hash) throw new Error('中継先のパスが無効です。');
  // An embedded remote hub cannot turn this hub into an unbounded proxy chain.
  if (result.pathname === REMOTE_PATH || result.pathname === REMOTE_SOCKET) throw new Error('別の PC は左のワークスペース一覧から選択してください。');
  return result;
}

/** Authenticated, per-node browser carrier. Remote credentials never enter HTML. */
export function createRemoteProxy({ hub, connection, fetch: fetchImpl = globalThis.fetch }) {
  const sockets = new Map(), server = new WebSocketServer({ noServer: true, maxPayload: MAX_BUFFER });
  const stopNode = id => { for (const item of sockets.get(id) ?? []) { item.upstream.terminate(); item.downstream?.terminate(); item.socket.destroy(); } sockets.delete(id); };
  const unsubscribe = hub.onRemoteChange(stopNode);
  const http = async request => {
    const url = new URL(request.url);
    const nodeId = url.searchParams.get('node'), workspace = url.searchParams.get('workspace') || undefined;
    try { publicOrigin(request); } catch { return fail('この接続元からは操作できません。', 403); }
    try {
      const remote = await hub.remoteConnection(nodeId);
      const resource = url.searchParams.get('resource');
      if (resource === null) {
        if (request.method !== 'GET') return fail('GET を使用してください。', 405);
        return new Response(null, { status: 303, headers: { ...headers, Location: remoteHubLocation(remote, workspace) } });
      }
      const target = remoteResource(resource, remote.node.url);
      const outgoing = new Headers({ Cookie: remote.cookie, Origin: remote.node.url, 'Accept-Encoding': 'identity' });
      for (const key of ['accept', 'content-type', 'range', 'if-range']) if (request.headers.has(key)) outgoing.set(key, request.headers.get(key));
      const hasBody = !['GET', 'HEAD'].includes(request.method);
      const response = await fetchImpl(target, { method: request.method, headers: outgoing,
        ...(hasBody ? { body: request.body, duplex: 'half' } : {}),
        redirect: 'manual', signal: target.pathname === '/plugins/events' ? request.signal : AbortSignal.any([request.signal, AbortSignal.timeout(60000)]) });
      if ([401, 403].includes(response.status)) {
        await response.body?.cancel(); hub.invalidateRemote(nodeId);
        return fail('相手の DSH の認証を更新してください。ハブの「アカウント → PC・Tailscale」で PC を再接続できます。', 502);
      }
      const out = new Headers(headers);
      for (const key of ['content-type', 'content-range', 'accept-ranges', 'content-disposition']) if (response.headers.has(key)) out.set(key, response.headers.get(key));
      out.set('X-Frame-Options', 'SAMEORIGIN');
      const location = response.headers.get('location');
      if (location) {
        const redirect = new URL(location, target);
        if (redirect.origin !== remote.node.url) { await response.body?.cancel(); return fail('外部ページへの転送は中継できません。相手のアカウント設定を確認してください。'); }
        out.set('Location', remoteUrl(nodeId, redirect.pathname + redirect.search, workspace));
      }
      if (request.method === 'HEAD' || [204, 304].includes(response.status)) { await response.body?.cancel(); return new Response(null, { status: response.status, headers: out }); }
      const type = out.get('content-type') || '';
      if (type.includes('text/html')) {
        const config = { node: nodeId, origin: remote.node.url, workspace, embedded: url.searchParams.get('embedded') === '1', newSession: url.searchParams.get('newSession') === '1', path: REMOTE_PATH, socket: REMOTE_SOCKET, assets: REMOTE_ASSETS };
        const policy = response.headers.get('content-security-policy');
        if (policy) {
          const hash = `'sha256-${createHash('sha256').update(remoteBootstrap(config)).digest('base64')}'`;
          const directives = policy.split(';').map(part => part.trim()).filter(Boolean);
          const fallback = directives.find(part => /^default-src\s/.test(part));
          if (!directives.some(part => /^script-src\s/.test(part)) && fallback) directives.push(fallback.replace(/^default-src/, 'script-src'));
          out.set('Content-Security-Policy', directives.filter(part => !/^frame-ancestors\b/.test(part)).map(part => /^script-src(?:-elem)?\s/.test(part) ? `${part} ${hash}` : part).concat("frame-ancestors 'self'").join('; '));
        }
        return new Response(rewriteRemoteHtml(await response.text(), config), { status: response.status, headers: out });
      }
      if (/javascript/.test(type)) return new Response(patchRemoteLayout(patchRemoteWorkspace(await response.text())), { status: response.status, headers: out });
      if (type.includes('text/css')) return new Response((await response.text()).replace(/url\(\s*(['"]?)(\/(?!\/)[^)'"]+)\1\s*\)/g, (_all, _quote, value) => `url("${remoteUrl(nodeId, value)}")`), { status: response.status, headers: out });
      return new Response(response.body, { status: response.status, headers: out });
    } catch (error) {
      return fail(/^[ぁ-んァ-ヶ一-龯]/.test(error.message) ? error.message : 'リモート PC に接続できません。DSH と Tailscale の起動状態を確認してください。');
    }
  };
  // Read-only static carrier preserving ESM/CSS relative paths. The same native
  // Host, Origin and session fence runs before any remote credential is read.
  const assetHandler = async (req, res) => {
    const rejection = connection.requestRejection(req);
    if (rejection !== undefined) { res.writeHead(rejection); res.end(); return; }
    if (!['GET', 'HEAD'].includes(req.method) || Number(req.headers['content-length'] || 0) > 0 || req.headers['transfer-encoding']) { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url, 'http://dsh.internal');
    const tail = url.pathname.slice(REMOTE_ASSETS.length + 1), slash = tail.indexOf('/');
    const node = tail.slice(0, slash), resource = tail.slice(slash) + url.search;
    if (slash < 0 || !resource.startsWith('/assets/')) { res.writeHead(404); res.end(); return; }
    const controller = new AbortController();
    const abort = () => { if (!res.writableEnded) controller.abort(); };
    res.once('close', abort);
    try {
      const requestHeaders = Object.fromEntries(Object.entries(req.headers).filter(([, value]) => typeof value === 'string'));
      const response = await http(new Request(new URL(REMOTE_PATH + '?' + new URLSearchParams({ node, resource }), 'http://dsh.internal'), { method: req.method, headers: requestHeaders, signal: controller.signal }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) await pipeline(Readable.fromWeb(response.body), res); else res.end();
    } catch { if (!res.headersSent) { res.writeHead(502); res.end(); } else res.destroy(); }
    finally { res.off('close', abort); }
  };
  const rejectUpgrade = (socket, status) => { socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); };
  const upgrade = async (req, socket, head) => {
    const rejection = connection.requestRejection(req);
    if (rejection !== undefined) { rejectUpgrade(socket, rejection); return; }
    let item;
    try {
      const url = new URL(req.url, 'http://dsh.internal');
      const id = url.searchParams.get('node'), remote = await hub.remoteConnection(id);
      if (socket.destroyed) return;
      const target = remoteResource(url.searchParams.get('resource'), remote.node.url);
      if (target.pathname !== '/api/remote.mux') { rejectUpgrade(socket, 404); return; }
      target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:';
      const upstream = new WebSocket(target, { headers: { Cookie: remote.cookie, Origin: remote.node.url }, followRedirects: false, handshakeTimeout: 15000, maxPayload: MAX_BUFFER });
      item = { upstream, socket }; const set = sockets.get(id) ?? new Set(); set.add(item); sockets.set(id, set);
      const cleanup = () => { set.delete(item); if (!set.size) sockets.delete(id); upstream.terminate(); item.downstream?.terminate(); };
      socket.once('close', cleanup);
      upstream.once('error', () => { if (!item.downstream) rejectUpgrade(socket, 502); cleanup(); });
      upstream.once('close', () => { item.downstream?.close(1012, 'リモート接続を再開します'); cleanup(); });
      upstream.once('open', () => {
        if (socket.destroyed) { cleanup(); return; }
        server.handleUpgrade(req, socket, head, downstream => {
          item.downstream = downstream;
          downstream.once('error', cleanup); downstream.once('close', cleanup);
          const send = (target, data, binary) => {
            if (target.readyState !== WebSocket.OPEN) return;
            if (target.bufferedAmount + data.length > MAX_BUFFER) { cleanup(); return; }
            target.send(data, { binary });
          };
          downstream.on('message', (data, binary) => send(upstream, data, binary));
          upstream.on('message', (data, binary) => send(downstream, data, binary));
        });
      });
    } catch { if (!socket.destroyed) rejectUpgrade(socket, 502); item?.upstream.terminate(); }
  };
  return {
    // Pinned DSH's streaming carrier attaches a body even to GET/HEAD (400).
    // Use its bounded 300 MiB request buffer; response bodies still stream.
    route: { path: REMOTE_PATH, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], requestBody: 'buffered', fetch: http },
    assets: { kind: 'prefix', path: REMOTE_ASSETS, handler: assetHandler },
    upgrade: { path: REMOTE_SOCKET, handler: upgrade },
    dispose() { unsubscribe(); for (const id of [...sockets.keys()]) stopNode(id); server.close(); },
  };
}
