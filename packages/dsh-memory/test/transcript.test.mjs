import { test } from 'node:test';
import assert from 'node:assert/strict';

import { condenseTranscript, DEFAULT_TRANSCRIPT_BUDGET, renderTranscript } from '../src/transcript.mjs';
import { trimMiddle } from '../src/text.mjs';

const user = text => ({ type: 'user/message', data: { content: text } });
const start = turn => ({ type: 'turn/start', data: { turn } });
const assistant = (turn, content) => ({ type: 'assistant/message', data: { turn, message: { content } } });
const tool = (turn, text, error) => ({ type: 'tool/result', data: { turn, message: { content: text }, error } });

function referenceFit(items, budget) {
  const current = items.slice();
  let text = renderTranscript(current);
  while (Buffer.byteLength(text) > budget && current.length > 1) {
    const toolIndex = current.findIndex(item => item.role.startsWith('tool-'));
    current.splice(toolIndex >= 0 ? toolIndex : 0, 1);
    text = renderTranscript(current);
  }
  if (Buffer.byteLength(text) > budget) text = trimMiddle(text, budget);
  return { items: current, text, truncated: current.length !== items.length };
}

test('small transcripts retain exact headings, separators, tool calls and UTF-8 text', () => {
  const events = [
    user('日本語でお願いします'), start(1),
    assistant(1, [{ type: 'tool-call', name: 'shell', arguments: { command: 'npm test' } }]),
    tool(1, '成功しました'),
    assistant(1, '完了しました'),
    { type: 'turn/end', data: { turn: 1 } },
    user('次へ'), start(2), tool(2, '', 'failed'), assistant(2, '確認済み'),
  ];
  const result = condenseTranscript(events, { fromTurn: 1, throughTurn: 2 });
  assert.equal(result.text, '## Turn 1\n[user]\n日本語でお願いします\n\n[tool-call shell] {"command":"npm test"}\n\n[tool-result]\n成功しました\n\n[assistant]\n完了しました\n\n## Turn 2\n[user]\n次へ\n\n[tool-error]\n\n\n[assistant]\n確認済み');
  assert.equal(result.truncated, false);
  assert.deepEqual(result, referenceFit(result.items, DEFAULT_TRANSCRIPT_BUDGET));
});

test('budget eviction matches oldest-tools-then-messages across mixed and noncontiguous turns', () => {
  const events = [
    user('old question 日本語'.repeat(5)), start(1),
    tool(2, 'separating turn'.repeat(4)),
    assistant(1, 'first answer'.repeat(5)),
    assistant(2, [{ type: 'tool-call', name: 'shell', arguments: 'args with trailing space \n\t' }]),
    tool(2, '', 'failed'),
    assistant(3, 'another answer'.repeat(5)),
    tool(1, '戻った結果'.repeat(4)),
    assistant(1, 'last answer 絵文字😀'.repeat(5)),
    tool(4, ''),
  ];
  const options = { fromTurn: 1, throughTurn: 4 };
  const full = condenseTranscript(events, options);
  for (let budget = 64; budget <= Buffer.byteLength(full.text) + 10; budget++) {
    const actual = condenseTranscript(events, { ...options, budget });
    assert.deepEqual(actual, referenceFit(full.items, budget), `budget=${budget}`);
    assert.ok(Buffer.byteLength(actual.text) <= budget);
    assert.doesNotMatch(actual.text, /\uFFFD/u);
    assert.ok(actual.items.some(item => item.text.startsWith('last answer')), 'retain the latest message');
  }
});

test('only tools retain the latest result, including empty results and trailing whitespace', () => {
  for (const events of [
    [tool(1, 'a'.repeat(500)), tool(2, ''), tool(1, '最新の結果😀'.repeat(100))],
    [tool(1, 'a'.repeat(500)), assistant(2, [{ type: 'tool-call', name: 'shell', arguments: ' \n\t' }])],
    [tool(1, '')],
    [],
  ]) {
    const full = condenseTranscript(events, { fromTurn: 1, throughTurn: 2 });
    for (const budget of [64, 200, 500, 1200, 1500]) {
      const actual = condenseTranscript(events, { fromTurn: 1, throughTurn: 2, budget });
      assert.deepEqual(actual, referenceFit(full.items, budget));
      assert.ok(Buffer.byteLength(actual.text) <= budget);
    }
  }
});

test('large transcript budgeting counts a linear amount of text and never splices retained items', t => {
  const byteLength = Buffer.byteLength.bind(Buffer);
  const measurements = [];
  for (const size of [500, 5000]) {
    const events = [user('opening request'), start(1)];
    for (let i = 0; i < size; i++) events.push(tool(1, 'output '.repeat(200)));
    events.push(assistant(1, 'latest answer 日本語😀'));
    let measuredCharacters = 0, spliceCalls = 0;
    const lengthSpy = t.mock.method(Buffer, 'byteLength', (text, encoding) => {
      measuredCharacters += text.length;
      assert.ok(measuredCharacters <= size * 10_000, 'byte counting must be bounded per input item');
      return byteLength(text, encoding);
    });
    const splice = Array.prototype.splice;
    Array.prototype.splice = function (...args) {
      spliceCalls++;
      return splice.apply(this, args);
    };
    let result;
    try {
      result = condenseTranscript(events, { fromTurn: 1, throughTurn: 1 });
    } finally {
      lengthSpy.mock.restore();
      Array.prototype.splice = splice;
    }
    measurements.push(measuredCharacters);
    assert.equal(spliceCalls, 0);
    assert.ok(byteLength(result.text) <= DEFAULT_TRANSCRIPT_BUDGET);
    assert.equal(result.items.at(-1).text, 'latest answer 日本語😀');
    assert.equal(result.truncated, true);
  }
  assert.ok(measurements[1] <= measurements[0] * 11);
});
