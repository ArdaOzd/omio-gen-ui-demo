import type { ArtifactId,CoverageRequest,DatasetManifest,DispatchResult,FareDataBridge,UICommand,UIStateStore } from '../contracts'
export type CoverageLoadStatus={artifactId:ArtifactId;status:'loading'|'ready'|'error';message?:string}
export function covers(manifest:DatasetManifest,request:CoverageRequest):boolean{
 const coverage=manifest.coverage
 return coverage.complete&&!coverage.truncated&&request.passengers===coverage.passengers&&request.originIds.every(id=>coverage.originIds.includes(id))&&request.destinationIds.every(id=>coverage.destinationIds.includes(id))&&request.modes.every(mode=>coverage.modes.includes(mode))&&request.dateWindow.from>=coverage.dateWindow.from&&request.dateWindow.to<=coverage.dateWindow.to
}
export function createActionRouter(store:UIStateStore,options:{bridge?:FareDataBridge;activate?:(id:ArtifactId)=>void;onCoverageStatus?:(status:CoverageLoadStatus)=>void}={}){
 const requests=new Map<ArtifactId,{controller:AbortController;promise:Promise<void>}>()
 const route=(command:UICommand):DispatchResult=>{
  const result=store.dispatch({...command,expectedRevision:command.expectedRevision??store.get(command.artifactId).revision})
  if(result.status!=='applied')return result
  options.activate?.(command.artifactId)
  const bridge=options.bridge
  if(!bridge||!['dates','filters'].includes(command.kind))return result
  const state=store.get(command.artifactId);const ref=state.datasetRefs[0];if(!ref)return result
  const manifest=bridge.getManifest(ref)
  const coverage:CoverageRequest={originIds:manifest.coverage.originIds,destinationIds:manifest.coverage.destinationIds,dateWindow:{from:state.dates.start,to:state.dates.end??state.dates.start},modes:[...new Set([...manifest.coverage.modes,...state.filters.modes])],passengers:manifest.coverage.passengers}
  requests.get(command.artifactId)?.controller.abort()
  if(covers(manifest,coverage)){requests.delete(command.artifactId);return result}
  const controller=new AbortController()
  options.onCoverageStatus?.({artifactId:command.artifactId,status:'loading'})
  const promise=bridge.load(coverage,controller.signal).then(loaded=>{
   if(controller.signal.aborted||requests.get(command.artifactId)?.controller!==controller){bridge.release(loaded.datasetId);return}
   const current=store.get(command.artifactId)
   if(current.dates.start!==coverage.dateWindow.from||(current.dates.end??current.dates.start)!==coverage.dateWindow.to){bridge.release(loaded.datasetId);return}
   const refs=current.datasetRefs.map(id=>id===ref?loaded.datasetId:id)
   store.dispatch({kind:'datasets',artifactId:command.artifactId,datasetRefs:refs,expectedRevision:current.revision})
   bridge.release(ref)
   options.onCoverageStatus?.({artifactId:command.artifactId,status:'ready'})
  }).catch(()=>{if(!controller.signal.aborted)options.onCoverageStatus?.({artifactId:command.artifactId,status:'error',message:'Could not load the requested synthetic coverage.'})}).finally(()=>{if(requests.get(command.artifactId)?.controller===controller)requests.delete(command.artifactId)})
  requests.set(command.artifactId,{controller,promise})
  return result
 }
 return Object.assign(route,{whenIdle:async(id:ArtifactId)=>{await requests.get(id)?.promise},dispose:()=>{for(const request of requests.values())request.controller.abort();requests.clear()}})
}
