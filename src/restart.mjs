import { spawn } from 'node:child_process';
import { publicOrigin } from './http.mjs';

const MESSAGE = 'DSH を再起動しています。数秒後に画面を更新してください。';

export function scheduleRestart({
  env = process.env,
  execPath = process.execPath,
  argv = process.argv,
  cwd = process.cwd(),
  spawnImpl = spawn,
  exit = code => process.exit(code),
  fetchImpl = globalThis.fetch,
  delayMs = 600,
} = {}) {
  const timer = setTimeout(() => {
    void (async () => {
      try {
        if (env.DARASK_DEV_CONTROL_URL && env.DARASK_DEV_CONTROL_TOKEN) {
          await fetchImpl(env.DARASK_DEV_CONTROL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DARASK_DEV_CONTROL_TOKEN}` },
            body: JSON.stringify({ action: 'restart' }),
            signal: AbortSignal.timeout(20000),
            redirect: 'error',
          });
          return;
        }
        if (env.DSH_DAEMON || env.PM2_HOME) {
          exit(0);
          return;
        }
        const child = spawnImpl(execPath, argv.slice(1), {
          cwd, env, detached: true, stdio: 'ignore', windowsHide: false,
        });
        child.unref?.();
        exit(0);
      } catch {
        exit(0);
      }
    })();
  }, delayMs);
  timer.unref?.();
  return { ok: true, message: MESSAGE };
}

export function restartRoutes(options = {}) {
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  return [{ path: '/api/darask/restart', methods: ['POST'], requestBody: 'buffered', async fetch(request) {
    try {
      if (!request.headers.get('origin')) return json({ error: '画面から操作してください。' }, 403);
      publicOrigin(request);
    } catch { return json({ error: 'Origin rejected.' }, 403); }
    return json(scheduleRestart(options));
  } }];
}
