import type { UIMessage } from 'ai';
import { validatePresentTree,type PresentNode } from './variants/a/tree';
export function getSceneMetadata(messages:UIMessage[]){
 const sources=new Map<string,string>(),layouts=new Map<string,string>();
 for(const message of messages)for(const part of message.parts){
  if(part.type==='tool-present'&&part.input){try{const tree=validatePresentTree(part.input);const describe=(node:PresentNode):string=>node.$type+(node.children?`(${(Array.isArray(node.children)?node.children:typeof node.children==='object'?[node.children]:[]).map(describe).join(',')})`:'');sources.set(tree.artifactRef,JSON.stringify(tree));layouts.set(tree.artifactRef,describe(tree).slice(0,600));}catch{}}
 }
 return{sources,layouts};
}
