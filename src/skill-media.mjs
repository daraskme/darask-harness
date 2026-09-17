import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSkillMarkdown } from './skill-dsh-dev.mjs';

export const GPT_IMAGE_2_SKILL_FILE = fileURLToPath(new URL('../skills/gpt-image-2/SKILL.md', import.meta.url));
export const GROK_IMAGINE_VIDEO_SKILL_FILE = fileURLToPath(new URL('../skills/grok-imagine-video/SKILL.md', import.meta.url));
export const R2_STORAGE_SKILL_FILE = fileURLToPath(new URL('../skills/r2-storage/SKILL.md', import.meta.url));
export const MANGA_SPEECH_BUBBLES_SKILL_FILE = fileURLToPath(new URL('../skills/manga-speech-bubbles/SKILL.md', import.meta.url));

export const MEDIA_PROMPT = 'If the user wants stills from GPT Image 2 / Codex, load the gpt-image-2 skill and use codex_connect_image_generate (not darask_image_gen). If they want Grok Imagine video or to animate a still (including a GPT Image 2 original), load grok-imagine-video and use darask_imagine_video. If they want shared Cloudflare R2 storage so generated stills and video can be edited from any environment, load r2-storage and use darask_r2. If they want specified dialogue placed into empty manga speech balloons, load manga-speech-bubbles and overlay text with skills/manga-speech-bubbles/letter.mjs — do not redraw the page.';

export function loadSkillFile(file) {
  const parsed = parseSkillMarkdown(readFileSync(file, 'utf8'));
  return {
    name: parsed.name,
    description: parsed.description,
    ...(parsed.whenToUse ? { whenToUse: parsed.whenToUse } : {}),
    source: 'runtime',
    content: parsed.content,
    path: file,
    resourceBase: { kind: 'directory', path: dirname(file) },
  };
}

export function loadGptImage2Skill(file = GPT_IMAGE_2_SKILL_FILE) {
  return loadSkillFile(file);
}

export function loadGrokImagineVideoSkill(file = GROK_IMAGINE_VIDEO_SKILL_FILE) {
  return loadSkillFile(file);
}

export function loadR2StorageSkill(file = R2_STORAGE_SKILL_FILE) {
  return loadSkillFile(file);
}

export function loadMangaSpeechBubblesSkill(file = MANGA_SPEECH_BUBBLES_SKILL_FILE) {
  return loadSkillFile(file);
}

export function registerMediaSkills(ctx, skills = [loadGptImage2Skill(), loadGrokImagineVideoSkill(), loadR2StorageSkill(), loadMangaSpeechBubblesSkill()]) {
  ctx.inject(['skills'], scope => {
    for (const skill of skills) scope.skills.register(skill);
  });
}
