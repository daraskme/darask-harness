import path from 'node:path';
import { spawnBounded } from './providers/cli.mjs';
import { CATALOG, credentialValue } from './shared-credentials.mjs';

export const BITWARDEN_TOKEN = 'DARASK_BITWARDEN_ACCESS_TOKEN';
export const BITWARDEN_TARGETS = Object.freeze(CATALOG.map(({ ref, label, group, hint }) => Object.freeze({ ref, label, group, hint })));
const TARGET_REFS = new Set(BITWARDEN_TARGETS.map(target => target.ref));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function defaultBitwarden() {
  return { enabled: false, executable: '', secretIds: Object.fromEntries(BITWARDEN_TARGETS.map(target => [target.ref, ''])) };
}

export function validateBitwarden(input, base = defaultBitwarden()) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['enabled', 'executable', 'secretIds'].includes(key))) throw new Error('Invalid Bitwarden configuration');
  const result = structuredClone(base);
  if (input.enabled !== undefined) {
    if (typeof input.enabled !== 'boolean') throw new Error('Invalid Bitwarden enabled setting');
    result.enabled = input.enabled;
  }
  if (input.executable !== undefined) {
    if (typeof input.executable !== 'string' || input.executable.length > 2048 || /[\x00-\x1f]/.test(input.executable)) throw new Error('Invalid Bitwarden executable');
    const executable = input.executable.trim();
    if (executable && !(path.isAbsolute(executable) || path.win32.isAbsolute(executable))) throw new Error('Use an absolute Bitwarden executable path');
    result.executable = executable;
  }
  if (input.secretIds !== undefined) {
    if (!input.secretIds || typeof input.secretIds !== 'object' || Array.isArray(input.secretIds) || Object.keys(input.secretIds).some(ref => !TARGET_REFS.has(ref))) throw new Error('Invalid Bitwarden secret mapping');
    for (const [ref, id] of Object.entries(input.secretIds)) {
      if (typeof id !== 'string' || id && !UUID.test(id)) throw new Error('Invalid Bitwarden secret ID');
      result.secretIds[ref] = id;
    }
  }
  return result;
}

function childEnvironment(source, token) {
  const env = { BWS_ACCESS_TOKEN: token };
  for (const name of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'HOME', 'USERPROFILE', 'TEMP', 'TMP', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'SSL_CERT_FILE', 'SSL_CERT_DIR']) if (source[name]) env[name] = source[name];
  return env;
}

function secretObject(raw, expectedId) {
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('Bitwarden Secrets Manager returned invalid JSON'); }
  if (Array.isArray(value)) value = value.length === 1 ? value[0] : null;
  if (!value || typeof value !== 'object' || value.object !== 'secret' || value.id !== expectedId || !credentialValue(value.value)) throw new Error('Bitwarden Secrets Manager returned an invalid secret');
  return value.value;
}

export function createBitwarden({ credentials, run = spawnBounded, env = process.env, now = () => new Date().toISOString() } = {}) {
  let state = { configured: false, syncing: false, mapped: 0, lastSyncedAt: null, error: null };
  const status = config => ({ ...state, configured: Boolean(config?.enabled && config.executable && state.token && state.mapped), targets: BITWARDEN_TARGETS, config: structuredClone(config ?? defaultBitwarden()) });
  async function token() {
    const value = (await credentials.resolve(BITWARDEN_TOKEN))?.value;
    state.token = Boolean(value);
    return value;
  }
  async function getSecret(executable, id, accessToken, signal) {
    const operation = run({ command: executable, args: [], executable }, ['secret', 'get', id, '--output', 'json'], { timeoutMs: 30000, maxBytes: 128 * 1024, env: childEnvironment(env, accessToken) });
    const cancel = () => operation.cancel();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    try {
      const result = await operation.completion;
      if (signal?.aborted) throw signal.reason;
      if (result.error || result.code !== 0) throw new Error('Bitwarden Secrets Manager could not retrieve a configured secret');
      return secretObject(result.stdout, id);
    } finally { signal?.removeEventListener('abort', cancel); }
  }
  return {
    async status(config) {
      const accessToken = await token();
      state.mapped = Object.values(config?.secretIds ?? {}).filter(Boolean).length;
      return { ...status(config), configured: Boolean(config?.enabled && config.executable && accessToken && state.mapped) };
    },
    async save(config, accessToken) {
      validateBitwarden(config);
      if (accessToken !== undefined) {
        if (typeof accessToken !== 'string' || accessToken.length < 16 || accessToken.length > 8192 || /[\s\x00-\x1f]/.test(accessToken)) throw new Error('Invalid Bitwarden access token');
        await credentials.set(BITWARDEN_TOKEN, accessToken);
        state.token = true;
      }
    },
    async remove(config) {
      await credentials.unset(BITWARDEN_TOKEN);
      state = { configured: false, syncing: false, mapped: Object.values(config?.secretIds ?? {}).filter(Boolean).length, lastSyncedAt: state.lastSyncedAt, error: null, token: false };
      return status(config);
    },
    async sync(config, signal) {
      const validated = validateBitwarden(config);
      const entries = Object.entries(validated.secretIds).filter(([, id]) => id);
      state = { ...state, syncing: true, mapped: entries.length, error: null };
      try {
        if (!validated.enabled) throw new Error('Bitwarden Secrets Manager integration is disabled');
        if (!validated.executable) throw new Error('Bitwarden bws executable is not configured');
        if (!entries.length) throw new Error('No Bitwarden secret IDs are configured');
        const accessToken = await token();
        if (!accessToken) throw new Error('Bitwarden Machine Account access token is not configured');
        const values = [];
        for (const [ref, id] of entries) values.push([ref, await getSecret(validated.executable, id, accessToken, signal)]);
        for (const [ref, value] of values) await credentials.set(ref, value);
        state = { configured: true, syncing: false, mapped: entries.length, lastSyncedAt: now(), error: null, token: true };
        return status(validated);
      } catch (error) {
        state = { ...state, configured: false, syncing: false, error: error instanceof Error ? error.message : 'Bitwarden sync failed' };
        throw error;
      }
    },
  };
}
