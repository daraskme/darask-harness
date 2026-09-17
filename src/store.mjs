import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultConfig, validateConfig } from './config.mjs';

/** Contains preferences only. Credentials belong to DSH's credential service. */
export function createStore(directory) {
  const filename = join(directory, 'preferences.json');
  let value = defaultConfig();
  let queue = Promise.resolve();
  return {
    async load() {
      try { value = validateConfig(JSON.parse(await readFile(filename, 'utf8'))); }
      catch (error) { if (error.code !== 'ENOENT') throw new Error('Cannot read DARASK preferences; repair preferences.json before starting.'); }
      return structuredClone(value);
    },
    get() { return structuredClone(value); },
    save(input) {
      const task = queue.catch(() => {}).then(async () => {
        const candidate = validateConfig(input, value);
        await mkdir(directory, { recursive: true });
        const temporary = join(directory, `preferences.${randomUUID()}.tmp`);
        await writeFile(temporary, `${JSON.stringify(candidate, null, 2)}\n`, { mode: 0o600 });
        await rename(temporary, filename);
        value = candidate;
        return structuredClone(value);
      });
      queue = task;
      return task;
    },
  };
}
