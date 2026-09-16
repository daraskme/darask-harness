// Candidate file enumeration: `git ls-files` (tracked + untracked, honoring
// .gitignore) when the root is a git worktree, otherwise a recursive walk
// that skips the usual dependency / build directories.

import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { languageForPath } from './languages.mjs';

const execFileAsync = promisify(execFile);

export const DEFAULT_IGNORED_DIRS = Object.freeze(['.git', 'node_modules', 'dist', 'build', 'target', 'out', '.venv', 'venv', '__pycache__', '.next', '.turbo', 'coverage', 'vendor']);

export function toPosix(path) {
  return path.replaceAll('\\', '/');
}

async function gitListFiles(root, timeoutMs) {
  const { stdout } = await execFileAsync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8', windowsHide: true });
  return stdout.split('\0').filter(Boolean);
}

async function walkDir(root, ignoredDirs) {
  const out = [];
  const ignored = new Set(ignoredDirs);
  const pending = [''];
  while (pending.length > 0) {
    const relative = pending.pop();
    let entries;
    try {
      entries = await readdir(join(root, relative), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const child = relative === '' ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) pending.push(child);
      } else if (entry.isFile()) {
        out.push(child);
      }
    }
  }
  return out;
}

/**
 * Lists indexable files under `root` as posix paths relative to `root`,
 * paired with their language id. Returns `{ files, source }` where source is
 * 'git' or 'walk'.
 */
export async function listIndexableFiles(root, { ignoredDirs = DEFAULT_IGNORED_DIRS, gitTimeoutMs = 30_000, useGit = true } = {}) {
  let candidates;
  let source = 'walk';
  if (useGit) {
    try {
      candidates = await gitListFiles(root, gitTimeoutMs);
      source = 'git';
    } catch {
      candidates = undefined;
    }
  }
  candidates ??= await walkDir(root, ignoredDirs);
  const files = [];
  for (const raw of candidates) {
    const path = toPosix(raw);
    const language = languageForPath(path);
    if (language) files.push({ path, language });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, source };
}
