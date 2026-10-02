import { parseAgentContext,type AgentContextEnvelope,type ArtifactId,type BoundedFareFact,type FareDataBridge,type UIStateStore } from '../contracts'
import { assertNoBulkData } from '../contracts/privacy'
export function exportAgentContext(input:{turnId:string;activeArtifactId?:ArtifactId;artifactIds:ArtifactId[];store:UIStateStore;bridge:FareDataBridge;selectedFareFacts?:BoundedFareFact[]}):AgentContextEnvelope{
 const ordered=[...new Set([...(input.activeArtifactId?[input.activeArtifactId]:[]),...input.artifactIds])].slice(0,8)
 const artifacts=ordered.map(id=>input.store.exportSnapshot(id))
 const refs=[...new Set(artifacts.flatMap(artifact=>artifact.datasetRefs))]
 const datasets=refs.map(id=>input.bridge.getManifest(id))
 const snapshot=parseAgentContext({schemaVersion:'1.0.0',turnId:input.turnId,activeArtifactId:input.activeArtifactId,artifacts,datasets,selectedFareFacts:input.selectedFareFacts??[]})
 assertNoBulkData(snapshot)
 return snapshot
}
