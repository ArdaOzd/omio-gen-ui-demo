import { type BoundedQueryResult,type DatasetId,type QueryIR } from '../contracts'
import { abortError } from '../data/resource-loader'
import { executeQuery,type QueryResource } from './query-engine'
import { WorkerResponseSchema,type WorkerRequest } from './protocol'
export interface LocalQueryEngine {
 register(id:DatasetId,resource:QueryResource):Promise<void>
 execute(query:QueryIR,signal:AbortSignal):Promise<BoundedQueryResult>
 release(id:DatasetId):void
 dispose():void
}
export interface QueryWorker {
 postMessage(message:WorkerRequest):void
 addEventListener(type:'message',listener:(event:MessageEvent<unknown>)=>void):void
 removeEventListener(type:'message',listener:(event:MessageEvent<unknown>)=>void):void
 terminate():void
}
export function createWorkerQueryEngine(worker:QueryWorker):LocalQueryEngine{
 const revisions=new Map<DatasetId,number>()
 const pending=new Map<string,{resolve:(result:BoundedQueryResult|undefined)=>void;reject:(error:Error)=>void;cleanup:()=>void}>()
 function receive(event:MessageEvent<unknown>){
  const parsed=WorkerResponseSchema.safeParse(event.data);if(!parsed.success)return
  const response=parsed.data;const item=pending.get(response.id);if(!item)return
  pending.delete(response.id);item.cleanup()
  if(response.kind==='error')item.reject(response.code==='canceled'?abortError():new Error('Local query failed'))
  else item.resolve(response.kind==='result'?response.result:undefined)
 }
 worker.addEventListener('message',receive)
 function request(message:WorkerRequest,signal?:AbortSignal):Promise<BoundedQueryResult|undefined>{
  if(signal?.aborted)return Promise.reject(abortError())
  return new Promise((resolve,reject)=>{
   function cancel(){pending.delete(message.id);worker.postMessage({kind:'cancel',id:message.id});signal?.removeEventListener('abort',cancel);reject(abortError())}
   pending.set(message.id,{resolve,reject,cleanup:()=>signal?.removeEventListener('abort',cancel)})
   signal?.addEventListener('abort',cancel,{once:true});worker.postMessage(message)
  })
 }
 return {
  async register(datasetId,resource){await request({kind:'register',id:crypto.randomUUID(),datasetId,resource});revisions.set(datasetId,resource.revision)},
  async execute(query,signal){const captured=query.sources.map(source=>({id:source.datasetRef,revision:revisions.get(source.datasetRef)}));const result=await request({kind:'query',id:crypto.randomUUID(),query},signal);if(!result)throw new Error('Invalid worker result');if(captured.some(item=>item.revision===undefined||revisions.get(item.id)!==item.revision))throw new Error('Stale query result');return result},
  release(datasetId){revisions.delete(datasetId);worker.postMessage({kind:'release',id:crypto.randomUUID(),datasetId})},
  dispose(){worker.removeEventListener('message',receive);worker.terminate();for(const item of pending.values()){item.cleanup();item.reject(abortError())}pending.clear();revisions.clear()},
 }
}
export function createLocalQueryEngine():LocalQueryEngine{
 if(typeof Worker==='function')return createWorkerQueryEngine(new Worker(new URL('./worker.ts',import.meta.url),{type:'module'}))
 const resources=new Map<DatasetId,QueryResource>()
 return {async register(id,resource){resources.set(id,resource)},async execute(query,signal){const revisions=query.sources.map(source=>resources.get(source.datasetRef)?.revision);const result=await executeQuery(query,resources,signal);if(query.sources.some((source,index)=>resources.get(source.datasetRef)?.revision!==revisions[index]))throw new Error('Stale query result');return result},release(id){resources.delete(id)},dispose(){resources.clear()}}
}
