import { useCallback,useEffect,useMemo,useRef,useSyncExternalStore,type ReactNode } from 'react'
import { AssistantRuntimeProvider, AuiConfig, Tools, type Toolkit, type ToolCallMessagePartProps } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/ai-sdk'
import { lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from 'ai'
import { ArtifactIdSchema, type AgentContextEnvelope } from '../contracts'
import { TravelProvider, type TravelServices } from '../catalog/context'
import { createBrowserTools } from '../tools/browser-tools'
import presentationToolkit from '../presentation/toolkit-client'
import { createSnapshotTransport } from './transport'
import { ThreadShell } from './thread-shell'
import { normalizeToolContinuations } from './continuation-history'
import { completeSmartPlannerHandoff } from '../smart-planner-handoff'
import { PlanningTracker } from '../tracker/planning-tracker'
import type { PlanningStore } from '../tracker/planning-store'
import { SceneLifecycleProvider, type SceneLifecycle } from '../presentation/scene-lifecycle'
import { Alert } from '@/components/ui/alert'
import '../catalog/tokens.css'
import '../catalog/trip-planning/trip-planning.css'
import { DisplayContextProvider } from '../catalog/display-context-provider'
import { createDisplayContextStore, type DisplayContextStore } from '../state/display-context'
import type { ReplyTurnGate } from '../state/action-router'
import type { UIStateStore } from '../contracts'
import { replyRunResult } from './reply-run'
import type { SnapshotCaptureRequest } from './transport'
export type GenerativeChatProps={services:TravelServices;agentDispatch?:NonNullable<TravelServices['dispatch']>;turnGate?:ReplyTurnGate;onRunSettled?:(token:number)=>void;planning:PlanningStore;sceneLifecycle:SceneLifecycle;displayStore?:DisplayContextStore;capture:(request:SnapshotCaptureRequest)=>AgentContextEnvelope|Promise<AgentContextEnvelope>;sceneToolkit?:Toolkit;initialMessages?:UIMessage[];initialRunMessageId?:string;initialDraft?:string;onMessages?:(messages:UIMessage[])=>void|Promise<void>;onLiveMessages?:(messages:UIMessage[])=>void;onDraft?:(draft:string)=>void;provider?:'codex'|'fixture';theme?:'blue'|'sand';sidebar?:ReactNode;registerRunStop?:(stop:(()=>Promise<void>)|null)=>void}
const idleSubscribe=()=>()=>{}
const idleSnapshot=()=>false
function isUIMessage(value:unknown):value is UIMessage{return typeof value==='object'&&value!==null&&'id'in value&&typeof value.id==='string'&&'role'in value&&'parts'in value&&Array.isArray(value.parts)}
function exportedMessages(value:unknown):UIMessage[]{
 if(typeof value!=='object'||value===null||!('messages'in value)||!Array.isArray(value.messages))return[]
 return value.messages.flatMap(item=>typeof item==='object'&&item!==null&&'message'in item&&isUIMessage(item.message)?[item.message]:[])
}
function latestUserMessageId(messages:readonly UIMessage[]):string|undefined{for(let index=messages.length-1;index>=0;index-=1)if(messages[index]?.role==='user')return messages[index]?.id;return undefined}
function LocalToolStatus({result}:ToolCallMessagePartProps<unknown,unknown>){
 if(typeof result!=='object'||result===null||!('status'in result))return null
 if(result.status==='error')return <Alert className="travel-tools-error">I could not update the travel data. Your current plan is unchanged; try again or adjust the request.</Alert>
 if(result.status==='stale')return <Alert className="travel-tools-error">Your travel plan changed before that update finished. I kept the newer version.</Alert>
 return null
}
export function GenerativeChat(props:GenerativeChatProps){
 const fallbackDisplayStore=useRef<DisplayContextStore|undefined>(undefined);if(!fallbackDisplayStore.current)fallbackDisplayStore.current=createDisplayContextStore();const displayStore=props.displayStore??fallbackDisplayStore.current
 const locked=useSyncExternalStore(props.turnGate?.subscribeTurn??idleSubscribe,props.turnGate?.isTurnLocked??idleSnapshot,props.turnGate?.isTurnLocked??idleSnapshot)
 const uiState=useMemo<UIStateStore>(()=>({
  get:props.services.state.get,subscribe:props.services.state.subscribe,exportSnapshot:props.services.state.exportSnapshot,getIds:props.services.state.getIds,
  initializeMissing:props.services.state.initializeMissing,replace:props.services.state.replace,setDatasetBindings:props.services.state.setDatasetBindings,
  dispatch:command=>props.turnGate?.isTurnLocked()?{status:'stale',revision:props.services.state.get(command.artifactId).revision}:props.services.state.dispatch(command),
 }),[props.services.state,props.turnGate])
 const uiServices=useMemo<TravelServices>(()=>{
  const createArtifact=props.services.createArtifact
  return{...props.services,state:uiState,interactionsLocked:props.turnGate?.isTurnLocked,activate:id=>{if(!props.turnGate?.isTurnLocked())props.services.activate(id)},createArtifact:createArtifact?()=>{if(props.turnGate?.isTurnLocked())throw new Error('Reply in progress');return createArtifact()}:undefined}
 },[props.services,props.turnGate,uiState])
 const toolkit=useMemo(()=>{
  const browser=createBrowserTools({bridge:props.services.bridge,store:props.services.state,displayStore,activeArtifactId:()=>ArtifactIdSchema.parse(props.services.activeId()),createArtifact:props.services.createArtifact,signal:props.turnGate?.turnSignal,dispatch:props.agentDispatch??props.services.dispatch,whenIdle:props.services.whenIdle})
  const frontend=Object.fromEntries(Object.entries(browser).map(([name,tool])=>[name,{...tool,type:'frontend' as const,render:LocalToolStatus}]))
  return {...frontend,...(props.sceneToolkit??presentationToolkit)} satisfies Toolkit
 },[props.services,props.agentDispatch,props.turnGate,displayStore,props.sceneToolkit])
 const transport=useMemo(()=>createSnapshotTransport({capture:props.capture,transport:{body:{provider:props.provider??'codex'}}}),[props.capture,props.provider])
 const messages=useMemo(()=>props.initialMessages?normalizeToolContinuations(props.initialMessages):undefined,[props.initialMessages])
 const finishWaiters=useRef(new Map<number|undefined,Set<()=>void>>())
 const resolveFinishWaiters=(token:number|undefined)=>{finishWaiters.current.get(token)?.forEach(resolve=>resolve());finishWaiters.current.delete(token)}
 type FinishRecord={messages:UIMessage[];failed:boolean;saved:Promise<void>;settled:boolean;ownerMessageId:string|undefined;token:number|undefined}
 const finishRecord=useRef<FinishRecord|undefined>(undefined)
 const settleRun=useCallback((record:FinishRecord)=>{
  if(record.settled)return
  record.settled=true
  const finish=()=>{
   if(props.turnGate&&(record.token===undefined||record.ownerMessageId===undefined||props.turnGate.currentTurnToken(record.ownerMessageId)!==record.token)){
    if(finishRecord.current===record)finishRecord.current=undefined
    return
   }
   props.sceneLifecycle.finishTurn(record.messages,{failed:record.failed,willContinue:false})
   if(record.token!==undefined)props.onRunSettled?.(record.token)
   if(finishRecord.current===record)finishRecord.current=undefined
   resolveFinishWaiters(record.token)
  }
  void record.saved.then(finish,finish)
 },[props.sceneLifecycle,props.onRunSettled,props.turnGate])
 const runtime=useChatRuntime({transport,messages,sendAutomaticallyWhen:({messages})=>{
  const ownerMessageId=latestUserMessageId(messages)
  const token=ownerMessageId?props.turnGate?.currentTurnToken(ownerMessageId):undefined
  if(props.turnGate&&(token===undefined||!props.turnGate.isTurnCurrent(token)))return false
  return lastAssistantMessageIsCompleteWithToolCalls({messages})
 },onFinish:async({messages,isAbort,isDisconnect,isError,finishReason})=>{
  const normalized=normalizeToolContinuations(messages),result=replyRunResult(finishReason,{isAbort,isDisconnect,isError})
  const ownerMessageId=latestUserMessageId(normalized)
  const token=ownerMessageId?props.turnGate?.currentTurnToken(ownerMessageId):undefined
  if(props.turnGate&&token===undefined)return
  const saved=Promise.resolve().then(()=>props.onMessages?.(normalized)).then(()=>{})
  const record:FinishRecord={messages:normalized,failed:result.failed,saved,settled:false,ownerMessageId,token}
  finishRecord.current=record
  try{await saved}finally{if(!result.willContinue)settleRun(record)}
 }})
 const stopRun=useCallback(async()=>{
  props.onDraft?.(runtime.thread.composer.getState().text)
  const normalized=normalizeToolContinuations(exportedMessages(runtime.thread.exportExternalState()))
  const ownerMessageId=latestUserMessageId(normalized)
  const token=ownerMessageId?props.turnGate?.currentTurnToken(ownerMessageId):undefined
  if(!runtime.thread.getState().isRunning&&token===undefined)return
  const finished=new Promise<void>(resolve=>{const waiters=finishWaiters.current.get(token)??new Set<()=>void>();waiters.add(resolve);finishWaiters.current.set(token,waiters)})
  props.turnGate?.abortTurn()
  runtime.thread.cancelRun()
  const saved=Promise.resolve().then(()=>props.onMessages?.(normalized)).then(()=>{})
  const record:FinishRecord={messages:normalized,failed:true,saved,settled:false,ownerMessageId,token}
  finishRecord.current=record
  settleRun(record)
  await finished
 },[props.onDraft,props.onMessages,props.turnGate,runtime,settleRun])
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
 return <div className="travel-app" data-theme={props.theme??'blue'}><DisplayContextProvider store={displayStore}><TravelProvider services={uiServices}><SceneLifecycleProvider value={props.sceneLifecycle}><AssistantRuntimeProvider runtime={runtime} config={AuiConfig({tools:Tools({toolkit})})}><div className="travel-workspace">{props.sidebar}<ThreadShell locked={locked} onStop={stopRun}/><PlanningTracker store={props.planning} disabled={locked}/></div></AssistantRuntimeProvider></SceneLifecycleProvider></TravelProvider></DisplayContextProvider></div>
}
