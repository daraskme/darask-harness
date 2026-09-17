import { createHash, createHmac } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

async function credential(credentials, name) {
  const resolved = await credentials?.resolve?.(name);
  return typeof resolved?.value === 'string' ? resolved.value : '';
}

export const R2_PREFIX = 'darask/media/';
const ACCOUNT = /^[a-f0-9]{32}$/i;
const BUCKET = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const HOST = /^(https:\/\/)[^\s]+$/i;
const KEY = /^[A-Za-z0-9._/-]{1,512}$/;
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const MAX_BYTES = 80 * 1024 * 1024;

function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key, data) {
  return createHmac('sha256', key).update(data).digest();
}

function encodePath(value) {
  return value.split('/').map(part => encodeURIComponent(part)).join('/');
}

function amzDate(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amz: iso, day: iso.slice(0, 8) };
}

export function r2Endpoint(accountId) {
  if (!ACCOUNT.test(accountId)) throw new Error('Invalid R2 account id');
  return `https://${accountId.toLowerCase()}.r2.cloudflarestorage.com`;
}

export function signAwsV4({ method, url, headers = {}, body = Buffer.alloc(0), accessKey, secretKey, region = 'auto', service = 's3', now = new Date() }) {
  const parsed = new URL(url);
  const { amz, day } = amzDate(now);
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const payloadHash = sha256Hex(payload);
  const extra = {
    host: parsed.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amz,
    ...headers,
  };
  const signed = Object.keys(extra).map(key => key.toLowerCase()).sort();
  const canonicalHeaders = signed.map(name => {
    const key = Object.keys(extra).find(item => item.toLowerCase() === name);
    return `${name}:${String(extra[key]).trim()}\n`;
  }).join('');
  const canonical = [
    method.toUpperCase(),
    parsed.pathname || '/',
    parsed.searchParams.toString() ? [...parsed.searchParams.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '',
    canonicalHeaders,
    signed.join(';'),
    payloadHash,
  ].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amz, scope, sha256Hex(canonical)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, day), region), service), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  extra.Authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signed.join(';')}, Signature=${signature}`;
  return extra;
}

export async function r2Settings({ credentials, store }) {
  const accountId = String(store?.get?.().r2AccountId ?? '').trim();
  const bucket = String(store?.get?.().r2Bucket ?? '').trim();
  const publicBase = String(store?.get?.().r2PublicBase ?? '').trim().replace(/\/$/, '');
  const accessKey = await credential(credentials, 'DARASK_R2_ACCESS_KEY_ID');
  const secretKey = await credential(credentials, 'DARASK_R2_SECRET_ACCESS_KEY');
  if (!accountId && !bucket && !accessKey && !secretKey) return { configured: false };
  if (!ACCOUNT.test(accountId) || !BUCKET.test(bucket) || !accessKey || !secretKey) return { configured: false, error: 'Set R2 account id, bucket, access key and secret in Settings → Plugins (Cloudflare R2).' };
  if (publicBase && !HOST.test(publicBase)) return { configured: false, error: 'r2PublicBase must be an https URL.' };
  return { configured: true, accountId: accountId.toLowerCase(), bucket, publicBase, accessKey, secretKey, endpoint: r2Endpoint(accountId) };
}

function publicUrl(settings, key) {
  if (settings.publicBase) return `${settings.publicBase}/${encodePath(key)}`;
  return `${settings.endpoint}/${settings.bucket}/${encodePath(key)}`;
}

function mediaKey(name) {
  const safe = basename(name).replace(/[^\w.-]+/g, '-').slice(0, 80) || 'media.bin';
  return `${R2_PREFIX}${Date.now()}-${safe}`;
}

async function signedFetch({ settings, method, path, query = '', body, contentType, signal, fetchImpl = fetch }) {
  const url = `${settings.endpoint}${path}${query}`;
  const headers = signAwsV4({
    method, url, body: body ?? Buffer.alloc(0), accessKey: settings.accessKey, secretKey: settings.secretKey,
    headers: contentType ? { 'content-type': contentType } : {},
  });
  const response = await fetchImpl(url, { method, headers, body, signal, redirect: 'error' });
  const bytes = Buffer.from(new Uint8Array(await response.arrayBuffer()));
  if (!response.ok) {
    const text = bytes.toString('utf8').slice(0, 240);
    throw new Error(`R2 ${method} failed (HTTP ${response.status})${text ? `: ${text}` : ''}`);
  }
  return { response, bytes };
}

export async function r2Put({ settings, key, body, contentType, signal, fetchImpl }) {
  if (!KEY.test(key) || !key.startsWith(R2_PREFIX)) throw new Error('R2 object key must stay under darask/media/.');
  if (!Buffer.isBuffer(body) || body.length === 0 || body.length > MAX_BYTES) throw new Error('R2 object size is out of range.');
  await signedFetch({
    settings, method: 'PUT', path: `/${settings.bucket}/${encodePath(key)}`, body, contentType: contentType || 'application/octet-stream', signal, fetchImpl,
  });
  return publicUrl(settings, key);
}

export async function r2Get({ settings, key, signal, fetchImpl }) {
  if (!KEY.test(key) || !key.startsWith(R2_PREFIX)) throw new Error('R2 object key must stay under darask/media/.');
  const { bytes, response } = await signedFetch({
    settings, method: 'GET', path: `/${settings.bucket}/${encodePath(key)}`, signal, fetchImpl,
  });
  return { bytes, contentType: response.headers.get('content-type') || 'application/octet-stream' };
}

export async function r2List({ settings, signal, fetchImpl }) {
  const { bytes } = await signedFetch({
    settings, method: 'GET', path: `/${settings.bucket}`, query: `?list-type=2&prefix=${encodeURIComponent(R2_PREFIX)}&max-keys=50`, signal, fetchImpl,
  });
  const xml = bytes.toString('utf8');
  const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(match => match[1]);
  return keys.filter(key => key.startsWith(R2_PREFIX));
}

export async function uploadGeneratedMedia({ credentials, store, file, contentType, signal, fetchImpl }) {
  const settings = await r2Settings({ credentials, store });
  if (!settings.configured) return settings.error ? ` R2: ${settings.error}` : '';
  const body = await readFile(file);
  const key = mediaKey(file);
  const url = await r2Put({ settings, key, body, contentType, signal, fetchImpl });
  return ` R2: ${url} (key ${key})`;
}

export async function r2Action({ credentials, store, directory, action, path, key, signal, fetchImpl }) {
  const settings = await r2Settings({ credentials, store });
  if (action === 'status') {
    if (!settings.configured) return settings.error || 'Cloudflare R2 is not configured.';
    return `R2 ready. account=${settings.accountId} bucket=${settings.bucket}${settings.publicBase ? ` public=${settings.publicBase}` : ''}`;
  }
  if (!settings.configured) return settings.error || 'Set Cloudflare R2 credentials in Settings → Plugins.';
  if (action === 'list') {
    const keys = await r2List({ settings, signal, fetchImpl });
    return keys.length ? keys.map(item => `${item} → ${publicUrl(settings, item)}`).join('\n') : 'No objects under darask/media/.';
  }
  if (action === 'put') {
    if (!path) return 'path is required for put.';
    const file = resolve(path);
    const kind = MIME[extname(file).toLowerCase()];
    if (!kind) return 'put accepts JPEG, PNG, WebP, GIF, MP4, or WebM.';
    const info = await stat(file);
    if (!info.isFile() || info.size > MAX_BYTES) return 'File is missing or too large.';
    const url = await r2Put({ settings, key: mediaKey(file), body: await readFile(file), contentType: kind, signal, fetchImpl });
    return `Uploaded ${file} → ${url}`;
  }
  if (action === 'get') {
    if (!key) return 'key is required for get.';
    const object = await r2Get({ settings, key, signal, fetchImpl });
    const folder = join(directory, 'addons-output');
    await mkdir(folder, { recursive: true });
    const file = join(folder, basename(key).replace(/[^\w.-]+/g, '-') || 'r2.bin');
    await writeFile(file, object.bytes);
    return `Downloaded ${key} to ${file}`;
  }
  return `Unknown R2 action: ${action}`;
}
