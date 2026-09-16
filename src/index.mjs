import { readFile } from 'node:fs/promises';
import Schema from '@deepseek-ai/schemastery';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { listShippedPresets, syncPreset } from './presets.mjs';

const release = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;

export const name = 'darask-harness';
export const Config = Schema.object({
  syncPresets: Schema.boolean().default(true),
  dshHome: Schema.string().default(''),
});

/**
 * Host-plane glue for the darask-harness profile. The feature plugins
 * (dsh-darask, @darask/dsh-hashline, providers, gateway) are composed by
 * cordis.patch.yml; this row only publishes the shipped agent presets into
 * `$DSH_HOME/.agent-presets` so `agent-presets.default: darask` resolves.
 */
export async function apply(ctx, config) {
  ctx.logger.info(`darask-harness ${release}`);
  if (!config.syncPresets) return;
  const dshHome = config.dshHome || resolveDshHome();
  for (const id of await listShippedPresets()) {
    try {
      const result = await syncPreset({ id, dshHome, version: release });
      if (result.status === 'user-owned' || result.status === 'conflict') {
        ctx.logger.warn(`darask-harness: preset "${id}" は ${result.target} に既に存在するため上書きしませんでした。`);
      } else if (result.status !== 'unchanged') {
        ctx.logger.info(`darask-harness: preset "${id}" を ${result.target} に${result.status === 'created' ? '作成' : '更新'}しました。`);
      }
    } catch (error) {
      ctx.logger.warn(`darask-harness: preset "${id}" を配置できませんでした: ${error.message}`);
    }
  }
}
