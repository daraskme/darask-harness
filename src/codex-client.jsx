import React, { useEffect, useState } from 'react'
import { Button, Input, Switch, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { openCodexAuthorization } from './settings/client-effects.mjs'

function CodexConnection({ refresh }) {
  const [node, setNode] = useState(''), [nodes, setNodes] = useState([]), [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false), [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(['/api/darask/codex/connection', '/api/darask/workspaces'].map(async path => {
      const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw new Error()
      return response.json()
    })).then(([connection, hosts]) => { setNode(connection.node ?? ''); setNodes((hosts.nodes ?? []).filter(item => !item.sameMachine)); setReady(true) })
      .catch(() => { if (!controller.signal.aborted) setError('共有モデルの認証元（Codex / OpenAI / OpenRouter など）を読み込めません。') })
    return () => controller.abort()
  }, [])
  async function change(value) {
    setPending(true); setError('')
    try {
      const response = await fetch('/api/darask/codex/connection', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ node: value || null }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setNode(result.node ?? ''); await refresh()
    } catch (e) { setError(e.message || '認証元を変更できません。') } finally { setPending(false) }
  }
  return <section className="darask-provider-fields"><label className="darask-field"><span>共有モデルの認証元（Codex / OpenAI / OpenRouter など）</span>
    <select value={node} disabled={!ready || pending} onChange={event => void change(event.target.value)}>
      <option value="">この PC の認証</option>{nodes.map(item => <option value={item.id} key={item.id}>🌐 {item.name || item.url}</option>)}
    </select></label><p className="darask-muted">接続済み PC を選ぶと、その PC で設定した OpenRouter などのモデルが「🌐 …（認証元）」として選択欄に表示されます。一覧は約1分ごとに更新します。共有モデルの推論は認証元を経由し、API キーはコピーしません。ファイル編集とコマンド実行はワークスペースの PC で行います。両方の PC に対応版 DARASK が必要です。</p>
    {node && <p className="darask-meta">会話・添付画像・ツールの応答を共有します。Codex の画像生成や自動審査など、別の機能の認証は実行する PC の設定に従います。</p>}
    {error && <p role="alert" className="darask-error">{error}</p>}
  </section>
}

function CodexImages() {
  const [status, setStatus] = useState(null), [pending, setPending] = useState(false), [error, setError] = useState('')
  async function read(body, signal) {
    const response = await fetch('/api/darask/media', { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), signal: signal ?? AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error('画像生成の設定を読み込めません。DSH を再読み込みしてください。')
    return response.json()
  }
  useEffect(() => {
    const controller = new AbortController()
    read(null, controller.signal).then(setStatus).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [])
  async function change(enabled) {
    setPending(true); setError('')
    try { await read({ enableCodexImages: enabled }); setStatus(await read()) }
    catch (e) { setError(e.message) } finally { setPending(false) }
  }
  return <section className="darask-provider-fields"><div className="darask-line"><strong>GPT の画像生成</strong>
    <Switch label="GPT の画像生成を使用する" checked={status?.codex?.enabled ?? false} disabled={!status || pending} onChange={change} /></div>
    <p className="darask-muted">使用中の Codex / ChatGPT アカウントで画像を生成します。OpenAI API キーは不要です。</p>
    <p role="status" className="darask-meta">{!status ? '状態を確認中…' : !status.codex.enabled ? '無効' : status.codex.registered ? '画像生成ツールを使用できます。' : 'ツールの登録を待っています。状態が変わらない場合は DSH を再読み込みしてください。'}</p>
    {error && <p role="alert" className="darask-error">{error}</p>}
  </section>
}

export function CodexAccounts({ provider, action, pending, Usage, t }) {
  const [callback, setCallback] = useState('')
  const [removing, setRemoving] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [loginUrl, setLoginUrl] = useState(''), [popupBlocked, setPopupBlocked] = useState(false)
  const rows = provider.accounts ?? []
  const signingIn = provider.login?.status === 'running'
  const perform = async payload => {
    setFeedback('')
    try {
      const result = await action({ provider: 'codex', ...payload })
      if (result?.login?.status === 'failed') setFeedback('操作を完了できませんでした。状態を更新し、もう一度お試しください。')
      else return true
    } catch { setFeedback('操作を完了できませんでした。DSH の接続を確認してください。') }
    return false
  }
  const beginLogin = async () => {
    setFeedback(''); setLoginUrl(''); setPopupBlocked(false)
    try {
      const launched = await openCodexAuthorization(() => action({ provider: 'codex', action: 'login' }))
      if (launched.result?.login?.status === 'failed') { setFeedback('操作を完了できませんでした。状態を更新し、もう一度お試しください。'); return }
      setLoginUrl(launched.url ?? '')
      if (launched.url && !launched.opened) setPopupBlocked(true)
    } catch { setFeedback('操作を完了できませんでした。DSH の接続を確認してください。') }
  }
  const authorizationUrl = signingIn ? provider.login?.url ?? loginUrl : ''
  return <div className="darask-codex-accounts">
    <CodexConnection refresh={() => perform({ action: 'refresh' })} />
    {provider.authenticationSource && <p className="darask-meta">認証元: 🌐 {provider.authenticationSource} — この PC でも共有アカウントを使用します。</p>}
    <CodexImages />
    <div className="darask-actions"><Button size="sm" variant="outline" disabled={pending || signingIn || rows.length >= 16} onClick={() => void beginLogin()}>アカウントを追加</Button>
      <Button size="sm" disabled={pending} onClick={() => void perform({ action: 'refresh' })}>状態を更新</Button>
      {signingIn && <Button size="sm" disabled={pending} onClick={() => void perform({ action: 'cancelLogin' })}>追加ログインを中止</Button>}</div>
    <p className="darask-muted">最大16アカウントを保存できます。「使用する」で以後の Codex リクエストに使うアカウントを選びます。Usage は各アカウントから約1分ごとに取得します。</p>
    {signingIn && <p className="darask-muted">別のアカウントを追加する場合は、認証ページでアカウントを切り替えるか、下の認証リンクをプライベートウインドウで開いてください。</p>}
    {signingIn && authorizationUrl && <div className="darask-login" role="status">{popupBlocked && <p>ブラウザーが認証画面を自動で開けませんでした。ポップアップを許可するか、次のリンクを開いてください。</p>}<a href={authorizationUrl} target="_blank" rel="noopener noreferrer">ChatGPT の認証画面を開く ↗</a></div>}
    {feedback && <p role="alert" className="darask-error">{feedback}</p>}
    {rows.map(row => <section className="darask-codex-account" key={row.accountKey}>
      <div className="darask-codex-heading"><strong>{row.displayName}</strong>{row.active && <Tag tone="success">使用中</Tag>}</div>
      {row.maskedEmail && <span className="darask-meta">{row.maskedEmail}</span>}
      <Usage usage={row.usage} t={t} />
      <div className="darask-actions"><Button size="sm" disabled={pending || signingIn || row.active} onClick={() => void perform({ action: 'selectAccount', accountKey: row.accountKey })}>使用する</Button>
        <Button size="sm" disabled={pending || signingIn || (row.active && rows.length > 1)} onClick={() => setRemoving(row.accountKey)}>このアカウントを削除</Button></div>
      {row.active && rows.length > 1 && <small className="darask-muted">削除する場合は、先に別のアカウントを使用中にしてください。</small>}
      {removing === row.accountKey && <div role="alert" className="darask-login"><p>この DSH に保存した {row.displayName} のログイン情報を削除します。</p><div className="darask-actions"><Button size="sm" disabled={pending} onClick={async () => { if (await perform({ action: 'removeAccount', accountKey: row.accountKey })) setRemoving(null) }}>削除する</Button><Button size="sm" disabled={pending} onClick={() => setRemoving(null)}>戻る</Button></div></div>}
    </section>)}
    {signingIn && <details className="darask-codex-callback"><summary>Mac など別の PC でログインする場合</summary><p className="darask-muted">認証ページでログイン後、localhost のページを開けなくなったら、その時のアドレス全体をここに貼り付けてください。</p>
      <form onSubmit={async event => { event.preventDefault(); const callbackUrl = callback.trim(); setCallback(''); if (await perform({ action: 'submitCallback', callbackUrl })) setFeedback('認証を受け付けました。完了を待っています。') }}>
        <label className="darask-field"><span>認証後の戻り先 URL</span><Input type="password" value={callback} onChange={event => setCallback(event.target.value)} autoComplete="off" spellCheck={false} /></label>
        <Button size="sm" type="submit" disabled={pending || !callback.trim()}>認証を完了</Button>
      </form></details>}
  </div>
}
