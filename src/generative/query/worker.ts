import type { DatasetId } from '../contracts'
import { executeQuery, type QueryResource } from './query-engine'
import type { WorkerRequest,WorkerResponse } from './protocol'
const resources=new Map<DatasetId,QueryResource>()
const requests=new Map<string,AbortController>()
declare const self: DedicatedWorkerGlobalScope
const channel=self
channel.onmessage=async(event:MessageEvent<WorkerRequest>)=>{
 const input=event.data
 function send(response:WorkerResponse){channel.postMessage(response)}
 switch(input.kind){
 case'register':resources.set(input.datasetId,input.resource);send({kind:'ready',id:input.id});return
 case'append':{const existing=resources.get(input.datasetId);if(!existing||input.revision<=existing.revision){send({kind:'error',id:input.id,code:'query-failed'});return}const ids=new Set(existing.rows.map(row=>row.id));if(input.rows.some(row=>ids.has(row.id))){send({kind:'error',id:input.id,code:'query-failed'});return}resources.set(input.datasetId,{...existing,rows:[...existing.rows,...input.rows],revision:input.revision});send({kind:'ready',id:input.id});return}
 case'release':resources.delete(input.datasetId);send({kind:'ready',id:input.id});return
 case'cancel':requests.get(input.id)?.abort();return
 case'query':{
  const controller=new AbortController();requests.set(input.id,controller)
  try{const result=await executeQuery(input.query,resources,controller.signal);send({kind:'result',id:input.id,result:{...result,requestId:input.id}})}
  catch{send({kind:'error',id:input.id,code:controller.signal.aborted?'canceled':'query-failed'})}
  finally{requests.delete(input.id)}
  return
 }
 default:{const exhaustive:never=input;throw new Error(String(exhaustive))}
 }
}
