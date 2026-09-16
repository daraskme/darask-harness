// Shared browser/server validation. A scanned QR is data, never a redirect or
// an instruction to send the current PC's credentials to another origin.
export function parseConnectionLink(value) {
  const invalid = () => new Error('Tailscale 用の DSH 接続 QR または認証リンクを指定してください。');
  if (typeof value !== 'string' || value.length > 2048) throw invalid();
  let link;
  try { link = new URL(value.trim()); } catch { throw invalid(); }
  if (link.protocol !== 'https:' || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.[a-z0-9-]+\.ts\.net$/i.test(link.hostname)
    || link.pathname !== '/' || link.username || link.password || link.hash
    || [...link.searchParams.keys()].length !== 1 || link.searchParams.getAll('token').length !== 1) throw invalid();
  const token = link.searchParams.get('token');
  if (!/^[A-Za-z0-9_-]{20,512}$/.test(token)) throw invalid();
  return { name: link.hostname.split('.')[0], url: link.origin, token };
}
