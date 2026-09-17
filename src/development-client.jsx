import React, { useEffect, useState } from 'react';
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives';

export function RestartRow({ t }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  async function restart() {
    setBusy(true); setStatus(t('restarting'));
    try {
      const response = await fetch('/api/darask/restart', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(8000) });
      const value = await response.json().catch(() => ({}));
      if (!response.ok || value.error) throw new Error(value.error || t('restartFailed'));
      setStatus(t('restartReconnect'));
      const started = Date.now();
      while (Date.now() - started < 45000) {
        await new Promise(done => setTimeout(done, 1500));
        try {
          const probe = await fetch('/api/darask/status', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(4000) });
          if (probe.ok) { window.location.reload(); return; }
        } catch { /* wait for the new process */ }
      }
      setStatus(t('restartTimeout'));
    } catch (error) { setStatus(error.message || t('restartFailed')); } finally { setBusy(false); }
  }
  return <div className="darask-restart-row">
    <div><strong>{t('restartTitle')}</strong><p>{status || t('restartDesc')}</p></div>
    <Button disabled={busy} onClick={() => { void restart(); }}>{t('restartNow')}</Button>
  </div>;
}

async function call(action, signal) {
  const response = await fetch('/api/darask/development', { credentials: 'same-origin', cache: 'no-store', signal: signal ?? AbortSignal.timeout(20000),
    ...(action ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) } : {}) });
  const value = await response.json(); if (!response.ok || value.error) throw new Error(value.error || '開発機能に接続できません。'); return value;
}
export function DevelopmentPanel() {
  const [data, setData] = useState(null), [error, setError] = useState(''), [pending, setPending] = useState(false), [diff, setDiff] = useState(null), [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let timer;
    const load = async () => { try { setData(await call(null, controller.signal)); setError(''); } catch { if (!controller.signal.aborted) setError('DSH に接続できません。更新・再起動中は、この画面でお待ちください。'); } finally { if (!controller.signal.aborted) timer = setTimeout(load, 2000); } };
    void load(); return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  const busy = pending || data?.job?.phase === 'running' || data?.distribute?.job?.phase === 'running';
  async function perform(action) {
    setPending(true); setError(''); setNotice('');
    try { const value = await call(action); if (action === 'diff') setDiff(value.diff); else setData(await call()); }
    catch (e) { setError(e.message); } finally { setPending(false); }
  }
  async function register() {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/darask/workspaces', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'register', node: 'local', path: data.source, requestId: crypto.randomUUID() }) });
      const result = await response.json(); if (!response.ok || result.error) throw new Error(result.error || '登録できませんでした。'); setNotice('ワークスペースに登録しました。左側の一覧から darask-harness を開いてください。');
    } catch (e) { setError(e.message); } finally { setPending(false); }
  }
  return <section className="darask"><header className="darask-heading"><div><h2>開発・更新</h2><p>Git で管理したソースを編集し、画面を再読み込みして反映します。</p></div></header>
    {error && <p className="darask-error" role="alert">{error}</p>}
    {!data && <p role="status">Git の状態を確認しています…</p>}
    {data && !data.available && <p>{data.message}</p>}
    {data?.available && <>
      <article className="darask-provider"><header className="darask-provider-header"><h3>darask-harness</h3><Tag>{data.version}</Tag><Tag>{data.branch || 'ブランチ未選択'}</Tag><Tag>{data.dirty ? '未コミットの編集あり' : '変更なし'}</Tag></header><div className="darask-usage">
        <label className="darask-field"><span>この PC の編集用ワークスペース</span><code className="darask-source-path">{data.source}</code></label>
        <div className="darask-actions"><Button disabled={busy} onClick={() => { void register(); }}>ワークスペースに登録</Button><Button disabled={busy} onClick={() => { void perform('diff'); }}>差分を見る</Button></div>
        <p className="darask-muted">src の編集は保存すると反映されます。表示が変わらない場合は「編集を反映」を押して再読み込みしてください。コミット・push はワークスペースで行います。</p>
        <div className="darask-actions"><Button variant="primary" disabled={busy} onClick={() => { void perform('build'); }}>編集を反映</Button><Button disabled={busy} onClick={() => window.location.reload()}>画面を再読み込み</Button></div>
      </div></article>
      <article className="darask-provider"><header className="darask-provider-header"><h3>GitHub から更新</h3><Tag>{data.head.slice(0, 8)}</Tag></header><div className="darask-usage">
        <p>{data.behind === null ? '「更新を確認」で GitHub の最新版を確認してください。' : `取得済みの main と比較: 未適用 ${data.behind} 件 / ローカルのみ ${data.ahead} 件`}</p>
        <p className="darask-muted">更新時は DSH を再起動します。実行中のタスクを終えてから操作してください。未コミットの編集や履歴の分岐がある場合は上書きせず停止します。{data.distribute?.nodes > 0 && `適用後、登録済みの PC（${data.distribute.nodes} 台）にも自動で配布します。`}</p>
        <div className="darask-actions"><Button disabled={busy || !data.remoteReady} onClick={() => { void perform('check'); }}>更新を確認</Button><Button variant="primary" disabled={busy || data.dirty || !data.remoteReady || data.branch !== 'main'} onClick={() => { void perform('update'); }}>最新版を適用して再起動</Button></div>
        {data.changes.length > 0 && <details className="darask-details"><summary>変更したファイル（{data.changes.length}）</summary><pre className="darask-git-diff">{data.changes.join('\n')}</pre></details>}
      </div></article>
      {data.job && <p className={data.job.phase === 'error' ? 'darask-error' : 'darask-muted'} role="status">{data.job.message}</p>}
    </>}
      {data?.distribute && <article className="darask-provider"><header className="darask-provider-header"><h3>登録済みの PC に配布</h3><Tag>{data.distribute.nodes} 台</Tag></header><div className="darask-usage">
        <p className="darask-muted">この PC の darask-harness を登録済みの PC に配布します。各 PC は DSH を再起動するため、実行中の作業を保存してください。開発モードの PC は GitHub から更新します。</p>
        <div className="darask-actions"><Button variant="primary" disabled={busy || !data.distribute.nodes} onClick={() => { void perform('distribute'); }}>この PC から配布</Button></div>
        {data.distribute.pending && <p className="darask-muted" role="status">再起動後に配布を実行する予定です。</p>}
        {data.distribute.job && <p className={data.distribute.job.phase === 'error' ? 'darask-error' : 'darask-muted'} role="status">{data.distribute.job.message}</p>}
        {data.distribute.last?.error && <p className="darask-error">{data.distribute.last.error}</p>}
        {data.distribute.last?.results?.length > 0 && <details className="darask-details"><summary>前回の結果（{new Date(data.distribute.last.at).toLocaleString('ja-JP')}）</summary><pre className="darask-git-diff">{data.distribute.last.results.map(row => `${row.name}: ${row.ok ? 'OK' : 'NG'} — ${row.message}`).join('\n')}</pre></details>}
      </div></article>}
    {notice && <p role="status">{notice}</p>}
    {diff !== null && <details open className="darask-details"><summary>ソースの差分（最大 10 万文字・生成ファイルと未追跡ファイルの内容を除く）</summary><pre className="darask-git-diff">{diff || '追跡中のソースに差分はありません。'}</pre></details>}
  </section>;
}
