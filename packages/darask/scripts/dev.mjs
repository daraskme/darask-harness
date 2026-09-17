import { spawn, spawnSync } from 'node:child_process';
import { watch, existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, copyFile, realpath } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createConnection } from 'node:net';
import { createTailscale } from '../src/tailscale.mjs';
import { createDevelopmentControl, serveDevelopmentControl } from './development-control.mjs';

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);
const args = process.argv.slice(2), at = args.indexOf('--dsh-root');
if (at >= 0 && !args[at + 1]) throw new Error('--dsh-root の後に DSH のフォルダーを指定してください。');
const root = resolve(at < 0 ? join(homedir(), 'Documents', 'Codex', 'DSH') : args[at + 1]);
const data = join(root, 'data'), profile = join(data, 'profiles/web');
const git = spawnSync('git', ['-c', `safe.directory=${packageRoot.replaceAll('\\', '/')}`, 'rev-parse', '--show-toplevel'], { cwd: packageRoot, encoding: 'utf8', shell: false, windowsHide: true });
const toplevel = git.status === 0 ? resolve(git.stdout.trim()) : '';
// Inside a darask-harness checkout the harness root is the plugin package DSH
// loads; a standalone dsh-darask checkout links itself.
const harness = toplevel && toplevel !== packageRoot && await readFile(join(toplevel, 'package.json'), 'utf8').then(text => JSON.parse(text).name === 'darask-harness', () => false);
const source = harness ? toplevel : packageRoot;
const linkedName = harness ? 'darask-harness' : 'dsh-darask';
if (!toplevel || toplevel !== source) throw new Error('Git で管理している dsh-darask または darask-harness のチェックアウトから起動してください。');
if (process.platform === 'win32' && /[&|<>^%!\r\n"]/.test(source)) throw new Error('開発ソースは記号を含まないフォルダーへ置いてください。');
const rel = path => relative(source, join(packageRoot, path)).replaceAll('\\', '/');
await new Promise((done, fail) => {
  const socket = createConnection({ host: '127.0.0.1', port: 3080 });
  socket.once('connect', () => { socket.destroy(); fail(new Error('DSH が起動中です。終了してから開発モードを起動してください。')); });
  socket.once('error', error => error.code === 'ECONNREFUSED' ? done() : fail(error));
  socket.setTimeout(3000, () => { socket.destroy(); fail(new Error('ポート 3080 を確認できません。')); });
});
const logs = join(data, 'darask'); await mkdir(logs, { recursive: true });
const env = { ...process.env, DSH_HOME: data, PATH: `${join(process.execPath, '..')}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH || ''}` };
const bin = join(require.resolve('@deepseek-ai/dsh/package.json'), '..', 'lib/bin.js');
const desired = `link:${source.replaceAll('\\', '/')}`;
let configured;
try { configured = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
let linked = false;
try { linked = await realpath(join(profile, 'node_modules', linkedName)) === await realpath(source); } catch {}
if (configured?.dependencies?.[linkedName] !== desired || !linked) {
  const backup = join(logs, 'development-backups', new Date().toISOString().replaceAll(':', '-')); await mkdir(backup, { recursive: true });
  for (const name of ['package.json', 'pnpm-lock.yaml', 'cordis.patch.yml']) if (existsSync(join(profile, name))) await copyFile(join(profile, name), join(backup, name));
  const spec = process.platform === 'win32' ? `link:"${source}"` : desired;
  await new Promise((done, fail) => {
    const child = spawn(process.execPath, [bin, 'plugin', '--profile', 'web', 'add', spec], { cwd: source, env, stdio: 'inherit', shell: false, windowsHide: true });
    child.once('error', fail); child.once('exit', code => code === 0 ? done() : fail(new Error('開発用ソースの登録に失敗しました。')));
  });
}
const overlay = join(logs, 'development.patch.json');
await writeFile(overlay, JSON.stringify([
  { id: 'hmr', disabled: false, config: { base: pathToFileURL(source).href.replace(/\/?$/, '/'), root: [...harness ? ['src', 'packages/dsh-hashline/src', 'packages/dsh-memory/src', 'packages/dsh-rules/src', 'packages/dsh-status-line/src'] : [], rel('src'), rel('vendor/dsh-bridge-gateway/lib'), rel('vendor/dsh-grok-provider/src')], ignored: ['**/node_modules/**', '**/.*', '**/*.tmp'], debounce: 200 } },
  { id: 'client-hmr', config: { pollIntervalMs: 100 } },
], null, 2));
await writeFile(join(logs, 'development.json'), JSON.stringify({ source, packageRoot, entry: fileURLToPath(import.meta.url), profile: 'web', git: true }, null, 2));
function run(script, args = [], cwd = packageRoot) {
  return new Promise((done, fail) => {
    const processChild = spawn(process.execPath, [script, ...args], { cwd, env, stdio: 'inherit', shell: false, windowsHide: true });
    processChild.once('error', fail); processChild.once('exit', code => code === 0 ? done() : fail(new Error('コマンドに失敗しました。起動ログを確認してください。')));
  });
}
const build = () => run(join(packageRoot, 'scripts/build.mjs'));
let timer, building = Promise.resolve(), disposed = false, control, child, restarting = false;
const rebuild = () => {
  building = building.catch(() => {}).then(async () => {
    if (disposed || control?.busy) return;
    try { await build(); console.log('DARASK: UI を反映しました。ブラウザーを再読み込みできます。'); }
    catch { console.error('DARASK: ビルドに失敗しました。直前の UI を維持しています。表示されたエラーを修正して保存してください。'); }
  });
};
const watchers = [join(packageRoot, 'src'), join(packageRoot, 'vendor/dsh-bridge-gateway/client'), join(packageRoot, 'vendor/dsh-grok-provider/src')].map(directory => watch(directory, { recursive: true }, (_event, filename) => {
  const name = String(filename ?? '').replaceAll('\\', '/');
  if (!/\.(?:js|jsx|mjs|ts|tsx|css)$/.test(name) || directory.endsWith('/client') && name === 'client.js' || directory.endsWith('\\client') && name === 'client.js') return;
  clearTimeout(timer); timer = setTimeout(rebuild, 120);
}));
await build();
console.log(`DARASK 開発モード: ${source}`);
console.log('Git 管理中のソースを編集して保存すると反映されます。コミット・push は自動では実行しません。');
const tailscale = createTailscale({ directory: logs });
const network = await tailscale.status(); await tailscale.dispose();
const launchArgs = [bin, '--profile', 'web', '--patch', overlay, '--host', '127.0.0.1', '--port', '3080', '--no-open'];
if (network.dnsName) launchArgs.push('--trusted-host', `${network.dnsName}:8443`);
async function stopChild() {
  restarting = true; clearTimeout(timer); await building.catch(() => {});
  const previous = child;
  if (!previous || previous.exitCode !== null) return;
  await new Promise((done, fail) => {
    const timeout = setTimeout(() => fail(new Error('終了を確認できないため、ソースの更新を停止しました。')), 15000);
    previous.once('exit', () => { clearTimeout(timeout); done(); });
    if (process.platform === 'win32') {
      const result = spawnSync('taskkill.exe', ['/PID', String(previous.pid), '/T', '/F'], { stdio: 'ignore', shell: false, windowsHide: true });
      if (result.status !== 0) { clearTimeout(timeout); fail(new Error('終了できないため、ソースの更新を停止しました。')); }
    }
    else previous.kill('SIGTERM');
  });
}
async function startChild() {
  if (disposed) return;
  restarting = false;
  child = spawn(process.execPath, launchArgs, { cwd: source, env: { ...env, ...controller.env }, stdio: 'inherit', shell: false, windowsHide: true });
  child.once('error', error => { console.error(error.message); close(); process.exitCode = 1; });
  child.once('exit', code => { if (!restarting) { close(); process.exitCode = code ?? 1; } });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error('起動に失敗しました。DSH の起動ログを確認してください。');
    try {
      const response = await fetch('http://127.0.0.1:3080/', { signal: AbortSignal.timeout(500), redirect: 'manual' });
      await response.body?.cancel();
      if (response.status < 500) return;
    } catch {}
    await new Promise(done => setTimeout(done, 500));
  }
  throw new Error('起動の完了を確認できません。DSH の起動ログを確認してください。');
}
control = createDevelopmentControl({ source: packageRoot, build: async () => { clearTimeout(timer); await building.catch(() => {}); await build(); }, stop: stopChild, start: startChild, install: async () => {
  const npm = [join(process.execPath, '../node_modules/npm/bin/npm-cli.js'), resolve(process.execPath, '../../lib/node_modules/npm/bin/npm-cli.js'), '/opt/homebrew/lib/node_modules/npm/bin/npm-cli.js', '/usr/local/lib/node_modules/npm/bin/npm-cli.js'].find(existsSync);
  if (!npm) throw new Error('Node.js に付属する npm が見つかりません。');
  await run(npm, ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], source);
  await run(npm, ['rebuild', '@deepseek-ai/dsh-subprocess-local', 'koffi', 'node-pty', 'esbuild'], source);
} });
const controller = await serveDevelopmentControl(control);
const close = () => {
  if (disposed) return; disposed = true; clearTimeout(timer); watchers.forEach(watcher => watcher.close()); controller.close();
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', shell: false, windowsHide: true });
  else child.kill('SIGTERM');
};
process.on('SIGINT', close); process.on('SIGTERM', close);
try { await startChild(); } catch (error) { console.error(error.message); close(); process.exitCode = 1; }
