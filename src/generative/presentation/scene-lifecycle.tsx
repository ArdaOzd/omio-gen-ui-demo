import { createContext, useContext, useRef, useSyncExternalStore, type ReactNode } from 'react'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { ArtifactIdSchema, ArtifactUIStateSchema, LIMITS, UIStateRevisionSchema, type ArtifactId, type ArtifactUIState, type DatasetId, type FareId, type FareScopeBinding, type UIStateStore } from '../contracts'
import type { ResourceKey } from '../contracts/query-groups'
import { TravelProvider, type TravelServices } from '../catalog/context'
import { createUIStateStore } from '../state/ui-state-store'
import { createRuntimePresentValidationScopeForTree } from './present-scope'
import { validatePresentTree, type PresentNode } from './tree'
import { DisplayContextProvider } from '../catalog/display-context-provider'
import { createDisplayContextStore, type DisplayContextStore } from '../state/display-context'
import { releaseDatasetWhenUnowned } from '../state/dataset-ownership'

export const SceneSnapshotSchema=z.strictObject({
  toolCallId:z.string().min(1).max(160),
  artifactStates:z.array(ArtifactUIStateSchema).min(1).max(LIMITS.storedArtifacts),
})
export type PersistedSceneSnapshot=z.infer<typeof SceneSnapshotSchema>
type SceneView={kind:'active'}|{kind:'frozen';services:TravelServices}|{kind:'hidden'}
type PendingTurn={previousToolCallId:string;states:ArtifactUIState[];activeArtifactId?:string}
type SnapshotPin={datasetId:DatasetId;resourceKey:ResourceKey}
type StoredSceneSnapshot={value:PersistedSceneSnapshot;services:TravelServices;pins:SnapshotPin[]}
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
    replace:()=>{},
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
  exportSnapshots:(messages?:UIMessage[])=>PersistedSceneSnapshot[]
  activeArtifactIds:(messages:UIMessage[])=>ArtifactId[]
  bindings:()=>FareScopeBinding[]
  view:(toolCallId:string)=>SceneView
  subscribe:(listener:()=>void)=>()=>void
}

export function createSceneLifecycle(services:TravelServices,options:{initialMessages?:UIMessage[];initialSnapshots?:PersistedSceneSnapshot[];restoreSelectedFareIds?:(artifactId:ArtifactId,capturedIds:FareId[])=>FareId[]}={}):SceneLifecycle{
  const snapshots=new Map<string,StoredSceneSnapshot>()
  for(const input of options.initialSnapshots??[]){
    const value=SceneSnapshotSchema.parse(input)
    snapshots.set(value.toolCallId,{value,services:frozenServices(value,services),pins:[]})
  }
  let activeToolCallId=acceptedScenes(options.initialMessages??[],services).at(-1)?.toolCallId
  let latestCompletedToolCallId=latestCompletedPresentId(options.initialMessages??[])
  let pending:PendingTurn|undefined
  const listeners=new Set<()=>void>()
  const activeView={kind:'active'} as const,hiddenView={kind:'hidden'} as const
  const frozenViews=new Map<string,Extract<SceneView,{kind:'frozen'}>>()
  for(const [toolCallId,snapshot] of snapshots)frozenViews.set(toolCallId,{kind:'frozen',services:snapshot.services})
  const notify=()=>listeners.forEach(listener=>listener())
  const releaseSnapshot=(toolCallId:string):boolean=>{
    const snapshot=snapshots.get(toolCallId)
    if(!snapshot)return false
    for(const pin of snapshot.pins)services.bridge.release(pin.resourceKey)
    snapshots.delete(toolCallId)
    frozenViews.delete(toolCallId)
    return true
  }
  const restoreSnapshot=(toolCallId:string,states:ArtifactUIState[],activeArtifactId?:string):void=>{
    const record=snapshots.get(toolCallId)
    const remainingPins=[...(record?.pins??[])]
    for(const state of states){
      const current=services.state.get(state.artifactId)
      const currentRefs=new Set(current.datasetRefs),snapshotRefs=new Set(state.datasetRefs)
      services.state.replace({...state,revision:UIStateRevisionSchema.parse(Math.max(state.revision,current.revision)+1),selectedFareIds:options.restoreSelectedFareIds?.(state.artifactId,state.selectedFareIds)??state.selectedFareIds})
      for(const datasetId of currentRefs)if(!snapshotRefs.has(datasetId))releaseDatasetWhenUnowned(services.state,services.bridge,state.artifactId,datasetId)
      for(const datasetId of snapshotRefs){
        const pinIndex=remainingPins.findIndex(pin=>pin.datasetId===datasetId)
        if(pinIndex<0)continue
        const [pin]=remainingPins.splice(pinIndex,1)
        if(currentRefs.has(datasetId)&&pin)services.bridge.release(pin.resourceKey)
      }
    }
    for(const pin of remainingPins)services.bridge.release(pin.resourceKey)
    snapshots.delete(toolCallId)
    frozenViews.delete(toolCallId)
    const nextActiveId=activeArtifactId??states[0]?.artifactId
    if(nextActiveId)services.activate(nextActiveId)
    activeToolCallId=toolCallId
  }
  const reconcile=(messages:UIMessage[]):Array<{toolCallId:string;tree:PresentNode}>=>{
    const scenes=acceptedScenes(messages,services),retainedIds=new Set(scenes.map(scene=>scene.toolCallId))
    for(const toolCallId of snapshots.keys())if(!retainedIds.has(toolCallId))releaseSnapshot(toolCallId)
    const active=activeToolCallId?scenes.find(scene=>scene.toolCallId===activeToolCallId):undefined
    if(active){
      const snapshot=snapshots.get(active.toolCallId)
      if(snapshot)restoreSnapshot(active.toolCallId,snapshot.value.artifactStates,artifactIds(active.tree)[0])
      return scenes
    }
    const fallback=scenes.at(-1)
    if(!fallback){activeToolCallId=undefined;return scenes}
    const snapshot=snapshots.get(fallback.toolCallId)
    if(snapshot)restoreSnapshot(fallback.toolCallId,snapshot.value.artifactStates,artifactIds(fallback.tree)[0])
    else{
      activeToolCallId=fallback.toolCallId
      const artifactId=artifactIds(fallback.tree)[0]
      if(artifactId)services.activate(artifactId)
    }
    return scenes
  }
  const restore=()=>{
    if(!pending)return
    const previous=pending
    restoreSnapshot(previous.previousToolCallId,previous.states,previous.activeArtifactId)
    pending=undefined
  }
  return{
    async prepareTurn(messages){
      const scenes=reconcile(messages),latest=scenes.at(-1)
      if(latest&&!activeToolCallId)activeToolCallId=latest.toolCallId
      if(!activeToolCallId||pending)return
      const active=scenes.find(scene=>scene.toolCallId===activeToolCallId)
      if(!active)return
      const states=structuredClone(artifactIds(active.tree).map(id=>services.state.get(id)))
      const value=SceneSnapshotSchema.parse({toolCallId:activeToolCallId,artifactStates:states})
      const snapshot:StoredSceneSnapshot={value,services:frozenServices(value,services),pins:[]}
      snapshots.set(activeToolCallId,snapshot)
      frozenViews.set(activeToolCallId,{kind:'frozen',services:snapshot.services})
      pending={previousToolCallId:activeToolCallId,states,activeArtifactId:services.activeId()}
      notify()
      try{
        for(const state of states)for(const datasetId of state.datasetRefs){
          const binding=services.bridge.findBinding(datasetId)
          if(!binding)continue
          const manifest=await services.bridge.loadScope(binding.manifest.coverage,new AbortController().signal)
          snapshot.pins.push({datasetId,resourceKey:manifest.resourceKey})
        }
      }catch(error){
        if(pending?.previousToolCallId===active.toolCallId&&snapshots.get(active.toolCallId)===snapshot){
          releaseSnapshot(active.toolCallId)
          pending=undefined
          activeToolCallId=active.toolCallId
          notify()
        }
        throw error
      }
    },
    finishTurn(messages,result){
      if(result.willContinue)return
      latestCompletedToolCallId=latestCompletedPresentId(messages)
      if(!pending){reconcile(messages);notify();return}
      const latest=acceptedScenes(messages,services).at(-1)
      if(result.failed||!latest||latest.toolCallId===pending.previousToolCallId){restore();reconcile(messages);notify();return}
      activeToolCallId=latest.toolCallId
      pending=undefined
      reconcile(messages)
      notify()
    },
    exportSnapshots(messages){
      if(messages){
        const retainedIds=new Set(acceptedScenes(messages,services).map(scene=>scene.toolCallId))
        for(const toolCallId of snapshots.keys())if(!retainedIds.has(toolCallId))releaseSnapshot(toolCallId)
      }
      return [...snapshots.values()].map(snapshot=>structuredClone(snapshot.value))
    },
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
