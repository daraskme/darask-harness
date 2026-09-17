import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Language, Parser } from 'web-tree-sitter';

import { SymbolExtractor } from '../src/extract.mjs';
import { GRAMMARS_DIR } from '../src/languages.mjs';

const source = 'function currentName() { return currentCall(); }\n';

test('failed parser initialization is retried rather than cached', async t => {
  const init = t.mock.method(Parser, 'init');
  init.mock.mockImplementationOnce(async () => { throw new Error('injected init failure'); });
  const extractor = new SymbolExtractor();
  t.after(() => extractor.dispose());
  await assert.rejects(extractor.extract('javascript', source), /injected init failure/u);
  assert.equal((await extractor.extract('javascript', source)).definitions[0].name, 'currentName');
  assert.equal(init.mock.callCount(), 2);
  await extractor.extract('javascript', source);
  assert.equal(init.mock.callCount(), 2);
});

test('missing grammar retries after installation and successful loads remain cached', async t => {
  const dir = await mkdtemp(join(homedir(), '.code-graph-grammar-retry-'));
  const extractor = new SymbolExtractor(dir);
  t.after(async () => { extractor.dispose(); await rm(dir, { recursive: true, force: true }); });
  const load = t.mock.method(Language, 'load');
  assert.equal(await extractor.extract('javascript', source), undefined);
  assert.equal(load.mock.callCount(), 0);
  for (const name of ['javascript.wasm', 'javascript.tags.scm']) {
    await copyFile(join(GRAMMARS_DIR, name), join(dir, name));
  }
  const results = await Promise.all([
    extractor.extract('javascript', source),
    extractor.extract('javascript', source),
  ]);
  assert.deepEqual(results.map(result => result.definitions[0].name), ['currentName', 'currentName']);
  assert.equal(load.mock.callCount(), 1, 'concurrent retries share one grammar load');
  await extractor.extract('javascript', source);
  assert.equal(load.mock.callCount(), 1);
});

test('rejected grammar loads are shared in flight but retried once missing queries are restored', async t => {
  const dir = await mkdtemp(join(homedir(), '.code-graph-query-retry-'));
  const extractor = new SymbolExtractor(dir);
  t.after(async () => { extractor.dispose(); await rm(dir, { recursive: true, force: true }); });
  await copyFile(join(GRAMMARS_DIR, 'javascript.wasm'), join(dir, 'javascript.wasm'));
  const load = t.mock.method(Language, 'load');
  const failed = await Promise.allSettled([
    extractor.extract('javascript', source),
    extractor.extract('javascript', source),
  ]);
  assert.deepEqual(failed.map(result => result.status), ['rejected', 'rejected']);
  for (const result of failed) assert.equal(result.reason.code, 'ENOENT');
  assert.equal(load.mock.callCount(), 1);
  await copyFile(join(GRAMMARS_DIR, 'javascript.tags.scm'), join(dir, 'javascript.tags.scm'));
  const retried = await Promise.all([
    extractor.extract('javascript', source),
    extractor.extract('javascript', source),
  ]);
  assert.deepEqual(retried.map(result => result.references[0].name), ['currentCall', 'currentCall']);
  assert.equal(load.mock.callCount(), 2);
  await extractor.extract('javascript', source);
  assert.equal(load.mock.callCount(), 2);
});
