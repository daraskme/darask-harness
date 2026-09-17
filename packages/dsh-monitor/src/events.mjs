// Pure helpers for the monitor pipeline: line splitting with bounded buffers,
// event batching, the model-facing <monitor-event> wrapper, and the token
// bucket + suppression tracker that keep a chatty script from flooding the
// agent with wakeups. No I/O or DSH dependency so everything is unit-testable.

export const LINE_TRUNCATION_LIMIT = 500;
export const BATCH_TRUNCATION_LIMIT = 3_000;
export const BUFFER_CAP_BYTES = 1_048_576;
export const DEBOUNCE_MS = 200;
export const RATE_LIMIT_CAPACITY = 10;
export const RATE_LIMIT_REFILL_MS = 2_000;
export const AUTO_KILL_THRESHOLD_MS = 30_000;
export const DEFAULT_TIMEOUT_MS = 36_000_000;
export const MAX_TIMEOUT_MS = 36_000_000;

function truncateLine(line) {
  return line.length > LINE_TRUNCATION_LIMIT ? `${line.slice(0, LINE_TRUNCATION_LIMIT)}...(truncated)` : line;
}

/** Splits raw output chunks into trimmed, non-empty, bounded lines. */
export class LineProcessor {
  #buffer = '';

  push(chunk) {
    this.#buffer += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    if (this.#buffer.length > BUFFER_CAP_BYTES) this.#buffer = this.#buffer.slice(-BUFFER_CAP_BYTES);
    const lines = [];
    let newline = this.#buffer.indexOf('\n');
    while (newline !== -1) {
      const text = this.#buffer.slice(0, newline).trim();
      this.#buffer = this.#buffer.slice(newline + 1);
      if (text !== '') lines.push(truncateLine(text));
      newline = this.#buffer.indexOf('\n');
    }
    return lines;
  }

  flush() {
    const text = this.#buffer.trim();
    this.#buffer = '';
    return text === '' ? undefined : truncateLine(text);
  }
}

export function batchLines(lines) {
  const joined = lines.join('\n');
  return joined.length > BATCH_TRUNCATION_LIMIT ? `${joined.slice(0, BATCH_TRUNCATION_LIMIT)}\n...(truncated)` : joined;
}

export function sanitizeDescription(description) {
  return description.replaceAll('"', "'").replaceAll(/[\r\n]/gu, ' ').trim();
}

export function wrapMonitorEvent(description, eventText, jobId) {
  return `<monitor-event description="${sanitizeDescription(description)}" job_id="${jobId}">\n${eventText}\n</monitor-event>`;
}

/** Starts full; one token per event; refills one token per interval. */
export class TokenBucket {
  #capacity;
  #tokens;
  #refillMs;
  #lastRefill;

  constructor(capacity = RATE_LIMIT_CAPACITY, refillMs = RATE_LIMIT_REFILL_MS, now = Date.now()) {
    this.#capacity = capacity;
    this.#tokens = capacity;
    this.#refillMs = refillMs;
    this.#lastRefill = now;
  }

  tryConsume(now = Date.now()) {
    const refills = Math.floor((now - this.#lastRefill) / this.#refillMs);
    if (refills > 0) {
      this.#tokens = Math.min(this.#capacity, this.#tokens + refills);
      this.#lastRefill += refills * this.#refillMs;
    }
    if (this.#tokens === 0) return false;
    this.#tokens -= 1;
    return true;
  }
}

/**
 * Combined rate limiter. `process(now)` returns one of
 *   { kind: 'allowed', catchUpNotice?: string }
 *   { kind: 'suppressed' }
 *   { kind: 'auto-kill', message: string }
 */
export class MonitorRateLimiter {
  #bucket;
  #killTool;
  #suppressed = 0;
  #lastSuppression;
  #suppressionStart;
  killed = false;

  constructor({ capacity = RATE_LIMIT_CAPACITY, refillMs = RATE_LIMIT_REFILL_MS, autoKillMs = AUTO_KILL_THRESHOLD_MS, killTool = 'job_kill', now = Date.now() } = {}) {
    this.#bucket = new TokenBucket(capacity, refillMs, now);
    this.#killTool = killTool;
    this.refillMs = refillMs;
    this.autoKillMs = autoKillMs;
  }

  process(now = Date.now()) {
    if (this.killed) return { kind: 'suppressed' };
    if (this.#bucket.tryConsume(now)) {
      if (this.#lastSuppression !== undefined && now - this.#lastSuppression > this.refillMs * 3) this.#suppressionStart = undefined;
      if (this.#suppressed === 0) return { kind: 'allowed' };
      const catchUpNotice = `[${this.#suppressed} events suppressed -- output rate too high. Consider using ${this.#killTool} and restarting this monitor with a more selective filter.]`;
      this.#suppressed = 0;
      return { kind: 'allowed', catchUpNotice };
    }
    this.#suppressed += 1;
    this.#lastSuppression = now;
    this.#suppressionStart ??= now;
    const elapsed = now - this.#suppressionStart;
    if (elapsed > this.autoKillMs) {
      this.killed = true;
      return {
        kind: 'auto-kill',
        message: `[Monitor stopped -- your script produced too much output (${this.#suppressed} events suppressed over ${Math.round(elapsed / 1000)}s). Write a new monitor command that filters more aggressively -- pipe through grep --line-buffered, awk, or a wrapper script that only emits the specific events you need.]`,
      };
    }
    return { kind: 'suppressed' };
  }
}

/** Resolve the effective deadline: 0 means persistent (no deadline). */
export function resolveTimeout({ timeoutMs, persistent }) {
  if (persistent === true) return 0;
  if (timeoutMs === undefined) return DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isInteger(timeoutMs)) throw new Error('timeout_ms must be a positive integer number of milliseconds');
  if (timeoutMs > MAX_TIMEOUT_MS) throw new Error(`timeout_ms exceeds the maximum of ${MAX_TIMEOUT_MS}ms; set persistent: true for a session-length watch`);
  return timeoutMs;
}
