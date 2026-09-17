import { build } from 'esbuild';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateClientBundle } from './client-preflight.mjs';

/** Build both clients before publishing either output. Syntax failures keep
 * the last working bundles; lifecycle validation also runs before publishing. */
export async function buildClients(root) {
  const vendor = join(root, 'vendor/dsh-bridge-gateway');
  const manifest = JSON.parse(await readFile(join(vendor, 'package.json'), 'utf8'));
  const [main, bridge] = await Promise.all([
    build({ absWorkingDir: root, entryPoints: ['src/client.jsx'], bundle: true, format: 'cjs', platform: 'browser', target: ['es2022'], jsx: 'automatic', external: ['react', 'react/*', 'react-dom', '@deepseek-ai/*'], loader: { '.css': 'text' }, write: false, legalComments: 'eof', banner: { js: 'window.__ModuleLoader__.load({ id: "darask-harness", factory: (require) => { var module = { exports: {} }; var exports = module.exports;' }, footer: { js: 'return module.exports; } });' } }),
    build({ absWorkingDir: vendor, entryPoints: ['client/index.js'], bundle: true, format: 'cjs', platform: 'browser', target: ['chrome100'], external: ['react', 'react/jsx-runtime'], write: false, legalComments: 'none', banner: { js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(manifest.name)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports; var React = require("react");` }, footer: { js: 'return module.exports; } });' } }),
  ]);
  validateClientBundle(main.outputFiles[0].text);
  for (const [file, contents] of [[join(root, 'dist/client.js'), main.outputFiles[0].contents], [join(vendor, 'client/client.js'), bridge.outputFiles[0].contents]]) {
    await mkdir(dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, contents);
    await rename(temporary, file);
  }
}
