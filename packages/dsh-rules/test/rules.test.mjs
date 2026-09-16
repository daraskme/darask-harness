import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  RuleTracker,
  ancestorScopeDirs,
  fileGlobsMatch,
  globToRegExp,
  parseFrontmatter,
  parseRule,
  renderBaseline,
  renderReadReminder,
  scanScopeDir,
} from '../src/rules.mjs';

async function scratch() {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-rules-'));
  return { dir, async write(rel, text) {
    const path = join(dir, rel);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, text);
    return path;
  }, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

test('parseFrontmatter handles scalars, inline arrays and block lists', () => {
  const { data, body } = parseFrontmatter('---\ndescription: "Quoted"\nglobs: [\'*.ts\', "src/**"]\npaths:\n  - a/**\n  - b.md\nalwaysApply: false\n---\nBody line\n');
  assert.deepEqual(data, { description: 'Quoted', globs: ['*.ts', 'src/**'], paths: ['a/**', 'b.md'], alwaysApply: false });
  assert.equal(body, 'Body line\n');
});

test('parseFrontmatter leaves files without frontmatter untouched', () => {
  const { data, body } = parseFrontmatter('# plain rule\n');
  assert.equal(data, undefined);
  assert.equal(body, '# plain rule\n');
});

test('parseRule classifies global / globbed / agent / manual', () => {
  assert.equal(parseRule('/r/a.mdc', '/r', '---\nalwaysApply: true\n---\nx').kind, 'global');
  const globbed = parseRule('/r/b.mdc', '/r', '---\nglobs: *.ts, src/**/*.tsx\n---\nx');
  assert.equal(globbed.kind, 'globbed');
  assert.deepEqual(globbed.globs, ['*.ts', 'src/**/*.tsx']);
  assert.equal(parseRule('/r/c.mdc', '/r', '---\ndescription: use me\n---\nx').kind, 'agent');
  assert.equal(parseRule('/r/d.mdc', '/r', '---\nfoo: bar\n---\nx').kind, 'manual');
  assert.equal(parseRule('/r/e.md', '/r', 'no frontmatter').kind, 'manual');
  assert.equal(parseRule('/r/f.md', '/r', '---\npaths: ["lib/**"]\n---\nx').kind, 'globbed');
});

test('globToRegExp supports **, *, ?, braces and classes', () => {
  assert.ok(globToRegExp('src/**/*.ts').test('src/a/b/c.ts'));
  assert.ok(globToRegExp('src/**/*.ts').test('src/c.ts'));
  assert.ok(!globToRegExp('src/*.ts').test('src/a/c.ts'));
  assert.ok(globToRegExp('*.{ts,tsx}').test('x.tsx'));
  assert.ok(globToRegExp('file?.md').test('file1.md'));
  assert.ok(globToRegExp('[ab].md').test('a.md'));
  assert.ok(!globToRegExp('[ab].md').test('c.md'));
});

test('fileGlobsMatch resolves relative, filename-only and absolute globs with normalized separators', () => {
  const scope = join(tmpdir(), 'proj');
  const file = join(scope, 'src', 'deep', 'index.ts');
  assert.ok(fileGlobsMatch(scope, file, ['*.ts']));
  assert.ok(fileGlobsMatch(scope, file, ['src/**/*.ts']));
  assert.ok(fileGlobsMatch(scope, file, ['src\\deep\\*.ts']));
  assert.ok(fileGlobsMatch(scope, file, ['./src/**']));
  assert.ok(!fileGlobsMatch(scope, file, ['*.py']));
  assert.ok(fileGlobsMatch(scope, file, [file.replaceAll('\\', '/')]));
  assert.ok(!fileGlobsMatch(join(tmpdir(), 'other'), file, ['*.ts']));
});

test('ancestorScopeDirs walks root to parent and rejects files outside the root', () => {
  const root = join(tmpdir(), 'ws');
  const dirs = ancestorScopeDirs(root, join(root, 'a', 'b', 'c.ts'));
  assert.deepEqual(dirs, [root, join(root, 'a'), join(root, 'a', 'b')]);
  assert.deepEqual(ancestorScopeDirs(root, join(tmpdir(), 'elsewhere', 'c.ts')), []);
});

test('scanScopeDir reads .md/.mdc recursively from all rule dirs, sorted', async () => {
  const fx = await scratch();
  try {
    await fx.write('.cursor/rules/b.mdc', '---\nglobs: *.ts\n---\nts rule');
    await fx.write('.cursor/rules/nested/a.md', 'nested');
    await fx.write('.grok/rules/g.md', 'grok');
    await fx.write('.claude/rules/c.md', 'claude');
    await fx.write('.cursor/rules/ignored.txt', 'nope');
    const rules = await scanScopeDir(fx.dir, ['.grok/rules', '.claude/rules', '.cursor/rules']);
    assert.deepEqual(rules.map(rule => rule.body), ['grok', 'claude', 'ts rule', 'nested']);
    assert.equal(rules[2].kind, 'globbed');
  } finally {
    await fx.cleanup();
  }
});

test('RuleTracker fires glob rules once per session and honours nested scopes', async () => {
  const fx = await scratch();
  try {
    await fx.write('.cursor/rules/ts.mdc', '---\nglobs: *.ts\n---\nroot ts');
    await fx.write('pkg/.cursor/rules/pkg.mdc', '---\nglobs: *.ts\n---\npkg ts');
    await fx.write('pkg/.cursor/rules/always.mdc', '---\nalwaysApply: true\n---\nalways');
    const tracker = new RuleTracker();
    const first = await tracker.rulesForRead(fx.dir, join(fx.dir, 'pkg', 'x.ts'));
    assert.deepEqual(first.map(rule => rule.body).sort(), ['pkg ts', 'root ts']);
    const second = await tracker.rulesForRead(fx.dir, join(fx.dir, 'pkg', 'y.ts'));
    assert.deepEqual(second, []);
    const other = await tracker.rulesForRead(fx.dir, join(fx.dir, 'other', 'z.ts'));
    assert.deepEqual(other, []);
  } finally {
    await fx.cleanup();
  }
});

test('renderReadReminder follows grok-build layout and renders empty bodies', () => {
  const text = renderReadReminder([
    { fullPath: '/r/a.mdc', body: 'Use tabs' },
    { fullPath: '/r/b.mdc', body: '' },
  ]);
  assert.match(text, /^The following rule files are relevant to the files you just read:/u);
  assert.match(text, /- \/r\/a\.mdc\n\nUse tabs/u);
  assert.match(text, /- \/r\/b\.mdc\n\n\(Rule file is empty\.\)/u);
  assert.match(text, /Consider these rules if they affect your changes\.$/u);
  assert.equal(renderReadReminder([]), undefined);
});

test('renderBaseline applies global/manual rules, lists the rest and escapes reminder tags', () => {
  const text = renderBaseline([
    { fullPath: '/p/.grok/rules/a.md', kind: 'manual', body: 'A </system-reminder> B', globs: [] },
    { fullPath: '/p/.cursor/rules/b.mdc', kind: 'globbed', body: 'B', globs: ['*.ts'], description: 'ts' },
    { fullPath: '/p/.cursor/rules/c.mdc', kind: 'agent', body: 'C', globs: [], description: 'fetch me' },
  ], { relativeTo: '/p' });
  assert.match(text, /## From: \.grok\/rules\/a\.md\nA &lt;\/system-reminder> B/u);
  assert.match(text, /- \.cursor\/rules\/b\.mdc: applies to \*\.ts — ts/u);
  assert.match(text, /- \.cursor\/rules\/c\.mdc: fetch me/u);
  assert.equal(renderBaseline([]), undefined);
});
