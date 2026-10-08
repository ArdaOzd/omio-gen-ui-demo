import { useEffect,type ComponentType,type ReactNode } from 'react'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuiState,type ToolCallMessagePartProps } from '@assistant-ui/react'
import { hasLaterAcceptedScene } from '../../chat/tool-supersession'
import { getPartialJsonObjectMeta } from 'assistant-stream/utils'
import { useTravelServices } from '../../catalog/context'
import { ArtifactIdSchema,DatasetIdSchema,type ArtifactUIState } from '../../contracts'
import { prunePresentTree, validatePresentTree, type PresentNode } from './tree'
import { isDatasetBoundComponent,resolvePlannerDatasetRef } from '../../catalog/trip-planning/binding'
import { legKey } from '../../state/leg-bindings'
type Props=ToolCallMessagePartProps<Record<string,unknown>,Record<string,never>>
function AcceptedSceneBindings({entries,children}:{entries:ReadonlyArray<{artifactId:ReturnType<typeof ArtifactIdSchema.parse>;bindings:ArtifactUIState['datasetBindings']}>;children:ReactNode}){
 const services=useTravelServices(),signature=JSON.stringify(entries)
 useEffect(()=>{for(const entry of entries)services.state.setDatasetBindings?.(entry.artifactId,entry.bindings)},[services.state,signature])
 return children
}
export function PresentBoundary(props:Props&{nativeRender?:ComponentType<Props>}){
 const superseded=useAuiState(state=>hasLaterAcceptedScene(state.message.parts,props.toolCallId,'present',typeof props.args.artifactRef==='string'?props.args.artifactRef:undefined,part=>{if(part.isError||typeof part.result!=='object'||part.result===null||Object.keys(part.result).length)return false;try{validatePresentTree(part.args);return true}catch{return false}}))
 const services=useTravelServices();if(superseded||props.isError||props.status.type==='incomplete')return null;const meta=getPartialJsonObjectMeta(props.args)
 const partial=props.status.type!=='complete'&&(props.status.type!=='requires-action'||meta?.state==='partial')
 try{
  let tree=partial?prunePresentTree(props.args,undefined,meta?.state==='partial'?meta.partialPath:undefined):validatePresentTree(props.args)
  if(!tree)return <Skeleton className="travel-skeleton" role="status">Preparing your view…</Skeleton>
  const normalize=(node:PresentNode):PresentNode=>{
   services.state.get(ArtifactIdSchema.parse(node.artifactRef))
   if(node.datasetRef&&!resolvePlannerDatasetRef({kind:node.$type,artifactRef:node.artifactRef,datasetRef:node.datasetRef,legIndex:node.legIndex},services.state,services.bridge))throw new Error('Unavailable leg binding')
   const current=node
   if(Array.isArray(current.children))return{...current,children:current.children.map(normalize)}
   if(current.children&&typeof current.children!=='string')return{...current,children:normalize(current.children)}
   return current
  }
  tree=normalize(tree)
  const refs=(node:PresentNode):void=>{services.state.get(ArtifactIdSchema.parse(node.artifactRef));if(node.datasetRef&&!resolvePlannerDatasetRef({kind:node.$type,artifactRef:node.artifactRef,datasetRef:node.datasetRef,legIndex:node.legIndex},services.state,services.bridge))throw new Error('Unavailable dataset binding');if(Array.isArray(node.children))node.children.forEach(refs);else if(node.children&&typeof node.children!=='string')refs(node.children)}
  if(partial){
   const artifactIds=new Set<string>();const datasetIds=new Set<string>()
   const collect=(node:typeof tree):void=>{if(!node)return;try{services.state.get(ArtifactIdSchema.parse(node.artifactRef));artifactIds.add(node.artifactRef)}catch{}if(node.datasetRef){try{if(resolvePlannerDatasetRef({kind:node.$type,artifactRef:node.artifactRef,datasetRef:node.datasetRef,legIndex:node.legIndex},services.state,services.bridge))datasetIds.add(node.datasetRef)}catch{}}if(Array.isArray(node.children))node.children.forEach(collect);else if(node.children&&typeof node.children!=='string')collect(node.children)}
   collect(tree);tree=prunePresentTree(props.args,{artifactIds,datasetIds},meta?.state==='partial'?meta.partialPath:undefined)
   if(!tree)return <Skeleton className="travel-skeleton" role="status">Preparing your view…</Skeleton>
   tree=normalize(tree)
  }else refs(tree)
  const NativeRender=props.nativeRender
  if(!NativeRender)throw new Error("Native present renderer unavailable")
  if(partial)return <NativeRender {...props} args={tree}/>
  const grouped=new Map<ReturnType<typeof ArtifactIdSchema.parse>,ArtifactUIState['datasetBindings']>()
  const collectBindings=(node:PresentNode):void=>{
   const artifactId=ArtifactIdSchema.parse(node.artifactRef)
   if(!grouped.has(artifactId))grouped.set(artifactId,{})
   if(node.datasetRef&&isDatasetBoundComponent(node.$type)){
    const seed=DatasetIdSchema.parse(node.datasetRef)
    const current=resolvePlannerDatasetRef({kind:node.$type,artifactRef:node.artifactRef,datasetRef:node.datasetRef,legIndex:node.legIndex},services.state,services.bridge)
    const key=current?legKey(services.bridge.getManifest(DatasetIdSchema.parse(current)).coverage):undefined
    if(key)grouped.set(artifactId,{...grouped.get(artifactId),[seed]:key})
   }
   if(Array.isArray(node.children))node.children.forEach(collectBindings);else if(node.children&&typeof node.children!=='string')collectBindings(node.children)
  }
  collectBindings(tree)
  const entries=[...grouped].map(([artifactId,bindings])=>({artifactId,bindings}))
  return <AcceptedSceneBindings entries={entries}><NativeRender {...props} args={tree}/></AcceptedSceneBindings>
 }catch{return <Alert className="travel-tools-error">This view could not be displayed. Retry with the current travel state.</Alert>}
}
