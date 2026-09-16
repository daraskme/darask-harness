// Anchor schemes: content-only, chunk-fingerprinted, and checkpoint-chained line anchors.
// Ported from grok-build `grok_build_hashline/scheme.rs` (Apache-2.0).

import { DEFAULT_HASH_LEN, encodeHash, fnv1a32String, lineHash, mixHash } from './hash.mjs';

export const DEFAULT_SEARCH_RADIUS = 15;
export const DEFAULT_CHUNK_SIZE = 16;
export const DEFAULT_CHECKPOINT_INTERVAL = 32;

const CHUNK_SEED = fnv1a32String('chunk');
const CHECKPOINT_SEED = fnv1a32String('ckpt');

/** Split content into logical lines; `"a\n"` has two lines (`"a"` and `""`). */
export function splitLines(content) {
  if (content.length === 0) return [''];
  return content.split(/\r?\n/);
}

/** `"22:abc"` or `"22:abc:rst"` → `{ line, local, context }`, else `undefined`. */
export function parseAnchor(text) {
  const parts = text.split(':');
  if (parts.length < 2 || parts.length > 3) return undefined;
  const [lineText, local, context] = parts;
  if (!/^[0-9]+$/.test(lineText) || !/^[a-z]+$/.test(local)) return undefined;
  const line = Number(lineText);
  if (!Number.isSafeInteger(line) || line === 0) return undefined;
  if (context !== undefined && !/^[a-z]+$/.test(context)) return undefined;
  return { line, local, context };
}

export function renderAnchor({ line, local, context }) {
  return context === undefined ? `${line}:${local}` : `${line}:${local}:${context}`;
}

export function anchorSuffix({ local, context }) {
  return context === undefined ? local : `${local}:${context}`;
}

function assertHashLen(hashLen) {
  if (!Number.isInteger(hashLen) || hashLen < 1 || hashLen > 4) {
    throw new RangeError(`hash_len must be 1..=4, got ${hashLen}`);
  }
}

function findShiftedGeneric(scheme, anchor, lines, searchRadius) {
  const originalIndex = anchor.line - 1;
  const start = Math.max(0, originalIndex - searchRadius);
  const end = Math.min(originalIndex + searchRadius + 1, lines.length);
  const candidates = [];
  for (let index = start; index < end; index += 1) {
    if (index === originalIndex) continue;
    const local = encodeHash(lineHash(lines[index]), scheme.hashLen);
    if (local !== anchor.local) continue;
    if (anchor.context !== undefined) {
      const probe = { line: index + 1, local, context: anchor.context };
      if (scheme.validate(probe, lines) !== 'valid') continue;
    }
    candidates.push(index + 1);
  }
  if (candidates.length === 0) return { kind: 'not-found' };
  if (candidates.length === 1) return { kind: 'found', newLine: candidates[0] };
  return { kind: 'ambiguous', candidates };
}

function validateLocal(scheme, anchor, lines) {
  const line = lines[anchor.line - 1];
  if (line === undefined) return { status: 'out-of-range' };
  const expected = encodeHash(lineHash(line), scheme.hashLen);
  return { status: anchor.local === expected ? 'valid' : 'stale', line };
}

export class ContentOnly {
  constructor(hashLen = DEFAULT_HASH_LEN) {
    assertHashLen(hashLen);
    this.hashLen = hashLen;
    this.name = 'content_only_v1';
    this.hasContext = false;
  }

  generateAnchors(lines) {
    return lines.map((line, index) => ({
      line: index + 1,
      local: encodeHash(lineHash(line), this.hashLen),
      context: undefined,
    }));
  }

  validate(anchor, lines) {
    return validateLocal(this, anchor, lines).status;
  }

  findShifted(anchor, lines, searchRadius = DEFAULT_SEARCH_RADIUS) {
    return findShiftedGeneric(this, anchor, lines, searchRadius);
  }
}

export class ChunkFingerprint {
  constructor(hashLen = DEFAULT_HASH_LEN, chunkSize = DEFAULT_CHUNK_SIZE) {
    assertHashLen(hashLen);
    if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new RangeError('chunk_size must be > 0');
    this.hashLen = hashLen;
    this.chunkSize = chunkSize;
    this.name = 'chunk_v1';
    this.hasContext = true;
  }

  chunkFingerprint(lines, lineIndex) {
    const start = Math.floor(lineIndex / this.chunkSize) * this.chunkSize;
    const end = Math.min(start + this.chunkSize, lines.length);
    let combined = CHUNK_SEED;
    for (let index = start; index < end; index += 1) combined = mixHash(combined, lineHash(lines[index]));
    return encodeHash(combined, this.hashLen);
  }

  generateAnchors(lines) {
    const fingerprints = [];
    for (let start = 0; start < lines.length; start += this.chunkSize) {
      fingerprints.push(this.chunkFingerprint(lines, start));
    }
    return lines.map((line, index) => ({
      line: index + 1,
      local: encodeHash(lineHash(line), this.hashLen),
      context: fingerprints[Math.floor(index / this.chunkSize)],
    }));
  }

  validate(anchor, lines) {
    const local = validateLocal(this, anchor, lines);
    if (local.status !== 'valid') return local.status;
    if (anchor.context === undefined) return 'stale';
    return this.chunkFingerprint(lines, anchor.line - 1) === anchor.context ? 'valid' : 'stale';
  }

  findShifted(anchor, lines, searchRadius = DEFAULT_SEARCH_RADIUS) {
    return findShiftedGeneric(this, anchor, lines, searchRadius);
  }
}

export class CheckpointChain {
  constructor(hashLen = DEFAULT_HASH_LEN, checkpointInterval = DEFAULT_CHECKPOINT_INTERVAL) {
    assertHashLen(hashLen);
    if (!Number.isInteger(checkpointInterval) || checkpointInterval < 1) {
      throw new RangeError('checkpoint_interval must be > 0');
    }
    this.hashLen = hashLen;
    this.checkpointInterval = checkpointInterval;
    this.name = 'checkpoint_v1';
    this.hasContext = true;
  }

  checkpointFingerprint(lines, lineIndex) {
    const start = Math.floor(lineIndex / this.checkpointInterval) * this.checkpointInterval;
    let chain = CHECKPOINT_SEED;
    for (let index = start; index <= lineIndex; index += 1) chain = mixHash(chain, lineHash(lines[index]));
    return encodeHash(chain, this.hashLen);
  }

  generateAnchors(lines) {
    const anchors = [];
    let chain = CHECKPOINT_SEED;
    lines.forEach((line, index) => {
      if (index % this.checkpointInterval === 0) chain = CHECKPOINT_SEED;
      const local = lineHash(line);
      chain = mixHash(chain, local);
      anchors.push({
        line: index + 1,
        local: encodeHash(local, this.hashLen),
        context: encodeHash(chain, this.hashLen),
      });
    });
    return anchors;
  }

  validate(anchor, lines) {
    const local = validateLocal(this, anchor, lines);
    if (local.status !== 'valid') return local.status;
    if (anchor.context === undefined) return 'stale';
    return this.checkpointFingerprint(lines, anchor.line - 1) === anchor.context ? 'valid' : 'stale';
  }

  findShifted(anchor, lines, searchRadius = DEFAULT_SEARCH_RADIUS) {
    return findShiftedGeneric(this, anchor, lines, searchRadius);
  }
}

/** Build a scheme from plugin configuration. */
export function buildScheme({ scheme = 'chunk', hashLen = DEFAULT_HASH_LEN, chunkSize = DEFAULT_CHUNK_SIZE, checkpointInterval = DEFAULT_CHECKPOINT_INTERVAL } = {}) {
  switch (scheme) {
    case 'content_only':
      return new ContentOnly(hashLen);
    case 'checkpoint':
      return new CheckpointChain(hashLen, checkpointInterval);
    case 'chunk':
      return new ChunkFingerprint(hashLen, chunkSize);
    default:
      throw new RangeError(`unknown hashline scheme "${scheme}" (expected chunk, content_only or checkpoint)`);
  }
}

/** Example anchors for tool descriptions, matching the configured scheme shape. */
export function exampleAnchors(scheme) {
  const local = 'abcd'.slice(0, scheme.hashLen);
  const context = 'rstu'.slice(0, scheme.hashLen);
  const anchor = scheme.hasContext ? `22:${local}:${context}` : `22:${local}`;
  const second = scheme.hasContext ? `23:${'efgh'.slice(0, scheme.hashLen)}:${context}` : `23:${'efgh'.slice(0, scheme.hashLen)}`;
  return {
    anchor,
    format: scheme.hasContext ? 'LINE:HASH1:HASH2' : 'LINE:HASH',
    line1: `${anchor}→  let x = 1;`,
    line2: `${second}→  return x;`,
    grepMatch: `${anchor}:  let x = 1;`,
    grepContext: `${second}-  return x;`,
  };
}
