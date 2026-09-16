#!/usr/bin/env node
import { lstat, mkdir, open, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const LEGACY = new Set(['@fang2hou/dsh-locale-ja', 'dsh-grok-provider', 'dsh-cursor-acp', 'dsh-codex-connect', 'dsh-bridge', 'dsh-bridge-gateway'])
const DEFAULT_SPEC = 'github:daraskme/dsh-darask'
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const beneath = (directory, candidate) => {
  const rel = relative(directory, candidate)
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !resolve(candidate).startsWith('\\\\') && !rel.includes(':')
}

async function regularFile(filename, optional = false) {
  try {
    const info = await lstat(filename)
    if (info.isSymbolicLink() || !info.isFile()) throw new Error(`Expected a regular file: ${filename}`)
    return info
  } catch (error) {
    if (optional && error.code === 'ENOENT') return null
    throw error
  }
}

/** Plan exact profile metadata changes. No files are written and no credential files are read. */
export async function planMigration(profilePath, spec = DEFAULT_SPEC) {
  if (typeof profilePath !== 'string' || !profilePath.trim()) throw new Error('An explicit DSH profile directory is required (--profile).')
  if (typeof spec !== 'string' || !spec || spec !== spec.trim() || spec.length > 2048 || /[\x00-\x1f\x7f]/u.test(spec)) throw new Error('Invalid dsh-darask package specification.')
  const profile = await realpath(resolve(profilePath))
  const manifestPath = join(profile, 'package.json')
  const patchPath = join(profile, 'cordis.patch.yml')
  if (!beneath(profile, manifestPath) || !beneath(profile, patchPath)) throw new Error('Profile files must remain inside the selected directory.')
  const info = await regularFile(manifestPath)
  const before = await readFile(manifestPath)
  const manifest = JSON.parse(before.toString('utf8').replace(/^\uFEFF/u, ''))
  if (!object(manifest) || !object(manifest.dsh) || !object(manifest.dsh.profile) || !Array.isArray(manifest.dsh.profile.bundles)
    || manifest.dsh.profile.bundles.some(value => typeof value !== 'string') || (manifest.dependencies !== undefined && !object(manifest.dependencies))) {
    throw new Error('The selected package.json is not a DSH profile manifest with dsh.profile.bundles.')
  }
  const next = structuredClone(manifest)
  const removedBundles = manifest.dsh.profile.bundles.filter(name => LEGACY.has(name))
  const removedDependencies = Object.keys(manifest.dependencies ?? {}).filter(name => LEGACY.has(name))
  const bundles = []
  const hasDarask = manifest.dsh.profile.bundles.includes('dsh-darask')
  let added = false
  for (const name of manifest.dsh.profile.bundles) {
    if (LEGACY.has(name)) {
      if (!hasDarask && !added) { bundles.push('dsh-darask'); added = true }
    } else if (name !== 'dsh-darask' || !added) {
      bundles.push(name)
      if (name === 'dsh-darask') added = true
    }
  }
  if (!added) bundles.push('dsh-darask')
  next.dsh.profile.bundles = bundles
  next.dependencies = { ...(manifest.dependencies ?? {}) }
  for (const name of removedDependencies) delete next.dependencies[name]
  next.dependencies['dsh-darask'] = spec
  const changed = JSON.stringify(next) !== JSON.stringify(manifest)
  const patchExists = Boolean(await regularFile(patchPath, true))
  return {
    profile, manifestPath, patchPath, patchExists, before, mode: info.mode & 0o777,
    after: Buffer.from(`${JSON.stringify(next, null, 2)}\n`),
    summary: {
      mode: 'plan', profile, changed, removedBundles: [...new Set(removedBundles)], removedDependencies,
      dependency: { name: 'dsh-darask', spec }, patchReviewRequired: patchExists,
      note: 'Only package.json dependency and bundle metadata will change. cordis.patch.yml will be backed up unchanged. Review any explicit legacy plugin rows separately. No package manager or authentication command is run.',
    },
  }
}

/** Apply a previously prepared plan after backups and an unchanged-source check. */
export async function applyMigration(plan) {
  if (!plan.summary.changed) return { ...plan.summary, mode: 'apply', backupDirectory: null }
  if (!beneath(plan.profile, plan.manifestPath) || dirname(plan.manifestPath) !== plan.profile || plan.manifestPath !== join(plan.profile, 'package.json')) throw new Error('Invalid migration target.')
  const lockPath = join(plan.profile, '.darask-migration.lock')
  const lock = await open(lockPath, 'wx', 0o600).catch(error => {
    if (error.code === 'EEXIST') throw new Error('A DARASK migration lock already exists. Check for a running migration before removing it.')
    throw error
  })
  let temporary
  let backupDirectory
  try {
    await regularFile(plan.manifestPath)
    if (!(await readFile(plan.manifestPath)).equals(plan.before)) throw new Error('package.json changed after planning; no migration was applied. Run the plan again.')
    const backupRoot = join(plan.profile, '.darask-backups')
    await mkdir(backupRoot, { recursive: true })
    const resolvedRoot = await realpath(backupRoot)
    if (!beneath(plan.profile, resolvedRoot)) throw new Error('Backup directory must remain inside the selected DSH profile.')
    backupDirectory = join(resolvedRoot, `${new Date().toISOString().replace(/[:.]/gu, '-')}-${randomUUID()}`)
    await mkdir(backupDirectory)
    await writeFile(join(backupDirectory, 'package.json'), plan.before, { flag: 'wx', mode: 0o600, flush: true })
    const patchInfo = await regularFile(plan.patchPath, true)
    if (patchInfo) await writeFile(join(backupDirectory, 'cordis.patch.yml'), await readFile(plan.patchPath), { flag: 'wx', mode: 0o600, flush: true })
    temporary = join(plan.profile, `.darask-package-${randomUUID()}.tmp`)
    await writeFile(temporary, plan.after, { flag: 'wx', mode: plan.mode || 0o600, flush: true })
    await regularFile(plan.manifestPath)
    if (!(await readFile(plan.manifestPath)).equals(plan.before)) throw new Error('package.json changed while creating the backup; no migration was applied. Run the plan again.')
    await rename(temporary, plan.manifestPath)
    temporary = undefined
    return { ...plan.summary, mode: 'apply', backupDirectory }
  } finally {
    if (temporary) await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error })
    await lock.close()
    await unlink(lockPath)
  }
}

async function main(argv) {
  let profile, spec = DEFAULT_SPEC, apply = false
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index]
    if (value === '--help' || value === '-h') {
      console.log('Usage: node scripts/migrate.mjs --profile <DSH-profile-directory> [--spec <package-spec>] [--apply]\nDefault: read-only migration plan. --apply backs up package.json and cordis.patch.yml before updating package.json only. No installation or login commands are run.')
      return
    }
    if (value === '--apply') { apply = true; continue }
    if ((value === '--profile' || value === '--spec') && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      if (value === '--profile') profile = argv[++index]
      else spec = argv[++index]
      continue
    }
    throw new Error(`Unknown or incomplete argument: ${value}`)
  }
  const plan = await planMigration(profile, spec)
  console.log(JSON.stringify(apply ? await applyMigration(plan) : plan.summary, null, 2))
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => { console.error(`DARASK migration: ${error.message}`); process.exitCode = 1 })
}
