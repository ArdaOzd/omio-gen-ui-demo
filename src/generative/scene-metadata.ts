import type { UIMessage } from 'ai';
import { validatePresentTree,type PresentNode } from './variants/a/tree';
import {DatasetIdSchema,type ComponentBinding} from './contracts'
export function getSceneMetadata(messages:UIMessage[]){
 const sources=new Map<string,string>(),layouts=new Map<string,string>(),bindings=new Map<string,ComponentBinding[]>();
 for(const message of messages)for(const part of message.parts){
  if(part.type==='tool-present'&&part.input){try{const tree=validatePresentTree(part.input);const current:ComponentBinding[]=[];const describe=(node:PresentNode,path:string):string=>{current.push({type:node.$type,key:node.$key??path,...(node.legIndex!==undefined?{legIndex:node.legIndex}:{}),...(node.datasetRef?{datasetRef:DatasetIdSchema.parse(node.datasetRef)}:{}),...(node.actionRef?{actionRef:node.actionRef}:{}),...(node.selectorRef?{selectorRef:node.selectorRef}:{})});const children=node.children?(Array.isArray(node.children)?node.children:typeof node.children==='object'?[node.children]:[]):[];return node.$type+(children.length?`(${children.map((child,index)=>describe(child,`${path}.${index}`)).join(',')})`:'')};sources.set(tree.artifactRef,JSON.stringify(tree));layouts.set(tree.artifactRef,describe(tree,'root').slice(0,600));bindings.set(tree.artifactRef,current);}catch{}}
 }
 return{sources,layouts,bindings};
}
