
import test from 'node:test';import assert from 'node:assert/strict';
import {Context} from '@deepseek-ai/cordis';
import SessionStore from '@deepseek-ai/dsh-session';
import {SessionQueryEngine} from '@deepseek-ai/dsh-session-query';
import {createUserMessage,createMessage} from '@deepseek-ai/dsh-llm';
import {createRemoteSessions,registerRemoteSessions} from '../src/remote-sessions.mjs';
const node='11111111-1111-4111-8111-111111111111',hostId='22222222-2222-4222-8222-222222222222',sessionId='session-33333333-3333-4333-8333-333333333333';
const otherId='session-44444444-4444-4444-8444-444444444444';
const cwd='/fixture/workspace',host={id:hostId,name:'Worker',platform:'win32'},origin='https://worker.example.com';
function seed(sessions,id,text,workspace=cwd){
  const events=[{type:'user/message',seq:0,time:1,surfaceOp:'append',data:createUserMessage({content:[{type:'text',text}],source:{kind:'user'}})},
  {type:'assistant/message',seq:1,time:2,surfaceOp:'append',data:{turn:1,step:1,stream:[],message:createMessage({role:'assistant',source:{kind:'model',provider:'grok',model:'grok-4.6'},content:[{type:'reasoning',text:'private reasoning'},{type:'text',text:'Saved caption. token=secret-fixture'},{type:'tool-call',id:'call-1',name:'write',arguments:'{}'}]})}}];
  return sessions.prepare(id,{meta:{cwd:workspace,isSeeded:false},seed:events});
}
test('native query lists and reads remote session text without activating an agent or exposing reasoning/tools',async t=>{
 const ctx=new Context();const sessions=new SessionStore(ctx);const query=new SessionQueryEngine(ctx);
 const session=seed(sessions,sessionId,'caption request');const detach=sessions.enter(session);t.after(detach);
 const worker=createRemoteSessions({hub:{info:()=>host,workspaceCatalog:async()=>[{node:'local',name:'Here',hostId,status:'online',workspaces:[{path:cwd,title:'Local'}]}]},query});
 const hub={info:()=>({id:'hub'}),workspaceCatalog:async()=>[{node:'local',name:'Hub',hostId:'hub',status:'online',workspaces:[]},{node,name:'Worker',hostId,status:'online',workspaces:[{path:cwd,title:'Fixture'}]}],remoteConnection:async()=>({node:{url:origin},host,cookie:'dsh-auth-fixture=private'})};
 let requests=0;const service=createRemoteSessions({hub,fetch:async(url,init)=>{requests++;assert.equal(init.headers.Cookie,'dsh-auth-fixture=private');assert.equal(init.redirect,'error');return worker.route.fetch(new Request(url,init));}});
 assert.equal((await service.run({action:'pcs'})).items[0].node,'local');
 assert.equal((await service.run({action:'pcs'})).items[1].workspaces[0].cwd,cwd);
 const list=await service.run({action:'list',node,cwd});assert.equal(list.items[0].sessionId,sessionId);
 const first=await service.run({action:'read',node,cwd,sessionId,limit:1});assert.equal(first.items[0].text,'caption request');assert.equal(first.nextOffset,1);
 const second=await service.run({action:'read',node,cwd,sessionId,offset:1,limit:1});assert.match(second.items[0].text,/Saved caption/);assert.equal(second.nextOffset,2); const end=await service.run({action:'read',node,cwd,sessionId,offset:2});assert.equal(end.nextOffset,null);
 assert.doesNotMatch(JSON.stringify(second),/private reasoning|secret-fixture|dsh-auth|arguments/);assert.equal(sessions.get(sessionId),session);assert.equal(requests,4);
 await assert.rejects(service.run({action:'read',node,cwd:'/other',sessionId}));
 await assert.rejects(worker.local({action:'list',cwd,expectedHost:node}));
 assert.equal((await worker.route.fetch(new Request(origin+'/api/darask/sessions/read-only',{method:'POST',headers:{Host:'worker.example.com',Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}))).status,403);
});
test('local node lists and searches user/assistant text across sessions',async t=>{
 const ctx=new Context();const sessions=new SessionStore(ctx);const query=new SessionQueryEngine(ctx);
 const one=seed(sessions,sessionId,'offset must be a positive integer');const two=seed(sessions,otherId,'No files were searched', '/other/workspace');
 const a=sessions.enter(one);const b=sessions.enter(two);t.after(a);t.after(b);
 const worker=createRemoteSessions({hub:{info:()=>host,workspaceCatalog:async()=>[{node:'local',name:'Here',hostId,status:'online',workspaces:[{path:cwd,title:'Local'}]}]},query});
 const found=await worker.run({action:'search',node:'local',query:'offset must be a positive integer'});
 assert.equal(found.node,'local');assert.equal(found.items[0].sessionId,sessionId);assert.match(found.items[0].text,/offset must be/);
 assert.doesNotMatch(JSON.stringify(found),/private reasoning|secret-fixture/);
 const listed=await worker.run({action:'list',node:'local'});
 assert.ok(listed.items.some(item=>item.sessionId===sessionId));
 assert.ok(listed.items.some(item=>item.sessionId===otherId));
 const scoped=await worker.run({action:'search',node:'local',cwd,query:'offset'});
 assert.equal(scoped.items.length,1);assert.equal(scoped.items[0].cwd,cwd);
 const remoteSearch=await worker.route.fetch(new Request(origin+'/api/darask/sessions/read-only',{method:'POST',headers:{Host:'worker.example.com',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'search',cwd,query:'offset',expectedHost:hostId})}));
 assert.equal(remoteSearch.status,200);
 const payload=await remoteSearch.json();assert.equal(payload.items[0].sessionId,sessionId);
 await assert.rejects(worker.run({action:'search',node,query:'offset'}));
});
test('dashboard route accepts only same-origin JSON list/read and reuses the bounded redacted reader',async t=>{
 const ctx=new Context();const sessions=new SessionStore(ctx);const query=new SessionQueryEngine(ctx);
 const session=seed(sessions,sessionId,'dashboard peek');const detach=sessions.enter(session);t.after(detach);
 const worker=createRemoteSessions({hub:{info:()=>host,workspaceCatalog:async()=>[{node:'local',name:'Here',hostId,status:'online',workspaces:[{path:cwd,title:'Local'}]}]},query});
 const post=(body,headers={})=>worker.dashboardRoute.fetch(new Request(origin+'/api/darask/sessions/dashboard',{method:'POST',headers:{Host:'worker.example.com',Origin:origin,'Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)}));
 assert.equal(worker.dashboardRoute.path,'/api/darask/sessions/dashboard');assert.deepEqual(worker.dashboardRoute.methods,['POST']);
 const list=await post({action:'list',node:'local',cwd});assert.equal(list.status,200);assert.equal(list.headers.get('Cache-Control'),'no-store');
 assert.equal((await list.json()).items[0].sessionId,sessionId);
 const read=await post({action:'read',node:'local',cwd,sessionId,limit:5});const payload=await read.json();
 assert.equal(payload.items[0].text,'dashboard peek');assert.doesNotMatch(JSON.stringify(payload),/private reasoning|secret-fixture|arguments/);
 assert.equal(sessions.get(sessionId),session,'peek must not activate or replace the session');
 assert.equal((await post({action:'search',node:'local',query:'peek'})).status,400);
 assert.equal((await post({action:'pcs'})).status,400);
 assert.equal((await post({action:'list',node:'local',cwd,expectedHost:hostId})).status,400);
 assert.equal((await post({action:'list',node:'local',cwd,query:'x'})).status,400);
 assert.equal((await post({action:'read',node:'local',cwd:'relative/path',sessionId})).status,400);
 assert.equal((await post('{"action":"list","node":"local","cwd":"'+'x'.repeat(20000)+'"}')).status,413);
 assert.equal((await post({action:'list',node:'local',cwd},{'Content-Type':'text/plain'})).status,415);
 assert.equal((await post({action:'list',node:'local',cwd},{Origin:'https://evil.example'})).status,403);
 assert.equal((await worker.dashboardRoute.fetch(new Request(origin+'/api/darask/sessions/dashboard',{method:'GET',headers:{Host:'worker.example.com'}}))).status,405);
});
test('read-only tool and dashboard route are registered on the authenticated native connection ',()=>{
 const routes=[];let tool;
 registerRemoteSessions({inject(deps,fn){assert.deepEqual(deps,['sessionQuery','tools']);fn({sessionQuery:{},connection:{fetch:{register(r){routes.push(r);}}},tools:{register(t){tool=t;}}});}},{});
 assert.deepEqual(routes.map(r=>r.path),['/api/darask/sessions/read-only','/api/darask/sessions/dashboard']);assert.equal(tool.name,'darask_remote_sessions');
 assert.match(JSON.stringify(tool.parameters),/"search"/);
});
