import React, { useState } from 'react'
import { Button, Input, Switch, Tag, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { authentication, safeUrl, percentage, message } from './format.mjs'
import { Usage } from '../usage-client.jsx'
import { CodexAccounts } from '../codex-client.jsx'
import { MODEL_CATALOGS } from '../model-catalogs.mjs'

function localStageLabel(stage, t) {
  if (stage === 'ready') return t('localReady')
  if (stage === 'loading') return t('localLoadingWeights')
  if (stage === 'serving') return t('localServing')
  if (stage === 'stopped') return t('localPhaseStopped')
  if (stage === 'error') return t('error')
  return t('localStarting')
}

function LocalRuntimePanel({ provider, pending, t, perform }) {
  const runtime = provider.localRuntime
  const progress = runtime?.progress
  const stage = progress?.stage ?? runtime?.phase ?? 'stopped'
  const percent = percentage(progress?.percent)
  const elapsed = Number.isFinite(progress?.elapsedMs) ? Math.round(progress.elapsedMs / 1000) : null
  const busy = pending === 'startLocal:local' || pending === 'stopLocal:local' || pending === 'testLocal:local'
  const starting = ['starting', 'loading', 'serving'].includes(stage) && runtime?.phase !== 'ready'
  const remote = runtime?.local === false
  const test = runtime?.test
  return <div className="darask-local-runtime" role="group" aria-label={t('localProgress')}>
    <div className="darask-actions">
      <Button variant="outline" size="sm" disabled={pending || remote || authentication(provider, t).connected || runtime?.owned} onClick={() => perform('startLocal')}>{t('startLocal')}</Button>
      <Button size="sm" disabled={pending || !(runtime?.owned || (runtime?.local && (runtime?.reachable || authentication(provider, t).connected)))} onClick={() => perform('stopLocal')}>{t('stopLocal')}</Button>
      <Button size="sm" disabled={pending || authentication(provider, t).connected !== true} onClick={() => perform('testLocal')}>{busy && pending === 'testLocal:local' ? t('localTesting') : t('testLocal')}</Button>
      <Button size="sm" disabled={pending} onClick={() => perform('refresh')}>{t('refresh')}</Button>
    </div>
    {remote && <p className="darask-muted">{t('localRemoteNoStart')}</p>}
    <div className="darask-window">
      <div className="darask-line"><span>{t('localProgress')}</span><strong>{localStageLabel(stage, t)}</strong></div>
      {(starting || stage === 'ready') && (percent === null
        ? <progress className="darask-progress" aria-label={t('localProgress')} />
        : <progress className="darask-progress" max="100" value={percent} aria-label={t('localProgress')} />)}
      {elapsed !== null && starting && <span className="darask-meta">{t('localElapsed')}: {elapsed} {t('seconds')}</span>}
      {progress?.lastLine && starting && <small className="darask-muted">{progress.lastLine}</small>}
    </div>
    {runtime?.error && <p role="alert">{message(runtime.error, t)}</p>}
    {test?.ok && <p className="darask-muted" role="status">{t('localTestOk')} · {test.latencyMs} ms · {t('localTestReply')}: {test.reply}</p>}
  </div>
}

const OPENAI_DATA_CONTROLS = 'https://platform.openai.com/settings/organization/data-controls/sharing'

export function ProviderCard({ provider, value, index, count, edit, move, action, pending, t, keys, setKeys, jev, local, editLocal, openai, editOpenAi, visibleModels, editModels }) {
  const auth = authentication(provider, t)
  const login = provider.login
  const loginUrl = safeUrl(login?.url)
  const loginPending = ['pending', 'waiting', 'authorizing', 'running'].includes(login?.status)
  const [callbackUrl, setCallbackUrl] = useState('')
  const logoutConfirmation = provider.logoutConfirmation?.required === true && Date.parse(provider.logoutConfirmation.expiresAt) > Date.now()
  const perform = type => { void action({ action: type, provider: provider.id }).catch(() => {}) }
  const providerName = provider.id === 'local' ? t('localTitle') : provider.name ?? provider.id
  const cliOnly = provider.id === 'cursor'
  const conversationAndCli = ['grok', 'claude'].includes(provider.id)
  const sectionId = `darask-${provider.id}`
  return <article className="darask-provider">
    <header className="darask-provider-header">
      <span className="darask-rank" aria-hidden="true">{index + 1}</span>
      <div className="darask-provider-name"><h3>{providerName}</h3><span className="darask-meta">{t(cliOnly ? 'cliProvider' : conversationAndCli ? 'grokProvider' : 'modelProvider')}</span>{typeof auth.account === 'string' && auth.account && <span className="darask-meta">{auth.account}</span>}</div>
      <Tag tone={auth.connected ? 'success' : 'neutral'}>{auth.label}</Tag>
      <div className="darask-move">
        <Button size="sm" disabled={index === 0 || pending} onClick={() => move(-1)} aria-label={`${providerName}: ${t('up')}`} title={t('up')}>↑</Button>
        <Button size="sm" disabled={index === count - 1 || pending} onClick={() => move(1)} aria-label={`${providerName}: ${t('down')}`} title={t('down')}>↓</Button>
      </div>
      <Switch checked={value.enabled} onChange={enabled => edit({ enabled })} disabled={pending} label={`${providerName}: ${t('enabled')}`} />
    </header>
    <div className="darask-provider-sections">
      <section className="darask-card-section" aria-labelledby={`${sectionId}-account`}>
        <h4 className="darask-card-section-title" id={`${sectionId}-account`}>{t('account')}</h4>
        <div className="darask-card-section-body">
          {provider.id === 'codex' ? <CodexAccounts provider={provider} action={action} pending={pending} Usage={Usage} t={t} /> : provider.id === 'local' ? (
            <label className="darask-field"><span>{t('localKey')}</span><Input type="password" value={keys.localApiKey} disabled={pending} onChange={event => setKeys(previous => ({ ...previous, localApiKey: event.target.value }))} autoComplete="new-password" /></label>
          ) : provider.id === 'deepseek' ? <>
            <div className="darask-actions"><Button size="sm" disabled={pending || !auth.connected} onClick={() => perform('logout')}>{t('removeDeepseekKey')}</Button><Button size="sm" disabled={pending} onClick={() => perform('refresh')}>{t('refresh')}</Button></div>
            <p className="darask-muted">{t('deepseekHint')}</p>
            <label className="darask-field"><span>{t('deepseekApiKey')}</span><Input type="password" value={keys.deepseekApiKey} disabled={pending} onChange={event => setKeys(previous => ({ ...previous, deepseekApiKey: event.target.value }))} autoComplete="new-password" spellCheck={false} /><small>{t('keyHint')}</small></label>
            <div className="darask-jev-inline"><div className="darask-line"><div><strong>{t('jevTitle')}</strong><span className="darask-meta">typesafe-ai/jev · {t('jevType')}</span></div><Tag tone={jev?.configured ? 'success' : 'neutral'}>{jev?.configured ? t('configured') : t('disconnected')}</Tag></div><p className="darask-muted">{t('jevHint')}</p>{jev?.routing?.status === 'available' && <p className="darask-meta" role="status">{t('jevRoutingLast')}: {t(`purpose_${jev.routing.purpose}`)}</p>}{jev?.routing?.status === 'error' && <p className="darask-error" role="status">{jev.routing.message || t('jevRoutingFallback')}</p>}<label className="darask-field"><span>{t('aiGatewayApiKey')}</span><Input type="password" value={keys.aiGatewayApiKey} disabled={pending} onChange={event => setKeys(previous => ({ ...previous, aiGatewayApiKey: event.target.value }))} autoComplete="new-password" spellCheck={false} /><small>{t('keyHint')}</small></label><div className="darask-actions"><a href="https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fapi-keys&title=AI+Gateway+API+Keys" target="_blank" rel="noopener noreferrer">{t('createAiGatewayKey')} ↗</a><Button size="sm" disabled={pending || !jev?.configured} onClick={() => { void action({ action: 'logout', provider: 'jev' }).catch(() => {}) }}>{t('removeAiGatewayKey')}</Button></div></div>
          </> : provider.id === 'openai' ? <>
            <div className="darask-actions">
              <Button size="sm" disabled={pending || !auth.connected} onClick={() => perform('logout')}>{t('logout')}</Button>
              <Button size="sm" disabled={pending} onClick={() => perform('refresh')}>{t('refresh')}</Button>
            </div>
            <div className="darask-warning" role="alert">
              <strong>{t('openaiDangerTitle')}</strong>
              <p>{t('openaiDanger')}</p>
              <p>{t('openaiDangerMore')}</p>
              <a href={OPENAI_DATA_CONTROLS} target="_blank" rel="noopener noreferrer">{t('openaiDataControls')} ↗</a>
            </div>
            <label className="darask-field"><span>{t('openaiApiKey')}</span><Input type="password" value={keys.openaiApiKey} disabled={pending} onChange={event => setKeys(previous => ({ ...previous, openaiApiKey: event.target.value }))} autoComplete="new-password" spellCheck={false} /></label>
            <label className="darask-field"><span>{t('openaiAdminKey')}</span><Input type="password" value={keys.openaiAdminKey} disabled={pending} onChange={event => setKeys(previous => ({ ...previous, openaiAdminKey: event.target.value }))} autoComplete="new-password" spellCheck={false} /><small>{t('openaiAdminHint')}</small></label>
          </> : <>
            <div className="darask-actions">
              <Button variant="outline" size="sm" disabled={pending || loginPending} onClick={() => perform('login')}>{t('login')}</Button>
              <Button size="sm" disabled={pending || !auth.connected} onClick={() => perform('logout')}>{t(logoutConfirmation ? 'logoutConfirm' : 'logout')}</Button>
              <Button size="sm" disabled={pending} onClick={() => perform('refresh')}>{t('refresh')}</Button>
              {loginPending && <Button size="sm" disabled={pending} onClick={() => perform('cancelLogin')}>{t('cancelLogin')}</Button>}
            </div>
            {logoutConfirmation && <div className="darask-login" role="status">{t('logoutConfirmHint')}</div>}
            {(loginPending || login?.message || loginUrl || login?.userCode) && <div className="darask-login" role="status">
              {loginPending && <strong>{t('loginPending')}</strong>}
              {login?.message && <p>{message(login.message, t)}</p>}
              {login?.userCode && <div>{t('userCode')}: <code>{login.userCode}</code></div>}
              {loginUrl && <a href={loginUrl} target="_blank" rel="noopener noreferrer">{t('openLogin')} ↗</a>}
              {provider.id === 'openrouter' && loginPending && <details className="darask-codex-callback"><summary>{t('openrouterCallbackToggle')}</summary>
                <p className="darask-muted">{t('openrouterCallbackHelp')}</p>
                <form onSubmit={event => { event.preventDefault(); const callback = callbackUrl.trim(); setCallbackUrl(''); if (callback) void action({ action: 'submitCallback', provider: 'openrouter', config: { callbackUrl: callback } }).catch(() => {}) }}>
                  <label className="darask-field"><span>{t('openrouterCallbackLabel')}</span><Input type="password" value={callbackUrl} onChange={event => setCallbackUrl(event.target.value)} autoComplete="off" spellCheck={false} /></label>
                  <Button size="sm" type="submit" disabled={pending || !callbackUrl.trim()}>{t('openrouterCallbackSubmit')}</Button>
                </form>
              </details>}
            </div>}
            {provider.id === 'openrouter' && <>
              <label className="darask-field"><span>{t('apiKey')}</span><Input type="password" value={keys.openrouterApiKey} disabled={pending} onChange={event => setKeys(previous => ({ ...previous, openrouterApiKey: event.target.value }))} autoComplete="new-password" spellCheck={false} /></label>
              <label className="darask-field"><span>{t('managementKey')}</span><Input type="password" value={keys.openrouterManagementKey} disabled={pending} onChange={event => setKeys(previous => ({ ...previous, openrouterManagementKey: event.target.value }))} autoComplete="new-password" spellCheck={false} /><small>{t('keyHint')}</small></label>
            </>}
          </>}
        </div>
      </section>
      <section className="darask-card-section" aria-labelledby={`${sectionId}-model`}>
        <h4 className="darask-card-section-title" id={`${sectionId}-model`}>{t('model')}</h4>
        <div className="darask-card-section-body">
          {provider.id === 'local' && <LocalRuntimePanel provider={provider} pending={pending} t={t} perform={perform} />}
          {cliOnly && <p className="darask-muted">{t('cliHint')}</p>}
          {provider.id === 'claude' && <p className="darask-muted">{t('claudeHint')}</p>}
          {!cliOnly && <label className="darask-field"><span>{t('model')}</span>{provider.id === 'deepseek' ? <select value={value.model} disabled={pending} onChange={event => edit({ model: event.target.value })}>{MODEL_CATALOGS.deepseek.map(model => <option value={model.id} key={model.id}>{model.name}</option>)}</select> : <Input value={value.model} disabled={pending} onChange={event => edit({ model: event.target.value })} autoComplete="off" spellCheck={false} />}<small>{t(provider.id === 'openai' ? 'openaiModelHint' : 'modelHint')}</small></label>}
          {MODEL_CATALOGS[provider.id]?.length > 0 && <div className="darask-model-visibility" role="group" aria-label={`${providerName}: ${t('modelVisibility')}`}><strong>{t('modelVisibility')}</strong>{MODEL_CATALOGS[provider.id].map(model => <div className="darask-model-visibility-row" key={model.id}><span>{model.name}</span><Switch checked={visibleModels?.includes(model.id) === true} disabled={pending} label={`${model.name}: ${t('modelVisibility')}`} onChange={shown => editModels(provider.id, model.id, shown)} /></div>)}<small>{t('modelVisibilityHint')}</small></div>}
          {['cursor', 'claude', 'grok', 'local'].includes(provider.id) && <label className="darask-field"><span>{t('executable')}</span><Input value={value.executable} disabled={pending} onChange={event => edit({ executable: event.target.value })} autoComplete="off" spellCheck={false} /><small>{t(provider.id === 'local' ? 'localHint' : 'executableHint')}</small></label>}
          {provider.id === 'local' && local && <>
            <p className="darask-muted">{t('remoteHint')}</p>
            {provider.localRuntime?.phase === 'starting' && <p role="status">{t('localStarting')}</p>}
            {[['baseUrl', 'localUrl'], ['modelFile', 'localFile']].map(([field, title]) => <label className="darask-field" key={field}><span>{t(title)}</span><Input value={local[field]} disabled={pending} onChange={event => editLocal({ [field]: event.target.value })} autoComplete="off" spellCheck={false} /></label>)}
            {[['contextSize', 'localContext'], ['gpuLayers', 'localGpu']].map(([field, title]) => <label className="darask-field" key={field}><span>{t(title)}</span><Input type="number" value={local[field]} disabled={pending} onChange={event => editLocal({ [field]: Number(event.target.value) })} /></label>)}
            <Switch checked={local.autoStart} disabled={pending} label={t('localAuto')} onChange={autoStart => editLocal({ autoStart })} />
            <small>{t('localSaveHint')}</small>
            {provider.localRuntime?.logFile && <small>{t('localLog')}: {provider.localRuntime.logFile}</small>}
          </>}
          {provider.id === 'openai' && openai && <>
            <p className="darask-muted">{t('openaiHint')}</p>
            <Switch checked={openai.preferComplimentary !== false} disabled={pending} label={t('openaiPrefer')} onChange={preferComplimentary => editOpenAi({ preferComplimentary })} />
            <small>{t('openaiPreferHint')}</small>
            <label className="darask-field"><span>{t('openaiTier')}</span><select value={openai.usageTier ?? 'unknown'} disabled={pending} onChange={event => editOpenAi({ usageTier: event.target.value })}>
              <option value="unknown">{t('openaiTierUnknown')}</option>
              <option value="t12">{t('openaiTier12')}</option>
              <option value="t35">{t('openaiTier35')}</option>
            </select></label>
          </>}
        </div>
      </section>
    </div>
  </article>
}
