import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateClientBundle } from '../scripts/client-preflight.mjs';

const fixture = body => `window.__ModuleLoader__.load({ id: 'dsh-darask', factory: () => ({ apply(ctx) { ${body} } }) });`;

test('built client coexists with native permissions and Japanese pack through unload/reapply', () => {
  validateClientBundle(readFileSync(new URL('../dist/client.js', import.meta.url), 'utf8'));
});

test('the actual locale runtime rejects foreign namespace registrations in Japanese and English', () => {
  for (const ns of ['settings.permission', 'permission.access']) {
    for (const language of ['ja', 'en']) {
      assert.throws(() => validateClientBundle(fixture(`ctx.effect(() => ctx.locale.register('${ns}', '${language}', {'preset.auto': '自動'}));`)), /already has locale/);
    }
  }
});

test('unscoped locale registration cannot be published even when its first apply succeeds', () => {
  assert.throws(() => validateClientBundle(fixture(`ctx.locale.register('settings.darask.test', 'ja', {label: '漏れ'});`)), /leaked locale dictionaries/);
});

test('missing apply cannot silently pass validation', () => {
  assert.throws(() => validateClientBundle(`window.__ModuleLoader__.load({ id: 'dsh-darask', factory: () => ({}) });`), /export apply/);
});
