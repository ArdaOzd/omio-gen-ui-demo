import type { UIMessage } from 'ai'
import { presentTreesOverlapForSupersession,validatePresentTree,type PresentNode,type PresentValidationScope } from './presentation/tree'
import { DatasetIdSchema,type ComponentBinding } from './contracts'

type ActiveScene={toolCallId:string;tree:PresentNode}
const sceneRef=(toolCallId:string)=>`present-${toolCallId.replace(/[^a-zA-Z0-9_.:-]/g,'_').slice(-32)}`
const bindingKey=(scene:string,key:string)=>`${scene}:${key.slice(-(95-scene.length))}`

export function getSceneMetadata(messages:UIMessage[],scope?:PresentValidationScope){
 const active=new Map<string,ActiveScene[]>()
 for(const message of messages)for(const part of message.parts){
  if(part.type!=='tool-present'||!part.input)continue
  try{
   const tree=validatePresentTree(part.input,scope),current=active.get(tree.artifactRef)??[]
   active.set(tree.artifactRef,[...current.filter(scene=>!presentTreesOverlapForSupersession(scene.tree,tree)),{toolCallId:part.toolCallId,tree}])
  }catch{}
 }
 const sources=new Map<string,string>(),layouts=new Map<string,string>(),bindings=new Map<string,ComponentBinding[]>()
 for(const [artifactRef,scenes] of active){
  const current:ComponentBinding[]=[],descriptions:string[]=[]
  for(const scene of scenes){
   const ref=sceneRef(scene.toolCallId)
   const describe=(node:PresentNode,path:string):string=>{
    current.push({type:node.$type,key:bindingKey(ref,node.$key??path),...(node.legIndex!==undefined?{legIndex:node.legIndex}:{}),...(node.datasetRef?{datasetRef:DatasetIdSchema.parse(node.datasetRef)}:{}),...(node.actionRef?{actionRef:node.actionRef}:{}),...(node.selectorRef?{selectorRef:node.selectorRef}:{})})
    const children=node.children?(Array.isArray(node.children)?node.children:typeof node.children==='object'?[node.children]:[]):[]
    return node.$type+(children.length?`(${children.map((child,index)=>describe(child,`${path}.${index}`)).join(',')})`:'')
   }
   descriptions.push(describe(scene.tree,'root'))
  }
  sources.set(artifactRef,JSON.stringify(scenes.length===1?scenes[0]!.tree:scenes.map(scene=>scene.tree)))
  layouts.set(artifactRef,descriptions.join(' + ').slice(0,600))
  bindings.set(artifactRef,current)
 }
 return{sources,layouts,bindings}
}
