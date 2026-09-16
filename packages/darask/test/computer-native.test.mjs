import test from 'node:test';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createComputer,powershellExecutable} from '../src/computer.mjs';

test('real Windows UIA exposes elements, protects password fields, types Unicode and invokes a button', {skip:process.platform!=='win32'||process.env.DSH_COMPUTER_LIVE_TEST!=='1'},async()=>{
 const fixture=spawn(powershellExecutable(),['-NoProfile','-ExecutionPolicy','Bypass','-STA','-File',fileURLToPath(new URL('./fixtures/computer-fixture.ps1',import.meta.url))],{windowsHide:true,stdio:'ignore'});
 const computer=createComputer({directory:'.',store:{get:()=>({computer:{enabled:true}})}});
 try{
  let window;for(let n=0;n<20;n++){const result=await computer.run({action:'windows'});window=result.windows.find(w=>w.title==='DARASK Computer Use Test'&&w.pid===fixture.pid);if(window)break;await delay(250);}
  assert.ok(window,'fixture not visible');
  let result=await computer.run({action:'inspect',hwnd:window.hwnd});assert.equal(result.image,undefined);assert.doesNotMatch(result.text,/fixture-private-value/);
  let view=JSON.parse(result.text);const input=view.elements.find(e=>e.name==='Test input');assert.ok(input?.actions.includes('set_value'));
  const password=view.elements.find(e=>e.password);assert.ok(password);assert.equal(password.value,undefined);assert.deepEqual(password.actions,[]);
  await assert.rejects(computer.run({action:'set_value',snapshotId:view.snapshotId,elementId:password.id,text:'bad'}));
  result=await computer.run({action:'inspect',hwnd:window.hwnd});view=JSON.parse(result.text);
  result=await computer.run({action:'set_value',snapshotId:view.snapshotId,elementId:view.elements.find(e=>e.name==='Test input').id,text:'DSH 日本語 OK'});
  view=JSON.parse(result.text);assert.equal(view.effect,'confirmed');assert.equal(view.elements.find(e=>e.name==='Test input').value,'DSH 日本語 OK');
  await computer.run({action:'invoke',snapshotId:view.snapshotId,elementId:view.elements.find(e=>e.name==='Apply test').id});
  for(let n=0;n<8;n++){result=await computer.run({action:'inspect',hwnd:window.hwnd});view=JSON.parse(result.text);if(view.elements.some(e=>e.name==='Verified: DSH 日本語 OK'))break;await delay(100);}
  assert.ok(view.elements.some(e=>e.name==='Verified: DSH 日本語 OK'));
 }finally{await computer.dispose();fixture.kill();}
});
