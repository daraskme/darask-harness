// @darask/dsh-hashline — hashline-anchored read/edit/grep tools for DeepSeek Harness.
// Behaviour follows grok-build's `GrokBuildHashline` tool namespace, re-implemented over `ctx.fs`.

import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { FsError } from '@deepseek-ai/dsh-fs';
import {
  ESCALATION_TARGETS,
  approveEscalation,
  canonicalPath,
  escalationHintMarker,
  sandboxDenialMarker,
  validateEscalationArgs,
} from '@deepseek-ai/dsh-sandbox';

import { applyEdits, normalizeEdits, EditError } from './apply.mjs';
import { ARROW, formatHashline } from './format.mjs';
import { hashlineSearch } from './search.mjs';
import { buildScheme, exampleAnchors, splitLines } from './scheme.mjs';

export { applyEdits, normalizeEdits, detectAnchorPrefix, validateAnchor, rangeWarning } from './apply.mjs';
export { formatHashline, ARROW } from './format.mjs';
export { hashlineSearch, globToRegExp } from './search.mjs';
export * from './scheme.mjs';
export * from './hash.mjs';

export const name = 'darask-hashline';
export const inject = ['tools', 'fs', 'systemPrompt'];

export const Config = z.object({
  scheme: z.union(['chunk', 'content_only', 'checkpoint']).default('chunk'),
  hashLen: z.number().default(3),
  chunkSize: z.number().default(16),
  checkpointInterval: z.number().default(32),
  readLimit: z.number().default(2000),
  grepMaxMatches: z.number().default(200),
  grepMaxFiles: z.number().default(5000),
  promptOrderOffset: z.number().default(0.5),
});

const PARENT_PATH_SEGMENT = /(^|[\\/])\.\.([\\/]|$)/u;

function sessionCwd(exec, requestedPath) {
  const cwd = exec.agent?.session.header.cwd;
  if (cwd === undefined || (!PARENT_PATH_SEGMENT.test(cwd) && !PARENT_PATH_SEGMENT.test(requestedPath))) return cwd;
  return canonicalPath(cwd);
}

function resolveOptions(exec, requestedPath, workspaceRoot) {
  const cwd = workspaceRoot ?? sessionCwd(exec, requestedPath);
  return { ...(cwd !== undefined ? { cwd } : {}), signal: exec.signal };
}

function requirePositiveInteger(value, label, fallback) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
  return value;
}

function requireNonNegativeInteger(value, label) {
  if (value === undefined) return 0;
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer`);
  return value;
}

function detectEol(content) {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

class SandboxController {
  constructor(ctx) {
    this.ctx = ctx;
    const mode = ctx.fs.sandboxMode;
    this.escalationModes = mode === undefined ? [] : ESCALATION_TARGETS;
    this.policy = mode === undefined ? undefined : ctx.get('sandboxPolicy');
    if (mode !== undefined && this.policy === undefined) {
      throw new Error('darask-hashline: the mounted filesystem confines but ctx.sandboxPolicy is missing');
    }
  }

  schemaFields() {
    if (this.escalationModes.length === 0) return {};
    return {
      sandbox_permissions: {
        type: 'string',
        enum: [...this.escalationModes],
        description: 'The wider sandbox mode this file operation needs. Only valid as a one-shot retry of an operation the sandbox just denied; requires justification and user approval.',
      },
      justification: {
        type: 'string',
        description: 'Required with sandbox_permissions: one sentence for the user explaining why this exact file operation needs the wider access.',
      },
    };
  }

  async resolvePolicy(toolName, args, exec) {
    validateEscalationArgs(args.sandbox_permissions, args.justification);
    const standing = this.policy?.resolve({ ...(exec.agent ? { session: exec.agent.session } : {}) });
    if (args.sandbox_permissions === undefined || args.justification === undefined) return standing;
    if (this.escalationModes.length === 0) {
      throw new Error('sandbox_permissions is not available in this composition (no sandboxing filesystem to escalate)');
    }
    const mode = await approveEscalation({
      requestedMode: args.sandbox_permissions,
      justification: args.justification,
      effectiveMode: standing.mode,
      subject: 'operation',
    }, {
      approver: this.ctx.get('approval'),
      agent: exec.agent,
      callId: exec.callId,
      toolName,
      signal: exec.signal,
    });
    return { ...standing, mode };
  }

  mapError(error, policy) {
    if (!(error instanceof FsError) || error.code !== 'FS_SANDBOX_DENIED' || policy === undefined) return error;
    return new FsError(`${sandboxDenialMarker(policy.mode)}\n${escalationHintMarker('operation')}`, 'FS_SANDBOX_DENIED', { cause: error });
  }
}

async function resolveRegularFile(ctx, exec, requestedPath, workspaceRoot) {
  const target = await ctx.fs.resolve(requestedPath, resolveOptions(exec, requestedPath, workspaceRoot));
  const info = await ctx.fs.stat(target, exec.signal);
  if (info === undefined) {
    ctx.emit('fs/observed', target, { kind: 'absent' }, exec);
    throw new FsError(`cannot read "${target.displayPath}": not found`, 'FS_NOT_FOUND');
  }
  if (info.type !== 'file') throw new FsError(`cannot read "${target.displayPath}": not a regular file`, 'FS_NOT_REGULAR_FILE');
  return { target, info };
}

const EDIT_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', required: true, enum: ['ok', 'error'] },
    path: { type: 'string', required: true },
    applied: { type: 'integer' },
    scheme: { type: 'string' },
    snippetStartLine: { type: 'integer' },
    snippet: { type: 'string' },
    warnings: { type: 'array', items: { type: 'string' } },
    error: { type: 'string' },
    message: { type: 'string' },
    requestedAnchor: { type: 'string' },
    current: { type: 'string' },
    context: { type: 'string' },
    contextStartLine: { type: 'integer' },
    shiftedTo: { type: 'integer' },
    shiftedAnchor: { type: 'string' },
    ambiguousCandidates: { type: 'array', items: { type: 'integer' } },
    before: { type: 'string' },
    after: { type: 'string' },
  },
};

function renderEditOutput(value) {
  if (value.status === 'ok') {
    const lines = [`Applied ${value.applied} edit(s) to ${value.path} (scheme ${value.scheme}).`];
    if (value.warnings?.length) lines.push('', ...value.warnings);
    if (value.snippet) lines.push('', `Fresh anchors from line ${value.snippetStartLine}:`, value.snippet);
    return lines.join('\n');
  }
  const lines = [`Error (${value.error}): ${value.message}`];
  if (value.current) lines.push('', `Current line: ${value.current}`);
  if (value.context) lines.push('', `Context from line ${value.contextStartLine}:`, value.context);
  return lines.join('\n');
}

export function apply(ctx, config) {
  const scheme = buildScheme(config);
  const examples = exampleAnchors(scheme);
  const sandbox = new SandboxController(ctx);

  ctx.systemPrompt.section({
    name: 'darask:hashline',
    order: ctx.systemPrompt.getSectionOrder('TOOL_EDIT') + config.promptOrderOffset,
    text: ({ scope }) => (ctx.tools.get('hashline_edit', scope) === undefined ? '' : [
      'hashline_read / hashline_grep return every line as `LINE:HASH:HASH→content`. The part before `→` is an anchor that',
      'fingerprints the line and its neighbourhood. Prefer hashline_edit over edit for multi-line or batched changes: pass',
      'anchors verbatim (never fabricate or alter them), and after any edit use the fresh anchors returned by hashline_edit',
      'or re-read the file. Anchors are only valid for the file state you last saw.',
    ].join(' ')),
  });

  ctx.tools.register(defineTool({
    name: 'hashline_read',
    description: [
      'Read a UTF-8 text file with line-anchored output for use with hashline_edit.',
      `Each line is formatted as ANCHOR${ARROW}CONTENT, for example:`,
      examples.line1,
      examples.line2,
      `The ANCHOR (e.g. "${examples.anchor}") is a compact fingerprint of the line's content and surrounding context.`,
      'Pass anchors to hashline_edit to make edits; they verify the targeted location still matches the snapshot you saw.',
      `By default reads up to ${config.readLimit} lines from the beginning; use offset and limit for large files.`,
    ].join('\n'),
    parameters: {
      file_path: { type: 'string', required: true, description: 'Path to read, resolved by the filesystem backend.' },
      offset: { type: 'number', description: '1-based first line to return. Defaults to 1.' },
      limit: { type: 'number', description: `Maximum number of lines to return. Defaults to ${config.readLimit}.` },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
          offset: { type: 'integer', required: true },
          shown: { type: 'integer', required: true },
          totalLines: { type: 'integer', required: true },
          scheme: { type: 'string', required: true },
          content: { type: 'string', required: true },
        },
      },
      render: (_args, value) => {
        const endLine = value.offset + value.shown - 1;
        const footer = endLine < value.totalLines
          ? `(Showing lines ${value.offset}-${endLine} of ${value.totalLines}. Use offset=${endLine + 1} to continue.)`
          : `(End of file - total ${value.totalLines} lines)`;
        return [{ type: 'text', text: `<path>${value.path}</path>\n<type>file</type>\n<content>\n${value.content ? `${value.content}\n\n${footer}` : footer}\n</content>` }];
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      if (typeof args.file_path !== 'string' || args.file_path.trim().length === 0) throw new Error('file_path must be a non-empty string');
      const offset = requirePositiveInteger(args.offset, 'offset', 1);
      const limit = requirePositiveInteger(args.limit, 'limit', config.readLimit);
      if (limit > config.readLimit) throw new Error(`limit must be less than or equal to ${config.readLimit}`);
      const { target, info } = await resolveRegularFile(ctx, exec, args.file_path);
      const content = await ctx.fs.readText(target, exec.signal);
      const total = splitLines(content).length;
      if (offset > total) throw new FsError(`offset ${offset} is out of range for "${target.displayPath}" (${total} lines)`, 'FS_NOT_FOUND');
      const window = formatHashline(content, { offset, limit }, scheme);
      ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec);
      return { path: target.displayPath, offset, shown: window.shown, totalLines: window.totalLines, scheme: scheme.name, content: window.text };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'hashline_edit',
    description: [
      'Edit a file using anchors from hashline_read or hashline_grep.',
      '',
      'Operations (use the "op" field):',
      `  "replace" — Replace one line or a range: { "op": "replace", "anchor": "${examples.anchor}", "content": "    let x = 42;" }`,
      '    Range: add "end_anchor" to replace from anchor through end_anchor (INCLUSIVE). Empty content deletes.',
      `  "insert_after" — Insert after the anchored line: { "op": "insert_after", "anchor": "${examples.anchor}", "content": "..." }`,
      '    Use "0:" for beginning of file and "EOF" for end of file. Existing lines are preserved.',
      '  "write" — Replace the entire file (must be the only op): { "op": "write", "content": "..." }',
      '',
      'Batch edits: pass multiple operations in "edits". They are validated against the pre-edit snapshot and applied',
      'atomically bottom-up; if any anchor fails validation or ranges overlap, none are applied.',
      'On success the tool returns a snippet with fresh anchors; on stale anchors it returns fresh anchors around the target.',
      `The anchor is the full "${examples.format}" before ${ARROW}. Never fabricate or modify anchors.`,
    ].join('\n'),
    parameters: {
      file_path: { type: 'string', required: true, description: 'Path to edit, resolved by the filesystem backend.' },
      edits: {
        type: 'array',
        required: true,
        description: 'Edit operations: { op: "replace" | "insert_after" | "write", anchor?, end_anchor?, content }.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            op: { type: 'string', required: true, enum: ['replace', 'insert_after', 'write'] },
            anchor: { type: 'string' },
            end_anchor: { type: 'string' },
            content: { type: 'string', required: true },
          },
        },
      },
      ...sandbox.schemaFields(),
    },
    output: {
      schema: EDIT_OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderEditOutput(value) }],
      presentationMeta: (_args, value) => (value.status === 'ok' && value.before !== undefined
        ? { diffs: [{ path: value.path, oldText: value.before, newText: value.after }] }
        : {}),
    },
    async execute(args, exec) {
      if (typeof args.file_path !== 'string' || args.file_path.trim().length === 0) throw new Error('file_path must be a non-empty string');
      let edits;
      try {
        edits = normalizeEdits(args.edits);
      } catch (error) {
        if (error instanceof EditError) return { path: args.file_path, ...error.toOutput() };
        throw error;
      }
      const sandboxPolicy = await sandbox.resolvePolicy('hashline_edit', args, exec);
      const isWrite = edits.length === 1 && edits[0].op === 'write';
      const target = await ctx.fs.resolve(args.file_path, resolveOptions(exec, args.file_path, sandboxPolicy?.workspaceRoot));
      const info = await ctx.fs.stat(target, exec.signal);
      if (info === undefined) {
        ctx.emit('fs/observed', target, { kind: 'absent' }, exec);
        if (!isWrite) {
          return { path: target.displayPath, status: 'error', error: 'file_not_found', message: `File not found: ${target.displayPath}. Use a single "write" op to create it.` };
        }
      } else if (info.type !== 'file') {
        throw new FsError(`cannot edit "${target.displayPath}": not a regular file`, 'FS_NOT_REGULAR_FILE');
      }

      const before = info === undefined ? '' : await ctx.fs.readText(target, exec.signal);
      if (info !== undefined) ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec);
      const result = applyEdits(before, edits, scheme);
      if (result.output.status !== 'ok') return { path: target.displayPath, ...result.output };

      const eol = detectEol(before);
      const after = eol === '\n' ? result.newContent : result.newContent.replaceAll('\n', eol);
      let outcome;
      try {
        const intent = await ctx.waterfall('fs/write-intent', target, exec, () => undefined);
        outcome = await ctx.fs.writeText(target, after, intent, exec.signal, sandboxPolicy);
      } catch (error) {
        throw sandbox.mapError(error, sandboxPolicy);
      }
      ctx.emit('fs/observed', target, { kind: 'present', version: outcome.version }, exec);
      return { path: target.displayPath, ...result.output, before, after };
    },
    presentResult(args, result) {
      if (result.isError) return undefined;
      const diffs = result.meta?.diffs;
      if (!Array.isArray(diffs) || diffs.length === 0) return undefined;
      return { card: 'diff', title: `Hashline edit ${args.file_path}`, diffs };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'hashline_grep',
    description: [
      'Search file contents with anchor-annotated results for use with hashline_edit.',
      'Match lines include anchors you can pass directly to hashline_edit without reading the file first.',
      'Grep-style separators follow the anchor: `:` for match lines and `-` for context lines.',
      `  ${examples.grepMatch}    <- match`,
      `  ${examples.grepContext}    <- context`,
      'pattern is a JavaScript regular expression. Use glob to restrict files (e.g. "*.ts", "src/**/*.mjs").',
      'Results are capped; truncated results show "at least" counts.',
    ].join('\n'),
    parameters: {
      pattern: { type: 'string', required: true, description: 'Regular expression to search for.' },
      path: { type: 'string', description: 'File or directory to search. Defaults to the session working directory.' },
      glob: { type: 'string', description: 'Glob filter on relative paths, e.g. "*.ts" or "src/**/*.mjs".' },
      case_insensitive: { type: 'boolean', description: 'Case-insensitive matching. Defaults to false.' },
      before: { type: 'number', description: 'Context lines before each match (like grep -B).' },
      after: { type: 'number', description: 'Context lines after each match (like grep -A).' },
      max_matches: { type: 'number', description: `Cap on reported matches. Defaults to ${config.grepMaxMatches}.` },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
          matches: { type: 'integer', required: true },
          files: { type: 'integer', required: true },
          truncated: { type: 'boolean', required: true },
          content: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.content }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      if (typeof args.pattern !== 'string' || args.pattern.length === 0) throw new Error('pattern must be a non-empty string');
      const requested = typeof args.path === 'string' && args.path.length > 0 ? args.path : '.';
      const root = await ctx.fs.resolve(requested, resolveOptions(exec, requested));
      const before = requireNonNegativeInteger(args.before, 'before');
      const after = requireNonNegativeInteger(args.after, 'after');
      const maxMatches = Math.min(requirePositiveInteger(args.max_matches, 'max_matches', config.grepMaxMatches), config.grepMaxMatches);
      const result = await hashlineSearch(ctx.fs, root, {
        pattern: args.pattern,
        glob: typeof args.glob === 'string' && args.glob.length > 0 ? args.glob : undefined,
        caseInsensitive: args.case_insensitive === true,
        before,
        after,
        maxMatches,
        maxFiles: config.grepMaxFiles,
        signal: exec.signal,
      }, scheme);
      return { path: root.displayPath, matches: result.matches, files: result.files, truncated: result.truncated, content: result.text };
    },
  }));
}
