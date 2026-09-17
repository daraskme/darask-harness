import stylesheet from './client.css'
import grokJa from './locales/grok-ja.mjs'
import codexJa from './locales/codex-ja.mjs'
import { registerWorkspaceUi } from './workspaces-client.jsx'
export { WorkspaceSetsEditor, WorkspaceSetBrowser, SessionFolderControls } from './workspace-sets-client.jsx'
export { WorkspaceGroups, RemoteWorkspaceRows, mergeWorkspaceGroup } from './workspaces-client.jsx'
import { DevelopmentPanel, RestartRow } from './development-client.jsx'
import { registerAddonsUi } from './addons-client.jsx'
import { registerSessionNavigation } from './session-navigation-client.jsx'
export { SessionNavigation, navigateSession, sessionNavigationState } from './session-navigation-client.jsx'

export const name = 'dsh-darask-client'
export const inject = ['slots', 'locale', 'layout', 'sidebarRightTabs', 'sessions']

import { NS, dictionaries } from './locales/settings.mjs'
import { createStatusResource } from './settings/status-resource.mjs'
import { completeOpenRouterRedirect, decorateAutoPermissionIcons } from './settings/client-effects.mjs'
import { DaraskPanel } from './settings/accounts.jsx'
import { UsageSidebar } from './usage-client.jsx'
export { hasUsage } from './usage-client.jsx'
export { completeOpenRouterRedirect, decorateAutoPermissionIcons } from './settings/client-effects.mjs'

export function apply(ctx) {
  void Promise.resolve(completeOpenRouterRedirect()).catch(() => {})
  registerWorkspaceUi(ctx)
  registerAddonsUi(ctx)
  registerSessionNavigation(ctx)
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'darask-development', order: 16, label: () => '開発・更新' }, DevelopmentPanel))
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({ name: 'settings.general.item', id: 'darask-restart', order: 100, locale: NS }, RestartRow))
  const resource = createStatusResource()
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-darask: locale')
  ctx.effect(() => ctx.locale.register('settings.grok', 'ja', grokJa), 'dsh-darask: Grok Japanese')
  ctx.effect(() => ctx.locale.register('settings.openai-codex', 'ja', codexJa), 'dsh-darask: Codex Japanese')
  // Custom permission labels come from cordis.patch.yml (name: 自動).
  // The native UI and locale-ja own settings.permission / permission.access.
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dshPlugin = 'dsh-darask'
    style.textContent = stylesheet
    document.head.appendChild(style)
    const stopIcons = decorateAutoPermissionIcons(document)
    return () => { resource.dispose(); style.remove(); stopIcons?.() }
  }, 'dsh-darask: UI lifetime')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'darask-accounts', order: 5, locale: NS, label: () => t('title'),
    inject: () => ({ hooks: { daraskStatus: resource.source }, action: resource.action, load: resource.load }),
  }, DaraskPanel))
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'darask-usage', order: 0, locale: NS,
    inject: () => ({ hooks: { daraskStatus: resource.source }, action: resource.action, load: resource.load }),
  }, UsageSidebar))
}
