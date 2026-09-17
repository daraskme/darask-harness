// In-memory symbol index, I/O free. One record per indexed file; name → file
// inverted maps answer definition / reference lookups. Ranking of candidates
// approximates grok-build's navigator: same file, then shared directory
// depth, then path order.

export const SNAPSHOT_VERSION = 1;

function sharedPrefixDepth(a, b) {
  const pa = a.split('/');
  const pb = b.split('/');
  let depth = 0;
  while (depth < pa.length - 1 && depth < pb.length - 1 && pa[depth] === pb[depth]) depth += 1;
  return depth;
}

function addTo(map, name, path) {
  let set = map.get(name);
  if (!set) { set = new Set(); map.set(name, set); }
  set.add(path);
}

function removeFrom(map, name, path) {
  const set = map.get(name);
  if (!set) return;
  set.delete(path);
  if (set.size === 0) map.delete(name);
}

export class CodeIndex {
  #files = new Map();
  #defsByName = new Map();
  #refsByName = new Map();

  get size() {
    return this.#files.size;
  }

  has(path) {
    return this.#files.has(path);
  }

  get(path) {
    return this.#files.get(path);
  }

  paths() {
    return [...this.#files.keys()];
  }

  /** @param record `{ language, hash, size, indexedAt, definitions, references }` */
  setFile(path, record) {
    this.removeFile(path);
    this.#files.set(path, record);
    for (const def of record.definitions) addTo(this.#defsByName, def.name, path);
    for (const ref of record.references) addTo(this.#refsByName, ref.name, path);
  }

  removeFile(path) {
    const previous = this.#files.get(path);
    if (!previous) return false;
    this.#files.delete(path);
    for (const def of previous.definitions) removeFrom(this.#defsByName, def.name, path);
    for (const ref of previous.references) removeFrom(this.#refsByName, ref.name, path);
    return true;
  }

  clear() {
    this.#files.clear();
    this.#defsByName.clear();
    this.#refsByName.clear();
  }

  #rank(items, from) {
    if (!from) return items.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
    return items.sort((a, b) => {
      const sameA = a.path === from ? 1 : 0;
      const sameB = b.path === from ? 1 : 0;
      if (sameA !== sameB) return sameB - sameA;
      const depth = sharedPrefixDepth(b.path, from) - sharedPrefixDepth(a.path, from);
      if (depth !== 0) return depth;
      return a.path.localeCompare(b.path) || a.line - b.line;
    });
  }

  /** Definitions named exactly `name`. `from` (a path) ranks nearby files first. */
  definitions(name, { kind, from, limit = 50 } = {}) {
    const out = [];
    for (const path of this.#defsByName.get(name) ?? []) {
      for (const def of this.#files.get(path).definitions) {
        if (def.name !== name) continue;
        if (kind && def.kind !== kind) continue;
        out.push({ path, ...def });
      }
    }
    return this.#rank(out, from).slice(0, limit);
  }

  /** Reference sites for `name`; definitions of the same name are appended as `kind: 'definition'` when requested. */
  references(name, { from, includeDefinitions = false, limit = 200 } = {}) {
    const out = [];
    for (const path of this.#refsByName.get(name) ?? []) {
      for (const ref of this.#files.get(path).references) if (ref.name === name) out.push({ path, ...ref });
    }
    if (includeDefinitions) {
      for (const def of this.definitions(name, { limit: Number.POSITIVE_INFINITY })) out.push({ path: def.path, name: def.name, kind: `definition.${def.kind}`, line: def.line, column: def.column });
    }
    const total = out.length;
    return { total, results: this.#rank(out, from).slice(0, limit) };
  }

  /** Case-insensitive substring search over definition names; exact and prefix matches rank first. */
  search(query, { kind, limit = 50 } = {}) {
    const needle = query.toLowerCase();
    const scored = [];
    for (const [name, paths] of this.#defsByName) {
      const lower = name.toLowerCase();
      let score;
      if (lower === needle) score = 0;
      else if (lower.startsWith(needle)) score = 1;
      else if (lower.includes(needle)) score = 2;
      else continue;
      for (const path of paths) {
        for (const def of this.#files.get(path).definitions) {
          if (def.name !== name || (kind && def.kind !== kind)) continue;
          scored.push({ score, item: { path, ...def } });
        }
      }
    }
    scored.sort((a, b) => a.score - b.score || a.item.name.length - b.item.name.length || a.item.path.localeCompare(b.item.path) || a.item.line - b.item.line);
    return scored.slice(0, limit).map(entry => entry.item);
  }

  outline(path) {
    return this.#files.get(path)?.definitions ?? undefined;
  }

  stats() {
    let definitions = 0;
    let references = 0;
    const languages = {};
    for (const record of this.#files.values()) {
      definitions += record.definitions.length;
      references += record.references.length;
      languages[record.language] = (languages[record.language] ?? 0) + 1;
    }
    return { files: this.#files.size, definitions, references, symbols: this.#defsByName.size, languages };
  }

  snapshot() {
    return { version: SNAPSHOT_VERSION, files: Object.fromEntries(this.#files) };
  }

  static fromSnapshot(snapshot) {
    const index = new CodeIndex();
    if (!snapshot || snapshot.version !== SNAPSHOT_VERSION || typeof snapshot.files !== 'object') return index;
    for (const [path, record] of Object.entries(snapshot.files)) {
      if (Array.isArray(record?.definitions) && Array.isArray(record?.references)) index.setFile(path, record);
    }
    return index;
  }
}
