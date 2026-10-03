import {createContext} from 'react'
import {isToolUIPart,type UIMessage} from 'ai'
import type {createBrowserTools} from '../tools/browser-tools'
export const CanonicalMessagesContext=createContext<readonly UIMessage[]>([])
export function completedNarrativeIndices(message:UIMessage|undefined,parts:readonly {type:string;text?:string}[],complete:boolean):Set<number>{
 const hidden=new Set<number>();if(!message||!complete)return hidden
 let finalStart=-1;message.parts.forEach((part,index)=>{if(part.type==='step-start')finalStart=index});if(finalStart<0)return hidden
 const final=message.parts.slice(finalStart+1)
 if(!final.some(part=>part.type==='text')||final.some(part=>isToolUIPart(part)||part.type==='text'&&part.state==='streaming'))return hidden
 const earlier=message.parts.slice(0,finalStart)
 const accepted=earlier.some(part=>{
  if(!isToolUIPart(part)||part.state!=='output-available'||typeof part.output!=='object'||part.output===null)return false
  const name=part.type==='dynamic-tool'?part.toolName:part.type.slice(5)
  return name==='present'?Object.keys(part.output).length===0:name==='compose_reactive_scene'&&'status' in part.output&&part.output.status==='accepted'
 })
 if(!accepted)return hidden
 const rawTexts=message.parts.flatMap((part,index)=>part.type==='text'?[{text:part.text,earlier:index<finalStart}]:[])
 const nativeTexts=parts.flatMap((part,index)=>part.type==='text'?[{text:part.text,index}]:[])
 if(rawTexts.length!==nativeTexts.length||rawTexts.some((part,index)=>part.text!==nativeTexts[index]?.text))return hidden
 rawTexts.forEach((part,index)=>{if(part.earlier){const native=nativeTexts[index];if(native)hidden.add(native.index)}})
 return hidden
}

const localToolNames=['create_artifact','edit_artifact','load_fares','summarize_fares','get_top_fares','get_fare','get_route','find_carriers'] satisfies ReadonlyArray<keyof ReturnType<typeof createBrowserTools>>
export function completedLocalToolIndices(message:UIMessage|undefined,parts:readonly {type:string;toolCallId?:string}[],complete:boolean):Set<number>{
 const hidden=new Set<number>();if(!message||!complete)return hidden
 const calls=new Set(message.parts.flatMap(part=>{
  if(!isToolUIPart(part)||part.state!=='output-available')return []
  const name=part.type==='dynamic-tool'?part.toolName:part.type.slice(5)
  if(!localToolNames.some(local=>local===name))return []
  if(typeof part.output==='object'&&part.output!==null&&'status' in part.output&&['error','stale'].includes(String(part.output.status)))return []
  return [part.toolCallId]
 }))
 parts.forEach((part,index)=>{if(part.toolCallId&&calls.has(part.toolCallId))hidden.add(index)})
 return hidden
}
