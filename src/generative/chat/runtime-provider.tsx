import { useEffect,useMemo,useRef } from 'react'
import { AssistantRuntimeProvider, AuiConfig, Tools, type Toolkit, type ToolCallMessagePartProps } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/ai-sdk'
import { lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from 'ai'
import { ArtifactIdSchema, type AgentContextEnvelope } from '../contracts'
import { TravelProvider, type TravelServices } from '../catalog/context'
import { createBrowserTools } from '../tools/browser-tools'
import aToolkit from '../variants/a/toolkit-client'
import { createSnapshotTransport } from './transport'
import { ThreadShell } from './thread-shell'
import { normalizeToolContinuations } from './continuation-history'
import { completeSmartPlannerHandoff } from '../smart-planner-handoff'
import { PlanningTracker } from '../variants/a/planning-tracker'
import { Alert } from '@/components/ui/alert'
import '../catalog/tokens.css'
import '../catalog/trip-planning/trip-planning.css'
export type GenerativeChatProps={services:TravelServices;capture:()=>AgentContextEnvelope|Promise<AgentContextEnvelope>;sceneToolkit?:Toolkit;initialMessages?:UIMessage[];initialRunMessageId?:string;onMessages?:(messages:UIMessage[])=>void;provider?:'codex'|'fixture';theme?:'blue'|'sand'}
function LocalToolStatus({result}:ToolCallMessagePartProps<unknown,unknown>){
 if(typeof result!=='object'||result===null||!('status'in result))return null
 if(result.status==='error')return <Alert className="travel-tools-error">I could not update the travel data. Your current plan is unchanged; try again or adjust the request.</Alert>
 if(result.status==='stale')return <Alert className="travel-tools-error">Your travel plan changed before that update finished. I kept the newer version.</Alert>
 return null
}
export function GenerativeChat(props:GenerativeChatProps){
 const toolkit=useMemo(()=>{
  const browser=createBrowserTools({bridge:props.services.bridge,store:props.services.state,activeArtifactId:()=>ArtifactIdSchema.parse(props.services.activeId()),createArtifact:props.services.createArtifact,dispatch:props.services.dispatch,whenIdle:props.services.whenIdle})
  const frontend=Object.fromEntries(Object.entries(browser).map(([name,tool])=>[name,{...tool,type:'frontend' as const,render:LocalToolStatus}]))
  return {...frontend,...(props.sceneToolkit??aToolkit)} satisfies Toolkit
 },[props.services,props.sceneToolkit])
 const transport=useMemo(()=>createSnapshotTransport({capture:props.capture,transport:{body:{provider:props.provider??'codex'}}}),[props.capture,props.provider])
 const messages=useMemo(()=>props.initialMessages?normalizeToolContinuations(props.initialMessages):undefined,[props.initialMessages])
 const runtime=useChatRuntime({transport,messages,sendAutomaticallyWhen:lastAssistantMessageIsCompleteWithToolCalls,onFinish:({messages})=>props.onMessages?.(normalizeToolContinuations(messages))})
 const startedMessageIds=useRef(new Set<string>())
 useEffect(()=>{
  const messageId=props.initialRunMessageId
  if(!messageId||startedMessageIds.current.has(messageId))return
  const start=()=>{
   if(startedMessageIds.current.has(messageId))return true
   if(!runtime.thread.getState().messages.some(message=>message.id===messageId))return false
   startedMessageIds.current.add(messageId)
   completeSmartPlannerHandoff(messageId)
   runtime.thread.startRun({parentId:messageId})
   return true
  }
  if(start())return
  const unsubscribe=runtime.thread.subscribe(start)
  start()
  return unsubscribe
 },[runtime,props.initialRunMessageId])
 return <div className="travel-app" data-theme={props.theme??'blue'}><TravelProvider services={props.services}><AssistantRuntimeProvider runtime={runtime} config={AuiConfig({tools:Tools({toolkit})})}><div className="travel-workspace"><ThreadShell/><PlanningTracker/></div></AssistantRuntimeProvider></TravelProvider></div>
}
