// Fetches the pinned tree-sitter grammar packages from npm and copies only the
// WASM binaries and tags.scm queries into grammars/. Nothing is compiled; the
// grammar packages' native `install` scripts never run because we only `npm pack`.
//
// Skips packages whose files are already present at the pinned version. Set
// DSH_CODE_GRAPH_REQUIRE_GRAMMARS=1 to fail (instead of warn) when a fetch fails.

import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { extractFiles } from '../src/tar.mjs';

const execFileAsync = promisify(execFile);
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const grammarsDir = join(packageRoot, 'grammars');
const manifestPath = join(grammarsDir, 'manifest.json');

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function npmCli() {
  if (process.env.npm_execpath) return process.env.npm_execpath;
  const nodeDir = dirname(process.execPath);
  for (const candidate of [join(nodeDir, 'node_modules/npm/bin/npm-cli.js'), join(nodeDir, '../lib/node_modules/npm/bin/npm-cli.js')]) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error('npm CLI not found; run through `npm run build`');
}

async function npmPack(spec, destination) {
  const args = ['pack', spec, '--pack-destination', destination, '--json', '--silent'];
  const { stdout } = await execFileAsync(process.execPath, [await npmCli(), ...args], { cwd: destination, maxBuffer: 8 * 1024 * 1024 });
  const [result] = JSON.parse(stdout);
  if (!result?.filename) throw new Error(`npm pack ${spec} returned no filename`);
  return { archive: join(destination, result.filename), integrity: result.integrity };
}

export async function fetchGrammars({ force = false } = {}) {
  const spec = JSON.parse(await readFile(join(packageRoot, 'grammars.json'), 'utf8'));
  const manifest = await readJson(manifestPath, { packages: {} });
  await mkdir(grammarsDir, { recursive: true });
  const failures = [];
  for (const pkg of spec.packages) {
    const targets = Object.values(pkg.files).map(name => join(grammarsDir, name));
    const recorded = manifest.packages[pkg.name];
    const present = (await Promise.all(targets.map(exists))).every(Boolean);
    if (!force && recorded?.version === pkg.version && present) continue;
    const scratch = await mkdtemp(join(tmpdir(), 'dsh-code-graph-'));
    try {
      const { archive, integrity } = await npmPack(`${pkg.name}@${pkg.version}`, scratch);
      const files = extractFiles(await readFile(archive), Object.keys(pkg.files).map(name => `package/${name}`));
      for (const [source, name] of Object.entries(pkg.files)) {
        const tmp = join(grammarsDir, `${name}.${process.pid}.tmp`);
        await writeFile(tmp, files.get(`package/${source}`));
        await rename(tmp, join(grammarsDir, name));
      }
      manifest.packages[pkg.name] = { version: pkg.version, integrity, files: Object.values(pkg.files) };
      console.log(`code-graph: ${pkg.name}@${pkg.version} → ${Object.values(pkg.files).join(', ')}`);
    } catch (error) {
      failures.push(`${pkg.name}@${pkg.version}: ${error.message}`);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return failures;
}

const failures = await fetchGrammars({ force: process.argv.includes('--force') });
if (failures.length > 0) {
  const message = `code-graph: grammar fetch failed:\n  ${failures.join('\n  ')}`;
  if (process.env.DSH_CODE_GRAPH_REQUIRE_GRAMMARS === '1') {
    console.error(message);
    process.exit(1);
  }
  console.warn(`${message}\n  (languages without a grammar are skipped at runtime; re-run \`npm run build -w @darask/dsh-code-graph\` when online)`);
}
