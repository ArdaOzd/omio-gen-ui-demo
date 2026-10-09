import type { UIMessage } from 'ai'
import { describe,expect,it,vi } from 'vitest'
import { ArtifactIdSchema,FareIdSchema } from '../contracts'
import { createUIStateStore } from '../state/ui-state-store'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import type { TravelServices } from '../catalog/context'
import { createSceneLifecycle } from './scene-lifecycle'
import { captureAgentContext } from '../state/snapshot-exporter'
import { createDisplayContextStore } from '../state/display-context'

const present=(id:string,artifactRef:string,title:string):UIMessage=>({
  id:`message-${id}`,
  role:'assistant',
  parts:[{type:'tool-present',toolCallId:id,state:'output-available',input:{$type:'TravelSurface',artifactRef,title},output:{}}],
})

function fixture(){
  const first=ArtifactIdSchema.parse('artifact-first'),second=ArtifactIdSchema.parse('artifact-second')
  const state=createUIStateStore({now:()=> '2026-11-08T00:00:00.000Z'})
  state.initializeMissing(first,{citySequence:['london','paris'],dates:{start:'2026-11-08'}})
  state.initializeMissing(second,{citySequence:['madrid','paris'],dates:{start:'2026-11-08'}})
  let active:string|undefined=first
  const activate=vi.fn((id:string)=>{active=id})
  const services:TravelServices={state,bridge:createFixedProjectionFixture({rows:[],sourceVersion:'scene-lifecycle-v1'}).bridge,activeId:()=>active,activate}
  return{first,second,state,services,activate}
}

describe('scene lifecycle',()=>{
  it('freezes the previous scene before live artifact edits and activates the accepted replacement',async()=>{
    const value=fixture(),firstMessage=present('first-scene',value.first,'London to Paris')
    const lifecycle=createSceneLifecycle(value.services,{initialMessages:[firstMessage]})

    await lifecycle.prepareTurn([firstMessage,{id:'next-user',role:'user',parts:[{type:'text',text:'Show Madrid instead'}]}])
    const before=value.state.get(value.first)
    value.state.dispatch({kind:'route',artifactId:value.first,citySequence:['madrid','paris'],expectedRevision:before.revision})
    const secondMessage=present('second-scene',value.second,'Madrid to Paris')
    lifecycle.finishTurn([firstMessage,secondMessage],{failed:false,willContinue:false})

    const previous=lifecycle.view('first-scene')
    expect(previous.kind).toBe('frozen')
    if(previous.kind!=='frozen')throw new Error('Expected a frozen scene')
    expect(previous.services.state.get(value.first).citySequence).toEqual(['london','paris'])
    expect(previous.services.state.dispatch({kind:'route',artifactId:value.first,citySequence:['rome','paris']})).toEqual({status:'stale',revision:0})
    expect(lifecycle.view('second-scene')).toEqual({kind:'active'})
    expect(lifecycle.activeArtifactIds([firstMessage,secondMessage])).toEqual([value.second])
  })

  it('restores and reactivates the prior scene when replacement fails',async()=>{
    const value=fixture(),firstMessage=present('first-scene',value.first,'London to Paris')
    const lifecycle=createSceneLifecycle(value.services,{initialMessages:[firstMessage]})
    await lifecycle.prepareTurn([firstMessage])
    const before=value.state.get(value.first)
    value.state.dispatch({kind:'route',artifactId:value.first,citySequence:['madrid','paris'],expectedRevision:before.revision})

    lifecycle.finishTurn([firstMessage],{failed:true,willContinue:false})

    expect(value.state.get(value.first)).toEqual({...before,revision:2})
    expect(lifecycle.view('first-scene')).toEqual({kind:'active'})
    expect(value.activate).toHaveBeenLastCalledWith(value.first)
    expect(lifecycle.exportSnapshots()).toEqual([])
  })

  it('keeps host tracker removals authoritative when rolling back a failed replacement',async()=>{
    const value=fixture(),fareId=FareIdSchema.parse('selected-fare'),firstMessage=present('first-scene',value.first,'London to Paris')
    value.state.replace?.({...value.state.get(value.first),selectedFareIds:[fareId]})
    const lifecycle=createSceneLifecycle(value.services,{initialMessages:[firstMessage],restoreSelectedFareIds:()=>[]})
    await lifecycle.prepareTurn([firstMessage])

    lifecycle.finishTurn([firstMessage],{failed:true,willContinue:false})

    expect(value.state.get(value.first).selectedFareIds).toEqual([])
  })

  it('restores persisted frozen scenes without making them active',()=>{
    const value=fixture(),firstMessage=present('first-scene',value.first,'London to Paris'),secondMessage=present('second-scene',value.second,'Madrid to Paris')
    const lifecycle=createSceneLifecycle(value.services,{initialMessages:[firstMessage,secondMessage],initialSnapshots:[{toolCallId:'first-scene',artifactStates:[value.state.get(value.first)]}]})

    expect(lifecycle.view('first-scene').kind).toBe('frozen')
    expect(lifecycle.view('second-scene')).toEqual({kind:'active'})
    expect(lifecycle.exportSnapshots()).toEqual([{toolCallId:'first-scene',artifactStates:[value.state.get(value.first)]}])
  })

  it('exports only the latest scene artifacts and resources to the next turn',async()=>{
    const value=fixture(),fixed=createFixedProjectionFixture({rows:[],sourceVersion:'scene-context-v1'})
    const load=async(originId:string)=>{
      const manifest=await fixed.bridge.loadScope(fixed.scope({originId,destinationId:'paris',dateWindow:{from:'2026-11-08',to:'2026-11-08'},passengers:1,earliestDeparture:{date:'2026-11-08',minutes:0}}),new AbortController().signal)
      return fixed.bridge.getBinding(manifest.resourceKey)
    }
    const oldBinding=await load('london'),activeBinding=await load('madrid')
    value.state.replace?.({...value.state.get(value.first),datasetRefs:[oldBinding.datasetId]})
    value.state.replace?.({...value.state.get(value.second),datasetRefs:[activeBinding.datasetId]})
    const services:TravelServices={...value.services,bridge:fixed.bridge},firstMessage=present('first-scene',value.first,'London'),secondMessage=present('second-scene',value.second,'Madrid')
    const lifecycle=createSceneLifecycle(services,{initialMessages:[firstMessage,secondMessage],initialSnapshots:[{toolCallId:'first-scene',artifactStates:[value.state.get(value.first)]}]})
    const ids=lifecycle.activeArtifactIds([firstMessage,secondMessage])

    const context=captureAgentContext({turnId:'next-turn',activeArtifactId:ids[0],artifactIds:ids,store:value.state,bridge:fixed.bridge,displayStore:createDisplayContextStore()})

    expect(context.artifacts.map(artifact=>artifact.artifactId)).toEqual([value.second])
    expect(context.datasets.map(dataset=>dataset.datasetId)).toEqual([activeBinding.datasetId])
    expect(JSON.stringify(context)).not.toContain(oldBinding.datasetId)
  })
})
