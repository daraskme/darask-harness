export function completeOpenRouterRedirect(win = globalThis.window, fetchImpl = globalThis.fetch) {
  if (!win?.location?.href || typeof fetchImpl !== 'function') return undefined
  const url = new URL(win.location.href)
  const keys = [...url.searchParams.keys()]
  if (url.pathname !== '/' || url.searchParams.get('darask_openrouter_callback') !== '1'
    || new Set(keys).size !== keys.length || keys.some(key => !['darask_openrouter_callback', 'state', 'code'].includes(key))
    || !url.searchParams.get('state') || !url.searchParams.get('code')) return undefined
  const callbackUrl = url.href
  win.history?.replaceState?.(win.history.state, '', `${url.origin}/`)
  return fetchImpl('/api/darask/action', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'submitCallback', provider: 'openrouter', config: { callbackUrl } }),
  }).then(response => { if (!response.ok) throw new Error('OpenRouter callback failed') })
}

function autoPermissionIcon(doc) {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = doc.createElementNS(ns, 'svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')
  const shield = doc.createElementNS(ns, 'path')
  shield.setAttribute('d', 'M8.20554 0.9L14.7901 3.36857V7.01026C14.7901 12 11.0466 14.2103 8.20554 15.3C5.36446 14.2103 1.62012 12 1.62012 7.01026V3.36857L8.20554 0.9Z')
  shield.setAttribute('stroke', 'currentColor')
  shield.setAttribute('stroke-width', '1.31831')
  shield.setAttribute('stroke-linejoin', 'round')
  const bolt = doc.createElementNS(ns, 'path')
  bolt.setAttribute('d', 'M8.9 4.35 6.35 8.15h1.55L7.1 11.65 9.7 7.7H8.1L8.9 4.35Z')
  bolt.setAttribute('fill', 'currentColor')
  svg.append(shield, bolt)
  const wrap = doc.createElement('span')
  wrap.className = 'darask-auto-permission-icon'
  wrap.setAttribute('aria-hidden', 'true')
  wrap.append(svg)
  return wrap
}

export function decorateAutoPermissionIcons(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return undefined
  const doc = root.ownerDocument ?? root
  const paint = () => {
    for (const item of root.querySelectorAll('[role="menuitem"]')) {
      if (item.querySelector('.darask-auto-permission-icon')) continue
      const label = [...item.children].find(node => node.tagName === 'SPAN' && !node.querySelector('svg'))?.textContent?.trim()
      if (label !== '自動') continue
      item.insertBefore(autoPermissionIcon(doc), item.firstChild)
    }
    for (const trigger of root.querySelectorAll('button[aria-label*="自動"]')) {
      if (trigger.querySelector('.darask-auto-permission-icon, span[class*="triggerIcon"]')) continue
      trigger.insertBefore(autoPermissionIcon(doc), trigger.firstChild)
    }
  }
  paint()
  if (typeof MutationObserver !== 'function') return undefined
  const observer = new MutationObserver(paint)
  try {
    observer.observe(root.documentElement ?? root, { childList: true, subtree: true })
  } catch {
    return undefined
  }
  return () => observer.disconnect()
}
