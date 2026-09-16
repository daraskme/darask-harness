import { isAbsolute, win32 } from 'node:path';

export const LOCAL_MODEL_ID = 'unseen-gemma4-26b-q4';
export const LOCAL_PROVIDER_ID = 'darask-local';

export function withoutLocalReasoningEffort(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) return request;
  const provider = String(request.provider ?? '');
  if (provider !== LOCAL_PROVIDER_ID && provider !== 'local') return request;
  if (!Object.hasOwn(request, 'reasoningEffort')) return request;
  const { reasoningEffort: _unused, ...rest } = request;
  return rest;
}
export const MODEL_DOWNLOAD = Object.freeze({
  repository: 'Jommarn/UNSEEN_Gemma_4_26B_NSFW-GGUF',
  revision: '44ce2d32c9633e672d26b002ad08426cd7bf4dd4',
  filename: 'UNSEEN_Gemma_4_26B_NSFW_Q4_K_M.gguf',
  bytes: 16796017312,
  sha256: '730c1bbe22729c7069e502098103ba3c2d66d8dc4e2912f5a986c8c15d06dcce',
});
export const defaultLocal = () => ({ baseUrl: 'http://127.0.0.1:18081/v1', modelFile: '', contextSize: 8192, gpuLayers: 999, autoStart: false });
export function modelEndpoint(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid local model URL'); }
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  const tailDns = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.[a-z0-9-]+\.ts\.net$/.test(url.hostname);
  const ip = url.hostname.split('.').map(Number);
  const tailIp = ip.length === 4 && ip[0] === 100 && ip[1] >= 64 && ip[1] <= 127 && ip.every(n => Number.isInteger(n) && n >= 0 && n <= 255);
  if (url.pathname !== '/v1' || url.username || url.password || url.search || url.hash ||
    !(loopback && url.protocol === 'http:' && Number(url.port) >= 1024 || tailDns && url.protocol === 'https:' || tailIp && url.protocol === 'http:' && Number(url.port) >= 1024)) throw new Error('Invalid local model URL: use loopback or a Tailscale API');
  return { url, loopback };
}
export function localModelHost(endpoint, identity) {
  if (endpoint.loopback) return true;
  const host = endpoint.url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const dns = String(identity?.dnsName ?? '').replace(/\.$/, '').toLowerCase();
  if (dns && host === dns) return true;
  return (Array.isArray(identity?.addresses) ? identity.addresses : []).some(addr => String(addr).toLowerCase() === host);
}
export function validateLocal(value, base = defaultLocal()) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !(k in defaultLocal()))) throw new Error('Invalid local model settings');
  const out = { ...base, ...value };
  modelEndpoint(out.baseUrl);
  if (typeof out.modelFile !== 'string' || /[\x00-\x1f]/.test(out.modelFile) || (out.modelFile && (!(isAbsolute(out.modelFile) || win32.isAbsolute(out.modelFile)) || !out.modelFile.toLowerCase().endsWith('.gguf')))) throw new Error('Invalid local GGUF model path');
  if (!Number.isInteger(out.contextSize) || out.contextSize < 2048 || out.contextSize > 262144) throw new Error('Invalid local context size');
  if (!Number.isInteger(out.gpuLayers) || out.gpuLayers < 0 || out.gpuLayers > 999) throw new Error('Invalid GPU layer count');
  if (typeof out.autoStart !== 'boolean') throw new Error('Invalid local model auto-start');
  return out;
}
export function localRoute(config) {
  const local = validateLocal(config.local);
  return { displayName: 'ローカルモデル', api: 'openai-completions', baseURL: local.baseUrl,
    apiKeyEnv: 'DARASK_LOCAL_API_KEY', retryPolicy: { mode: 'normal', maxRetries: 0 },
    models: [{ id: config.providers.local.model || LOCAL_MODEL_ID, name: config.providers.local.model || LOCAL_MODEL_ID,
      input: ['text'], contextWindow: local.contextSize, maxTokens: Math.min(2048, local.contextSize / 2) }],
    compat: { supportsStore: false, supportsDeveloperRole: false, supportsReasoningEffort: false, supportsUsageInStreaming: true, maxTokensField: 'max_tokens', chatTemplateKwargs: { enable_thinking: false } },
  };
}
