import { act,fireEvent,render,screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { UIMessage } from 'ai'
import { beforeEach,describe,expect,it,vi } from 'vitest'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createDisplayContextStore } from '../state/display-context'
import { createUIStateStore } from '../state/ui-state-store'
import { createActionRouter } from '../state/action-router'
import { createPlanningStore } from '../tracker/planning-store'
import type { ReplyTurnGate } from '../state/action-router'
import type { SceneLifecycle } from '../presentation/scene-lifecycle'
import { ArtifactIdSchema } from '../contracts'

const harness=vi.hoisted(()=>({options:undefined as Record<string,unknown>|undefined,cancelRun:vi.fn(),messages:[] as UIMessage[]}))

vi.mock('@assistant-ui/ai-sdk',async()=>{
  const actual=await vi.importActual<typeof import('@assistant-ui/ai-sdk')>('@assistant-ui/ai-sdk')
  return{...actual,useChatRuntime:(options:Record<string,unknown>)=>{
    harness.options=options
    return{thread:{getState:()=>({isRunning:false,messages:[]}),subscribe:()=>()=>{},composer:{getState:()=>({text:''}),subscribe:()=>()=>{},setText:()=>{}},exportExternalState:()=>({messages:harness.messages.map(message=>({message}))}),cancelRun:harness.cancelRun,startRun:()=>{}}}
  }}
})
vi.mock('@assistant-ui/react',async()=>{
  const actual=await vi.importActual<typeof import('@assistant-ui/react')>('@assistant-ui/react')
  return{...actual,AssistantRuntimeProvider:({children}:{children:ReactNode})=><>{children}</>,AuiConfig:(value:unknown)=>value,Tools:(value:unknown)=>value}
})
vi.mock('../tools/browser-tools',()=>({createBrowserTools:()=>({})}))
vi.mock('../presentation/toolkit-client',()=>({default:{}}))
vi.mock('./thread-shell',()=>({ThreadShell:({locked,onStop}:{locked:boolean;onStop:()=>void})=><button type="button" data-locked={locked} onClick={onStop}>Stop test reply</button>}))
vi.mock('../tracker/planning-tracker',()=>({PlanningTracker:()=>null}))

import { GenerativeChat } from './runtime-provider'

const user: UIMessage={id:'user-one',role:'user',parts:[{type:'text',text:'Add Paris to Prague'}]}
const toolResponse: UIMessage={id:'assistant-one',role:'assistant',parts:[{type:'step-start'},{type:'tool-edit_artifact',toolCallId:'edit-one',state:'input-available',input:{}}]}
const finalResponse: UIMessage={id:'assistant-one',role:'assistant',parts:[...toolResponse.parts,{type:'step-start'},{type:'text',text:'Done',state:'done'}]}

function fixture(){
  harness.messages=[user,toolResponse]
  let token:number|undefined=7
  let aborted=false
  const release=vi.fn((candidate:number)=>{if(candidate===token)token=undefined})
  const gate={
    beginTurn:vi.fn(),markTurnRunning:vi.fn(),abortTurn:vi.fn(()=>{aborted=true}),releaseTurn:release,
    currentTurnToken:(owner:string)=>owner==='user-one'?token:undefined,
    isTurnLocked:()=>token!==undefined,isTurnCurrent:(candidate:number)=>candidate===token&&!aborted,
    subscribeTurn:()=>()=>{},turnSignal:()=>new AbortController().signal,
  } as unknown as ReplyTurnGate
  const scene={finishTurn:vi.fn(),prepareTurn:vi.fn(),exportSnapshots:vi.fn(),activeArtifactIds:vi.fn(),bindings:vi.fn(),view:vi.fn(),subscribe:vi.fn()} as unknown as SceneLifecycle
  const state=createUIStateStore(),bridge=createFareDataBridge(),onMessages=vi.fn(async()=>{})
  render(<GenerativeChat services={{state,bridge,activeId:()=>undefined,activate:()=>{}}} turnGate={gate} onRunSettled={release} planning={createPlanningStore()} sceneLifecycle={scene} displayStore={createDisplayContextStore()} capture={async()=>({}) as never} sceneToolkit={{}} onMessages={onMessages}/>)
  const callbacks=()=>harness.options as {onFinish:(value:{messages:UIMessage[];isAbort:boolean;isDisconnect:boolean;isError:boolean;finishReason?:string})=>Promise<void>;sendAutomaticallyWhen:(value:{messages:UIMessage[]})=>boolean}
  return{callbacks,gate,scene,release,onMessages,get token(){return token}}
}

beforeEach(()=>{harness.options=undefined;harness.cancelRun.mockReset()})

describe('logical reply settlement',()=>{
  it('reuses the owned lease for the next capture and keeps the agent revision authoritative',async()=>{
    const state=createUIStateStore(),artifactId=ArtifactIdSchema.parse('continuation-owned-artifact')
    state.initializeMissing(artifactId,{citySequence:['london','paris']})
    const gate=createActionRouter(state),first=gate.beginTurn('user-one')
    await first.ready
    expect(gate.markTurnRunning(first.token)).toBe(true)
    const scene={finishTurn:vi.fn(),prepareTurn:vi.fn(),exportSnapshots:vi.fn(),activeArtifactIds:vi.fn(),bindings:vi.fn(),view:vi.fn(),subscribe:vi.fn()} as unknown as SceneLifecycle
    render(<GenerativeChat services={{state,bridge:createFareDataBridge(),activeId:()=>artifactId,activate:()=>{}}} agentDispatch={gate.dispatchAgent} turnGate={gate} onRunSettled={gate.releaseTurn} planning={createPlanningStore()} sceneLifecycle={scene} displayStore={createDisplayContextStore()} capture={async()=>({}) as never} sceneToolkit={{}} onMessages={async()=>{}}/>)
    const callbacks=harness.options as {onFinish:(value:{messages:UIMessage[];isAbort:boolean;isDisconnect:boolean;isError:boolean;finishReason?:string})=>Promise<void>}

    await act(()=>callbacks.onFinish({messages:[user,toolResponse],isAbort:false,isDisconnect:false,isError:false,finishReason:'tool-calls'}))
    const continuation=gate.beginTurn('user-one')
    expect(continuation.token).toBe(first.token)
    expect(continuation.signal).toBe(first.signal)
    expect(continuation.signal.aborted).toBe(false)
    const expectedRevision=state.get(artifactId).revision
    expect(gate.dispatchAgent({kind:'route',artifactId,citySequence:['london','paris','prague'],expectedRevision})).toEqual({status:'applied',revision:expectedRevision+1})
    expect(state.get(artifactId).citySequence).toEqual(['london','paris','prague'])

    await act(()=>callbacks.onFinish({messages:[user,finalResponse],isAbort:false,isDisconnect:false,isError:false,finishReason:'stop'}))
    expect(scene.finishTurn).toHaveBeenCalledOnce()
    expect(gate.isTurnLocked()).toBe(false)
    expect(state.get(artifactId).citySequence).toEqual(['london','paris','prague'])
    gate.dispose()
  })

  it('keeps the same owned turn through a frontend tool response and settles only on the final stop response',async()=>{
    const run=fixture()
    await act(()=>run.callbacks().onFinish({messages:[user,toolResponse],isAbort:false,isDisconnect:false,isError:false,finishReason:'tool-calls'}))
    expect(run.scene.finishTurn).not.toHaveBeenCalled()
    expect(run.release).not.toHaveBeenCalled()
    expect(run.token).toBe(7)
    expect(run.callbacks().sendAutomaticallyWhen({messages:[user,{...toolResponse,parts:[{...toolResponse.parts[1],state:'output-available',output:{status:'stale',revision:12}} as never]}]})).toBe(true)

    await act(()=>run.callbacks().onFinish({messages:[user,finalResponse],isAbort:false,isDisconnect:false,isError:false,finishReason:'stop'}))
    expect(run.scene.finishTurn).toHaveBeenCalledOnce()
    expect(run.scene.finishTurn).toHaveBeenCalledWith([user,finalResponse],{failed:false,willContinue:false})
    expect(run.release).toHaveBeenCalledWith(7)
    expect(run.token).toBeUndefined()
  })

  it('ignores a late response owned by an earlier user message',async()=>{
    const run=fixture(),oldUser={...user,id:'user-old'}
    await act(()=>run.callbacks().onFinish({messages:[oldUser,finalResponse],isAbort:false,isDisconnect:false,isError:false,finishReason:'stop'}))
    expect(run.onMessages).not.toHaveBeenCalled()
    expect(run.scene.finishTurn).not.toHaveBeenCalled()
    expect(run.release).not.toHaveBeenCalled()
    expect(run.token).toBe(7)
  })

  it('settles Stop while the provider is idle between a tool response and its continuation',async()=>{
    const run=fixture()
    fireEvent.click(screen.getByRole('button',{name:'Stop test reply'}))
    await act(async()=>{})
    expect(run.gate.abortTurn).toHaveBeenCalledOnce()
    expect(harness.cancelRun).toHaveBeenCalledOnce()
    expect(run.scene.finishTurn).toHaveBeenCalledWith([user,toolResponse],{failed:true,willContinue:false})
    expect(run.release).toHaveBeenCalledWith(7)
    expect(run.token).toBeUndefined()
    expect(run.callbacks().sendAutomaticallyWhen({messages:[user,toolResponse]})).toBe(false)
  })
})
