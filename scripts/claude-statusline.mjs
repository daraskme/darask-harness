#!/usr/bin/env node
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// Claude invokes this through its documented statusLine hook. Only quota
// fields are stored; transcripts, keys and account identifiers are omitted.
let text = '';
for await (const chunk of process.stdin) {
  text += chunk;
  if (text.length > 1024 * 1024) process.exit(1);
}
const input = JSON.parse(text);
const rate_limits = {};
for (const id of ['five_hour', 'seven_day']) {
  const value = input.rate_limits?.[id];
  if (value && typeof value.used_percentage === 'number' && Number.isFinite(value.used_percentage) && value.used_percentage >= 0) rate_limits[id] = { used_percentage: value.used_percentage, ...(typeof value.resets_at === 'number' && Number.isFinite(value.resets_at) ? { resets_at: value.resets_at } : {}) };
}
const directory = resolve(process.env.DARASK_DATA_DIR || join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'darask'));
await mkdir(directory, { recursive: true });
const tmp = join(directory, `claude-usage.${randomUUID()}.tmp`);
await writeFile(tmp, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), rate_limits }), { mode: 0o600 });
await rename(tmp, join(directory, 'claude-usage.json'));
process.stdout.write(Object.entries(rate_limits).map(([id, w]) => `${id === 'five_hour' ? '5h' : '7d'} ${Math.max(0, 100 - w.used_percentage).toFixed(0)}%`).join(' · ') || 'Claude');
