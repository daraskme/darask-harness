import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DEV_PROMPT, DEV_SKILL_FILE, DEV_RULES_FILE, loadDevSkill, parseSkillMarkdown, registerDaraskSkills } from '../src/skill-dsh-dev.mjs';
const projectSkill = fileURLToPath(new URL('../.agents/skills/dsh-dev/SKILL.md', import.meta.url));

test('dsh-dev skill has valid frontmatter and grep guidance', async () => {
  const raw = await readFile(DEV_SKILL_FILE, 'utf8');
  const parsed = parseSkillMarkdown(raw);
  assert.equal(parsed.name, 'dsh-dev');
  assert.match(parsed.description, /darask-harness|grep|GUI/);
  assert.match(parsed.content, /No files were searched/);
  assert.match(parsed.content, /node_modules/);
  assert.match(parsed.content, /\*\.ts/);
  assert.match(parsed.content, /127\.0\.0\.1:3080/);
  assert.match(parsed.content, /offset must be a positive integer/);
  assert.match((await readFile(DEV_RULES_FILE, 'utf8')), /offset must be a positive integer/);
  const loaded = loadDevSkill();
  assert.equal(loaded.source, 'runtime');
  assert.equal(loaded.resourceBase.kind, 'directory');
  assert.equal(loaded.path, DEV_SKILL_FILE);
  const rules = (await readFile(DEV_RULES_FILE, 'utf8')).trim();
  assert.ok(loaded.content.endsWith(rules), 'DSH must receive the full repository rules, not just a link');
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(manifest.files.includes('AGENTS.md'), 'installed plugins must include their editing rules');
  assert.ok(manifest.files.includes('skills'), 'installed plugins must include the development skill');
  assert.equal(await readFile(projectSkill, 'utf8'), raw);
});

test('skill markdown parser rejects incomplete documents', () => {
  assert.throws(() => parseSkillMarkdown('# no frontmatter\n'), /frontmatter/);
  assert.throws(() => parseSkillMarkdown('---\nname: dsh-dev\n---\nbody\n'), /name and description/);
  assert.throws(() => parseSkillMarkdown('---\ndescription: only\n---\nbody\n'), /name and description/);
});

test('plugin registers dsh-dev when the skills service is present', () => {
  const registered = [];
  const inject = [];
  registerDaraskSkills({
    inject(deps, fn) {
      inject.push(deps);
      fn({ skills: { register(skill) { registered.push(skill); } } });
    },
  });
  assert.deepEqual(inject, [['skills']]);
  assert.equal(registered.length, 1);
  assert.equal(registered[0].name, 'dsh-dev');
  assert.match(registered[0].content, /gitignore/);
  assert.match(DEV_PROMPT, /dsh-dev/);
  assert.match(DEV_PROMPT, /No files were searched/);
  assert.match(DEV_PROMPT, /offset must be a positive integer/);
  assert.match(DEV_PROMPT, /darask_remote_sessions/);
});
