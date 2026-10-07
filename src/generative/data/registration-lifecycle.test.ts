import {describe,expect,it,vi} from 'vitest'
import {createFareDataBridge} from './fare-data-bridge'
import {createLocalQueryEngine,createWorkerQueryEngine,type QueryWorker,type LocalQueryEngine} from '../query/worker-client'
import type {WorkerRequest,WorkerResponse} from '../query/protocol'
import {FareIdSchema,type CoverageRequest,type DatasetId,type QueryIR} from '../contracts'

const request:CoverageRequest={originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-02'},modes:['bus'],passengers:1}
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done});return{promise,resolve}}
function scenario(){
 const engine=createLocalQueryEngine(),registered=deferred(),ack=deferred(),cleaned=deferred(),released:DatasetId[]=[]
 let count=0,pendingId:DatasetId|undefined,loadCount=0
 const wrapped:LocalQueryEngine={...engine,async register(id,resource){await engine.register(id,resource);if(++count===2){pendingId=id;registered.resolve();await ack.promise}},release(id){released.push(id);engine.release(id);if(id===pendingId)cleaned.resolve()}}
 const bridge=createFareDataBridge({queryEngine:wrapped,maxRows:1,pageSource:async()=>{
  const priceCents=++loadCount*1000
  return{rows:[{id:FareIdSchema.parse('fare'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'bus',carrierId:'carrier',priceCents,durationMinutes:100,departureMinutes:600,availableSeats:4,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true},{id:FareIdSchema.parse('second'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'bus',carrierId:'carrier',priceCents:4000,durationMinutes:100,departureMinutes:700,availableSeats:4,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true}],total:2,pages:1,page:1,sourceVersion:`v${loadCount}`}
 }})
 return{bridge,registered,ack,cleaned,released}
}
function query(datasetRef:DatasetId):QueryIR{return{version:1,sources:[{datasetRef,alias:'fares'}],project:['id','priceCents'],limit:10}}

describe('registration commit preserves published resources',()=>{
 it('disposes the bridge-owned worker but leaves an injected engine under caller ownership',()=>{
  const terminate=vi.fn(),handlers=new Set<(event:MessageEvent<unknown>)=>void>()
  class WorkerStub implements QueryWorker{
   postMessage(_message:WorkerRequest){}
   addEventListener(_type:'message',handler:(event:MessageEvent<unknown>)=>void){handlers.add(handler)}
   removeEventListener(_type:'message',handler:(event:MessageEvent<unknown>)=>void){handlers.delete(handler)}
   terminate(){terminate();handlers.clear()}
  }
  vi.stubGlobal('Worker',WorkerStub)
  const owned=createFareDataBridge();owned.dispose?.();expect(terminate).toHaveBeenCalledOnce()
  const external=createLocalQueryEngine(),dispose=vi.spyOn(external,'dispose'),shared=createFareDataBridge({queryEngine:external});shared.dispose?.();expect(dispose).not.toHaveBeenCalled()
  external.dispose();vi.unstubAllGlobals()
 })
 it('keeps the old partial view queryable during and after canceled registration ACK',async()=>{
  const {bridge,registered,ack,cleaned}=scenario(),old=await bridge.load(request,new AbortController().signal),cancel=new AbortController()
  const retry=bridge.load(request,cancel.signal),rejected=expect(retry).rejects.toMatchObject({name:'AbortError'})
  await registered.promise
  expect((await bridge.query(query(old.datasetId),new AbortController().signal)).rows[0]?.priceCents).toBe(1000)
  cancel.abort();await rejected;ack.resolve();await cleaned.promise
  expect(bridge.getManifest(old.datasetId)).toEqual(old)
  expect((await bridge.query(query(old.datasetId),new AbortController().signal)).rows[0]?.priceCents).toBe(1000)
  bridge.release(old.datasetId)
  expect(()=>bridge.getManifest(old.datasetId)).toThrow(/expired/i)
 })
 it('cannot let a late canceled ACK delete an immediately successful newer retry',async()=>{
  const {bridge,registered,ack,cleaned,released}=scenario(),old=await bridge.load(request,new AbortController().signal),cancel=new AbortController()
  const obsolete=bridge.load(request,cancel.signal),rejected=expect(obsolete).rejects.toMatchObject({name:'AbortError'})
  await registered.promise;cancel.abort();await rejected
  const fresh=await bridge.load(request,new AbortController().signal)
  expect(fresh).toMatchObject({datasetId:old.datasetId,revision:2,source:{sourceVersion:'v3'}})
  expect((await bridge.query(query(fresh.datasetId),new AbortController().signal)).rows[0]?.priceCents).toBe(3000)
  ack.resolve();await cleaned.promise
  expect(bridge.getManifest(old.datasetId)).toEqual(fresh)
  expect((await bridge.query(query(fresh.datasetId),new AbortController().signal)).rows[0]?.priceCents).toBe(3000)
  expect(released).not.toContain(old.datasetId)
  bridge.release(fresh.datasetId)
  expect(bridge.getManifest(old.datasetId)).toEqual(fresh)
  bridge.release(old.datasetId)
  expect(()=>bridge.getManifest(old.datasetId)).toThrow(/expired/i)
 })
 it('cleans a rejected staging registration without damaging the published resource',async()=>{
  const engine=createLocalQueryEngine(),allocated=new Set<DatasetId>();let registrations=0
  const bridge=createFareDataBridge({maxRows:1,queryEngine:{...engine,async register(id,resource){allocated.add(id);await engine.register(id,resource);if(++registrations===2)throw new Error('Registration rejected')},release(id){allocated.delete(id);engine.release(id)}},pageSource:async()=>({rows:[row('one'),row('two')],total:2,pages:1,page:1,sourceVersion:'v1'})})
  const old=await bridge.load(request,new AbortController().signal)
  await expect(bridge.load(request,new AbortController().signal)).rejects.toThrow('Registration rejected')
  expect(allocated.size).toBe(1)
  expect(bridge.getManifest(old.datasetId)).toEqual(old)
  expect((await bridge.query(query(old.datasetId),new AbortController().signal)).rows[0]?.id).toBe('one')
  bridge.release(old.datasetId);expect(allocated.size).toBe(0)
 })
 it('rejects an old in-flight result after a new logical generation commits',async()=>{
  const engine=createLocalQueryEngine(),evaluated=deferred(),finish=deferred();let pause=true
  const bridge=createFareDataBridge({maxRows:1,queryEngine:{...engine,async execute(query,signal){const result=await engine.execute(query,signal);if(pause){pause=false;evaluated.resolve();await finish.promise}return result}},pageSource:async()=>({rows:[row('one'),row('two')],total:2,pages:1,page:1,sourceVersion:'v1'})})
  const old=await bridge.load(request,new AbortController().signal)
  const previous=bridge.query(query(old.datasetId),new AbortController().signal),rejected=expect(previous).rejects.toThrow(/stale/i)
  await evaluated.promise;const fresh=await bridge.load(request,new AbortController().signal);finish.resolve();await rejected
  expect((await bridge.query(query(fresh.datasetId),new AbortController().signal)).datasetRevision).toBe(fresh.revision)
 })

 it('posts explicit logical identity with each physical worker generation while public query/context refs stay logical',async()=>{
  const sent:WorkerRequest[]=[],handlers=new Set<(event:MessageEvent<unknown>)=>void>()
  const worker:QueryWorker={postMessage(message){sent.push(message)},addEventListener(_type,handler){handlers.add(handler)},removeEventListener(_type,handler){handlers.delete(handler)},terminate(){handlers.clear()}}
  const reply=(data:WorkerResponse)=>{for(const handler of handlers)handler(new MessageEvent('message',{data}))}
  const engine=createWorkerQueryEngine(worker),bridge=createFareDataBridge({queryEngine:engine,pageSource:async()=>({rows:[row('one')],total:1,pages:1,page:1,sourceVersion:'logical-v1'})})
  const loading=bridge.load(request,new AbortController().signal)
  await vi.waitFor(()=>expect(sent.some(message=>message.kind==='register')).toBe(true))
  const registration=sent.find(message=>message.kind==='register');if(!registration||registration.kind!=='register')throw new Error('Missing registration')
  expect(registration.resource.logicalDatasetId).toMatch(/^dataset-/)
  expect(registration.datasetId).toMatch(/^cache-/)
  expect(registration.resource).toMatchObject({sourceVersion:'logical-v1',revision:1})
  reply({kind:'ready',id:registration.id});const manifest=await loading,logicalQuery=query(manifest.datasetId)
  expect(manifest.datasetId).toBe(registration.resource.logicalDatasetId)
  const querying=bridge.query(logicalQuery,new AbortController().signal),requestMessage=sent.at(-1)
  if(!requestMessage||requestMessage.kind!=='query')throw new Error('Missing worker query')
  expect(requestMessage.query.sources[0]?.datasetRef).toBe(registration.datasetId)
  const observed={...requestMessage.query,sources:requestMessage.query.sources.map(source=>({...source,datasetRef:registration.resource.logicalDatasetId}))}
  expect(observed).toEqual(logicalQuery)
  reply({kind:'result',id:requestMessage.id,result:{rows:[{id:'one',priceCents:1000}],total:1,truncated:false,datasetRevision:manifest.revision,requestId:requestMessage.id}})
  const result=await querying
  expect(JSON.stringify({manifest,result})).not.toContain('cache-')
  expect(bridge.getManifest(manifest.datasetId)).toEqual(manifest)
  bridge.release(manifest.datasetId);engine.dispose()
 })

})

function row(id:string){return{id:FareIdSchema.parse(id),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'bus' as const,carrierId:'carrier',priceCents:1000,durationMinutes:100,departureMinutes:600,availableSeats:4,currency:'EUR' as const,synthetic:true as const,priceBasis:'per-passenger-including-demo-fees' as const,direct:true}}
