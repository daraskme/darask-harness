import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaSettingsRoute } from '../src/media-settings.mjs';

test('Codex image availability follows native settings and actual tool registration', async () => {
  const values = { enableImageGeneration: false, enableProxy: true };
  const tools = new Map([['darask_imagine_video', {}]]);
  const route = mediaSettingsRoute({ tools, settings: {
    get(ns) { assert.equal(ns, 'llm-openai-codex'); return values; },
    async update(ns, patch) { assert.equal(ns, 'llm-openai-codex'); Object.assign(values, patch); if (patch.enableImageGeneration) tools.set('codex_connect_image_generate', {}); else tools.delete('codex_connect_image_generate'); },
  } });
  const url = 'https://dsh.example.com/api/darask/media';
  const before = await (await route.fetch(new Request(url))).json();
  assert.deepEqual(before.codex, { enabled: false, registered: false });
  const post = async (input, origin = 'https://dsh.example.com') => route.fetch(new Request(url, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(input) }));
  assert.equal((await post({ enableCodexImages: true }, 'https://foreign.example')).status, 400);
  assert.equal((await post({ enableCodexImages: true, enableProxy: false })).status, 400);
  assert.equal(values.enableImageGeneration, false);
  const enabled = await (await post({ enableCodexImages: true })).json();
  assert.deepEqual(enabled.codex, { enabled: true, registered: true });
  assert.equal(values.enableProxy, true);
  tools.delete('codex_connect_image_generate');
  assert.deepEqual((await (await route.fetch(new Request(url))).json()).codex, { enabled: true, registered: false });
  assert.deepEqual((await (await post({ enableCodexImages: false })).json()).codex, { enabled: false, registered: false });
});
