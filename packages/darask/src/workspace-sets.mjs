import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { publicOrigin } from './http.mjs';

export const WORKSPACE_SETS_PATH='/api/darask/workspace-sets';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const MAX=1024*1024;
const fail=message=>new Error(message||'複数フォルダーのワークスペースを確認してください。');
const label=value=>{if(typeof value!=='string'||!value.trim()||value.length>120||/[\x00-\x1f]/.test(value))throw fail('名前は 1〜120 文字で指定してください。');return value.trim();};
const relative=value=>{if(typeof value!=='string'||value.length>2000||/[\x00-\x1f:]/.test(value)||/^[\\/]/.test(value)||value.split(/[\\/]/).some(x=>x==='..'))throw fail('フォルダー内の相対パスを指定してください。');return value;};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
async function payload(request){publicOrigin(request);if(request.method!=='POST'||request.headers.get('content-type')?.split(';')[0]!=='application/json')throw fail('JSON の POST が必要です。');const body=await request.text();if(Buffer.byteLength(body)>MAX+32768)throw fail('入力が長すぎます。');return JSON.parse(body);}

export function createWorkspaceSets({directory,hub,registry,fs,policy,getSessionHeader,fetch:fetchImpl=globalThis.fetch}){
 const file=path.join(directory,'workspace-sets.json'),homes=path.join(directory,'workspace-sets');
 let state={version:1,sets:[],sessions:[]};let chain=Promise.resolve();
 const list=()=>state.sets.filter(s=>registry.get(s.workspaceId)).map(s=>({...s,name:registry.get(s.workspaceId).title}));
 async function persist(next){const temp=file+'.'+randomUUID()+'.tmp';await mkdir(directory,{recursive:true});await writeFile(temp,JSON.stringify(next,null,2),{mode:0o600});await rename(temp,file);state=next;}
 async function initialize(){try{const next=JSON.parse(await readFile(file,'utf8'));if(next.version!==1||!Array.isArray(next.sets)||next.sets.some(s=>!UUID.test(s.id)||!Array.isArray(s.roots)))throw fail('保存済みワークスペースの形式が不正です。');state={...next,sessions:next.sessions??[]};}catch(e){if(e.code!=='ENOENT')throw e;}}
 async function save(input){
  if(!UUID.test(input.id)||!Number.isInteger(input.revision)||input.revision<0||!Array.isArray(input.roots)||input.roots.length<2||input.roots.length>16)throw fail('2〜16 個のフォルダーを指定してください。');
  const name=label(input.name),old=state.sets.find(s=>s.id===input.id);
  if((old?.revision??0)!==input.revision)throw fail('別の画面で更新されています。一覧を再読み込みしてください。');
  if(registry.list().some(w=>w.title===name&&w.id!==old?.workspaceId))throw fail('同名のワークスペースがあります。');
  const roots=[];const seen=new Set();
  for(const proposed of input.roots){
   if(!proposed||!(proposed.node==='local'||UUID.test(proposed.node))||typeof proposed.path!=='string'||proposed.path.length>4096)throw fail();
   const response=await hub.action({action:'register',node:proposed.node,path:proposed.path,requestId:randomUUID()});
   const node=response.sameMachine?'local':proposed.node;
   const key=node+':'+response.workspace.id;if(seen.has(key))throw fail('同じ PC の同じフォルダーが重複しています。');seen.add(key);
   if(response.workspace.path===old?.cwd||response.workspace.path.startsWith(homes+path.sep))throw fail('複数フォルダーワークスペース自体を含めることはできません。');
   const previous=old?.roots.find(r=>r.node===node&&r.workspaceId===response.workspace.id);
   roots.push({id:previous?.id??randomUUID(),node,workspaceId:response.workspace.id,hostId:response.host.id,pc:response.host.name,path:response.workspace.path,label:label(proposed.label||response.workspace.title)});
  }
  const cwd=path.join(homes,input.id);await mkdir(cwd,{recursive:true});
  const workspace=old&&registry.get(old.workspaceId)||await registry.create(cwd);await workspace.setTitle(name);
  const next={id:input.id,revision:input.revision+1,workspaceId:workspace.id,cwd,name,roots};
  await persist({...state,sets:[...state.sets.filter(s=>s.id!==input.id),next]});return next;
 }
 async function remove(input){const selected=state.sets.find(s=>s.id===input.id);if(!selected)throw fail();if(selected.revision!==input.revision)throw fail('一覧を再読み込みしてください。');await registry.delete(selected.workspaceId);await persist({...state,sets:state.sets.filter(s=>s.id!==input.id)});return {removed:true};}
 async function action(input){const run=chain.catch(()=>{}).then(()=>input.action==='save'?save(input):input.action==='remove'?remove(input):Promise.reject(fail()));chain=run;return run;}

 /** Every path is resolved by the destination PC's native filesystem. Its
  * sandbox and atomic version guards remain active; no remote path is opened locally. */
 async function localFiles(input,signal){
  if(input.expectedHost!==hub.info().id||!UUID.test(input.workspaceId)||!['list','read','write','edit'].includes(input.action)||!['read-only','workspace-write'].includes(input.mode))throw fail();
  const workspace=registry.get(input.workspaceId);if(!workspace)throw fail('元のフォルダー登録が見つかりません。');
  const rel=relative(input.path??'');const root=await fs.resolve(workspace.path,{signal});const target=await fs.resolve(rel||'.',{cwd:workspace.path,signal});
  if(!fs.contains(root,target))throw fail('登録フォルダーの外にはアクセスできません。');
  const info=await fs.stat(target,signal);
  if(input.action==='list'){
   if(info?.type!=='directory')throw fail('フォルダーが見つかりません。');
   const rows=await fs.listDir(target,signal);return {path:rel,entries:rows.slice(0,1000).map(e=>({name:e.name,type:e.type,size:e.size})),truncated:rows.length>1000};
  }
  if(input.action==='read'){
   if(!info)return {path:rel,exists:false,version:null};
   if(info.type!=='file'||info.size>MAX)throw fail('1 MiB 以下のテキストファイルを選んでください。');
   const content=await fs.readText(target,signal);if(Buffer.byteLength(content)>MAX)throw fail('ファイルが大きすぎます。');
   const current=await fs.stat(target,signal);if(current?.version!==info.version)throw fail('読み取り中に変更されました。もう一度読み取ってください。');
   return {path:rel,exists:true,version:info.version,text:content};
  }
  const mode=input.mode==='read-only'||policy.defaultMode==='read-only'?'read-only':'workspace-write';
  if(mode==='read-only')throw fail('現在の DSH 権限は読み取り専用です。');
  if(input.version!==null&&(typeof input.version!=='string'||input.version.length>1000))throw fail('先に read で現在の version を取得してください。');
  const bounded=value=>{if(typeof value!=='string'||Buffer.byteLength(value)>MAX)throw fail('編集内容は 1 MiB 以下のテキストにしてください。');return value;};
  const sandbox={mode,workspaceRoot:workspace.path};
  let result;
  if(input.action==='write')result=await fs.writeText(target,bounded(input.text),input.version===null?{kind:'createIfAbsent'}:{kind:'replaceIfVersion',version:input.version},signal,sandbox);
  else{if(!input.version||!input.oldString)throw fail('edit には現在の version と置換前の文字列が必要です。');result=await fs.editText(target,{oldString:bounded(input.oldString),newString:bounded(input.newString),replaceAll:input.replaceAll===true},{version:input.version},signal,sandbox);}
  return {path:rel,version:result.version,saved:true};
 }
 async function filesFor(selected,input,exec={}){
  const root=selected.roots.find(r=>r.id===input.root);if(!root)throw fail('roots にあるフォルダー ID を選んでください。');
  const mode=policy.resolve({session:exec.agent?.session}).mode==='read-only'?'read-only':'workspace-write';
  const request={action:input.action,workspaceId:root.workspaceId,expectedHost:root.hostId,mode,path:input.path??'',version:input.version,text:input.text,oldString:input.oldString,newString:input.newString,replaceAll:input.replaceAll};
  let result;
  if(root.node==='local')result=await localFiles(request,exec.signal);
  else{
   const remote=await hub.remoteConnection(root.node);if(remote.host.id!==root.hostId)throw fail('接続先 PC が変わっています。ワークスペースを編集して確認してください。');
   const response=await fetchImpl(remote.node.url+WORKSPACE_SETS_PATH+'/files',{method:'POST',redirect:'error',signal:AbortSignal.any([...(exec.signal?[exec.signal]:[]),AbortSignal.timeout(20000)]),headers:{Origin:remote.node.url,Cookie:remote.cookie,'Content-Type':'application/json'},body:JSON.stringify(request)});
   const reader=response.body.getReader(),chunks=[];let bytes=0;
   try{for(;;){const{done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>MAX+32768)throw fail('応答が大きすぎます。');chunks.push(value);}}finally{await reader.cancel();}
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!response.ok||body.error)throw fail('リモートの読み書きに失敗しました。接続・権限・ファイルの version を確認して再取得してください。書き込みは自動再送しません。');result=body;
  }
  return {root:root.id,pc:root.pc,node:root.node,...result};
 }
 function currentForHeader(header){
  if(!header?.id||!header.cwd)return null;
  const group=list().find(s=>s.cwd===header.cwd);
  const workspace=registry.list().find(w=>w.path===header.cwd);
  const base=group?.roots??(workspace?[{id:workspace.id,node:'local',workspaceId:workspace.id,hostId:hub.info().id,pc:hub.info().name,path:workspace.path,label:workspace.title}]:[]);
  const saved=state.sessions.find(s=>s.sessionId===header.id);
  const roots=[...base.map(r=>({...r,removable:false})),...(saved?.roots??[]).filter(r=>!base.some(b=>b.node===r.node&&b.workspaceId===r.workspaceId)).map(r=>({...r,removable:true}))];
  return {id:header.id,sessionId:header.id,cwd:header.cwd,name:group?.name??workspace?.title??'このセッション',revision:(group?.revision??0)+(saved?.revision??0),roots};
 }
 async function sessionRoot(input,header){
  if(!header?.id||!/^session-[a-f0-9-]{36}$/.test(header.id)||!header.cwd)throw fail('セッションを確認してください。');
  const old=state.sessions.find(s=>s.sessionId===header.id)??{sessionId:header.id,revision:0,roots:[]};
  let roots=old.roots;
  if(input.action==='remove_root'){
   if(!roots.some(r=>r.id===input.root))throw fail('元の作業先はこの操作では外せません。');roots=roots.filter(r=>r.id!==input.root);
  }else{
   if(!(input.node==='local'||UUID.test(input.node))||typeof input.absolutePath!=='string'||input.absolutePath.length>4096)throw fail('pcs の node と追加先の絶対パスを指定してください。');
   const response=await hub.action({action:'register',node:input.node,path:input.absolutePath,requestId:randomUUID()});
   const node=response.sameMachine?'local':input.node;
   if(node==='local'&&(response.workspace.path===homes||response.workspace.path.startsWith(homes+path.sep)))throw fail('セッション管理用フォルダーは追加できません。元の作業フォルダーを選んでください。');
   const current=currentForHeader(header);if(current.roots.some(r=>r.node===node&&r.workspaceId===response.workspace.id))return current;
   if(current.roots.length>=16)throw fail('追加できる作業先は合計 16 個までです。');
   roots=[...roots,{id:randomUUID(),node,workspaceId:response.workspace.id,hostId:response.host.id,pc:response.host.name,path:response.workspace.path,label:label(input.label||response.workspace.title)}];
  }
  const next={...old,revision:old.revision+1,roots};await persist({...state,sessions:[...state.sessions.filter(s=>s.sessionId!==header.id),next]});return currentForHeader(header);
 }
 async function changeSession(input,header){const run=chain.catch(()=>{}).then(()=>sessionRoot(input,header));chain=run;return run;}
 const pcs=async()=> (await hub.workspaceCatalog()).map(g=>({node:g.node,name:g.name,status:g.status}));
 async function run(input,exec){
  const header=exec?.agent?.session?.header;
  if(input.action==='pcs')return {pcs:await pcs()};
  if(['add_root','remove_root'].includes(input.action))return changeSession(input,header);
  const selected=currentForHeader(header);if(!selected)throw fail('セッション内でこのツールを使用してください。');
  if(input.action==='roots')return {workspace:selected.name,roots:selected.roots};return filesFor(selected,input,exec);
 }
 async function sessionHeader(id){if(typeof id!=='string'||!/^session-[a-f0-9-]{36}$/.test(id)||!getSessionHeader)throw fail('セッションを確認してください。');const header=await getSessionHeader(id);if(!header)throw fail('セッションが見つかりません。');return header;}
 const routes=[{path:WORKSPACE_SETS_PATH,methods:['GET','POST'],requestBody:'buffered',async fetch(request){try{if(request.method==='GET')return json({sets:list()});return json({set:await action(await payload(request)),sets:list()});}catch(e){return json({error:e.message},400);}}},
 {path:WORKSPACE_SETS_PATH+'/files',methods:['POST'],requestBody:'buffered',async fetch(request){try{return json(await localFiles(await payload(request),request.signal));}catch(e){return json({error:e.code==='FS_STALE_VERSION'?'ファイルが変更されています。再読み取りしてください。':e.message},400);}}},
 {path:WORKSPACE_SETS_PATH+'/browse',methods:['POST'],requestBody:'buffered',async fetch(request){try{const input=await payload(request);if(!['list','read'].includes(input.action))throw fail('プレビューは読み取り専用です。');const selected=input.sessionId?currentForHeader(await sessionHeader(input.sessionId)):list().find(s=>s.id===input.id);if(!selected)throw fail();return json(await filesFor(selected,input,{signal:request.signal}));}catch(e){return json({error:e.message},400);}}}];
 routes.push({path:WORKSPACE_SETS_PATH+'/session',methods:['POST'],requestBody:'buffered',async fetch(request){try{
  const input=await payload(request),header=await sessionHeader(input.sessionId);
  if(!['list','add_root','remove_root'].includes(input.action))throw fail();
  const set=input.action==='list'?currentForHeader(header):await changeSession(input,header);
  return json({set,...(input.includePcs===true?{pcs:await pcs()}: {})});
 }catch(e){return json({error:e.message},400);}}});
 return {initialize,list,action,run,localFiles,filesFor,currentForHeader,routes};
}

export function registerWorkspaceSetTools(ctx,sets){
 ctx.inject(['tools'],scope=>scope.tools.register(defineTool({name:'darask_workspace_files',description:'このセッションの作業フォルダーを追加し、所属 PC 上で読み書きする。ユーザーが追加の作業先を指定した場合は pcs で node を確認し add_root(node,absolutePath,label) でセッションに保存する。既存の会話と元フォルダーは保つ。roots でフォルダー ID を確認。remove_root は追加分だけ外す。list/read/write/edit は root とその内部の相対 path を指定。read の version を write/edit に渡し、存在しないファイルは version:null で新規作成。1 MiB までのテキスト。画面に表示された PC と root を混同しない。',
  parameters:{action:{type:'string',enum:['pcs','roots','add_root','remove_root','list','read','write','edit'],required:true},node:{type:'string'},absolutePath:{type:'string'},label:{type:'string'},root:{type:'string'},path:{type:'string'},version:{oneOf:[{type:'string'},{type:'null'}]},text:{type:'string'},oldString:{type:'string'},newString:{type:'string'},replaceAll:{type:'boolean'}},
  output:{schema:{type:'object',additionalProperties:false,properties:{text:{type:'string',required:true}}},render:(_a,r)=>[{type:'text',text:r.text}]},async execute(args,exec){return {text:JSON.stringify(await sets.run(args,exec))};}
 })));
 ctx.inject(['systemPrompt'],scope=>scope.systemPrompt.context({name:'darask:workspace-folders',order:995,text:context=>{
  const header=context.agent?.session?.header;const current=sets.currentForHeader(header);if(!current||current.roots.length<2)return '追加の作業フォルダーをユーザーが指定した場合は darask_workspace_files の pcs と add_root でこのセッションに登録し、roots で対象 PC とフォルダーを確認する。';
  return `このセッションは複数フォルダーのワークスペースです。darask_workspace_files の roots で所属 PC と root ID を確認し、ファイル操作には同ツールを使ってください。roots にない cwd へ作業ファイルを保存しないでください。リモートパスをローカルの read/write/pwsh に渡さないでください。各フォルダーの AGENTS.md があれば read で確認してください。元のフォルダー・Git 履歴は各 PC に残っています。対象: ${JSON.stringify(current.roots.map(r=>({root:r.id,pc:r.pc,label:r.label,path:r.path})))}`;
 }}));
}
