// FNV-1a 32-bit hashing and whitespace-normalized line fingerprints.
// Ported from grok-build `xai-grok-tools/src/util/hash.rs` (Apache-2.0).

const FNV_OFFSET = 2_166_136_261;
const FNV_PRIME = 16_777_619;

export const DEFAULT_HASH_LEN = 3;

const encoder = new TextEncoder();

export function fnv1a32(bytes) {
  let h = FNV_OFFSET;
  for (const byte of bytes) {
    h = Math.imul(h ^ byte, FNV_PRIME) >>> 0;
  }
  return h >>> 0;
}

export function fnv1a32String(text) {
  return fnv1a32(encoder.encode(text));
}

function isAsciiWhitespace(byte) {
  return byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0c || byte === 0x0d;
}

/** Trim, collapse internal whitespace runs to one space, then hash the UTF-8 bytes. */
export function lineHash(line) {
  let h = FNV_OFFSET;
  let previousWhitespace = false;
  for (const byte of encoder.encode(line.trim())) {
    if (isAsciiWhitespace(byte)) {
      if (!previousWhitespace) {
        h = Math.imul(h ^ 0x20, FNV_PRIME) >>> 0;
        previousWhitespace = true;
      }
    } else {
      h = Math.imul(h ^ byte, FNV_PRIME) >>> 0;
      previousWhitespace = false;
    }
  }
  return h >>> 0;
}

/** Mix one line hash into a running chain (xor, then multiply by the FNV prime). */
export function mixHash(chain, value) {
  return Math.imul((chain ^ value) >>> 0, FNV_PRIME) >>> 0;
}

/** Encode a 32-bit hash as `len` lowercase letters, one per byte region. */
export function encodeHash(hash, len) {
  if (!Number.isInteger(len) || len < 1 || len > 4) throw new RangeError('encodeHash: len must be 1..=4');
  let result = '';
  for (let i = 0; i < len; i += 1) {
    result += String.fromCharCode(((hash >>> (i * 8)) % 26) + 97);
  }
  return result;
}
