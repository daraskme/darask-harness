// Browser-safe text helpers shared by capture, manifest and search.

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;

/** Collapse control characters (including newlines) into single spaces and trim. */
export function scrubInline(text) {
  return String(text).replace(/[\u0000-\u001F\u007F]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

/** Remove control characters except `\n`, `\r`, `\t`. */
export function scrubBlock(text) {
  return String(text).replace(CONTROL, ' ');
}

/** Truncate to `maxBytes` UTF-8 bytes on a code point boundary. */
export function truncateUtf8(text, maxBytes) {
  const bytes = Buffer.from(text, 'utf8');
  if (bytes.length <= maxBytes) return text;
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end -= 1;
  return bytes.subarray(0, end).toString('utf8');
}

export function utf8Length(text) {
  return Buffer.byteLength(text, 'utf8');
}

/** Keep the head and tail of an oversized text, marking the omitted middle. */
export function trimMiddle(text, maxBytes) {
  if (utf8Length(text) <= maxBytes) return text;
  const marker = '\n…[omitted]…\n';
  const budget = Math.max(0, maxBytes - utf8Length(marker));
  const head = truncateUtf8(text, Math.ceil(budget / 2));
  const tailBytes = Buffer.from(text, 'utf8');
  let start = tailBytes.length - Math.floor(budget / 2);
  while (start < tailBytes.length && (tailBytes[start] & 0xc0) === 0x80) start += 1;
  return `${head}${marker}${tailBytes.subarray(start).toString('utf8')}`;
}

/** Backticks and newlines are neutralized so a value can sit inside one markdown line. */
export function sanitizeInline(value) {
  return String(value).replace(/[\r\n]/gu, ' ').replace(/`/gu, "'");
}

/** Slug for topic filenames: lowercase letters, digits and hyphens. */
export function slugify(value, maxLength = 64) {
  const slug = String(value).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '');
  return slug.slice(0, maxLength).replace(/-+$/u, '');
}

/** Neutralize tags that would let stored memory masquerade as harness instructions. */
export function neutralizeReminderTags(text) {
  return String(text).replace(/<(\/?)(system-reminder|memory-context)\b/giu, '&lt;$1$2');
}
