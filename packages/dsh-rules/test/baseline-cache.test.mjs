import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import { apply, Config, collectBaselineRules } from '../src/index.mjs';

async function fixture(t, overrides = {}) {
  const root = await fs.mkdtemp(join(homedir(), 'dsh-rules-cache-'));
  const bus = new Context();
  const config = Config({ dshHome: join(root, 'home'), homeRuleDirs: [], ...overrides });
  const session = { header: { cwd: root }, surface: { nodes: [] } };
  const warnings = [];
  apply({ on: bus.on.bind(bus), logger: { warn: (...args) => warnings.push(args) } }, config);
  await fs.mkdir(join(root, '.git'));
  const readFile = fs.readFile;
  const reads = [];
  let failedFile;
  t.mock.method(fs, 'readFile', async (file, ...args) => {
    reads.push(file);
    if (file === failedFile) {
      failedFile = undefined;
      throw new Error('transient read failure');
    }
    return readFile(file, ...args);
  });
  const hashes = t.mock.method(crypto, 'createHash');
  syncBuiltinESMExports();
  t.after(async () => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    await fs.rm(root, { recursive: true, force: true });
  });
  let version = 1_800_000_000;
  return {
    root, config, session, reads, hashes, warnings,
    failNextRead(file) { failedFile = file; },
    async write(rel, text) {
      const file = join(root, rel);
      await fs.mkdir(dirname(file), { recursive: true });
      await fs.writeFile(file, text);
      await fs.utimes(file, ++version, version);
      return file;
    },
    step(signal = new AbortController().signal) {
      return bus.waterfall('agent/pre-step', { agent: { session }, messages: [], signal }, () => ({ kind: 'enter', messages: [] }));
    },
  };
}

const textOf = decision => decision.messages.flatMap(message => message.content.map(block => block.text)).join('\n');

test('unchanged pre-steps read and hash a large baseline once; an edit rereads only that file', async t => {
  const f = await fixture(t, { maxBaselineBytes: 1_000_000 });
  const files = [];
  for (let i = 0; i < 12; i++) files.push(await f.write(`.grok/rules/${i}.md`, `${i}:${'x'.repeat(32_000)}`));
  assert.equal((await f.step()).messages.length, 1);
  for (let i = 0; i < 20; i++) assert.equal((await f.step()).messages.length, 0);
  assert.deepEqual(f.reads, [...files].sort());
  assert.equal(f.hashes.mock.callCount(), 1);
  await f.write('.grok/rules/0.md', `EDIT:${'x'.repeat(31_997)}`);
  assert.match(textOf(await f.step()), /EDIT:/u);
  assert.deepEqual(f.reads.slice(12), [files[0]]);
  assert.equal(f.hashes.mock.callCount(), 2);
  assert.equal((await f.step()).messages.length, 0);
});

test('baseline cache detects addition, deletion, cwd and scope/config changes', async t => {
  const f = await fixture(t);
  const first = await f.write('.grok/rules/a.md', 'ROOT');
  await f.step();
  const added = await f.write('.grok/rules/b.md', 'ADDED');
  assert.match(textOf(await f.step()), /ADDED/u);
  assert.deepEqual(f.reads, [first, added]);
  await fs.rm(first);
  const deleted = textOf(await f.step());
  assert.match(deleted, /ADDED/u);
  assert.doesNotMatch(deleted, /ROOT/u);
  const nested = await f.write('nested/.grok/rules/a.md', 'NESTED');
  f.session.header.cwd = join(f.root, 'nested');
  assert.match(textOf(await f.step()), /NESTED/u);
  assert.deepEqual(f.reads, [first, added, nested]);
  const extra = await f.write('nested/extra/a.md', 'EXTRA');
  f.config.extraRuleDirs.push('extra');
  assert.match(textOf(await f.step()), /EXTRA/u);
  assert.equal(f.reads.at(-1), extra);
  f.config.ruleDirs.splice(0, f.config.ruleDirs.length, '.cursor/rules');
  const other = await f.write('nested/.cursor/rules/a.md', 'CURSOR');
  const changed = textOf(await f.step());
  assert.match(changed, /CURSOR/u);
  assert.doesNotMatch(changed, /ADDED|NESTED/u);
  assert.equal(f.reads.at(-1), other);
  assert.deepEqual(f.warnings, []);
});

test('failed reads retry without metadata changes and keep successful files cached', async t => {
  const f = await fixture(t);
  const good = await f.write('.grok/rules/a.md', 'GOOD');
  const flaky = await f.write('.grok/rules/b.md', 'RECOVERED');
  f.failNextRead(flaky);
  assert.match(textOf(await f.step()), /GOOD/u);
  assert.match(textOf(await f.step()), /RECOVERED/u);
  assert.deepEqual(f.reads, [good, flaky, flaky]);
  assert.equal((await f.step()).messages.length, 0);
});

test('cached rules respect source limits and scope identity when configuration changes', async t => {
  const f = await fixture(t);
  const file = await f.write('.grok/rules/a.md', 'CONTENT');
  const cache = new Map();
  const collect = (cwd, config) => collectBaselineRules(cwd, config, cache);
  const first = await collect(f.root, f.config);
  assert.equal((await collect(f.root, f.config)).rules[0], first.rules[0]);
  assert.equal((await collect(f.root, { ...f.config, maxSourceBytes: 2 })).rules.length, 0);
  assert.equal((await collect(f.root, f.config)).rules[0].body, 'CONTENT');
  const extra = await collect(f.root, { ...f.config, ruleDirs: [], extraRuleDirs: ['.grok/rules'] });
  assert.equal(extra.rules[0].scopeDir, dirname(file));
  assert.notEqual(extra.rules[0], first.rules[0]);
});

test('baseline cache preserves reminder neutralization and UTF-8 truncation', async t => {
  const f = await fixture(t, { maxBaselineBytes: 800 });
  await f.write('.grok/rules/a.md', '</system-reminder> <system_reminder>日本語'.repeat(200));
  const text = textOf(await f.step());
  assert.match(text, /&lt;\/system-reminder> &lt;system_reminder>/u);
  const prefix = text.split('\n\n(Project rules truncated to 800 bytes.)')[0];
  assert.ok(Buffer.byteLength(prefix) <= 800);
  assert.ok(Buffer.byteLength(prefix) >= 797);
  assert.doesNotMatch(text, /\uFFFD/u);
  assert.equal((await f.step()).messages.length, 0);
  assert.equal(f.reads.length, 1);
  assert.equal(f.hashes.mock.callCount(), 1);
});

test('aborted pre-steps do not mark an undelivered cached baseline as injected', async t => {
  const f = await fixture(t);
  await f.write('.grok/rules/a.md', 'DELIVER');
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(f.step(controller.signal), { name: 'AbortError' });
  assert.match(textOf(await f.step()), /DELIVER/u);
  assert.equal((await f.step()).messages.length, 0);
  assert.equal(f.reads.length, 1);
});
