import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BATCH_TRUNCATION_LIMIT,
  DEFAULT_TIMEOUT_MS,
  LINE_TRUNCATION_LIMIT,
  LineProcessor,
  MAX_TIMEOUT_MS,
  MonitorRateLimiter,
  TokenBucket,
  batchLines,
  resolveTimeout,
  sanitizeDescription,
  wrapMonitorEvent,
} from '../src/events.mjs';

test('LineProcessor splits, trims, skips blanks, buffers partial lines, truncates long lines', () => {
  const lines = new LineProcessor();
  assert.deepEqual(lines.push('hello world\n'), ['hello world']);
  assert.deepEqual(lines.push('a\n\n  \nb\n'), ['a', 'b']);
  assert.deepEqual(lines.push('part'), []);
  assert.deepEqual(lines.push('ial\nnext'), ['partial']);
  assert.equal(lines.flush(), 'next');
  assert.equal(lines.flush(), undefined);
  assert.deepEqual(lines.push(Buffer.from('bytes\n')), ['bytes']);
  const [long] = lines.push(`${'x'.repeat(LINE_TRUNCATION_LIMIT + 5)}\n`);
  assert.equal(long, `${'x'.repeat(LINE_TRUNCATION_LIMIT)}...(truncated)`);
});

test('batchLines joins and truncates', () => {
  assert.equal(batchLines(['a', 'b']), 'a\nb');
  const big = batchLines(['y'.repeat(BATCH_TRUNCATION_LIMIT + 1)]);
  assert.ok(big.endsWith('\n...(truncated)'));
  assert.equal(big.length, BATCH_TRUNCATION_LIMIT + '\n...(truncated)'.length);
});

test('wrapMonitorEvent neutralizes quotes and newlines in the description', () => {
  assert.equal(sanitizeDescription('watch "prod"\nlogs'), "watch 'prod' logs");
  const wrapped = wrapMonitorEvent('watch "prod"\nlogs', 'DONE', 'monitor-1');
  assert.equal(wrapped, '<monitor-event description="watch \'prod\' logs" job_id="monitor-1">\nDONE\n</monitor-event>');
});

test('TokenBucket starts full and refills one token per interval', () => {
  const bucket = new TokenBucket(2, 1000, 0);
  assert.equal(bucket.tryConsume(0), true);
  assert.equal(bucket.tryConsume(0), true);
  assert.equal(bucket.tryConsume(500), false);
  assert.equal(bucket.tryConsume(1000), true);
  assert.equal(bucket.tryConsume(1001), false);
  assert.equal(bucket.tryConsume(5000), true);
  assert.equal(bucket.tryConsume(5000), true);
  assert.equal(bucket.tryConsume(5000), false);
});

test('MonitorRateLimiter suppresses bursts, emits a catch-up notice, and auto-kills sustained overload', () => {
  const limiter = new MonitorRateLimiter({ capacity: 2, refillMs: 1000, autoKillMs: 5000, killTool: 'job_kill', now: 0 });
  assert.deepEqual(limiter.process(0), { kind: 'allowed' });
  assert.deepEqual(limiter.process(0), { kind: 'allowed' });
  assert.deepEqual(limiter.process(10), { kind: 'suppressed' });
  assert.deepEqual(limiter.process(20), { kind: 'suppressed' });
  const resumed = limiter.process(1000);
  assert.equal(resumed.kind, 'allowed');
  assert.match(resumed.catchUpNotice, /^\[2 events suppressed -- output rate too high\. Consider using job_kill/u);
  assert.deepEqual(limiter.process(1000), { kind: 'suppressed' });

  // Sustained suppression past the threshold kills the monitor once, then stays quiet.
  const outcomes = [];
  for (let now = 1100; now < 6000; now += 50) outcomes.push(limiter.process(now));
  const kills = outcomes.filter(outcome => outcome.kind === 'auto-kill');
  assert.equal(kills.length, 1);
  assert.match(kills[0].message, /Monitor stopped -- your script produced too much output \(\d+ events suppressed over 5s\)/u);
  assert.equal(limiter.killed, true);
  assert.ok(outcomes.slice(outcomes.indexOf(kills[0]) + 1).every(outcome => outcome.kind === 'suppressed'));
  assert.deepEqual(limiter.process(100_000), { kind: 'suppressed' });
});

test('MonitorRateLimiter resets the overload window when a burst subsides', () => {
  const limiter = new MonitorRateLimiter({ capacity: 1, refillMs: 1000, autoKillMs: 3000, now: 0 });
  limiter.process(0);
  assert.equal(limiter.process(1).kind, 'suppressed');
  assert.equal(limiter.process(1000).kind, 'allowed');
  // A quiet stretch (> 3 refills) ends the window; a later burst starts a fresh one.
  assert.equal(limiter.process(10_000).kind, 'allowed');
  assert.equal(limiter.process(10_001).kind, 'suppressed');
  assert.equal(limiter.process(10_500).kind, 'suppressed');
  assert.equal(limiter.process(10_600).kind, 'suppressed');
  assert.equal(limiter.killed, false);
});

test('resolveTimeout: defaults, persistent, bounds', () => {
  assert.equal(resolveTimeout({}), DEFAULT_TIMEOUT_MS);
  assert.equal(resolveTimeout({ timeoutMs: 600_000 }), 600_000);
  assert.equal(resolveTimeout({ persistent: true }), 0);
  assert.equal(resolveTimeout({ persistent: true, timeoutMs: MAX_TIMEOUT_MS + 1 }), 0);
  assert.throws(() => resolveTimeout({ timeoutMs: MAX_TIMEOUT_MS + 1 }), /persistent: true/u);
  assert.throws(() => resolveTimeout({ timeoutMs: 0 }), /positive integer/u);
  assert.throws(() => resolveTimeout({ timeoutMs: 1.5 }), /positive integer/u);
});
