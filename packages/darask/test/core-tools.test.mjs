import test from 'node:test';import assert from 'node:assert/strict';import {registerCoreTools} from '../src/core-tools.mjs';
test('Browser Run schema cannot prevent computer and CLI tools from registering', async()=>{
 const tools=[];registerCoreTools({tools:{register:t=>tools.push(t)},get:()=>undefined},{browserRun:{run:async()=>({action:'content',text:'ok'})},store:{get:()=>({})},service:{snapshots:{}},config:{},computer:{run:async()=>({action:'pcs',text:'local and remote'})}});
 assert.deepEqual(tools.map(t=>t.name),['darask_browser_run','darask_agent','darask_computer']);
 assert.equal((await tools[2].execute({action:'pcs'},{})).text,'local and remote');
});
