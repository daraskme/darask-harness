import test from 'node:test';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';import{createComputerRemote,COMPUTER_REMOTE_PATH}from'../src/computer-remote.mjs';
const node=randomUUID(),host={id:randomUUID(),name:'Worker'},origin='https://worker.example.com';
test('remote Computer Use routes only saved nodes, isolates agents and does not resend mutations',async()=>{
 const calls=[];let requests=0;let deny=false;
 const worker=createComputerRemote({directory:'.',hub:{info:()=>host},computer:{run:async(args,exec)=>{calls.push({args,agent:exec.agent});return {action:args.action,text:'observed',snapshotId:randomUUID()};}}});
 const hub={info:()=>({id:randomUUID(),name:'Hub'}),workspaceCatalog:async()=>[{node,name:'Worker',status:'online'}],remoteConnection:async id=>{assert.equal(id,node);return{node:{url:origin},host,cookie:'test-only-cookie'}},invalidateRemote:()=>{}};
 const computer=createComputerRemote({directory:'.',hub,computer:{run:args=>({action:args.action,text:'local'})},fetch:async(url,init)=>{
  requests++;assert.equal(url,origin+COMPUTER_REMOTE_PATH);assert.equal(init.redirect,'error');assert.equal(init.headers.Cookie,'test-only-cookie');
  return deny?new Response('{}',{status:503}):worker.route.fetch(new Request(url,init));
 }});
 assert.equal(JSON.parse((await computer.run({action:'pcs'})).text).pcs[0].node,node);
 assert.equal((await computer.run({action:'windows',node:'local'})).text,'local');assert.equal(requests,0);
 const agent={};const first=await computer.run({action:'inspect',node,hwnd:'42'},{agent});await computer.run({action:'invoke',node,elementId:'0',snapshotId:first.snapshotId},{agent});
 assert.equal(calls[0].agent,calls[1].agent);assert.match(first.text,/Worker/);
 await computer.run({action:'windows',node},{agent:{}});assert.notEqual(calls[0].agent,calls[2].agent);
 await assert.rejects(computer.run({action:'windows',node:'https://evil.example'}));assert.equal(requests,3);
 deny=true;await assert.rejects(computer.run({action:'invoke',node,elementId:'0',snapshotId:first.snapshotId},{agent}));assert.equal(requests,4);
});
test('native remote computer route enforces origin, host and actor and refuses remote chaining',async()=>{
 let dispatched=0;const worker=createComputerRemote({directory:'.',hub:{info:()=>host},computer:{run:async()=>{dispatched++;}}});
 const body={expectedHost:host.id,actor:randomUUID(),args:{action:'windows'}};
 const request=(b,from=origin)=>new Request(origin+COMPUTER_REMOTE_PATH,{method:'POST',headers:{Origin:from,'Content-Type':'application/json'},body:JSON.stringify(b)});
 assert.equal((await worker.route.fetch(request(body,'https://evil.example'))).status,403);
 assert.equal((await worker.route.fetch(request({...body,expectedHost:randomUUID()}))).status,400);
 assert.equal((await worker.route.fetch(request({...body,actor:'anything'}))).status,400);
 assert.equal((await worker.route.fetch(request({...body,args:{action:'windows',node}}))).status,400);
 assert.equal(dispatched,0);
});
