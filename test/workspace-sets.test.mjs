import test from 'node:test';import assert from'node:assert/strict';import{mkdtemp,mkdir,readFile,writeFile,rm,realpath,symlink}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';import{randomUUID}from'node:crypto';import{Context}from'@deepseek-ai/cordis';import{LocalFileSystem}from'@deepseek-ai/dsh-fs-local';
import{createWorkspaceSets,registerWorkspaceSetTools}from'../src/workspace-sets.mjs';
function registry(){const rows=[];return {list:()=>rows,get:id=>rows.find(r=>r.id===id),async create(p){p=await realpath(p);let row=rows.find(r=>r.path===p);if(!row){row={id:randomUUID(),path:p,title:path.basename(p),async setTitle(t){this.title=t;}};rows.push(row);}return row;},async delete(id){const i=rows.findIndex(r=>r.id===id);if(i<0)return false;rows.splice(i,1);return true;}};}
test('multiple local/remote roots persist, route reads and atomic edits to the correct PC, retain original folders and reject stale writes',async t=>{
 const parent=path.resolve(tmpdir()),dir=await mkdtemp(path.join(parent,'darask-workspace-sets-'));t.after(async()=>{assert.equal(path.dirname(dir),parent);assert.ok(path.basename(dir).startsWith('darask-workspace-sets-'));await rm(dir,{recursive:true,force:true});});
 const a=path.join(dir,'source'),b=path.join(dir,'remote-docs');await mkdir(a);await mkdir(b);await writeFile(path.join(a,'same.txt'),'local');await writeFile(path.join(b,'same.txt'),'remote');
 const localRegistry=registry(),remoteRegistry=registry(),node=randomUUID(),localHost={id:randomUUID(),name:'Hub'},remoteHost={id:randomUUID(),name:'Worker'};
 const policy={defaultMode:'workspace-write',resolve:({session}={})=>({mode:session?.readOnly?'read-only':'workspace-write'})};
 const fs=new LocalFileSystem(new Context(),{cwd:dir,diffBasisMaxBytes:2*1024*1024});
 const worker=createWorkspaceSets({directory:path.join(dir,'worker-state'),hub:{info:()=>remoteHost},registry:remoteRegistry,fs,policy});
 const hub={info:()=>localHost,async action(input){const remote=input.node===node;return{workspace:await(remote?remoteRegistry:localRegistry).create(input.path),host:remote?remoteHost:localHost};},async remoteConnection(id){assert.equal(id,node);return{node:{url:'https://worker.example.com'},host:remoteHost,cookie:'test-cookie'};}};
 let calls=0;const options={directory:path.join(dir,'hub-state'),hub,registry:localRegistry,fs,policy,fetch:async(url,init)=>{calls++;assert.equal(init.headers.Cookie,'test-cookie');assert.equal(init.redirect,'error');return worker.routes[1].fetch(new Request(url,init));}};
 const sets=createWorkspaceSets(options);await sets.initialize();const saved=await sets.action({action:'save',id:randomUUID(),revision:0,name:'Mixed project',roots:[{node:'local',path:a,label:'Source'},{node,path:b,label:'Docs'}]});
 const reopened=createWorkspaceSets(options);await reopened.initialize();assert.equal(reopened.list().length,1);assert.equal(reopened.list()[0].roots[1].node,node);
 const exec={agent:{session:{header:{id:'session-'+randomUUID(),cwd:saved.cwd}}}};const roots=(await reopened.run({action:'roots'},exec)).roots;
 const local=await reopened.run({action:'read',root:roots[0].id,path:'same.txt'},exec);const remote=await reopened.run({action:'read',root:roots[1].id,path:'same.txt'},exec);assert.equal(local.text,'local');assert.equal(remote.text,'remote');assert.equal(calls,1);
 const updated=await reopened.run({action:'edit',root:roots[1].id,path:'same.txt',version:remote.version,oldString:'remote',newString:'remote edited'},exec);assert.equal(updated.saved,true);assert.equal(await readFile(path.join(a,'same.txt'),'utf8'),'local');assert.equal(await readFile(path.join(b,'same.txt'),'utf8'),'remote edited');
 await assert.rejects(reopened.run({action:'write',root:roots[1].id,path:'same.txt',version:remote.version,text:'stale'},exec));
 await assert.rejects(reopened.run({action:'read',root:roots[0].id,path:'../remote-docs/same.txt'},exec));
 await assert.rejects(reopened.run({action:'write',root:roots[0].id,path:'same.txt',version:local.version,text:'denied'},{agent:{session:{readOnly:true,header:exec.agent.session.header}}}));
 const absent=await reopened.run({action:'read',root:roots[0].id,path:'new.txt'},exec);assert.equal(absent.version,null);await reopened.run({action:'write',root:roots[0].id,path:'new.txt',version:absent.version,text:'new'},exec);
 await assert.rejects(reopened.run({action:'write',root:roots[0].id,path:'same.txt',version:null,text:'overwritten'},exec));
 await assert.rejects(reopened.action({action:'save',id:saved.id,revision:0,name:'Stale',roots:saved.roots}));
 await reopened.action({action:'remove',id:saved.id,revision:saved.revision});assert.equal(reopened.list().length,0);assert.equal(await readFile(path.join(a,'same.txt'),'utf8'),'local');assert.equal(await readFile(path.join(b,'same.txt'),'utf8'),'remote edited');
});
test('workspace-set tool compiles with native schema and never appears as an unsupported nullable schema',()=>{
 let tool;registerWorkspaceSetTools({inject(deps,fn){if(deps[0]==='tools')fn({tools:{register:t=>tool=t}});else fn({systemPrompt:{context:()=>{}}});}},{list:()=>[]});
 assert.equal(tool.name,'darask_workspace_files');
});

test('an existing session can add and remove a remote folder, persist it, and keep other sessions and files intact',async t=>{
 const parent=path.resolve(tmpdir()),dir=await mkdtemp(path.join(parent,'darask-session-folders-'));
 t.after(async()=>{assert.equal(path.dirname(dir),parent);assert.ok(path.basename(dir).startsWith('darask-session-folders-'));await rm(dir,{recursive:true,force:true});});
 const a=path.join(dir,'original'),b=path.join(dir,'remote');await mkdir(a);await mkdir(b);await writeFile(path.join(b,'keep.txt'),'keep');
 const reg=registry(),workerReg=registry(),original=await reg.create(a),host={id:randomUUID(),name:'Hub'},remoteHost={id:randomUUID(),name:'Worker'},node=randomUUID();
 const header={id:'session-'+randomUUID(),cwd:original.path},other={...header,id:'session-'+randomUUID()},exec={agent:{session:{header}}};
 const policy={defaultMode:'workspace-write',resolve:()=>({mode:'workspace-write'})},fs=new LocalFileSystem(new Context(),{cwd:dir,diffBasisMaxBytes:2*1024*1024});
 const worker=createWorkspaceSets({directory:path.join(dir,'worker-state'),hub:{info:()=>remoteHost},registry:workerReg,fs,policy});
 const options={directory:path.join(dir,'state'),registry:reg,fs,policy,getSessionHeader:async id=>id===header.id?header:null,
  hub:{info:()=>host,workspaceCatalog:async()=>[{node:'local',name:'Hub'},{node,name:'Worker'}],
   async action(input){assert.equal(input.action,'register');return {workspace:await(input.node==='local'?reg:workerReg).create(input.path),host:input.node==='local'?host:remoteHost};},
   remoteConnection:async id=>{assert.equal(id,node);return {node:{url:'https://worker.example.com'},host:remoteHost,cookie:'test-cookie'};}},
  fetch:async(url,init)=>worker.routes.find(r=>r.path.endsWith('/files')).fetch(new Request(url,init))};
 const sets=createWorkspaceSets(options);await sets.initialize();
 const before=sets.currentForHeader(header);assert.equal(before.roots.length,1);assert.equal(before.roots[0].removable,false);
 const added=await sets.run({action:'add_root',node,absolutePath:b,label:'Remote files'},exec);assert.equal(added.sessionId,header.id);assert.equal(added.cwd,original.path);assert.equal(added.roots.length,2);
 assert.equal(sets.currentForHeader(other).roots.length,1,'folder additions are scoped to this session');
 const extra=added.roots.find(r=>r.removable);assert.equal(extra.node,node);
 await Promise.all([sets.run({action:'add_root',node,absolutePath:b},exec),sets.run({action:'add_root',node,absolutePath:b},exec)]);
 assert.equal(sets.currentForHeader(header).roots.length,2,'concurrent duplicate additions are idempotent');
 const reopened=createWorkspaceSets(options);await reopened.initialize();assert.deepEqual(reopened.currentForHeader(header).roots,added.roots);
 const read=await reopened.run({action:'read',root:extra.id,path:'keep.txt'},exec);assert.equal(read.text,'keep');
 await reopened.run({action:'edit',root:extra.id,path:'keep.txt',version:read.version,oldString:'keep',newString:'keep edited'},exec);
 const route=reopened.routes.find(r=>r.path.endsWith('/session'));
 const post=(body,origin='https://hub.example.com')=>route.fetch(new Request('https://hub.example.com'+route.path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const response=await post({action:'list',sessionId:header.id,includePcs:true});assert.equal(response.status,200);assert.equal((await response.json()).pcs.length,2);
 assert.equal((await post({action:'remove_root',sessionId:header.id,root:extra.id},'https://untrusted.example.com')).status,400);
 assert.equal((await post({action:'list',sessionId:other.id})).status,400);
 await assert.rejects(reopened.run({action:'remove_root',root:original.id},exec),/元の作業先/);
 const removed=await post({action:'remove_root',sessionId:header.id,root:extra.id});assert.equal(removed.status,200);assert.equal((await removed.json()).set.roots.length,1);
 const final=createWorkspaceSets(options);await final.initialize();assert.equal(final.currentForHeader(header).roots.length,1);
 assert.equal(await readFile(path.join(b,'keep.txt'),'utf8'),'keep edited');assert.ok(workerReg.get(extra.workspaceId),'removal keeps the original workspace registration');assert.ok(reg.get(original.id));
 await assert.rejects(final.run({action:'read',root:extra.id,path:'keep.txt'},exec),/フォルダー ID/);
});
