import { describe,expect,it } from 'vitest'
import { createWorkerQueryEngine,type QueryWorker } from './worker-client'
import { DatasetIdSchema,DatasetRevisionSchema,type QueryIR } from '../contracts'
import type { WorkerRequest,WorkerResponse } from './protocol'
function harness(){const sent:WorkerRequest[]=[];const handlers=new Set<(event:MessageEvent<unknown>)=>void>();const worker:QueryWorker={postMessage(message){sent.push(message)},addEventListener(_type,handler){handlers.add(handler)},removeEventListener(_type,handler){handlers.delete(handler)},terminate(){handlers.clear()}};return{worker,sent,reply(data:WorkerResponse){for(const handler of handlers)handler(new MessageEvent('message',{data}))}}}
const id=DatasetIdSchema.parse('worker-resource');const query:QueryIR={version:1,sources:[{datasetRef:id,alias:'fares'}],project:['id'],limit:1}
describe('worker request and revision boundary',()=>{
 it('rejects a late result after a dataset revision is replaced',async()=>{
  const io=harness();const engine=createWorkerQueryEngine(io.worker)
  const registered=engine.register(id,{rows:[],revision:DatasetRevisionSchema.parse(1),sourceVersion:'v1'});const registration=io.sent.at(-1);if(!registration)throw new Error('No register request');io.reply({kind:'ready',id:registration.id});await registered
  const old=engine.execute(query,new AbortController().signal);const oldRequest=io.sent.at(-1);if(!oldRequest)throw new Error('No query request')
  const replaced=engine.register(id,{rows:[],revision:DatasetRevisionSchema.parse(2),sourceVersion:'v1'});const replacement=io.sent.at(-1);if(!replacement)throw new Error('No replacement request');io.reply({kind:'ready',id:replacement.id});await replaced
  io.reply({kind:'result',id:oldRequest.id,result:{rows:[{id:'obsolete'}],total:1,truncated:false,datasetRevision:DatasetRevisionSchema.parse(1),requestId:oldRequest.id}})
  await expect(old).rejects.toThrow('Stale query result');engine.dispose()
 })
 it('cancels only the matching request and ignores its late result',async()=>{
  const io=harness();const engine=createWorkerQueryEngine(io.worker);const registration=engine.register(id,{rows:[],revision:DatasetRevisionSchema.parse(1),sourceVersion:'v1'});const request=io.sent.at(-1);if(!request)throw new Error('Missing register');io.reply({kind:'ready',id:request.id});await registration
  const controller=new AbortController();const canceled=engine.execute(query,controller.signal);const first=io.sent.at(-1);const second=engine.execute(query,new AbortController().signal);const active=io.sent.at(-1);if(!first||!active)throw new Error('Missing query');controller.abort();await expect(canceled).rejects.toMatchObject({name:'AbortError'})
  io.reply({kind:'result',id:first.id,result:{rows:[{id:'late'}],total:1,truncated:false,datasetRevision:DatasetRevisionSchema.parse(1),requestId:first.id}})
  io.reply({kind:'result',id:active.id,result:{rows:[{id:'current'}],total:1,truncated:false,datasetRevision:DatasetRevisionSchema.parse(1),requestId:active.id}})
  expect((await second).rows).toEqual([{id:'current'}]);engine.dispose()
 })
})
