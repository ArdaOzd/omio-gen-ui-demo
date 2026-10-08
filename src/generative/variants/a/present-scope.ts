import { ArtifactIdSchema,type ArtifactId } from '../../contracts'
import type { TravelServices } from '../../catalog/context'
import { orderedLegResources } from '../../state/leg-bindings'
import { createPresentValidationScope,type PresentNode,type PresentValidationScope } from './tree'

export function createRuntimePresentValidationScope(artifactIds:readonly (ArtifactId|string)[],services:Pick<TravelServices,'state'|'bridge'>):PresentValidationScope{
 const datasetIds=new Set<string>()
 const artifacts=artifactIds.map(value=>{
  const artifactId=ArtifactIdSchema.parse(value),state=services.state.get(artifactId),resources=orderedLegResources(state,services.bridge)
  for(const id of state.datasetRefs)datasetIds.add(id)
  for(const id of Object.keys(state.datasetBindings))datasetIds.add(id)
  const routeKeys=state.citySequence.length>1?state.citySequence.slice(1).map((destinationId,index)=>`${state.citySequence[index]}:${destinationId}`):resources.map(resource=>resource.key)
  return{artifactId,legDatasetIds:routeKeys.map(key=>{
   const ids=new Set(resources.filter(resource=>resource.key===key).map(resource=>String(resource.datasetId)))
   for(const [seed,boundKey] of Object.entries(state.datasetBindings))if(boundKey===key)ids.add(seed)
   return ids
  })}
 })
 return createPresentValidationScope(artifacts,datasetIds)
}

export function createRuntimePresentValidationScopeForTree(root:PresentNode,services:Pick<TravelServices,'state'|'bridge'>):PresentValidationScope{
 const artifactIds=new Set<string>()
 const collect=(node:PresentNode):void=>{artifactIds.add(node.artifactRef);if(Array.isArray(node.children))node.children.forEach(collect);else if(node.children&&typeof node.children!=='string')collect(node.children)}
 collect(root)
 return createRuntimePresentValidationScope([...artifactIds],services)
}
