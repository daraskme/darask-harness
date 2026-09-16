import test from 'node:test';
import assert from 'node:assert/strict';

import { globToRegExp, hashlineSearch } from '../src/search.mjs';
import { ContentOnly } from '../src/scheme.mjs';

function memoryFs(tree) {
  const target = path => ({ targetKey: path, displayPath: path });
  const children = dir => Object.keys(tree).filter(path => {
    const rest = path.startsWith(`${dir}/`) ? path.slice(dir.length + 1) : (dir === '' ? path : undefined);
    return rest !== undefined && rest.length > 0;
  });
  const isDir = path => path === '' || Object.keys(tree).some(other => other.startsWith(`${path}/`));
  return {
    async stat(t) {
      if (isDir(t.displayPath)) return { version: 'v', type: 'directory' };
      if (t.displayPath in tree) return { version: 'v', type: 'file', size: tree[t.displayPath].length };
      return undefined;
    },
    async listDir(t) {
      const dir = t.displayPath;
      const names = new Set();
      for (const path of children(dir)) {
        const rest = dir === '' ? path : path.slice(dir.length + 1);
        names.add(rest.split('/')[0]);
      }
      return [...names].map(name => {
        const full = dir === '' ? name : `${dir}/${name}`;
        return { name, type: isDir(full) ? 'directory' : 'file', target: target(full), size: tree[full]?.length };
      });
    },
    async readText(t) {
      if (!(t.displayPath in tree)) throw new Error('missing');
      return tree[t.displayPath];
    },
  };
}

const scheme = new ContentOnly();
const tree = {
  'src/a.ts': 'const alpha = 1;\nconst beta = 2;\nexport { alpha, beta };\n',
  'src/deep/b.mjs': 'let alpha = "x";\n// nothing\n',
  'node_modules/dep/index.js': 'alpha alpha alpha',
  'README.md': '# alpha\n',
  'bin.dat': 'alpha\u0000binary',
};

test('globToRegExp handles bare names, ** and brace sets', () => {
  assert.ok(globToRegExp('*.ts').test('src/a.ts'));
  assert.ok(!globToRegExp('*.ts').test('src/a.mjs'));
  assert.ok(globToRegExp('src/**/*.mjs').test('src/deep/b.mjs'));
  assert.ok(globToRegExp('src/**/*.mjs').test('src/b.mjs'));
  assert.ok(globToRegExp('*.{ts,mjs}').test('src/deep/b.mjs'));
  assert.ok(!globToRegExp('src/*.ts').test('src/deep/a.ts'));
});

test('hashlineSearch annotates matches and context, skipping ignored and binary files', async () => {
  const result = await hashlineSearch(memoryFs(tree), { targetKey: '', displayPath: '' }, { pattern: 'alpha', after: 1 }, scheme);
  assert.equal(result.files, 3);
  assert.equal(result.matches, 4);
  assert.equal(result.truncated, false);
  assert.ok(!result.text.includes('node_modules'));
  assert.ok(!result.text.includes('bin.dat'));
  assert.match(result.text, /^Found 4 matches in 3 files\./);
  assert.match(result.text, /\n1:[a-z]{3}:const alpha = 1;\n2:[a-z]{3}-const beta = 2;\n3:[a-z]{3}:export \{ alpha, beta \};/);
});

test('hashlineSearch honours glob, case-insensitivity, gaps and caps', async () => {
  const fs = memoryFs(tree);
  const glob = await hashlineSearch(fs, { targetKey: '', displayPath: '' }, { pattern: 'ALPHA', glob: '*.md', caseInsensitive: true }, scheme);
  assert.equal(glob.files, 1);
  assert.ok(glob.text.includes('README.md'));

  const capped = await hashlineSearch(fs, { targetKey: '', displayPath: '' }, { pattern: 'alpha', maxMatches: 1 }, scheme);
  assert.equal(capped.truncated, true);
  assert.match(capped.text, /^Found at least 1 matches/);

  const single = await hashlineSearch(fs, { targetKey: 'src/a.ts', displayPath: 'src/a.ts' }, { pattern: 'alpha|beta' }, scheme);
  assert.equal(single.matches, 3);

  const gap = await hashlineSearch(fs, { targetKey: 'src/a.ts', displayPath: 'src/a.ts' }, { pattern: 'const alpha|export' }, scheme);
  assert.ok(gap.text.includes('\n--\n'));

  await assert.rejects(hashlineSearch(fs, { targetKey: 'nope', displayPath: 'nope' }, { pattern: 'x' }, scheme), /not found/);
  await assert.rejects(hashlineSearch(fs, { targetKey: '', displayPath: '' }, { pattern: '(' }, scheme), /Invalid regular expression/);
});
