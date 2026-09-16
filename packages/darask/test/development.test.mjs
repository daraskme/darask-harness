import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createDevelopmentControl, serveDevelopmentControl } from '../scripts/development-control.mjs';
import { developmentRoutes } from '../src/development.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'darask-git-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const origin = join(root, 'origin'), source = join(root, 'source');
  const git = (cwd, ...args) => execFileSync('git', ['-c', `safe.directory=${cwd.replaceAll('\\', '/')}`, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(root, 'init', '-b', 'main', origin);
  const at = (cwd, ...args) => git(cwd, '-C', cwd, ...args);
  await writeFile(join(origin, 'package.json'), '{"name":"fixture","version":"1.0.0"}\n');
  await writeFile(join(origin, 'file.txt'), 'before\n');
  at(origin, 'add', '.'); at(origin, 'commit', '-m', 'initial');
  git(root, 'clone', origin, source);
  const events = [];
  const control = createDevelopmentControl({ source, expectedRemote: origin.replaceAll('\\', '/'), build: async () => events.push('build'), stop: async () => events.push('stop'), start: async () => events.push('start'), install: async () => events.push('install') });
  // Git for Windows may preserve backslashes in local remotes.
  at(source, 'remote', 'set-url', 'origin', origin.replaceAll('\\', '/'));
  return { root, origin, source, at, events, control };
}
async function finish(control) {
  for (let i = 0; i < 200; i++) { const state = await control.inspect(); if (state.job?.phase !== 'running') return state; await new Promise(done => setTimeout(done, 20)); }
  throw new Error('job timed out');
}
test('self-update fast-forwards Git and restarts; refuses dirty and diverged checkouts', async t => {
  const { origin, source, at, events, control } = await fixture(t);
  await writeFile(join(source, 'untracked.txt'), 'user edit');
  await assert.rejects(control.action({ action: 'update' }), /未コミット/);
  assert.equal(events.length, 0);
  await rm(join(source, 'untracked.txt'));
  await writeFile(join(origin, 'file.txt'), 'upstream\n'); at(origin, 'add', '.'); at(origin, 'commit', '-m', 'upstream');
  await control.action({ action: 'update' });
  const updated = await finish(control);
  assert.equal(updated.job.phase, 'done'); assert.deepEqual(events, ['stop', 'build', 'start']);
  assert.equal((await readFile(join(source, 'file.txt'), 'utf8')).replaceAll('\r\n', '\n'), 'upstream\n');
  await writeFile(join(source, 'local.txt'), 'local'); at(source, 'add', '.'); at(source, 'commit', '-m', 'local');
  await writeFile(join(origin, 'remote.txt'), 'remote'); at(origin, 'add', '.'); at(origin, 'commit', '-m', 'remote');
  const previous = at(source, 'rev-parse', 'HEAD');
  await control.action({ action: 'update' });
  const diverged = await finish(control);
  assert.equal(diverged.job.phase, 'error'); assert.match(diverged.job.message, /分岐/); assert.equal(at(source, 'rev-parse', 'HEAD'), previous);
});
test('self-update serializes simultaneous requests and rejects bad origin through the authenticated route', async t => {
  const { control } = await fixture(t);
  const results = await Promise.allSettled([control.action({ action: 'update' }), control.action({ action: 'update' })]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  await finish(control);
  const server = await serveDevelopmentControl(control); t.after(() => server.close());
  const denied = await fetch(server.env.DARASK_DEV_CONTROL_URL, { method: 'POST', body: '{"action":"status"}' });
  assert.equal(denied.status, 403);
  const [route] = developmentRoutes(server.env);
  const response = await route.fetch(new Request('http://localhost/api/darask/development'));
  assert.equal((await response.json()).available, true);
  const badOrigin = await route.fetch(new Request('http://localhost/api/darask/development', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{"action":"update"}' }));
  assert.equal(badOrigin.status, 400);
  const missingOrigin = await route.fetch(new Request('http://localhost/api/darask/development', { method: 'POST' }));
  assert.equal(missingOrigin.status, 403);
});
test('changed dependencies are installed before publishing the new client', async t => {
  const { origin, at, control, events } = await fixture(t);
  await writeFile(join(origin, 'package-lock.json'), '{}\n'); at(origin, 'add', '.'); at(origin, 'commit', '-m', 'dependencies');
  await control.action({ action: 'update' }); assert.equal((await finish(control)).job.phase, 'done');
  assert.deepEqual(events, ['stop', 'install', 'build', 'start']);
});
test('restart stops and starts without changing Git', async t => {
  const { source, control, events, at } = await fixture(t);
  const head = at(source, 'rev-parse', 'HEAD');
  await control.action({ action: 'restart' });
  assert.equal((await finish(control)).job.phase, 'done');
  assert.deepEqual(events, ['stop', 'start']);
  assert.equal(at(source, 'rev-parse', 'HEAD'), head);
});
