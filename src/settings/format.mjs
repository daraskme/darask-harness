import { messageJa, labelJa } from '../locales/messages-ja.mjs'

export function safeUrl(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export function date(value, t) {
  if (value === undefined || value === null || value === '') return null
  const instant = new Date(typeof value === 'number' && value < 1e12 ? value * 1000 : value)
  return Number.isNaN(instant.getTime()) ? null : instant.toLocaleString(t('dateLocale'), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function percentage(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null
}

export function number(value, t) {
  return new Intl.NumberFormat(t('dateLocale'), { maximumFractionDigits: 2 }).format(value)
}
export const message = (value, t, fallback) => t('dateLocale') === 'ja-JP' ? messageJa(value, fallback ?? t('failed')) : value;
export const label = (value, t) => t('dateLocale') === 'ja-JP' ? labelJa(value) : value;

export function authentication(provider, t) {
  const auth = provider.auth
  const state = typeof auth === 'string' ? auth : auth?.status
  const connected = auth?.authenticated === true || ['authenticated', 'connected', 'logged-in', 'logged_in', 'ok'].includes(state)
  const label = connected ? t('connected') : ['disconnected', 'unauthenticated', 'logged-out', 'logged_out', 'missing'].includes(state) ? t('disconnected') : t('unknown')
  return { connected, label, account: typeof auth === 'object' ? auth?.account ?? auth?.email : null }
}
