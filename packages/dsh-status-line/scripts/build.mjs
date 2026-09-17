import { build } from 'esbuild';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/client.jsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'automatic',
  external: ['react', 'react/*', 'react-dom', '@deepseek-ai/*'],
  write: false,
  legalComments: 'eof',
  banner: { js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(manifest.name)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;` },
  footer: { js: 'return module.exports; } });' },
});
const file = join(root, 'dist/client.js');
await mkdir(dirname(file), { recursive: true });
const temporary = `${file}.${randomUUID()}.tmp`;
await writeFile(temporary, result.outputFiles[0].contents);
await rename(temporary, file);
