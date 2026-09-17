// In-memory hunk state for one session (grok-build xai-hunk-tracker actor
// semantics, minus the actor): per-file baseline / current content, the hunks
// between them, agent-vs-external attribution with turn indices, accept /
// reject bookkeeping and a JSON snapshot for persistence. No I/O lives here;
// the plugin reads files and writes rejections through ctx.fs.

import {
  computeHunks,
  fileCreatedHunk,
  fileDeletedHunk,
  findMatchingOldHunk,
  hunksMatchContent,
  lineCounts,
  patchLines,
} from './diff.mjs';

export const SNAPSHOT_VERSION = 1;

export const missing = () => ({ status: 'missing' });
export const full = text => ({ status: 'full', text });
export const binary = byteLength => ({ status: 'binary', byteLength });
export const tooLarge = byteLength => ({ status: 'too-large', byteLength });

export const agentEdit = turn => ({ type: 'agentEdit', turn });
export const externalEditOnAgentFile = () => ({ type: 'externalEditOnAgentFile' });
export const external = () => ({ type: 'external' });

export const isAgentEdit = source => source.type === 'agentEdit';

function sameContent(a, b) {
  if (a.status !== b.status) return false;
  return a.status === 'full' ? a.text === b.text : true;
}

function view(state) {
  return state.status === 'full' ? { status: 'full', byteLength: Buffer.byteLength(state.text, 'utf8') } : { ...state };
}

export class HunkTracker {
  #files = new Map();
  #stats = { acceptedHunks: 0, rejectedHunks: 0, acceptedLinesAdded: 0, acceptedLinesRemoved: 0, rejectedLinesAdded: 0, rejectedLinesRemoved: 0 };
  #now;

  constructor({ now = () => Date.now() } = {}) {
    this.#now = now;
  }

  get stats() {
    return { ...this.#stats };
  }

  has(key) {
    return this.#files.has(key);
  }

  keys() {
    return [...this.#files.keys()];
  }

  file(key) {
    const state = this.#files.get(key);
    if (!state) return undefined;
    return { key, path: state.path, baseline: view(state.baseline), current: view(state.current), hunks: state.hunks.map(hunk => ({ ...hunk })), isAgentFile: state.isAgentFile, baselineAccepted: state.baselineAccepted };
  }

  baselineText(key) {
    const state = this.#files.get(key);
    return state?.baseline.status === 'full' ? state.baseline.text : undefined;
  }

  currentText(key) {
    const state = this.#files.get(key);
    return state?.current.status === 'full' ? state.current.text : undefined;
  }

  /** `before` seeds the baseline of a file seen for the first time. */
  recordAgentWrite({ key, path, before, after, turn }) {
    let state = this.#files.get(key);
    if (!state) {
      state = { path, baseline: before ?? missing(), current: missing(), hunks: [], isAgentFile: true, baselineAccepted: false };
      this.#files.set(key, state);
    }
    state.isAgentFile = true;
    state.path = path;
    return this.#recompute(key, state, after, agentEdit(turn));
  }

  /** Record the content found on disk outside an agent write; new files become external-only tracked files. */
  recordExternalContent({ key, path, baseline, current }) {
    let state = this.#files.get(key);
    if (!state) {
      state = { path, baseline: baseline ?? missing(), current: missing(), hunks: [], isAgentFile: false, baselineAccepted: false };
      this.#files.set(key, state);
    }
    if (sameContent(state.current, current)) return { changed: false, hunks: state.hunks.map(hunk => ({ ...hunk })) };
    return this.#recompute(key, state, current, state.isAgentFile ? externalEditOnAgentFile() : external());
  }

  forget(key) {
    return this.#files.delete(key);
  }

  #recompute(key, state, current, source) {
    const oldHunks = state.hunks;
    state.current = current;
    const now = this.#now();
    let hunks = [];
    const { baseline } = state;
    if (baseline.status === 'full' && current.status === 'full') hunks = computeHunks(state.path, baseline.text, current.text, source, now);
    else if (baseline.status === 'full' && current.status === 'missing') hunks = baseline.text === '' ? [] : [fileDeletedHunk(state.path, baseline.text, source, now)];
    else if (baseline.status === 'missing' && current.status === 'full') hunks = current.text === '' ? [] : [fileCreatedHunk(state.path, current.text, source, now)];

    const claimed = new Set();
    for (const hunk of hunks) {
      const match = findMatchingOldHunk(hunk, oldHunks);
      if (!match || claimed.has(match.id)) continue;
      claimed.add(match.id);
      hunk.id = match.id;
      hunk.createdAt = match.createdAt;
      // An untouched hunk keeps its origin; a reshaped one takes the latest agent turn,
      // and an external reshaping of an agent hunk stays attributed to the agent.
      if (hunksMatchContent(match, hunk) || (!isAgentEdit(hunk.source) && isAgentEdit(match.source))) hunk.source = match.source;
    }
    state.hunks = hunks;
    return { changed: true, hunks: hunks.map(hunk => ({ ...hunk })) };
  }

  #find(hunkId) {
    for (const [key, state] of this.#files) {
      const hunk = state.hunks.find(entry => entry.id === hunkId);
      if (hunk) return { key, state, hunk };
    }
    return undefined;
  }

  #count(hunk, accepted) {
    const stats = this.#stats;
    if (accepted) { stats.acceptedHunks += 1; stats.acceptedLinesAdded += hunk.newCount; stats.acceptedLinesRemoved += hunk.oldCount; }
    else { stats.rejectedHunks += 1; stats.rejectedLinesAdded += hunk.newCount; stats.rejectedLinesRemoved += hunk.oldCount; }
  }

  /** Fold one hunk into the baseline so it stops being pending. */
  accept(hunkId) {
    const found = this.#find(hunkId);
    if (!found) return false;
    const { state, hunk } = found;
    this.#count(hunk, true);
    if (state.baseline.status === 'missing' || state.current.status !== 'full') state.baseline = state.current;
    else state.baseline = full(patchLines(state.baseline.text, hunk.oldStart, hunk.oldCount, hunk.newText));
    state.baselineAccepted = true;
    const remaining = state.hunks.filter(entry => entry.id !== hunk.id);
    state.hunks = remaining;
    this.#recompute(found.key, state, state.current, remaining[0]?.source ?? external());
    return true;
  }

  /**
   * Compute the content that reverts one hunk. Returns the write the caller
   * must perform (`{ content }` to write, `{ content: null }` to delete) and
   * applies the new current content to the tracked state.
   */
  reject(hunkId) {
    const found = this.#find(hunkId);
    if (!found) return undefined;
    const { key, state, hunk } = found;
    let next;
    if (state.current.status === 'missing' && state.baseline.status === 'full') next = state.baseline;
    else if (state.baseline.status === 'missing' && state.current.status === 'full') next = missing();
    else if (state.current.status === 'full') next = full(patchLines(state.current.text, hunk.newStart, hunk.newCount, hunk.oldText ?? ''));
    else return undefined;
    this.#count(hunk, false);
    state.hunks = state.hunks.filter(entry => entry.id !== hunk.id);
    this.#recompute(key, state, next, state.hunks[0]?.source ?? external());
    return { key, path: state.path, content: next.status === 'full' ? next.text : null };
  }

  /** Pending hunks, optionally narrowed to a file, an agent turn, or an attribution class. */
  pending({ key, turn, source } = {}) {
    const result = [];
    for (const [fileKey, state] of this.#files) {
      if (key !== undefined && fileKey !== key) continue;
      for (const hunk of state.hunks) {
        if (turn !== undefined && !(isAgentEdit(hunk.source) && hunk.source.turn === turn)) continue;
        if (source === 'agent' && !isAgentEdit(hunk.source)) continue;
        if (source === 'external' && isAgentEdit(hunk.source)) continue;
        result.push({ key: fileKey, ...hunk });
      }
    }
    return result;
  }

  files() {
    return [...this.#files].map(([key, state]) => ({
      key,
      path: state.path,
      hunkCount: state.hunks.length,
      hasAgentChanges: state.hunks.some(hunk => isAgentEdit(hunk.source)),
      hasExternalChanges: state.hunks.some(hunk => !isAgentEdit(hunk.source)),
      isAgentFile: state.isAgentFile,
      baseline: view(state.baseline),
      current: view(state.current),
    }));
  }

  summary() {
    const turns = new Map();
    let pendingHunks = 0;
    let unattributedPending = 0;
    let filesWithPending = 0;
    let pendingAdded = 0;
    let pendingRemoved = 0;
    for (const state of this.#files.values()) {
      if (state.hunks.length > 0) filesWithPending += 1;
      for (const hunk of state.hunks) {
        pendingHunks += 1;
        pendingAdded += hunk.newCount;
        pendingRemoved += hunk.oldCount;
        if (!isAgentEdit(hunk.source)) { unattributedPending += 1; continue; }
        let entry = turns.get(hunk.source.turn);
        if (!entry) { entry = { turn: hunk.source.turn, files: new Set(), pendingHunks: [] }; turns.set(hunk.source.turn, entry); }
        entry.files.add(state.path);
        entry.pendingHunks.push({ ...hunk });
      }
    }
    return {
      stats: this.stats,
      turns: [...turns.values()].sort((a, b) => a.turn - b.turn).map(entry => ({ turn: entry.turn, files: [...entry.files].sort(), pendingHunks: entry.pendingHunks, ...renameCounts(lineCounts(entry.pendingHunks)) })),
      filesModified: this.#files.size,
      filesWithPending,
      pendingHunks,
      pendingLinesAdded: pendingAdded,
      pendingLinesRemoved: pendingRemoved,
      unattributedPending,
    };
  }

  snapshot() {
    return {
      version: SNAPSHOT_VERSION,
      stats: this.stats,
      files: [...this.#files].map(([key, state]) => ({ key, path: state.path, baseline: state.baseline, current: state.current, hunks: state.hunks, isAgentFile: state.isAgentFile, baselineAccepted: state.baselineAccepted })),
    };
  }

  static fromSnapshot(snapshot, options) {
    if (snapshot?.version !== SNAPSHOT_VERSION || !Array.isArray(snapshot.files)) throw new Error('unsupported hunk tracker snapshot');
    const tracker = new HunkTracker(options);
    for (const entry of snapshot.files) {
      if (typeof entry.key !== 'string' || typeof entry.path !== 'string' || !Array.isArray(entry.hunks)) throw new Error('malformed hunk tracker snapshot');
      tracker.#files.set(entry.key, { path: entry.path, baseline: entry.baseline, current: entry.current, hunks: entry.hunks.map(hunk => ({ ...hunk })), isAgentFile: entry.isAgentFile === true, baselineAccepted: entry.baselineAccepted === true });
    }
    for (const field of Object.keys(tracker.#stats)) {
      const value = snapshot.stats?.[field];
      if (Number.isInteger(value) && value >= 0) tracker.#stats[field] = value;
    }
    return tracker;
  }
}

function renameCounts({ added, removed }) {
  return { linesAdded: added, linesRemoved: removed };
}
