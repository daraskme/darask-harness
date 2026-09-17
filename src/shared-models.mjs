import { LlmAdapter } from '@deepseek-ai/dsh-llm';

const PREFIX = 'darask-shared-';

/** Separate routes preserve each PC's native settings and credentials. */
export function createSharedModels({ llm, relay }) {
  let groups = [], node = null, registration, disposed = false, generation = 0;
  class SharedAdapter extends LlmAdapter {
    providerInfo(provider) {
      return { id: provider, name: `🌐 ${groups.find(group => PREFIX + group.id === provider)?.name ?? provider}（認証元）` };
    }
    async listModels(provider) {
      if (!node || node !== relay.selectedNode()) throw new Error('モデルの認証元を確認してください。');
      return (groups.find(group => PREFIX + group.id === provider)?.models ?? []).map(model => ({ ...model, provider }));
    }
    async resolveModel(provider, model, signal) {
      const captured = node;
      if (!captured || captured !== relay.selectedNode()) throw new Error('モデルの認証元を確認してください。');
      const info = await relay.sharedModels(provider.slice(PREFIX.length), model, signal);
      if (disposed || captured !== node || captured !== relay.selectedNode()) throw new Error('モデルの認証元が変更されました。');
      return { ...info, provider };
    }
    async prepareCall(provider, model, signal) {
      const captured = node;
      const info = await this.resolveModel(provider, model, signal);
      return { model: info, stream: options => relay.sharedStream({ ...options, provider: provider.slice(PREFIX.length) }, captured) };
    }
    async *stream(options) {
      const prepared = await this.prepareCall(options.provider, options.model, options.signal);
      yield* prepared.stream(options);
    }
  }
  const adapter = new SharedAdapter();
  return {
    async refresh() {
      const own = ++generation, selected = relay.selectedNode();
      if (node !== selected) { registration?.(); registration = undefined; groups = []; node = null; }
      const value = selected ? await relay.sharedModels() : null;
      if (disposed || own !== generation || selected !== relay.selectedNode()) return;
      const next = (value?.groups ?? []).filter(group => typeof group.id === 'string' && !group.id.startsWith(PREFIX) && Array.isArray(group.models) && group.models.length);
      if (JSON.stringify(next) === JSON.stringify(groups) && node === selected) return;
      groups = next; node = selected;
      const routes = groups.map(group => PREFIX + group.id);
      if (!routes.length) { registration?.(); registration = undefined; }
      else if (registration) registration.replace(routes);
      else registration = llm.registerAdapter(routes, adapter);
    },
    dispose() { disposed = true; generation++; registration?.(); registration = undefined; },
  };
}
