// @darask/dsh-worktree — portable Git worktree lifecycle for DeepSeek Harness,
// the DSH-shaped subset of grok-build's xai-fast-worktree. That crate is a
// Linux-first CoW/overlay engine (Btrfs reflinks, overlayfs, NFS handling,
// SQLite lifecycle metadata); what survives a JavaScript port on Windows/macOS/
// Linux is the lifecycle: named worktrees created with plain `git worktree add`
// under a per-repository root (default `<repo>/.darask/worktrees`, excluded via
// .git/info/exclude so the main tree stays clean), a registry of what this
// harness created (owner session, base, timestamps), status with dirty/missing/
// prunable flags, safe removal that refuses dirty trees without `force`, and GC
// of stale or vanished entries. Everything goes through the git CLI; upstream
// fs tools, sandbox, and bash/pwsh stay authoritative for work inside the tree.

import { execFile } from 'node:child_process';
import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import z from '@deepseek-ai/schemastery';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { defineTool } from '@deepseek-ai/dsh-tools';

import {
  WorktreeRegistry,
  defaultBranch,
  isInside,
  parseWorktreeList,
  renderList,
  samePath,
  validateBranch,
  validateName,
  validateRef,
  worktreeRoot,
} from './registry.mjs';

export * from './registry.mjs';

export const name = 'darask-worktree';
export const inject = ['tools', 'commands'];

export const Config = z.object({
  dshHome: z.string(),
  root: z.string().description('Worktree root: absolute, or relative to the repository; default <repo>/.darask/worktrees'),
  staleAfterMs: z.number().default(7 * 24 * 60 * 60 * 1000),
  maxWorktrees: z.number().default(24),
  gitTimeoutMs: z.number().default(60_000),
});

const execFileAsync = promisify(execFile);

export function apply(ctx, config) {
  const resolved = { ...config, dshHome: resolveDshHome(config.dshHome) };
  const registry = new WorktreeRegistry(join(resolved.dshHome, 'darask', 'worktrees', 'registry.json'));
  const sandboxPolicy = ctx.get('sandboxPolicy');

  function requireMutationPolicy(policy) {
    const mode = policy?.mode ?? ctx.get('shell')?.sandboxMode;
    if (mode !== undefined && mode !== 'danger-full-access') {
      throw new Error('Worktree mutations are unavailable under a confined sandbox policy; this Git adapter cannot enforce that policy.');
    }
    if (!policy && ctx.get('shell')?.sandboxMode !== undefined) {
      throw new Error('Cannot resolve the worktree sandbox policy.');
    }
  }

  function protectCurrentWorkspace(entry, cwd) {
    if (cwd && (samePath(entry.path, cwd) || isInside(entry.path, cwd))) throw new Error('Cannot remove the current session workspace.');
  }

  async function git(cwd, args, { allowFailure = false } = {}) {
    try {
      const { stdout } = await execFileAsync('git', args, { cwd, encoding: 'utf8', timeout: resolved.gitTimeoutMs, maxBuffer: 16 * 1024 * 1024, windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
      return { ok: true, stdout: stdout.replace(/\r\n/gu, '\n') };
    } catch (error) {
      if (allowFailure) return { ok: false, stdout: '', error };
      const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : '';
      throw new Error(`git ${args[0]} failed${stderr ? `: ${stderr}` : ` (${error instanceof Error ? error.message : String(error)})`}`);
    }
  }

  function sessionCwd(exec) {
    const session = exec.agent?.session;
    if (!session) throw new Error('worktree tools require an agent session');
    const policy = sandboxPolicy?.resolve({ session });
    return { cwd: policy?.workspaceRoot ?? session.header.cwd, session, policy };
  }

  async function repoRootFor(cwd) {
    const { stdout } = await git(cwd, ['rev-parse', '--show-toplevel']);
    const root = stdout.trim();
    if (root === '') throw new Error('not inside a git repository');
    // Inside a linked worktree, resolve back to the main working tree (first porcelain entry).
    const [main] = parseWorktreeList((await git(root, ['worktree', 'list', '--porcelain'], { allowFailure: true })).stdout);
    return resolve(main !== undefined && !main.bare && main.path !== '' ? main.path : root);
  }

  async function ensureExcluded(repoRoot, root) {
    if (!isInside(repoRoot, root)) return;
    const gitDir = (await git(repoRoot, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).stdout.trim();
    const infoDir = join(gitDir, 'info');
    const excludeFile = join(infoDir, 'exclude');
    const relative = `/${root.slice(repoRoot.length).replaceAll('\\', '/').replace(/^\/+/u, '').split('/')[0]}/`;
    let existing = '';
    try {
      existing = await readFile(excludeFile, 'utf8');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    if (existing.split(/\r?\n/u).includes(relative)) return;
    await mkdir(infoDir, { recursive: true });
    await appendFile(excludeFile, `${existing === '' || existing.endsWith('\n') ? '' : '\n'}${relative}\n`);
  }

  async function exists(path) {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async function isDirty(path) {
    const result = await git(path, ['status', '--porcelain', '--untracked-files=normal'], { allowFailure: true });
    return result.ok ? result.stdout.trim() !== '' : undefined;
  }

  async function statusRows(repoRoot, entries, { withDirty = true } = {}) {
    const listed = parseWorktreeList((await git(repoRoot, ['worktree', 'list', '--porcelain'], { allowFailure: true })).stdout);
    const now = Date.now();
    return Promise.all(entries.map(async entry => {
      const live = listed.find(item => samePath(item.path, entry.path));
      const present = await exists(entry.path);
      const dirty = present && withDirty ? await isDirty(entry.path) : undefined;
      return {
        name: entry.name,
        path: entry.path,
        branch: live?.branch ?? entry.branch,
        head: live?.head,
        base: entry.base,
        sessionId: entry.sessionId,
        createdAt: entry.createdAt,
        lastUsedAt: entry.lastUsedAt,
        missing: !present || live === undefined,
        prunable: live?.prunable !== undefined && live.prunable !== false,
        locked: live?.locked === true,
        dirty: dirty === true,
        stale: now - (entry.lastUsedAt ?? entry.createdAt) > resolved.staleAfterMs,
      };
    }));
  }

  async function removeWorktree(repoRoot, entry, { force, deleteBranch }) {
    if (await exists(entry.path)) {
      if (!force && (await isDirty(entry.path)) !== false) throw new Error(`worktree ${entry.name} has uncommitted changes (or its status could not be read); pass force: true to discard them`);
      await git(repoRoot, ['worktree', 'remove', ...force ? ['--force'] : [], entry.path]);
    }
    await git(repoRoot, ['worktree', 'prune']);
    if (deleteBranch && entry.branch) {
      const result = await git(repoRoot, ['branch', '-D', entry.branch], { allowFailure: true });
      if (!result.ok) return `worktree removed; branch ${entry.branch} kept (${String(result.error?.stderr ?? '').trim() || 'delete failed'})`;
      return `worktree and branch ${entry.branch} removed`;
    }
    return 'worktree removed';
  }

  async function createWorktree({ cwd, session, policy }, args) {
    requireMutationPolicy(policy);
    const repoRoot = await repoRootFor(cwd);
    const requestedName = typeof args.name === 'string' && args.name !== '' ? validateName(args.name) : undefined;
    const branch = validateBranch(typeof args.branch === 'string' && args.branch !== '' ? args.branch : defaultBranch(requestedName ?? `s${Date.now().toString(36)}`));
    const name = requestedName ?? validateName(branch.replaceAll(/[^A-Za-z0-9._-]/gu, '-').replace(/^[^A-Za-z0-9]+/u, '').slice(0, 64) || `wt-${Date.now().toString(36)}`);
    const base = validateRef(typeof args.base === 'string' && args.base !== '' ? args.base : 'HEAD');
    const root = worktreeRoot(repoRoot, resolved.root);
    const path = join(root, name);
    if (!isInside(root, path)) throw new Error('worktree path escapes the worktree root');

    return registry.transaction(async entries => {
      const mine = entries.filter(entry => samePath(entry.repoRoot, repoRoot));
      if (mine.some(entry => entry.name === name)) throw new Error(`worktree ${name} already exists; choose another name or remove it first`);
      if (mine.length >= resolved.maxWorktrees) throw new Error(`worktree limit (${resolved.maxWorktrees}) reached for this repository; remove or gc old worktrees first`);
      if (await exists(path)) throw new Error(`path already exists: ${path}`);

      await git(repoRoot, ['worktree', 'prune']);
      await mkdir(root, { recursive: true });
      await ensureExcluded(repoRoot, root);
      const branchExists = (await git(repoRoot, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { allowFailure: true })).ok;
      if (branchExists) {
        if (typeof args.branch !== 'string' || args.branch === '') throw new Error(`branch ${branch} already exists; pass branch explicitly to check it out, or pick another name`);
        await git(repoRoot, ['worktree', 'add', path, branch]);
      } else {
        await git(repoRoot, ['worktree', 'add', '-b', branch, path, base]);
      }
      const head = (await git(path, ['rev-parse', 'HEAD'], { allowFailure: true })).stdout.trim();
      const now = Date.now();
      entries.push({ name, repoRoot, path, branch, base, head, sessionId: String(session.id), createdAt: now, lastUsedAt: now });
      const outsideSandbox = policy?.workspaceRoot !== undefined && !isInside(policy.workspaceRoot, path);
      return { name, path, branch, base, head, createdBranch: !branchExists, ...outsideSandbox ? { warning: 'worktree lies outside the sandbox workspace root; the file sandbox may deny writes there' } : {} };
    });
  }

  async function gc(repoRoot, { all = false, cwd } = {}) {
    return registry.transaction(async entries => {
      const mine = entries.filter(entry => samePath(entry.repoRoot, repoRoot));
      const rows = await statusRows(repoRoot, mine);
      const removed = [];
      const kept = [];
      for (const row of rows) {
        const entry = mine.find(item => item.name === row.name);
        const collectable = row.missing || row.prunable || ((all || row.stale) && !row.dirty);
        if (!collectable) { kept.push(row.name); continue; }
        try {
          protectCurrentWorkspace(entry, cwd);
          await removeWorktree(repoRoot, entry, { force: row.missing || row.prunable, deleteBranch: false });
          entries.splice(entries.indexOf(entry), 1);
          removed.push(row.name);
        } catch (error) {
          kept.push(`${row.name} (${error instanceof Error ? error.message : String(error)})`);
        }
      }
      return { removed, kept };
    });
  }

  // ---- tools -----------------------------------------------------------------

  ctx.tools.register(defineTool({
    name: 'worktree_create',
    description: 'Create an isolated git worktree of the current repository (default: under <repo>/.darask/worktrees/<name>, on a new branch wt/<name> from HEAD). Use it to try a change, run a build/test, or let a subagent work without touching the main checkout; then continue with the normal file and shell tools inside the returned path. Remove with worktree_remove when done.',
    parameters: {
      name: { type: 'string', description: 'Worktree name ([A-Za-z0-9._-], max 64). Defaults to a name derived from the branch.' },
      branch: { type: 'string', description: 'Branch to create (or an existing branch to check out). Default wt/<name>.' },
      base: { type: 'string', description: 'Start point for a new branch (commit, branch, or tag). Default HEAD.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          path: { type: 'string', required: true },
          branch: { type: 'string', required: true },
          base: { type: 'string', required: true },
          head: { type: 'string', required: true },
          createdBranch: { type: 'boolean', required: true },
          warning: { type: 'string' },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `${value.createdBranch ? 'created' : 'checked out'} worktree ${value.name} at ${value.path} on ${value.branch} (${value.head.slice(0, 10)}, base ${value.base})${value.warning ? `\nwarning: ${value.warning}` : ''}` }],
    },
    presentCall: args => ({ card: 'generic', title: `[worktree] create ${args.name ?? args.branch ?? ''}`.trim(), kind: 'worktree_create' }),
    async execute(args, exec) {
      return createWorktree(sessionCwd(exec), args);
    },
  }));

  ctx.tools.register(defineTool({
    name: 'worktree_list',
    description: 'List worktrees created by worktree_create for the current repository, with branch, HEAD, path, and flags (dirty, missing, prunable, stale, locked).',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          repoRoot: { type: 'string', required: true },
          worktrees: { type: 'array', required: true, items: { type: 'object', additionalProperties: true, properties: {} } },
        },
      },
      render: (_args, value) => [{ type: 'text', text: renderList(value.worktrees) }],
    },
    isConcurrencySafe: () => true,
    async execute(_args, exec) {
      const repoRoot = await repoRootFor(sessionCwd(exec).cwd);
      return { repoRoot, worktrees: await statusRows(repoRoot, await registry.forRepo(repoRoot)) };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'worktree_remove',
    description: 'Remove a worktree created by worktree_create. Refuses a worktree with uncommitted changes unless force is true. Optionally deletes its branch.',
    parameters: {
      name: { type: 'string', required: true, description: 'Worktree name as returned by worktree_create / worktree_list.' },
      force: { type: 'boolean', description: 'Discard uncommitted changes in the worktree.' },
      delete_branch: { type: 'boolean', description: 'Also delete the worktree branch (git branch -D).' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          path: { type: 'string', required: true },
          result: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `${value.name} (${value.path}): ${value.result}` }],
    },
    presentCall: args => ({ card: 'generic', title: `[worktree] remove ${args.name}${args.force ? ' --force' : ''}`, kind: 'worktree_remove' }),
    async execute(args, exec) {
      const context = sessionCwd(exec);
      requireMutationPolicy(context.policy);
      const repoRoot = await repoRootFor(context.cwd);
      const name = validateName(args.name);
      return registry.transaction(async entries => {
        const entry = entries.find(item => samePath(item.repoRoot, repoRoot) && item.name === name);
        if (!entry) throw new Error(`unknown worktree ${name} (only worktrees created by worktree_create can be removed here; see worktree_list)`);
        protectCurrentWorkspace(entry, context.session.header.cwd);
        const result = await removeWorktree(repoRoot, entry, { force: args.force === true, deleteBranch: args.delete_branch === true });
        entries.splice(entries.indexOf(entry), 1);
        return { name, path: entry.path, result };
      });
    },
  }));

  // ---- /worktree command -----------------------------------------------------

  async function worktreeCommand(invocation) {
    const [sub = 'list', ...rest] = invocation.rawInput.trim().split(/\s+/u).filter(Boolean);
    const session = invocation.agent.session;
    const policy = sandboxPolicy?.resolve({ session });
    if (['create', 'remove', 'gc'].includes(sub)) requireMutationPolicy(policy);
    const cwd = policy?.workspaceRoot ?? session.header.cwd;
    const repoRoot = await repoRootFor(cwd);
    switch (sub) {
      case 'list':
        return { kind: 'success', text: renderList(await statusRows(repoRoot, await registry.forRepo(repoRoot))) };
      case 'create': {
        const created = await createWorktree({ cwd, session, policy }, { name: rest[0], branch: rest[1], base: rest[2] });
        return { kind: 'success', text: `${created.createdBranch ? 'created' : 'checked out'} ${created.name} at ${created.path} on ${created.branch}` };
      }
      case 'remove': {
        const force = rest.includes('--force');
        const deleteBranch = rest.includes('--delete-branch');
        const target = rest.find(arg => !arg.startsWith('--'));
        if (!target) return { kind: 'error', text: 'Usage: /worktree remove <name> [--force] [--delete-branch]' };
        const name = validateName(target);
        const result = await registry.transaction(async entries => {
          const entry = entries.find(item => samePath(item.repoRoot, repoRoot) && item.name === name);
          if (!entry) throw new Error(`unknown worktree ${name}`);
          protectCurrentWorkspace(entry, session.header.cwd);
          const text = await removeWorktree(repoRoot, entry, { force, deleteBranch });
          entries.splice(entries.indexOf(entry), 1);
          return text;
        });
        return { kind: 'success', text: `${name}: ${result}` };
      }
      case 'gc': {
        const { removed, kept } = await gc(repoRoot, { all: rest.includes('--all'), cwd: session.header.cwd });
        return { kind: 'success', text: `Removed ${removed.length} worktrees${removed.length > 0 ? ` (${removed.join(', ')})` : ''}; kept ${kept.length}${kept.length > 0 ? ` (${kept.join(', ')})` : ''}.` };
      }
      default:
        return { kind: 'error', text: 'Usage: /worktree [list | create <name> [branch] [base] | remove <name> [--force] [--delete-branch] | gc [--all]]' };
    }
  }

  ctx.effect(function* () {
    yield ctx.commands.register({
      name: 'worktree',
      description: 'Git worktrees created by this harness: list, create, remove, gc (stale or vanished entries)',
      handler: invocation => worktreeCommand(invocation).catch(error => ({ kind: 'error', text: `worktree: ${error instanceof Error ? error.message : String(error)}` })),
    });
  }, 'darask-worktree lifecycle');

  ctx.logger.debug('worktree tools ready (root=%s, stale after %dms)', resolved.root ?? '<repo>/.darask/worktrees', resolved.staleAfterMs);
}
