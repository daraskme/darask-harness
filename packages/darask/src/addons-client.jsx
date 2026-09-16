import React, { useEffect, useState } from 'react'
import { Button, Input, Switch, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { addonsDictionaries as dictionaries } from './addons/locale.mjs'

function createAddonsResource() {
  let snapshot = { data: null, loading: true, error: null }
  const listeners = new Set()
  const publish = patch => { snapshot = { ...snapshot, ...patch }; for (const listener of listeners) listener() }
  const request = async (path, options = {}) => {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options, signal: AbortSignal.timeout(30000) })
    const body = await response.json().catch(() => null)
    if (!response.ok || body?.error) throw new Error(typeof body?.error === 'string' ? body.error : `HTTP ${response.status}`)
    return body
  }
  const load = async () => {
    publish({ loading: true, error: null })
    try { publish({ data: await request('/api/darask/addons'), loading: false }) }
    catch (error) { publish({ loading: false, error: error.message }) }
  }
  const action = async payload => {
    const data = await request('/api/darask/addons/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    publish({ data, error: null, loading: false })
    return data
  }
  return {
    load, action,
    source: { subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) }, getSnapshot: () => snapshot },
  }
}

function PluginCard({ plugin, enabled, secrets, fields, pending, t, onToggle, onField, onSecret }) {
  return <article className="darask-provider">
    <header className="darask-provider-header">
      <div className="darask-provider-name"><h3>{plugin.titleJa}</h3><span className="darask-meta">{plugin.summaryJa}</span></div>
      <Tag tone={enabled ? 'success' : 'neutral'}>{t(enabled ? 'enabled' : 'disabled')}</Tag>
      <Switch checked={enabled} disabled={pending} label={plugin.titleJa} onChange={onToggle} />
    </header>
    <div className="darask-usage">
      <p className="darask-muted">{t('origin')}: {plugin.origin}</p>
      {plugin.tools?.length > 0 && <p className="darask-meta">{t('tools')}: {plugin.tools.join(', ')}</p>}
      {plugin.id === 'security-guidance' && <label className="darask-field"><span>{t('securityBlock')}</span><Switch checked={fields.securityBlock} disabled={pending} label={t('securityBlock')} onChange={value => onField('securityBlock', value)} /><small>{t('securityBlockHint')}</small></label>}
      {(plugin.fields ?? []).map(field => <label className="darask-field" key={field}><span>{t(field)}</span><Input value={fields[field] ?? ''} disabled={pending} onChange={event => onField(field, event.target.value)} autoComplete="off" /></label>)}
      {(plugin.secrets ?? []).map(key => <label className="darask-field" key={key}><span>{key.replace('DARASK_', '')} · {t(secrets[key] ? 'configured' : 'missing')}</span><Input type="password" value={fields.secrets[key] ?? ''} disabled={pending} onChange={event => onSecret(key, event.target.value)} autoComplete="new-password" /><small>{t('secretHint')}</small></label>)}
    </div>
  </article>
}

function KanbanBoard({ board, t }) {
  if (!board) return null
  return <div className="darask-kanban" aria-label={t('kanban')}>
    {board.columns.map(column => <section key={column} className="darask-kanban-column"><h3>{column}</h3>
      {(board.cards ?? []).filter(card => card.column === column).map(card => <p key={card.id} className="darask-kanban-card">{card.title}<small>{card.id}</small></p>)}
      {(board.cards ?? []).every(card => card.column !== column) && <p className="darask-muted">{t('empty')}</p>}
    </section>)}
  </div>
}

function AddonsPanel({ resource, t }) {
  const [snap, setSnap] = useState(resource.source.getSnapshot())
  const [group, setGroup] = useState('deepseek')
  const [draft, setDraft] = useState(null)
  const [secrets, setSecrets] = useState({})
  const [saved, setSaved] = useState(false)
  useEffect(() => resource.source.subscribe(() => setSnap(resource.source.getSnapshot())), [resource])
  useEffect(() => { void resource.load() }, [resource])
  const data = snap.data
  const pending = snap.loading && !data
  const enabled = draft?.enabled ?? Object.fromEntries((data?.groups ?? []).flatMap(item => item.plugins.map(plugin => [plugin.id, plugin.enabled])))
  const fields = {
    securityBlock: draft?.securityBlock ?? data?.securityBlock ?? false,
    langfuseHost: draft?.langfuseHost ?? data?.langfuseHost ?? '',
    imageModel: draft?.imageModel ?? data?.imageModel ?? '',
    telegramChatId: draft?.telegramChatId ?? data?.telegramChatId ?? '',
    chromeProfile: draft?.chromeProfile ?? data?.chromeProfile ?? '',
    r2AccountId: draft?.r2AccountId ?? data?.r2AccountId ?? '',
    r2Bucket: draft?.r2Bucket ?? data?.r2Bucket ?? '',
    r2PublicBase: draft?.r2PublicBase ?? data?.r2PublicBase ?? '',
    secrets,
  }
  const dirty = draft !== null || Object.values(secrets).some(Boolean)
  const save = async () => {
    try {
      await resource.action({ action: 'save', config: { enabled, securityBlock: fields.securityBlock, langfuseHost: fields.langfuseHost, imageModel: fields.imageModel, telegramChatId: fields.telegramChatId, chromeProfile: fields.chromeProfile, r2AccountId: fields.r2AccountId, r2Bucket: fields.r2Bucket, r2PublicBase: fields.r2PublicBase }, secrets: Object.fromEntries(Object.entries(secrets).filter(([, value]) => value)) })
      setDraft(null); setSecrets({}); setSaved(true)
    } catch { setSaved(false) }
  }
  const groups = data?.groups ?? []
  const current = groups.find(item => item.id === group) ?? groups[0]
  return <section className="darask" aria-label={t('title')}>
    <header className="darask-heading"><div><h2>{t('title')}</h2><p>{t('description')}</p></div>
      <Button variant="outline" disabled={snap.loading} onClick={() => { void resource.load() }}>{t('refresh')}</Button></header>
    {snap.error && <div className="darask-error" role="alert"><span>{snap.error || t('loadFailed')}</span><Button size="sm" onClick={() => { void resource.load() }}>{t('retry')}</Button></div>}
    {pending && <p className="darask-muted">{t('loading')}</p>}
    {data && <>
      <div className="darask-account-tabs" role="tablist" aria-label={t('groups')}>
        {groups.map(item => <Button key={item.id} role="tab" aria-selected={current?.id === item.id} variant={current?.id === item.id ? 'primary' : 'outline'} onClick={() => setGroup(item.id)}>{item.titleJa}</Button>)}
      </div>
      <div className="darask-provider-list">
        {(current?.plugins ?? []).map(plugin => <PluginCard key={plugin.id} plugin={plugin} enabled={enabled[plugin.id] === true} secrets={data.secrets ?? {}} fields={fields} pending={snap.loading} t={t}
          onToggle={value => setDraft(currentDraft => ({ ...(currentDraft ?? { enabled, securityBlock: fields.securityBlock, langfuseHost: fields.langfuseHost, imageModel: fields.imageModel, telegramChatId: fields.telegramChatId, chromeProfile: fields.chromeProfile, r2AccountId: fields.r2AccountId, r2Bucket: fields.r2Bucket, r2PublicBase: fields.r2PublicBase }), enabled: { ...enabled, [plugin.id]: value } }))}
          onField={(key, value) => setDraft(currentDraft => ({ ...(currentDraft ?? { enabled, securityBlock: fields.securityBlock, langfuseHost: fields.langfuseHost, imageModel: fields.imageModel, telegramChatId: fields.telegramChatId, chromeProfile: fields.chromeProfile, r2AccountId: fields.r2AccountId, r2Bucket: fields.r2Bucket, r2PublicBase: fields.r2PublicBase }), [key]: value }))}
          onSecret={(key, value) => { setSecrets(currentSecrets => ({ ...currentSecrets, [key]: value })); setSaved(false) }}
        />)}
      </div>
      {current?.id === 'ops' && <div className="darask-addon-extra"><h3>{t('kanban')}</h3><KanbanBoard board={data.kanban} t={t} /><h3>{t('achievements')}</h3><pre className="darask-git-diff">{data.achievements}</pre></div>}
      <footer className="darask-footer"><span role="status">{dirty ? t('unsaved') : saved ? t('saved') : ''}</span>
        <Button disabled={!dirty} onClick={() => { setDraft(null); setSecrets({}); setSaved(false) }}>{t('discard')}</Button>
        <Button variant="primary" disabled={!dirty || snap.loading} onClick={() => { void save() }}>{snap.loading ? t('saving') : t('save')}</Button></footer>
    </>}
  </section>
}

export function registerAddonsUi(ctx) {
  const resource = createAddonsResource()
  ctx.effect(() => ctx.locale.register('settings.darask-addons', dictionaries), 'dsh-darask addons locale')
  const t = ctx.locale.bind('settings.darask-addons')
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'darask-addons', order: 12, locale: 'settings.darask-addons', label: () => t('title'),
  }, () => <AddonsPanel resource={resource} t={t} />))
}

export { addonsDictionaries } from './addons/locale.mjs'
