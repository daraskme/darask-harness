import { defineTool } from '@deepseek-ai/dsh-tools';
import { mkdir, writeFile, unlink, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve, win32 } from 'node:path';
import { PLUGIN_CATALOG } from './catalog.mjs';
import { newId } from './state.mjs';
import { generateXaiImage, generateXaiVideo, spotifyAction, telegramAction, langfuseIngest, runSnyk, listBrowserProfiles, modlens, writeTouchDesigner } from './integrations.mjs';
import { r2Action } from './r2.mjs';

const BADGES = [
  { id: 'first-call', title: 'First Contact', test: stats => stats.tools >= 1 },
  { id: 'busy-hands', title: 'Busy Hands', test: stats => stats.tools >= 25 },
  { id: 'cleanup-hero', title: 'Cleanup Hero', test: stats => stats.cleanups >= 1 },
  { id: 'security-catch', title: 'Security Catch', test: stats => stats.warnings >= 1 },
  { id: 'compact-master', title: 'Compact Master', test: stats => stats.compact >= 1 },
  { id: 'imagineer', title: 'Imagineer', test: stats => stats.images >= 1 },
];

export function createAddonTools(api) {
  const enabled = id => api.store.enabled(id);
  const text = value => ({ text: String(value ?? '') });
  const tool = (plugin, name, description, parameters, run, extra = {}) => defineTool({
    name, description, parameters, ...extra,
    output: { schema: { type: 'object', additionalProperties: false, properties: { text: { type: 'string', required: true } } }, render: (_args, value) => [{ type: 'text', text: value.text }] },
    async execute(args, exec) {
      if (!enabled(plugin)) return text(`Plugin ${plugin} is disabled in Settings → Plugins.`);
      return text(await run(args, exec));
    },
  });

  return [
    tool('deepseek-harness', 'darask_plan', 'Cascading plan tools forked from oh-my-deepseek-harness (I-06).', {
      action: { type: 'string', enum: ['create', 'update_step', 'cascade', 'status'], required: true },
      id: { type: 'string' }, title: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } },
      step: { type: 'integer' }, status: { type: 'string', enum: ['pending', 'doing', 'done', 'blocked'] }, note: { type: 'string' },
    }, async args => plan(api, args)),
    tool('deepseek-harness', 'darask_memory', 'Tagged memory store forked from oh-my-deepseek-harness (I-12). Includes memory_store.', {
      action: { type: 'string', enum: ['tag', 'store', 'query', 'filter'], required: true },
      text: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, query: { type: 'string' },
    }, async args => memory(api, args)),
    tool('deepseek-harness', 'darask_checkpoint', 'Checkpoint snapshot review forked from oh-my-deepseek-harness (I-11).', {
      action: { type: 'string', enum: ['create', 'review'], required: true }, label: { type: 'string' }, note: { type: 'string' },
    }, async args => checkpoint(api, args)),
    tool('disk-cleanup', 'darask_disk_cleanup', 'Track and clean ephemeral test/temp files (Hermes disk-cleanup fork). Categories: temp, test, research, download, chrome-profile, cron-output, other.', {
      action: { type: 'string', enum: ['status', 'dry-run', 'quick', 'deep', 'track', 'forget'], required: true },
      path: { type: 'string' }, category: { type: 'string' },
    }, async args => cleanup(api, args)),
    tool('kanban', 'darask_kanban', 'Kanban board for multi-agent work (Hermes kanban fork). Columns: backlog, doing, review, done.', {
      action: { type: 'string', enum: ['list', 'create', 'move', 'comment'], required: true },
      title: { type: 'string' }, id: { type: 'string' }, column: { type: 'string' }, comment: { type: 'string' }, agent: { type: 'string' },
    }, async args => kanban(api, args)),
    tool('langfuse', 'darask_langfuse', 'Flush queued Langfuse traces (Hermes observability/langfuse fork).', {
      action: { type: 'string', enum: ['status', 'flush'], required: true },
    }, async args => langfuse(api, args)),
    tool('image-gen', 'darask_image_gen', 'Generate an image with the xAI / Grok image backend (Hermes image_gen/xai fork).', {
      prompt: { type: 'string', required: true }, model: { type: 'string' },
    }, async (args, exec) => {
      const result = await generateXaiImage({ credentials: api.credentials, prompt: args.prompt, model: args.model || api.store.get().imageModel, directory: api.directory, store: api.store, signal: exec.signal });
      if (result.startsWith('画像を保存しました:') || result.startsWith('画像 URL:')) await bump(api, 'images');
      return result;
    }),
    tool('image-gen', 'darask_imagine_video', 'Grok Imagine でテキストや画像から動画を生成し、完了まで待ちます。中断後は requestId だけを指定すると、追加の生成を開始せず同じ動画を再確認します。', {
      requestId: { type: 'string', description: '既存の生成を再確認する受付 ID。他の生成パラメーターと同時に指定しないでください。' },
      prompt: { type: 'string' },
      imagePath: { type: 'string', description: 'Absolute JPEG/PNG/WebP path (GPT Image original or other still).' },
      imageUrl: { type: 'string', description: 'https image URL or data:image URI.' },
      duration: { type: 'integer', description: 'Clip length in seconds, 1–15. Default 8 on the service.' },
      resolution: { type: 'string', enum: ['480p', '720p', '1080p'] },
      aspectRatio: { type: 'string', enum: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'] },
      model: { type: 'string' },
    }, async (args, exec) => {
      const result = await generateXaiVideo({
        credentials: api.credentials,
        requestId: args.requestId,
        prompt: args.prompt,
        imagePath: args.imagePath,
        imageUrl: args.imageUrl,
        duration: args.duration,
        resolution: args.resolution,
        aspectRatio: args.aspectRatio,
        model: args.model,
        directory: api.directory,
        store: api.store,
        signal: exec.signal,
      });
      if (result.startsWith('動画を保存しました:') || result.startsWith('動画 URL:')) await bump(api, 'images');
      return result;
    }, { timeoutMs: 600000 }),
    tool('r2-storage', 'darask_r2', 'Cloudflare R2 media store. status/list/put/get under darask/media/. Generated stills and video upload automatically when R2 is configured.', {
      action: { type: 'string', enum: ['status', 'list', 'put', 'get'], required: true },
      path: { type: 'string', description: 'Local file for put (JPEG/PNG/WebP/GIF/MP4/WebM).' },
      key: { type: 'string', description: 'Object key under darask/media/ for get.' },
    }, async (args, exec) => r2Action({
      credentials: api.credentials, store: api.store, directory: api.directory,
      action: args.action, path: args.path, key: args.key, signal: exec.signal,
    })),
    tool('spotify', 'darask_spotify', 'Spotify playback, search, and queue (Hermes spotify fork).', {
      action: { type: 'string', enum: ['status', 'search', 'play', 'pause', 'next', 'previous', 'queue'], required: true },
      query: { type: 'string' },
    }, async (args, exec) => spotifyAction({ credentials: api.credentials, action: args.action, query: args.query, signal: exec.signal })),
    tool('achievements', 'darask_achievements', 'List Steam-style badges earned from this DARASK session history (Hermes achievements fork).', {
      action: { type: 'string', enum: ['list', 'status'], required: true },
    }, async () => formatAchievements(api.state.get().achievements)),
    tool('snapcompact', 'darask_snapcompact', 'Spill large tool results or compact conversation history (hermes-snapcompact fork).', {
      action: { type: 'string', enum: ['status', 'spill', 'compact'], required: true }, text: { type: 'string' }, label: { type: 'string' },
    }, async (args, exec) => snapcompact(api, args, exec)),
    tool('chrome-profiles', 'darask_chrome_profiles', 'List and select local Chrome / Edge profiles (hermes-plugin-chrome-profiles fork).', {
      action: { type: 'string', enum: ['list', 'use', 'status'], required: true }, path: { type: 'string' },
    }, async args => chromeProfiles(api, args)),
    tool('telegram', 'darask_telegram', 'Send or read Telegram Bot API messages (hermes-telegram-business fork).', {
      action: { type: 'string', enum: ['send', 'inbox'], required: true }, text: { type: 'string' }, chatId: { type: 'string' },
    }, async (args, exec) => telegramAction({ credentials: api.credentials, action: args.action, text: args.text, chatId: args.chatId || api.store.get().telegramChatId, signal: exec.signal })),
    tool('imessage', 'darask_imessage', 'iMessage via rustpush. Reports unsupported on Windows.', {
      action: { type: 'string', enum: ['status', 'send'], required: true }, text: { type: 'string' }, to: { type: 'string' },
    }, async args => process.platform === 'win32'
      ? 'iMessage (hermes-rustpush-imessage fork) is not available on Windows. Use Telegram or the host Mac.'
      : `iMessage ${args.action} is not wired on this host. Install rustpush separately.`),
    tool('snyk', 'darask_snyk', 'Run Snyk test on the current workspace if the CLI is installed.', {
      action: { type: 'string', enum: ['status', 'test'], required: true },
    }, async (args, exec) => {
      if (args.action === 'status') return 'Snyk plugin enabled. action=test runs `snyk test --json` in the workspace.';
      return runSnyk({ cwd: exec.agent?.session?.header?.cwd || process.cwd(), credentials: api.credentials, signal: exec.signal });
    }),
    tool('jackal', 'darask_jackal', 'Structured verification notes (jackal-verified fork). Does not invent evidence.', {
      action: { type: 'string', enum: ['verify'], required: true }, claim: { type: 'string', required: true }, evidence: { type: 'array', items: { type: 'string' } },
    }, async args => jackal(args)),
    tool('touchdesigner', 'darask_touchdesigner', 'Write TouchDesigner Python DAT or OSC starter scripts.', {
      action: { type: 'string', enum: ['script', 'osc', 'status'], required: true }, path: { type: 'string' }, name: { type: 'string' },
    }, async args => {
      if (args.action === 'status') return 'TouchDesigner plugin writes local starter scripts. It does not launch TouchDesigner.';
      if (!args.path || !(isAbsolute(args.path) || win32.isAbsolute(args.path))) return 'Use an absolute path.';
      return writeTouchDesigner({ path: args.path, kind: args.action === 'osc' ? 'osc' : 'script', name: args.name });
    }),
    tool('modlens', 'darask_modlens', 'OCR / UI-text bridge for screenshots and images (ModLens fork) so text-only DeepSeek can read them.', {
      action: { type: 'string', enum: ['ocr', 'ui', 'describe'], required: true }, path: { type: 'string', required: true },
    }, async (args, exec) => {
      if (!(isAbsolute(args.path) || win32.isAbsolute(args.path))) return 'Use an absolute image path.';
      return modlens({ path: args.path, action: args.action, signal: exec.signal });
    }),
  ];
}

export function addonPrompt(store, observation) {
  const enabled = PLUGIN_CATALOG.filter(plugin => store.enabled(plugin.id));
  const tools = enabled.flatMap(plugin => plugin.tools);
  const lines = [
    'DARASK forked Hermes plugins are enabled. Use them instead of re-implementing the same workflow with pwsh.',
    `Enabled: ${enabled.map(plugin => plugin.id).join(', ') || '(none)'}.`,
    tools.length ? `Plugin tools: ${tools.join(', ')}.` : 'No extra plugin tools are registered.',
  ];
  if (observation?.intent) lines.push(`Current intent guess: ${observation.intent.id} (reasoning_effort=${observation.intent.effort}).`);
  if (observation?.constraints?.length) lines.push(`Hard constraints to keep: ${observation.constraints.join(' | ')}`);
  return lines.join('\n');
}

async function plan(api, args) {
  if (args.action === 'create') {
    const id = newId('plan');
    const steps = (args.steps ?? []).map((title, index) => ({ index, title, status: 'pending', note: '' }));
    await api.state.update(state => { state.plans[id] = { id, title: args.title || 'plan', steps, updatedAt: new Date().toISOString() }; return state; });
    return `Created ${id} with ${steps.length} step(s).`;
  }
  const current = api.state.get().plans[args.id];
  if (!current) return 'Unknown plan id. Call action=create first.';
  if (args.action === 'status') return formatPlan(current);
  if (args.action === 'update_step') {
    const step = current.steps[args.step];
    if (!step) return 'Unknown step index.';
    if (args.status) step.status = args.status;
    if (args.note) step.note = args.note;
    step.title = args.title || step.title;
    await api.state.update(state => { state.plans[args.id] = { ...current, updatedAt: new Date().toISOString() }; return state; });
    return formatPlan(current);
  }
  const blocked = current.steps.filter(step => step.status !== 'done');
  const cascade = blocked.slice(1).map(step => `${step.index}:${step.title} may need re-planning because earlier steps changed`);
  return [`Cascade for ${args.id}:`, ...cascade, cascade.length ? '' : 'No downstream steps to revisit.'].join('\n');
}

function formatPlan(plan) {
  return [`${plan.id} ${plan.title}`, ...plan.steps.map(step => `- [${step.status}] ${step.index}. ${step.title}${step.note ? ` — ${step.note}` : ''}`)].join('\n');
}

async function memory(api, args) {
  if (args.action === 'store' || args.action === 'tag') {
    const id = newId('mem');
    const item = { id, text: args.text || '', tags: args.tags ?? [], at: new Date().toISOString() };
    await api.state.update(state => { state.memories.push(item); state.memories = state.memories.slice(-200); return state; });
    return `Stored ${id} tags=${item.tags.join(',') || '(none)'}`;
  }
  const items = api.state.get().memories;
  const query = (args.query || args.text || '').toLowerCase();
  const tags = new Set(args.tags ?? []);
  const matched = items.filter(item => {
    const textHit = !query || item.text.toLowerCase().includes(query) || item.tags.some(tag => tag.toLowerCase().includes(query));
    const tagHit = tags.size === 0 || item.tags.some(tag => tags.has(tag));
    return textHit && tagHit;
  });
  return matched.length ? matched.map(item => `${item.id} [${item.tags.join(' ')}] ${item.text}`).join('\n') : 'No memories matched.';
}

async function checkpoint(api, args) {
  if (args.action === 'create') {
    const id = newId('ckpt');
    const snapshot = { id, label: args.label || id, note: args.note || '', at: new Date().toISOString(), plans: Object.keys(api.state.get().plans).length, memories: api.state.get().memories.length };
    await api.state.update(state => { state.checkpoints.push(snapshot); state.checkpoints = state.checkpoints.slice(-50); return state; });
    return `Checkpoint ${id} saved (${snapshot.plans} plans, ${snapshot.memories} memories).`;
  }
  const list = api.state.get().checkpoints;
  if (list.length < 2) return list.length ? `Only one checkpoint (${list[0].id}). Create another to review a diff.` : 'No checkpoints yet.';
  const [previous, latest] = list.slice(-2);
  return `Review ${previous.id} → ${latest.id}: plans ${previous.plans}→${latest.plans}, memories ${previous.memories}→${latest.memories}. ${latest.note || ''}`.trim();
}

export function guessCleanupCategory(path) {
  const lower = String(path).toLowerCase();
  if (/chrome|edge[\\/]user data/i.test(lower) && /cache|code cache|gpuCache/i.test(lower)) return 'chrome-profile';
  if (/test[_-].*\.(py|js|mjs|cjs|ts|jsx)$/i.test(lower) || /[\\/]__pycache__[\\/]/i.test(lower)) return 'test';
  if (/[\\/]tmp[\\/]|[\\/]temp[\\/]|\.tmp$/i.test(lower)) return 'temp';
  if (/\.(log|out)$/i.test(lower)) return 'cron-output';
  if (/download/i.test(lower)) return 'download';
  return null;
}

export function isSafeCleanupPath(path, directory) {
  const target = resolve(path);
  const roots = [resolve(tmpdir()), resolve(directory), resolve(join(directory, 'addons-output')), resolve(join(directory, 'addons-spill'))];
  return roots.some(root => target === root || target.startsWith(root.endsWith('\\') || root.endsWith('/') ? root : `${root}\\`) || target.startsWith(`${root}/`));
}

async function cleanup(api, args) {
  if (args.action === 'track') {
    if (!args.path || !isSafeCleanupPath(args.path, api.directory)) return 'Not tracked: path must be under the temp directory or DARASK data directory.';
    const category = args.category || guessCleanupCategory(args.path) || 'other';
    await api.state.update(state => {
      if (!state.cleanup.tracked.some(item => item.path === args.path)) state.cleanup.tracked.push({ path: args.path, category, at: new Date().toISOString() });
      return state;
    });
    return `Tracked ${args.path} as ${category}.`;
  }
  if (args.action === 'forget') {
    await api.state.update(state => { state.cleanup.tracked = state.cleanup.tracked.filter(item => item.path !== args.path); return state; });
    return `Forgot ${args.path}.`;
  }
  const tracked = api.state.get().cleanup.tracked;
  if (args.action === 'status') {
    return tracked.length ? tracked.map(item => `[${item.category}] ${item.path}`).join('\n') : 'Nothing tracked.';
  }
  const preview = [];
  for (const item of tracked) {
    if (!isSafeCleanupPath(item.path, api.directory)) continue;
    try { const info = await stat(item.path); preview.push({ ...item, size: info.size }); } catch { /* missing */ }
  }
  if (args.action === 'dry-run' || args.action === 'deep') return preview.length ? preview.map(item => `[${item.category}] ${item.path} (${item.size} bytes)`).join('\n') : 'Nothing to delete.';
  let deleted = 0; let freed = 0;
  for (const item of preview) {
    try { await unlink(item.path); deleted += 1; freed += item.size; } catch { /* ignore */ }
  }
  await api.state.update(state => {
    const remaining = new Set(preview.map(item => item.path));
    state.cleanup.tracked = state.cleanup.tracked.filter(item => !remaining.has(item.path));
    return state;
  });
  if (deleted) await bump(api, 'cleanups');
  return `Deleted ${deleted} file(s), freed ${freed} bytes.`;
}

async function kanban(api, args) {
  const board = api.state.get().kanban;
  if (args.action === 'list') return formatBoard(board);
  if (args.action === 'create') {
    const id = newId('card');
    const card = { id, title: args.title || 'task', column: args.column || 'backlog', agent: args.agent || '', comments: [] };
    await api.state.update(state => { state.kanban.cards.push(card); return state; });
    return `Created ${id} in ${card.column}.`;
  }
  const card = board.cards.find(item => item.id === args.id);
  if (!card) return 'Unknown card id.';
  if (args.action === 'move') {
    if (args.column && !board.columns.includes(args.column)) return `Unknown column. Use ${board.columns.join(', ')}.`;
    card.column = args.column || card.column;
    card.agent = args.agent ?? card.agent;
    await api.state.update(state => { state.kanban.cards = board.cards.map(item => item.id === card.id ? card : item); return state; });
    return formatBoard(api.state.get().kanban);
  }
  card.comments.push(args.comment || '');
  await api.state.update(state => { state.kanban.cards = board.cards.map(item => item.id === card.id ? card : item); return state; });
  return formatBoard(api.state.get().kanban);
}

function formatBoard(board) {
  return board.columns.map(column => {
    const cards = board.cards.filter(card => card.column === column);
    return `## ${column}\n${cards.length ? cards.map(card => `- ${card.id} ${card.title}${card.agent ? ` (@${card.agent})` : ''}`).join('\n') : '(empty)'}`;
  }).join('\n');
}

async function langfuse(api, args) {
  const queued = api.state.get().traces;
  if (args.action === 'status') return `${queued.length} trace(s) queued. Host=${api.store.get().langfuseHost}`;
  if (!queued.length) return 'No traces queued.';
  const result = await langfuseIngest({ credentials: api.credentials, host: api.store.get().langfuseHost, events: queued.slice(0, 50) });
  await api.state.update(state => { state.traces = state.traces.slice(50); return state; });
  return result;
}

async function snapcompact(api, args, exec) {
  if (args.action === 'status') return `${api.state.get().compact.spills.length} spilled result(s). Use action=compact to call DSH /compact when available.`;
  if (args.action === 'spill') {
    const folder = join(api.directory, 'addons-spill');
    await mkdir(folder, { recursive: true });
    const file = join(folder, `${newId('spill')}.txt`);
    await writeFile(file, args.text || '');
    await api.state.update(state => { state.compact.spills.push({ file, label: args.label || '', at: new Date().toISOString() }); return state; });
    await bump(api, 'compact');
    return `Spilled to ${file}`;
  }
  const compaction = api.compaction;
  if (!compaction?.compactNow || !exec.agent) return 'Compaction service is not mounted. Use DSH /compact, or action=spill to park large text.';
  try {
    const result = await compaction.compactNow(exec.agent, exec.signal);
    await bump(api, 'compact');
    return result ? `Compacted ${result.shadowedSeqs?.length ?? 0} history items.` : 'No compactable history yet.';
  } catch (error) {
    return `Compact failed: ${error.message}`;
  }
}

async function chromeProfiles(api, args) {
  const profiles = await listBrowserProfiles();
  if (args.action === 'list') return profiles.length ? profiles.map(item => `${item.browser} ${item.name} — ${item.path}`).join('\n') : 'No Chrome/Edge profiles found.';
  if (args.action === 'use') {
    if (!args.path) return 'Pass path from action=list.';
    await api.store.save({ chromeProfile: args.path });
    return `Using Chrome profile ${args.path}`;
  }
  return api.store.get().chromeProfile ? `Selected profile: ${api.store.get().chromeProfile}` : 'No profile selected.';
}

function jackal(args) {
  const evidence = args.evidence ?? [];
  const gaps = [];
  if (!evidence.length) gaps.push('No evidence paths were supplied.');
  if (/always|definitely|保証/i.test(args.claim)) gaps.push('Absolute wording needs a cited source.');
  const verdict = gaps.length ? 'unverified' : 'supported-with-evidence';
  return [`claim: ${args.claim}`, `verdict: ${verdict}`, `evidence: ${evidence.join(', ') || '(none)'}`, gaps.length ? `gaps:\n- ${gaps.join('\n- ')}` : 'gaps: none'].join('\n');
}

export async function bump(api, stat) {
  await api.state.update(state => {
    state.achievements.stats[stat] = (state.achievements.stats[stat] ?? 0) + 1;
    for (const badge of BADGES) {
      if (!state.achievements.earned[badge.id] && badge.test(state.achievements.stats)) {
        state.achievements.earned[badge.id] = { title: badge.title, at: new Date().toISOString() };
      }
    }
    return state;
  });
}

export function formatAchievements(achievements) {
  const earned = Object.entries(achievements.earned ?? {});
  const locked = BADGES.filter(badge => !achievements.earned?.[badge.id]);
  return [
    'Earned:',
    earned.length ? earned.map(([id, value]) => `- ${value.title} (${id})`).join('\n') : '- none yet',
    'Locked:',
    ...locked.map(badge => `- ${badge.title} (${badge.id})`),
    `Stats: tools=${achievements.stats?.tools ?? 0} cleanups=${achievements.stats?.cleanups ?? 0} warnings=${achievements.stats?.warnings ?? 0}`,
  ].join('\n');
}

export { BADGES };
