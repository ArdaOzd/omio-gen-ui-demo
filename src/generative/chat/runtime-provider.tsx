import { useMemo,useState } from 'react'
import { AssistantRuntimeProvider, AuiConfig, Tools, type Toolkit } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/ai-sdk'
import { lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from 'ai'
import { ArtifactIdSchema, type AgentContextEnvelope } from '../contracts'
import { TravelProvider, type TravelServices } from '../catalog/context'
import { createBrowserTools } from '../tools/browser-tools'
import aToolkit from '../variants/a/toolkit-client'
import { createSnapshotTransport } from './transport'
import { ThreadShell } from './thread-shell'
import { normalizeToolContinuations } from './continuation-history'
import {CanonicalMessagesContext} from './narrative-disclosure'
import '../catalog/tokens.css'
export type GenerativeChatProps={services:TravelServices;capture:()=>AgentContextEnvelope;sceneToolkit?:Toolkit;initialMessages?:UIMessage[];onMessages?:(messages:UIMessage[])=>void;provider?:'codex'|'fixture';theme?:'blue'|'sand'}
export function GenerativeChat(props:GenerativeChatProps){
 const toolkit=useMemo(()=>{
  const browser=createBrowserTools({bridge:props.services.bridge,store:props.services.state,activeArtifactId:()=>ArtifactIdSchema.parse(props.services.activeId()),createArtifact:props.services.createArtifact,dispatch:props.services.dispatch,whenIdle:props.services.whenIdle})
  const frontend=Object.fromEntries(Object.entries(browser).map(([name,tool])=>[name,{...tool,type:'frontend' as const,render:()=> <div className="travel-caption" role="status">Travel data updated locally.</div>}]))
  return {...frontend,...(props.sceneToolkit??aToolkit)} satisfies Toolkit
 },[props.services,props.sceneToolkit])
 const transport=useMemo(()=>createSnapshotTransport({capture:props.capture,transport:{body:{provider:props.provider??'codex'}}}),[props.capture,props.provider])
 const messages=useMemo(()=>props.initialMessages?normalizeToolContinuations(props.initialMessages):undefined,[props.initialMessages])
 const [canonicalMessages,setCanonicalMessages]=useState<UIMessage[]>(messages??[])
 const runtime=useChatRuntime({transport,messages,sendAutomaticallyWhen:lastAssistantMessageIsCompleteWithToolCalls,onFinish:({messages})=>{const normalized=normalizeToolContinuations(messages);setCanonicalMessages(normalized);props.onMessages?.(normalized)}})
 return <div className="travel-app" data-theme={props.theme??'blue'}><TravelProvider services={props.services}><AssistantRuntimeProvider runtime={runtime} config={AuiConfig({tools:Tools({toolkit})})}><CanonicalMessagesContext.Provider value={canonicalMessages}><ThreadShell/></CanonicalMessagesContext.Provider></AssistantRuntimeProvider></TravelProvider></div>
}
