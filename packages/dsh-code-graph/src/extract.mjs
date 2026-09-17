// tree-sitter (WASM) symbol extraction driven by the grammars' standard
// `tags.scm` queries: every match carries a `@definition.<kind>` or
// `@reference.<kind>` capture plus a `@name` capture.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Language, Parser, Query } from 'web-tree-sitter';

import { GRAMMARS_DIR, LANGUAGES } from './languages.mjs';

let initialized;

async function ensureInit() {
  initialized ??= Parser.init().catch(error => { initialized = undefined; throw error; });
  await initialized;
}

async function exists(path) {
  try {
    await readFile(path, { flag: 'r' });
    return true;
  } catch {
    return false;
  }
}

/** Assigns each definition the innermost enclosing definition as `container` (e.g. class for a method). */
export function assignContainers(definitions) {
  const sorted = [...definitions].sort((a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex);
  const stack = [];
  for (const def of sorted) {
    while (stack.length > 0 && stack.at(-1).endIndex <= def.startIndex) stack.pop();
    const parent = stack.findLast(candidate => candidate.startIndex < def.startIndex && candidate.endIndex >= def.endIndex);
    def.container = parent?.name;
    stack.push(def);
  }
  return sorted;
}

export class SymbolExtractor {
  #languages = new Map();
  #loading = new Map();
  #grammarsDir;

  constructor(grammarsDir = GRAMMARS_DIR) {
    this.#grammarsDir = grammarsDir;
  }

  /** Language ids whose grammar files are present on disk. */
  async available() {
    const ids = [];
    for (const language of Object.values(LANGUAGES)) {
      if (await exists(join(this.#grammarsDir, language.wasm))) ids.push(language.id);
    }
    return ids;
  }

  async #load(languageId) {
    const spec = LANGUAGES[languageId];
    if (!spec) throw new Error(`unknown language ${languageId}`);
    await ensureInit();
    const wasmPath = join(this.#grammarsDir, spec.wasm);
    if (!(await exists(wasmPath))) return undefined;
    const language = await Language.load(wasmPath);
    const source = (await Promise.all(spec.tags.map(name => readFile(join(this.#grammarsDir, name), 'utf8')))).join('\n');
    const query = new Query(language, source);
    const parser = new Parser();
    parser.setLanguage(language);
    return { language, query, parser };
  }

  async language(languageId) {
    if (this.#languages.has(languageId)) return this.#languages.get(languageId);
    let pending = this.#loading.get(languageId);
    if (!pending) {
      pending = this.#load(languageId).then(loaded => {
        if (loaded) this.#languages.set(languageId, loaded);
        return loaded;
      }).finally(() => this.#loading.delete(languageId));
      this.#loading.set(languageId, pending);
    }
    return pending;
  }

  /**
   * Returns `{ definitions, references }` for `text`, or undefined when the
   * grammar is unavailable. Positions are 1-based lines and 0-based columns.
   */
  async extract(languageId, text) {
    const loaded = await this.language(languageId);
    if (!loaded) return undefined;
    const tree = loaded.parser.parse(text);
    if (!tree) throw new Error(`tree-sitter failed to parse ${languageId} source`);
    try {
      const definitions = [];
      const references = [];
      const seen = new Set();
      for (const match of loaded.query.matches(tree.rootNode)) {
        const tag = match.captures.find(capture => capture.name.startsWith('definition.') || capture.name.startsWith('reference.'));
        const nameCapture = match.captures.find(capture => capture.name === 'name');
        if (!tag || !nameCapture) continue;
        const name = nameCapture.node.text;
        if (name === '') continue;
        const [category, kind] = tag.name.split('.', 2);
        const key = `${category}:${name}:${nameCapture.node.startIndex}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const line = nameCapture.node.startPosition.row + 1;
        const column = nameCapture.node.startPosition.column;
        if (category === 'definition') {
          definitions.push({ name, kind, line, column, endLine: tag.node.endPosition.row + 1, startIndex: tag.node.startIndex, endIndex: tag.node.endIndex });
        } else {
          references.push({ name, kind, line, column });
        }
      }
      return {
        definitions: assignContainers(definitions).map(({ startIndex: _s, endIndex: _e, ...def }) => def),
        references: references.sort((a, b) => a.line - b.line || a.column - b.column),
      };
    } finally {
      tree.delete();
    }
  }

  dispose() {
    for (const loaded of this.#languages.values()) loaded?.parser.delete();
    this.#languages.clear();
  }
}
