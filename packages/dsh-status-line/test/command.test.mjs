import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runStatusCommand, shellFor, mergeUserConfig, publicConfig, createStatusLineService, Config, crossSite } from '../src/index.mjs';

const context = { schema_version: 1, cwd: process.cwd(), session_id: 'abc', model: { id: 'm' }, context_window: { used_percentage: 42 } };
const nodeScript = script => `node -e ${process.platform === 'win32' ? `"${script.replace(/"/gu, '\\"')}"` : `'${script}'`}`;

test('shellFor picks cmd.exe on Windows and /bin/sh elsewhere', () => {
  assert.equal(shellFor('linux').file, '/bin/sh');
  assert.deepEqual(shellFor('linux').args('echo hi'), ['-c', 'echo hi']);
  assert.match(shellFor('win32').file, /cmd\.exe$/iu);
  assert.deepEqual(shellFor('win32').args('echo hi').slice(0, 3), ['/d', '/s', '/c']);
});

test('runStatusCommand streams the context JSON on stdin and returns the first stdout line', async () => {
  const script = 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log("");console.log(j.model.id+" "+j.context_window.used_percentage+"% "+process.env.DSH_SESSION_ID);console.log("ignored")})';
  const result = await runStatusCommand(nodeScript(script), context, { timeoutMs: 20000 });
  assert.deepEqual(result, { ok: true, text: 'm 42% abc' });
});

test('runStatusCommand reports non-zero exits without output and keeps output with exit code', async () => {
  const failed = await runStatusCommand(nodeScript('process.stderr.write("boom");process.exit(3)'), context, { timeoutMs: 20000 });
  assert.equal(failed.ok, false);
  assert.match(failed.error, /code 3.*boom/u);
  const partial = await runStatusCommand(nodeScript('console.log("line");process.exit(2)'), context, { timeoutMs: 20000 });
  assert.deepEqual(partial, { ok: true, text: 'line', exitCode: 2 });
});

test('runStatusCommand times out', async () => {
  const result = await runStatusCommand(nodeScript('setTimeout(()=>{},10000)'), context, { timeoutMs: 500 });
  assert.equal(result.ok, false);
  assert.match(result.error, /timed out/u);
});

test('runStatusCommand never throws on spawn failure', async () => {
  const result = await runStatusCommand('anything', context, { spawnImpl: () => { throw new Error('ENOENT'); } });
  assert.deepEqual(result, { ok: false, error: 'spawn failed: ENOENT' });
});

test('mergeUserConfig only accepts known, well-typed overrides', () => {
  const base = Config({});
  const merged = mergeUserConfig(base, { type: 'Command', command: 'my-status', items: ['cwd', 'nope'], padding: 2, refreshIntervalMs: -5, pricing: { 'x/*': { input: 1, output: 2 } }, extra: true });
  assert.equal(merged.type, 'command');
  assert.equal(merged.command, 'my-status');
  assert.equal(merged.padding, 2);
  assert.equal(merged.refreshIntervalMs, 1000, 'negative numbers are ignored');
  assert.deepEqual(Object.keys(merged.pricing), ['x/*']);
  assert.equal('extra' in merged, false);
  const visible = publicConfig(merged);
  assert.deepEqual(visible.items, ['cwd']);
  assert.equal(visible.type, 'command');
  assert.equal(publicConfig(mergeUserConfig(base, { type: 'command' })).type, 'builtin', 'command mode without a command falls back');
  assert.equal(publicConfig(mergeUserConfig(base, { padding: 99 })).padding, 8);
});

test('service reads the user file, renders builtin/command modes, and 404s unknown sessions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'darask-status-'));
  try {
    const file = join(dir, 'status-line.json');
    await writeFile(file, JSON.stringify({ type: 'command', command: 'ignored-by-fake-runner', items: ['model'] }));
    const session = { id: 's1', header: { id: 's1', cwd: dir, createdAt: 1000 } };
    const values = {
      daraskStatus: { startedAt: 1000, lastEventAt: 2000, model: { provider: 'p', id: 'm' }, contextWindow: 1000, turn: null, turns: 2, usageByModel: {}, totalCostUsd: null },
      contextPressure: { pressureTokens: 500, projectedTokens: 500, contextWindow: 1000 },
      title: null,
    };
    const ctx = {
      sessions: { get: id => id === 's1' ? session : undefined },
      sessionProjections: { snapshot: () => ({ asOfSeq: 0, values }) },
      get: name => name === 'agents' ? { get: () => ({ status: 'idle' }) } : undefined,
      logger: { warn() {} },
    };
    let clock = 10_000;
    const calls = [];
    const service = createStatusLineService({
      ctx,
      config: Config({ userConfigFile: file }),
      now: () => clock,
      runCommand: async (command, payload) => { calls.push({ command, payload }); return { ok: true, text: 'from-command' }; },
    });
    let result = await service.render('s1');
    assert.equal(result.type, 'command');
    assert.equal(result.text, 'from-command');
    assert.equal(calls[0].command, 'ignored-by-fake-runner');
    assert.equal(calls[0].payload.context_window.used_percentage, 50);
    assert.equal(calls[0].payload.turn.running, false);
    assert.equal(calls[0].payload.cost.total_duration_ms, 9000);

    await writeFile(file, JSON.stringify({ type: 'builtin', items: ['model', 'context', 'turns'] }));
    clock += 5000;
    result = await service.render('s1');
    assert.equal(result.type, 'builtin');
    assert.equal(result.text, 'm │ 50% (500/1.0K) │ T2');
    assert.equal(calls.length, 1);

    assert.deepEqual(await service.render('missing'), { error: 'session not found', status: 404 });

    const configRoute = service.routes.find(route => route.path.endsWith('/config'));
    const configBody = await (await configRoute.fetch(new Request('http://127.0.0.1/api/darask/status-line/config'))).json();
    assert.deepEqual(configBody.items, ['model', 'context', 'turns']);
    assert.equal(configBody.type, 'builtin');

    const lineRoute = service.routes.find(route => !route.path.endsWith('/config'));
    const bad = await lineRoute.fetch(new Request('http://127.0.0.1/api/darask/status-line?session=..%2Fetc'));
    assert.equal(bad.status, 400);
    const cross = await lineRoute.fetch(new Request('http://127.0.0.1/api/darask/status-line?session=s1', { headers: { 'sec-fetch-site': 'cross-site' } }));
    assert.equal(cross.status, 403);
    const ok = await lineRoute.fetch(new Request('http://127.0.0.1/api/darask/status-line?session=s1&trigger=turn', { headers: { 'sec-fetch-site': 'same-origin' } }));
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).context.trigger, 'turn');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('crossSite only rejects explicit cross-site fetch metadata', () => {
  assert.equal(crossSite(new Request('http://x/', { headers: { 'sec-fetch-site': 'cross-site' } })), true);
  assert.equal(crossSite(new Request('http://x/', { headers: { 'sec-fetch-site': 'same-origin' } })), false);
  assert.equal(crossSite(new Request('http://x/')), false);
});
