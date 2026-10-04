import{test}from'node:test'
import assert from'node:assert/strict'
import{JSDOM}from'jsdom'
import{instrument}from'./run-matrix.mjs'
test('native SSE bytes stay unchanged while timing and local worker metrics remain scalar',async()=>{
 const dom=new JSDOM('<!doctype html><body><section class="travel-travelsurface"><button>Existing control</button></section></body>');const original={window:globalThis.window,document:globalThis.document,MutationObserver:globalThis.MutationObserver,Element:globalThis.Element,requestAnimationFrame:globalThis.requestAnimationFrame}
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,MutationObserver:dom.window.MutationObserver,Element:dom.window.Element,requestAnimationFrame:callback=>setTimeout(()=>callback(performance.now()),0)})
 class FakeWorker extends dom.window.EventTarget{postMessage(){}}
 dom.window.Worker=FakeWorker;const body='data: {"type":"text-start","id":"t"}\n\ndata: {"type":"text-delta","id":"t","delta":"One segment."}\n\ndata: [DONE]\n\n';dom.window.fetch=async()=>new Response(body,{headers:{'content-type':'text/event-stream'}})
 try{
  instrument();const metrics=dom.window.__studyMetrics;metrics.started=performance.now();metrics.baselineViews=1
  assert.equal(await(await dom.window.fetch('/api/chat')).text(),body);assert.ok(metrics.firstText!==null);assert.equal(metrics.firstUI,null);assert.equal(metrics.firstControl,null)
  const worker=new dom.window.Worker('local-worker');worker.postMessage({kind:'query',id:'q'});worker.dispatchEvent(new dom.window.MessageEvent('message',{data:{kind:'result',id:'q',result:{rows:[{id:'row-buffer-only'}]}}}));assert.equal(metrics.queries.length,1);assert.equal(metrics.queries[0].resultRows,1);assert.ok(metrics.queries[0].resultBytes>0);assert.ok(!JSON.stringify(metrics).includes('row-buffer-only'))
  worker.postMessage({kind:'query',id:'projection',query:{sources:[{datasetRef:'bounded-resource'}],project:['priceCents','durationMinutes'],limit:1}});worker.dispatchEvent(new dom.window.MessageEvent('message',{data:{kind:'result',id:'projection',result:{rows:[{priceCents:1234,durationMinutes:90,sentinel:'PRIVATE_ROW_BUFFER_SENTINEL'}],total:1}}}));assert.deepEqual(metrics.queries[1].fareExtrema,{minimumPriceCents:1234,minimumDurationMinutes:90});assert.equal(metrics.queries[1].resultFareRows,0);assert.ok(!JSON.stringify(metrics).includes('PRIVATE_ROW_BUFFER_SENTINEL'));assert.ok(!('rows' in metrics.queries[1]));
  const view=dom.window.document.createElement('section');view.className='travel-travelsurface';view.innerHTML='<button>New control</button>';dom.window.document.body.append(view);await new Promise(resolve=>setTimeout(resolve,0));assert.ok(metrics.firstUI!==null);assert.ok(metrics.firstControl!==null)
 }finally{dom.window.close();Object.assign(globalThis,original)}
})
test('worker evidence maps only acknowledged physical generations and rejects canceled or retired query proof',()=>{
 const dom=new JSDOM('<!doctype html><body></body>'),original={window:globalThis.window,document:globalThis.document,MutationObserver:globalThis.MutationObserver,Element:globalThis.Element,requestAnimationFrame:globalThis.requestAnimationFrame};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,MutationObserver:dom.window.MutationObserver,Element:dom.window.Element,requestAnimationFrame:callback=>callback(performance.now())});
 const posted=[];class FakeWorker extends dom.window.EventTarget{postMessage(message){posted.push(message)}}dom.window.Worker=FakeWorker;dom.window.fetch=async()=>new Response('');
 try{
  instrument();const metrics=dom.window.__studyMetrics,worker=new dom.window.Worker(),respond=data=>worker.dispatchEvent(new dom.window.MessageEvent('message',{data}));
  const register=(id,physical,revision)=>worker.postMessage({kind:'register',id,datasetId:physical,resource:{logicalDatasetId:'public-resource',rows:[{id:'PRIVATE_ROW_SENTINEL'}],revision,sourceVersion:'source'}});
  register('r1','physical-old',1);assert.equal(metrics.resources.length,0,'Unacknowledged staging cannot prove warmth');respond({kind:'ready',id:'r1'});
  assert.equal(metrics.resources[0].datasetId,'public-resource');assert.equal(metrics.resources[0].physicalDatasetId,'physical-old');
  const query={version:1,sources:[{datasetRef:'physical-old',alias:'fares'}],where:{field:'mode',op:'eq',value:'bus'},project:['id'],limit:1};
  worker.postMessage({kind:'query',id:'q1',query});respond({kind:'result',id:'q1',result:{rows:[],total:0,datasetRevision:1}});
  assert.equal(metrics.queries[0].scope.sources[0].datasetRef,'public-resource');assert.deepEqual(metrics.queries[0].physicalScope,query);assert.equal(metrics.queries[0].status,'result');assert.equal(posted.at(-1).query.sources[0].datasetRef,'physical-old');
  register('r2','physical-canceled',2);worker.postMessage({kind:'release',id:'release-stage',datasetId:'physical-canceled'});respond({kind:'ready',id:'r2'});assert.equal(metrics.resources.length,1,'Late canceled registration ACK cannot become warm');
  worker.postMessage({kind:'query',id:'retired',query});worker.postMessage({kind:'release',id:'release-old',datasetId:'physical-old'});respond({kind:'result',id:'retired',result:{rows:[],total:0,datasetRevision:1}});assert.notEqual(metrics.queries.at(-1).status,'result');assert.equal(metrics.resources.length,0);
  register('r3','physical-new',2);respond({kind:'ready',id:'r3'});worker.postMessage({kind:'query',id:'canceled',query:{...query,sources:[{datasetRef:'physical-new',alias:'fares'}]}});worker.postMessage({kind:'cancel',id:'canceled'});respond({kind:'result',id:'canceled',result:{rows:[],total:0,datasetRevision:2}});assert.notEqual(metrics.queries.at(-1).status,'result');
  assert.ok(!JSON.stringify(metrics).includes('PRIVATE_ROW_SENTINEL'));
 }finally{dom.window.close();Object.assign(globalThis,original)}
});
