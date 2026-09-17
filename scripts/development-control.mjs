import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, join, relative, sep, isAbsolute } from 'node:path';

const execute = promisify(execFile);
const official = 'https://github.com/daraskme/darask-harness.git';
const officialRemotes = new Set(['darask-harness'].flatMap(repo => [
  `https://github.com/daraskme/${repo}.git`, `https://github.com/daraskme/${repo}`, `git@github.com:daraskme/${repo}.git`,
]));
const canonical = async path => realpath(resolve(path)).catch(() => resolve(path));
function isWithin(parent, child) {
  const fold = path => process.platform === 'win32' ? path.toLowerCase() : path;
  const relation = relative(fold(parent), fold(child));
  return relation === '' || relation !== '..' && !relation.startsWith(`..${sep}`) && !isAbsolute(relation);
}
export function createDevelopmentControl({ source, build, stop, start, install, expectedRemote = official }) {
  let job = null;
  const git = async (...args) => (await execute('git', ['--no-optional-locks', '-c', `safe.directory=${source.replaceAll('\\', '/')}`, '-c', 'core.quotepath=false', ...args], {
    cwd: source, windowsHide: true, shell: false, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
  })).stdout.trimEnd();
  async function inspect() {
    const toplevel = await canonical(await git('rev-parse', '--show-toplevel'));
    if (!isWithin(toplevel, await canonical(source))) throw new Error('開発用の Git フォルダーを確認してください。');
    const [branch, head, changes, remote, version] = await Promise.all([
      git('branch', '--show-current'), git('rev-parse', 'HEAD'), git('status', '--porcelain=v1'),
      git('remote', 'get-url', 'origin').catch(() => ''), readFile(join(source, 'package.json'), 'utf8').then(text => JSON.parse(text).version),
    ]);
    let ahead = null, behind = null;
    try { [ahead, behind] = (await git('rev-list', '--left-right', '--count', 'HEAD...refs/remotes/origin/main')).split(/\s+/).map(Number); } catch {}
    const recognized = remote === expectedRemote || expectedRemote === official && officialRemotes.has(remote);
    return { available: true, source, toplevel, branch, head, version, changes: changes ? changes.split('\n') : [], dirty: Boolean(changes), ahead, behind, remoteReady: recognized, job };
  }
  async function eligible() {
    const state = await inspect();
    if (state.dirty) throw new Error('未コミットの編集があります。DSH のワークスペースで確認・コミットしてから更新してください。');
    if (!state.remoteReady || state.branch !== 'main') throw new Error('更新には daraskme/darask-harness の origin と main ブランチを使用してください。');
    return state;
  }
  async function operation(action) {
    if (action === 'check') {
      if (!(await inspect()).remoteReady) throw new Error('GitHub の接続先を確認してください。');
      await git('fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main');
      return 'GitHub の最新版を確認しました。';
    }
    if (action === 'build') { await build(); return '編集を反映しました。画面を再読み込みしてください。'; }
    if (action === 'restart') {
      await stop();
      await start();
      return 'DSH を再起動しました。画面を再読み込みしてください。';
    }
    if (action === 'update') {
      await eligible();
      await git('fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main');
      const before = await eligible();
      const target = await git('rev-parse', 'refs/remotes/origin/main');
      if (before.head === target || before.behind === 0) return 'このブランチは最新版です。';
      try { await git('merge-base', '--is-ancestor', before.head, target); } catch { throw new Error('ローカルと GitHub の履歴が分岐しています。ワークスペースで確認してください。'); }
      const dependencies = (await git('diff', '--name-only', before.head, target, '--', 'package.json', ':/package.json', ':/package-lock.json')).length > 0;
      await stop();
      try {
        // Check again after stopping, before changing the checkout. Never reset,
        // stash, force-pull or commit the user's edits.
        const latest = await eligible();
        if (latest.head !== before.head) throw new Error('更新中に Git の状態が変わりました。もう一度確認してください。');
        await git('-c', 'core.hooksPath=/dev/null', 'merge', '--ff-only', '--no-edit', target);
        if (dependencies) await install();
        await build();
      } finally { await start(); }
      return 'GitHub の最新版を反映し、DSH を再起動しました。画面を再読み込みしてください。';
    }
    throw new Error('開発操作を確認してください。');
  }
  async function action(input) {
    if (input.action === 'status') return inspect();
    if (input.action === 'diff') return { diff: (await git('diff', 'HEAD', '--', '.', ':!dist/client.js', ':!vendor/dsh-bridge-gateway/client/client.js')).slice(0, 100000) };
    if (!['check', 'build', 'update', 'restart'].includes(input.action)) throw new Error('開発操作を確認してください。');
    if (job?.phase === 'running') throw new Error('処理が終わるまでお待ちください。');
    if (input.action === 'update') await eligible();
    if (job?.phase === 'running') throw new Error('処理が終わるまでお待ちください。');
    // Reserve before yielding. A queued update has one owner.
    job = { action: input.action, phase: 'running', message: '処理中です…', startedAt: Date.now() };
    const current = job;
    setTimeout(() => { operation(input.action).then(message => Object.assign(current, { phase: 'done', message }), error => {
      Object.assign(current, { phase: 'error', message: /^[ぁ-んァ-ヶ一-龯]/.test(error.message) ? error.message : '処理に失敗しました。GitHub の認証、接続と DSH の起動ログを確認してください。' });
    }); }, 100);
    return { accepted: true, job };
  }
  return { action, inspect, get busy() { return job?.phase === 'running'; } };
}

export async function serveDevelopmentControl(control) {
  const token = randomBytes(32).toString('hex');
  const server = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store');
    if (request.headers.authorization !== `Bearer ${token}` || request.method !== 'POST' || request.url !== '/') { response.writeHead(403).end('{}'); return; }
    try {
      let text = ''; for await (const chunk of request) { text += chunk; if (text.length > 2048) throw new Error('入力が長すぎます。'); }
      response.end(JSON.stringify(await control.action(JSON.parse(text))));
    } catch (error) { response.writeHead(400).end(JSON.stringify({ error: /^[ぁ-んァ-ヶ一-龯]/.test(error.message) ? error.message : 'Git の状態を確認できません。' })); }
  });
  await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
  return { env: { DARASK_DEV_CONTROL_URL: `http://127.0.0.1:${server.address().port}`, DARASK_DEV_CONTROL_TOKEN: token }, close: () => server.close() };
}
