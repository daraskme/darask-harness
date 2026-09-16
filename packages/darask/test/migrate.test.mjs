import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { planMigration, applyMigration } from '../scripts/migrate.mjs'

async function fixture(t, manifest) {
  const root = await realpath(tmpdir())
  const directory = await mkdtemp(join(root, 'darask-migrate-test-'))
  t.after(async () => {
    const target = await realpath(directory)
    assert.equal(dirname(target), root)
    assert.ok(basename(target).startsWith('darask-migrate-test-'))
    await rm(target, { recursive: true, force: true })
  })
  await writeFile(join(directory, 'package.json'), JSON.stringify(manifest, null, 4) + '\r\n')
  await writeFile(join(directory, 'cordis.patch.yml'), '# Preserve this user patch byte-for-byte.\r\n- insert: []\r\n')
  return directory
}
const profile = () => ({
  name: 'my-profile', private: true, scripts: { custom: 'retain-me' },
  dependencies: { '@fang2hou/dsh-locale-ja': '0.5.0', 'dsh-cursor-acp': '1.0.0', 'dsh-bridge': '*', 'dsh-bridge-gateway': '*', 'dsh-grok-provider': '1.0.5', 'dsh-codex-connect': '*', 'other-plugin': '2.0.0' },
  dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', 'dsh-grok-provider', 'other-plugin', 'dsh-cursor-acp', 'dsh-bridge', 'dsh-codex-connect', 'dsh-bridge-gateway', '@fang2hou/dsh-locale-ja'], patchReload: 'watch' }, custom: { keep: true } },
})

test('migration plan is read-only, names only targeted changes, and preserves unrelated configuration', async t => {
  const directory = await fixture(t, profile())
  const before = await readFile(join(directory, 'package.json'))
  const plan = await planMigration(directory)
  assert.deepEqual(await readFile(join(directory, 'package.json')), before)
  assert.deepEqual((await readdir(directory)).sort(), ['cordis.patch.yml', 'package.json'])
  assert.equal(plan.summary.mode, 'plan')
  assert.equal(plan.summary.removedDependencies.length, 6)
  const next = JSON.parse(plan.after)
  assert.deepEqual(next.dsh.profile.bundles, ['@deepseek-ai/dsh-base', 'dsh-darask', 'other-plugin'])
  assert.equal(next.dependencies['other-plugin'], '2.0.0')
  assert.equal(next.scripts.custom, 'retain-me')
  assert.equal(next.dsh.profile.patchReload, 'watch')
  assert.deepEqual(next.dsh.custom, { keep: true })
})

test('apply creates byte-identical backups before replacing only the manifest', async t => {
  const directory = await fixture(t, profile())
  const before = await readFile(join(directory, 'package.json'))
  const patch = await readFile(join(directory, 'cordis.patch.yml'))
  const plan = await planMigration(directory, 'file:./dsh-darask.tgz')
  const result = await applyMigration(plan)
  assert.equal(result.mode, 'apply')
  assert.deepEqual(await readFile(join(result.backupDirectory, 'package.json')), before)
  assert.deepEqual(await readFile(join(result.backupDirectory, 'cordis.patch.yml')), patch)
  assert.deepEqual(await readFile(join(directory, 'cordis.patch.yml')), patch)
  assert.deepEqual(await readFile(join(directory, 'package.json')), plan.after)
  assert.ok(!(await readdir(directory)).some(name => name.endsWith('.tmp') || name === '.darask-migration.lock'))
})

test('repeat migration is a no-op and creates no extra backup', async t => {
  const directory = await fixture(t, profile())
  await applyMigration(await planMigration(directory))
  const backups = await readdir(join(directory, '.darask-backups'))
  const before = await readFile(join(directory, 'package.json'))
  const repeat = await planMigration(directory)
  assert.equal(repeat.summary.changed, false)
  assert.equal((await applyMigration(repeat)).backupDirectory, null)
  assert.deepEqual(await readdir(join(directory, '.darask-backups')), backups)
  assert.deepEqual(await readFile(join(directory, 'package.json')), before)
})

test('refuses a concurrently changed manifest without overwriting it', async t => {
  const directory = await fixture(t, profile())
  const plan = await planMigration(directory)
  const changed = JSON.stringify({ ...profile(), concurrentEdit: true })
  await writeFile(join(directory, 'package.json'), changed)
  await assert.rejects(applyMigration(plan), /changed after planning/u)
  assert.equal(await readFile(join(directory, 'package.json'), 'utf8'), changed)
})

test('refuses an existing migration lock and an ordinary non-profile package', async t => {
  const directory = await fixture(t, profile())
  const plan = await planMigration(directory)
  await writeFile(join(directory, '.darask-migration.lock'), 'another owner')
  await assert.rejects(applyMigration(plan), /lock already exists/u)
  assert.equal(await readFile(join(directory, '.darask-migration.lock'), 'utf8'), 'another owner')
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'ordinary-package' }))
  await assert.rejects(planMigration(directory), /not a DSH profile/u)
})

test('requires an explicit target and rejects unknown package-spec whitespace', async () => {
  await assert.rejects(planMigration(undefined), /explicit DSH profile/u)
  await assert.rejects(planMigration(resolve('.'), 'pkg\nother'), /Invalid dsh-darask package specification/u)
})

test('refuses a directory used in place of the user patch', async t => {
  const directory = await fixture(t, profile())
  const patch = join(directory, 'cordis.patch.yml')
  await rm(patch)
  await mkdir(patch)
  await assert.rejects(planMigration(directory), /regular file/u)
})
