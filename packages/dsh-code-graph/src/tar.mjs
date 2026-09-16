// Minimal ustar/pax reader: enough to pull a few named files out of an npm
// tarball without an external `tar` binary (Windows tar lacks --wildcards).

import { gunzipSync } from 'node:zlib';

const BLOCK = 512;

function readString(buffer, offset, length) {
  const slice = buffer.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString('utf8');
}

function readOctal(buffer, offset, length) {
  const text = readString(buffer, offset, length).trim();
  return text === '' ? 0 : Number.parseInt(text, 8);
}

/** Yields `{ name, data }` for every regular file in a gzip-compressed tar archive. */
export function* tarEntries(gzipped) {
  const buffer = gunzipSync(gzipped);
  let offset = 0;
  let paxPath;
  let longName;
  while (offset + BLOCK <= buffer.length) {
    const header = buffer.subarray(offset, offset + BLOCK);
    if (header.every(byte => byte === 0)) break;
    const size = readOctal(header, 124, 12);
    const type = String.fromCharCode(header[156]);
    let name = readString(header, 0, 100);
    const prefix = readString(header, 345, 155);
    if (prefix !== '') name = `${prefix}/${name}`;
    const dataStart = offset + BLOCK;
    const data = buffer.subarray(dataStart, dataStart + size);
    offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;
    if (type === 'x') {
      paxPath = parsePaxPath(data);
      continue;
    }
    if (type === 'L') {
      longName = readString(data, 0, data.length);
      continue;
    }
    if (paxPath !== undefined) { name = paxPath; paxPath = undefined; }
    if (longName !== undefined) { name = longName; longName = undefined; }
    if (type === '0' || type === '\0' || type === '') yield { name, data };
  }
}

function parsePaxPath(data) {
  let offset = 0;
  const text = data.toString('utf8');
  while (offset < text.length) {
    const space = text.indexOf(' ', offset);
    if (space === -1) break;
    const length = Number.parseInt(text.slice(offset, space), 10);
    if (!Number.isInteger(length) || length <= 0) break;
    const record = text.slice(space + 1, offset + length - 1);
    const eq = record.indexOf('=');
    if (eq !== -1 && record.slice(0, eq) === 'path') return record.slice(eq + 1);
    offset += length;
  }
  return undefined;
}

/** Extracts the given archive-relative paths (e.g. `package/foo.wasm`); throws when one is missing. */
export function extractFiles(gzipped, wanted) {
  const remaining = new Set(wanted);
  const found = new Map();
  for (const entry of tarEntries(gzipped)) {
    if (remaining.has(entry.name)) {
      found.set(entry.name, Buffer.from(entry.data));
      remaining.delete(entry.name);
      if (remaining.size === 0) break;
    }
  }
  if (remaining.size > 0) throw new Error(`archive is missing ${[...remaining].join(', ')}`);
  return found;
}
