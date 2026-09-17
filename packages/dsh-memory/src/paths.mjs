// Scope directory resolution and path containment for the memory store.
// Layout (under `$DSH_HOME/darask/memory/`):
//   global/                       — user-wide memory
//   workspaces/<slug>-<hash>/     — one scope per workspace root
// Each scope holds topics/, observations/_inbox/, archive/, MEMORY.md and memory.sqlite.

import { createHash } from 'node:crypto';
import { access } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, normalize, parse, relative, resolve, sep } from 'node:path';

import { slugify } from './text.mjs';

export const SCOPE_DIRS = ['topics', 'observations', join('observations', '_inbox'), 'archive'];
export const MANIFEST_FILE = 'MEMORY.md';
export const STATE_FILE = 'memory.sqlite';

export const SCOPES = ['global', 'workspace'];

/** Normalized absolute path used for hashing; case-folded on Windows so drive-letter casing does not split a workspace. */
export function canonicalWorkspaceKey(path) {
  let value = normalize(resolve(path)).replace(/[\\/]+$/u, '');
  if (process.platform === 'win32') value = value.replace(/\//gu, '\\').toLowerCase();
  return value;
}

export function workspaceScopeName(workspaceRoot) {
  const key = canonicalWorkspaceKey(workspaceRoot);
  const hash = createHash('sha256').update(key).digest('hex').slice(0, 16);
  const slug = slugify(basename(key) || parse(key).root.replace(/[^a-z0-9]/giu, '') || 'root', 32) || 'workspace';
  return `${slug}-${hash}`;
}

/** Walk up from `cwd` to the nearest directory containing one of `markers`; falls back to `cwd`. */
export async function findWorkspaceRoot(cwd, markers = ['.git']) {
  let current = resolve(cwd);
  for (;;) {
    for (const marker of markers) {
      try {
        await access(join(current, marker));
        return current;
      } catch {
        // keep walking
      }
    }
    const parent = dirname(current);
    if (parent === current) return resolve(cwd);
    current = parent;
  }
}

export function memoryRoot(dshHome) {
  return join(dshHome, 'darask', 'memory');
}

export function scopeDirFor(dshHome, scope, workspaceRoot) {
  const root = memoryRoot(dshHome);
  if (scope === 'global') return join(root, 'global');
  if (scope === 'workspace') {
    if (typeof workspaceRoot !== 'string' || workspaceRoot === '') throw new Error('workspace scope requires a workspace root');
    return join(root, 'workspaces', workspaceScopeName(workspaceRoot));
  }
  throw new Error(`unknown memory scope "${String(scope)}"`);
}

const RELATIVE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const ALLOWED_ROOTS = new Set(['topics', 'observations', 'archive']);

/**
 * Validate a scope-relative memory path (`topics/x.md`, `observations/_inbox/y.md`,
 * `archive/z.md`, `MEMORY.md`). Rejects absolute paths, `..`, hidden segments other
 * than `_inbox`, and anything outside the known roots.
 */
export function validateRelativePath(relPath) {
  if (typeof relPath !== 'string' || relPath === '') throw new MemoryPathError('memory path is required');
  const normalized = relPath.replace(/\\/gu, '/');
  if (normalized.startsWith('/') || isAbsolute(relPath) || /^[A-Za-z]:/u.test(normalized)) throw new MemoryPathError(`memory path must be scope-relative: ${relPath}`);
  if (normalized === MANIFEST_FILE) return normalized;
  const segments = normalized.split('/');
  if (segments.length < 2 || segments.length > 3) throw new MemoryPathError(`memory path has an unexpected depth: ${relPath}`);
  if (!ALLOWED_ROOTS.has(segments[0])) throw new MemoryPathError(`memory path must start with topics/, observations/ or archive/: ${relPath}`);
  for (let index = 1; index < segments.length; index++) {
    const segment = segments[index];
    const isInbox = index === 1 && segments.length === 3 && segments[0] === 'observations' && segment === '_inbox';
    if (!isInbox && !RELATIVE_SEGMENT.test(segment)) throw new MemoryPathError(`memory path segment is not allowed: ${relPath}`);
  }
  if (segments.length === 3 && !(segments[0] === 'observations' && segments[1] === '_inbox')) throw new MemoryPathError(`memory path has an unexpected depth: ${relPath}`);
  if (!segments.at(-1).endsWith('.md')) throw new MemoryPathError(`memory files are markdown: ${relPath}`);
  return normalized;
}

export function isTopicPath(relPath) {
  return /^topics\/[a-z0-9][a-z0-9-]*\.md$/u.test(relPath);
}

export function isInboxPath(relPath) {
  return /^observations\/_inbox\/[A-Za-z0-9][A-Za-z0-9._-]*\.md$/u.test(relPath);
}

/** Resolve a validated relative path under `scopeDir`, re-checking containment. */
export function resolveContained(scopeDir, relPath) {
  const validated = validateRelativePath(relPath);
  const absolute = resolve(scopeDir, ...validated.split('/'));
  const rel = relative(resolve(scopeDir), absolute);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel) || rel.split(sep).includes('..')) throw new MemoryPathError(`memory path escapes the scope: ${relPath}`);
  return { absolute, relative: validated };
}

export class MemoryPathError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MemoryPathError';
    this.code = 'MEMORY_PATH';
  }
}
