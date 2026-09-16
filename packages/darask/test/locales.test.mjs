import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import grok from '../src/locales/grok-ja.mjs';
import codex from '../src/locales/codex-ja.mjs';
import { en, ja } from '../vendor/dsh-bridge-gateway/client/i18n.js';
import { messageJa, labelJa } from '../src/locales/messages-ja.mjs';

const placeholders = value => [...String(value).matchAll(/\{(\w+)\}/g)].map(x => x[1]).sort();
function parity(original, translated) {
  assert.deepEqual(Object.keys(translated).sort(), Object.keys(original).sort());
  for (const [key, value] of Object.entries(original)) assert.deepEqual(placeholders(translated[key]), placeholders(value), key);
}
test('Japanese dictionaries cover every pinned Grok and Codex setting and preserve placeholders', async () => {
  const grokSource = await readFile(new URL(import.meta.resolve('dsh-grok-provider/client')), 'utf8');
  const grokEn = grokSource.match(/en: (\{[\s\S]*?\n      \}),\n    \}/)?.[1];
  const codexSource = await readFile(new URL(import.meta.resolve('dsh-codex-connect/client')), 'utf8');
  const codexEn = codexSource.match(/const en = (\{[\s\S]*?\n\t\t\});/)?.[1];
  assert.ok(grokEn); assert.ok(codexEn);
  parity(runInNewContext(`(${grokEn})`), grok);
  parity(runInNewContext(`(${codexEn})`), codex);
  parity(en, ja);
});
test('Japanese usage and failures are readable without changing exact balances', () => {
  assert.equal(labelJa('Grok weekly'), 'Grok の週間利用枠');
  assert.equal(labelJa('Complimentary large models'), '無料枠・大型モデル');
  assert.equal(labelJa('Complimentary small models'), '無料枠・小型モデル');
  assert.equal(labelJa('Codex · 5 hour'), 'Codex · 5 時間');
  assert.match(messageJa('The DSH session or browser origin is not authorized for this provider.'), /許可/);
  assert.match(messageJa('Computer: enable PC screen control in Settings → Accounts → PCs & Tailscale.'), /画面操作/);
  assert.match(messageJa('Provider request failed (HTTP 403).'), /HTTP 403/);
  assert.equal(labelJa('12.3456789'), '12.3456789');
});
