// Language table: file extension → grammar. Mirrors grok-build's
// LanguageRegistry (JS / TS / Python / Go / Rust); TS and TSX reuse the
// JavaScript tags query because the TypeScript grammar extends it.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GRAMMARS_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), 'grammars');

export const LANGUAGES = Object.freeze({
  javascript: { id: 'javascript', wasm: 'javascript.wasm', tags: ['javascript.tags.scm'], extensions: ['.js', '.mjs', '.cjs', '.jsx'] },
  typescript: { id: 'typescript', wasm: 'typescript.wasm', tags: ['javascript.tags.scm', 'typescript.tags.scm'], extensions: ['.ts', '.mts', '.cts'] },
  tsx: { id: 'tsx', wasm: 'tsx.wasm', tags: ['javascript.tags.scm', 'typescript.tags.scm'], extensions: ['.tsx'] },
  python: { id: 'python', wasm: 'python.wasm', tags: ['python.tags.scm'], extensions: ['.py', '.pyi'] },
  go: { id: 'go', wasm: 'go.wasm', tags: ['go.tags.scm'], extensions: ['.go'] },
  rust: { id: 'rust', wasm: 'rust.wasm', tags: ['rust.tags.scm'], extensions: ['.rs'] },
});

const byExtension = new Map();
for (const language of Object.values(LANGUAGES)) for (const ext of language.extensions) byExtension.set(ext, language.id);

/** Language id for a path, or undefined when the extension is not indexed. */
export function languageForPath(path) {
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const name = path.slice(slash + 1);
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return undefined;
  return byExtension.get(name.slice(dot).toLowerCase());
}

export const SYMBOL_KINDS = Object.freeze(['function', 'method', 'class', 'interface', 'module', 'type', 'constant', 'macro']);
export const REFERENCE_KINDS = Object.freeze(['call', 'class', 'type', 'implementation']);
