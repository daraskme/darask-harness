import React, { useState } from 'react'
import { Button, Input, Switch, Tag, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { date, percentage, number, message, label } from './settings/format.mjs'

export function hasUsage(usage) {
  if (!usage) return false
  return (usage.windows ?? []).some(window => percentage(window.remainingPercent) !== null || percentage(window.usedPercent) !== null)
    || usage.credits?.unlimited === true
    || (usage.credits?.balance !== null && usage.credits?.balance !== undefined && /^-?\d+(?:\.\d+)?$/u.test(String(usage.credits.balance)))
    || usage.individualLimit?.remaining !== undefined
    || Number.isFinite(usage.used?.amount)
    || ['promptTokens', 'generatedTokens'].some(key => Number.isFinite(usage.local?.[key]))
}

export function Usage({ usage, t, compact = false }) {
  const windows = Array.isArray(usage?.windows) ? usage.windows : []
  const credits = usage?.credits
  const creditValue = typeof credits?.balance === 'number' && Number.isFinite(credits.balance) ? number(credits.balance, t)
    : typeof credits?.balance === 'string' && /^-?\d+(?:\.\d+)?$/u.test(credits.balance) ? credits.balance : null
  const hasCredit = credits?.unlimited === true || creditValue !== null
  const individual = usage?.individualLimit
  const spent = usage?.used
  const status = usage?.stale === true && usage?.status === 'available' ? 'stale' : usage?.status
  return <div className="darask-usage" aria-label={t('usage')}>
    {status && ['unavailable', 'unsupported', 'error', 'stale'].includes(status) && <Tag tone={status === 'error' ? 'warning' : 'neutral'}>{t(status === 'unsupported' ? 'unavailable' : status)}</Tag>}
    {windows.map((window, index) => {
      const reportedRemaining = percentage(window.remainingPercent)
      const reportedUsed = percentage(window.usedPercent)
      const remaining = reportedRemaining ?? (reportedUsed === null ? null : 100 - reportedUsed)
      const reset = date(window.resetsAt, t)
      return <div className="darask-window" key={window.id ?? index}>
        <div className="darask-line"><span>{label(window.label ?? window.id ?? t('usage'), t)}</span><strong>{remaining === null ? t('unknown') : `${t('remaining')} ${number(remaining, t)}%`}</strong></div>
        {remaining !== null && <progress className={remaining <= 10 ? 'darask-progress darask-progress-low' : 'darask-progress'} max="100" value={remaining} aria-label={`${label(window.label ?? t('usage'), t)} ${t('remaining')}`} />}
        {reset && <span className="darask-meta">{t('resets')}: {reset}</span>}
      </div>
    })}
    {hasCredit && <div className="darask-line darask-credit"><span>{label(credits.label ?? t(credits.scope === 'key-limit' ? 'keyAllowance' : 'credit'), t)}</span><strong>{credits.unlimited === true ? t('unlimited') : creditValue} {credits.unit ?? ''}</strong></div>}
    {individual && <div className="darask-window"><div className="darask-line"><span>{t('individualLimit')}</span><strong>{t('remaining')} {individual.remaining}</strong></div><div className="darask-meta">{t('used')}: {individual.used} · {t('limit')}: {individual.limit}</div></div>}
    {usage?.local && <div className="darask-meta darask-sources">{['promptTokens', 'generatedTokens'].map(key => typeof usage.local[key] === 'number' && <span key={key}>{t(key === 'promptTokens' ? 'localPrompt' : 'localGenerated')}: {number(usage.local[key], t)}</span>)}</div>}
    {spent && typeof spent.amount === 'number' && Number.isFinite(spent.amount) && <div className="darask-spent"><div className="darask-line"><span>{t(spent.scope === 'complimentary-daily' ? 'complimentaryUsage' : 'keyUsage')}</span><strong>{number(spent.amount, t)} {spent.unit ?? ''}</strong></div><div className="darask-meta darask-sources">{['daily', 'weekly', 'monthly'].filter(period => typeof spent[period] === 'number' && Number.isFinite(spent[period])).map(period => <span key={period}>{t(period)}: {number(spent[period], t)} {spent.unit ?? ''}</span>)}</div></div>}
    {!hasUsage(usage) && <p className="darask-muted">{usage?.message ? message(usage.message, t, t('unknownUsage')) : t('unknownUsage')}</p>}
    {!compact && usage?.message && hasUsage(usage) && <p className="darask-muted">{message(usage.message, t, t('unknownUsage'))}</p>}
    {!compact && (usage?.source || usage?.updatedAt) && <div className="darask-meta darask-sources">
      {usage.source && <span>{t('source')}: {String(usage.source)}</span>}
      {date(usage.updatedAt, t) && <span>{t('updated')}: {date(usage.updatedAt, t)}</span>}
    </div>}
  </div>
}

function UsageList({ data, t, compact }) {
  const providers = (data?.providers ?? []).flatMap(provider => provider.id === 'codex' && provider.accounts?.length
    ? provider.accounts.map(account => ({ id: account.accountKey, name: `Codex · ${account.displayName}`, active: account.active, usage: account.usage }))
    : hasUsage(provider.usage) || (provider.id === 'claude' && provider.auth === 'authenticated') ? [provider] : [])
  const run = data?.browserRun
  const browserUsage = run?.configured && Number.isFinite(run.observedMs)
  return <>
    {providers.map(provider => <article key={provider.id} className="darask-provider">
      <header className="darask-provider-header"><h3>{provider.id === 'local' ? t('localTitle') : provider.name ?? provider.id}</h3>{provider.active && <Tag tone="success">使用中</Tag>}</header>
      <Usage usage={provider.usage} t={t} compact={compact} />
    </article>)}
    {browserUsage && <article className="darask-provider"><header className="darask-provider-header"><h3>Cloudflare Browser Run</h3></header><div className="darask-usage"><div className="darask-line"><span>{t('observedTime')}</span><strong>{number(run.observedMs / 1000, t)} {t('seconds')}</strong></div>{!compact && <p className="darask-muted">{t('browserUsageHint')}</p>}</div></article>}
    {!providers.length && !browserUsage && <p className="darask-muted">{t('usageEmpty')}</p>}
  </>
}

export function UsageSidebar(props) {
  const state = props.useDaraskStatus(snapshot => snapshot)
  const [open, setOpen] = useState(false)
  const { t, wide } = props
  const refresh = () => { void props.action({ action: 'refresh' }).catch(() => {}) }
  return <div className="darask-usage-sidebar" data-wide={wide}>
    <button className="darask-usage-trigger" type="button" aria-label={t('usageDetails')} title={t('usageTitle')} onClick={() => setOpen(true)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 20V12M10 20V4M16 20V8M22 20H2" /></svg>{wide && <span>{t('usageTitle')}</span>}
    </button>
    {wide && <div className="darask darask-usage-summary">
      {state.loading && !state.data ? <p className="darask-muted">{t('loading')}</p> : <UsageList data={state.data} t={t} compact />}
      {state.error && <p className="darask-error" role="alert">{message(state.error, t, t('loadFailed'))}</p>}
    </div>}
    <Modal open={open} onClose={() => setOpen(false)} title={t('usageTitle')} closeLabel={t('close')} className="darask-usage-modal">
      <div className="darask darask-usage-full"><Button variant="outline" disabled={!!state.pending || state.loading} onClick={refresh}>{t('refresh')}</Button>
        {state.error && <p className="darask-error" role="alert">{message(state.error, t, t('loadFailed'))}</p>}
        <UsageList data={state.data} t={t} /><p className="darask-muted">{t('creditHint')}</p>
      </div>
    </Modal>
  </div>
}
