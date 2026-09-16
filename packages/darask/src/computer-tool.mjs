import { defineTool } from '@deepseek-ai/dsh-tools';
import { COMPUTER_ACTIONS, COMPUTER_IMAGE_SCHEMA, imageReadContent } from './computer.mjs';
export function registerComputerTool(toolsCtx, computer) {
    toolsCtx.tools.register(defineTool({
      name: 'darask_computer',
      description: 'Computer Use: ローカル・登録済みリモート PC のアプリを操作する。pcs で接続先を確認し node を毎回指定する。画像入力不要の windows → inspect → 要素 ID による invoke/set_value/select/toggle を優先。画像を見られるモデルは screenshot と座標操作も利用可能。最新 snapshotId を使い、操作後に再観測する。Web は Kitesurf。設定で PC 画面操作を有効にする。',
      parameters: {
        action: { type: 'string', enum: ['pcs', ...COMPUTER_ACTIONS], required: true, description: 'inspect, invoke, set_value, select, toggle, screenshot, windows, focus, move, click, double_click, right_click, drag, scroll, type, key, wait, cursor.' },
        node: { type: 'string', description: 'pcs が返した PC の node。local はこのワークスペースの PC。リモートの操作では毎回同じ node を指定する。' },
        snapshotId: { type: 'string', description: '最新 inspect / screenshot の snapshotId。要素操作では必須。' },
        elementId: { type: 'string', description: 'inspect が返した要素 ID。対応する actions のみ実行できる。' },
        x: { type: 'integer', description: 'X in last-screenshot pixels unless space is screen.' },
        y: { type: 'integer', description: 'Y in last-screenshot pixels unless space is screen.' },
        x2: { type: 'integer', description: 'Drag end X.' },
        y2: { type: 'integer', description: 'Drag end Y.' },
        button: { type: 'string', enum: ['left', 'right', 'middle'] },
        clicks: { type: 'integer', description: 'Click count, 1 to 3.' },
        delta: { type: 'integer', description: 'Scroll wheel delta. Positive scrolls up.' },
        text: { type: 'string', description: 'Unicode text to type. Newlines become Enter.' },
        keys: { type: 'array', items: { type: 'string' }, description: 'Key combination such as ["ctrl","c"] or ["enter"].' },
        title: { type: 'string', description: 'Visible window title or unique substring to focus.' },
        hwnd: { type: 'string', description: 'Window handle from the windows action.' },
        ms: { type: 'integer', description: 'Wait duration in milliseconds, max 10000.' },
        space: { type: 'string', enum: ['screenshot', 'screen'] },
        observe: { type: 'boolean', description: 'Capture a screenshot after a GUI action. Defaults to true for mouse, keyboard, and focus.' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: {
          action: { type: 'string', required: true }, text: { type: 'string', required: true }, file: { type: 'string' },
          width: { type: 'integer' }, height: { type: 'integer' }, screenWidth: { type: 'integer' }, screenHeight: { type: 'integer' },
          scaleX: { type: 'number' }, scaleY: { type: 'number' }, originX: { type: 'integer' }, originY: { type: 'integer' },
          cursorX: { type: 'integer' }, cursorY: { type: 'integer' }, cursorShotX: { type: 'integer' }, cursorShotY: { type: 'integer' },
          hwnd: { type: 'string' }, title: { type: 'string' },
          windows: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { hwnd: { type: 'string', required: true }, title: { type: 'string', required: true }, x: { type: 'integer', required: true }, y: { type: 'integer', required: true }, width: { type: 'integer', required: true }, height: { type: 'integer', required: true }, pid: { type: 'integer', required: true } } } },
          snapshotId: { type: 'string' }, effect: { type: 'string', enum: ['confirmed', 'unverified'] },
          image: COMPUTER_IMAGE_SCHEMA,
        } },
        render: (_args, value) => {
          if (!value.image) return [{ type: 'text', text: value.text }];
          const [meta, image] = imageReadContent(value.file ?? 'screen.png', value.image);
          return [{ type: 'text', text: `${value.text}\n${meta.text}` }, image];
        },
      },
      timeoutMs: 40000,
      isConcurrencySafe: () => false,
      async execute(args, exec) { return computer.run(args, { agent: exec.agent, signal: exec.signal, attachments: toolsCtx.get('attachments') }); },
      presentCall(args) { return { card: 'generic', title: `Computer Use · ${args.node ?? 'local'} · ${args.action}`, kind: 'execute', rawInput: args }; },
    }));
}
