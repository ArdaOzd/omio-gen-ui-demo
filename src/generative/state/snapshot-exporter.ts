import { CONTRACT_VERSION,LIMITS,parseAgentContext,type AgentContextEnvelope,type ArtifactId,type BoundedFareFact,type CompactArtifactSnapshot,type FareDataBridge,type OlderArtifactSummary,type UIStateStore } from '../contracts'
import { assertNoBulkData } from '../contracts/privacy'
type ExportInput={turnId:string;activeArtifactId?:ArtifactId;artifactIds:ArtifactId[];store:UIStateStore;bridge:FareDataBridge;selectedFareFacts?:BoundedFareFact[];olderArtifactSummaries?:OlderArtifactSummary[];layoutSummaries?:ReadonlyMap<string,string>}
type SnapshotRecord={snapshot:CompactArtifactSnapshot;lastInteractionAt:string}
type PreparedCapture={turnId:string;activeArtifactId?:ArtifactId;records:SnapshotRecord[];manifests:Map<string,ReturnType<FareDataBridge['getManifest']>>;plannedFareIds:ReturnType<UIStateStore['get']>['selectedFareIds']}
function snapshots(input:ExportInput){
 const ids=[...new Set([...(input.activeArtifactId?[input.activeArtifactId]:[]),...input.artifactIds])]
 return ids.map(id=>{const snapshot=input.store.exportSnapshot(id);return {...snapshot,layoutSummary:input.layoutSummaries?.get(id)??snapshot.layoutSummary}})
}
function envelope(input:ExportInput,artifacts:CompactArtifactSnapshot[],olderArtifactSummaries:OlderArtifactSummary[]):AgentContextEnvelope{
 const refs=[...new Set(artifacts.flatMap(artifact=>artifact.datasetRefs))]
 const plannedFareIds=[...new Set(snapshots(input).flatMap(artifact=>artifact.selectedFareIds))]
 return {schemaVersion:CONTRACT_VERSION,turnId:input.turnId,activeArtifactId:input.activeArtifactId,artifacts,olderArtifactSummaries,datasets:refs.map(id=>input.bridge.getManifest(id)),plannedFareIds,selectedFareFacts:input.selectedFareFacts??[]}
}
function finish(candidate:AgentContextEnvelope):AgentContextEnvelope{
 const snapshot=parseAgentContext(candidate);assertNoBulkData(snapshot);return snapshot
}
export function exportAgentContext(input:ExportInput):AgentContextEnvelope{
 return finish(envelope(input,snapshots(input),input.olderArtifactSummaries??[]))
}
function prepareCapture(input:Omit<ExportInput,'olderArtifactSummaries'|'selectedFareFacts'>):PreparedCapture{
 const records=snapshots(input).map(snapshot=>({snapshot,lastInteractionAt:input.store.get(snapshot.artifactId).lastInteractionAt}))
 const manifests=new Map<string,ReturnType<FareDataBridge['getManifest']>>()
 for(const datasetId of new Set(records.flatMap(record=>record.snapshot.datasetRefs)))manifests.set(datasetId,structuredClone(input.bridge.getManifest(datasetId)))
 return {turnId:input.turnId,activeArtifactId:input.activeArtifactId,records,manifests,plannedFareIds:[...new Set(records.flatMap(record=>record.snapshot.selectedFareIds))]}
}
function capturePreparedContext(prepared:PreparedCapture,selectedFareFacts:BoundedFareFact[]):AgentContextEnvelope{
 const records=[...prepared.records]
 records.sort((left,right)=>Number(right.snapshot.artifactId===prepared.activeArtifactId)-Number(left.snapshot.artifactId===prepared.activeArtifactId)||Date.parse(right.lastInteractionAt)-Date.parse(left.lastInteractionAt)||(left.snapshot.artifactId===right.snapshot.artifactId?0:left.snapshot.artifactId<right.snapshot.artifactId?-1:1))
 const included=records.slice(0,LIMITS.artifacts)
 let factCount=selectedFareFacts.length
 let summaryLimit=LIMITS.storedArtifacts
 while(true){
  const ids=new Set(included.map(record=>record.snapshot.artifactId))
  const summaries=records.filter(record=>!ids.has(record.snapshot.artifactId)).map(record=>({artifactId:record.snapshot.artifactId,variant:'a' as const,label:record.snapshot.layoutSummary.slice(0,160),revision:record.snapshot.revision,lastInteractionAt:record.lastInteractionAt})).slice(0,summaryLimit)
  const artifacts=included.map(record=>record.snapshot)
  const refs=[...new Set(artifacts.flatMap(artifact=>artifact.datasetRefs))]
  const candidate:AgentContextEnvelope={schemaVersion:CONTRACT_VERSION,turnId:prepared.turnId,activeArtifactId:prepared.activeArtifactId,artifacts,olderArtifactSummaries:summaries,datasets:refs.map(id=>{
   const manifest=prepared.manifests.get(id)
   if(!manifest)throw new Error('Missing captured dataset manifest')
   return manifest
  }),plannedFareIds:prepared.plannedFareIds,selectedFareFacts:selectedFareFacts.slice(0,factCount)}
  if(new TextEncoder().encode(JSON.stringify(candidate)).length<=LIMITS.snapshotBytes)return finish(candidate)
  if(selectedFareFacts.length>0&&summaryLimit>0)summaryLimit-=1
  else if(included.length>1)included.pop()
  else if(factCount>0)factCount-=1
  else return finish(candidate)
 }
}
export function captureAgentContext(input:Omit<ExportInput,'olderArtifactSummaries'>):AgentContextEnvelope{
 return capturePreparedContext(prepareCapture(input),input.selectedFareFacts??[])
}
export async function captureAgentContextWithSelectedFares(input:Omit<ExportInput,'olderArtifactSummaries'|'selectedFareFacts'>):Promise<AgentContextEnvelope>{
 const prepared=prepareCapture(input)
 const order=new Map(prepared.plannedFareIds.map((fareId,index)=>[fareId,index]))
 const resolved=await Promise.allSettled(prepared.plannedFareIds.map(fareId=>input.bridge.lookupFare(fareId,[])))
 const facts=resolved.flatMap(result=>result.status==='fulfilled'?[result.value]:[])
 facts.sort((left,right)=>left.serviceDate.localeCompare(right.serviceDate)||left.departureMinutes-right.departureMinutes||(order.get(left.id)??0)-(order.get(right.id)??0)||left.id.localeCompare(right.id))
 return capturePreparedContext(prepared,facts)
}
