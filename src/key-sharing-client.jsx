import React, { useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

async function get(url) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(45000) })
  const value = await response.json()
  if (!response.ok || value.error) throw new Error(value.error || '状態を取得できません。')
  return value
}

async function post(body) {
  const response = await fetch('/api/darask/workspaces', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) })
  const value = await response.json()
  if (!response.ok || value.error) throw new Error(value.error || '処理を完了できません。')
  return value
}

const groups = ['モデル', 'その他']

/** Hub keys shared into a registered PC's DSH so its workspaces can run the
 *  same model routes, using API keys. Values never enter this screen. */
function ShareRow({ node, secrets, status, onStatus, onDone }) {
  const [selected, setSelected] = useState(null)
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const available = (secrets ?? []).filter(row => row.available);
  const chosen = selected ?? available.map(row => row.ref);
  const remoteOf = ref => (status?.credentials ?? []).find(row => row.ref === ref);
  const conflicts = chosen.filter(ref => remoteOf(ref)?.source === 'env');

  async function share(revoke) {
    setPending(true); setError(''); setMessage('');
    try {
      // Only reference names cross this screen. The hub resolves the values.
      const result = await post({ action: 'shareCredentials', node: node.id, refs: revoke ? available.map(row => row.ref) : chosen, ...(revoke ? { revoke: true } : {}) });
      const row = (result.results ?? []).find(item => item.node === node.id);
      if (row?.error) throw new Error(row.error);
      const detail = revoke ? `取り消し：${(row?.removed ?? []).join(', ') || '変更なし'}` : `共有：${(row?.saved ?? []).join(', ') || '変更なし'}${(result.missing ?? []).length ? `／この PC に未登録：${result.missing.join(', ')}` : ''}`;
      setMessage(detail);
      await onStatus(); onDone?.();
    } catch (e) { setError(e.message); } finally { setPending(false); }
  }

  return <details className="darask-details" onToggle={event => { if (event.currentTarget.open && !status) void onStatus(); }}>
    <summary>{node.name} にキーを共有</summary>
    <div className="darask-fields">
      <p className="darask-muted">この PC に登録したキーを {node.name} の DSH に保存します。値は画面に表示されません。共有先で選べるモデル が使えるようになります。</p>
      {!status && <p className="darask-muted">状態を確認しています…</p>}
      {status && <>
        {available.length === 0 && <p className="darask-muted">この PC で登録済みのキーがありません。「AI アカウント」で登録してから共有してください。</p>}
        {groups.map(group => {
          const rows = available.filter(row => row.group === group);
          if (!rows.length) return null;
          return <div key={group}><strong>{group}</strong>{rows.map(row => {
            const remote = remoteOf(row.ref);
            const checked = chosen.includes(row.ref);
            return <label className="darask-field darask-key-row" key={row.ref}>
              <input type="checkbox" checked={checked} disabled={pending} onChange={() => setSelected(checked ? chosen.filter(ref => ref !== row.ref) : [...chosen, row.ref])} />
              <span>{row.label}<small>{row.hint}｜共有先：{remote?.configured ? `保存済み${remote.sharedAt ? `（${new Date(remote.sharedAt).toLocaleString()}）` : ''}` : '未設定'}</small></span>
            </label>;
          })}</div>;
        })}
        {conflicts.length > 0 && <p className="darask-muted">共有先の起動環境が優先されるキーがあります（{conflicts.join(', ')}）。保存しても使われない場合があります。</p>}
        <div className="darask-actions">
          <Button size="sm" variant="primary" disabled={pending || !chosen.length} onClick={() => { void share(false) }}>{pending ? '共有中…' : '選択したキーを共有'}</Button>
          <Button size="sm" disabled={pending || !available.length} onClick={() => { void share(true) }}>取り消す</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => { void onStatus().catch(() => {}) }}>状態を更新</Button>
        </div>
        {(status.credentials ?? []).some(row => row.configured) && <p className="darask-muted">共有先に保存済み：{(status.credentials ?? []).filter(row => row.configured).map(row => row.label).join('、')}</p>}
      </>}
      {message && <p role="status">{message}</p>}
      {error && <p className="darask-error" role="alert">{error}</p>}
    </div>
  </details>;
}

export function KeySharing({ nodes, secrets }) {
  const [statuses, setStatuses] = useState({}), [error, setError] = useState('');
  if (!nodes?.length) return null;
  const load = async node => {
    try {
      const value = await get(`/api/darask/workspaces/status?node=${encodeURIComponent(node.id)}`);
      setStatuses(current => ({ ...current, [node.id]: value }));
    } catch (e) { setError(e.message); throw e; }
  };
  return <div className="darask-integrations"><h3>キーの共有</h3>
    <p className="darask-muted">リモートのワークスペースは、その PC の DSH で動きます。モデルを選べるように、この PC に登録したキーを相手の PC にまとめて保存できます。</p>
    {error && <p className="darask-error" role="alert">{error}</p>}
    {nodes.map(node => <article className="darask-provider" key={node.id}>
      <ShareRow node={node} secrets={secrets} status={statuses[node.id]} onStatus={() => load(node)} />
    </article>)}
  </div>;
}
