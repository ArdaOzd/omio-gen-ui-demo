import { useCallback,useEffect,useMemo,useRef,type ReactNode } from 'react'
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
import { DisplayContextProvider } from '../catalog/display-context-provider'
import { createDisplayContextStore, type DisplayContextStore } from '../state/display-context'
export type GenerativeChatProps={services:TravelServices;displayStore?:DisplayContextStore;capture:()=>AgentContextEnvelope|Promise<AgentContextEnvelope>;sceneToolkit?:Toolkit;initialMessages?:UIMessage[];initialRunMessageId?:string;initialDraft?:string;onMessages?:(messages:UIMessage[])=>void|Promise<void>;onLiveMessages?:(messages:UIMessage[])=>void;onDraft?:(draft:string)=>void;provider?:'codex'|'fixture';theme?:'blue'|'sand';sidebar?:ReactNode;registerRunStop?:(stop:(()=>Promise<void>)|null)=>void}
function isUIMessage(value:unknown):value is UIMessage{return typeof value==='object'&&value!==null&&'id'in value&&typeof value.id==='string'&&'role'in value&&'parts'in value&&Array.isArray(value.parts)}
function exportedMessages(value:unknown):UIMessage[]{
 if(typeof value!=='object'||value===null||!('messages'in value)||!Array.isArray(value.messages))return[]
 return value.messages.flatMap(item=>typeof item==='object'&&item!==null&&'message'in item&&isUIMessage(item.message)?[item.message]:[])
}
function LocalToolStatus({result}:ToolCallMessagePartProps<unknown,unknown>){
 if(typeof result!=='object'||result===null||!('status'in result))return null
 if(result.status==='error')return <Alert className="travel-tools-error">I could not update the travel data. Your current plan is unchanged; try again or adjust the request.</Alert>
 if(result.status==='stale')return <Alert className="travel-tools-error">Your travel plan changed before that update finished. I kept the newer version.</Alert>
 return null
}
export function GenerativeChat(props:GenerativeChatProps){
 const fallbackDisplayStore=useRef<DisplayContextStore|undefined>(undefined);if(!fallbackDisplayStore.current)fallbackDisplayStore.current=createDisplayContextStore();const displayStore=props.displayStore??fallbackDisplayStore.current
 const toolkit=useMemo(()=>{
  const browser=createBrowserTools({bridge:props.services.bridge,store:props.services.state,displayStore,activeArtifactId:()=>ArtifactIdSchema.parse(props.services.activeId()),createArtifact:props.services.createArtifact,dispatch:props.services.dispatch,whenIdle:props.services.whenIdle})
  const frontend=Object.fromEntries(Object.entries(browser).map(([name,tool])=>[name,{...tool,type:'frontend' as const,render:LocalToolStatus}]))
  return {...frontend,...(props.sceneToolkit??aToolkit)} satisfies Toolkit
 },[props.services,displayStore,props.sceneToolkit])
 const transport=useMemo(()=>createSnapshotTransport({capture:props.capture,transport:{body:{provider:props.provider??'codex'}}}),[props.capture,props.provider])
 const messages=useMemo(()=>props.initialMessages?normalizeToolContinuations(props.initialMessages):undefined,[props.initialMessages])
 const finishWaiters=useRef(new Set<()=>void>())
 const runtime=useChatRuntime({transport,messages,sendAutomaticallyWhen:lastAssistantMessageIsCompleteWithToolCalls,onFinish:async({messages})=>{try{await props.onMessages?.(normalizeToolContinuations(messages))}finally{finishWaiters.current.forEach(resolve=>resolve());finishWaiters.current.clear()}}})
 const stopRun=useCallback(async()=>{
  props.onDraft?.(runtime.thread.composer.getState().text)
  if(!runtime.thread.getState().isRunning)return
  const finished=new Promise<void>(resolve=>finishWaiters.current.add(resolve))
  runtime.thread.cancelRun()
  await finished
 },[props.onDraft,runtime])
 useEffect(()=>{props.registerRunStop?.(stopRun);return()=>props.registerRunStop?.(null)},[props.registerRunStop,stopRun])
 const appliedDraft=useRef(false)
 useEffect(()=>{if(appliedDraft.current)return;appliedDraft.current=true;if(props.initialDraft)runtime.thread.composer.setText(props.initialDraft)},[props.initialDraft,runtime])
 useEffect(()=>{let current=runtime.thread.composer.getState().text;return runtime.thread.composer.subscribe(()=>{const next=runtime.thread.composer.getState().text;if(next===current)return;current=next;props.onDraft?.(next)})},[props.onDraft,runtime])
 useEffect(()=>{
  let current=JSON.stringify(exportedMessages(runtime.thread.exportExternalState()))
  return runtime.thread.subscribe(()=>{
   const next=exportedMessages(runtime.thread.exportExternalState()),serialized=JSON.stringify(next)
   if(serialized===current)return
   current=serialized
   props.onLiveMessages?.(normalizeToolContinuations(next))
  })
 },[props.onLiveMessages,runtime])
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
 return <div className="travel-app" data-theme={props.theme??'blue'}><DisplayContextProvider store={displayStore}><TravelProvider services={props.services}><AssistantRuntimeProvider runtime={runtime} config={AuiConfig({tools:Tools({toolkit})})}><div className="travel-workspace">{props.sidebar}<ThreadShell/><PlanningTracker/></div></AssistantRuntimeProvider></TravelProvider></DisplayContextProvider></div>
}
