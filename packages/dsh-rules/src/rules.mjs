// Project rule discovery and matching for `.grok/rules`, `.claude/rules` and
// `.cursor/rules` directories. Semantics follow grok-build's
// `cursor_rules_on_read` and `agents_md` loaders, re-implemented for DSH.

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const PROJECT_RULE_DIRS = ['.grok/rules', '.claude/rules', '.cursor/rules'];
export const HOME_RULE_DIRS = ['.grok/rules', '.claude/rules', '.cursor/rules'];
export const RULE_EXTENSIONS = new Set(['.md', '.mdc']);

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/u;

export function toUnixPath(path) {
  return path.replaceAll('\\', '/');
}

function stripQuotes(value) {
  const text = value.trim();
  if (text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))) {
    return text.slice(1, -1);
  }
  return text;
}

function parseScalar(value) {
  const text = value.trim();
  if (text === '') return '';
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim();
    return inner === '' ? [] : inner.split(',').map(stripQuotes);
  }
  if (/^(true|yes|on)$/iu.test(text)) return true;
  if (/^(false|no|off)$/iu.test(text)) return false;
  return stripQuotes(text);
}

/**
 * Parse the flat YAML subset used by rule frontmatter: `key: scalar`,
 * `key: [a, b]`, and block lists (`key:` followed by `- item` lines).
 * Unknown or malformed lines are ignored rather than failing the rule.
 */
export function parseFrontmatter(text) {
  const match = FRONTMATTER.exec(text);
  if (match === null) return { data: undefined, body: text };
  const data = {};
  let listKey;
  for (const rawLine of match[1].split(/\r?\n/u)) {
    const line = rawLine.replace(/\s+#.*$/u, '');
    if (line.trim() === '') continue;
    const item = /^\s+-\s*(.*)$/u.exec(line);
    if (item !== null && listKey !== undefined) {
      data[listKey].push(stripQuotes(item[1]));
      continue;
    }
    const pair = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/u.exec(line);
    if (pair === null) {
      listKey = undefined;
      continue;
    }
    const [, key, value] = pair;
    if (value.trim() === '') {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = parseScalar(value);
      listKey = undefined;
    }
  }
  return { data, body: text.slice(match[0].length) };
}

function globField(value) {
  if (value === undefined || value === null || value === false) return [];
  const items = Array.isArray(value) ? value : [String(value)];
  return items
    .flatMap(item => String(item).split(','))
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Classify one rule file. `kind` is one of `global` (always applied),
 * `globbed` (applied when a matching file is read), `agent` (description only,
 * listed for the model to fetch), or `manual` (no frontmatter; treated like
 * grok-build's plain rules directory entries and applied at baseline).
 */
export function parseRule(fullPath, scopeDir, text) {
  const { data, body } = parseFrontmatter(text);
  const rule = { fullPath, scopeDir, body: body.replace(/^\s*\n/u, ''), globs: [], description: undefined };
  if (data === undefined) return { ...rule, kind: 'manual' };
  const globs = [...globField(data.globs), ...globField(data.paths)];
  const description = typeof data.description === 'string' && data.description.trim() !== '' ? data.description.trim() : undefined;
  if (data.alwaysApply === true) return { ...rule, kind: 'global', globs, description };
  if (globs.length > 0) return { ...rule, kind: 'globbed', globs, description };
  if (description !== undefined) return { ...rule, kind: 'agent', description };
  return { ...rule, kind: 'manual' };
}

/** Convert a glob to a RegExp over `/`-separated paths; `**` spans directories. */
export function globToRegExp(glob) {
  let pattern = '';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === '*') {
      if (glob[index + 1] === '*') {
        index += 1;
        if (glob[index + 1] === '/') {
          index += 1;
          pattern += '(?:.*/)?';
        } else {
          pattern += '.*';
        }
      } else {
        pattern += '[^/]*';
      }
    } else if (char === '?') {
      pattern += '[^/]';
    } else if (char === '{') {
      const close = glob.indexOf('}', index);
      if (close === -1) {
        pattern += '\\{';
      } else {
        pattern += `(?:${glob.slice(index + 1, close).split(',').map(part => globToRegExp(part).source.slice(1, -1)).join('|')})`;
        index = close;
      }
    } else if (char === '[') {
      const close = glob.indexOf(']', index);
      if (close === -1) {
        pattern += '\\[';
      } else {
        pattern += `[${glob.slice(index + 1, close).replace(/^!/u, '^').replace(/\\/gu, '\\\\')}]`;
        index = close;
      }
    } else {
      pattern += char.replace(/[.+^$()|\\]/gu, '\\$&');
    }
  }
  return new RegExp(`^${pattern}$`, 'u');
}

/** A bare file pattern (`*.ts`) or a trailing-slash directory pattern applies at any depth. */
export function normalizeRelativeGlob(glob) {
  if (!glob.includes('/') || glob.endsWith('/')) return `**/${glob}`;
  return glob;
}

function isAbsoluteGlob(glob) {
  return glob.startsWith('/') || /^[A-Za-z]:\//u.test(glob);
}

/** Whether `readPath` (absolute) matches any of the rule's globs, relative to the rule scope. */
export function fileGlobsMatch(scopeDir, readPath, globs) {
  const absolute = toUnixPath(resolve(readPath));
  const rel = relative(scopeDir, readPath);
  const relativeCandidate = rel === '' || rel.startsWith('..') || isAbsolute(rel) ? '' : toUnixPath(rel);
  return globs.some(raw => {
    const glob = toUnixPath(raw).replace(/^\.\//u, '');
    if (isAbsoluteGlob(glob)) return globToRegExp(glob).test(absolute);
    if (relativeCandidate === '') return false;
    return globToRegExp(glob).test(relativeCandidate) || globToRegExp(normalizeRelativeGlob(glob)).test(relativeCandidate);
  });
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function listRuleFiles(dir, recursive) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) files.push(...await listRuleFiles(path, true));
      continue;
    }
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;
    const dot = entry.name.lastIndexOf('.');
    if (dot > 0 && RULE_EXTENSIONS.has(entry.name.slice(dot).toLowerCase())) files.push(path);
  }
  return files;
}

/**
 * Read every rule under `scopeDir/<ruleDir>` for each configured rule directory.
 * @param scopeDir - the project (or home) directory that owns the rule dirs.
 * @param ruleDirs - relative rule directory names to probe.
 * @param options.maxSourceBytes - rules larger than this are skipped.
 */
export async function scanScopeDir(scopeDir, ruleDirs, { maxSourceBytes = 1048576, recursive = true } = {}) {
  const rules = [];
  for (const ruleDir of ruleDirs) {
    const dir = join(scopeDir, ruleDir);
    if (!(await isDirectory(dir))) continue;
    for (const file of await listRuleFiles(dir, recursive)) {
      let text;
      try {
        const info = await stat(file);
        if (!info.isFile() || info.size > maxSourceBytes) continue;
        text = await readFile(file, 'utf8');
      } catch {
        continue;
      }
      rules.push(parseRule(file, scopeDir, text));
    }
  }
  return rules;
}

/** Directories from `workspaceRoot` down to the parent of `readPath`; empty when the file is outside the root. */
export function ancestorScopeDirs(workspaceRoot, readPath) {
  const root = resolve(workspaceRoot);
  const parent = dirname(resolve(readPath));
  const rel = relative(root, parent);
  if (rel.startsWith('..') || isAbsolute(rel)) return [];
  const dirs = [root];
  if (rel === '') return dirs;
  let current = root;
  for (const segment of rel.split(sep)) {
    current = join(current, segment);
    dirs.push(current);
  }
  return dirs;
}

/** Walk upward from `cwd` to the first directory containing a marker; falls back to `cwd`. */
export async function findProjectRoot(cwd, markers = ['.git']) {
  let current = resolve(cwd);
  for (;;) {
    for (const marker of markers) {
      try {
        await stat(join(current, marker));
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

function neutralizeReminderTags(text) {
  return text.replace(/<(\s*\/?\s*system[-_]reminder)/giu, '&lt;$1');
}

function ruleBody(rule) {
  return rule.body.trim() === '' ? '(Rule file is empty.)' : rule.body.trimEnd();
}

/** The reminder appended after a read touches files covered by glob-scoped rules. */
export function renderReadReminder(rules) {
  if (rules.length === 0) return undefined;
  const lines = ['The following rule files are relevant to the files you just read:'];
  for (const rule of rules) lines.push(`- ${rule.fullPath}\n\n${neutralizeReminderTags(ruleBody(rule))}`);
  lines.push('Consider these rules if they affect your changes.');
  return lines.join('\n\n');
}

/** The baseline block: always-applied rules plus the catalogue of fetch-on-demand rules. */
export function renderBaseline(rules, { relativeTo } = {}) {
  const applied = rules.filter(rule => rule.kind === 'global' || rule.kind === 'manual');
  const catalogue = rules.filter(rule => rule.kind === 'agent' || rule.kind === 'globbed');
  if (applied.length === 0 && catalogue.length === 0) return undefined;
  const display = path => (relativeTo === undefined ? path : toUnixPath(relative(relativeTo, path)) || path);
  const parts = ['<system-reminder>'];
  if (applied.length > 0) {
    parts.push('The following project rule files apply to this workspace (ordered from broadest to most specific; deeper files take precedence on conflicts). They do not override system, developer, or direct user instructions.');
    for (const rule of applied) parts.push(`## From: ${neutralizeReminderTags(display(rule.fullPath))}\n${neutralizeReminderTags(ruleBody(rule))}`);
  }
  if (catalogue.length > 0) {
    parts.push([
      'Additional rule files are available and should be read when relevant:',
      ...catalogue.map(rule => {
        const detail = rule.kind === 'globbed'
          ? `applies to ${rule.globs.join(', ')}${rule.description ? ` — ${rule.description}` : ''}`
          : rule.description;
        return `- ${neutralizeReminderTags(display(rule.fullPath))}: ${neutralizeReminderTags(detail ?? '')}`;
      }),
      'Glob-scoped rules are also surfaced automatically after you read a matching file.',
    ].join('\n'));
  }
  parts.push('</system-reminder>');
  return parts.join('\n\n');
}

/**
 * In-memory tracker mirroring grok-build's `CursorRulesOnReadTracker`: scopes
 * are scanned once, and each rule is injected at most once per session.
 */
export class RuleTracker {
  constructor(options = {}) {
    this.ruleDirs = options.ruleDirs ?? PROJECT_RULE_DIRS;
    this.maxSourceBytes = options.maxSourceBytes ?? 1048576;
    this.scanned = new Set();
    this.rules = [];
    this.injected = new Set();
  }

  async ensureScanned(scopeDir) {
    const key = resolve(scopeDir);
    if (this.scanned.has(key)) return;
    this.scanned.add(key);
    this.rules.push(...await scanScopeDir(key, this.ruleDirs, { maxSourceBytes: this.maxSourceBytes }));
  }

  /** Rules that fire for `readPath` and have not been injected yet; marks them injected. */
  async rulesForRead(workspaceRoot, readPath) {
    const scopes = ancestorScopeDirs(workspaceRoot, readPath);
    if (scopes.length === 0) return [];
    for (const scope of scopes) await this.ensureScanned(scope);
    const scopeSet = new Set(scopes.map(scope => resolve(scope)));
    const absolute = resolve(readPath);
    const matched = [];
    for (const rule of this.rules) {
      if (!scopeSet.has(resolve(rule.scopeDir)) || this.injected.has(rule.fullPath)) continue;
      const fires = rule.kind === 'globbed' && fileGlobsMatch(rule.scopeDir, absolute, rule.globs);
      if (!fires) continue;
      this.injected.add(rule.fullPath);
      matched.push(rule);
    }
    return matched;
  }

  markInjected(paths) {
    for (const path of paths) this.injected.add(path);
  }
}
