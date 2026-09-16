// Anchor-annotated regex search over a filesystem tree via `ctx.fs`.
// Output follows grok-build `hashline_grep`: `LINE:ANCHOR:match` and `LINE:ANCHOR-context`.

import { splitLines, anchorSuffix } from './scheme.mjs';

export const DEFAULT_IGNORED_DIRECTORIES = new Set([
  '.git', '.hg', '.svn', 'node_modules', '.pnpm-store', 'dist', 'build', 'target', '.next', '.nuxt', '.cache', '__pycache__', '.venv', 'venv',
]);

const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Convert a glob such as `*.ts` or `src/**\/*.mjs` to a RegExp matched against `/`-joined relative paths. */
export function globToRegExp(glob) {
  let pattern = '';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === '*') {
      if (glob[index + 1] === '*') {
        index += 1;
        if (glob[index + 1] === '/') index += 1;
        pattern += '(?:.*/)?';
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
    } else {
      pattern += char.replace(/[.+^$()|[\]\\]/g, '\\$&');
    }
  }
  if (!glob.includes('/')) pattern = `(?:.*/)?${pattern}`;
  return new RegExp(`^${pattern}$`);
}

function compilePattern(pattern, caseInsensitive) {
  try {
    return new RegExp(pattern, caseInsensitive ? 'iu' : 'u');
  } catch (error) {
    throw new Error(`Invalid regular expression "${pattern}": ${error.message}`);
  }
}

function looksBinary(text) {
  const probe = text.slice(0, 8192);
  return probe.includes('\u0000') || probe.includes('\uFFFD');
}

/**
 * Walk `root`, match `pattern` in text files, and render anchored results.
 * Returns `{ text, files, matches, truncated }`.
 */
export async function hashlineSearch(fs, root, {
  pattern,
  glob,
  caseInsensitive = false,
  before = 0,
  after = 0,
  maxMatches = 200,
  maxFiles = 5000,
  maxFileBytes = DEFAULT_MAX_FILE_BYTES,
  ignoredDirectories = DEFAULT_IGNORED_DIRECTORIES,
  signal,
}, scheme) {
  const regex = compilePattern(pattern, caseInsensitive);
  const globRegex = glob ? globToRegExp(glob) : undefined;
  const rootInfo = await fs.stat(root, signal);
  if (!rootInfo) throw new Error(`cannot search "${root.displayPath}": not found`);

  const files = [];
  if (rootInfo.type === 'file') {
    files.push({ target: root, relative: root.displayPath.split(/[\\/]/).pop() ?? root.displayPath });
  } else {
    const queue = [{ target: root, relative: '' }];
    while (queue.length > 0 && files.length < maxFiles) {
      signal?.throwIfAborted();
      const { target, relative } = queue.shift();
      let entries;
      try {
        entries = await fs.listDir(target, signal);
      } catch {
        continue;
      }
      for (const entry of entries) {
        const entryRelative = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.type === 'directory') {
          if (!ignoredDirectories.has(entry.name)) queue.push({ target: entry.target, relative: entryRelative });
        } else if (entry.type === 'file') {
          if (entry.size !== undefined && entry.size > maxFileBytes) continue;
          if (globRegex && !globRegex.test(entryRelative)) continue;
          files.push({ target: entry.target, relative: entryRelative });
          if (files.length >= maxFiles) break;
        }
      }
    }
  }

  const sections = [];
  let matchCount = 0;
  let matchedFiles = 0;
  let truncated = false;

  for (const file of files) {
    if (truncated) break;
    signal?.throwIfAborted();
    let content;
    try {
      content = await fs.readText(file.target, signal);
    } catch {
      continue;
    }
    if (looksBinary(content)) continue;
    const lines = splitLines(content);
    const matchedIndexes = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (regex.test(lines[index])) matchedIndexes.push(index);
    }
    if (matchedIndexes.length === 0) continue;

    matchedFiles += 1;
    const anchors = scheme.generateAnchors(lines);
    const rows = [file.relative || file.target.displayPath];
    const matched = new Set(matchedIndexes);
    let previousEnd = -1;
    for (const index of matchedIndexes) {
      if (matchCount >= maxMatches) {
        truncated = true;
        break;
      }
      matchCount += 1;
      const start = Math.max(0, index - before);
      const end = Math.min(lines.length - 1, index + after);
      if (previousEnd !== -1 && start > previousEnd + 1) rows.push('--');
      for (let cursor = Math.max(start, previousEnd + 1); cursor <= end; cursor += 1) {
        const separator = matched.has(cursor) ? ':' : '-';
        rows.push(`${cursor + 1}:${anchorSuffix(anchors[cursor])}${separator}${lines[cursor]}`);
      }
      previousEnd = Math.max(previousEnd, end);
    }
    sections.push(rows.join('\n'));
  }

  const summary = truncated
    ? `Found at least ${matchCount} matches in ${matchedFiles} files (results capped at ${maxMatches}).`
    : `Found ${matchCount} matches in ${matchedFiles} files.`;
  return {
    text: sections.length > 0 ? `${summary}\n\n${sections.join('\n\n')}` : summary,
    files: matchedFiles,
    matches: matchCount,
    truncated,
  };
}
