import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, Tag } from '@deepseek-ai/dsh-client-ui-primitives';
import { parseConnectionLink } from './connection-link.mjs';
import { readQrImage, startQrCamera } from './qr-reader.mjs';

function CameraReader({ onRead, onError }) {
  const video = useRef(null);
  const callbacks = useRef({ onRead, onError }); callbacks.current = { onRead, onError };
  useEffect(() => {
    const controller = new AbortController();
    void startQrCamera(video.current, { signal: controller.signal, onScan: value => callbacks.current.onRead(value), onError: error => callbacks.current.onError(error.message) })
      .catch(error => { if (!controller.signal.aborted) callbacks.current.onError(error.message); });
    return () => controller.abort();
  }, []);
  return <video ref={video} className="darask-qr-camera" muted playsInline aria-label="接続 QR を読み取るカメラ" />;
}

export function ConnectionQrTools({ call, disabled, onImport }) {
  const [qr, setQr] = useState(null), [mode, setMode] = useState(null), [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [link, setLink] = useState(''), [copied, setCopied] = useState(false);
  const fileInput = useRef(null);
  const generation = useRef(0);
  const close = () => { generation.current++; setMode(null); setCamera(false); setQr(null); setLink(''); setCopied(false); setError(''); setBusy(false); };
  useEffect(() => () => { generation.current++; }, []);
  async function showQr() {
    const own = ++generation.current;
    setBusy(true); setQr(null); setError(''); setMode('share');
    try { const value = await call({ action: 'connectionQr' }); if (own === generation.current) setQr(value); }
    catch (e) { if (own === generation.current) setError(e.message); } finally { if (own === generation.current) setBusy(false); }
  }
  function importLink(value) {
    setCamera(false);
    try { const parsed = parseConnectionLink(value); onImport(parsed); close(); }
    catch (e) { setError(e.message); }
  }
  async function imageFile(file) {
    if (!file) return;
    const own = ++generation.current;
    setBusy(true); setCamera(false); setError('');
    try { const value = await readQrImage(file); if (own === generation.current) importLink(value); }
    catch (e) { if (own === generation.current) setError(e.message?.startsWith('QR') || e.message?.startsWith('20 MB') ? e.message : '画像を開けませんでした。PNG・JPEG・WebP を選んでください。'); }
    finally { if (own === generation.current) setBusy(false); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(qr.url); setCopied(true); }
    catch { setError('コピーできませんでした。下の接続リンクを選択してコピーしてください。'); }
  }
  return <>
    <div className="darask-qr-actions"><div><h3>QR でかんたん接続</h3><p className="darask-muted">同じ Tailscale に接続した PC 同士を登録します。</p></div><div className="darask-actions">
      <Button variant="primary" disabled={disabled || busy} onClick={() => { setError(''); setMode('import'); }}>QR で PC を追加</Button>
      <Button variant="outline" disabled={disabled || busy} onClick={() => { void showQr(); }}>この PC の QR を表示</Button>
    </div></div>
    <Modal open={mode !== null} onClose={close} title={mode === 'share' ? 'この PC に接続' : 'QR で PC を追加'} closeLabel="閉じる" className="darask-usage-modal">
      <div className="darask darask-qr-panel">
        {mode === 'share' && <>{busy && <p role="status">接続 QR を作成中…</p>}{qr && <>
          <div className="darask-qr-heading"><h2>{qr.host.name}</h2><Tag>Tailscale 内で接続</Tag></div>
          <p className="darask-muted">相手の DSH の「PC の接続」で読み取ると、この PC を登録できます。スマホのカメラで読み取ると DSH が開きます。</p>
          <figure className="darask-qr-card"><img src={qr.image} alt={`${qr.host.name} に接続する QR コード`} width="360" height="360" /><figcaption>{qr.origin.replace('https://', '')}</figcaption></figure>
          <div className="darask-actions"><Button onClick={() => { void copyLink(); }}>{copied ? 'コピーしました' : '接続リンクをコピー'}</Button><a className="darask-qr-download" href={qr.image} download={`DSH-${qr.host.name.replace(/[^A-Za-z0-9_-]/g, '_')}-QR.png`}>QR 画像を保存</a></div>
          <details><summary>接続リンクを表示</summary><Input readOnly value={qr.url} onFocus={event => event.target.select()} autoComplete="off" aria-label="この PC の認証リンク" /></details>
          <p className="darask-muted">認証情報を含む本人用の QR です。DSH を再起動したら新しい QR を表示してください。</p>
        </>}</>}
        {mode === 'import' && <>
          <p>接続先の PC で「この PC の QR を表示」を開き、読み取ってください。</p>
          <div className="darask-actions"><Button disabled={busy} variant="outline" onClick={() => { setError(''); setCamera(value => !value); }}>{camera ? 'カメラを閉じる' : 'カメラで読み取る'}</Button><Button disabled={busy} onClick={() => fileInput.current?.click()}>{busy ? '画像を読み取り中…' : 'QR 画像を選ぶ'}</Button></div>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void imageFile(file); }} />
          {camera && <CameraReader onRead={importLink} onError={message => { setCamera(false); setError(message); }} />}
          <label className="darask-field"><span>接続リンクを貼り付けても登録できます</span><Input value={link} type="password" autoComplete="off" disabled={busy} onChange={event => setLink(event.target.value)} placeholder="https://win.….ts.net:8443/?token=…" /></label>
          <Button variant="primary" disabled={busy || !link.trim()} onClick={() => importLink(link)}>接続情報を読み取る</Button>
          <p className="darask-muted">QR の解析はこの端末内で行います。読み取り後に PC 名を確認して保存できます。</p>
        </>}
        {error && <p role="alert" className="darask-error">{error}</p>}
      </div>
    </Modal>
  </>;
}
