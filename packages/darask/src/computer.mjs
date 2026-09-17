import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const COMPUTER_ACTIONS = Object.freeze(['launch_game', 'inspect', 'invoke', 'set_value', 'select', 'toggle', 'screenshot', 'windows', 'focus', 'move', 'click', 'double_click', 'right_click', 'drag', 'scroll', 'type', 'key', 'wait', 'cursor']);
const ELEMENT_ACTIONS = new Set(['invoke', 'set_value', 'select', 'toggle']);
const MUTATING = new Set(['move', 'click', 'double_click', 'right_click', 'drag', 'scroll', 'type', 'key', 'focus']);
const KEY_NAME = /^(?:enter|return|tab|esc|escape|backspace|delete|del|space|home|end|pageup|pgup|pagedown|pgdn|left|up|right|down|ctrl|control|alt|shift|win|meta|super|caps|capslock|insert|f(?:[1-9]|1[0-2])|[a-z0-9])$/i;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IMAGE_VALUE_SCHEMA = {
  type: 'object', additionalProperties: false, properties: {
    attachmentId: { type: 'string', required: true },
    mediaType: { type: 'string', enum: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], required: true },
    bytes: { type: 'integer', required: true },
    width: { type: 'integer', required: true },
    height: { type: 'integer', required: true },
    name: { type: 'string' },
    originalDimensions: { type: 'object', additionalProperties: false, properties: { width: { type: 'integer', required: true }, height: { type: 'integer', required: true } } },
  },
};

export const COMPUTER_IMAGE_SCHEMA = IMAGE_VALUE_SCHEMA;
const DEFAULT_SCRIPT = fileURLToPath(new URL('../scripts/computer-host.ps1', import.meta.url));

export function defaultComputer() {
  return { enabled: false, game: { name: '', executable: '', args: [], cwd: '', windowTitle: '' } };
}

export function validateComputer(input, base = defaultComputer()) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['enabled', 'game'].includes(key))) throw new Error('Invalid computer setting');
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') throw new Error('Invalid computer setting');
  const result = structuredClone(base);
  if (input.enabled !== undefined) result.enabled = input.enabled;
  if (input.game !== undefined) {
    const game = input.game;
    const keys = ['name', 'executable', 'args', 'cwd', 'windowTitle'];
    if (!game || typeof game !== 'object' || Array.isArray(game) || Object.keys(game).some(key => !keys.includes(key))) throw new Error('Invalid computer game setting');
    const current = { ...result.game, ...game };
    for (const key of ['name', 'executable', 'cwd', 'windowTitle']) {
      if (typeof current[key] !== 'string' || current[key].length > 2048 || /[\x00-\x1f]/.test(current[key])) throw new Error('Invalid computer game setting');
      current[key] = current[key].trim();
    }
    if (current.name.length > 120 || current.windowTitle.length > 200) throw new Error('Invalid computer game setting');
    if (current.executable && !(path.isAbsolute(current.executable) || path.win32.isAbsolute(current.executable))) throw new Error('Use an absolute game executable path');
    if (current.cwd && !(path.isAbsolute(current.cwd) || path.win32.isAbsolute(current.cwd))) throw new Error('Use an absolute game working directory');
    if (!Array.isArray(current.args) || current.args.length > 32 || current.args.some(arg => typeof arg !== 'string' || arg.length > 512 || /[\x00-\x1f]/.test(arg))) throw new Error('Invalid computer game arguments');
    result.game = current;
  }
  return result;
}

export function computerEnvironment(supplied = process.env) {
  const allowed = /^(?:PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|HOME|HOMEDRIVE|HOMEPATH|USERPROFILE|USERNAME|USERDOMAIN|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SESSIONNAME|CLIENTNAME)$/i;
  return Object.fromEntries(Object.entries(supplied).filter(([key, value]) => typeof value === 'string' && allowed.test(key)));
}

export function powershellExecutable(platform = process.platform, env = process.env) {
  if (platform !== 'win32') throw new Error('Computer: PC screen control is available on Windows.');
  const root = env.SystemRoot ?? env.SYSTEMROOT ?? 'C:\\Windows';
  return path.win32.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

export function validateComputerAction(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Computer: invalid action.');
  const action = args.action;
  if (args.snapshotId !== undefined && (typeof args.snapshotId !== 'string' || !/^[a-f0-9-]{36}$/.test(args.snapshotId))) throw new Error('Computer: snapshotId が不正です。');
  if (action === 'inspect' && (typeof args.hwnd !== 'string' || !/^\d{1,20}$/.test(args.hwnd))) throw new Error('Computer: windows で取得した hwnd を指定してください。');
  if (ELEMENT_ACTIONS.has(action)) {
    if (!args.snapshotId || typeof args.elementId !== 'string' || !/^\d{1,3}$/.test(args.elementId)) throw new Error('Computer: 最新の snapshotId と elementId を指定してください。');
    if (action === 'set_value' && (typeof args.text !== 'string' || args.text.length > 4000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(args.text))) throw new Error('Computer: 入力値は 4000 文字以内で指定してください。');
  }
  if (!COMPUTER_ACTIONS.includes(action)) throw new Error('Computer: unsupported action.');
  const integer = (key, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, required = false } = {}) => {
    if (args[key] === undefined || args[key] === null) {
      if (required) throw new Error(`Computer: ${key} is required.`);
      return undefined;
    }
    if (!Number.isInteger(args[key]) || args[key] < min || args[key] > max) throw new Error(`Computer: ${key} is out of range.`);
    return args[key];
  };
  const point = required => ({ x: integer('x', { min: -100000, max: 100000, required }), y: integer('y', { min: -100000, max: 100000, required }) });
  if (['move', 'click', 'double_click', 'right_click', 'scroll'].includes(action)) point(true);
  if (action === 'drag') {
    point(true);
    integer('x2', { min: -100000, max: 100000, required: true });
    integer('y2', { min: -100000, max: 100000, required: true });
  }
  if (['click', 'double_click', 'right_click'].includes(action) && args.button !== undefined && !['left', 'right', 'middle'].includes(args.button)) throw new Error('Computer: button must be left, right or middle.');
  if (action === 'click') integer('clicks', { min: 1, max: 3 });
  if (action === 'scroll') integer('delta', { min: -2400, max: 2400, required: true });
  if (action === 'wait') integer('ms', { min: 1, max: 10000, required: true });
  if (args.space !== undefined && !['screenshot', 'screen'].includes(args.space)) throw new Error('Computer: space must be screenshot or screen.');
  if (args.observe !== undefined && typeof args.observe !== 'boolean') throw new Error('Computer: observe must be boolean.');
  if (action === 'type') {
    if (typeof args.text !== 'string' || !args.text || args.text.length > 4000) throw new Error('Computer: type text must be 1 to 4000 characters.');
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(args.text)) throw new Error('Computer: type text contains control characters.');
  }
  if (action === 'key') {
    const keys = Array.isArray(args.keys) ? args.keys : typeof args.keys === 'string' ? args.keys.split(/[+\s]+/).filter(Boolean) : null;
    if (!keys?.length || keys.length > 5 || keys.some(key => typeof key !== 'string' || !KEY_NAME.test(key))) throw new Error('Computer: keys must be a short combination such as ctrl, c.');
    args.keys = keys.map(key => key.toLowerCase());
  }
  if (action === 'focus') {
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    const hwnd = typeof args.hwnd === 'string' ? args.hwnd.trim() : '';
    if ((!title && !hwnd) || title.length > 200 || hwnd.length > 32 || (hwnd && !/^-?\d+$/.test(hwnd))) throw new Error('Computer: focus requires a window title or hwnd.');
  }
  return args;
}

export function mapPoint(x, y, capture, space = 'screenshot') {
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error('Computer: coordinates must be integers.');
  if (space === 'screen') return { x, y };
  if (!capture) throw new Error('Computer: take a screenshot before using screenshot coordinates.');
  if (x < 0 || y < 0 || x >= capture.imageWidth || y >= capture.imageHeight) {
    throw new Error(`Computer: coordinates (${x}, ${y}) are outside the ${capture.imageWidth}x${capture.imageHeight} screenshot.`);
  }
  return {
    x: Math.round(capture.originX + (x + 0.5) * capture.scaleX),
    y: Math.round(capture.originY + (y + 0.5) * capture.scaleY),
  };
}

export function normalizeWindows(value) {
  let list = value;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); }
    catch { return []; }
  }
  if (Array.isArray(list) && list.length === 1 && Array.isArray(list[0]?.value)) list = list[0].value;
  if (!Array.isArray(list)) return [];
  return list.map(window => ({
    hwnd: String(window?.hwnd ?? ''),
    title: String(window?.title ?? '').slice(0, 200),
    x: Number(window?.x) || 0, y: Number(window?.y) || 0,
    width: Number(window?.width) || 0, height: Number(window?.height) || 0,
    pid: Number(window?.pid) || 0,
  })).filter(window => window.hwnd && window.title);
}

export function imageReadContent(pathLabel, image) {
  let scaled = '';
  if (image.originalDimensions) {
    const advice = '画像内の座標をそのまま渡してください。倍率の変換はツールが行います。';
    scaled = ` (downscaled from ${image.originalDimensions.width}x${image.originalDimensions.height} px; ${advice} to locate features on the real screen)`;
  }
  return [
    { type: 'text', text: `<path>${pathLabel}</path>\n<type>image</type>\n<content>\n${image.mediaType} image, ${image.width}x${image.height} px, ${image.bytes} bytes${scaled}\n</content>` },
    { type: 'image', attachment: { attachmentId: image.attachmentId, mediaType: image.mediaType, bytes: image.bytes, width: image.width, height: image.height, ...(image.name ? { name: image.name } : {}), ...(image.originalDimensions ? { originalDimensions: { ...image.originalDimensions } } : {}) } },
  ];
}

function sanitizeHostError(value) {
  const text = String(value ?? 'desktop host failed').replace(/\s+/g, ' ').trim().slice(0, 180);
  if (!text) return 'Computer: desktop host failed.';
  return text.startsWith('Computer:') ? text : `Computer: ${text}`;
}

async function pruneScreenshots(directory, keep = 20) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  const files = entries.filter(entry => entry.isFile() && entry.name.endsWith('.png')).map(entry => entry.name).sort();
  const extra = files.slice(0, Math.max(0, files.length - keep));
  await Promise.all(extra.map(name => unlink(path.join(directory, name)).catch(() => {})));
}

export function createLineHost({ command, args, env, scriptPath, spawnImpl = spawn, timeoutMs = 20000 }) {
  let child;
  let buffer = '';
  let stderr = '';
  const waiters = [];
  const failWaiters = error => {
    while (waiters.length) waiters.shift().reject(error);
  };
  const stop = error => {
    const current = child;
    child = undefined;
    failWaiters(error);
    try { current?.kill(); } catch {}
  };
  const start = () => {
    if (child && !child.killed && child.exitCode === null) return;
    buffer = '';
    stderr = '';
    child = spawnImpl(command, args, { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env, cwd: path.dirname(scriptPath) });
    const current = child;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      if (child !== current) return;
      buffer += chunk;
      if (buffer.length > 1048576) { stop(new Error('Computer: 画面情報が大きすぎます。')); return; }
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        const waiter = waiters.shift();
        if (waiter) waiter.resolve(line);
      }
    });
    child.stderr.on('data', chunk => {
      if (child !== current) return;
      stderr = (stderr + chunk).slice(-4000);
    });
    child.on('error', error => {
      if (child !== current) return;
      const next = new Error(sanitizeHostError(error.message));
      stop(next);
    });
    child.on('close', code => {
      if (child !== current) return;
      child = undefined;
      const detail = stderr.replace(/\s+/g, ' ').trim().slice(0, 120);
      failWaiters(new Error(sanitizeHostError(detail || `desktop host exited (${code ?? 'unknown'})`)));
    });
  };
  return {
    async request(payload, signal) {
      if (signal?.aborted) throw signal.reason ?? new Error('Computer: 中断しました。');
      const line = `${JSON.stringify(payload)}\n`;
      if (Buffer.byteLength(line) > 65536) throw new Error('Computer: request is too large.');
      start();
      const result = new Promise((resolve, reject) => {
        const waiter = { resolve, reject };
        const timer = setTimeout(() => {
          stop(new Error('Computer: 操作がタイムアウトしました。結果を再確認してください。'));
        }, timeoutMs);
        const onAbort = () => {
          stop(signal.reason ?? new Error('Computer: 中断しました。'));
        };
        waiter.resolve = value => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); resolve(value); };
        waiter.reject = error => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); reject(error); };
        if (signal?.aborted) {
          waiter.reject(signal.reason ?? new Error('Computer: cancelled.'));
          return;
        }
        signal?.addEventListener('abort', onAbort, { once: true });
        waiters.push(waiter);
      });
      try { child.stdin.write(line); }
      catch { stop(new Error('Computer: 操作プロセスに接続できません。')); }
      const raw = await result;
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { throw new Error('Computer: desktop host returned invalid JSON.'); }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Computer: desktop host returned an invalid result.');
      if (parsed.ok !== true) throw new Error(sanitizeHostError(parsed.error));
      return parsed;
    },
    async dispose() {
      failWaiters(new Error('Computer: stopped.'));
      const current = child;
      child = undefined;
      if (!current) return;
      try { current.stdin?.end(); } catch {}
      try { current.kill(); } catch {}
    },
  };
}

export function createComputer({ directory, store, platform = process.platform, env = process.env, scriptPath = DEFAULT_SCRIPT, runHost, spawnImpl, startGame, timeoutMs = 20000 }) {
  const shots = path.join(directory, 'computer');
  let capture = null;
  let elements = null;
  let last = null;
  let queue = Promise.resolve();
  let host;
  const available = platform === 'win32';
  const ensureHost = () => {
    if (runHost) return null;
    if (!available) throw new Error('Computer: PC screen control is available on Windows.');
    if (!host) {
      host = createLineHost({
        command: powershellExecutable(platform, env),
        args: ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-STA', '-File', scriptPath],
        env: computerEnvironment(env),
        scriptPath,
        spawnImpl,
        timeoutMs,
      });
    }
    return host;
  };
  const send = async (payload, signal) => {
    if (runHost) return runHost(payload, signal);
    return ensureHost().request(payload, signal);
  };
  const launch = startGame ?? ((executable, args, options) => new Promise((resolve, reject) => {
    const child = spawn(executable, args, options);
    const failed = error => reject(error);
    child.once('error', failed);
    child.once('spawn', () => {
      child.off('error', failed);
      child.unref();
      resolve();
    });
  }));
  async function screenshot(signal, attachments, actor) {
    await mkdir(shots, { recursive: true });
    const file = path.join(shots, `${randomUUID()}.png`);
    const result = await send({ op: 'screenshot', path: file, maxDimension: 1280 }, signal);
    const bytes = await readFile(file);
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('Computer: screenshot was not a PNG.');
    await writeFile(file, bytes, { mode: 0o600 });
    await pruneScreenshots(shots);
    capture = {
      actor, snapshotId: randomUUID(), stamp: Date.now(),
      originX: result.originX, originY: result.originY,
      width: result.width, height: result.height,
      imageWidth: result.imageWidth, imageHeight: result.imageHeight,
      scaleX: result.scaleX, scaleY: result.scaleY,
      at: new Date().toISOString(),
    };
    const imageValue = {
      mediaType: 'image/png',
      bytes: bytes.byteLength,
      width: result.imageWidth,
      height: result.imageHeight,
      name: 'screen.png',
      ...(result.scaleX !== 1 || result.scaleY !== 1 ? { originalDimensions: { width: result.width, height: result.height } } : {}),
    };
    if (attachments?.saveImage) {
      const ref = await attachments.saveImage({ data: bytes, mediaType: 'image/png', name: 'screen.png' });
      imageValue.attachmentId = ref.attachmentId;
      imageValue.mediaType = ref.mediaType;
      imageValue.bytes = ref.bytes;
      imageValue.width = ref.width;
      imageValue.height = ref.height;
      if (ref.name) imageValue.name = ref.name;
      if (ref.originalDimensions) imageValue.originalDimensions = { ...ref.originalDimensions };
    }
    const cursorShotX = Number.isInteger(result.cursorX) ? Math.round((result.cursorX - result.originX) / result.scaleX) : undefined;
    const cursorShotY = Number.isInteger(result.cursorY) ? Math.round((result.cursorY - result.originY) / result.scaleY) : undefined;
    return {
      action: 'screenshot',
      snapshotId: capture.snapshotId,
      file,
      width: result.imageWidth,
      height: result.imageHeight,
      screenWidth: result.width,
      screenHeight: result.height,
      scaleX: result.scaleX,
      scaleY: result.scaleY,
      originX: result.originX,
      originY: result.originY,
      ...(Number.isInteger(result.cursorX) ? { cursorX: result.cursorX, cursorY: result.cursorY, cursorShotX, cursorShotY } : {}),
      text: `Screenshot ${result.imageWidth}x${result.imageHeight} of a ${result.width}x${result.height} virtual screen. Click coordinates are in this image. Cursor is at screenshot (${cursorShotX}, ${cursorShotY}).`,
      ...(imageValue.attachmentId ? { image: imageValue } : {}),
    };
  }
  async function perform(args, exec = {}) {
    if (store.get().computer?.enabled !== true) throw new Error('Computer: enable PC screen control in Settings → Accounts → PCs & Tailscale.');
    if (!available && !runHost) throw new Error('Computer: PC screen control is available on Windows.');
    const action = validateComputerAction({ ...args });
    const actor = exec.agent ?? null;
    exec.signal?.throwIfAborted();
    if (action.action === 'launch_game') {
      const game = store.get().computer?.game;
      if (!game?.executable) throw new Error('Computer: 設定 → アカウント → ブラウザーと画面操作でゲーム起動プロファイルを保存してください。');
      try {
        await launch(game.executable, [...game.args], {
          ...(game.cwd ? { cwd: game.cwd } : {}),
          detached: true,
          env: computerEnvironment(env),
          shell: false,
          stdio: 'ignore',
          windowsHide: false,
        });
      } catch {
        throw new Error('Computer: ゲームを起動できませんでした。実行ファイルと作業フォルダーを確認してください。');
      }
      capture = null;
      elements = null;
      last = { action: 'launch_game', at: new Date().toISOString() };
      const name = game.name || path.win32.basename(game.executable);
      return { action: 'launch_game', title: game.windowTitle || name, text: `${name} の起動を要求しました。windows または screenshot で結果を確認してください。` };
    }
    if (action.action === 'inspect' || ELEMENT_ACTIONS.has(action.action)) {
      if (ELEMENT_ACTIONS.has(action.action)) {
        if (!elements || elements.actor !== actor || elements.snapshotId !== action.snapshotId || Date.now() - elements.stamp > 60000) throw new Error('Computer: 画面情報が古いか別セッションのものです。inspect で再取得してください。');
        elements = null; capture = null;
      }
      const result = await send({ op: action.action, hwnd: action.hwnd, snapshotId: action.snapshotId, elementId: action.elementId, text: action.text }, exec.signal);
      elements = { actor, snapshotId: result.snapshotId, stamp: Date.now() };
      last = { action: action.action, at: new Date().toISOString() };
      const detail = { snapshotId: result.snapshotId, hwnd: result.hwnd, title: result.title, elements: result.elements, truncated: result.truncated, ...(result.effect ? { effect: result.effect } : {}) };
      return { action: action.action, snapshotId: result.snapshotId, text: JSON.stringify(detail), ...(result.effect ? { effect: result.effect } : {}) };
    }
    if (exec.signal?.aborted) throw exec.signal.reason ?? new Error('Computer: cancelled.');
    if (action.action === 'wait') {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { exec.signal?.removeEventListener('abort', onAbort); resolve(); }, action.ms);
        const onAbort = () => { clearTimeout(timer); reject(exec.signal.reason ?? new Error('Computer: cancelled.')); };
        if (exec.signal?.aborted) { onAbort(); return; }
        exec.signal?.addEventListener('abort', onAbort, { once: true });
      });
      last = { action: 'wait', at: new Date().toISOString() };
      return { action: 'wait', text: `Waited ${action.ms} ms.` };
    }
    if (action.action === 'screenshot') return screenshot(exec.signal, exec.attachments, actor);
    if (action.action === 'cursor') {
      const result = await send({ op: 'cursor' }, exec.signal);
      last = { action: 'cursor', at: new Date().toISOString() };
      return { action: 'cursor', cursorX: result.x, cursorY: result.y, text: `Cursor at screen (${result.x}, ${result.y}).` };
    }
    if (action.action === 'windows') {
      const result = await send({ op: 'windows' }, exec.signal);
      const windows = normalizeWindows(result.windowsJson ?? result.windows);
      last = { action: 'windows', at: new Date().toISOString() };
      return { action: 'windows', windows, text: windows.length ? windows.map(window => `${window.title} (${window.width}x${window.height} at ${window.x},${window.y}) hwnd=${window.hwnd}`).join('\n') : 'No visible windows.' };
    }
    const space = action.space ?? 'screenshot';
    if (['move', 'click', 'double_click', 'right_click', 'drag', 'scroll'].includes(action.action) && space === 'screenshot') {
      if (!capture || capture.actor !== actor || Date.now() - capture.stamp > 60000 || (action.snapshotId && capture.snapshotId !== action.snapshotId)) throw new Error('Computer: 最新の screenshot を取得してください。');
    }
    const mapped = ['move', 'click', 'double_click', 'right_click', 'drag', 'scroll'].includes(action.action)
      ? { ...mapPoint(action.x, action.y, capture, space), ...(action.action === 'drag' ? (() => { const end = mapPoint(action.x2, action.y2, capture, space); return { x2: end.x, y2: end.y }; })() : {}) }
      : null;
    let payload;
    if (action.action === 'move') payload = { op: 'move', x: mapped.x, y: mapped.y };
    else if (action.action === 'click') payload = { op: 'click', x: mapped.x, y: mapped.y, button: action.button ?? 'left', clicks: action.clicks ?? 1 };
    else if (action.action === 'double_click') payload = { op: 'click', x: mapped.x, y: mapped.y, button: 'left', clicks: 2 };
    else if (action.action === 'right_click') payload = { op: 'click', x: mapped.x, y: mapped.y, button: 'right', clicks: 1 };
    else if (action.action === 'drag') payload = { op: 'drag', x: mapped.x, y: mapped.y, x2: mapped.x2, y2: mapped.y2 };
    else if (action.action === 'scroll') payload = { op: 'scroll', x: mapped.x, y: mapped.y, delta: action.delta };
    else if (action.action === 'type') payload = { op: 'type', text: action.text };
    else if (action.action === 'key') payload = { op: 'key', keys: action.keys };
    else if (action.action === 'focus') payload = { op: 'focus', ...(action.hwnd ? { hwnd: action.hwnd } : {}), ...(action.title ? { title: action.title.trim() } : {}) };
    if (MUTATING.has(action.action)) { capture = null; elements = null; }
    const result = await send(payload, exec.signal);
    last = { action: action.action, at: new Date().toISOString() };
    const observe = action.observe !== false && MUTATING.has(action.action);
    const summary = action.action === 'focus' ? `Focused ${result.title ?? action.title}.` : `Performed ${action.action}.`;
    if (!observe) return { action: action.action, text: summary, ...(result.hwnd ? { hwnd: String(result.hwnd), title: String(result.title ?? '') } : {}) };
    const shot = await screenshot(exec.signal, exec.attachments, actor);
    return { ...shot, action: action.action, text: `${summary} ${shot.text}` };
  }
  return {
    status() {
      const enabled = store.get().computer?.enabled === true;
      return { enabled, available: available || Boolean(runHost), platform, game: structuredClone(store.get().computer?.game ?? defaultComputer().game), last, capture: capture ? { width: capture.imageWidth, height: capture.imageHeight, screenWidth: capture.width, screenHeight: capture.height, at: capture.at } : null };
    },
    run(args, exec = {}) {
      const task = queue.catch(() => {}).then(() => perform(args, exec));
      queue = task;
      return task;
    },
    async dispose() { await queue.catch(() => {}); await host?.dispose(); host = undefined; },
  };
}
