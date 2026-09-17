import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

import { extractFiles, tarEntries } from '../src/tar.mjs';

function header(fields) {
  const block = Buffer.alloc(512);
  block.write(fields.name, 0, 100, 'utf8');
  block.write('0000644\0', 100);
  block.write('0000000\0', 108);
  block.write('0000000\0', 116);
  block.write(`${fields.size.toString(8).padStart(11, '0')}\0`, 124);
  block.write('00000000000\0', 136);
  block.write('        ', 148);
  block.write(fields.type ?? '0', 156);
  block.write('ustar\0', 257);
  block.write('00', 263);
  if (fields.prefix) block.write(fields.prefix, 345, 155, 'utf8');
  let sum = 0;
  for (const byte of block) sum += byte;
  block.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
  return block;
}

function entry(name, data, extra = {}) {
  const body = Buffer.from(data);
  const padded = Buffer.alloc(Math.ceil(body.length / 512) * 512);
  body.copy(padded);
  return Buffer.concat([header({ name, size: body.length, ...extra }), padded]);
}

function archive(...entries) {
  return gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)]));
}

test('reads plain, prefixed, pax-long and GNU-long names, skipping directories', () => {
  const longName = `package/${'d/'.repeat(80)}deep.txt`;
  const record = `path=${longName}\n`;
  let length = record.length + 2;
  while (`${length} ${record}`.length !== length) length = `${length} ${record}`.length;
  const pax = `${length} ${record}`;
  const tgz = archive(
    entry('package/', '', { type: '5' }),
    entry('package/a.wasm', 'AAA'),
    entry('b.scm', 'BBB', { prefix: 'package/queries' }),
    entry('PaxHeader', pax, { type: 'x' }),
    entry('package/truncated', 'DEEP'),
    entry('././@LongLink', `${longName}x`, { type: 'L' }),
    entry('package/truncated2', 'GNU'),
  );
  const names = [...tarEntries(tgz)].map(e => [e.name, e.data.toString()]);
  assert.deepEqual(names, [
    ['package/a.wasm', 'AAA'],
    ['package/queries/b.scm', 'BBB'],
    [longName, 'DEEP'],
    [`${longName}x`, 'GNU'],
  ]);
});

test('extractFiles returns requested entries and fails on missing ones', () => {
  const tgz = archive(entry('package/a.wasm', 'AAA'), entry('package/b.scm', 'BBB'));
  const files = extractFiles(tgz, ['package/b.scm']);
  assert.deepEqual([...files.keys()], ['package/b.scm']);
  assert.equal(files.get('package/b.scm').toString(), 'BBB');
  assert.throws(() => extractFiles(tgz, ['package/a.wasm', 'package/zzz']), /missing package\/zzz/u);
});
