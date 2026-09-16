// Pure pieces of the worktree plugin: name validation, path layout, the
// persisted registry (a JSON list of worktrees this plugin created, keyed by
// repository), and `git worktree list --porcelain` parsing.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';

export const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const RESERVED = new Set(['.', '..', 'head', 'con', 'prn', 'aux', 'nul']);

export function validateName(name) {
  if (typeof name !== 'string' || !NAME_PATTERN.test(name) || RESERVED.has(name.toLowerCase()) || name.endsWith('.lock') || name.includes('..')) {
    throw new Error(`invalid worktree name ${JSON.stringify(name)}: use 1-64 characters from [A-Za-z0-9._-], starting with a letter or digit`);
  }
  return name;
}

export function validateBranch(branch) {
  if (typeof branch !== 'string' || branch === '' || branch.length > 200) throw new Error(`invalid branch name ${JSON.stringify(branch)}: expected a non-empty string of at most 200 characters`);
  if (branch.startsWith('-') || branch.startsWith('/') || branch.endsWith('/') || branch.endsWith('.') || branch.endsWith('.lock')
    || /[\s~^:?*[\\\u0000-\u001f\u007f]/u.test(branch) || branch.includes('..') || branch.includes('@{') || branch.includes('//') || branch.split('/').some(part => part === '' || part.startsWith('.'))) {
    throw new Error(`invalid branch name ${JSON.stringify(branch)}`);
  }
  return branch;
}

export function validateRef(ref) {
  if (typeof ref !== 'string' || ref === '' || ref.startsWith('-') || /[\s\u0000-\u001f\u007f]/u.test(ref)) throw new Error(`invalid base ref ${JSON.stringify(ref)}`);
  return ref;
}

export function defaultBranch(name) {
  return `wt/${name}`;
}

/** Root under which worktrees live: configured root (absolute or repo-relative) or `<repo>/.darask/worktrees`. */
export function worktreeRoot(repoRoot, configuredRoot) {
  if (configuredRoot === undefined || configuredRoot === '') return join(repoRoot, '.darask', 'worktrees');
  return isAbsolute(configuredRoot) ? configuredRoot : resolve(repoRoot, configuredRoot);
}

export function isInside(parent, child) {
  const rel = resolve(child).slice(resolve(parent).length);
  return resolve(child).startsWith(resolve(parent)) && (rel === '' || rel.startsWith(sep));
}

export function parseWorktreeList(porcelain) {
  const entries = [];
  let current;
  for (const raw of porcelain.split('\n')) {
    const line = raw.trimEnd();
    if (line === '') {
      if (current) entries.push(current);
      current = undefined;
      continue;
    }
    const space = line.indexOf(' ');
    const key = space === -1 ? line : line.slice(0, space);
    const value = space === -1 ? '' : line.slice(space + 1);
    if (key === 'worktree') current = { path: value, head: undefined, branch: undefined, bare: false, detached: false, locked: false, prunable: false };
    else if (current) {
      if (key === 'HEAD') current.head = value;
      else if (key === 'branch') current.branch = value.replace(/^refs\/heads\//u, '');
      else if (key === 'bare') current.bare = true;
      else if (key === 'detached') current.detached = true;
      else if (key === 'locked') current.locked = true;
      else if (key === 'prunable') current.prunable = value === '' ? true : value;
    }
  }
  if (current) entries.push(current);
  return entries;
}

export function samePath(a, b) {
  const norm = value => resolve(value).replaceAll('\\', '/').replace(/\/+$/u, '');
  return process.platform === 'win32' ? norm(a).toLowerCase() === norm(b).toLowerCase() : norm(a) === norm(b);
}

/** JSON registry of plugin-created worktrees; single-writer, atomic replace. */
export class WorktreeRegistry {
  #file;
  #entries;
  #queue = Promise.resolve();

  constructor(file) {
    this.#file = file;
  }

  async load() {
    if (this.#entries !== undefined) return this.#entries;
    try {
      const parsed = JSON.parse(await readFile(this.#file, 'utf8'));
      this.#entries = Array.isArray(parsed?.worktrees) ? parsed.worktrees.filter(entry => typeof entry?.path === 'string' && typeof entry?.repoRoot === 'string' && typeof entry?.name === 'string') : [];
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      this.#entries = [];
    }
    return this.#entries;
  }

  async forRepo(repoRoot) {
    return (await this.load()).filter(entry => samePath(entry.repoRoot, repoRoot));
  }

  /** Serialize registry mutations (and the git operations that accompany them). */
  transaction(work) {
    const run = this.#queue.then(async () => {
      const entries = await this.load();
      const result = await work(entries);
      await this.#persist();
      return result;
    });
    this.#queue = run.then(() => undefined, () => undefined);
    return run;
  }

  async #persist() {
    await mkdir(dirname(this.#file), { recursive: true });
    const tmp = `${this.#file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify({ version: 1, worktrees: this.#entries }, null, 2));
    await rename(tmp, this.#file);
  }
}

export function renderList(rows) {
  if (rows.length === 0) return 'No worktrees created by this harness for this repository.';
  const lines = [];
  for (const row of rows) {
    const flags = [];
    if (row.missing) flags.push('missing');
    if (row.prunable) flags.push('prunable');
    if (row.dirty) flags.push('dirty');
    if (row.locked) flags.push('locked');
    if (row.stale) flags.push('stale');
    lines.push(`${row.name}  ${row.branch ?? '(detached)'}  ${row.head ? row.head.slice(0, 10) : '-'}  ${row.path}${flags.length > 0 ? `  [${flags.join(', ')}]` : ''}`);
  }
  return lines.join('\n');
}
