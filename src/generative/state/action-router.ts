import type { ArtifactId,ArtifactUIState,CoverageRequest,DatasetManifest,DispatchResult,FareDataBridge,UICommand,UIStateStore,ValidatedQueryIR,DatasetId,DatasetRevision,FareId } from '../contracts'
import { legDate,legKey,legRequest,orderedLegResources } from './leg-bindings'
import { scheduleLegs,staleDownstreamFareIds } from './itinerary-schedule'
export type QueryFareSelectionScope={
 kind:'query-result';fareIds:readonly FareId[];query:ValidatedQueryIR;currentQuery:()=>ValidatedQueryIR
 sources:ReadonlyArray<{datasetId:DatasetId;revision:DatasetRevision;sourceVersion:string}>
}
export type CoverageLoadStatus={artifactId:ArtifactId;status:'loading'|'ready'|'error';message?:string}
export function covers(manifest:DatasetManifest,request:CoverageRequest):boolean{
 const coverage=manifest.coverage
 return coverage.complete&&!coverage.truncated&&request.passengers===coverage.passengers&&request.originIds.every(id=>coverage.originIds.includes(id))&&request.destinationIds.every(id=>coverage.destinationIds.includes(id))&&request.modes.every(mode=>coverage.modes.includes(mode))&&request.dateWindow.from>=coverage.dateWindow.from&&request.dateWindow.to<=coverage.dateWindow.to
}
const signature=(state:ArtifactUIState)=>JSON.stringify({dates:state.dates,citySequence:state.citySequence,stays:state.stays,modes:state.filters.modes,modesByLeg:state.modesByLeg,availableModesByLeg:state.availableModesByLeg,displayWindowByLeg:state.displayWindowByLeg})
function requestsFor(state:ArtifactUIState,bridge:FareDataBridge,selectedFacts:readonly Awaited<ReturnType<FareDataBridge['lookupFare']>>[]=[]):CoverageRequest[]{
 const resources=orderedLegResources(state,bridge);const first=resources[0];if(!first)return []
 const coverageFor=(origin:string,destination:string)=>{
  const matches=state.datasetRefs.map(id=>bridge.getManifest(id).coverage).filter(coverage=>legKey(coverage)===`${origin}:${destination}`)
  const seed=matches[0]??first.coverage
  const modes=state.availableModesByLeg[`${origin}:${destination}`]??[...new Set(matches.flatMap(coverage=>coverage.modes))]
  return{...seed,originIds:[origin],destinationIds:[destination],modes:modes.length?modes:seed.modes}
 }
 const route=state.citySequence.length>1?state.citySequence:state.stays.length?[first.coverage.originIds[0]!,...state.stays.map(stay=>stay.cityId)]:[]
 if(route.length>1){
  return route.slice(1).map((destination,index)=>{
   const origin=route[index]!
   return legRequest(state,coverageFor(origin,destination),selectedFacts)
  })
 }
 return resources.map(resource=>legRequest(state,coverageFor(resource.coverage.originIds[0]!,resource.coverage.destinationIds[0]!),selectedFacts))
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
  if(['select','dates','route','stays'].includes(command.kind)){
   const token=Symbol();const state=store.get(command.artifactId);const selected=JSON.stringify(state.selectedFareIds)
   const promise=Promise.all(state.selectedFareIds.map(id=>bridge.lookupFare(id,[]))).then(async facts=>{
    if(selections.get(command.artifactId)?.token!==token||JSON.stringify(store.get(command.artifactId).selectedFareIds)!==selected)return
    const resources=orderedLegResources(state,bridge),coverages=resources.map(resource=>resource.coverage)
    const stale=new Set(staleDownstreamFareIds(state,coverages,facts))
    const chosen=command.kind==='select'&&command.selected?facts.find(fact=>fact.id===command.fareId):undefined
    if(chosen&&selectionScope&&!currentScope(command.artifactId,selectionScope)){
     const current=store.get(command.artifactId);store.dispatch({kind:'select',artifactId:command.artifactId,fareId:chosen.id,selected:false,expectedRevision:current.revision});return
    }
    let aligned=false
    const chosenKey=chosen?`${chosen.originId}:${chosen.destinationId}`:undefined
    const firstRouteKey=state.citySequence.length>1?`${state.citySequence[0]}:${state.citySequence[1]}`:resources[0]?.key
    if(chosen&&selectionScope&&!state.dates.end&&firstRouteKey===chosenKey){
     const current=store.get(command.artifactId)
     const offset=Date.parse(legDate(current,chosen.originId))-Date.parse(current.dates.start)
     const start=new Date(Date.parse(chosen.serviceDate)-offset).toISOString().slice(0,10)
     if(start!==current.dates.start){store.dispatch({kind:'dates',artifactId:command.artifactId,dates:{start},expectedRevision:current.revision});aligned=true}
    }
    const current=store.get(command.artifactId)
    const scheduled=scheduleLegs(current,coverages,facts)
    const activeRouteKeys=new Set(current.citySequence.slice(1).map((destination,index)=>`${current.citySequence[index]}:${destination}`))
    const compatible=facts.filter(fact=>{const key=`${fact.originId}:${fact.destinationId}`;if(activeRouteKeys.size&& !activeRouteKeys.has(key))return false;const leg=scheduled.find(item=>item.key===key);if(!leg?.selectionValid)return false;const to=current.displayWindowByLeg[leg.key]?.to??(current.dates.end?legDate(current,fact.originId,current.dates.end):selectionScope?undefined:leg.threshold.date);return to===undefined||fact.serviceDate<=to})
    const last=new Map<string,string>();for(const fact of compatible)last.set(`${fact.originId}:${fact.destinationId}`,fact.id)
    for(const fact of facts){const current=store.get(command.artifactId)
     if(stale.has(fact.id)||last.get(`${fact.originId}:${fact.destinationId}`)!==fact.id)store.dispatch({kind:'select',artifactId:command.artifactId,fareId:fact.id,selected:false,expectedRevision:current.revision})
    }
    const retained=facts.filter(fact=>store.get(command.artifactId).selectedFareIds.includes(fact.id))
    if(aligned||['select','dates','route','stays'].includes(command.kind))await retry(command.artifactId,retained)
   }).catch(()=>options.onCoverageStatus?.({artifactId:command.artifactId,status:'error',message:'The selected synthetic fare is no longer available.'})).finally(()=>{if(selections.get(command.artifactId)?.token===token)selections.delete(command.artifactId)})
   selections.set(command.artifactId,{token,promise});return result
  }
  if(!['dates','filters','route','stays','modesByLeg'].includes(command.kind))return result
  void retry(command.artifactId)
  return result
 }
 const retry=(artifactId:ArtifactId,selectedFacts:readonly Awaited<ReturnType<FareDataBridge['lookupFare']>>[]=[]):Promise<void>=>{
  const bridge=options.bridge;if(!bridge)return Promise.resolve()
  requests.get(artifactId)?.controller.abort();requests.delete(artifactId)
  let state=store.get(artifactId)
  const availableModesByLeg={...state.availableModesByLeg}
  for(const id of state.datasetRefs){const coverage=bridge.getManifest(id).coverage,key=legKey(coverage);if(key)availableModesByLeg[key]=[...new Set([...(availableModesByLeg[key]??[]),...coverage.modes])]}
  if(JSON.stringify(availableModesByLeg)!==JSON.stringify(state.availableModesByLeg)){store.dispatch({kind:'availableModesByLeg',artifactId,availableModesByLeg,expectedRevision:state.revision});state=store.get(artifactId)}
  const plans=requestsFor(state,bridge,selectedFacts)
  const manifests=state.datasetRefs.map(ref=>bridge.getManifest(ref));const missing=plans.filter(plan=>!manifests.some(manifest=>covers(manifest,plan)))
  if(!missing.length){options.onCoverageStatus?.({artifactId,status:'ready'});return Promise.resolve()}
  const controller=new AbortController();const captured=signature(state);const loaded:DatasetManifest[]=[]
  options.onCoverageStatus?.({artifactId,status:'loading'})
  const promise=(async()=>{
   try{
    for(const coverage of missing){const manifest=await bridge.load(coverage,controller.signal);loaded.push(manifest);if(controller.signal.aborted)throw new Error('Canceled coverage')}
    if(controller.signal.aborted||requests.get(artifactId)?.controller!==controller||signature(store.get(artifactId))!==captured)throw new Error('Superseded coverage')
    if(loaded.some(manifest=>manifest.source.sourceVersion!==manifests[0]?.source.sourceVersion))throw new Error('SOURCE_VERSION_CHANGED')
    const current=store.get(artifactId),all=[...current.datasetRefs,...loaded.map(manifest=>manifest.datasetId)]
    const latest=new Map<string,DatasetId>(),seed=new Map<string,DatasetId>();for(const id of all){const key=legKey(bridge.getManifest(id).coverage);if(key){if(!seed.has(key))seed.set(key,id);latest.set(key,id)}}
    const activeKeys=new Set(plans.map(plan=>legKey(plan)).filter((key):key is string=>key!==undefined))
    const currentRefs=[...activeKeys].flatMap(key=>{const last=latest.get(key);return last?[last]:[]})
    if(currentRefs.length>8)throw new Error('Eight-leg limit reached; start another travel view')
    const seedRefs=[...activeKeys].flatMap(key=>{const first=seed.get(key);return first&&latest.get(key)!==first?[first]:[]})
    const refs=[...seedRefs.slice(0,8-currentRefs.length),...currentRefs]
    const refreshedModes={...current.availableModesByLeg};for(const plan of plans){const key=legKey(plan);if(key&&!refreshedModes[key])refreshedModes[key]=plan.modes}
    const scopeResult=store.dispatch({kind:'availableModesByLeg',artifactId,availableModesByLeg:refreshedModes,expectedRevision:current.revision})
    if(scopeResult.status==='stale')throw new Error('Stale mode scope')
    const scoped=store.get(artifactId);store.dispatch({kind:'datasets',artifactId,datasetRefs:refs,expectedRevision:scoped.revision})
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
