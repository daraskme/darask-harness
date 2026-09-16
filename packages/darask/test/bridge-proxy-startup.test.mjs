import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {BridgeService,ProxyServer} from '../vendor/dsh-bridge-gateway/lib/index.js';
const logger={info(){},warn(){},error(){}};
test('concurrent gateway and tunnel startup share one listening proxy',async t=>{
 const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 let release;const gate=new Promise(resolve=>release=resolve),instances=[];const original=ProxyServer.prototype.start;
 t.mock.method(ProxyServer.prototype,'start',async function(){instances.push(this);return original.call(this);});
 t.after(async()=>{for(const proxy of instances)await proxy.stop();});
 const service=new BridgeService({dshPort:9,proxyPort:port,logger});service._resolvePointsCheckinPort=()=>gate;
 const first=service.startProxy(),second=service.startProxy();release(null);
 const results=await Promise.allSettled([first,second]);
 assert.deepEqual(results.map(r=>r.status),['fulfilled','fulfilled']);
 assert.equal(instances.length,1);assert.equal(results[0].value,results[1].value);assert.equal(service.proxy.server.listening,true);
 await service.dispose();assert.equal(instances[0].server,null);
});
test('failed listen does not leave a phantom running proxy and can be retried',async t=>{
 const occupied=createServer();await new Promise(resolve=>occupied.listen(0,'0.0.0.0',resolve));const port=occupied.address().port;
 const service=new BridgeService({dshPort:9,proxyPort:port,logger});service._resolvePointsCheckinPort=async()=>null;
 t.after(async()=>{if(occupied.listening)await new Promise(resolve=>occupied.close(resolve));await service.dispose();});
 await assert.rejects(service.startProxy(),{code:'EADDRINUSE'});assert.equal(service.proxy,null);
 await new Promise(resolve=>occupied.close(resolve));const proxy=await service.startProxy();assert.equal(proxy.server.listening,true);
});
test('unloading during pending discovery cannot open a late listener',async t=>{
 let release;const gate=new Promise(resolve=>release=resolve),service=new BridgeService({dshPort:9,proxyPort:0,logger});
 service._resolvePointsCheckinPort=()=>gate;t.after(()=>service.dispose());
 const start=service.startProxy(),dispose=service.dispose();release(null);
 const results=await Promise.allSettled([start,dispose]);assert.equal(results[0].status,'rejected');assert.equal(results[1].status,'fulfilled');assert.equal(service.proxy,null);
 await assert.rejects(service.startProxy(),/終了/);
});
