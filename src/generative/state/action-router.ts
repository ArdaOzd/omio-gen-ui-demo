import type { ArtifactId,ArtifactUIState,CoverageRequest,DatasetManifest,DispatchResult,FareDataBridge,UICommand,UIStateStore } from '../contracts'
import { legDate,legKey,legRequest } from './leg-bindings'
export type CoverageLoadStatus={artifactId:ArtifactId;status:'loading'|'ready'|'error';message?:string}
export function covers(manifest:DatasetManifest,request:CoverageRequest):boolean{
 const coverage=manifest.coverage
 return coverage.complete&&!coverage.truncated&&request.passengers===coverage.passengers&&request.originIds.every(id=>coverage.originIds.includes(id))&&request.destinationIds.every(id=>coverage.destinationIds.includes(id))&&request.modes.every(mode=>coverage.modes.includes(mode))&&request.dateWindow.from>=coverage.dateWindow.from&&request.dateWindow.to<=coverage.dateWindow.to
}
const signature=(state:ArtifactUIState)=>JSON.stringify({dates:state.dates,stays:state.stays,modes:state.filters.modes,modesByLeg:state.modesByLeg})
function requestsFor(state:ArtifactUIState,bridge:FareDataBridge):CoverageRequest[]{
 const manifests=state.datasetRefs.map(ref=>bridge.getManifest(ref));const first=manifests[0];if(!first)return []
 if(state.stays.length){
  const stops=[first.coverage.originIds[0],...state.stays.map(stay=>stay.cityId)].filter((id,index,all):id is string=>!!id&&id!==all[index-1])
  return stops.slice(1).map((destination,index)=>legRequest(state,{...first.coverage,originIds:[stops[index]!],destinationIds:[destination]}))
 }
 const unique=new Map<string,CoverageRequest>();for(const manifest of manifests){const key=legKey(manifest.coverage)??manifest.datasetId;if(!unique.has(key))unique.set(key,legRequest(state,manifest.coverage))}
 return [...unique.values()]
}
export function createActionRouter(store:UIStateStore,options:{bridge?:FareDataBridge;activate?:(id:ArtifactId)=>void;onCoverageStatus?:(status:CoverageLoadStatus)=>void}={}){
 const requests=new Map<ArtifactId,{controller:AbortController;promise:Promise<void>}>();const selections=new Map<ArtifactId,{token:symbol;promise:Promise<void>}>()
 const route=(command:UICommand):DispatchResult=>{
  const result=store.dispatch({...command,expectedRevision:command.expectedRevision??store.get(command.artifactId).revision})
  if(result.status!=='applied')return result
  options.activate?.(command.artifactId);const bridge=options.bridge;if(!bridge)return result
  if(['select','dates','stays'].includes(command.kind)){
   const token=Symbol();const state=store.get(command.artifactId);const selected=JSON.stringify(state.selectedFareIds)
   const promise=Promise.all(state.selectedFareIds.map(id=>bridge.lookupFare(id,[]))).then(facts=>{
    if(selections.get(command.artifactId)?.token!==token||JSON.stringify(store.get(command.artifactId).selectedFareIds)!==selected)return
    const last=new Map<string,string>();for(const fact of facts)last.set(`${fact.originId}:${fact.destinationId}`,fact.id)
    for(const fact of facts)if(last.get(`${fact.originId}:${fact.destinationId}`)!==fact.id||fact.serviceDate!==legDate(store.get(command.artifactId),fact.originId)){const current=store.get(command.artifactId);store.dispatch({kind:'select',artifactId:command.artifactId,fareId:fact.id,selected:false,expectedRevision:current.revision})}
   }).catch(()=>options.onCoverageStatus?.({artifactId:command.artifactId,status:'error',message:'The selected synthetic fare is no longer available.'})).finally(()=>{if(selections.get(command.artifactId)?.token===token)selections.delete(command.artifactId)})
   selections.set(command.artifactId,{token,promise});if(command.kind==='select')return result
  }
  if(!['dates','filters','stays','modesByLeg'].includes(command.kind))return result
  requests.get(command.artifactId)?.controller.abort();requests.delete(command.artifactId)
  const state=store.get(command.artifactId);const plans=requestsFor(state,bridge)
  const manifests=state.datasetRefs.map(ref=>bridge.getManifest(ref));const missing=plans.filter(plan=>!manifests.some(manifest=>covers(manifest,plan)))
  if(!missing.length){options.onCoverageStatus?.({artifactId:command.artifactId,status:'ready'});return result}
  const controller=new AbortController();const captured=signature(state);const loaded:DatasetManifest[]=[]
  options.onCoverageStatus?.({artifactId:command.artifactId,status:'loading'})
  const promise=(async()=>{
   try{
    for(const coverage of missing){const manifest=await bridge.load(coverage,controller.signal);loaded.push(manifest);if(controller.signal.aborted)throw new Error('Canceled coverage')}
    if(controller.signal.aborted||requests.get(command.artifactId)?.controller!==controller||signature(store.get(command.artifactId))!==captured)throw new Error('Superseded coverage')
    if(loaded.some(manifest=>manifest.source.sourceVersion!==manifests[0]?.source.sourceVersion))throw new Error('SOURCE_VERSION_CHANGED')
    const current=store.get(command.artifactId);const refs=[...new Set([...current.datasetRefs,...loaded.map(manifest=>manifest.datasetId)])]
    if(refs.length>8)throw new Error('Eight cached resource limit reached; start another travel view')
    store.dispatch({kind:'datasets',artifactId:command.artifactId,datasetRefs:refs,expectedRevision:current.revision})
    options.onCoverageStatus?.({artifactId:command.artifactId,status:'ready'})
   }catch(error){for(const manifest of loaded)bridge.release(manifest.datasetId);if(!controller.signal.aborted){
     const changed=error instanceof Error&&error.message==='SOURCE_VERSION_CHANGED'
     if(changed)for(const fareId of store.get(command.artifactId).selectedFareIds){const current=store.get(command.artifactId);store.dispatch({kind:'select',artifactId:command.artifactId,fareId,selected:false,expectedRevision:current.revision})}
     options.onCoverageStatus?.({artifactId:command.artifactId,status:'error',message:changed?'The travel source changed. Old selections were cleared; start a new travel view.':'Could not load this synthetic coverage. Retry or start another travel view.'})
    }}
   finally{if(requests.get(command.artifactId)?.controller===controller)requests.delete(command.artifactId)}
  })()
  requests.set(command.artifactId,{controller,promise});return result
 }
 return Object.assign(route,{whenIdle:async(id:ArtifactId)=>{await Promise.all([requests.get(id)?.promise,selections.get(id)?.promise])},dispose:()=>{for(const request of requests.values())request.controller.abort();requests.clear();selections.clear()}})
}
