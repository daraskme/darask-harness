// Portable installer for the user's Windows and Mac PCs. Run beside the tgz.
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { existsSync, openSync, closeSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 24 || major === 24 && minor < 19) throw new Error('Node.js 24.19 以降を導入してください。');
const argv = process.argv.slice(2);
const at = argv.indexOf('--root');
const root = path.resolve(at < 0 ? path.join(homedir(), 'Documents', 'Codex', 'DSH') : argv[at + 1]);
if ([homedir(), path.parse(root).root].includes(root)) throw new Error('DSH 専用のフォルダーを指定してください。');
const archives = (await readdir(here)).filter(name => /^darask-harness-[0-9a-z.+-]+\.tgz$/.test(name));
if (archives.length !== 1) throw new Error('このスクリプトと同じフォルダーに darask-harness の tgz を一つ置いてください。');
const app = path.join(root, 'app'), data = path.join(root, 'data'), packages = path.join(root, 'packages');
const npmPaths = process.platform === 'win32'
  ? [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')]
  : [path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'), '/opt/homebrew/lib/node_modules/npm/bin/npm-cli.js', '/usr/local/lib/node_modules/npm/bin/npm-cli.js'];
const npm = npmPaths.find(existsSync);
if (!npm) throw new Error('Node.js に付属する npm が見つかりません。Node.js の標準インストールを確認してください。');
await new Promise((resolve, reject) => {
  const socket = createConnection({ host: '127.0.0.1', port: 3080 });
  socket.once('connect', () => { socket.destroy(); reject(new Error('DSH が起動中です。終了してから導入してください。')); });
  socket.once('error', error => error.code === 'ECONNREFUSED' ? resolve() : reject(error));
  socket.setTimeout(3000, () => { socket.destroy(); reject(new Error('ポート 3080 の状態を確認できません。')); });
});
let manifest = { name: 'darask-harness-app', private: true, version: '1.0.0', type: 'module' };
if (existsSync(path.join(data, 'darask/development.json'))) throw new Error('この DSH は Git の開発モードです。DSH の「設定 → 開発・更新」から更新してください。');
try { manifest = JSON.parse(await readFile(path.join(app, 'package.json'), 'utf8')); if (manifest.name !== 'darask-harness-app') throw new Error('導入先には別のアプリがあります。'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await mkdir(app, { recursive: true }); await mkdir(packages, { recursive: true });
// A content-addressed file path makes npm and pnpm refresh rebuilt archives,
// including an unreleased alpha that retains its package version.
const digest = createHash('sha256').update(await readFile(path.join(here, archives[0]))).digest('hex').slice(0, 16);
const archiveName = archives[0].replace(/\.tgz$/, `-${digest}.tgz`);
const archive = path.join(packages, archiveName);
if (archive !== path.join(here, archives[0])) await copyFile(path.join(here, archives[0]), archive);
manifest.dependencies = { ...manifest.dependencies, '@deepseek-ai/dsh': '0.1.5-rc.2', 'darask-harness': `file:../packages/${archiveName}` };
manifest.scripts = { ...manifest.scripts, start: 'node node_modules/darask-harness/scripts/start.mjs --no-open' };
manifest.allowScripts = { ...manifest.allowScripts, '@deepseek-ai/dsh-subprocess-local@0.1.5-rc.2': true, 'koffi@3.2.1': true, 'node-pty@1.2.0-beta.15': true };
await writeFile(path.join(app, 'package.json'), JSON.stringify(manifest, null, 2));
const env = { ...process.env, DSH_HOME: data, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ''}` };
async function run(script, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: app, env, stdio: 'inherit', shell: false, windowsHide: true });
    child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error(`導入コマンドが終了コード ${code} で停止しました。`)));
  });
}
console.log('DSH と DARASK を導入します。モデルはダウンロードしません。');
await run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund']);
await run(npm, ['rebuild', '@deepseek-ai/dsh-subprocess-local', 'koffi', 'node-pty']);
const bin = path.join(app, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
let profile;
try { profile = JSON.parse(await readFile(path.join(data, 'profiles/web/package.json'), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
if (profile?.dependencies?.['darask-harness']) await run(bin, ['plugin', '--profile', 'web', 'remove', 'darask-harness']);
await run(bin, ['plugin', '--profile', 'web', 'add', archive]);
const launcher = path.join(root, 'start-dsh.mjs');
const entry = path.join(app, 'node_modules/darask-harness/scripts/start.mjs');
const { writeInstalledLauncher } = await import(pathToFileURL(path.join(app, 'node_modules/darask-harness/scripts/installed-launcher.mjs')));
await writeInstalledLauncher(root);
const logs = path.join(data, 'darask'); await mkdir(logs, { recursive: true });
const stdout = openSync(path.join(logs, 'dsh.out.log'), 'w'), stderr = openSync(path.join(logs, 'dsh.err.log'), 'w');
const child = spawn(process.execPath, [entry, '--no-open'], { cwd: app, env, detached: true, windowsHide: true, stdio: ['ignore', stdout, stderr] });
child.unref(); closeSync(stdout); closeSync(stderr);
await writeFile(path.join(logs, 'dsh.pid.json'), JSON.stringify({ pid: child.pid, entry }));
let url;
for (let attempt = 0; attempt < 120; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 500));
  const text = await readFile(path.join(logs, 'dsh.out.log'), 'utf8');
  url = text.match(/dsh web: (http:\/\/127\.0\.0\.1:3080\/\?token=[A-Za-z0-9_-]+)/)?.[1];
  if (url) break;
}
if (!url) throw new Error(`起動ログを確認してください: ${logs}`);
const { createTailscale } = await import(pathToFileURL(path.join(app, 'node_modules/darask-harness/src/tailscale.mjs')));
const tailscale = createTailscale({ directory: logs });
let tail = await tailscale.status();
if (tail.connected) {
  try { tail = await tailscale.action('serveEnable'); }
  catch { console.log('Tailscale Serve を有効にし、設定 → アカウント → PC・Tailscaleで共有を開始してください。'); }
}
await tailscale.dispose();
console.log(`この PC の DSH: ${url}`);
if (tail.serve === 'on') {
  const shared = url.replace('http://127.0.0.1:3080', `https://${tail.dnsName}:8443`);
  console.log(`他の PC から開く: ${shared}`);
  const requirePlugin = createRequire(path.join(app, 'node_modules/darask-harness/package.json'));
  const qrFile = path.join(root, 'connection-qr.png');
  await requirePlugin('qrcode').toFile(qrFile, shared, { errorCorrectionLevel: 'M', width: 720, margin: 4 });
  console.log(`この PC の接続 QR: ${qrFile}`);
}
console.log('ハブの「設定 → アカウント → PC・Tailscale → PC の接続 → QR で PC を追加」で読み取り、接続を確認して保存してください。');
console.log('この PC の DSH でも「この PC の QR を表示」から最新の QR を表示できます。');
console.log(`再起動: node "${launcher}"`);
