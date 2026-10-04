import type { ComponentType } from 'react'
import { useAuiState,type ToolCallMessagePartProps } from '@assistant-ui/react'
import { hasLaterAcceptedScene } from '../../chat/tool-supersession'
import { getPartialJsonObjectMeta } from 'assistant-stream/utils'
import { useTravelServices } from '../../catalog/context'
import { ArtifactIdSchema, DatasetIdSchema } from '../../contracts'
import { prunePresentTree, validatePresentTree, type PresentNode } from './tree'
type Props=ToolCallMessagePartProps<Record<string,unknown>,Record<string,never>>
export function PresentBoundary(props:Props&{nativeRender?:ComponentType<Props>}){
 const superseded=useAuiState(state=>hasLaterAcceptedScene(state.message.parts,props.toolCallId,'present',typeof props.args.artifactRef==='string'?props.args.artifactRef:undefined,part=>{if(part.isError||typeof part.result!=='object'||part.result===null||Object.keys(part.result).length)return false;try{validatePresentTree(part.args);return true}catch{return false}}))
 const services=useTravelServices();if(superseded)return null;const meta=getPartialJsonObjectMeta(props.args)
 const partial=props.status.type!=='complete'&&(props.status.type!=='requires-action'||meta?.state==='partial')
 try{
  let tree=partial?prunePresentTree(props.args,undefined,meta?.state==='partial'?meta.partialPath:undefined):validatePresentTree(props.args)
  if(!tree)return <div className="travel-skeleton" role="status">Preparing your view…</div>
  const refs=(node:PresentNode):void=>{services.state.get(ArtifactIdSchema.parse(node.artifactRef));if(node.datasetRef)services.bridge.getManifest(DatasetIdSchema.parse(node.datasetRef));if(Array.isArray(node.children))node.children.forEach(refs);else if(node.children&&typeof node.children!=='string')refs(node.children)}
  if(partial){
   const artifactIds=new Set<string>();const datasetIds=new Set<string>()
   const collect=(node:typeof tree):void=>{if(!node)return;try{services.state.get(ArtifactIdSchema.parse(node.artifactRef));artifactIds.add(node.artifactRef)}catch{}if(node.datasetRef){try{services.bridge.getManifest(DatasetIdSchema.parse(node.datasetRef));datasetIds.add(node.datasetRef)}catch{}}if(Array.isArray(node.children))node.children.forEach(collect);else if(node.children&&typeof node.children!=='string')collect(node.children)}
   collect(tree);tree=prunePresentTree(props.args,{artifactIds,datasetIds},meta?.state==='partial'?meta.partialPath:undefined)
   if(!tree)return <div className="travel-skeleton" role="status">Preparing your view…</div>
  }else refs(tree)
  const NativeRender=props.nativeRender
  if(!NativeRender)throw new Error("Native present renderer unavailable")
  return <NativeRender {...props} args={tree}/>
 }catch{return <div className="travel-tools-error" role="alert">This view could not be displayed. Retry with the current travel state.</div>}
}
