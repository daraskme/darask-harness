export const AUTO_PRESET = 'auto';

const SAFE_TOOLS = new Set([
  'read', 'grep', 'glob', 'write', 'edit', 'str_replace_editor',
  'todo_write', 'ask_user_question', 'skill', 'present',
  'web_search', 'web_fetch', 'job_output', 'job_wait', 'job_list',
  'list_agents', 'send_message', 'interrupt_agent',
  'subagent', 'subagent_fork', 'workflow', 'ralph',
  'exit_plan_mode', 'create_goal', 'update_goal', 'get_goal',
  'darask_agent', 'darask_browser_run',
  'darask_plan', 'darask_memory', 'darask_checkpoint', 'darask_disk_cleanup',
  'darask_kanban', 'darask_langfuse', 'darask_image_gen', 'darask_imagine_video', 'darask_r2', 'darask_spotify',
  'darask_achievements', 'darask_snapcompact', 'darask_chrome_profiles',
  'darask_telegram', 'darask_imessage', 'darask_snyk', 'darask_jackal',
  'darask_touchdesigner', 'darask_modlens',
]);

const SHELL_TOOLS = new Set(['pwsh', 'bash', 'terminal']);
const COMPUTER_MUTATING = new Set(['launch_game', 'launch_game_pair', 'move', 'click', 'double_click', 'right_click', 'drag', 'scroll', 'type', 'key', 'focus', 'invoke', 'set_value', 'select', 'toggle']);
const SAFE_MCP_ACTIONS = new Set([
  'take_snapshot', 'take_screenshot', 'list_pages', 'list_console_messages', 'list_network_requests',
  'wait_for', 'hover', 'select_page', 'get_console_message', 'get_network_request',
  'new_page', 'navigate_page', 'close_page', 'resize_page',
  'click', 'fill', 'fill_form', 'type_text', 'press_key', 'upload_file', 'drag', 'emulate',
]);

const DANGEROUS = [
  { pattern: /\b(?:rm|rmdir|rd|del|erase|sudo|runas|curl|wget|scp|sftp|ssh|ftp|eval)\b/i, label: '破壊・外部送信の可能性があるコマンド' },
  { pattern: /\b(?:iex|iwr|irm|saps)\b/i, label: 'PowerShell の危険な省略形' },
  { pattern: /Remove-Item|Invoke-WebRequest|Invoke-RestMethod|Invoke-Expression|Start-Process|Stop-Process|Stop-Computer|Restart-Computer|Set-Acl|Set-ExecutionPolicy|DownloadString|DownloadFile/i, label: '権限変更・外部通信・プロセス操作' },
  { pattern: /\bgit\s+(push|reset|clean|rebase|filter-branch|update-ref)\b/i, label: 'git の破壊的・外部送信操作' },
  { pattern: /\bnpm\s+(publish|unpublish)\b/i, label: 'npm 公開' },
  { pattern: /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?(?:publish|unpublish|deploy|release)\b/i, label: '公開・配信' },
  { pattern: /\bnpm\s+(?:i|install|ci|update|upgrade)\b/i, label: 'パッケージ導入' },
  { pattern: /\b(?:pnpm|yarn|pip|pip3)\s+(?:i|install|add|uninstall|remove)\b/i, label: 'パッケージ導入' },
  { pattern: /\b(?:shutdown|taskkill|diskpart|format|cipher|icacls|takeown|chmod|chown)\b/i, label: 'システム変更' },
  { pattern: /\b(?:docker|kubectl|podman|winget|choco)\b/i, label: 'コンテナ・パッケージ管理' },
  { pattern: /\breg(?:\.exe)?\s+add\b/i, label: 'レジストリ変更' },
];



function commandText(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return '';
  return typeof args.command === 'string' ? args.command : '';
}

function preview(value, limit = 120) {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

function mcpAction(name) {
  const parts = String(name).split('__');
  return parts.length >= 3 ? parts[2] : '';
}

// Keep native sandbox boundaries in charge of paths. This classifier decides
// which routine development commands need an additional confirmation; it is
// not a shell sandbox or an assurance that arbitrary project scripts are safe.
function normalizedCommand(command) {
  return command.replace(/\b(git|npm|pnpm|yarn|node|python3?|pip3?|uv)\.(?:cmd|exe)\b/gi, '$1');
}
function projectInstall(command) {
  if (/\s(?:-g\S*|--global|--system|--prefix|--target|--user|--directory|--cwd)(?:[=\s]|$)/i.test(command)) return false;
  if (/[`$<>]|\b(?:sudo|runas|publish|unpublish|deploy)\b/i.test(command)) return false;
  return /^(?:(?:npm|pnpm)\s+(?:i|install|ci|add|update|upgrade)|yarn\s+(?:install|add|upgrade)|uv\s+sync)(?:\s+[^;&|]+)*$/i.test(command);
}

export function shellUnsafeReason(command) {
  const text = normalizedCommand(String(command ?? '').trim());
  if (!text) return '空のコマンドは確認できません。';
  if (/[`]|\$\(|[<>]/.test(text)) return 'コマンド展開・リダイレクトは内容の確認が必要です。';
  const parts = text.split(/\s*(?:&&|\|\||[;&|\n])\s*/).map(part => part.trim()).filter(Boolean);
  // Recognize only complete install commands, never an install followed by a
  // dangerous command. Global/package-manager configuration still asks.
  const remaining = parts.filter(part => !projectInstall(part));
  for (const rule of DANGEROUS) {
    if (remaining.some(part => rule.pattern.test(part))) return `${rule.label}: ${preview(text)}`;
  }
  if (parts.length === 0) return `安全と判定できないコマンドです: ${preview(text)}`;
  return null;
}

export function autoApprovalAsk(exec) {
  const args = exec?.arguments && typeof exec.arguments === 'object' && !Array.isArray(exec.arguments) ? exec.arguments : {};
  if (typeof args.sandbox_permissions === 'string' && args.sandbox_permissions) return null;
  const name = String(exec?.name ?? '');
  if (SAFE_TOOLS.has(name)) return null;
  if (SHELL_TOOLS.has(name) || /(?:^|_)(?:bash|pwsh)$/.test(name)) return shellUnsafeReason(commandText(args));
  if (name === 'darask_computer') {
    return COMPUTER_MUTATING.has(args.action) ? `PC 画面の操作は安全でない可能性があるため承認が必要です（${args.action}）` : null;
  }
  if (name.startsWith('mcp__')) {
    const action = mcpAction(name);
    if (SAFE_MCP_ACTIONS.has(action)) return null;
    return `ブラウザーの操作は安全でない可能性があるため承認が必要です（${action || name}）`;
  }
  return null;
}

export function installAutoApproval(ctx) {
  ctx.inject(['tools', 'permissionPresets'], scope => {
    scope.on('tools/pre-execute', async (exec, next) => {
      const decision = await next();
      if (decision?.kind !== 'allow') return decision;
      const session = exec.agent?.session;
      if (!session || scope.permissionPresets.current(session) !== AUTO_PRESET) return decision;
      const reason = autoApprovalAsk(exec);
      return reason ? { kind: 'ask', reason } : decision;
    });
  });
  ctx.inject(['systemPrompt', 'permissionPresets'], promptCtx => {
    promptCtx.systemPrompt.context({
      name: 'darask:auto-approval',
      order: 10055,
      text: context => {
        const session = context.agent?.session;
        if (!session || promptCtx.permissionPresets.current(session) !== AUTO_PRESET) return '';
        return '権限モード: 自動。ローカル・リモートとも、選択したワークスペース内の編集、ビルド、テスト、通常のプロジェクト依存関係の導入、git の取得・切替、通常のシェル、ブラウザーの閲覧・クリック・入力は自動で実行できます。削除、公開・外部送信、システム変更、グローバル導入、PC 画面操作は確認します。サンドボックスの範囲外への権限拡張は引き続き承認が必要です。';
      },
    });
  });
}
