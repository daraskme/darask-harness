import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { publicOrigin } from './http.mjs';
import { validateComputerAction } from './computer.mjs';

const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export const COMPUTER_REMOTE_PATH='/api/darask/computer/control';
const LIMIT=5*1024*1024;
const error=()=>new Error('Computer: リモート PC の接続・画面操作の有効化・ログイン済みデスクトップを確認してください。操作結果が不明な場合は再観測してください。');
const view=result=>{
 const value={};
 for(const key of ['action','text','width','height','screenWidth','screenHeight','scaleX','scaleY','originX','originY','cursorX','cursorY','cursorShotX','cursorShotY','hwnd','title','windows','snapshotId','effect'])if(result[key]!==undefined)value[key]=result[key];
 return value;
};

export function createComputerRemote({computer,hub,directory,fetch:fetchImpl=globalThis.fetch}){
 const agents=new WeakMap();const defaultActor={};const receivers=new Map();
 function actorId(actor){const key=actor&&typeof actor==='object'?actor:defaultActor;if(!agents.has(key))agents.set(key,randomUUID());return agents.get(key);}
 function receiver(key){
  const now=Date.now();for(const[k,v]of receivers)if(now-v.at>120000)receivers.delete(k);
  if(!receivers.has(key)){if(receivers.size>=64)throw error();receivers.set(key,{at:now});}
  const actor=receivers.get(key);actor.at=now;return actor;
 }
 async function run(raw,exec={}){
  const {node,...args}=raw;
  if(args.action==='pcs'){
   const groups=await hub.workspaceCatalog();return {action:'pcs',text:JSON.stringify({local:hub.info(),pcs:groups.slice(0,64).map(g=>({node:g.node,name:g.name,status:g.status})),notice:'node を毎回指定してください。相手側でも PC 画面操作の有効化とログイン済みデスクトップが必要です。'})};
  }
  if(!node||node==='local')return computer.run(args,exec);
  if(!UUID.test(node))throw error();
  validateComputerAction({...args});exec.signal?.throwIfAborted();
  let response;
  try{
   const remote=await hub.remoteConnection(node);
   response=await fetchImpl(remote.node.url+COMPUTER_REMOTE_PATH,{method:'POST',redirect:'error',signal:AbortSignal.any([...(exec.signal?[exec.signal]:[]),AbortSignal.timeout(30000)]),headers:{'Content-Type':'application/json',Origin:remote.node.url,Cookie:remote.cookie},body:JSON.stringify({args,expectedHost:remote.host.id,actor:actorId(exec.agent)})});
   if(!response.ok){if([401,403].includes(response.status))hub.invalidateRemote(node);await response.body?.cancel();throw error();}
   const chunks=[];let length=0;const reader=response.body.getReader();
   try{for(;;){const{done,value}=await reader.read();if(done)break;length+=value.length;if(length>LIMIT)throw error();chunks.push(value);}}finally{await reader.cancel();}
   const envelope=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(envelope.host!==remote.host.id||envelope.value?.action!==args.action||typeof envelope.value.text!=='string')throw error();
   const result=view(envelope.value);result.text=`操作先 PC: ${remote.host.name} (${node})\n${result.text}`;
   if(envelope.png!==undefined){
    if(typeof envelope.png!=='string'||envelope.png.length>4*1024*1024||!/^[A-Za-z0-9+/]+={0,2}$/.test(envelope.png))throw error();
    const bytes=Buffer.from(envelope.png,'base64');if(!bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))throw error();
    if(!exec.attachments?.saveImage)throw new Error('Computer: このセッションでは画像を返せません。inspect を使用してください。');
    result.image=await exec.attachments.saveImage({data:bytes,mediaType:'image/png',name:'remote-screen.png'});
   }
   return result;
  }catch(cause){exec.signal?.throwIfAborted();if(cause?.message?.startsWith('Computer: このセッション'))throw cause;throw error();}
 }
 const route={path:COMPUTER_REMOTE_PATH,methods:['POST'],requestBody:'buffered',async fetch(request){
  const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  try{publicOrigin(request);}catch{return json({error:'接続元を確認してください。'},403);}
  if(request.method!=='POST')return json({error:'POST を使用してください。'},405);
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({error:'JSON を使用してください。'},415);
  try{
   const raw=await request.text();if(Buffer.byteLength(raw)>32768)return json({error:'入力が長すぎます。'},413);
   const input=JSON.parse(raw);
   if(Object.keys(input).some(k=>!['expectedHost','actor','args'].includes(k))||input.expectedHost!==hub.info().id||!UUID.test(input.actor??'')||!input.args||'node'in input.args)throw error();
   validateComputerAction({...input.args});
   const result=await computer.run(input.args,{agent:receiver(input.actor),signal:request.signal});
   const envelope={host:hub.info().id,value:view(result)};
   if(result.file){
    const file=path.resolve(result.file),shots=path.resolve(directory,'computer');
    if(path.dirname(file)!==shots||!UUID.test(path.basename(file,'.png'))||path.extname(file)!=='.png')throw error();
    const bytes=await readFile(file);if(bytes.length>3*1024*1024)throw error();envelope.png=bytes.toString('base64');
   }
   if(Buffer.byteLength(JSON.stringify(envelope))>LIMIT)throw error();
   return json(envelope);
  }catch{return json({error:error().message},400);}
 }};
 return {run,route};
}
