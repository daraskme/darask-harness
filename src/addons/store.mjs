import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { GROUPS, PLUGIN_CATALOG, PLUGIN_IDS } from './catalog.mjs';

const FIELDS = Object.freeze(['langfuseHost', 'imageModel', 'telegramChatId', 'chromeProfile', 'r2AccountId', 'r2Bucket', 'r2PublicBase']);
const ACCOUNT = /^[a-f0-9]{32}$/i;
const BUCKET = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const HOST = /^(https?:\/\/)[^\s]+$/i;

export function defaultAddons() {
  return {
    enabled: Object.fromEntries(PLUGIN_IDS.map(id => [id, true])),
    securityBlock: false,
    langfuseHost: 'https://cloud.langfuse.com',
    imageModel: 'grok-imagine-image',
    telegramChatId: '',
    chromeProfile: '',
    r2AccountId: '',
    r2Bucket: '',
    r2PublicBase: '',
  };
}

export function validateAddons(input, base = defaultAddons()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid addons configuration');
  const allowed = new Set(['enabled', 'securityBlock', ...FIELDS]);
  if (Object.keys(input).some(key => !allowed.has(key))) throw new Error('Unknown addons field');
  const result = structuredClone(base);
  if (input.enabled !== undefined) {
    if (!input.enabled || typeof input.enabled !== 'object' || Array.isArray(input.enabled)) throw new Error('Invalid addons enabled map');
    for (const [id, value] of Object.entries(input.enabled)) {
      if (!PLUGIN_IDS.includes(id) || typeof value !== 'boolean') throw new Error('Invalid addon id');
      result.enabled[id] = value;
    }
  }
  if (input.securityBlock !== undefined) {
    if (typeof input.securityBlock !== 'boolean') throw new Error('Invalid securityBlock');
    result.securityBlock = input.securityBlock;
  }
  if (input.langfuseHost !== undefined) {
    if (typeof input.langfuseHost !== 'string' || input.langfuseHost.length > 2048 || (input.langfuseHost && !HOST.test(input.langfuseHost))) throw new Error('Invalid Langfuse host');
    result.langfuseHost = input.langfuseHost.replace(/\/$/, '');
  }
  if (input.imageModel !== undefined) {
    if (typeof input.imageModel !== 'string' || input.imageModel.length > 128 || /[\x00-\x1f]/.test(input.imageModel)) throw new Error('Invalid image model');
    result.imageModel = input.imageModel.trim() || 'grok-imagine-image';
  }
  if (input.telegramChatId !== undefined) {
    if (typeof input.telegramChatId !== 'string' || input.telegramChatId.length > 64 || /[^\w@-]/.test(input.telegramChatId)) throw new Error('Invalid Telegram chat id');
    result.telegramChatId = input.telegramChatId;
  }
  if (input.chromeProfile !== undefined) {
    if (typeof input.chromeProfile !== 'string' || input.chromeProfile.length > 1024 || /[\x00-\x1f]/.test(input.chromeProfile)) throw new Error('Invalid Chrome profile');
    result.chromeProfile = input.chromeProfile;
  }
  if (input.r2AccountId !== undefined) {
    if (typeof input.r2AccountId !== 'string' || (input.r2AccountId && !ACCOUNT.test(input.r2AccountId))) throw new Error('Invalid R2 account id');
    result.r2AccountId = input.r2AccountId.trim().toLowerCase();
  }
  if (input.r2Bucket !== undefined) {
    if (typeof input.r2Bucket !== 'string' || (input.r2Bucket && !BUCKET.test(input.r2Bucket))) throw new Error('Invalid R2 bucket');
    result.r2Bucket = input.r2Bucket.trim();
  }
  if (input.r2PublicBase !== undefined) {
    if (typeof input.r2PublicBase !== 'string' || input.r2PublicBase.length > 2048 || (input.r2PublicBase && !HOST.test(input.r2PublicBase))) throw new Error('Invalid R2 public base');
    result.r2PublicBase = input.r2PublicBase.replace(/\/$/, '');
  }
  return result;
}

export function createAddonStore(directory) {
  const filename = join(directory, 'addons.json');
  let value = defaultAddons();
  let queue = Promise.resolve();
  return {
    async load() {
      try { value = validateAddons(JSON.parse(await readFile(filename, 'utf8'))); }
      catch (error) { if (error.code !== 'ENOENT') throw new Error('Cannot read DARASK addons; repair addons.json before starting.'); }
      return structuredClone(value);
    },
    get() { return structuredClone(value); },
    enabled(id) { return value.enabled[id] === true; },
    save(input) {
      const task = queue.catch(() => {}).then(async () => {
        const candidate = validateAddons(input, value);
        await mkdir(directory, { recursive: true });
        const temporary = join(directory, `addons.${randomUUID()}.tmp`);
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

export function catalogStatus(store) {
  const current = store.get();
  return {
    securityBlock: current.securityBlock,
    langfuseHost: current.langfuseHost,
    imageModel: current.imageModel,
    telegramChatId: current.telegramChatId,
    chromeProfile: current.chromeProfile,
    r2AccountId: current.r2AccountId,
    r2Bucket: current.r2Bucket,
    r2PublicBase: current.r2PublicBase,
    groups: GROUPS.map(group => ({
      id: group.id, titleJa: group.titleJa, titleEn: group.titleEn,
      plugins: PLUGIN_CATALOG.filter(plugin => plugin.group === group.id).map(plugin => ({
        id: plugin.id, origin: plugin.origin, titleJa: plugin.titleJa, titleEn: plugin.titleEn,
        summaryJa: plugin.summaryJa, summaryEn: plugin.summaryEn, tools: plugin.tools,
        secrets: plugin.secrets ?? [], fields: plugin.fields ?? [],
        enabled: current.enabled[plugin.id] === true,
      })),
    })),
  };
}
