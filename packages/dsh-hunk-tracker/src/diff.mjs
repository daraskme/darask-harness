// Line-level hunk computation (grok-build xai-hunk-tracker `diff.rs` semantics):
// a hunk is one maximal run of changed lines between baseline and current text.
// Line texts keep their terminators so hunks can be re-applied byte-exactly.

import { createTwoFilesPatch, diffLines } from 'diff';

export const MAX_DIFF_BYTES = 2 * 1024 * 1024;

let sequence = 0;

export function nextHunkId() {
  sequence += 1;
  return `h${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function splitLines(text) {
  return text === '' ? [] : text.split(/(?<=\n)/u);
}

function buildHunk(builder, path, source, createdAt) {
  return {
    id: nextHunkId(),
    path,
    oldStart: builder.oldStart,
    oldCount: builder.oldLines.length,
    newStart: builder.newStart,
    newCount: builder.newLines.length,
    oldText: builder.oldLines.length === 0 ? null : builder.oldLines.join(''),
    newText: builder.newLines.join(''),
    source,
    createdAt,
  };
}

/**
 * Diff `baseline` against `current` and return the contiguous change runs in
 * file order. Identical texts and texts beyond MAX_DIFF_BYTES yield no hunks.
 */
export function computeHunks(path, baseline, current, source, createdAt = Date.now()) {
  if (baseline === current) return [];
  if (Buffer.byteLength(baseline, 'utf8') > MAX_DIFF_BYTES || Buffer.byteLength(current, 'utf8') > MAX_DIFF_BYTES) return [];
  const hunks = [];
  let oldLine = 1;
  let newLine = 1;
  let builder;
  for (const change of diffLines(baseline, current)) {
    const lines = splitLines(change.value);
    if (change.added) {
      builder ??= { oldStart: oldLine, newStart: newLine, oldLines: [], newLines: [] };
      for (const line of lines) builder.newLines.push(line);
      newLine += lines.length;
    } else if (change.removed) {
      builder ??= { oldStart: oldLine, newStart: newLine, oldLines: [], newLines: [] };
      for (const line of lines) builder.oldLines.push(line);
      oldLine += lines.length;
    } else {
      if (builder) { hunks.push(buildHunk(builder, path, source, createdAt)); builder = undefined; }
      oldLine += lines.length;
      newLine += lines.length;
    }
  }
  if (builder) hunks.push(buildHunk(builder, path, source, createdAt));
  return hunks;
}

export function fileCreatedHunk(path, content, source, createdAt = Date.now()) {
  return { id: nextHunkId(), path, oldStart: 1, oldCount: 0, newStart: 1, newCount: splitLines(content).length, oldText: null, newText: content, source, createdAt };
}

export function fileDeletedHunk(path, baseline, source, createdAt = Date.now()) {
  return { id: nextHunkId(), path, oldStart: 1, oldCount: splitLines(baseline).length, newStart: 1, newCount: 0, oldText: baseline, newText: '', source, createdAt };
}

/** Replace `removeCount` lines from 1-based `startLine` with `insertText`. */
export function patchLines(content, startLine, removeCount, insertText) {
  const lines = splitLines(content);
  const start = Math.min(Math.max(startLine - 1, 0), lines.length);
  const end = Math.min(start + removeCount, lines.length);
  const inserted = splitLines(insertText);
  return [...lines.slice(0, start), ...inserted, ...lines.slice(end)].join('');
}

/** Apply non-overlapping edits against the original line coordinates. */
export function patchLineChanges(content, changes) {
  const lines = splitLines(content);
  const parts = [];
  let end = lines.length;
  for (const { startLine, removeCount, insertText } of [...changes].sort((a, b) => b.startLine - a.startLine)) {
    const start = Math.min(Math.max(startLine - 1, 0), lines.length);
    parts.push(lines.slice(start + removeCount, end).join(''), insertText);
    end = start;
  }
  parts.push(lines.slice(0, end).join(''));
  return parts.reverse().join('');
}

export function hunksMatchContent(a, b) {
  return a.path === b.path && a.oldText === b.oldText && a.newText === b.newText;
}

export function hunkMoved(oldHunk, newHunk) {
  return hunksMatchContent(oldHunk, newHunk) && (oldHunk.oldStart !== newHunk.oldStart || oldHunk.newStart !== newHunk.newStart || oldHunk.oldCount !== newHunk.oldCount || oldHunk.newCount !== newHunk.newCount);
}

/** Overlap by baseline line range; insertions overlap when they touch the same baseline position. */
export function hunksOverlap(a, b) {
  if (a.path !== b.path) return false;
  const aEnd = a.oldStart + a.oldCount;
  const bEnd = b.oldStart + b.oldCount;
  if (a.oldCount === 0 && b.oldCount === 0) return a.oldStart === b.oldStart;
  if (a.oldCount === 0) return a.oldStart >= b.oldStart && a.oldStart <= bEnd;
  if (b.oldCount === 0) return b.oldStart >= a.oldStart && b.oldStart <= aEnd;
  return !(aEnd < b.oldStart || bEnd < a.oldStart);
}

function overlapSize(a, b) {
  const start = Math.max(a.oldStart, b.oldStart);
  const end = Math.min(a.oldStart + a.oldCount, b.oldStart + b.oldCount);
  return Math.max(0, end - start);
}

/** Exact content match closest by position first, else the old hunk with the largest baseline overlap. */
export function findMatchingOldHunk(newHunk, oldHunks, claimed = new Set()) {
  const contentMatches = oldHunks.filter(old => !claimed.has(old.id) && hunksMatchContent(old, newHunk));
  if (contentMatches.length > 0) {
    return contentMatches.reduce((best, old) => (Math.abs(old.newStart - newHunk.newStart) < Math.abs(best.newStart - newHunk.newStart) ? old : best));
  }
  let best;
  let bestSize = -1;
  for (const old of oldHunks) {
    if (claimed.has(old.id)) continue;
    if (!hunksOverlap(old, newHunk)) continue;
    const size = overlapSize(old, newHunk);
    if (size > bestSize) { best = old; bestSize = size; }
  }
  return best;
}

function ensureTrailingNewline(text) {
  return text === '' || text.endsWith('\n') ? text : `${text}\n`;
}

/** Context-free unified rendering of a single hunk. */
export function formatHunk(hunk) {
  const header = `@@ -${hunk.oldStart}${hunk.oldCount === 1 ? '' : `,${hunk.oldCount}`} +${hunk.newStart}${hunk.newCount === 1 ? '' : `,${hunk.newCount}`} @@`;
  const lines = [header];
  for (const line of splitLines(hunk.oldText ?? '')) lines.push(`-${line.replace(/\r?\n$/u, '')}`);
  for (const line of splitLines(hunk.newText)) lines.push(`+${line.replace(/\r?\n$/u, '')}`);
  return `${lines.join('\n')}\n`;
}

/** Full unified patch with context, `undefined` when texts are identical. */
export function unifiedPatch(path, baseline, current, { context = 3 } = {}) {
  if (baseline === current) return undefined;
  const patch = createTwoFilesPatch(`a/${path}`, `b/${path}`, ensureTrailingNewline(baseline), ensureTrailingNewline(current), '', '', { context });
  return patch.replace(/^={10,}\n/u, '');
}

export function lineCounts(hunks) {
  let added = 0;
  let removed = 0;
  for (const hunk of hunks) { added += hunk.newCount; removed += hunk.oldCount; }
  return { added, removed };
}
