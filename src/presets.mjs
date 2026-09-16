import { mkdir, readFile, readdir, stat, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PRESETS_ROOT = fileURLToPath(new URL('../presets/', import.meta.url));
export const USER_PRESETS_DIR = '.agent-presets';
export const MARKER_FILE = '.darask-harness.json';

async function collectFiles(root, prefix = '') {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await collectFiles(root, relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

async function pruneEmptyDirectories(root) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const path = join(root, entry.name);
    await pruneEmptyDirectories(path);
    if ((await readdir(path)).length === 0) await rm(path, { recursive: true, force: true });
  }
}

async function readOrNull(path) {
  try { return await readFile(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

/**
 * Copy one shipped preset directory into the DSH user preset root. Only a
 * directory darask-harness itself wrote (marker file present) or a missing
 * directory is touched, so a preset the user authored under the same id is
 * preserved and reported instead of overwritten.
 */
export async function syncPreset({ id, source = join(PRESETS_ROOT, id), dshHome, version }) {
  const target = join(dshHome, USER_PRESETS_DIR, id);
  const marker = join(target, MARKER_FILE);
  let existing = null;
  try { existing = await stat(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing) {
    if (!existing.isDirectory()) return { id, target, status: 'conflict' };
    if (await readOrNull(marker) === null) return { id, target, status: 'user-owned' };
  }
  const files = await collectFiles(source);
  let changed = 0;
  for (const relativePath of files) {
    const content = await readFile(join(source, relativePath));
    const current = await readOrNull(join(target, relativePath));
    if (current !== null && current.equals(content)) continue;
    await mkdir(join(target, relativePath, '..'), { recursive: true });
    await writeFile(join(target, relativePath), content);
    changed += 1;
  }
  if (existing) {
    const keep = new Set([...files, MARKER_FILE]);
    for (const relativePath of await collectFiles(target)) {
      if (!keep.has(relativePath)) { await rm(join(target, relativePath), { force: true }); changed += 1; }
    }
    await pruneEmptyDirectories(target);
  }
  await mkdir(target, { recursive: true });
  await writeFile(marker, `${JSON.stringify({ package: 'darask-harness', version, files }, null, 2)}\n`);
  return { id, target, status: existing ? (changed ? 'updated' : 'unchanged') : 'created', changed };
}

export async function listShippedPresets(root = PRESETS_ROOT) {
  const entries = await readdir(root, { withFileTypes: true });
  return entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
}
