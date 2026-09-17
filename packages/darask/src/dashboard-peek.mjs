export function createPeekReader(request, update) {
  let active;
  return {
    async read(target, offset, append) {
      active?.abort();
      const controller = new AbortController();
      active = controller;
      update(current => ({ ...current, loading: true, error: '' }));
      try {
        const value = await request({ action: 'read', node: target.node, cwd: target.cwd, sessionId: target.id, offset, limit: 50 },
          AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]));
        if (active !== controller) return;
        update(current => ({ items: append ? [...current.items, ...value.items] : value.items, loading: false, error: '', nextOffset: value.nextOffset ?? null, notice: value.notice ?? '' }));
      } catch (error) {
        if (active === controller) update(current => ({ ...current, loading: false, error: error.message }));
      } finally {
        if (active === controller) active = undefined;
      }
    },
    cancel() { const controller = active; active = undefined; controller?.abort(); },
  };
}
