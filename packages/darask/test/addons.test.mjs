import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PLUGIN_CATALOG, PLUGIN_IDS, GROUPS } from '../src/addons/catalog.mjs';
import { createAddonStore, defaultAddons, validateAddons } from '../src/addons/store.mjs';
import { classifyIntent, detectConstraints, cognitiveGate, latestUserText, effortFor } from '../src/addons/intent.mjs';
import { scanSecurity, scanToolArgs, formatSecurityWarning } from '../src/addons/security.mjs';
import { createAddonState } from '../src/addons/state.mjs';
import { createAddonTools, guessCleanupCategory, isSafeCleanupPath } from '../src/addons/tools.mjs';
import { decorateRequest, observeMessages, createObservation } from '../src/addons/hooks.mjs';
import { createAddons } from '../src/addons/register.mjs';
import { addonsDictionaries } from '../src/addons/locale.mjs';

test('catalog covers the requested Hermes / oh-my-deepseek set and defaults all-on', () => {
  const ids = PLUGIN_CATALOG.map(plugin => plugin.id);
  for (const id of ['deepseek-harness', 'disk-cleanup', 'security-guidance', 'langfuse', 'kanban', 'image-gen', 'r2-storage', 'spotify', 'achievements', 'snapcompact', 'chrome-profiles', 'telegram', 'imessage', 'snyk', 'jackal', 'touchdesigner', 'modlens']) {
    assert.ok(ids.includes(id), id);
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(GROUPS.map(group => group.id).sort(), ['chat', 'deepseek', 'media', 'ops', 'safety']);
  const defaults = defaultAddons();
  for (const id of PLUGIN_IDS) assert.equal(defaults.enabled[id], true);
  assert.throws(() => validateAddons({ enabled: { nope: true } }));
});

test('intent router maps 7+1 classes and extracts hard constraints', () => {
  assert.equal(classifyIntent('このサービスのアーキテクチャを設計して').id, 'architecture');
  assert.equal(classifyIntent('bug を直して').id, 'medium');
  assert.equal(classifyIntent('hello').id, 'simple');
  assert.equal(effortFor(classifyIntent('調査して比較して')), 'high');
  const constraints = detectConstraints('Do not expand the request.\n秘密は書くな');
  assert.ok(constraints.length >= 1);
  assert.match(cognitiveGate({ intent: classifyIntent('refactor the module'), constraints }), /refactor/);
  assert.equal(latestUserText([{ role: 'assistant', content: 'no' }, { role: 'user', content: '実装して' }]), '実装して');
});

test('security-guidance flags pickle and eval but skips docs', () => {
  assert.ok(scanSecurity('app.py', 'pickle.loads(blob)').some(item => item.ruleName === 'pickle_deserialization'));
  assert.ok(scanSecurity('app.js', 'eval(user)').some(item => item.ruleName === 'eval_injection'));
  assert.equal(scanSecurity('README.md', 'eval(user)').length, 0);
  const findings = scanToolArgs('write', { path: 'x.py', contents: 'os.system("rm")' });
  assert.ok(findings.some(item => item.ruleName === 'os_system_injection'));
  assert.match(formatSecurityWarning(findings), /Security guidance/);
  assert.equal(scanToolArgs('pwsh', { command: 'eval(1)' }).length, 0);
});

test('addon store, plans, cleanup safety, and request decoration', async t => {
  const parent = path.resolve(tmpdir());
  const directory = await mkdtemp(path.join(parent, 'darask-addons-'));
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });
  const store = createAddonStore(directory);
  await store.load();
  await store.save({ enabled: { spotify: false }, securityBlock: true });
  assert.equal(store.enabled('spotify'), false);
  assert.equal(store.enabled('deepseek-harness'), true);
  const state = createAddonState(directory);
  await state.load();
  const api = { store, state, directory, credentials: { resolve: async () => null, set: async () => {} }, observation: createObservation() };
  const tools = Object.fromEntries(createAddonTools(api).map(tool => [tool.name, tool]));
  assert.ok(tools.darask_plan && tools.darask_memory && tools.darask_kanban && tools.darask_modlens);
  const created = await tools.darask_plan.execute({ action: 'create', title: 'ship', steps: ['a', 'b'] }, { signal: new AbortController().signal });
  assert.match(created.text, /Created plan_/);
  const observation = createObservation();
  observeMessages(observation, [{ role: 'user', content: 'この設計を調査して' }]);
  const decorated = decorateRequest(store, observation, { provider: 'openrouter', model: 'x' }, { provider: 'openrouter', id: 'x', reasoning: { efforts: [{ id: 'high' }] } });
  assert.equal(decorated.reasoningEffort, 'high');
  const local = decorateRequest(store, observation, { provider: 'darask-local', model: 'unseen-gemma4-26b-q4', reasoningEffort: 'low' });
  assert.equal(Object.hasOwn(local, 'reasoningEffort'), false);
  assert.equal(local.provider, 'darask-local');
  const tempFile = path.join(directory, 'test_foo.py');
  await writeFile(tempFile, 'print(1)\n');
  assert.equal(guessCleanupCategory(tempFile), 'test');
  assert.equal(isSafeCleanupPath(tempFile, directory), true);
  assert.equal(isSafeCleanupPath('C:\\Windows\\System32\\secret.py', directory), false);
  const addons = await createAddons({ store, directory, credentials: api.credentials });
  const status = await addons.status();
  assert.equal(status.groups.length, GROUPS.length);
  assert.equal(status.securityBlock, true);
  await addons.action({ action: 'save', config: { enabled: { kanban: false } } });
  assert.equal(store.enabled('kanban'), false);
});

test('addons UI dictionaries keep ja/en parity', () => {
  assert.deepEqual(Object.keys(addonsDictionaries.ja).sort(), Object.keys(addonsDictionaries.en).sort());
});
