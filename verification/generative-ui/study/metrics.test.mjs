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
