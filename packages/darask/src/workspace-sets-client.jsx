import React,{useState,useEffect,useRef}from'react';
import{Button,Input}from'@deepseek-ai/dsh-client-ui-primitives';
const endpoint='/api/darask/workspace-sets';
async function request(body,suffix='',signal){const response=await fetch(endpoint+suffix,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([AbortSignal.timeout(45000),...(signal?[signal]:[])]),...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const value=await response.json();if(!response.ok||value.error)throw new Error(value.error||'ワークスペースを取得できません。');return value;}
const blank=()=>({id:crypto.randomUUID(),revision:0,name:'',roots:[{node:'local',path:'',label:''},{node:'local',path:'',label:''}]});
export function WorkspaceSetBrowser({set}){
 const[root,setRoot]=useState(set.roots[0]?.id??''),[folder,setFolder]=useState(''),[listing,setListing]=useState(null),[preview,setPreview]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const generation=useRef(0);const active=useRef(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function load(action,path='',id=root){const n=++generation.current;active.current?.abort();const c=new AbortController();active.current=c;setBusy(true);setError('');try{const value=await request({id:set.id,sessionId:set.sessionId,action,root:id,path},'/browse',c.signal);if(n!==generation.current)return;if(action==='list'){setListing(value);setFolder(path);setPreview(null);}else setPreview({path,...value});}catch(e){if(!c.signal.aborted)setError(e.message);}finally{if(n===generation.current)setBusy(false);}}
 useEffect(()=>{generation.current++;active.current?.abort();const first=set.roots[0]?.id??'';setRoot(first);setFolder('');setListing(null);setPreview(null);setBusy(false);},[set.id,set.revision]);
 return <div className="darask-set-browser">
  <label className="darask-field"><span>フォルダー</span><select value={root} onChange={e=>{setRoot(e.target.value);setFolder('');void load('list','',e.target.value);}}>{set.roots.map(r=><option key={r.id} value={r.id}>{r.node==='local'?'':'🌐 '}{r.label} · {r.pc}</option>)}</select></label>
  <p className="darask-meta">{set.roots.find(r=>r.id===root)?.path}{folder&&' / '+folder}</p>
  <div className="darask-actions"><Button disabled={busy} onClick={()=>void load('list',folder)}>一覧を表示・更新</Button>{folder&&<Button disabled={busy} onClick={()=>void load('list',folder.split('/').slice(0,-1).join('/'))}>上の階層</Button>}</div>
  {listing&&<div className="darask-folder-list">{listing.entries.map(e=><button key={e.name} type="button" disabled={busy||e.type==='other'} onClick={()=>void load(e.type==='directory'?'list':'read',[folder,e.name].filter(Boolean).join('/'))}>{e.type==='directory'?'▸':'·'} {e.name}</button>)}{listing.truncated&&<p>先頭の 1,000 件を表示しています。</p>}</div>}
  {preview&&<><strong>{preview.path}</strong><pre className="darask-set-preview">{preview.exists?preview.text:'ファイルが見つかりません。'}</pre></>}
  {error&&<p role="alert" className="darask-error">{error}</p>}
 </div>;
}
export function WorkspaceSetsEditor({data,onPicked}){
 const[sets,setSets]=useState([]),[draft,setDraft]=useState(blank),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{const c=new AbortController();request(null,'',c.signal).then(v=>setSets(v.sets)).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 const update=(index,patch)=>setDraft(s=>({...s,roots:s.roots.map((r,i)=>i===index?{...r,...patch}:r)}));
 async function save(){setBusy(true);setError('');try{const result=await request({action:'save',...draft});setSets(result.sets);setDraft(blank());setMessage('保存しました。サイドバーのワークスペースからセッションを追加できます。');window.dispatchEvent(new Event('darask-workspaces-changed'));onPicked?.(result.set.cwd);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function remove(set){setBusy(true);setError('');try{const result=await request({action:'remove',id:set.id,revision:set.revision});setSets(result.sets);window.dispatchEvent(new Event('darask-workspaces-changed'));}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="darask-integrations"><h3>複数フォルダーのワークスペース</h3><p className="darask-muted">異なる PC・ドライブのフォルダーを一つのセッションから扱えます。元のフォルダー、Git 履歴、既存ワークスペースはそのまま残ります。</p>
  {sets.map(set=><details key={set.id}><summary>{set.roots.some(r=>r.node!=='local')?'🌐 ':''}{set.name} · {set.roots.length} フォルダー</summary>
   <ul>{set.roots.map(r=><li key={r.id}>{r.node!=='local'?'🌐 ':''}{r.label} · {r.pc}<small> {r.path}</small></li>)}</ul>
   <div className="darask-actions"><Button disabled={busy} onClick={()=>{setDraft(set);setMessage('');}}>構成を編集</Button>{onPicked&&<Button onClick={()=>onPicked(set.cwd)}>このワークスペースを開く</Button>}<Button disabled={busy} onClick={()=>void remove(set)}>構成の登録を削除</Button></div>
   <WorkspaceSetBrowser set={set}/>
  </details>)}
  <div className="darask-fields"><label className="darask-field"><span>まとめるワークスペース名</span><Input disabled={busy} value={draft.name} onChange={e=>setDraft(s=>({...s,name:e.target.value}))} placeholder="アプリと資料"/></label>
  {draft.roots.map((r,index)=><div className="darask-set-root" key={index}><label className="darask-field"><span>フォルダー {index+1} の PC</span><select value={r.node} disabled={busy} onChange={e=>update(index,{node:e.target.value,path:''})}><option value="local">{data?.host?.name??'この PC'}</option>{data?.nodes?.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label><label className="darask-field"><span>絶対パス</span><Input disabled={busy} value={r.path} onChange={e=>update(index,{path:e.target.value})} placeholder="D:\\Projects または /Users/名前/Projects"/></label><label className="darask-field"><span>表示名（任意）</span><Input disabled={busy} value={r.label} onChange={e=>update(index,{label:e.target.value})} placeholder="ソース・資料など"/></label><Button disabled={busy||draft.roots.length<=2} onClick={()=>setDraft(s=>({...s,roots:s.roots.filter((_,i)=>i!==index)}))}>このフォルダーを外す</Button></div>)}
  <div className="darask-actions"><Button disabled={busy||draft.roots.length>=16} onClick={()=>setDraft(s=>({...s,roots:[...s.roots,{node:'local',path:'',label:''}]}))}>＋ フォルダーを追加</Button><Button variant="primary" disabled={busy||!draft.name.trim()||draft.roots.some(r=>!r.path.trim())} onClick={()=>void save()}>{busy?'保存中…':'構成を保存'}</Button>{draft.revision>0&&<Button disabled={busy} onClick={()=>setDraft(blank())}>新規作成に戻る</Button>}</div>
  </div>{message&&<p className="darask-login" role="status">{message}</p>}{error&&<p role="alert" className="darask-error">{error}</p>}
 </section>;
}
export function SessionFolderControls({set,pcs,busy,onChange}){
 const[node,setNode]=useState('local'),[absolutePath,setPath]=useState(''),[label,setLabel]=useState('');
 async function add(){if(await onChange({action:'add_root',node,absolutePath,label})){setPath('');setLabel('');}}
 return <section><h3>このセッションの作業フォルダー</h3>
  <p className="darask-muted">追加先はこの会話に保存されます。「外す」は登録だけを外し、実ファイルは削除しません。</p>
  <ul>{set.roots.map(r=><li key={r.id}>{r.node==='local'?'':'🌐 '}{r.label} · {r.pc}<p className="darask-meta">{r.path}</p>{r.removable?<Button disabled={busy} onClick={()=>void onChange({action:'remove_root',root:r.id})}>このセッションから外す</Button>:<small>ワークスペースの元の作業先</small>}</li>)}</ul>
  <label className="darask-field"><span>追加先の PC</span><select value={node} disabled={busy} onChange={e=>{setNode(e.target.value);setPath('');}}>{pcs.map(pc=><option key={pc.node} value={pc.node}>{pc.node==='local'?'':'🌐 '}{pc.name}{pc.status==='offline'?'（オフライン）':''}</option>)}</select></label>
  <label className="darask-field"><span>フォルダーの絶対パス</span><Input disabled={busy} value={absolutePath} onChange={e=>setPath(e.target.value)} placeholder="D:\\Projects または /Users/名前/Projects"/></label>
  <label className="darask-field"><span>表示名（任意）</span><Input disabled={busy} value={label} onChange={e=>setLabel(e.target.value)}/></label>
  <Button disabled={busy||!absolutePath.trim()||set.roots.length>=16} onClick={()=>void add()}>＋ 作業フォルダーを追加</Button>
 </section>;
}
function WorkspaceSetTab({sessionId}){
 const[set,setSet]=useState(null),[pcs,setPcs]=useState([{node:'local',name:'この PC'}]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const active=useRef(null),mutating=useRef(false),generation=useRef(0);
 useEffect(()=>{
  const c=new AbortController();active.current=c;setSet(null);setError('');setBusy(false);mutating.current=false;generation.current++;
  let timer;
  async function refresh(initial=false){
   const n=generation.current;
   try{if(!mutating.current&&sessionId){const v=await request({action:'list',sessionId,includePcs:initial},'/session',c.signal);if(!c.signal.aborted&&n===generation.current){setSet(v.set);if(v.pcs)setPcs(v.pcs);setError('');}}}
   catch(e){if(!c.signal.aborted&&n===generation.current)setError(e.message);}
   finally{if(!c.signal.aborted)timer=setTimeout(()=>void refresh(),5000);}
  }
  void refresh(true);return()=>{c.abort();clearTimeout(timer);};
 },[sessionId]);
 async function change(input){
  if(mutating.current)return false;
  const c=active.current,n=++generation.current;mutating.current=true;setBusy(true);setError('');
  try{const v=await request({...input,sessionId},'/session',c.signal);if(c.signal.aborted||n!==generation.current)return false;setSet(v.set);window.dispatchEvent(new Event('darask-workspaces-changed'));return true;}
  catch(e){if(!c.signal.aborted&&n===generation.current)setError(e.message);return false;}
  finally{if(!c.signal.aborted&&n===generation.current){mutating.current=false;setBusy(false);}}
 }
 return <div className="darask darask-set-tab">{error&&<p role="alert" className="darask-error">{error}</p>}{set?<><SessionFolderControls key={sessionId} set={set} pcs={pcs} busy={busy} onChange={change}/><WorkspaceSetBrowser set={set}/></>:<p>{sessionId?'作業フォルダーを読み込んでいます…':'セッションを選択してください。'}</p>}</div>;
}
export function registerWorkspaceSetUi(ctx){
 const scope=ctx;
 {
  const id='dsh-darask/workspace-folders';
  scope.effect(()=>scope.sidebarRightTabs.register({id,kind:'darask-folders',priority:'builtin',title:()=> 'フォルダー群',guide:[{order:11,title:()=> 'フォルダー群',description:()=> 'ローカル・リモートのフォルダーをまとめて参照',icon:()=> <span aria-hidden="true">📂</span>}]}));
  scope.slots.inject('sidebar.right.pane.tab',()=>scope.slots.register({name:'sidebar.right.pane.tab',key:id},WorkspaceSetTab));
  scope.slots.inject('sidebar.right.pane.tab.title',()=>scope.slots.register({name:'sidebar.right.pane.tab.title',key:id},()=> <span>フォルダー群</span>));
 }
}
