import React, { useState } from 'react'
import { Button, Input, Switch, Tag, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { defaultModelVisibility } from '../model-catalogs.mjs'
import { message } from './format.mjs'
import { ProviderCard } from './providers.jsx'
import { PcConnections } from '../workspaces-client.jsx'
import { TailscaleConnection, ComputerControl, BrowserConnections } from './connections.jsx'

function configuration(data) {
  const providers = Array.isArray(data?.providers) ? data.providers : []
  const known = new Set(providers.map(provider => provider.id))
  const priority = [...new Set([...(data?.priority ?? []), ...known])].filter(id => known.has(id))
  return {
    priority, routingEnabled: data?.routingEnabled === true, purposeRoutes: structuredClone(data?.purposeRoutes ?? {}), modelVisibility: structuredClone(data?.modelVisibility ?? defaultModelVisibility()), ...(data?.local ? { local: { ...data.local } } : {}),
    ...(data?.openai ? { openai: { ...data.openai } } : {}), ...(data?.bitwarden?.config ? { bitwarden: { ...data.bitwarden.config, secretIds: { ...data.bitwarden.config.secretIds } } } : {}),
    providers: Object.fromEntries(providers.map(provider => [provider.id, {
      enabled: provider.enabled === true, model: provider.model ?? '', executable: provider.executable ?? '',
    }])),
  }
}

export function DaraskPanel(props) {
  const state = props.useDaraskStatus(snapshot => snapshot)
  const { t } = props
  const [draft, setDraft] = useState(null)
  const emptyKeys = { bitwardenAccessToken: '', deepseekApiKey: '', openrouterApiKey: '', openrouterManagementKey: '', localApiKey: '', openaiApiKey: '', openaiAdminKey: '', aiGatewayApiKey: '' }
  const [keys, setKeys] = useState(emptyKeys)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('ai')
  const data = state.data
  const config = draft ?? configuration(data)
  const dirty = draft !== null || Object.values(keys).some(value => value !== '')
  const change = edit => { setDraft(current => edit(current ?? configuration(data))); setSaved(false) }
  const pending = state.pending !== null
  const save = async () => {
    try {
      const credentials = Object.fromEntries(Object.entries(keys).filter(([, value]) => value.trim() !== ''))
      await props.action({ action: 'save', config: { ...config, ...credentials } })
      setDraft(null)
      setKeys(emptyKeys)
      setSaved(true)
    } catch { setSaved(false) }
  }
  const providers = new Map((data?.providers ?? []).map(provider => [provider.id, provider]))
  const modelProviders = config.priority.filter(id => providers.get(id)?.capability === 'model')
  const purposes = ['research', 'architecture', 'spec_driven', 'new', 'refactor', 'medium', 'collaboration', 'simple']
  const compatibilityMessages = [data?.compatibility?.message, ...(Array.isArray(data?.compatibility?.warnings) ? data.compatibility.warnings : [])].filter(value => typeof value === 'string' && value)
  return <section className="darask" aria-label={t('title')}>
    <header className="darask-heading"><div><h2>{t('title')}</h2><p>{t('description')}</p></div><Button variant="outline" disabled={pending || state.loading} onClick={() => { void props.action({ action: 'refresh' }).catch(() => {}) }}>{t('refresh')}</Button></header>
    {state.error && <div className="darask-error" role="alert"><span>{message(state.error, t, t('loadFailed'))}</span><Button size="sm" disabled={pending} onClick={() => { void props.load() }}>{t('retry')}</Button></div>}
    {state.loading && !data && <p className="darask-muted" role="status">{t('loading')}</p>}
    {data && <>
      <div className="darask-account-tabs" role="tablist" aria-label={t('accountTabs')}>
        {['ai', 'pc', 'browser'].map((id, index, tabs) => <Button key={id} id={`darask-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`darask-panel-${id}`} tabIndex={tab === id ? 0 : -1} variant={tab === id ? 'primary' : 'outline'} onClick={() => setTab(id)} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
          if (next !== null) { event.preventDefault(); setTab(tabs[next]); event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus(); }
        }}>{t(`${id}Tab`)}{id === 'ai' && dirty ? ' *' : ''}</Button>)}
      </div>
      <div className="darask-account-panel" id="darask-panel-ai" role="tabpanel" aria-labelledby="darask-tab-ai" hidden={tab !== 'ai'}>
      <div className="darask-routing"><div><strong>{t('routing')}</strong><p>{t('routingHint')}</p></div><Switch checked={config.routingEnabled} disabled={pending} label={t('routing')} onChange={routingEnabled => change(current => ({ ...current, routingEnabled }))} /></div>
      <section className="darask-purpose-routing" aria-labelledby="darask-purpose-routing-title">
        <div className="darask-section-heading"><h3 id="darask-purpose-routing-title">{t('purposeRouting')}</h3><p>{t('purposeRoutingHint')}</p></div>
        <div className="darask-purpose-grid">
          {purposes.map(id => <label className="darask-field" key={id}><span>{t(`purpose_${id}`)}</span><select value={config.purposeRoutes?.[id] ?? ''} disabled={pending} onChange={event => change(current => ({ ...current, purposeRoutes: { ...current.purposeRoutes, [id]: event.target.value } }))}>
            <option value="">{t('autoPriority')}</option>
            {modelProviders.map(providerId => <option value={providerId} key={providerId}>{providers.get(providerId)?.name ?? providerId}</option>)}
          </select></label>)}
        </div>
      </section>
      <section className="darask-jev" aria-labelledby="darask-jev-title">
        <div className="darask-provider-header">
          <div className="darask-provider-name"><h3 id="darask-jev-title">{t('jevTitle')}</h3><span className="darask-meta">typesafe-ai/jev · {t('jevType')}</span></div>
          <Tag tone={data.jev?.configured ? 'success' : 'neutral'}>{data.jev?.configured ? t('configured') : t('disconnected')}</Tag>
        </div>
        <div className="darask-card-section">
          <div className="darask-card-section-body">
            <p className="darask-muted">{t('jevHint')}</p>
            <label className="darask-field"><span>{t('aiGatewayApiKey')}</span><Input type="password" value={keys.aiGatewayApiKey} disabled={pending} onChange={event => setKeys(previous => ({ ...previous, aiGatewayApiKey: event.target.value }))} autoComplete="new-password" spellCheck={false} /><small>{t('keyHint')}</small></label>
            <div className="darask-actions">
              <a href="https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fapi-keys&title=AI+Gateway+API+Keys" target="_blank" rel="noopener noreferrer">{t('createAiGatewayKey')} ↗</a>
              <Button size="sm" disabled={pending || !data.jev?.configured} onClick={() => { void props.action({ action: 'logout', provider: 'jev' }).catch(() => {}) }}>{t('removeAiGatewayKey')}</Button>
            </div>
          </div>
        </div>
      </section>
      <section className="darask-jev" aria-labelledby="darask-bitwarden-title">
        <div className="darask-provider-header">
          <div className="darask-provider-name"><h3 id="darask-bitwarden-title">Bitwarden Secrets Manager</h3><span className="darask-meta">{t('bitwardenType')}</span></div>
          <Tag tone={data.bitwarden?.configured ? 'success' : data.bitwarden?.error ? 'warning' : 'neutral'}>{t(data.bitwarden?.configured ? 'configured' : 'disconnected')}</Tag>
        </div>
        <div className="darask-card-section"><div className="darask-card-section-body">
          <p className="darask-muted">{t('bitwardenHint')}</p>
          <Switch checked={config.bitwarden?.enabled === true} disabled={pending} label={t('bitwardenEnabled')} onChange={enabled => change(current => ({ ...current, bitwarden: { ...current.bitwarden, enabled } }))} />
          <label className="darask-field"><span>{t('bitwardenExecutable')}</span><Input value={config.bitwarden?.executable ?? ''} disabled={pending} onChange={event => change(current => ({ ...current, bitwarden: { ...current.bitwarden, executable: event.target.value } }))} autoComplete="off" spellCheck={false} placeholder="C:\\Tools\\bws.exe" /><small>{t('bitwardenExecutableHint')}</small></label>
          <label className="darask-field"><span>{t('bitwardenToken')}</span><Input type="password" value={keys.bitwardenAccessToken} disabled={pending} onChange={event => setKeys(previous => ({ ...previous, bitwardenAccessToken: event.target.value }))} autoComplete="new-password" spellCheck={false} /><small>{t('keyHint')}</small></label>
          <div className="darask-fields">{(data.bitwarden?.targets ?? []).map(target => <label className="darask-field" key={target.ref}><span>{target.label}</span><Input value={config.bitwarden?.secretIds?.[target.ref] ?? ''} disabled={pending} onChange={event => change(current => ({ ...current, bitwarden: { ...current.bitwarden, secretIds: { ...current.bitwarden.secretIds, [target.ref]: event.target.value.trim() } } }))} autoComplete="off" spellCheck={false} placeholder={t('bitwardenSecretId')} /><small>{target.ref}</small></label>)}</div>
          <div className="darask-actions"><Button size="sm" variant="primary" disabled={pending || dirty || !config.bitwarden?.enabled} onClick={() => { void props.action({ action: 'syncBitwarden', provider: 'bitwarden', config: config.bitwarden }).catch(() => {}) }}>{t('bitwardenSync')}</Button><Button size="sm" disabled={pending || !data.bitwarden?.configured} onClick={() => { void props.action({ action: 'removeBitwarden', provider: 'bitwarden', config: config.bitwarden }).catch(() => {}) }}>{t('bitwardenRemove')}</Button></div>
          {data.bitwarden?.lastSyncedAt && <small>{t('bitwardenLastSync')}: {new Date(data.bitwarden.lastSyncedAt).toLocaleString(t('dateLocale'))}</small>}
          {data.bitwarden?.error && <p className="darask-error" role="alert">{data.bitwarden.error}</p>}
        </div></div>
      </section>
      <div className="darask-section-heading"><h3>{t('priority')}</h3><p>{t('priorityHint')}</p></div>
      <div className="darask-provider-list">
        {config.priority.map((id, index) => {
          const provider = providers.get(id)
          if (!provider) return null
          return <ProviderCard key={id} provider={provider} value={config.providers[id]} index={index} count={config.priority.length} pending={pending} t={t} action={props.action} keys={keys} setKeys={setKeys} local={config.local} openai={config.openai ?? { usageTier: 'unknown', preferComplimentary: true }} visibleModels={config.modelVisibility?.[id] ?? []} editModels={(providerId, modelId, shown) => change(current => { const selected = current.modelVisibility?.[providerId] ?? []; return { ...current, modelVisibility: { ...current.modelVisibility, [providerId]: shown ? [...new Set([...selected, modelId])] : selected.filter(id => id !== modelId) } } })} editLocal={patch => change(current => ({ ...current, local: { ...current.local, ...patch } }))} editOpenAi={patch => change(current => ({ ...current, openai: { ...(current.openai ?? { usageTier: 'unknown', preferComplimentary: true }), ...patch } }))}
            edit={patch => change(current => ({ ...current, providers: { ...current.providers, [id]: { ...current.providers[id], ...patch } } }))}
            move={direction => change(current => { const priority = [...current.priority]; [priority[index], priority[index + direction]] = [priority[index + direction], priority[index]]; return { ...current, priority } })} />
        })}
        {config.priority.length === 0 && <p className="darask-muted">{t('noProviders')}</p>}
      </div>
      {compatibilityMessages.length > 0 && <details className="darask-compatibility"><summary>{t('compatibility')}</summary>{compatibilityMessages.map((message, index) => <p key={index}>{message}</p>)}</details>}
      <footer className="darask-footer"><span role="status">{dirty ? t('unsaved') : saved ? t('saved') : ''}</span><Button disabled={!dirty || pending} onClick={() => { setDraft(null); setKeys(emptyKeys); setSaved(false) }}>{t('discard')}</Button><Button variant="primary" disabled={!dirty || pending} onClick={() => { void save() }}>{state.pending?.startsWith('save:') ? t('saving') : t('save')}</Button></footer>
      </div>
      <div className="darask-account-panel" id="darask-panel-pc" role="tabpanel" aria-labelledby="darask-tab-pc" hidden={tab !== 'pc'}><TailscaleConnection data={data} action={props.action} pending={pending} t={t} /><PcConnections /></div>
      <div className="darask-account-panel" id="darask-panel-browser" role="tabpanel" aria-labelledby="darask-tab-browser" hidden={tab !== 'browser'}><ComputerControl data={data} action={props.action} pending={pending} t={t} /><BrowserConnections data={data} action={props.action} pending={pending} t={t} /></div>
    </>}
  </section>
}
