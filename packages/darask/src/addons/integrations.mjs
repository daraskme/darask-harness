import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve, extname, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { uploadGeneratedMedia } from './r2.mjs';
import { resolveXaiBearer, MISSING_XAI_AUTH } from './xai-auth.mjs';

const exec = promisify(execFile);

export async function credential(credentials, name) {
  const resolved = await credentials?.resolve?.(name);
  return typeof resolved?.value === 'string' ? resolved.value : '';
}

export async function generateXaiImage({ credentials, prompt, model, directory, signal, store, fetchImpl = fetch, grokAuthPath, now, readFileImpl }) {
  const auth = await resolveXaiBearer({ credentials, grokAuthPath, now, readFileImpl });
  if (!auth.token) return auth.error || MISSING_XAI_AUTH;
  const response = await fetchImpl('https://api.x.ai/v1/images/generations', {
    method: 'POST', signal,
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || 'grok-imagine-image', prompt, n: 1, response_format: 'b64_json' }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && auth.source === 'grok-subscription') {
      return 'Grok のログインが Imagine API に拒否されました。「設定 → アカウント」で再ログインしてください。';
    }
    return `Grok の画像生成に失敗しました（HTTP ${response.status}）。`;
  }
  const b64 = body.data?.[0]?.b64_json;
  const url = body.data?.[0]?.url;
  if (b64) {
    const bytes = Buffer.from(b64, 'base64'), format = imageFormat(bytes);
    if (!format) return 'Grok から対応していない画像データが返されました。';
    const folder = join(directory, 'addons-output');
    await mkdir(folder, { recursive: true });
    const file = join(folder, `xai-${randomUUID()}${format.extension}`);
    await writeFile(file, bytes);
    const r2 = await uploadGeneratedMedia({ credentials, store, file, contentType: format.mime, signal, fetchImpl }).catch(() => ' R2 への保存は完了していません。ローカルの画像を利用できます。');
    return `画像を保存しました: ${file}${r2}`;
  }
  if (url) return `画像 URL: ${url}`;
  return 'Grok から画像データが返されませんでした。';
}

export function imageFormat(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return { extension: '.png', mime: 'image/png' };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension: '.jpg', mime: 'image/jpeg' };
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return { extension: '.webp', mime: 'image/webp' };
  return null;
}
const VIDEO_ASPECT = new Set(['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3']);
const VIDEO_RESOLUTION = new Set(['480p', '720p', '1080p']);
const MAX_STILL_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const VIDEO_POLL_MS = 5000;
const VIDEO_TIMEOUT_MS = 9 * 60 * 1000;

export function dataUrlFromImageBuffer(buffer, mime) {
  return `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
}

export async function waitMs(ms, signal) {
  if (signal?.aborted) throw signal.reason ?? new Error('aborted');
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new Error('aborted'));
    };
    if (!signal) return;
    if (signal.aborted) {
      clearTimeout(timer);
      reject(signal.reason ?? new Error('aborted'));
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function stillAsDataUrl(imagePath, imageUrl) {
  if (imagePath && imageUrl) return { error: 'imagePath と imageUrl はどちらか一方を指定してください。' };
  if (imageUrl) {
    const url = String(imageUrl).trim();
    if (url.startsWith('data:')) {
      const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/.exec(url);
      if (!match || match[1].length > MAX_STILL_BYTES * 4 / 3 + 4) return { error: '画像データは 12 MB 以下の PNG・JPEG・WebP を指定してください。' };
      const bytes = Buffer.from(match[1], 'base64'), format = imageFormat(bytes);
      if (!format || bytes.length > MAX_STILL_BYTES) return { error: '画像データの形式またはサイズを確認してください。' };
      return dataUrlFromImageBuffer(bytes, format.mime);
    }
    if (!/^https:\/\//i.test(url)) return { error: 'imageUrl は HTTPS の URL または画像の data URI を指定してください。' };
    return url;
  }
  if (!imagePath) return null;
  if (!isAbsolute(imagePath)) return { error: 'imagePath は、この DSH の PC 上の絶対パスを指定してください。' };
  const file = resolve(imagePath);
  try {
    const info = await stat(file);
    if (!info.isFile()) return { error: 'imagePath がファイルではありません。' };
    if (info.size > MAX_STILL_BYTES) return { error: '画像は 12 MB 以下にしてください。' };
    const buffer = await readFile(file);
    const format = imageFormat(buffer);
    if (!format || buffer.length > MAX_STILL_BYTES) return { error: '画像は 12 MB 以下の PNG・JPEG・WebP を指定してください。' };
    return dataUrlFromImageBuffer(buffer, format.mime);
  } catch {
    return { error: 'imagePath を読み取れません。ファイルの場所とアクセス権を確認してください。' };
  }
}

export async function generateXaiVideo({
  credentials, prompt, imagePath, imageUrl, model, duration, resolution, aspectRatio, directory, signal, store, requestId: resumeId,
  fetchImpl = fetch, sleep = waitMs, grokAuthPath, now, readFileImpl,
}) {
  const auth = await resolveXaiBearer({ credentials, grokAuthPath, now, readFileImpl });
  if (!auth.token) return auth.error || MISSING_XAI_AUTH;
  if (resumeId != null && (typeof resumeId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(resumeId))) return 'requestId の形式を確認してください。';
  if (resumeId && [prompt, imagePath, imageUrl, model, duration, resolution, aspectRatio].some(value => value != null)) return '再確認は requestId だけを指定してください。新しい生成は開始しません。';
  const still = await stillAsDataUrl(imagePath, imageUrl);
  if (still && typeof still === 'object' && still.error) return still.error;
  const text = typeof prompt === 'string' ? prompt.trim() : '';
  if (!resumeId && !still && !text) return 'prompt、imagePath、imageUrl のいずれかを指定してください。';
  if (duration != null && (!Number.isInteger(duration) || duration < 1 || duration > 15)) return 'duration は 1〜15 秒の整数にしてください。';
  if (resolution && !VIDEO_RESOLUTION.has(resolution)) return 'resolution は 480p・720p・1080p から選んでください。';
  if (aspectRatio && !VIDEO_ASPECT.has(aspectRatio)) return 'aspectRatio が Grok Imagine の対応する縦横比ではありません。';
  const body = {
    model: model || 'grok-imagine-video-1.5',
    ...(text ? { prompt: text } : {}),
    ...(still ? { image: { url: still } } : {}),
    ...(duration != null ? { duration } : {}),
    ...(resolution ? { resolution } : {}),
    ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
  };
  signal = signal ? AbortSignal.any([signal, AbortSignal.timeout(VIDEO_TIMEOUT_MS)]) : AbortSignal.timeout(VIDEO_TIMEOUT_MS);
  let requestId = resumeId;
  const resume = detail => `${detail} requestId: ${requestId} を指定すると、同じ動画の確認を再開できます。`;
  try {
    if (!requestId) {
      const started = await fetchImpl('https://api.x.ai/v1/videos/generations', {
        method: 'POST', signal,
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const startJson = await started.json().catch(() => ({}));
      if (!started.ok) {
        if (started.status === 401 && auth.source === 'grok-subscription') {
          return 'Grok のログインが Imagine API に拒否されました。「設定 → アカウント」で再ログインしてください。';
        }
        return `Grok の動画生成に失敗しました（HTTP ${started.status}）。`;
      }
      requestId = startJson.request_id;
      if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) { requestId = undefined; return 'Grok が受付 ID を返しませんでした。重複生成を避けるため、自動では再送しません。'; }
    }
    const folder = join(directory, 'addons-output');
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, `xai-video-${requestId}.json`), JSON.stringify({ requestId, checkedAt: new Date().toISOString() }), { mode: 0o600 });
    while (!signal.aborted) {
      if (signal?.aborted) throw signal.reason ?? new Error('aborted');
      const poll = await fetchImpl(`https://api.x.ai/v1/videos/${encodeURIComponent(requestId)}`, {
        method: 'GET', signal,
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const status = await poll.json().catch(() => ({}));
      if (!poll.ok) return resume(`動画の確認に失敗しました（HTTP ${poll.status}）。`);
      if (status.status === 'failed' || status.status === 'expired') {
        return `Grok の動画生成は${status.status === 'expired' ? '期限切れ' : '失敗'}になりました（requestId: ${requestId}）。`;
      }
      if (status.status === 'done') {
        const video = status.video ?? {};
        if (video.respect_moderation === false) return `Grok のコンテンツ判定により動画は提供されませんでした（requestId: ${requestId}）。`;
        const url = video.url;
        if (!url) return `動画の完了応答に URL がありません（requestId: ${requestId}）。`;
        try {
          const download = await fetchImpl(url, { signal });
          if (download.ok) {
            const bytes = Buffer.from(new Uint8Array(await download.arrayBuffer()));
            if (bytes.length > 0 && bytes.length <= MAX_VIDEO_BYTES) {
              const folder = join(directory, 'addons-output');
              await mkdir(folder, { recursive: true });
              const file = join(folder, `xai-video-${requestId}.mp4`);
              await writeFile(file, bytes);
              const r2 = await uploadGeneratedMedia({ credentials, store, file, contentType: 'video/mp4', signal, fetchImpl }).catch(() => ' R2 への保存は完了していません。ローカルの動画を利用できます。');
              return `動画を保存しました: ${file}（${video.duration ?? '?'} 秒、requestId: ${requestId}）${r2}`;
            }
          }
        } catch { /* keep the hosted URL if download fails */ }
        return `動画 URL: ${url}（${video.duration ?? '?'} 秒、requestId: ${requestId}）`;
      }
      await sleep(VIDEO_POLL_MS, signal);
    }
    return resume('動画の確認時間を超えました。');
  } catch {
    return requestId ? resume('動画の確認を中断しました。') : '動画の受付結果を確認できません。重複生成を避けるため、自動では再送しません。';
  }
}

export async function spotifyAction({ credentials, action, query, signal }) {
  const id = await credential(credentials, 'DARASK_SPOTIFY_CLIENT_ID');
  const secret = await credential(credentials, 'DARASK_SPOTIFY_CLIENT_SECRET');
  const refresh = await credential(credentials, 'DARASK_SPOTIFY_REFRESH_TOKEN');
  if (!id || !secret) return 'Set DARASK_SPOTIFY_CLIENT_ID and DARASK_SPOTIFY_CLIENT_SECRET in Settings → Plugins.';
  const token = refresh
    ? await spotifyToken({ grant_type: 'refresh_token', refresh_token: refresh, client_id: id, client_secret: secret, signal })
    : await spotifyToken({ grant_type: 'client_credentials', client_id: id, client_secret: secret, signal });
  if (token.error) return token.error;
  if (action === 'search') {
    const response = await fetch(`https://api.spotify.com/v1/search?type=track&limit=5&q=${encodeURIComponent(query || '')}`, { headers: { Authorization: `Bearer ${token.access_token}` }, signal });
    const body = await response.json();
    const tracks = (body.tracks?.items ?? []).map(item => `${item.name} — ${item.artists.map(artist => artist.name).join(', ')} (${item.uri})`);
    return tracks.length ? tracks.join('\n') : 'No tracks.';
  }
  if (!refresh) return 'Search works with client credentials. Playback needs DARASK_SPOTIFY_REFRESH_TOKEN from a user OAuth refresh token.';
  const player = action === 'status' ? 'GET' : 'PUT';
  const path = { status: '/me/player', play: '/me/player/play', pause: '/me/player/pause', next: '/me/player/next', previous: '/me/player/previous', queue: '/me/player/queue' }[action];
  if (!path) return `Unknown Spotify action: ${action}`;
  const method = action === 'next' || action === 'previous' ? 'POST' : player;
  const url = `https://api.spotify.com/v1${path}${action === 'queue' && query ? `?uri=${encodeURIComponent(query)}` : ''}`;
  const response = await fetch(url, { method: action === 'status' ? 'GET' : method, headers: { Authorization: `Bearer ${token.access_token}` }, signal });
  if (action === 'status') {
    if (response.status === 204) return 'No active Spotify device.';
    const body = await response.json();
    return `${body.item?.name ?? 'unknown'} — ${body.is_playing ? 'playing' : 'paused'}`;
  }
  if (!response.ok) return `Spotify ${action} failed (HTTP ${response.status}).`;
  return `Spotify ${action} ok.`;
}

async function spotifyToken({ signal, ...params }) {
  const body = new URLSearchParams(params);
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${params.client_id}:${params.client_secret}`).toString('base64')}` },
    body,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) return { error: `Spotify token failed (HTTP ${response.status}).` };
  return json;
}

export async function telegramAction({ credentials, action, text, chatId, signal }) {
  const token = await credential(credentials, 'DARASK_TELEGRAM_BOT_TOKEN');
  if (!token) return 'Set DARASK_TELEGRAM_BOT_TOKEN in Settings → Plugins.';
  if (action === 'inbox') {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=10`, { signal });
    const body = await response.json();
    if (!body.ok) return `Telegram inbox failed: ${body.description ?? 'unknown'}`;
    const lines = (body.result ?? []).map(item => `${item.message?.chat?.id}: ${item.message?.text ?? '(no text)'}`);
    return lines.length ? lines.join('\n') : 'No Telegram updates.';
  }
  if (!chatId) return 'Set a Telegram chat id in Settings → Plugins.';
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text || '' }),
  });
  const body = await response.json();
  return body.ok ? `Sent to ${chatId}.` : `Telegram send failed: ${body.description ?? 'unknown'}`;
}

export async function langfuseIngest({ credentials, host, events, signal }) {
  const publicKey = await credential(credentials, 'DARASK_LANGFUSE_PUBLIC_KEY');
  const secretKey = await credential(credentials, 'DARASK_LANGFUSE_SECRET_KEY');
  if (!publicKey || !secretKey) return 'Set Langfuse public and secret keys in Settings → Plugins.';
  const response = await fetch(`${host.replace(/\/$/, '')}/api/public/ingestion`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}` },
    body: JSON.stringify({ batch: events }),
  });
  if (!response.ok) return `Langfuse ingest failed (HTTP ${response.status}).`;
  return `Flushed ${events.length} Langfuse event(s).`;
}

export async function runSnyk({ cwd, credentials, signal }) {
  const token = await credential(credentials, 'DARASK_SNYK_TOKEN');
  const env = { ...process.env, ...(token ? { SNYK_TOKEN: token } : {}) };
  try {
    const { stdout } = await exec('snyk', ['test', '--json'], { cwd, env, signal, windowsHide: true, timeout: 120000 });
    return stdout.slice(0, 12000);
  } catch (error) {
    if (error.code === 'ENOENT') return 'Snyk CLI is not installed. Install https://docs.snyk.io/snyk-cli and retry.';
    return String(error.stdout || error.stderr || error.message).slice(0, 12000);
  }
}

export async function listBrowserProfiles() {
  const home = homedir();
  const roots = [
    join(process.env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'Google', 'Chrome', 'User Data'),
    join(process.env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'Microsoft', 'Edge', 'User Data'),
    join(home, 'Library', 'Application Support', 'Google', 'Chrome'),
    join(home, '.config', 'google-chrome'),
  ];
  const profiles = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    let entries = [];
    try { entries = await readdir(root, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const preferences = join(root, entry.name, 'Preferences');
      if (!existsSync(preferences)) continue;
      profiles.push({ browser: root.includes('Edge') ? 'Edge' : 'Chrome', name: entry.name, path: join(root, entry.name) });
    }
  }
  return profiles;
}

export async function modlens({ path, action, signal }) {
  const file = resolve(path);
  const info = await stat(file);
  if (!info.isFile()) return 'ModLens: path is not a file.';
  const kind = extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(kind) && action !== 'ui') {
    const text = await readFile(file, 'utf8').catch(() => '');
    return `ModLens text extract (${action}):\n${text.slice(0, 8000) || '(empty)'}`;
  }
  try {
    const { stdout } = await exec('tesseract', [file, 'stdout', '-l', 'jpn+eng'], { signal, windowsHide: true, timeout: 60000 });
    return `ModLens OCR (${action}):\n${stdout.trim() || '(no text)'}`;
  } catch (error) {
    if (error.code === 'ENOENT') return `ModLens: image ${file} (${info.size} bytes). Install Tesseract OCR to extract text for a text-only model.`;
    return `ModLens OCR failed: ${error.message}`;
  }
}

export async function writeTouchDesigner({ path, kind, name }) {
  const file = resolve(path);
  const script = kind === 'osc'
    ? `# TouchDesigner OSC starter generated by DARASK (hermes-touchdesigner fork)\nfrom pythonosc import udp_client\nclient = udp_client.SimpleUDPClient('127.0.0.1', 10000)\nclient.send_message('/${name || 'darask'}', [1])\n`
    : `# TouchDesigner Python DAT generated by DARASK\ndef onCook(scriptOp):\n    scriptOp.clear()\n    scriptOp.appendRow(['${name || 'darask'}', absTime.seconds])\n`;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, script);
  return `Wrote TouchDesigner ${kind} script to ${file}`;
}
