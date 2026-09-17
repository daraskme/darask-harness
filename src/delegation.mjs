import { realpath } from 'node:fs/promises';
import { candidates } from './config.mjs';
import { resolveCliExecutable, spawnBounded, providerEnvironment, cleanText } from './providers/cli.mjs';

const locks = new Map();
export function delegationArgs(id, prompt, model = '') {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 40000) throw new Error('Invalid delegation prompt');
  const tail = model ? ['--model', model] : [];
  if (id === 'cursor') return ['--print', '--mode', 'ask', '--output-format', 'json', ...tail, '--', prompt];
  if (id === 'claude') return ['--print', '--permission-mode', 'plan', '--output-format', 'json', ...tail, '--', prompt];
  if (id === 'grok') return ['--print', '--permission-mode', 'plan', '--output-format', 'json', ...tail, '--', prompt];
  throw new Error('Unsupported CLI delegation provider');
}
export function scrubOutput(text) {
  return cleanText(text).replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|xai-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{20,})\b/g, '[redacted]').replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]+/gi, '$1[redacted]').slice(0, 100000);
}
export function parseDelegationOutput(raw) {
  const values = [];
  try { values.push(JSON.parse(raw)); } catch {
    for (const line of raw.split(/\r?\n/)) { try { values.push(JSON.parse(line)); } catch { /* CLI progress is not a result. */ } }
  }
  for (const value of values.reverse()) {
    if (value?.is_error === true) throw new Error('The delegated CLI reported an error.');
    const result = value?.result ?? value?.response ?? value?.text;
    if (typeof result === 'string') return scrubOutput(result);
  }
  throw new Error('The CLI did not return a supported JSON result.');
}
/** One CLI owns a workspace at a time, including cancellation and process teardown. */
export async function delegate({ config, snapshots, provider = 'auto', prompt, cwd, signal, timeoutMs = 180000, resolve = resolveCliExecutable, run = spawnBounded }) {
  if (signal?.aborted) throw signal.reason;
  if (typeof cwd !== 'string') throw new Error('Delegation requires a DSH workspace');
  const directory = await realpath(cwd);
  if (signal?.aborted) throw signal.reason;
  const lockKey = process.platform === 'win32' ? directory.toLowerCase() : directory;
  if (locks.has(lockKey)) throw new Error('Another DARASK CLI owns this workspace. Wait for it to finish.');
  const token = Symbol();
  locks.set(lockKey, token);
  let terminationConfirmed = true;
  try {
    const ids = provider === 'auto' ? candidates(config, snapshots, 'agent') : [provider];
    let selected, launch;
    for (const id of ids) {
      if (!['cursor', 'claude', 'grok'].includes(id) || !config.providers[id]?.enabled) continue;
      try { launch = resolve(id, { executable: config.providers[id].executable || undefined }); selected = id; break; }
      catch (error) { if (provider !== 'auto') throw error; }
    }
    if (!selected) throw new Error('No enabled CLI is available for delegation.');
    if (signal?.aborted) throw signal.reason;
    const operation = run(launch, delegationArgs(selected, prompt, config.providers[selected].model), { cwd: directory, timeoutMs, maxBytes: 1024 * 1024, env: providerEnvironment(selected) });
    const cancel = () => operation.cancel();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    try {
      const result = await operation.completion;
      if (result.terminated === false) { terminationConfirmed = false; throw new Error('CLI termination could not be verified. Workspace remains locked until DSH restarts; inspect the child process first.'); }
      if (signal?.aborted) throw signal.reason;
      if (result.error || result.code !== 0) throw new Error('Delegated CLI failed. No task was automatically resent to another provider.');
      return { provider: selected, mode: 'plan', output: parseDelegationOutput(result.stdout) };
    } finally { signal?.removeEventListener('abort', cancel); }
  } finally { if (terminationConfirmed && locks.get(lockKey) === token) locks.delete(lockKey); }
}
