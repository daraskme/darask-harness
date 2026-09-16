import { anchorSuffix, splitLines } from './scheme.mjs';

export const ARROW = '\u2192';

/** Render `LINE:ANCHOR→CONTENT` rows for the `[offset, offset + limit)` window (1-based offset). */
export function formatHashline(content, { offset = 1, limit = Infinity } = {}, scheme) {
  const lines = splitLines(content);
  const anchors = scheme.generateAnchors(lines);
  const skip = Math.max(0, offset - 1);
  const end = Math.min(lines.length, skip + limit);
  const rows = [];
  for (let index = skip; index < end; index += 1) {
    rows.push(`${index + 1}:${anchorSuffix(anchors[index])}${ARROW}${lines[index]}`);
  }
  return { text: rows.join('\n'), totalLines: lines.length, shown: rows.length };
}

export function renderAnchoredLine(anchor, line) {
  return `${anchor.line}:${anchorSuffix(anchor)}${ARROW}${line}`;
}
