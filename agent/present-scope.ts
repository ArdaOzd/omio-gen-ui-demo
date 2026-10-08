import { createPresentValidationScope,type PresentValidationScope } from '../src/generative/presentation/tree'

type PresentScopeArtifact={artifactId:string;datasetRefs:readonly string[];citySequence:readonly string[]}
type PresentScopeDataset={datasetId:string;manifest:{coverage:{originId:string;destinationId:string}}}

export function createAgentPresentValidationScope(context:{artifacts:readonly PresentScopeArtifact[];datasets:readonly PresentScopeDataset[]}):PresentValidationScope{
 const bindingsById=new Map(context.datasets.map(binding=>[binding.datasetId,binding]))
 return createPresentValidationScope(context.artifacts.map(artifact=>{
  const routeKeys=artifact.citySequence.length>1
   ?artifact.citySequence.slice(1).map((destinationId,index)=>`${artifact.citySequence[index]}:${destinationId}`)
   :artifact.datasetRefs.flatMap(datasetId=>{const coverage=bindingsById.get(datasetId)?.manifest.coverage;return coverage?[`${coverage.originId}:${coverage.destinationId}`]:[]})
  return{artifactId:artifact.artifactId,legDatasetIds:routeKeys.map(key=>new Set(artifact.datasetRefs.filter(datasetId=>{const coverage=bindingsById.get(datasetId)?.manifest.coverage;return coverage&&`${coverage.originId}:${coverage.destinationId}`===key})))}
 }),context.datasets.map(dataset=>dataset.datasetId))
}
