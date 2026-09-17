import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Write a standalone launcher so the source checkout may update independently. */
export async function writeInstalledLauncher(root) {
  const contents = `import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const data = join(root, 'data');
let cwd = join(root, 'app'), entry = join(cwd, 'node_modules/darask-harness/scripts/start.mjs'), args = ['--no-open'];
try {
  const development = JSON.parse(await readFile(join(data, 'darask/development.json'), 'utf8'));
  cwd = resolve(development.source); entry = join(cwd, 'scripts/dev.mjs'); args = ['--dsh-root', root];
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const child = spawn(process.execPath, [entry, ...args], { cwd, env: { ...process.env, DSH_HOME: data }, stdio: 'inherit', shell: false, windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
`;
  await writeFile(join(root, 'start-dsh.mjs'), contents);
}
