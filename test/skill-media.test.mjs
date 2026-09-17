import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { getEventListeners } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateXaiVideo, generateXaiImage, waitMs } from '../src/addons/integrations.mjs';
import { createAddonTools } from '../src/addons/tools.mjs';
import {
  GPT_IMAGE_2_SKILL_FILE,
  GROK_IMAGINE_VIDEO_SKILL_FILE,
  R2_STORAGE_SKILL_FILE,
  MANGA_SPEECH_BUBBLES_SKILL_FILE,
  MEDIA_PROMPT,
  loadGptImage2Skill,
  loadGrokImagineVideoSkill,
  loadR2StorageSkill,
  loadMangaSpeechBubblesSkill,
  registerMediaSkills,
} from '../src/skill-media.mjs';
import { assignLines, parseColor, wrapBalloonText } from '../src/manga-letter.mjs';

test('gpt-image-2 and grok-imagine-video skills register with Codex vs xAI tools', () => {
  const gpt = loadGptImage2Skill();
  const video = loadGrokImagineVideoSkill();
  assert.equal(gpt.name, 'gpt-image-2');
  assert.equal(gpt.path, GPT_IMAGE_2_SKILL_FILE);
  assert.match(gpt.content, /codex_connect_image_generate/);
  assert.match(gpt.content, /darask_image_gen/);
  assert.equal(video.name, 'grok-imagine-video');
  assert.equal(video.path, GROK_IMAGINE_VIDEO_SKILL_FILE);
  assert.match(video.content, /darask_imagine_video/);
  assert.match(video.content, /imagePath/);
  assert.match(MEDIA_PROMPT, /gpt-image-2/);
  assert.match(MEDIA_PROMPT, /darask_imagine_video/);
  const r2 = loadR2StorageSkill();
  assert.equal(r2.name, 'r2-storage');
  assert.equal(r2.path, R2_STORAGE_SKILL_FILE);
  assert.match(r2.content, /darask_r2/);
  assert.match(MEDIA_PROMPT, /r2-storage/);
  const manga = loadMangaSpeechBubblesSkill();
  assert.equal(manga.name, 'manga-speech-bubbles');
  assert.equal(manga.path, MANGA_SPEECH_BUBBLES_SKILL_FILE);
  assert.match(manga.content, /Shippori Antique/);
  assert.match(manga.content, /--color/);
  assert.match(MEDIA_PROMPT, /manga-speech-bubbles/);

  const registered = [];
  registerMediaSkills({
    inject(deps, fn) {
      assert.deepEqual(deps, ['skills']);
      fn({ skills: { register(skill) { registered.push(skill.name); } } });
    },
  });
  assert.deepEqual(registered, ['gpt-image-2', 'grok-imagine-video', 'r2-storage', 'manga-speech-bubbles']);
});

test('manga letter wrap, order, and color', () => {
  assert.deepEqual(wrapBalloonText('あいうえおかきく', 4), ['あいうえ', 'おかきく']);
  const assigned = assignLines(
    [{ x: 200, y: 10, w: 80, h: 40 }, { x: 10, y: 12, w: 80, h: 40 }],
    ['左', '右'],
  );
  assert.equal(assigned[0].text, '左');
  assert.equal(assigned[1].text, '右');
  assert.equal(parseColor('red').hex, '#c41e3a');
  assert.equal(parseColor('#abc').hex, '#aabbcc');
  assert.deepEqual(parseColor('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30, hex: '#0a141e' });
});

test('generateXaiVideo polls until done and saves mp4 from image-to-video', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'darask-video-'));
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });
  const still = path.join(directory, 'still.png');
  await writeFile(still, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM1sAAAAASUVORK5CYII=', 'base64'));
  const calls = [];
  let polls = 0;
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    if (String(url).endsWith('/videos/generations')) {
      const body = JSON.parse(options.body);
      assert.equal(body.model, 'grok-imagine-video-1.5');
      assert.equal(body.prompt, 'slow pan');
      assert.match(body.image.url, /^data:image\/png;base64,/);
      return { ok: true, status: 200, json: async () => ({ request_id: 'req-1' }) };
    }
    if (String(url).includes('/videos/req-1')) {
      polls += 1;
      if (polls === 1) return { ok: true, status: 200, json: async () => ({ status: 'pending', progress: 10 }) };
      return {
        ok: true, status: 200,
        json: async () => ({ status: 'done', video: { url: 'https://vidgen.x.ai/clip.mp4', duration: 8, respect_moderation: true } }),
      };
    }
    if (String(url) === 'https://vidgen.x.ai/clip.mp4') {
      return { ok: true, status: 200, arrayBuffer: async () => Uint8Array.from([0, 0, 0, 1, 2, 3]).buffer };
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  const result = await generateXaiVideo({
    credentials: { resolve: async () => ({ value: 'xai-test' }) },
    prompt: 'slow pan',
    imagePath: still,
    directory,
    fetchImpl,
    sleep: async () => {},
  });
  assert.match(result, /動画を保存しました: /);
  assert.match(result, /requestId: req-1/);
  assert.equal(calls.filter(item => item.url.includes('/videos/generations')).length, 1);
});

test('darask_imagine_video is registered on the image-gen plugin', () => {
  const tools = Object.fromEntries(createAddonTools({
    store: { enabled: () => true, get: () => ({ imageModel: 'grok-imagine-image' }) },
    state: { get: () => ({ achievements: { earned: {}, stats: {} } }), update: async () => {} },
    directory: tmpdir(),
    credentials: { resolve: async () => null },
  }).map(tool => [tool.name, tool]));
  assert.ok(tools.darask_imagine_video);
  assert.equal(tools.darask_imagine_video.timeoutMs, 600000);
  assert.ok(tools.darask_imagine_video.parameters.properties.requestId);
});

test('a mislabeled JPEG is saved and passed to video as JPEG based on its bytes', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'darask-media-format-'));
  t.after(async () => { assert.equal(path.dirname(directory), path.resolve(tmpdir())); await rm(directory, { recursive: true, force: true }); });
  // JPEG framing from an upstream response; format sniffing does not decode pixels.
  const jpeg = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');
  const credentials = { resolve: async name => name === 'DARASK_XAI_API_KEY' ? { value: 'test' } : null };
  const result = await generateXaiImage({ credentials, directory, prompt: 'test', fetchImpl: async () => new Response(JSON.stringify({ data: [{ b64_json: jpeg.toString('base64') }] })) });
  assert.match(result, /\.jpg$/);
  const files = await readdir(path.join(directory, 'addons-output'));
  assert.equal(files.length, 1); assert.deepEqual(await readFile(path.join(directory, 'addons-output', files[0])), jpeg);
  const mislabeled = path.join(directory, 'old.png'); await writeFile(mislabeled, jpeg);
  let requested = false;
  await generateXaiVideo({ credentials, directory, imagePath: mislabeled, fetchImpl: async (_url, init) => {
    assert.match(JSON.parse(init.body).image.url, /^data:image\/jpeg;base64,/); requested = true;
    return new Response('{}', { status: 400 });
  } });
  assert.equal(requested, true);
});

test('an interrupted video keeps its ID and resuming never dispatches a second generation', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'darask-video-resume-'));
  t.after(async () => { assert.equal(path.dirname(directory), path.resolve(tmpdir())); await rm(directory, { recursive: true, force: true }); });
  const credentials = { resolve: async () => ({ value: 'test' }) };
  let posts = 0;
  const initial = await generateXaiVideo({ credentials, directory, prompt: 'test', fetchImpl: async (_url, init) => {
    if (init.method === 'POST') { posts++; return new Response(JSON.stringify({ request_id: 'keep-id' })); }
    throw new Error('Authorization: secret-must-not-leak');
  } });
  assert.match(initial, /requestId: keep-id/); assert.doesNotMatch(initial, /secret-must-not-leak/);
  assert.equal(JSON.parse(await readFile(path.join(directory, 'addons-output', 'xai-video-keep-id.json'), 'utf8')).requestId, 'keep-id');
  const resumed = await generateXaiVideo({ credentials, directory, requestId: 'keep-id', fetchImpl: async (_url, init) => {
    assert.equal(init.method, 'GET');
    return new Response(JSON.stringify({ status: 'failed' }));
  } });
  assert.equal(posts, 1); assert.match(resumed, /失敗.*keep-id/);
});

test('successful waits remove their abort listeners and aborted waits reject', async () => {
  const controller = new AbortController();
  for (let i = 0; i < 15; i++) await waitMs(1, controller.signal);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  const waiting = waitMs(60000, controller.signal); controller.abort();
  await assert.rejects(waiting);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});
