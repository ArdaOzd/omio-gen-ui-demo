import type { ArtifactId,ArtifactUIState,CoverageRequest,DatasetManifest,DispatchResult,FareDataBridge,UICommand,UIStateStore,ValidatedQueryIR,DatasetId,DatasetRevision,FareId } from '../contracts'
import { legDate,legKey,legRequest } from './leg-bindings'
export type QueryFareSelectionScope={
 kind:'query-result';fareIds:readonly FareId[];query:ValidatedQueryIR;currentQuery:()=>ValidatedQueryIR
 sources:ReadonlyArray<{datasetId:DatasetId;revision:DatasetRevision;sourceVersion:string}>
}
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
 const currentScope=(artifactId:ArtifactId,scope:QueryFareSelectionScope):boolean=>{
  const bridge=options.bridge;if(!bridge)return false
  try{return JSON.stringify(scope.query)===JSON.stringify(scope.currentQuery())&&scope.sources.length===scope.query.sources.length&&scope.query.sources.every(source=>scope.sources.some(generation=>generation.datasetId===source.datasetRef))&&scope.sources.every(source=>{
   const manifest=bridge.getManifest(source.datasetId)
   return store.get(artifactId).datasetRefs.includes(source.datasetId)&&manifest.revision===source.revision&&manifest.source.sourceVersion===source.sourceVersion
  })}catch{return false}
 }
 const route=(command:UICommand,selectionScope?:QueryFareSelectionScope):DispatchResult=>{
  if(command.kind==='select'&&command.selected&&selectionScope&&(!selectionScope.fareIds.includes(command.fareId)||!currentScope(command.artifactId,selectionScope)))return{status:'stale',revision:store.get(command.artifactId).revision}
  const result=store.dispatch({...command,expectedRevision:command.expectedRevision??store.get(command.artifactId).revision})
  if(result.status!=='applied')return result
  options.activate?.(command.artifactId);const bridge=options.bridge;if(!bridge)return result
  if(['select','dates','stays'].includes(command.kind)){
   const token=Symbol();const state=store.get(command.artifactId);const selected=JSON.stringify(state.selectedFareIds)
   const promise=Promise.all(state.selectedFareIds.map(id=>bridge.lookupFare(id,[]))).then(async facts=>{
    if(selections.get(command.artifactId)?.token!==token||JSON.stringify(store.get(command.artifactId).selectedFareIds)!==selected)return
    const chosen=command.kind==='select'&&command.selected?facts.find(fact=>fact.id===command.fareId):undefined
    if(chosen&&selectionScope&&!currentScope(command.artifactId,selectionScope)){
     const current=store.get(command.artifactId);store.dispatch({kind:'select',artifactId:command.artifactId,fareId:chosen.id,selected:false,expectedRevision:current.revision});return
    }
    let aligned=false
    if(chosen&&selectionScope&&!state.dates.end){
     const current=store.get(command.artifactId)
     const offset=Date.parse(legDate(current,chosen.originId))-Date.parse(current.dates.start)
     const start=new Date(Date.parse(chosen.serviceDate)-offset).toISOString().slice(0,10)
     if(start!==current.dates.start){store.dispatch({kind:'dates',artifactId:command.artifactId,dates:{start},expectedRevision:current.revision});aligned=true}
    }
    const current=store.get(command.artifactId)
    const compatible=facts.filter(fact=>fact.serviceDate>=legDate(current,fact.originId)&&fact.serviceDate<=legDate(current,fact.originId,current.dates.end??current.dates.start))
    const last=new Map<string,string>();for(const fact of compatible)last.set(`${fact.originId}:${fact.destinationId}`,fact.id)
    for(const fact of facts){const current=store.get(command.artifactId),from=legDate(current,fact.originId),to=legDate(current,fact.originId,current.dates.end??current.dates.start)
     if(last.get(`${fact.originId}:${fact.destinationId}`)!==fact.id||fact.serviceDate<from||fact.serviceDate>to)store.dispatch({kind:'select',artifactId:command.artifactId,fareId:fact.id,selected:false,expectedRevision:current.revision})
    }
    if(aligned)await retry(command.artifactId)
   }).catch(()=>options.onCoverageStatus?.({artifactId:command.artifactId,status:'error',message:'The selected synthetic fare is no longer available.'})).finally(()=>{if(selections.get(command.artifactId)?.token===token)selections.delete(command.artifactId)})
   selections.set(command.artifactId,{token,promise});if(command.kind==='select')return result
  }
  if(!['dates','filters','stays','modesByLeg'].includes(command.kind))return result
  void retry(command.artifactId)
  return result
 }
 const retry=(artifactId:ArtifactId):Promise<void>=>{
  const bridge=options.bridge;if(!bridge)return Promise.resolve()
  requests.get(artifactId)?.controller.abort();requests.delete(artifactId)
  const state=store.get(artifactId);const plans=requestsFor(state,bridge)
  const manifests=state.datasetRefs.map(ref=>bridge.getManifest(ref));const missing=plans.filter(plan=>!manifests.some(manifest=>covers(manifest,plan)))
  if(!missing.length){options.onCoverageStatus?.({artifactId,status:'ready'});return Promise.resolve()}
  const controller=new AbortController();const captured=signature(state);const loaded:DatasetManifest[]=[]
  options.onCoverageStatus?.({artifactId,status:'loading'})
  const promise=(async()=>{
   try{
    for(const coverage of missing){const manifest=await bridge.load(coverage,controller.signal);loaded.push(manifest);if(controller.signal.aborted)throw new Error('Canceled coverage')}
    if(controller.signal.aborted||requests.get(artifactId)?.controller!==controller||signature(store.get(artifactId))!==captured)throw new Error('Superseded coverage')
    if(loaded.some(manifest=>manifest.source.sourceVersion!==manifests[0]?.source.sourceVersion))throw new Error('SOURCE_VERSION_CHANGED')
    const current=store.get(artifactId);const refs=[...new Set([...current.datasetRefs,...loaded.map(manifest=>manifest.datasetId)])]
    if(refs.length>8)throw new Error('Eight cached resource limit reached; start another travel view')
    store.dispatch({kind:'datasets',artifactId,datasetRefs:refs,expectedRevision:current.revision})
    options.onCoverageStatus?.({artifactId,status:'ready'})
   }catch(error){for(const manifest of loaded)bridge.release(manifest.datasetId);if(!controller.signal.aborted){
     const changed=error instanceof Error&&error.message==='SOURCE_VERSION_CHANGED'
     if(changed)for(const fareId of store.get(artifactId).selectedFareIds){const current=store.get(artifactId);store.dispatch({kind:'select',artifactId,fareId,selected:false,expectedRevision:current.revision})}
     options.onCoverageStatus?.({artifactId,status:'error',message:changed?'The travel source changed. Old selections were cleared; start a new travel view.':'Could not load this synthetic coverage. Retry or start another travel view.'})
    }}
   finally{if(requests.get(artifactId)?.controller===controller)requests.delete(artifactId)}
  })()
  requests.set(artifactId,{controller,promise});return promise
 }
 return Object.assign(route,{retry,selectFromQuery:(command:Extract<UICommand,{kind:'select'}>,scope:QueryFareSelectionScope)=>route(command,scope),whenIdle:async(id:ArtifactId)=>{await Promise.all([requests.get(id)?.promise,selections.get(id)?.promise])},dispose:()=>{for(const request of requests.values())request.controller.abort();requests.clear();selections.clear()}})
}
