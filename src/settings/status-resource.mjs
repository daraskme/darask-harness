import { createUpstreamClient } from '../upstream-client.mjs'

export function createStatusResource() {
  let snapshot = { data: null, loading: true, error: null, pending: null }
  const listeners = new Set()
  const requests = new Set()
  let timer
  let stopped = false
  let reading
  let generation = 0
  const lifetime = new AbortController()
  const upstream = Object.fromEntries(['grok', 'codex'].map(id => [id, createUpstreamClient(id)]))
  const overlays = new Map()
  const publish = patch => {
    if (stopped) return
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) listener()
  }
  const request = async (path, options = {}) => {
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 30000
    const { timeoutMs: _timeoutMs, ...fetchOptions } = options
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    requests.add(controller)
    try {
      const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...fetchOptions, signal: controller.signal })
      const body = await response.json().catch(() => null)
      if (!response.ok || body?.error) throw new Error(typeof body?.error === 'string' ? body.error : `HTTP ${response.status}`)
      if (!body || typeof body !== 'object') throw new Error('Invalid status response')
      return body
    } finally {
      clearTimeout(timeout)
      requests.delete(controller)
    }
  }
  const overlayStatus = (id, value) => {
    const previous = overlays.get(id)
    const pendingUrl = value.login?.status === 'running' ? previous?.login?.url : undefined
    const confirmation = previous?.logoutConfirmation
    const validConfirmation = confirmation?.required && Date.parse(confirmation.expiresAt) > Date.now() && value.auth === 'authenticated'
    const merged = {
      ...value,
      ...(pendingUrl && !value.login?.url ? { login: { ...value.login, url: pendingUrl } } : {}),
      ...(validConfirmation && !value.logoutConfirmation ? { logoutConfirmation: confirmation } : {}),
    }
    overlays.set(id, merged)
    return merged
  }
  const mergedStatus = data => ({ ...data, providers: (data.providers ?? []).map(provider => ({ ...provider, ...overlays.get(provider.id) })) })
  const readUpstream = async (ids, ownGeneration = generation) => {
    await Promise.all(ids.map(async id => {
      const value = await upstream[id].status({ signal: lifetime.signal })
      if (ownGeneration === generation) overlayStatus(id, value)
    }))
  }
  const load = () => {
    if (stopped || reading) return reading ?? Promise.resolve()
    const ownGeneration = generation
    reading = request('/api/darask/status').then(async data => {
      await readUpstream(Object.keys(upstream).filter(id => data.providers?.some(provider => provider.id === id)), ownGeneration)
      if (ownGeneration === generation) publish({ data: mergedStatus(data), loading: false, error: null })
    }).catch(error => {
      if (ownGeneration === generation) publish({ loading: false, error: error.message })
    }).finally(() => { reading = undefined })
    return reading
  }
  const poll = () => {
    clearTimeout(timer)
    if (stopped || listeners.size === 0) return
    const signingIn = snapshot.data?.providers?.some(provider => ['pending', 'waiting', 'authorizing', 'running'].includes(provider.login?.status))
    const loadingLocal = snapshot.data?.providers?.some(provider => provider.id === 'local' && ['starting', 'stopping'].includes(provider.localRuntime?.phase))
    timer = setTimeout(async () => { if (!snapshot.pending) await load(); poll() }, signingIn || loadingLocal ? 2000 : 15000)
  }
  const action = async payload => {
    if (stopped || snapshot.pending) throw new Error('Another action is in progress')
    generation += 1
    publish({ pending: `${payload.action}:${payload.provider ?? ''}`, error: null })
    try {
      if (upstream[payload.provider] && ['login', 'logout', 'cancelLogin', 'selectAccount', 'removeAccount', 'submitCallback'].includes(payload.action)) {
        const result = await upstream[payload.provider][payload.action]({ ...payload, signal: lifetime.signal })
        // A second explicit logout click consumes the previous confirmation.
        if (payload.action === 'logout') overlays.delete(payload.provider)
        overlayStatus(payload.provider, result)
        if (snapshot.data) publish({ data: mergedStatus(snapshot.data) })
        return result
      }
      const result = await request('/api/darask/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        timeoutMs: payload.action === 'testLocal' ? 90000 : 30000,
      })
      if (Array.isArray(result.providers)) {
        await readUpstream(Object.keys(upstream).filter(id => !payload.provider || payload.provider === id))
        publish({ data: mergedStatus(result), loading: false })
      }
      else { if (reading) await reading; await load() }
      return result
    } catch (error) {
      publish({ error: error.message })
      throw error
    } finally {
      publish({ pending: null })
      poll()
    }
  }
  return {
    source: {
      getSnapshot: () => snapshot,
      subscribe(listener) {
        listeners.add(listener)
        if (listeners.size === 1) { void load(); poll() }
        return () => { listeners.delete(listener); if (listeners.size === 0) clearTimeout(timer) }
      },
    },
    load, action,
    dispose() {
      stopped = true
      lifetime.abort()
      clearTimeout(timer)
      for (const controller of requests) controller.abort()
      listeners.clear()
    },
  }
}
