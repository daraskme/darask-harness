import React, { useState } from 'react'
import { Button, Input, Switch, Tag, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { safeUrl } from './format.mjs'

export function TailscaleConnection({ data, action, pending, t }) {
  const tail = data.tailscale;
  if (!tail) return <p className="darask-muted">Tailscale の状態を確認しています…</p>;
  const perform = payload => { void action(payload).catch(() => {}) };
  return <article className="darask-provider">
    <header className="darask-provider-header"><div className="darask-provider-name"><h3>Tailscale</h3></div><Tag tone={tail.connected ? 'success' : 'neutral'}>{t(tail.connected ? 'connected' : tail.available ? 'disconnected' : 'unavailable')}</Tag><Tag>{t(tail.serve === 'on' ? 'serveActive' : tail.serve === 'conflict' ? 'serveConflict' : 'serveStopped')}</Tag></header>
    <div className="darask-usage">
      <p className="darask-muted">{t('tailHint')}</p>
      {tail.dnsName && <strong>{tail.dnsName}</strong>}
      <div className="darask-actions"><Button size="sm" variant="outline" disabled={pending || !tail.connected || tail.serve !== 'off'} onClick={() => perform({ action: 'serveEnable', provider: 'tailscale' })}>{t('serveOn')}</Button><Button size="sm" disabled={pending || tail.serve !== 'on' || !tail.owned} onClick={() => perform({ action: 'serveDisable', provider: 'tailscale' })}>{t('serveOff')}</Button></div>
    </div>
  </article>;
}

export function ComputerControl({ data, action, pending, t }) {
  const computer = data.computer ?? { enabled: false, available: true };
  const perform = payload => { void action(payload).catch(() => {}) };
  const available = computer.available !== false;
  return <article className="darask-provider">
    <header className="darask-provider-header"><div className="darask-provider-name"><h3>{t('computerTitle')}</h3></div><Tag tone={computer.enabled ? 'success' : 'neutral'}>{t(computer.enabled ? 'computerReady' : available ? 'disabled' : 'computerUnavailable')}</Tag></header>
    <div className="darask-usage">
      <p className="darask-muted">{t('computerHint')}</p>
      <div className="darask-actions">
        <Button size="sm" variant="outline" disabled={pending || !available || computer.enabled} onClick={() => perform({ action: 'enableComputer', provider: 'computer' })}>{t('computerOn')}</Button>
        <Button size="sm" disabled={pending || !computer.enabled} onClick={() => perform({ action: 'disableComputer', provider: 'computer' })}>{t('computerOff')}</Button>
      </div>
    </div>
  </article>;
}

export function BrowserConnections({ data, action, pending, t }) {
  const run = data.browserRun;
  const [accountId, setAccountId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const perform = payload => { void action(payload).catch(() => {}) };
  const saveConnection = async () => {
    try { await action({ action: 'saveBrowserRun', provider: 'browserRun', config: { accountId: accountId || run?.accountId, apiToken } }); setApiToken(''); } catch {}
  };
  return <div className="darask-integrations">
    <article className="darask-provider"><header className="darask-provider-header"><div className="darask-provider-name"><h3>Kitesurf</h3></div><Tag>{t(data.compatibility?.kitesurf ? 'enabled' : 'disabled')}</Tag></header><div className="darask-usage"><p className="darask-muted">{t('browserHint')}</p></div></article>
    {run && <article className="darask-provider">
      <header className="darask-provider-header"><div className="darask-provider-name"><h3>Cloudflare Browser Run</h3></div><Tag tone={run.connected ? 'success' : 'neutral'}>{t(run.connected ? 'connected' : run.configured ? 'configured' : 'disconnected')}</Tag></header>
      <div className="darask-usage"><p className="darask-muted">{t('browserRunHint')}</p>
        <a href={safeUrl(run.dashboardUrl)} target="_blank" rel="noopener noreferrer">{t('dashboard')} ↗</a>
      </div>
      <details className="darask-details"><summary>{t('settings')}</summary><div className="darask-fields">
        <label className="darask-field"><span>{t('cfAccount')}</span><Input value={accountId} placeholder={run.accountId || ''} disabled={pending} onChange={e => setAccountId(e.target.value.trim())} autoComplete="off" /></label>
        <label className="darask-field"><span>{t('cfToken')}</span><Input type="password" value={apiToken} disabled={pending} onChange={e => setApiToken(e.target.value)} autoComplete="new-password" /></label>
        <div className="darask-actions"><Button size="sm" variant="primary" disabled={pending || !apiToken || !(accountId || run.accountId)} onClick={() => { void saveConnection() }}>{t('connectSave')}</Button><Button size="sm" disabled={pending || !run.configured} onClick={() => perform({ action: 'removeBrowserRun', provider: 'browserRun' })}>{t('disconnectRemove')}</Button></div>
      </div></details>
    </article>}
  </div>;
}
