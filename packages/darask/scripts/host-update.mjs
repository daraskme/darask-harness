import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const at = process.argv.indexOf('--root');
if (at < 0 || !process.argv[at + 1]) { console.error('使い方: node host-update.mjs --root <DSH のフォルダー>'); process.exit(2); }
const root = resolve(process.argv[at + 1]);
const stamp = () => new Date().toISOString();
const say = message => console.log(`${stamp()} ${message}`);

const portFree = () => new Promise((done, fail) => {
  const socket = createConnection({ host: '127.0.0.1', port: 3080 });
  socket.once('connect', () => { socket.destroy(); done(false); });
  socket.once('error', error => error.code === 'ECONNREFUSED' ? done(true) : fail(error));
  socket.setTimeout(3000, () => { socket.destroy(); fail(new Error('ポート 3080 の状態を確認できません。')); });
});

say(`dsh-darask の配布を適用します。DSH (port 3080) の終了を待っています… root=${root}`);
const deadline = Date.now() + 5 * 60 * 1000;
let free = false;
while (!free && Date.now() < deadline) {
  try { free = await portFree(); }
  catch (error) { say(`ポート確認で失敗: ${error.message}`); }
  if (!free) await new Promise(done => setTimeout(done, 500));
}
if (!free) { say('DSH が終了しませんでした。手動で node start-dsh.mjs を実行してください。'); process.exit(3); }
// Let the exiting process fully release files on Windows before npm install.
await new Promise(done => setTimeout(done, 3000));
say('DSH の終了を確認しました。インストーラーを実行します。');
const result = spawnSync(process.execPath, [join(here, 'setup-dsh-host.mjs'), '--root', root], { cwd: here, env: process.env, stdio: 'inherit', windowsHide: true });
if (result.error) { say(`インストーラーを起動できませんでした: ${result.error.message}`); process.exit(4); }
say(result.status === 0 ? '配布を適用し、DSH を起動しました。' : `インストーラーが終了コード ${result.status} で停止しました。update.log と dsh.err.log を確認してください。`);
process.exit(result.status ?? 5);
