import type { ArtifactId,ArtifactUIState,CoverageRequest,DatasetManifest,DispatchResult,FareDataBridge,UICommand,UIStateStore,ValidatedQueryIR,DatasetId,DatasetRevision,FareId } from '../contracts'
import { availableModes,legDate,legKey,legRequest,orderedLegResources } from './leg-bindings'
import { scheduleLegs,staleDownstreamFareIds } from './itinerary-schedule'
import { releaseDatasetWhenUnowned } from './dataset-ownership'
export type QueryFareSelectionScope={
 kind:'query-result';fareIds:readonly FareId[];query:ValidatedQueryIR;currentQuery:()=>ValidatedQueryIR
 sources:ReadonlyArray<{datasetId:DatasetId;revision:DatasetRevision;sourceVersion:string}>
}
export type CoverageLoadStatus={artifactId:ArtifactId;status:'loading'|'ready'|'error';message?:string}
export function covers(manifest:DatasetManifest,request:CoverageRequest):boolean{
 const coverage=manifest.coverage
 return coverage.complete&&!coverage.truncated&&request.passengers===coverage.passengers&&request.originIds.every(id=>coverage.originIds.includes(id))&&request.destinationIds.every(id=>coverage.destinationIds.includes(id))&&request.modes.every(mode=>coverage.modes.includes(mode))&&request.dateWindow.from>=coverage.dateWindow.from&&request.dateWindow.to<=coverage.dateWindow.to
}
const signature=(state:ArtifactUIState)=>JSON.stringify({dates:state.dates,citySequence:state.citySequence,stays:state.stays,modes:state.filters.modes,modesByLeg:state.modesByLeg,availableModesByLeg:state.availableModesByLeg,requestedModesByLeg:state.requestedModesByLeg,displayWindowByLeg:state.displayWindowByLeg})
function requestsFor(state:ArtifactUIState,bridge:FareDataBridge,selectedFacts:readonly Awaited<ReturnType<FareDataBridge['lookupFare']>>[]=[]):CoverageRequest[]{
 const resources=orderedLegResources(state,bridge)
 const first=resources[0]??state.datasetRefs.flatMap(datasetId=>{const coverage=bridge.getManifest(datasetId).coverage,key=legKey(coverage);return key?[{key,datasetId,coverage}]:[]})[0]
 if(!first)return []
 const coverageFor=(origin:string,destination:string)=>{
  const matches=state.datasetRefs.map(id=>bridge.getManifest(id).coverage).filter(coverage=>legKey(coverage)===`${origin}:${destination}`)
  const seed=matches[0]??first.coverage
  const requested=state.requestedModesByLeg[`${origin}:${destination}`]
  const modes=requested?.length?requested:[...new Set(matches.flatMap(coverage=>coverage.modes))]
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
   }).catch(()=>{
    if(command.kind==='select'&&command.selected&&selections.get(command.artifactId)?.token===token){const current=store.get(command.artifactId);if(current.selectedFareIds.includes(command.fareId))store.dispatch({kind:'select',artifactId:command.artifactId,fareId:command.fareId,selected:false,expectedRevision:current.revision})}
    options.onCoverageStatus?.({artifactId:command.artifactId,status:'error',message:'The selected synthetic fare is no longer available.'})
   }).finally(()=>{if(selections.get(command.artifactId)?.token===token)selections.delete(command.artifactId)})
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
  const requestedModesByLeg={...state.requestedModesByLeg}
  for(const id of state.datasetRefs){const coverage=bridge.getManifest(id).coverage,key=legKey(coverage);if(key&&!requestedModesByLeg[key])requestedModesByLeg[key]=coverage.modes}
  if(JSON.stringify(requestedModesByLeg)!==JSON.stringify(state.requestedModesByLeg)){store.dispatch({kind:'requestedModesByLeg',artifactId,requestedModesByLeg,expectedRevision:state.revision});state=store.get(artifactId)}
  const availableModesByLeg={...state.availableModesByLeg},modesByLeg={...state.modesByLeg}
  for(const id of state.datasetRefs){const manifest=bridge.getManifest(id),key=legKey(manifest.coverage);if(key){const actual=availableModes(manifest);availableModesByLeg[key]=actual;const chosen=modesByLeg[key];if(chosen){const retained=chosen.filter(mode=>actual.includes(mode));modesByLeg[key]=retained.length===actual.length?[]:retained}}}
  if(JSON.stringify(availableModesByLeg)!==JSON.stringify(state.availableModesByLeg)){store.dispatch({kind:'availableModesByLeg',artifactId,availableModesByLeg,expectedRevision:state.revision});state=store.get(artifactId)}
  if(JSON.stringify(modesByLeg)!==JSON.stringify(state.modesByLeg)){store.dispatch({kind:'modesByLeg',artifactId,modesByLeg,expectedRevision:state.revision});state=store.get(artifactId)}
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
    const latest=new Map<string,DatasetId>();for(const id of all){const key=legKey(bridge.getManifest(id).coverage);if(key)latest.set(key,id)}
    const activeKeys=new Set(plans.map(plan=>legKey(plan)).filter((key):key is string=>key!==undefined))
    const currentRefs=[...activeKeys].flatMap(key=>{const last=latest.get(key);return last?[last]:[]})
    if(currentRefs.length>8)throw new Error('Eight-leg limit reached; start another travel view')
    const refs=currentRefs
    const refreshedModes={...current.availableModesByLeg};for(const id of refs){const manifest=bridge.getManifest(id),key=legKey(manifest.coverage);if(key)refreshedModes[key]=availableModes(manifest)}
    const scopeResult=store.dispatch({kind:'availableModesByLeg',artifactId,availableModesByLeg:refreshedModes,expectedRevision:current.revision})
    if(scopeResult.status==='stale')throw new Error('Stale mode scope')
    let scoped=store.get(artifactId);const refreshedSelections={...scoped.modesByLeg}
    for(const [key,chosen] of Object.entries(refreshedSelections)){const actual=refreshedModes[key];if(actual){const retained=chosen.filter(mode=>actual.includes(mode));refreshedSelections[key]=retained.length===actual.length?[]:retained}}
    if(JSON.stringify(refreshedSelections)!==JSON.stringify(scoped.modesByLeg)){const selected=store.dispatch({kind:'modesByLeg',artifactId,modesByLeg:refreshedSelections,expectedRevision:scoped.revision});if(selected.status==='stale')throw new Error('Stale selected modes');scoped=store.get(artifactId)}
    const replaced=store.dispatch({kind:'datasets',artifactId,datasetRefs:refs,expectedRevision:scoped.revision})
    if(replaced.status==='stale')throw new Error('Stale dataset replacement')
    for(const previous of current.datasetRefs)if(!refs.includes(previous))releaseDatasetWhenUnowned(store,bridge,artifactId,previous)
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
