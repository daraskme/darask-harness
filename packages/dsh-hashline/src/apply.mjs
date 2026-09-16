// Batch application of hashline edit operations against in-memory content.
// Ported from grok-build `grok_build_hashline/edit/apply.rs` (Apache-2.0).

import { ARROW, formatHashline, renderAnchoredLine } from './format.mjs';
import { DEFAULT_SEARCH_RADIUS, anchorSuffix, exampleAnchors, parseAnchor, splitLines } from './scheme.mjs';

const SNIPPET_CONTEXT = 3;
const MAX_CONTIGUOUS_SNIPPET = 80;
const RECOVERY_CONTEXT = 5;
const SMALL_MAX = 5;
const MEDIUM_MAX = 20;

class EditError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.kind = kind;
    this.extra = extra;
  }

  toOutput() {
    return { status: 'error', error: this.kind, message: this.message, ...this.extra };
  }
}

export function rangeWarning(start, end) {
  const count = Math.max(0, end - start);
  if (count > MEDIUM_MAX) {
    return `Caution: large range edit (${count} lines, lines ${start + 1}-${end}). Verify the target range is correct.`;
  }
  if (count > SMALL_MAX) return `Note: medium range edit (${count} lines, lines ${start + 1}-${end}).`;
  return undefined;
}

/** First 1-based line of `content` that still carries a `LINE:HASH→` / `HASH:HASH->` prefix. */
export function detectAnchorPrefix(content) {
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trimStart();
    for (const separator of [ARROW, '->']) {
      const at = trimmed.indexOf(separator);
      if (at === -1) continue;
      const before = trimmed.slice(0, at);
      if (before.length <= 25 && before.includes(':') && !before.includes(' ')) return index + 1;
    }
  }
  return undefined;
}

function anchorContentError(opLabel, content, lineNumber) {
  const lines = content.split('\n');
  const start = Math.max(0, lineNumber - 2);
  const end = Math.min(lineNumber + 1, lines.length);
  const context = [];
  for (let index = start; index < end; index += 1) {
    context.push(`${index + 1 === lineNumber ? '>>>' : '   '} line ${index + 1}: ${lines[index] ?? ''}`);
  }
  return new EditError(
    'invalid_input',
    `${opLabel} content contains anchor prefixes (e.g. "22:abc:rst${ARROW}") copied from hashline_read output. `
      + `The first offending line is line ${lineNumber}. Strip the anchor prefixes and the ${ARROW} separator `
      + 'from every line, keeping only the actual file content, then retry.',
    { current: lines[lineNumber - 1] ?? '', context: context.join('\n'), contextStartLine: start + 1 },
  );
}

function recoverAnchorBySuffix(suffix, lines, scheme) {
  const matches = scheme.generateAnchors(lines).filter(anchor => anchorSuffix(anchor) === suffix);
  return matches.length === 1 ? matches[0] : undefined;
}

/** Resolve an anchor string to a 0-based line index or throw a structured `EditError`. */
export function validateAnchor(rawAnchor, lines, scheme) {
  let anchorText = rawAnchor;
  for (const separator of [ARROW, '->']) {
    const at = anchorText.indexOf(separator);
    if (at !== -1) anchorText = anchorText.slice(0, at);
  }

  let parsed = parseAnchor(anchorText);
  if (!parsed) {
    parsed = recoverAnchorBySuffix(anchorText, lines, scheme);
    if (!parsed) {
      const example = exampleAnchors(scheme);
      throw new EditError(
        'invalid_input',
        `Malformed anchor: "${anchorText}". Expected format: "${example.format}" (e.g. "${example.anchor}").`,
        { requestedAnchor: anchorText },
      );
    }
  }

  const result = scheme.validate(parsed, lines);
  if (result === 'valid') return parsed.line - 1;
  if (result === 'out-of-range') {
    throw new EditError(
      'anchor_not_found',
      `Line ${parsed.line} is out of range (file has ${lines.length} lines).`,
      { requestedAnchor: anchorText },
    );
  }

  const shift = scheme.findShifted(parsed, lines, DEFAULT_SEARCH_RADIUS);
  const anchors = scheme.generateAnchors(lines);
  const contextStart = Math.max(0, parsed.line - 1 - RECOVERY_CONTEXT);
  const contextEnd = Math.min(parsed.line + RECOVERY_CONTEXT, lines.length);
  const context = [];
  for (let index = contextStart; index < contextEnd; index += 1) {
    context.push(renderAnchoredLine(anchors[index], lines[index]));
  }
  const currentIndex = parsed.line - 1;
  const extra = {
    requestedAnchor: anchorText,
    current: anchors[currentIndex] ? renderAnchoredLine(anchors[currentIndex], lines[currentIndex]) : undefined,
    context: context.join('\n'),
    contextStartLine: contextStart + 1,
  };

  if (shift.kind === 'found') {
    const fresh = anchors[shift.newLine - 1];
    const freshText = fresh ? `${shift.newLine}:${anchorSuffix(fresh)}` : `${shift.newLine}`;
    throw new EditError(
      'anchor_stale',
      `Anchor stale at line ${parsed.line}. Content appears to have shifted to line ${shift.newLine}. Retry with anchor "${freshText}".`,
      { ...extra, shiftedTo: shift.newLine, shiftedAnchor: freshText },
    );
  }
  if (shift.kind === 'ambiguous') {
    throw new EditError(
      'ambiguous_anchor',
      `Anchor stale at line ${parsed.line}. Multiple candidates at lines [${shift.candidates.join(', ')}]. Use the fresh anchors from the context below to retry your edit.`,
      { ...extra, ambiguousCandidates: shift.candidates },
    );
  }
  throw new EditError(
    'anchor_stale',
    `Anchor stale at line ${parsed.line}. Use the fresh anchors from the context below to retry your edit.`,
    extra,
  );
}

function contentLines(content) {
  return content.split(/\r?\n/);
}

function resolveOp(op, originalIndex, lines, scheme) {
  if ((op.op === 'replace' || op.op === 'insert_after') && typeof op.anchor !== 'string') {
    throw new EditError('invalid_input', `${op.op} requires an "anchor" string.`);
  }
  if (op.op === 'replace') {
    const start = validateAnchor(op.anchor, lines, scheme);
    let end = start + 1;
    if (op.endAnchor !== undefined && op.endAnchor !== null && op.endAnchor !== '') {
      const endIndex = validateAnchor(op.endAnchor, lines, scheme);
      if (endIndex < start) {
        throw new EditError(
          'invalid_input',
          `end_anchor line ${endIndex + 1} is before start anchor line ${start + 1}.`,
          { requestedAnchor: op.endAnchor },
        );
      }
      end = endIndex + 1;
    }
    const offending = detectAnchorPrefix(op.content);
    if (offending) throw anchorContentError('replace', op.content, offending);
    return { originalIndex, start, end, newLines: op.content === '' ? [] : contentLines(op.content) };
  }

  if (op.op === 'insert_after') {
    let insertAt;
    if (op.anchor === '0:') {
      insertAt = 0;
    } else if (op.anchor === 'EOF') {
      insertAt = lines.length > 1 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
    } else {
      insertAt = validateAnchor(op.anchor, lines, scheme) + 1;
    }
    const offending = detectAnchorPrefix(op.content);
    if (offending) throw anchorContentError('insert_after', op.content, offending);
    return { originalIndex, start: insertAt, end: insertAt, newLines: op.content === '' ? [''] : contentLines(op.content) };
  }

  if (op.op === 'write') {
    throw new EditError(
      'invalid_input',
      'Write op must be the only operation in a batch. Either use write alone (to replace the entire file) or use replace/insert_after ops without write.',
    );
  }

  throw new EditError('invalid_input', `Unknown op "${op.op}". Expected replace, insert_after or write.`);
}

function describeRange(start, end, index) {
  return start === end
    ? `edit #${index + 1} (insertion at line ${start + 1})`
    : `edit #${index + 1} (lines ${start + 1}-${end})`;
}

function checkOverlaps(ops) {
  const ranges = ops.filter(op => op.start !== op.end).sort((a, b) => a.start - b.start);
  for (let index = 1; index < ranges.length; index += 1) {
    const previous = ranges[index - 1];
    const next = ranges[index];
    if (previous.end > next.start) {
      return new EditError(
        'overlapping_edits',
        `Overlapping edits: ${describeRange(previous.start, previous.end, previous.originalIndex)} and ${describeRange(next.start, next.end, next.originalIndex)}.`,
      );
    }
  }
  for (const op of ops) {
    if (op.start !== op.end) continue;
    for (const range of ranges) {
      if (range.start <= op.start && op.start < range.end) {
        return new EditError(
          'overlapping_edits',
          `Overlapping edits: ${describeRange(range.start, range.end, range.originalIndex)} and ${describeRange(op.start, op.end, op.originalIndex)}.`,
        );
      }
    }
  }
  return undefined;
}

function buildSnippet(newContent, regions, totalLines, scheme) {
  if (regions.length === 0) return '';
  const globalStart = Math.max(0, regions[0][0] - SNIPPET_CONTEXT);
  const globalEnd = Math.min(regions[regions.length - 1][1] + SNIPPET_CONTEXT, totalLines);
  if (globalEnd - globalStart <= MAX_CONTIGUOUS_SNIPPET) {
    return formatHashline(newContent, { offset: globalStart + 1, limit: globalEnd - globalStart }, scheme).text;
  }

  const merged = [];
  for (const [start, end] of regions) {
    const contextStart = Math.max(0, start - SNIPPET_CONTEXT);
    const contextEnd = Math.min(end + SNIPPET_CONTEXT, totalLines);
    const last = merged[merged.length - 1];
    if (last && contextStart <= last[1]) {
      last[1] = Math.max(last[1], contextEnd);
    } else {
      merged.push([contextStart, contextEnd]);
    }
  }

  const parts = [];
  let previousEnd = 0;
  merged.forEach(([start, end], index) => {
    if (index > 0) parts.push(`... ${Math.max(0, start - previousEnd)} lines not shown ...`);
    else if (start > 0) parts.push(`... ${start} lines not shown ...`);
    parts.push(formatHashline(newContent, { offset: start + 1, limit: end - start }, scheme).text);
    previousEnd = end;
  });
  if (previousEnd < totalLines) parts.push(`... ${totalLines - previousEnd} lines not shown ...`);
  return parts.join('\n');
}

/**
 * Validate every op against `content`, then splice bottom-up. Returns
 * `{ output, newContent, details }`; `newContent` is `undefined` on error.
 */
export function applyEdits(content, ops, scheme) {
  const lines = splitLines(content);

  if (ops.length === 1 && ops[0].op === 'write') {
    const next = ops[0].content;
    const offending = detectAnchorPrefix(next);
    if (offending) return { output: anchorContentError('write', next, offending).toOutput(), details: [] };
    const total = splitLines(next).length;
    const snippet = formatHashline(next, { offset: 1, limit: Math.min(SNIPPET_CONTEXT * 2, total) }, scheme).text;
    return {
      output: { status: 'ok', applied: 1, scheme: scheme.name, snippetStartLine: 1, snippet, warnings: [] },
      newContent: next,
      details: [],
    };
  }

  const resolved = [];
  for (let index = 0; index < ops.length; index += 1) {
    try {
      resolved.push(resolveOp(ops[index], index, lines, scheme));
    } catch (error) {
      if (!(error instanceof EditError)) throw error;
      if (ops.length > 1) {
        error.message = `Edit ${index + 1}/${ops.length} (${ops[index].op}): ${error.message}\n\n`
          + `This batch contained ${ops.length} edits. Because this anchor failed validation, none of the edits were applied. `
          + `Retry all ${ops.length} edits with fresh anchors, not just the failed one.`;
      }
      return { output: error.toOutput(), details: [] };
    }
  }

  const overlap = checkOverlaps(resolved);
  if (overlap) {
    if (ops.length > 1) {
      overlap.message += `\n\nThis batch contained ${ops.length} edits. Because of the overlap, none were applied. Fix the overlapping ranges and retry all edits.`;
    }
    return { output: overlap.toOutput(), details: [] };
  }

  const warnings = resolved.map(op => rangeWarning(op.start, op.end)).filter(Boolean);
  resolved.sort((a, b) => b.start - a.start || b.originalIndex - a.originalIndex);

  const regions = [];
  const details = [];
  let shift = 0;
  for (const op of [...resolved].reverse()) {
    const shiftedStart = op.start + shift;
    regions.push([shiftedStart, shiftedStart + op.newLines.length]);
    details.push({
      oldLine: op.start + 1,
      oldText: lines.slice(op.start, op.end).join('\n'),
      newLine: shiftedStart + 1,
      newText: op.newLines.join('\n'),
    });
    shift += op.newLines.length - (op.end - op.start);
  }

  const result = [...lines];
  for (const op of resolved) result.splice(op.start, op.end - op.start, ...op.newLines);
  const newContent = result.join('\n');
  const totalLines = splitLines(newContent).length;
  regions.sort((a, b) => a[0] - b[0]);

  return {
    output: {
      status: 'ok',
      applied: ops.length,
      scheme: scheme.name,
      snippetStartLine: Math.max(0, regions[0][0] - SNIPPET_CONTEXT) + 1,
      snippet: buildSnippet(newContent, regions, totalLines, scheme),
      warnings,
    },
    newContent,
    details,
  };
}

/** Accept `edits` as an array, a single object, or a JSON string of either. */
export function normalizeEdits(value) {
  let edits = value;
  if (typeof edits === 'string') {
    try {
      edits = JSON.parse(edits);
    } catch (error) {
      throw new EditError('invalid_input', `edits was a JSON string but could not be parsed as an array of operations: ${error.message}`);
    }
  }
  if (edits && typeof edits === 'object' && !Array.isArray(edits)) edits = [edits];
  if (!Array.isArray(edits)) throw new EditError('invalid_input', 'edits must be an array of edit operations');
  if (edits.length === 0) throw new EditError('invalid_input', 'edits must contain at least one operation');
  return edits.map(edit => ({
    op: edit?.op,
    anchor: typeof edit?.anchor === 'string' ? edit.anchor : undefined,
    endAnchor: typeof edit?.end_anchor === 'string' ? edit.end_anchor : (typeof edit?.endAnchor === 'string' ? edit.endAnchor : undefined),
    content: typeof edit?.content === 'string' ? edit.content : '',
  }));
}

export { EditError };
