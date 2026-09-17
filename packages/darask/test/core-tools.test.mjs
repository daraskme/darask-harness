import test from 'node:test';import assert from 'node:assert/strict';import {registerCoreTools} from '../src/core-tools.mjs';
test('Browser Run schema cannot prevent computer, CLI, and evaluation tools from registering', async()=>{
 const tools=[];registerCoreTools({tools:{register:t=>tools.push(t)},get:()=>undefined},{browserRun:{run:async()=>({action:'content',text:'ok'})},store:{get:()=>({})},service:{snapshots:{},evaluateJev:async()=>({model:'typesafe-ai/jev',text:'{}'})},config:{},computer:{run:async()=>({action:'pcs',text:'local and remote'})}});
 assert.deepEqual(tools.map(t=>t.name),['darask_browser_run','darask_agent','darask_jev_evaluate','darask_computer']);
 assert.equal((await tools[3].execute({action:'pcs'},{})).text,'local and remote');
});
