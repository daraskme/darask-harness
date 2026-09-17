// External status-line command runner (grok-build `[ui.status_line] type = "command"`
// contract): the context document is written to stdin as one JSON object, the
// command's first non-empty stdout line becomes the status line. The command is
// user-configured (never model-controlled), runs in the session cwd with a hard
// timeout, and its output is capped and control-character stripped.

import { spawn } from 'node:child_process';
import { sanitizeCommandOutput } from './status.mjs';

const MAX_OUTPUT_BYTES = 65536;

export function shellFor(platform = process.platform) {
  if (platform === 'win32') {
    const comspec = process.env.ComSpec && /cmd\.exe$/iu.test(process.env.ComSpec) ? process.env.ComSpec : 'cmd.exe';
    return { file: comspec, args: command => ['/d', '/s', '/c', `"${command}"`], windowsVerbatimArguments: true };
  }
  return { file: '/bin/sh', args: command => ['-c', command], windowsVerbatimArguments: false };
}

/**
 * Run `command` with `context` on stdin.
 * @returns `{ ok: true, text }` or `{ ok: false, error }` — never throws.
 */
export function runStatusCommand(command, context, { cwd, timeoutMs = 5000, env = process.env, platform = process.platform, maxChars = 400, spawnImpl = spawn } = {}) {
  return new Promise(resolvePromise => {
    const shell = shellFor(platform);
    let settled = false;
    const finish = result => { if (!settled) { settled = true; resolvePromise(result); } };
    let child;
    try {
      child = spawnImpl(shell.file, shell.args(command), {
        cwd: cwd && cwd !== '' ? cwd : undefined,
        env: { ...env, DSH_STATUS_LINE: '1', DSH_SESSION_ID: context.session_id ?? '', DSH_SESSION_CWD: context.cwd ?? '' },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        windowsVerbatimArguments: shell.windowsVerbatimArguments,
      });
    } catch (error) {
      finish({ ok: false, error: `spawn failed: ${error instanceof Error ? error.message : String(error)}` });
      return;
    }
    const chunks = [];
    let size = 0;
    let stderr = '';
    const timer = setTimeout(() => {
      finish({ ok: false, error: `status line command timed out after ${timeoutMs}ms` });
      try { child.kill(); } catch { /* already gone */ }
    }, timeoutMs);
    child.stdout.on('data', chunk => {
      if (size >= MAX_OUTPUT_BYTES) return;
      size += chunk.length;
      chunks.push(chunk.subarray(0, Math.max(0, MAX_OUTPUT_BYTES - (size - chunk.length))));
    });
    child.stderr.on('data', chunk => { if (stderr.length < 2048) stderr += chunk.toString('utf8'); });
    child.on('error', error => { clearTimeout(timer); finish({ ok: false, error: error.message }); });
    child.on('close', code => {
      clearTimeout(timer);
      const text = sanitizeCommandOutput(Buffer.concat(chunks).toString('utf8'), maxChars);
      if (code !== 0 && text === '') finish({ ok: false, error: `status line command exited with code ${code}${stderr.trim() ? `: ${stderr.trim().slice(0, 200)}` : ''}` });
      else finish({ ok: true, text, ...(code === 0 ? {} : { exitCode: code }) });
    });
    child.stdin.on('error', () => { /* command closed stdin early; output still counts */ });
    child.stdin.end(`${JSON.stringify(context)}\n`);
  });
}
