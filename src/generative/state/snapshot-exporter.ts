import { CONTRACT_VERSION,LIMITS,parseAgentContext,type AgentContextEnvelope,type ArtifactId,type BoundedFareFact,type CompactArtifactSnapshot,type FareDataBridge,type OlderArtifactSummary,type UIStateStore } from '../contracts'
import { assertNoBulkData } from '../contracts/privacy'
type ExportInput={turnId:string;activeArtifactId?:ArtifactId;artifactIds:ArtifactId[];store:UIStateStore;bridge:FareDataBridge;selectedFareFacts?:BoundedFareFact[];olderArtifactSummaries?:OlderArtifactSummary[];layoutSummaries?:ReadonlyMap<string,string>}
function snapshots(input:ExportInput){
 const ids=[...new Set([...(input.activeArtifactId?[input.activeArtifactId]:[]),...input.artifactIds])]
 return ids.map(id=>{const snapshot=input.store.exportSnapshot(id);return {...snapshot,layoutSummary:input.layoutSummaries?.get(id)??snapshot.layoutSummary}})
}
function envelope(input:ExportInput,artifacts:CompactArtifactSnapshot[],olderArtifactSummaries:OlderArtifactSummary[]):AgentContextEnvelope{
 const refs=[...new Set(artifacts.flatMap(artifact=>artifact.datasetRefs))]
 return {schemaVersion:CONTRACT_VERSION,turnId:input.turnId,activeArtifactId:input.activeArtifactId,artifacts,olderArtifactSummaries,datasets:refs.map(id=>input.bridge.getManifest(id)),selectedFareFacts:input.selectedFareFacts??[]}
}
function finish(candidate:AgentContextEnvelope):AgentContextEnvelope{
 const snapshot=parseAgentContext(candidate);assertNoBulkData(snapshot);return snapshot
}
export function exportAgentContext(input:ExportInput):AgentContextEnvelope{
 return finish(envelope(input,snapshots(input),input.olderArtifactSummaries??[]))
}
export function captureAgentContext(input:Omit<ExportInput,'olderArtifactSummaries'|'selectedFareFacts'>&{variant:'a'|'b'}):AgentContextEnvelope{
 const records=snapshots(input).map(snapshot=>({snapshot,lastInteractionAt:input.store.get(snapshot.artifactId).lastInteractionAt}))
 records.sort((left,right)=>Number(right.snapshot.artifactId===input.activeArtifactId)-Number(left.snapshot.artifactId===input.activeArtifactId)||Date.parse(right.lastInteractionAt)-Date.parse(left.lastInteractionAt)||(left.snapshot.artifactId===right.snapshot.artifactId?0:left.snapshot.artifactId<right.snapshot.artifactId?-1:1))
 const included=records.slice(0,LIMITS.artifacts)
 while(true){
  const ids=new Set(included.map(record=>record.snapshot.artifactId))
  const summaries=records.filter(record=>!ids.has(record.snapshot.artifactId)).map(record=>({artifactId:record.snapshot.artifactId,variant:input.variant,label:record.snapshot.layoutSummary.slice(0,160),revision:record.snapshot.revision,lastInteractionAt:record.lastInteractionAt}))
  const candidate=envelope(input,included.map(record=>record.snapshot),summaries)
  if(new TextEncoder().encode(JSON.stringify(candidate)).length<=LIMITS.snapshotBytes||included.length<=1)return finish(candidate)
  included.pop()
 }
}
