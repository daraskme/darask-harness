import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { Context } from '@deepseek-ai/cordis';
import { apply, Config } from '../src/index.mjs';
import { fileGlobsMatch, parseRule, RuleTracker } from '../src/rules.mjs';

const scope = join(homedir(), 'rules-globs');

for (const field of [
  'globs: "**/*.{ts,tsx}"',
  'globs: ["**/*.{ts,tsx}"]',
  'paths:\n  - "**/*.{ts,tsx}"',
]) {
  test(`brace globs survive frontmatter: ${field}`, () => {
    const rule = parseRule(join(scope, 'ts.mdc'), scope, `---\n${field}\n---\nTS`);
    assert.deepEqual(rule.globs, ['**/*.{ts,tsx}']);
    for (const file of ['a.ts', 'nested/a.tsx']) assert.equal(fileGlobsMatch(scope, join(scope, file), rule.globs), true);
    assert.equal(fileGlobsMatch(scope, join(scope, 'nested/a.js'), rule.globs), false);
  });
}

for (const field of [
  'globs: **/*.{ts,tsx}, docs/[a,b].md, *.json',
  'globs: ["**/*.{ts,tsx}", "docs/[a,b].md", "*.json"]',
  'paths:\n  - **/*.{ts,tsx}, docs/[a,b].md\n  - "*.json"',
  'globs: "**/*.{ts,tsx}", "docs/[a,b].md", "*.json"',
]) {
  test(`mixed top-level commas preserve braces, classes and quotes: ${field}`, () => {
    const rule = parseRule(join(scope, 'mixed.mdc'), scope, `---\n${field}\n---\nMIXED`);
    assert.deepEqual(rule.globs, ['**/*.{ts,tsx}', 'docs/[a,b].md', '*.json']);
    for (const file of ['src/a.ts', 'src/a.tsx', 'docs/a.md', 'docs/,.md', 'config/a.json']) {
      assert.equal(fileGlobsMatch(scope, join(scope, file), rule.globs), true, file);
    }
    assert.equal(fileGlobsMatch(scope, join(scope, 'a.js'), rule.globs), false);
  });
}

test('invalid patterns do not prevent other patterns from matching or cross scope boundaries', () => {
  const invalid = ['[z-a].ts', 'stray}.ts'];
  assert.equal(fileGlobsMatch(scope, join(scope, 'src/a.ts'), [...invalid, '*.ts']), true);
  assert.equal(fileGlobsMatch(scope, join(scope, 'src/a.ts'), invalid), false);
  assert.equal(fileGlobsMatch(scope, join(scope, '../outside/a.ts'), [...invalid, '*.ts']), false);
  assert.equal(fileGlobsMatch(scope, join(scope, 'src/a.ts'), [join(scope, '[z-a].ts'), '*.ts']), true);
});

for (const field of [
  'globs: "file,with,commas.ts"',
  'globs: ["file,with,commas.ts", "*.js"]',
  'paths:\n  - "file,with,commas.ts"\n  - "*.js"',
]) {
  test(`quoted commas remain inside a pattern through both parsing stages: ${field}`, () => {
    const rule = parseRule(join(scope, 'quoted.mdc'), scope, `---\n${field}\n---\nQUOTED`);
    assert.equal(rule.globs[0], 'file,with,commas.ts');
    assert.equal(fileGlobsMatch(scope, join(scope, 'file,with,commas.ts'), rule.globs), true);
    assert.equal(fileGlobsMatch(scope, join(scope, 'commas.ts'), rule.globs), false);
  });
}

test('an invalid rule between matching rules cannot lose their one-time delivery', async () => {
  const tracker = new RuleTracker();
  tracker.scanned.add(scope);
  tracker.rules = [
    parseRule(join(scope, 'a.mdc'), scope, '---\nglobs: *.ts\n---\nFIRST'),
    parseRule(join(scope, 'b.mdc'), scope, '---\nglobs: "[z-a].ts"\n---\nINVALID'),
    parseRule(join(scope, 'c.mdc'), scope, '---\nglobs: *.ts\n---\nLAST'),
  ];
  tracker.rules.push(tracker.rules[0]);
  const read = () => tracker.rulesForRead(scope, join(scope, 'a.ts'));
  assert.deepEqual((await read()).map(rule => rule.body), ['FIRST', 'LAST']);
  assert.deepEqual(await read(), []);
  assert.equal(tracker.injected.has(join(scope, 'b.mdc')), false);
});

test('tools/result delivers valid reminders together on the next step despite an invalid rule', async t => {
  const root = await mkdtemp(join(homedir(), 'rules-reminder-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '.git'));
  const dir = join(root, '.grok/rules');
  await mkdir(dir, { recursive: true });
  for (const [file, glob, body] of [['a', '*.ts', 'FIRST'], ['b', '[z-a].ts', 'INVALID'], ['c', '**/*.{ts,tsx}', 'LAST']]) {
    await writeFile(join(dir, `${file}.mdc`), `---\nglobs: "${glob}"\n---\n${body}`);
  }
  const bus = new Context();
  const warnings = [];
  const agent = { session: { header: { cwd: root }, surface: { nodes: [] } } };
  const signal = new AbortController().signal;
  apply({ on: bus.on.bind(bus), logger: { warn: (...args) => warnings.push(args) } }, Config({ dshHome: join(root, 'home'), homeRuleDirs: [] }));
  const step = () => bus.waterfall('agent/pre-step', { agent, signal, messages: [] }, () => ({ kind: 'enter', messages: [] }));
  await step();
  const read = () => bus.emit('tools/result', { agent, signal, name: 'read', arguments: { file_path: 'a.ts' } }, {});
  read();
  const next = await step();
  assert.equal(next.messages.length, 1);
  assert.match(JSON.stringify(next.messages), /FIRST/u);
  assert.match(JSON.stringify(next.messages), /LAST/u);
  assert.doesNotMatch(JSON.stringify(next.messages), /INVALID/u);
  read();
  assert.equal((await step()).messages.length, 0);
  assert.deepEqual(warnings, []);
});
