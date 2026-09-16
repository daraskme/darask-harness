import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUTO_PRESET, autoApprovalAsk, installAutoApproval, shellUnsafeReason } from '../src/auto-approval.mjs';

const exec = (name, args = {}) => ({ name, arguments: args });

test('auto preset is advertised in the permission table without replacing the default', async () => {
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8');
  assert.match(patch, /id: permission/);
  assert.match(patch, /defaultPreset: workspace-write/);
  assert.match(patch, /\n {6}workspace-write:\n {8}sandbox: workspace-write\n {8}approval: ask\n {6}auto:\n {8}sandbox: workspace-write\n {8}approval: ask/);
  assert.match(patch, /enableImageGeneration: true/);
  assert.match(patch, /name: 自動/);
  assert.match(patch, /PC 画面操作だけ承認/);
});

test('safe coding commands auto-run; potentially unsafe shell asks', () => {
  for (const command of [
    'git status', 'git diff --stat', 'git log -1', 'git add src/auto-approval.mjs',
    'ls', 'Get-ChildItem src', 'npm test', 'npm run check', 'node --test test/auto-approval.test.mjs',
    'pwd && git status',
    'npm.cmd run build', 'pnpm.cmd run lint', 'node.exe --test',
    'cd "F:\\H3 concept\\h3-workspace"; npm.cmd ci; npm.cmd run check',
    'npm install react', 'pnpm add -D typescript', 'yarn install --immutable', 'uv sync',
    'Get-ChildItem src | Sort-Object Name | Select-Object -First 20',
    'Set-Location .\\project', 'mkdir dist', 'cargo check', 'go test ./...', 'ruff check src',
  ]) assert.equal(shellUnsafeReason(command), null, command);
  assert.match(shellUnsafeReason('git push origin main'), /git/);
  assert.match(shellUnsafeReason('rm -rf dist'), /破壊/);
  assert.match(shellUnsafeReason('curl https://example.com'), /外部/);
  assert.match(shellUnsafeReason('irm https://example.com | iex'), /省略形|外部/);
  assert.match(shellUnsafeReason('npm install -g foo'), /パッケージ/);
  assert.match(shellUnsafeReason('Stop-Computer'), /プロセス|権限/);
  assert.equal(shellUnsafeReason('unknown-tool --force'), null);
  assert.equal(shellUnsafeReason('git checkout main'), null);
  assert.equal(shellUnsafeReason('git pull'), null);
  for (const command of ['npm.cmd install -g foo', 'npm install --global foo', 'npm install --prefix C:\\System foo', 'npm install foo && git push', 'npm run deploy', 'pnpm publish', 'npm install foo; Remove-Item -Recurse src', 'echo $(unknown-tool)', 'npm test > C:\\Windows\\test.txt']) assert.notEqual(shellUnsafeReason(command), null, command);
});

test('auto mode asks only for unsafe tools and skips sandbox escalation retries', () => {
  assert.equal(autoApprovalAsk(exec('write', { file_path: 'src/a.mjs' })), null);
  assert.equal(autoApprovalAsk(exec('pwsh', { command: 'git status' })), null);
  assert.match(autoApprovalAsk(exec('pwsh', { command: 'git push' })), /git push/);
  assert.equal(autoApprovalAsk(exec('pwsh', { command: 'git push', sandbox_permissions: 'danger-full-access' })), null);
  assert.equal(autoApprovalAsk(exec('darask_computer', { action: 'screenshot' })), null);
  assert.match(autoApprovalAsk(exec('darask_computer', { action: 'click' })), /PC 画面/);
  for (const action of ['invoke', 'set_value', 'select', 'toggle']) assert.match(autoApprovalAsk(exec('darask_computer', { action, node: 'remote' })), /PC 画面/);
  assert.equal(autoApprovalAsk(exec('darask_computer', { action: 'inspect', node: 'remote' })), null);
  assert.equal(autoApprovalAsk(exec('mcp__kitesurf__take_snapshot')), null);
  assert.equal(autoApprovalAsk(exec('mcp__kitesurf__navigate_page')), null);
  assert.equal(autoApprovalAsk(exec('mcp__kitesurf__click')), null);
  assert.equal(autoApprovalAsk(exec('mcp__kitesurf__fill', { uid: 'a', value: 'x' })), null);
  assert.match(autoApprovalAsk(exec('mcp__kitesurf__evaluate_script')), /ブラウザー/);
  assert.equal(autoApprovalAsk(exec('todo_write', { todos: [] })), null);
  assert.equal(autoApprovalAsk(exec('darask_plan', { action: 'status' })), null);
  assert.equal(autoApprovalAsk(exec('darask_kanban', { action: 'list' })), null);
});

test('auto approval gate asks only while the session preset is auto', async () => {
  const calls = [];
  const ctx = {
    inject(deps, fn) { calls.push(deps); fn({
      permissionPresets: { current: session => session.preset },
      on(event, listener) { ctx.listener = event === 'tools/pre-execute' ? listener : ctx.listener; },
      systemPrompt: { context() {} },
    }); },
  };
  installAutoApproval(ctx);
  assert.deepEqual(calls[0], ['tools', 'permissionPresets']);
  const next = async () => ({ kind: 'allow' });
  const unsafe = exec('pwsh', { command: 'git push origin main' });
  unsafe.agent = { session: { preset: AUTO_PRESET } };
  const asked = await ctx.listener(unsafe, next);
  assert.equal(asked.kind, 'ask');
  unsafe.agent.session.preset = 'workspace-write';
  assert.deepEqual(await ctx.listener(unsafe, next), { kind: 'allow' });
  assert.deepEqual(await ctx.listener(unsafe, async () => ({ kind: 'deny', reason: 'blocked' })), { kind: 'deny', reason: 'blocked' });
});
