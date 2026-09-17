/** Forked Hermes / oh-my-deepseek plugin catalog. Secrets stay in DSH credentials. */
export const GROUPS = Object.freeze([
  { id: 'deepseek', titleJa: 'DeepSeek 最適化', titleEn: 'DeepSeek' },
  { id: 'safety', titleJa: '安全・掃除', titleEn: 'Safety' },
  { id: 'ops', titleJa: 'エージェント運用', titleEn: 'Operations' },
  { id: 'media', titleJa: 'メディア', titleEn: 'Media' },
  { id: 'chat', titleJa: 'メッセージ', titleEn: 'Messaging' },
]);

export const PLUGIN_CATALOG = Object.freeze([
  {
    id: 'deepseek-harness', group: 'deepseek', origin: 'yuanchenglu/oh-my-deepseek-harness',
    titleJa: 'oh-my-deepseek-harness', titleEn: 'oh-my-deepseek-harness',
    summaryJa: '意図に応じて推論の深さを変え、制約を監査し、計画・記憶・チェックポイントを使います。',
    summaryEn: 'Routes reasoning depth from intent, audits constraints, and adds plan / memory / checkpoint tools.',
    tools: ['darask_plan', 'darask_memory', 'darask_checkpoint'],
  },
  {
    id: 'snapcompact', group: 'deepseek', origin: 'hermes-snapcompact',
    titleJa: 'SnapCompact', titleEn: 'SnapCompact',
    summaryJa: '大きなツール結果をファイルへ退避し、会話を圧縮します。',
    summaryEn: 'Spills large tool results to files and can trigger conversation compaction.',
    tools: ['darask_snapcompact'],
  },
  {
    id: 'modlens', group: 'deepseek', origin: 'ModLens',
    titleJa: 'ModLens', titleEn: 'ModLens',
    summaryJa: 'スクリーンショットや画像を OCR / UI テキストに落として、テキスト専用モデルへ渡します。',
    summaryEn: 'Bridges screenshots and images to OCR / UI text for text-only models.',
    tools: ['darask_modlens'],
  },
  {
    id: 'security-guidance', group: 'safety', origin: 'NousResearch/hermes-agent security-guidance',
    titleJa: 'Security Guidance', titleEn: 'Security Guidance',
    summaryJa: 'eval、pickle、shell=True などの危険パターンを書いたときに警告します。必要なら書き込みを拒否できます。',
    summaryEn: 'Warns on eval, pickle, shell=True and similar writes. Optionally blocks the write.',
    tools: [],
  },
  {
    id: 'disk-cleanup', group: 'safety', origin: 'NousResearch/hermes-agent disk-cleanup',
    titleJa: 'Disk Cleanup', titleEn: 'Disk Cleanup',
    summaryJa: 'テスト・一時ファイルを追跡し、セッション後や手動で掃除します。',
    summaryEn: 'Tracks test and temp files, then cleans them at session end or on demand.',
    tools: ['darask_disk_cleanup'],
  },
  {
    id: 'snyk', group: 'safety', origin: 'snyk Hermes catalog plugin',
    titleJa: 'Snyk', titleEn: 'Snyk',
    summaryJa: 'インストール済みの Snyk CLI で依存関係の脆弱性を調べます。',
    summaryEn: 'Runs the installed Snyk CLI against workspace dependencies.',
    tools: ['darask_snyk'],
    secrets: ['DARASK_SNYK_TOKEN'],
  },
  {
    id: 'jackal', group: 'safety', origin: 'jackal-verified',
    titleJa: 'Jackal Verified', titleEn: 'Jackal Verified',
    summaryJa: '主張をファイル・再現手順・反証の観点で検証メモにします。',
    summaryEn: 'Turns a claim into a structured verification note with evidence and gaps.',
    tools: ['darask_jackal'],
  },
  {
    id: 'kanban', group: 'ops', origin: 'NousResearch/hermes-agent kanban',
    titleJa: 'Kanban', titleEn: 'Kanban',
    summaryJa: 'マルチエージェント作業を看板の列で管理します。',
    summaryEn: 'Tracks multi-agent work on a kanban board.',
    tools: ['darask_kanban'],
  },
  {
    id: 'langfuse', group: 'ops', origin: 'NousResearch/hermes-agent observability/langfuse',
    titleJa: 'Langfuse', titleEn: 'Langfuse',
    summaryJa: 'ターンとツール呼び出しを Langfuse に送り、トークン浪費を見やすくします。',
    summaryEn: 'Sends turns and tool calls to Langfuse for token and latency visibility.',
    tools: ['darask_langfuse'],
    secrets: ['DARASK_LANGFUSE_PUBLIC_KEY', 'DARASK_LANGFUSE_SECRET_KEY'],
    fields: ['langfuseHost'],
  },
  {
    id: 'achievements', group: 'ops', origin: 'NousResearch/hermes-agent hermes-achievements',
    titleJa: 'Achievements', titleEn: 'Achievements',
    summaryJa: '実セッションから Steam 風のバッジを集めます。',
    summaryEn: 'Earns Steam-like badges from real session activity.',
    tools: ['darask_achievements'],
  },
  {
    id: 'chrome-profiles', group: 'ops', origin: 'hermes-plugin-chrome-profiles',
    titleJa: 'Chrome Profiles', titleEn: 'Chrome Profiles',
    summaryJa: '本機の Chrome / Edge プロファイルを一覧し、使うプロファイルを記録します。',
    summaryEn: 'Lists local Chrome / Edge profiles and records which one to use.',
    tools: ['darask_chrome_profiles'],
    fields: ['chromeProfile'],
  },
  {
    id: 'image-gen', group: 'media', origin: 'NousResearch/hermes-agent image_gen/xai',
    titleJa: 'Image Gen (xAI)', titleEn: 'Image Gen (xAI)',
    summaryJa: 'xAI / Grok Imagine の画像生成と動画（静止画からの image-to-video 含む）です。',
    summaryEn: 'Calls xAI / Grok Imagine for stills and video, including image-to-video.',
    tools: ['darask_image_gen', 'darask_imagine_video'],
    secrets: ['DARASK_XAI_API_KEY'],
    fields: ['imageModel'],
  },
  {
    id: 'r2-storage', group: 'media', origin: 'Cloudflare R2 S3 API',
    titleJa: 'Cloudflare R2', titleEn: 'Cloudflare R2',
    summaryJa: '生成した画像・動画を R2 に上げ、どの環境からも同じキーで取得・編集します。',
    summaryEn: 'Uploads generated stills and video to R2 so any environment can fetch and edit the same objects.',
    tools: ['darask_r2'],
    secrets: ['DARASK_R2_ACCESS_KEY_ID', 'DARASK_R2_SECRET_ACCESS_KEY'],
    fields: ['r2AccountId', 'r2Bucket', 'r2PublicBase'],
  },
  {
    id: 'spotify', group: 'media', origin: 'NousResearch/hermes-agent spotify',
    titleJa: 'Spotify', titleEn: 'Spotify',
    summaryJa: '再生・一時停止・検索・キューなど Spotify Web API の 7 操作です。',
    summaryEn: 'Play, pause, search, queue and related Spotify Web API actions.',
    tools: ['darask_spotify'],
    secrets: ['DARASK_SPOTIFY_CLIENT_ID', 'DARASK_SPOTIFY_CLIENT_SECRET', 'DARASK_SPOTIFY_REFRESH_TOKEN'],
  },
  {
    id: 'touchdesigner', group: 'media', origin: 'touchdesigner catalog plugin',
    titleJa: 'TouchDesigner', titleEn: 'TouchDesigner',
    summaryJa: 'TouchDesigner 用の Python / OSC ひな型を書き出します。',
    summaryEn: 'Writes TouchDesigner Python / OSC starter scripts.',
    tools: ['darask_touchdesigner'],
  },
  {
    id: 'telegram', group: 'chat', origin: 'hermes-telegram-business',
    titleJa: 'Telegram', titleEn: 'Telegram',
    summaryJa: 'Telegram Bot API でメッセージを送受信します。',
    summaryEn: 'Sends and reads messages through the Telegram Bot API.',
    tools: ['darask_telegram'],
    secrets: ['DARASK_TELEGRAM_BOT_TOKEN'],
    fields: ['telegramChatId'],
  },
  {
    id: 'imessage', group: 'chat', origin: 'hermes-rustpush-imessage',
    titleJa: 'iMessage', titleEn: 'iMessage',
    summaryJa: 'rustpush 連携です。Windows では未対応と明示します。',
    summaryEn: 'rustpush iMessage bridge. Reports unsupported on Windows.',
    tools: ['darask_imessage'],
  },
]);

export const PLUGIN_IDS = Object.freeze(PLUGIN_CATALOG.map(plugin => plugin.id));

export function pluginById(id) {
  return PLUGIN_CATALOG.find(plugin => plugin.id === id);
}
