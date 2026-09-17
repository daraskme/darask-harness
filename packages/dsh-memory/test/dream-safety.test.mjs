import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Config, apply } from '../src/index.mjs';
import { parseModelOutcome } from '../src/observation.mjs';
import { MemoryScopeStore } from '../src/store.mjs';

async function fixture() {
  const home = await mkdtemp(join(tmpdir(), 'dream-safety-'));
  const dir = join(home, 'darask', 'memory', 'global');
  let time = Date.now();
  const store = await MemoryScopeStore.open(dir, { scope: 'global', now: () => time });
  const observations = parseModelOutcome(JSON.stringify({ outcome: 'observations', observations: [{ type: 'user', statement: 'Prefer Japanese' }] }), { model: 'test', createdAt: time }).observations;
  const evidence = await store.persistObservations(observations, { sessionId: 'session', fromTurn: 1, throughTurn: 1 });
  return {
    home, dir, store, evidence, observations,
    advance: ms => { time += ms; },
    [Symbol.asyncDispose]: async () => { store.close(); await rm(home, { recursive: true, force: true, maxRetries: 5 }); },
  };
}

test('Dream conflicts leave unrelated topics and pending observations untouched', async () => {
  await using f = await fixture();
  const paths = ['topics/a.md', 'topics/b.md', 'topics/c.md'];
  await f.store.applyDreamPlan({ operations: paths.map(path => ({ op: 'create', path, content: `# ${path}`, evidence: f.evidence })) }, f.evidence);
  f.evidence = await f.store.persistObservations(f.observations, { sessionId: 'session', fromTurn: 2, throughTurn: 2 });
  const operations = [
    { op: 'rename', from: paths[0], to: paths[1] },
    { op: 'merge', sources: [paths[0], paths[2]], into: paths[1], content: '# Merged', evidence: f.evidence },
    { op: 'split', from: paths[0], into: [{ path: paths[1], content: '# Split' }], evidence: f.evidence },
    { op: 'split', from: paths[0], into: [{ path: 'topics/new.md', content: '# One' }, { path: 'topics/new.md', content: '# Two' }], evidence: f.evidence },
  ];
  for (const op of operations) {
    await assert.rejects(f.store.applyDreamPlan({ operations: [op] }, f.evidence), /already exists/);
    for (const path of paths) assert.equal(await readFile(join(f.dir, path), 'utf8'), `# ${path}\n`);
    assert.equal(f.store.pendingStats().count, 1);
  }
  await f.store.applyDreamPlan({ operations: [{ op: 'merge', sources: [paths[0], paths[1]], into: paths[0], content: '# Combined', evidence: f.evidence }] }, f.evidence);
  assert.equal(await readFile(join(f.dir, paths[0]), 'utf8'), '# Combined\n');
});

test('expired Dream owners cannot write or release a replacement lease', async () => {
  await using f = await fixture();
  assert.equal(f.store.acquireLease('dream', 'first', 10), true);
  f.advance(11);
  assert.equal(f.store.acquireLease('dream', 'second', 1000), true);
  await assert.rejects(f.store.applyDreamPlan({ operations: [] }, f.evidence, { leaseOwner: 'first' }), /lease/);
  f.store.releaseLease('dream', 'first');
  f.store.assertLease('dream', 'second');
  assert.equal(f.store.pendingStats().count, 1);
});

test('concurrent Dream commands in one plugin cannot share an active lease', async () => {
  await using f = await fixture();
  const started = Promise.withResolvers(), finish = Promise.withResolvers();
  const commands = new Map(), disposers = [];
  let calls = 0;
  const ctx = {
    logger: { info() {}, warn() {}, debug() {} },
    tools: { register() {} },
    commands: { register(command) { commands.set(command.name, command); return () => {}; } },
    effect(generator) { for (const dispose of generator()) disposers.push(dispose); },
    llm: { async *stream() {
      calls++;
      started.resolve();
      await finish.promise;
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'text-delta', index: 0, text: '{"operations":[]}' };
      yield { type: 'block-end', index: 0, block: { type: 'text', text: '{"operations":[]}' } };
      yield { type: 'finish', reason: { kind: 'stop' } };
    } },
  };
  apply(ctx, new Config({ dshHome: f.home, capture: false, injectContext: false, dream: false }));
  const agent = { session: { id: 's', header: { cwd: f.home }, requestContext: () => ({ provider: 'test', model: 'test' }) } };
  const handler = commands.get('memory').handler;
  const first = handler({ rawInput: 'dream global', agent });
  try {
    await Promise.race([started.promise, first.then(result => { throw new Error(`Dream did not call model: ${result.text}`); })]);
    const second = handler({ rawInput: 'dream global', agent });
    const result = await Promise.race([second, new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('second Dream did not skip its active lease')), 2000);
      second.finally(() => clearTimeout(timer));
    })]);
    assert.match(result.text, /lease-held/);
    assert.equal(calls, 1);
  } finally {
    finish.resolve();
    await first;
    for (const dispose of disposers.reverse()) await dispose();
  }
});
