import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const EMPTY = () => ({
  plans: {},
  memories: [],
  checkpoints: [],
  kanban: { columns: ['backlog', 'doing', 'review', 'done'], cards: [] },
  cleanup: { tracked: [] },
  achievements: { earned: {}, stats: { tools: 0, cleanups: 0, warnings: 0, compact: 0, images: 0 } },
  compact: { spills: [] },
  lessons: [],
  subagents: [],
  traces: [],
});

export function createAddonState(directory) {
  const filename = join(directory, 'addons-state.json');
  let value = EMPTY();
  let queue = Promise.resolve();
  const persist = mutator => {
    const task = queue.catch(() => {}).then(async () => {
      const next = mutator(structuredClone(value)) ?? value;
      await mkdir(directory, { recursive: true });
      const temporary = join(directory, `addons-state.${randomUUID()}.tmp`);
      await writeFile(temporary, `${JSON.stringify(next)}\n`, { mode: 0o600 });
      await rename(temporary, filename);
      value = next;
      return structuredClone(value);
    });
    queue = task;
    return task;
  };
  return {
    directory,
    async load() {
      try {
        const parsed = JSON.parse(await readFile(filename, 'utf8'));
        value = { ...EMPTY(), ...(parsed && typeof parsed === 'object' ? parsed : {}) };
        value.kanban = { columns: EMPTY().kanban.columns, ...(value.kanban ?? {}) };
        value.cleanup = { tracked: [], ...(value.cleanup ?? {}) };
        value.achievements = { earned: {}, stats: EMPTY().achievements.stats, ...(value.achievements ?? {}) };
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      return structuredClone(value);
    },
    get() { return structuredClone(value); },
    update: persist,
  };
}

export function newId(prefix) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}
