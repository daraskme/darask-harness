import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import {createComputer,createLineHost,mapPoint,imageReadContent,validateComputerAction} from '../src/computer.mjs';
import {registerComputerSkill} from '../src/skill-computer-use.mjs';

test('right/bottom edge pixels are excluded and image instructions do not double-scale',()=>{
 const c={imageWidth:100,imageHeight:50,scaleX:2,scaleY:2,originX:-100,originY:0};
 assert.throws(()=>mapPoint(100,0,c));assert.throws(()=>mapPoint(0,50,c));
 assert.deepEqual(mapPoint(99,49,c),{x:99,y:99});
 assert.doesNotMatch(imageReadContent('screen',{width:100,height:50,originalDimensions:{width:200,height:100}})[0].text,/multiply/);
});
test('text-only element operations isolate agents and reject stale snapshots without dispatch',async t=>{
 let count=0; const a={},b={}; const snapshots=[];
 const computer=createComputer({directory:'.',store:{get:()=>({computer:{enabled:true}})},runHost:async p=>{
   count++; const id=randomUUID();snapshots.push(id);
   return {ok:true,snapshotId:id,hwnd:'42',elements:[{id:'0',name:'Save',actions:['invoke']}],truncated:false,...(p.op==='set_value'?{effect:'confirmed'}:{})};
 }});t.after(()=>computer.dispose());
 const first=await computer.run({action:'inspect',hwnd:'42'},{agent:a});
 assert.equal(first.image,undefined);assert.equal(JSON.parse(first.text).elements[0].name,'Save');
 await assert.rejects(computer.run({action:'invoke',snapshotId:first.snapshotId,elementId:'0'},{agent:b}),/別セッション/);
 assert.equal(count,1);
 const next=await computer.run({action:'set_value',snapshotId:first.snapshotId,elementId:'0',text:''},{agent:a});assert.equal(next.effect,'confirmed');assert.equal(count,2);
 await assert.rejects(computer.run({action:'invoke',snapshotId:first.snapshotId,elementId:'0'},{agent:a}),/古い/);assert.equal(count,2);
 await computer.run({action:'inspect',hwnd:'42'},{agent:b});
 await assert.rejects(computer.run({action:'invoke',snapshotId:next.snapshotId,elementId:'0'},{agent:a}),/別セッション/);
});
test('element action validation rejects invalid handles and missing snapshot before native work',()=>{
 assert.throws(()=>validateComputerAction({action:'inspect',hwnd:'42;Start-Process'}));
 assert.throws(()=>validateComputerAction({action:'invoke',elementId:'0'}));
 assert.throws(()=>validateComputerAction({action:'set_value',snapshotId:randomUUID(),elementId:'0',text:'\0'}));
 assert.equal(validateComputerAction({action:'set_value',snapshotId:randomUUID(),elementId:'0',text:''}).text,'');
});
test('aborted/late native responses cannot satisfy the next request; pre-aborted requests dispatch nothing',async t=>{
 const children=[];
 const host=createLineHost({command:'unused',args:[],env:{},scriptPath:'unused',timeoutMs:2000,spawnImpl:()=>{
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdout.setEncoding=child.stderr.setEncoding=()=>{};
  child.exitCode=null; child.stdin={write:p=>{child.line=p;},end:()=>{}};child.kill=()=>{child.killed=true;};children.push(child);return child;
 }});t.after(()=>host.dispose());
 const pre=new AbortController();pre.abort();await assert.rejects(host.request({op:'click'},pre.signal));assert.equal(children.length,0);
 const abort=new AbortController();const first=host.request({op:'inspect'},abort.signal);abort.abort();await assert.rejects(first);assert.equal(children[0].killed,true);
 const second=host.request({op:'windows'});
 children[0].stdout.emit('data','{"ok":true,"op":"wrong"}\n');children[0].emit('close',0);
 children[1].stdout.emit('data','{"ok":true,"op":"windows"}\n');assert.equal((await second).op,'windows');
});
test('Computer Use is a runtime skill for every provider including a nonvision local model',()=>{
 for(const model of ['grok/grok-4.6','codex/gpt','claude/sonnet','openrouter/model','local/unseen-gemma4']){
  const registered=[];registerComputerSkill({model,inject(deps,fn){assert.deepEqual(deps,['skills']);fn({skills:{register:s=>registered.push(s)}});}});
  assert.deepEqual(registered.map(s=>s.name),['computer-use']);assert.equal(registered[0].source,'runtime');
 }
});

test('native tool definition is valid and registers without a provider filter', async()=>{
 const {registerComputerTool}=await import('../src/computer-tool.mjs');
 let tool;let captured;const agent={};
 registerComputerTool({tools:{register:t=>tool=t},get:()=>undefined},{run:(args,exec)=>{captured=exec;return {action:'inspect',text:'{}'};}});
 assert.equal(tool.name,'darask_computer');
 await tool.execute({action:'inspect',hwnd:'1'},{agent});assert.equal(captured.agent,agent);
});
