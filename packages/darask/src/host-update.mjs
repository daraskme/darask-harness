// ハブの更新を登録済みの各 PC に配布する。
// - この PC 側: /api/darask/host-update が届いた tgz を検証・配置し、
//   切り離した scripts/host-update.mjs が DSH 終了後に setup-dsh-host.mjs を実行する。
// - ハブ側: packArchive で配布物を作成し、distributeToNodes が各 PC へ送る。
//   Git 開発モードの PC は自身の「開発・更新」ルートに update を依頼する。
import { execFile, spawn } from 'node:child_process';
import { existsSync, openSync, closeSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, copyFile, writeFile, stat, rename } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { publicOrigin } from './http.mjs';

const MAX_ARCHIVE = 64 * 1024 * 1024;
const scriptsDir = fileURLToPath(new URL('../scripts/', import.meta.url));
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const safeError = error => /^[ぁ-んァ-ヶ一-龯]/.test(error.message || '') ? error.message : '更新を適用できませんでした。相手 PC の DSH と Tailscale の状態を確認してください。';

/** tar.gz から単一のエントリを取り出す（ustar の最小限リーダー）。 */
export function readTgzEntry(buffer, name) {
  const tar = gunzipSync(Buffer.from(buffer), { maxOutputLength: 256 * 1024 * 1024 });
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (!header.some(byte => byte !== 0)) break;
    const entryName = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    const fullName = prefix ? `${prefix}/${entryName}` : entryName;
    const size = Number.parseInt(header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim() || '0', 8);
    if (!Number.isFinite(size) || size < 0 || offset + 512 + size > tar.length) throw new Error('配布パッケージを読み取れません。');
    if (fullName === name) return tar.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return null;
}

/** 導入型レイアウト（root/app + root/data + root/packages）なら root を返す。 */
export async function installedRoot(dshHome = resolveDshHome()) {
  const root = dirname(dshHome);
  if (existsSync(join(dshHome, 'darask', 'development.json'))) return { devMode: true };
  try {
    const manifest = JSON.parse(await readFile(join(root, 'app', 'package.json'), 'utf8'));
    if (manifest.name !== 'darask-dsh-app' || manifest.dependencies?.['dsh-darask'] === undefined) return {};
  } catch { return {}; }
  return { root };
}

export async function installedArchive(dshHome = resolveDshHome()) {
  const layout = await installedRoot(dshHome);
  if (!layout.root) return null;
  const manifest = JSON.parse(await readFile(join(layout.root, 'app', 'package.json'), 'utf8'));
  const spec = manifest.dependencies['dsh-darask'];
  const match = /^file:\.\.\/packages\/(dsh-darask-[0-9a-z.+-]+\.tgz)$/.exec(spec);
  if (!match) throw new Error('導入元の配布パッケージを確認してください。');
  const bytes = await readFile(join(layout.root, 'packages', match[1]));
  const info = JSON.parse(readTgzEntry(bytes, 'package/package.json').toString('utf8'));
  return { name: match[1], bytes, version: info.version, sha256: createHash('sha256').update(bytes).digest('hex').slice(0, 16) };
}

async function writeJson(file, value) {
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(tmp, file);
}

/** この PC 用: ハブから届いたパッケージを検証して配置し、更新ランナーを起動して終了する。 */
export function createHostUpdateRoutes({ directory, hostId, dshHome, spawnImpl = spawn, execPath = process.execPath, exit = code => process.exit(code), exitDelayMs = 800, env = process.env } = {}) {
  let accepting = false;
  return [{ path: '/api/darask/host-update', methods: ['POST'], requestBody: 'streaming', async fetch(request) {
    if (accepting) return json({ error: '更新の適用を開始しています。' }, 409);
    accepting = true;
    let accepted = false, marked = false;
    const flagFile = join(directory, 'distribute-pending.json');
    try {
      if (!request.headers.get('origin')) return json({ error: '画面から操作してください。' }, 403);
      publicOrigin(request);
      const url = new URL(request.url);
      const expected = url.searchParams.get('expectedHost');
      const selfId = hostId?.();
      if (!selfId || expected !== selfId) return json({ error: '選択した PC と接続先が一致しません。' }, 400);
      const layout = await installedRoot(dshHome);
      if (layout.devMode) return json({ devMode: true, error: 'この PC は Git の開発モードです。開発・更新から更新してください。' }, 400);
      if (!layout.root) return json({ error: 'この PC は配布による更新に対応していません。setup-dsh-host.mjs で導入した構成のみ対象です。' }, 400);
      if (Number(request.headers.get('content-length')) > MAX_ARCHIVE) return json({ error: '配布パッケージが大きすぎます。' }, 413);
      const chunks = [];
      let length = 0;
      if (request.body) for await (const chunk of request.body) {
        length += chunk.length;
        if (length > MAX_ARCHIVE) return json({ error: '配布パッケージが大きすぎます。' }, 413);
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      if (body.length < 2 || body[0] !== 0x1f || body[1] !== 0x8b) return json({ error: '配布パッケージの形式を確認してください。' }, 400);
      let manifest;
      try { manifest = JSON.parse(readTgzEntry(body, 'package/package.json').toString('utf8')); }
      catch { return json({ error: '配布パッケージの内容を確認できません。' }, 400); }
      if (manifest?.name !== 'dsh-darask' || !/^[0-9]+\.[0-9]+\.[0-9]+[0-9a-z.+-]*$/.test(manifest.version ?? '')) return json({ error: 'dsh-darask のパッケージではありません。' }, 400);
      const staging = join(directory, 'update');
      await rm(staging, { recursive: true, force: true });
      await mkdir(staging, { recursive: true });
      await writeFile(join(staging, `dsh-darask-${manifest.version}.tgz`), body, { mode: 0o600 });
      for (const name of ['setup-dsh-host.mjs', 'host-update.mjs']) await copyFile(join(scriptsDir, name), join(staging, name));
      await writeJson(flagFile, { kind: 'package', propagate: false });
      marked = true;
      const log = openSync(join(staging, 'update.log'), 'a');
      try {
        const child = spawnImpl(execPath, [join(staging, 'host-update.mjs'), '--root', layout.root], { cwd: staging, env, detached: true, windowsHide: true, stdio: ['ignore', log, log] });
        await new Promise((done, fail) => { child.once('spawn', done); child.once('error', fail); });
        child.unref();
      } finally { closeSync(log); }
      accepted = true;
      const timer = setTimeout(() => exit(0), exitDelayMs);
      timer.unref?.();
      return json({ accepted: true, version: manifest.version, sha256: createHash('sha256').update(body).digest('hex').slice(0, 16) });
    } catch (error) {
      return json({ error: safeError(error) }, 400);
    } finally {
      if (!accepted) {
        if (marked) await rm(flagFile, { force: true });
        accepting = false;
      }
    }
  } }];
}

const npmCliPaths = execPath => [
  join(dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  resolve(execPath, '..', '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  '/opt/homebrew/lib/node_modules/npm/bin/npm-cli.js',
  '/usr/local/lib/node_modules/npm/bin/npm-cli.js',
];

const runProcess = (execPath, script, args, cwd) => new Promise((resolve, reject) => {
  execFile(execPath, [script, ...args], { cwd, windowsHide: true, shell: false, timeout: 600000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) reject(new Error(String(stderr || stdout || error.message).slice(-2000).trim() || error.message));
    else resolve(stdout);
  });
});

export async function packArchive({ source, directory = join(resolveDshHome(), 'darask', 'packages'), build = true, execPath = process.execPath } = {}) {
  const npm = npmCliPaths(execPath).find(existsSync);
  if (!npm) throw new Error('Node.js に付属する npm が見つかりません。');
  if (build) await runProcess(execPath, join(source, 'scripts', 'build.mjs'), [], source);
  await mkdir(directory, { recursive: true });
  const staging = await mkdtemp(join(directory, 'pack-'));
  try {
    const output = await runProcess(execPath, npm, ['pack', '--ignore-scripts', '--pack-destination', staging], source);
    const name = output.trim().split('\n').at(-1).trim();
    if (!/^dsh-darask-[0-9a-z.+-]+\.tgz$/.test(name)) throw new Error('配布パッケージを作成できませんでした。');
    const file = join(staging, name);
    if ((await stat(file)).size > MAX_ARCHIVE) throw new Error('配布パッケージが大きすぎます。');
    const bytes = await readFile(file);
    const manifest = JSON.parse(readTgzEntry(bytes, 'package/package.json').toString('utf8'));
    return { name, bytes, version: manifest.version, sha256: createHash('sha256').update(bytes).digest('hex').slice(0, 16) };
  } finally { await rm(staging, { recursive: true, force: true }); }
}

/** ハブ用: 一台の PC に配布する。開発モードの PC は自身の更新を実行し、それ以外はパッケージを送る。 */
async function distributeToNode({ node, remote, archive, fetchImpl, signal }) {
  const base = { node: node.id, name: node.name };
  const headers = { 'Content-Type': 'application/json', Origin: remote.node.url, Cookie: remote.cookie };
  const deadline = ms => signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms);
  try {
    const probe = await fetchImpl(`${remote.node.url}/api/darask/development`, { method: 'POST', headers, body: '{"action":"status"}', redirect: 'error', signal: deadline(15000) });
    const status = await probe.json().catch(() => ({}));
    if (probe.ok && status.available) {
      const response = await fetchImpl(`${remote.node.url}/api/darask/development`, { method: 'POST', headers, body: JSON.stringify({ action: 'update', expectedHost: remote.host.id, propagate: false }), redirect: 'error', signal: deadline(20000) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.error || !result.accepted) throw new Error(result.error || '接続先で更新を開始できませんでした。');
      return { ...base, ok: true, kind: 'dev', message: '開発モードの更新を開始しました。' };
    }
    if (!archive) {
      return { ...base, ok: false, kind: 'push', message: '配布パッケージを作成できませんでした。' };
    }
    if (archive.sha256 && remote.host.releaseDigest === archive.sha256) return { ...base, ok: true, kind: 'skip', message: '同じ配布パッケージが導入済みです。' };
    const response = await fetchImpl(`${remote.node.url}/api/darask/host-update?expectedHost=${encodeURIComponent(remote.host.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Origin: remote.node.url, Cookie: remote.cookie }, body: archive.bytes, redirect: 'error', signal: deadline(60000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error || result.accepted !== true) throw new Error(result.error || '接続先で配布を受け付けませんでした。');
    return { ...base, ok: true, kind: 'push', message: `v${result.version} を適用して再起動します。` };
  } catch (error) {
    return { ...base, ok: false, message: safeError(error) };
  }
}

/** ハブ用: 登録済みの全 PC に配布し、結果を返す。archive が null なら開発モードの PC のみ対象。 */
export async function distributeToNodes({ hub, archive, fetchImpl = globalThis.fetch, signal } = {}) {
  const nodes = hub.listNodes();
  const results = [];
  for (const node of nodes) {
    signal?.throwIfAborted();
    try {
      const remote = await hub.remoteConnection(node.id);
      results.push(await distributeToNode({ node, remote, archive, fetchImpl, signal }));
    } catch (error) {
      results.push({ node: node.id, name: node.name, ok: false, message: safeError(error) });
    }
  }
  return results;
}

export function createDistribution({ directory, hub, version, dshHome, env = process.env, fetchImpl = globalThis.fetch, pack = packArchive, readInstalled = () => installedArchive(dshHome), log = () => {} } = {}) {
  const flagFile = join(directory, 'distribute-pending.json');
  const statusFile = join(directory, 'distribute-status.json');
  const seenFile = join(directory, 'distribute-seen.json');
  let job = null, last, watching, disposed = false;
  const controller = new AbortController();
  const readJson = async file => { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return undefined; } };
  const devControl = async input => {
    if (!env.DARASK_DEV_CONTROL_URL || !env.DARASK_DEV_CONTROL_TOKEN) return null;
    const response = await fetchImpl(env.DARASK_DEV_CONTROL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DARASK_DEV_CONTROL_TOKEN}` }, body: JSON.stringify(input), signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  };
  const devSettled = async () => {
    const deadline = Date.now() + 5 * 60 * 1000;
    while (!disposed && Date.now() < deadline) {
      const status = await devControl({ action: 'status' }).catch(() => null);
      if (!status) return null;
      if (status.job?.phase !== 'running') return status;
      await delay(2000, undefined, { signal: controller.signal });
    }
    return null;
  };
  const run = (state, reason) => {
    if (disposed) throw new Error('配布サービスが終了しています。');
    if (job?.phase === 'running') return { accepted: true, job };
    job = { action: 'distribute', phase: 'running', message: '配布パッケージを作成しています…', startedAt: Date.now() };
    const current = job;
    (async () => {
      const archive = state?.available ? await pack({ source: state.source, directory: join(directory, 'packages') }) : await readInstalled();
      if (!archive) throw new Error('Git の開発モード、または配布インストーラーで導入した DSH から実行してください。');
      if (disposed) return;
      current.message = '各 PC に送っています…';
      const results = await distributeToNodes({ hub, archive, fetchImpl, signal: controller.signal });
      if (disposed) return;
      last = { at: new Date().toISOString(), version: archive?.version ?? version, reason, results };
      await writeJson(statusFile, last);
      await rm(flagFile, { force: true });
      const failed = results.filter(r => !r.ok);
      Object.assign(current, { phase: failed.length ? 'error' : 'done', results,
        message: failed.length ? `${failed.length} 台の PC に配布できませんでした。接続と相手 PC の DSH 更新を確認してください。` : `${results.length} 台の PC への更新依頼が完了しました。` });
    })().catch(async error => {
      if (disposed) return;
      Object.assign(current, { phase: 'error', message: safeError(error) });
      log(`dsh-darask: ${current.message}`);
      last = { at: new Date().toISOString(), version, reason, results: [], error: current.message };
      await writeJson(statusFile, last).catch(() => {});
      await rm(flagFile, { force: true }).catch(() => {});
    });
    return { accepted: true, job: current };
  };
  const resume = () => {
    if (watching) return watching;
    watching = (async () => {
      last = await readJson(statusFile);
      const pending = await readJson(flagFile);
      const settled = await devSettled();
      if (disposed) return;
      if (pending?.kind === 'dev') {
        if (!settled) return;
        if (settled.job?.action !== 'update' || settled.job.phase !== 'done') {
          if (settled.head) await writeJson(seenFile, { revision: settled.head });
          await rm(flagFile, { force: true });
          return;
        }
      }
      const installed = settled?.available ? null : await readInstalled();
      const revision = settled?.available ? settled.head : installed?.sha256;
      const seen = await readJson(seenFile);
      if (revision) await writeJson(seenFile, { revision });
      if (pending?.propagate === false) {
        await rm(flagFile, { force: true });
        return;
      }
      if (pending || (seen && revision && seen.revision !== revision)) {
        if (hub.listNodes().length) {
          await writeJson(flagFile, { kind: 'distribution', propagate: true });
          run(settled, pending ? 'update' : 'version');
        }
        else await rm(flagFile, { force: true });
      }
    })().finally(() => { watching = null; });
    return watching;
  };
  return {
    get busy() { return job?.phase === 'running'; },
    async status() { last ??= await readJson(statusFile); return { nodes: hub.listNodes().length, pending: existsSync(flagFile), job, last }; },
    async markPending(propagate = true) { await writeJson(flagFile, { kind: 'dev', propagate, at: new Date().toISOString() }); },
    async clearPending() { await rm(flagFile, { force: true }); },
    resume,
    dispose() { disposed = true; controller.abort(); },
    async request() {
      const status = await devControl({ action: 'status' });
      if (status?.job?.phase === 'running') throw new Error('他の処理が終わるまでお待ちください。');
      await writeJson(flagFile, { kind: 'distribution', propagate: true });
      return run(status, 'manual');
    },
  };
}
