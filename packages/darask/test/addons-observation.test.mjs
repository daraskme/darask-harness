import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import { AgentRegistry } from '@deepseek-ai/dsh-agent';
import { detectConstraints, latestUserText } from '../src/addons/intent.mjs';
import { registerAddonHooks } from '../src/addons/hooks.mjs';
import { createAddons } from '../src/addons/register.mjs';

const human = text => ({ role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text }] });
const grokInfo = { provider: 'grok', id: 'grok-4.6', reasoning: { efforts: ['low', 'high'].map(id => ({ id, name: id })) } };

test('constraint extraction preserves negation and its Japanese subject verbatim', () => {
  const clauses = ['Do not delete files.', 'Never publish credentials.', 'ファイルを削除しないでください', '日本語の指示を削除するな', '英語だけで削除などは禁止'];
  assert.deepEqual(detectConstraints(clauses.join('\n')), clauses);
  assert.deepEqual(detectConstraints('Do not delete files.\nDo not delete files.'), ['Do not delete files.']);
  const longClause = `${'対象の説明'.repeat(40)}を削除するな`;
  assert.ok(detectConstraints(longClause).every(clause => clause === longClause), 'never emit a truncated affirmative fragment');
});

test('intent observation selects human input instead of plugin or tool context', () => {
  const messages = [human('Do not delete original files.'),
    { role: 'user', source: { kind: 'plugin', plugin: 'runtime-context' }, content: [{ type: 'text', text: 'Never send credentials.' }] },
    { role: 'user', source: { kind: 'tool', callId: 'c1' }, content: [{ type: 'text', text: 'tool result, not a human instruction' }] }];
  assert.equal(latestUserText(messages), 'Do not delete original files.');
  assert.equal(latestUserText([messages[1], messages[2]]), '');
  assert.equal(latestUserText([{ role: 'user', content: 'legacy human input' }]), 'legacy human input');
});

test('concurrent agents keep their own addon prompt and request effort with native initiator scopes', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'darask-observation-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const registryContext = new Context();
  const agents = new AgentRegistry(registryContext);
  const store = { enabled: id => id === 'deepseek-harness' };
  const addons = await createAddons({ directory, store });
  const handlers = new Map();
  let section;
  registerAddonHooks({
    agents,
    inject(_dependencies, callback) { callback({ systemPrompt: { section(value) { section = value; } } }); },
    on(name, callback) { handlers.set(name, callback); },
  }, addons.api);
  const preStep = messages => handlers.get('agent/pre-step')({ messages }, async () => ({ kind: 'enter', messages }));
  const first = { id: 'agent-a' };
  const second = { id: 'agent-b' };
  const firstObserved = Promise.withResolvers();
  const secondObserved = Promise.withResolvers();
  await Promise.all([
    agents.withInitiator(first, async () => {
      await preStep([human('調査して。Do not delete A files.')]);
      firstObserved.resolve();
      await secondObserved.promise;
      assert.equal(addons.decorateRequest({ provider: 'grok', model: 'grok-4.6' }, grokInfo).reasoningEffort, 'high');
      const prompt = section.text({ agent: first });
      assert.match(prompt, /A files/);
      assert.doesNotMatch(prompt, /B files/);
    }),
    agents.withInitiator(second, async () => {
      await firstObserved.promise;
      await preStep([human('hello\nDo not publish B files.')]);
      secondObserved.resolve();
      assert.equal(addons.decorateRequest({ provider: 'grok', model: 'grok-4.6' }, grokInfo).reasoningEffort, 'low');
      const prompt = section.text({ agent: second });
      assert.match(prompt, /B files/);
      assert.doesNotMatch(prompt, /A files/);
    }),
  ]);
  const request = { provider: 'grok', model: 'grok-4.6', reasoningEffort: 'high' };
  assert.deepEqual(addons.decorateRequest(request), request, 'agentless requests must not borrow the last agent');
  await preStep([human('Do not overwrite anonymous files.')]);
  assert.doesNotMatch(section.text({}), /A files|B files|anonymous files/);
  assert.doesNotMatch(section.text({ agent: { id: first.id } }), /A files|B files/, 'a replacement agent does not inherit a stale observation');
});
