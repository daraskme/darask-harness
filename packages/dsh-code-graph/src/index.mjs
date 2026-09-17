// @darask/dsh-code-graph — repository symbol graph for DeepSeek Harness, a
// JavaScript port of grok-build's xai-codebase-graph. tree-sitter (WASM)
// grammars and their standard `tags.scm` queries turn every indexable source
// file into definitions and references; a per-workspace inverted index then
// answers go-to-definition / find-references / outline / symbol search without
// a language server. Files are read through the upstream `ctx.fs` service so
// sandboxed and remote workspaces work unchanged, and agent writes observed on
// `fs/write-intent` / `fs/edit-intent` + `tools/result` are re-indexed
// incrementally. No upstream tool (grep, LSP, fs) is replaced.

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { defineTool } from '@deepseek-ai/dsh-tools';

import { SymbolExtractor } from './extract.mjs';
import { CodeIndex } from './index-store.mjs';
import { LANGUAGES, REFERENCE_KINDS, SYMBOL_KINDS, languageForPath } from './languages.mjs';
import { DEFAULT_IGNORED_DIRS, listIndexableFiles, toPosix } from './walk.mjs';

export * from './extract.mjs';
export * from './index-store.mjs';
export * from './languages.mjs';
export * from './walk.mjs';

export const name = 'darask-code-graph';
export const inject = ['tools', 'commands', 'fs'];

export const Config = z.object({
  dshHome: z.string(),
  persist: z.boolean().default(true),
  grammarsDir: z.string().default(''),
  maxFileBytes: z.number().default(5 * 1024 * 1024),
  maxFiles: z.number().default(20_000),
  staleAfterMs: z.number().default(30_000),
  ignoredDirs: z.array(z.string()).default([...DEFAULT_IGNORED_DIRS]),
  useGit: z.boolean().default(true),
  gitTimeoutMs: z.number().default(30_000),
});

export function workspaceFileName(cwd) {
  return `${createHash('sha1').update(toPosix(cwd).toLowerCase()).digest('hex').slice(0, 24)}.json`;
}

export function contentHash(text) {
  return createHash('sha1').update(text).digest('hex');
}

export function formatLocation(item) {
  const container = item.container ? ` (in ${item.container})` : '';
  return `${item.path}:${item.line}:${item.column + 1}  ${item.kind} ${item.name}${container}`;
}

export function renderStatus(status) {
  const lines = [
    `Workspace: ${status.cwd}`,
    `Indexed: ${status.files} files, ${status.definitions} definitions (${status.symbols} names), ${status.references} references; ${status.skipped} skipped`,
    `Languages: ${Object.entries(status.languages).map(([id, count]) => `${id}=${count}`).join(', ') || '(none)'}; grammars available: ${status.availableLanguages.join(', ') || '(none — run npm run build)'}`,
    `Files listed via ${status.source}; last full scan ${status.lastScanAt ? new Date(status.lastScanAt).toISOString() : 'never'}`,
  ];
  if (status.truncated) lines.push(`Warning: workspace exceeds maxFiles; ${status.truncated} candidate files were not indexed`);
  return lines.join('\n');
}

export function apply(ctx, config) {
  const resolved = { ...config, dshHome: resolveDshHome(config.dshHome) };
  const stateDir = join(resolved.dshHome, 'darask', 'code-graph');
  const extractor = new SymbolExtractor(resolved.grammarsDir === '' ? undefined : resolved.grammarsDir);
  const workspaces = new Map();
  const pendingWrites = new Map();
  const inflight = new Set();

  const track = promise => {
    inflight.add(promise);
    const retire = () => inflight.delete(promise);
    promise.then(retire, retire);
    return promise;
  };

  // ---- per-workspace state -------------------------------------------------

  function workspaceFor(cwd) {
    let ws = workspaces.get(cwd);
    if (ws) return ws;
    ws = {
      cwd,
      index: undefined,
      versions: new Map(),
      dirty: false,
      skipped: 0,
      truncated: 0,
      source: 'none',
      lastScanAt: 0,
      queue: Promise.resolve(),
      stateFile: join(stateDir, workspaceFileName(cwd)),
    };
    ws.loaded = (async () => {
      if (resolved.persist) {
        try {
          const snapshot = JSON.parse(await readFile(ws.stateFile, 'utf8'));
          ws.index = CodeIndex.fromSnapshot(snapshot);
          for (const [path, record] of Object.entries(snapshot.files ?? {})) if (record.version !== undefined) ws.versions.set(path, record.version);
          return;
        } catch (error) {
          if (error?.code !== 'ENOENT') ctx.logger.warn('code graph: discarding unreadable index %s: %o', ws.stateFile, error);
        }
      }
      ws.index = new CodeIndex();
    })();
    workspaces.set(cwd, ws);
    return ws;
  }

  async function persist(ws) {
    if (!resolved.persist || !ws.dirty) return;
    await mkdir(stateDir, { recursive: true });
    const tmp = `${ws.stateFile}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(ws.index.snapshot()), 'utf8');
    await rename(tmp, ws.stateFile);
    ws.dirty = false;
  }

  function enqueue(ws, job) {
    const next = ws.queue.then(() => ws.loaded).then(job);
    ws.queue = next.catch(error => { ctx.logger.warn('code graph: %o', error); });
    return track(next);
  }

  // ---- indexing ------------------------------------------------------------

  function removeFile(ws, path) {
    ws.versions.delete(path);
    const removed = ws.index.removeFile(path);
    if (removed) ws.dirty = true;
    return removed;
  }

  async function readSource(target) {
    let info;
    try {
      info = await ctx.fs.stat(target);
    } catch (error) {
      if (error?.code === 'FS_NOT_FOUND') return { status: 'missing' };
      throw error;
    }
    if (info === undefined) return { status: 'missing' };
    if (info.type !== 'file') return { status: 'skip', version: info.version };
    if (info.size !== undefined && info.size > resolved.maxFileBytes) return { status: 'skip', version: info.version };
    try {
      return { status: 'text', text: await ctx.fs.readText(target), version: info.version };
    } catch (error) {
      switch (error?.code) {
        case 'FS_NOT_FOUND': return { status: 'missing' };
        case 'FS_NOT_TEXT':
        case 'FS_TOO_LARGE':
        case 'FS_NOT_REGULAR_FILE':
          return { status: 'skip', version: info.version };
        default: throw error;
      }
    }
  }

  /** Re-reads one file and updates the index; returns 'indexed' | 'unchanged' | 'removed' | 'skipped'. */
  async function indexFile(ws, path, language, { force = false } = {}) {
    const target = await ctx.fs.resolve(path, { cwd: ws.cwd });
    const known = ws.versions.get(path);
    if (!force && known !== undefined && ws.index.has(path)) {
      const info = await ctx.fs.stat(target).catch(() => undefined);
      if (info?.version !== undefined && info.version === known) return 'unchanged';
    }
    const source = await readSource(target);
    if (source.status === 'missing') {
      return removeFile(ws, path) ? 'removed' : 'unchanged';
    }
    if (source.status === 'skip') {
      removeFile(ws, path);
      return 'skipped';
    }
    const hash = contentHash(source.text);
    const existing = ws.index.get(path);
    if (existing && existing.hash === hash) {
      ws.versions.set(path, source.version);
      if (existing.version !== source.version) ws.dirty = true;
      existing.version = source.version;
      return 'unchanged';
    }
    const extracted = await extractor.extract(language, source.text);
    if (!extracted) {
      removeFile(ws, path);
      return 'skipped';
    }
    ws.index.setFile(path, { language, hash, size: Buffer.byteLength(source.text, 'utf8'), version: source.version, indexedAt: Date.now(), ...extracted });
    ws.dirty = true;
    ws.versions.set(path, source.version);
    return 'indexed';
  }

  async function scan(ws, { force = false } = {}) {
    const root = ctx.fs.processPath(await ctx.fs.resolve('.', { cwd: ws.cwd }));
    const { files, source } = await listIndexableFiles(root, { ignoredDirs: resolved.ignoredDirs, gitTimeoutMs: resolved.gitTimeoutMs, useGit: resolved.useGit });
    ws.source = source;
    ws.truncated = Math.max(0, files.length - resolved.maxFiles);
    const wanted = files.slice(0, resolved.maxFiles);
    const seen = new Set(wanted.map(file => file.path));
    for (const path of ws.index.paths()) if (!seen.has(path)) removeFile(ws, path);
    const counts = { indexed: 0, unchanged: 0, removed: 0, skipped: 0 };
    for (const file of wanted) {
      try {
        counts[await indexFile(ws, file.path, file.language, { force })] += 1;
      } catch (error) {
        counts.skipped += 1;
        ctx.logger.debug('code graph: skipping %s: %o', file.path, error);
      }
    }
    ws.skipped = counts.skipped;
    ws.lastScanAt = Date.now();
    await persist(ws);
    return counts;
  }

  async function ready(session, { refresh = false } = {}) {
    const ws = workspaceFor(session.header.cwd);
    await enqueue(ws, async () => {
      if (refresh || ws.lastScanAt === 0 || Date.now() - ws.lastScanAt > resolved.staleAfterMs) await scan(ws);
      else await persist(ws);
    });
    return ws;
  }

  async function status(ws) {
    const stats = ws.index.stats();
    return { cwd: ws.cwd, ...stats, skipped: ws.skipped, truncated: ws.truncated, source: ws.source, lastScanAt: ws.lastScanAt, availableLanguages: await extractor.available() };
  }

  async function relativePath(ws, path) {
    const root = ctx.fs.processPath(await ctx.fs.resolve('.', { cwd: ws.cwd }));
    const absolute = ctx.fs.processPath(await ctx.fs.resolve(path, { cwd: ws.cwd }));
    const rootPosix = toPosix(root).replace(/\/+$/u, '');
    const absPosix = toPosix(absolute);
    if (absPosix.toLowerCase().startsWith(`${rootPosix.toLowerCase()}/`)) return absPosix.slice(rootPosix.length + 1);
    return absPosix;
  }

  // ---- hooks: keep the index current with agent edits ----------------------

  const intentListener = (target, actor, next) => {
    const session = actor?.agent?.session;
    if (session && typeof actor.callId === 'string') {
      const cwd = session.header.cwd;
      if (workspaces.has(cwd)) {
        let bucket = pendingWrites.get(actor.callId);
        if (!bucket) { bucket = { cwd, paths: new Set() }; pendingWrites.set(actor.callId, bucket); }
        bucket.paths.add(target.displayPath);
      }
    }
    return next();
  };
  ctx.on('fs/write-intent', intentListener, { prepend: true });
  ctx.on('fs/edit-intent', intentListener, { prepend: true });

  ctx.on('tools/result', exec => {
    const bucket = pendingWrites.get(exec.callId);
    if (!bucket) return;
    pendingWrites.delete(exec.callId);
    const ws = workspaceFor(bucket.cwd);
    enqueue(ws, async () => {
      for (const displayPath of bucket.paths) {
        const path = await relativePath(ws, displayPath);
        const language = languageForPath(path);
        if (!language) continue;
        await indexFile(ws, path, language, { force: true });
      }
      await persist(ws);
    });
  });

  // ---- tools ---------------------------------------------------------------

  const locationSchema = { type: 'object', additionalProperties: false, properties: { path: { type: 'string', required: true }, line: { type: 'number', required: true }, column: { type: 'number', required: true }, kind: { type: 'string', required: true }, name: { type: 'string', required: true }, container: { type: 'string' }, endLine: { type: 'number' } } };

  function renderList(items, empty) {
    return [{ type: 'text', text: items.length === 0 ? empty : items.map(formatLocation).join('\n') }];
  }

  function requireSession(exec, tool) {
    const session = exec.agent?.session;
    if (!session) throw new Error(`${tool} requires an agent session`);
    return session;
  }

  function checkLimit(value, fallback, max) {
    const limit = value === undefined ? fallback : Number(value);
    if (!Number.isInteger(limit) || limit < 1 || limit > max) throw new Error(`limit must be an integer between 1 and ${max}`);
    return limit;
  }

  ctx.tools.register(defineTool({
    name: 'code_definitions',
    description: [
      'Go to definition: where a symbol (function, method, class, interface, type, constant, module, macro) is defined anywhere in the workspace, resolved from a tree-sitter index rather than text search.',
      `Supported languages: ${Object.keys(LANGUAGES).join(', ')}. Pass the path of the file you are reading so definitions near it rank first. Use code_references for usages and code_symbols when you only know part of the name.`,
    ].join('\n'),
    parameters: {
      symbol: { type: 'string', required: true, description: 'Exact symbol name, e.g. "parseConfig" or "HttpClient".' },
      path: { type: 'string', description: 'File you are looking from; nearby definitions rank first.' },
      kind: { type: 'string', description: `Restrict to one kind: ${SYMBOL_KINDS.join(', ')}.` },
      limit: { type: 'number', description: 'Maximum results (default 20).' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { symbol: { type: 'string', required: true }, results: { type: 'array', required: true, items: locationSchema } } },
      render: (args, value) => renderList(value.results, `No definition of ${args.symbol} in the index.`),
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const ws = await ready(requireSession(exec, 'code_definitions'));
      const symbol = String(args.symbol).trim();
      if (symbol === '') throw new Error('symbol must not be empty');
      if (args.kind !== undefined && !SYMBOL_KINDS.includes(args.kind)) throw new Error(`kind must be one of ${SYMBOL_KINDS.join(', ')}`);
      const from = typeof args.path === 'string' && args.path !== '' ? await relativePath(ws, args.path) : undefined;
      return { symbol, results: ws.index.definitions(symbol, { kind: args.kind, from, limit: checkLimit(args.limit, 20, 200) }) };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'code_references',
    description: [
      'Find references: every call, instantiation, type use or trait implementation of a symbol across the workspace, from the tree-sitter index.',
      'Results are by name (not type-resolved), so same-named symbols from different scopes are all listed; check the definition with code_definitions when ambiguous.',
    ].join('\n'),
    parameters: {
      symbol: { type: 'string', required: true, description: 'Exact symbol name.' },
      path: { type: 'string', description: 'File you are looking from; nearby references rank first.' },
      include_definitions: { type: 'boolean', description: 'Also list where the symbol is defined (kind "definition.<kind>").' },
      limit: { type: 'number', description: 'Maximum results (default 50).' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { symbol: { type: 'string', required: true }, total: { type: 'number', required: true }, results: { type: 'array', required: true, items: locationSchema } } },
      render: (args, value) => {
        const lines = renderList(value.results, `No references to ${args.symbol} in the index.`);
        if (value.total > value.results.length) lines[0].text += `\n… ${value.total - value.results.length} more (raise limit)`;
        return lines;
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const ws = await ready(requireSession(exec, 'code_references'));
      const symbol = String(args.symbol).trim();
      if (symbol === '') throw new Error('symbol must not be empty');
      const from = typeof args.path === 'string' && args.path !== '' ? await relativePath(ws, args.path) : undefined;
      const { total, results } = ws.index.references(symbol, { from, includeDefinitions: args.include_definitions === true, limit: checkLimit(args.limit, 50, 500) });
      return { symbol, total, results };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'code_outline',
    description: 'Outline of one source file: its definitions (functions, methods, classes, types, …) with line ranges and enclosing container, so you can jump to the right part instead of reading the whole file.',
    parameters: {
      path: { type: 'string', required: true, description: 'File path (relative to the workspace or absolute).' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { path: { type: 'string', required: true }, language: { type: 'string', required: true }, definitions: { type: 'array', required: true, items: locationSchema } } },
      render: (_args, value) => renderList(value.definitions, `${value.path}: no definitions found.`),
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const ws = await ready(requireSession(exec, 'code_outline'));
      const path = await relativePath(ws, String(args.path));
      const language = languageForPath(path);
      if (!language) throw new Error(`${args.path}: unsupported language (indexed: ${Object.keys(LANGUAGES).join(', ')})`);
      await enqueue(ws, async () => {
        await indexFile(ws, path, language);
        await persist(ws);
      });
      const record = ws.index.get(path);
      if (!record) throw new Error(`${args.path}: not indexed (missing, binary, too large, or its grammar is unavailable)`);
      return { path, language, definitions: record.definitions.map(def => ({ path, ...def })) };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'code_symbols',
    description: 'Search definitions by partial, case-insensitive name across the workspace (exact and prefix matches first). Use when you know roughly what a thing is called; then code_definitions / code_references for the exact symbol.',
    parameters: {
      query: { type: 'string', required: true, description: 'Substring of the symbol name.' },
      kind: { type: 'string', description: `Restrict to one kind: ${SYMBOL_KINDS.join(', ')}.` },
      limit: { type: 'number', description: 'Maximum results (default 30).' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { query: { type: 'string', required: true }, results: { type: 'array', required: true, items: locationSchema } } },
      render: (args, value) => renderList(value.results, `No symbols matching "${args.query}".`),
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const ws = await ready(requireSession(exec, 'code_symbols'));
      const query = String(args.query).trim();
      if (query.length < 2) throw new Error('query must be at least 2 characters');
      if (args.kind !== undefined && !SYMBOL_KINDS.includes(args.kind)) throw new Error(`kind must be one of ${SYMBOL_KINDS.join(', ')}`);
      return { query, results: ws.index.search(query, { kind: args.kind, limit: checkLimit(args.limit, 30, 200) }) };
    },
  }));

  // ---- /code-graph command -------------------------------------------------

  async function codeGraphCommand(invocation) {
    const [sub = 'status', ...rest] = invocation.rawInput.trim().split(/\s+/u).filter(Boolean);
    const session = invocation.agent.session;
    switch (sub) {
      case 'status': {
        const ws = await ready(session);
        return { kind: 'success', text: renderStatus(await status(ws)) };
      }
      case 'reindex': {
        const ws = workspaceFor(session.header.cwd);
        const counts = await enqueue(ws, () => scan(ws, { force: true }));
        return { kind: 'success', text: `Reindexed: ${counts.indexed} files parsed, ${counts.unchanged} unchanged, ${counts.removed} removed, ${counts.skipped} skipped.\n${renderStatus(await status(ws))}` };
      }
      case 'languages': {
        const available = new Set(await extractor.available());
        return { kind: 'success', text: Object.values(LANGUAGES).map(language => `${language.id.padEnd(11)} ${language.extensions.join(' ')}  ${available.has(language.id) ? 'ready' : 'grammar missing'}`).join('\n') };
      }
      case 'outline': {
        if (rest.length === 0) return { kind: 'error', text: 'Usage: /code-graph outline <path>' };
        const ws = await ready(session);
        const path = await relativePath(ws, rest.join(' '));
        const language = languageForPath(path);
        if (!language) return { kind: 'error', text: `${path}: unsupported language` };
        await enqueue(ws, async () => {
          await indexFile(ws, path, language);
          await persist(ws);
        });
        const defs = ws.index.outline(path);
        if (!defs) return { kind: 'error', text: `${path}: not indexed` };
        return { kind: 'success', text: defs.length === 0 ? `${path}: no definitions.` : defs.map(def => formatLocation({ path, ...def })).join('\n') };
      }
      case 'find': {
        if (rest.length === 0) return { kind: 'error', text: 'Usage: /code-graph find <symbol>' };
        const ws = await ready(session);
        const symbol = rest.join(' ');
        const defs = ws.index.definitions(symbol, { limit: 20 });
        const { total, results } = ws.index.references(symbol, { limit: 30 });
        const lines = [`Definitions (${defs.length}):`, ...defs.map(formatLocation), `References (${total}):`, ...results.map(formatLocation)];
        if (total > results.length) lines.push(`… ${total - results.length} more`);
        return { kind: 'success', text: lines.join('\n') };
      }
      default:
        return { kind: 'error', text: 'Usage: /code-graph [status | reindex | languages | outline <path> | find <symbol>]' };
    }
  }

  ctx.effect(function* () {
    yield async () => {
      await Promise.allSettled(inflight);
      extractor.dispose();
      workspaces.clear();
      pendingWrites.clear();
    };
    yield ctx.commands.register({
      name: 'code-graph',
      description: 'tree-sitter symbol index: status, reindex, languages, outline <path>, find <symbol>',
      handler: invocation => track(codeGraphCommand(invocation).catch(error => ({ kind: 'error', text: `code-graph: ${error instanceof Error ? error.message : String(error)}` }))),
    });
  }, 'darask-code-graph lifecycle');

  ctx.logger.debug('code graph ready (kinds: %s / %s) under %s', SYMBOL_KINDS.join(','), REFERENCE_KINDS.join(','), stateDir);
}
