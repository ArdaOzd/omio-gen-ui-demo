import { createContext, useContext, useRef, useSyncExternalStore, type ReactNode } from 'react'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { ArtifactIdSchema, ArtifactUIStateSchema, LIMITS, UIStateRevisionSchema, type ArtifactId, type ArtifactUIState, type FareId, type FareScopeBinding, type UIStateStore } from '../contracts'
import { TravelProvider, type TravelServices } from '../catalog/context'
import { createUIStateStore } from '../state/ui-state-store'
import { createRuntimePresentValidationScopeForTree } from './present-scope'
import { validatePresentTree, type PresentNode } from './tree'
import { DisplayContextProvider } from '../catalog/display-context-provider'
import { createDisplayContextStore, type DisplayContextStore } from '../state/display-context'

export const SceneSnapshotSchema=z.strictObject({
  toolCallId:z.string().min(1).max(160),
  artifactStates:z.array(ArtifactUIStateSchema).min(1).max(LIMITS.storedArtifacts),
})
export type PersistedSceneSnapshot=z.infer<typeof SceneSnapshotSchema>
type SceneView={kind:'active'}|{kind:'frozen';services:TravelServices}|{kind:'hidden'}
type PendingTurn={previousToolCallId:string;states:ArtifactUIState[];activeArtifactId?:string}
const fallbackActiveView:SceneView={kind:'active'}
const fallbackSubscribe=()=>()=>{}

function artifactIds(tree:PresentNode):ArtifactId[]{
  const ids=new Set<ArtifactId>()
  const visit=(node:PresentNode):void=>{
    ids.add(ArtifactIdSchema.parse(node.artifactRef))
    if(Array.isArray(node.children))node.children.forEach(visit)
    else if(node.children&&typeof node.children!=='string')visit(node.children)
  }
  visit(tree)
  return [...ids]
}

function acceptedScenes(messages:UIMessage[],services:TravelServices):Array<{toolCallId:string;tree:PresentNode}>{
  const scenes:Array<{toolCallId:string;tree:PresentNode}>=[]
  for(const message of messages)for(const part of message.parts){
    if(part.type!=='tool-present'||part.state!=='output-available'||!part.input)continue
    try{
      const candidate=validatePresentTree(part.input)
      const tree=validatePresentTree(part.input,createRuntimePresentValidationScopeForTree(candidate,services))
      scenes.push({toolCallId:part.toolCallId,tree})
    }catch{}
  }
  return scenes
}
function latestCompletedPresentId(messages:UIMessage[]):string|undefined{
  let latest:string|undefined
  for(const message of messages)for(const part of message.parts)if(part.type==='tool-present'&&part.state==='output-available')latest=part.toolCallId
  return latest
}

function frozenServices(snapshot:PersistedSceneSnapshot,live:TravelServices):TravelServices{
  const mutable=createUIStateStore()
  for(const state of snapshot.artifactStates)mutable.initializeMissing(state.artifactId,state)
  const readonly: UIStateStore={
    get:mutable.get,
    initializeMissing:()=>{},
    dispatch:command=>({status:'stale',revision:mutable.get(command.artifactId).revision}),
    subscribe:mutable.subscribe,
    exportSnapshot:mutable.exportSnapshot,
    getIds:mutable.getIds,
    setDatasetBindings:()=>{},
  }
  return{
    bridge:live.bridge,
    state:readonly,
    activeId:()=>snapshot.artifactStates[0]?.artifactId,
    artifactIds:()=>snapshot.artifactStates.map(state=>state.artifactId),
    activate:()=>{},
  }
}

export type SceneLifecycle={
  prepareTurn:(messages:UIMessage[])=>Promise<void>
  finishTurn:(messages:UIMessage[],result:{failed:boolean;willContinue:boolean})=>void
  exportSnapshots:()=>PersistedSceneSnapshot[]
  activeArtifactIds:(messages:UIMessage[])=>ArtifactId[]
  bindings:()=>FareScopeBinding[]
  view:(toolCallId:string)=>SceneView
  subscribe:(listener:()=>void)=>()=>void
}

export function createSceneLifecycle(services:TravelServices,options:{initialMessages?:UIMessage[];initialSnapshots?:PersistedSceneSnapshot[];restoreSelectedFareIds?:(artifactId:ArtifactId,capturedIds:FareId[])=>FareId[]}={}):SceneLifecycle{
  const snapshots=new Map<string,{value:PersistedSceneSnapshot;services:TravelServices}>()
  for(const input of options.initialSnapshots??[]){
    const value=SceneSnapshotSchema.parse(input)
    snapshots.set(value.toolCallId,{value,services:frozenServices(value,services)})
  }
  let activeToolCallId=acceptedScenes(options.initialMessages??[],services).at(-1)?.toolCallId
  let latestCompletedToolCallId=latestCompletedPresentId(options.initialMessages??[])
  let pending:PendingTurn|undefined
  const listeners=new Set<()=>void>()
  const activeView={kind:'active'} as const,hiddenView={kind:'hidden'} as const
  const frozenViews=new Map<string,Extract<SceneView,{kind:'frozen'}>>()
  for(const [toolCallId,snapshot] of snapshots)frozenViews.set(toolCallId,{kind:'frozen',services:snapshot.services})
  const notify=()=>listeners.forEach(listener=>listener())
  const restore=()=>{
    if(!pending)return
    if(!services.state.replace)throw new Error('Scene rollback requires a replaceable UI state store')
    for(const state of pending.states){
      const stillLive=new Set(services.state.get(state.artifactId).datasetRefs)
      services.state.replace({...state,revision:UIStateRevisionSchema.parse(Math.max(state.revision,services.state.get(state.artifactId).revision)+1),selectedFareIds:options.restoreSelectedFareIds?.(state.artifactId,state.selectedFareIds)??state.selectedFareIds})
      for(const datasetId of state.datasetRefs)if(stillLive.has(datasetId)){
        const binding=services.bridge.findBinding(datasetId)
        if(binding)services.bridge.release(binding.resourceKey)
      }
    }
    if(pending.activeArtifactId)services.activate(pending.activeArtifactId)
    activeToolCallId=pending.previousToolCallId
    snapshots.delete(pending.previousToolCallId)
    frozenViews.delete(pending.previousToolCallId)
    pending=undefined
    notify()
  }
  return{
    async prepareTurn(messages){
      const latest=acceptedScenes(messages,services).at(-1)
      if(latest&&!activeToolCallId)activeToolCallId=latest.toolCallId
      if(!activeToolCallId||pending)return
      const active=acceptedScenes(messages,services).find(scene=>scene.toolCallId===activeToolCallId)
      if(!active)return
      const states=artifactIds(active.tree).map(id=>services.state.get(id))
      for(const state of states)for(const datasetId of state.datasetRefs){
        const binding=services.bridge.findBinding(datasetId)
        if(binding)await services.bridge.loadScope(binding.manifest.coverage,new AbortController().signal)
      }
      const value=SceneSnapshotSchema.parse({toolCallId:activeToolCallId,artifactStates:states})
      snapshots.set(activeToolCallId,{value,services:frozenServices(value,services)})
      frozenViews.set(activeToolCallId,{kind:'frozen',services:snapshots.get(activeToolCallId)!.services})
      pending={previousToolCallId:activeToolCallId,states:structuredClone(states),activeArtifactId:services.activeId()}
      notify()
    },
    finishTurn(messages,result){
      if(result.willContinue)return
      latestCompletedToolCallId=latestCompletedPresentId(messages)
      if(!pending)return
      const latest=acceptedScenes(messages,services).at(-1)
      if(result.failed||!latest||latest.toolCallId===pending.previousToolCallId){restore();return}
      activeToolCallId=latest.toolCallId
      pending=undefined
      notify()
    },
    exportSnapshots:()=>[...snapshots.values()].map(snapshot=>structuredClone(snapshot.value)),
    activeArtifactIds(messages){
      const latest=acceptedScenes(messages,services).find(scene=>scene.toolCallId===activeToolCallId)??acceptedScenes(messages,services).at(-1)
      return latest?artifactIds(latest.tree):[]
    },
    bindings(){
      const ids=new Set([...snapshots.values()].flatMap(snapshot=>snapshot.value.artifactStates.flatMap(state=>state.datasetRefs)))
      return [...ids].flatMap(datasetId=>{const binding=services.bridge.findBinding(datasetId);return binding?[structuredClone(binding)]:[]})
    },
    view(toolCallId){
      if(toolCallId===activeToolCallId&&!pending)return activeView
      if(!activeToolCallId&&toolCallId===latestCompletedToolCallId)return activeView
      return frozenViews.get(toolCallId)??hiddenView
    },
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)},
  }
}

const SceneLifecycleContext=createContext<SceneLifecycle|null>(null)
export function SceneLifecycleProvider({value,children}:{value:SceneLifecycle;children:ReactNode}){
  return <SceneLifecycleContext.Provider value={value}>{children}</SceneLifecycleContext.Provider>
}
export function useSceneView(toolCallId:string):SceneView{
  const lifecycle=useContext(SceneLifecycleContext)
  return useSyncExternalStore(lifecycle?.subscribe??fallbackSubscribe,()=>lifecycle?.view(toolCallId)??fallbackActiveView,()=>lifecycle?.view(toolCallId)??fallbackActiveView)
}
export function FrozenScene({services,children}:{services:TravelServices;children:ReactNode}){
  const displayStore=useRef<DisplayContextStore|undefined>(undefined)
  if(!displayStore.current)displayStore.current=createDisplayContextStore()
  return <DisplayContextProvider store={displayStore.current}><TravelProvider services={services}><fieldset disabled inert aria-label="Previous travel view" className="travel-frozen-scene" style={{border:0,margin:0,minWidth:0,padding:0,pointerEvents:'none'}}>{children}</fieldset></TravelProvider></DisplayContextProvider>
}
