import { useMemo } from 'react'
import { AssistantRuntimeProvider, AuiConfig, Tools, type Toolkit } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/ai-sdk'
import { lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from 'ai'
import { ArtifactIdSchema, type AgentContextEnvelope } from '../contracts'
import { TravelProvider, type TravelServices } from '../catalog/context'
import { createBrowserTools } from '../tools/browser-tools'
import aToolkit from '../variants/a/toolkit-client'
import { createSnapshotTransport } from './transport'
import { ThreadShell } from './thread-shell'
import '../catalog/tokens.css'
export type GenerativeChatProps={variant:'a'|'b';services:TravelServices;capture:()=>AgentContextEnvelope;sceneToolkit?:Toolkit;initialMessages?:UIMessage[];onMessages?:(messages:UIMessage[])=>void;provider?:'codex'|'fixture';theme?:'blue'|'sand'}
export function GenerativeChat(props:GenerativeChatProps){
 const toolkit=useMemo(()=>{
  const browser=createBrowserTools({bridge:props.services.bridge,store:props.services.state,activeArtifactId:()=>ArtifactIdSchema.parse(props.services.activeId()),createArtifact:props.services.createArtifact,dispatch:props.services.dispatch,whenIdle:props.services.whenIdle})
  const frontend=Object.fromEntries(Object.entries(browser).map(([name,tool])=>[name,{...tool,type:'frontend' as const,render:()=> <div className="travel-caption" role="status">Travel data updated locally.</div>}]))
  return {...frontend,...(props.sceneToolkit??aToolkit)} satisfies Toolkit
 },[props.services,props.sceneToolkit])
 const transport=useMemo(()=>createSnapshotTransport({variant:props.variant,capture:props.capture,transport:{body:{provider:props.provider??'codex'}}}),[props.variant,props.capture,props.provider])
 const runtime=useChatRuntime({transport,messages:props.initialMessages,sendAutomaticallyWhen:lastAssistantMessageIsCompleteWithToolCalls,onFinish:({messages})=>props.onMessages?.(messages)})
 return <div className="travel-app" data-theme={props.theme??'blue'}><TravelProvider services={props.services}><AssistantRuntimeProvider runtime={runtime} config={AuiConfig({tools:Tools({toolkit})})}><ThreadShell/></AssistantRuntimeProvider></TravelProvider></div>
}
