import type { UIMessage } from 'ai'
import type { ToolCallMessagePartProps } from '@assistant-ui/react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { GenerativeChat } from '../../chat/runtime-provider'
import { CatalogNode } from '../../catalog/component'
import { createUIStateStore } from '../../state/ui-state-store'
import { ArtifactIdSchema,CATALOG_VERSION,CONTRACT_VERSION } from '../../contracts'
import { resolvePlannerDatasetRef } from '../../catalog/trip-planning/binding'
import { createThreadPersistence,type PersistedThread,type ThreadStorage } from '../../state/persistence'
import { createFixedProjectionFixture } from '../../testing/fixed-projection-fixture'
import { createDisplayContextStore } from '../../state/display-context'
vi.mock('./toolkit',async()=>{const {z}=await import('zod');return{default:{present:{type:'frontend',parameters:z.record(z.string(),z.unknown()),execute:async()=>({}),render:(props:ToolCallMessagePartProps<Record<string,unknown>,Record<string,never>>)=><CatalogNode kind="TravelSurface" artifactRef={String(props.args.artifactRef)} title={String(props.args.title)} __displayComponent={{componentRef:{value:`${String(props.args.artifactRef)}:${props.toolCallId}:root`,keySource:'tree-path'},childRefs:[]}}/>}}}})
afterEach(()=>{cleanup();vi.unstubAllGlobals();Reflect.deleteProperty(HTMLElement.prototype,'scrollTo')})
const accepted=(id:string,artifactRef:string,title:string):UIMessage['parts'][number]=>({type:'tool-present',toolCallId:id,state:'output-available',input:{$type:'TravelSurface',artifactRef,title},output:{}})
const emptyContext=()=>({schemaVersion:CONTRACT_VERSION as '2.0.0',turnId:'test',artifacts:[],olderArtifactSummaries:[],datasets:[],plannedFareIds:[],selectedFareFacts:[],displayContext:createDisplayContextStore().capture({captureId:'test',artifactIds:[]})})
function mount(parts:UIMessage['parts'],earlier:UIMessage[]=[]){
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}})
 vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const state=createUIStateStore();for(const id of ['art-1','art-2'])state.initializeMissing(ArtifactIdSchema.parse(id),{})
 const bridge=createFixedProjectionFixture({rows:[],sourceVersion:'present-empty-v1'}).bridge
 render(<GenerativeChat services={{state,bridge,activeId:()=>'art-1',activate:()=>{}}} capture={emptyContext} initialMessages={[...earlier,{id:'assistant-final',role:'assistant',parts}]}/> )
}
it('shows only the latest accepted native present for one artifact in the same assistant message',()=>{
 mount([accepted('first','art-1','First scene'),accepted('replacement','art-1','Replacement scene')])
 expect(screen.queryByText('First scene')).toBeNull();expect(screen.getByText('Replacement scene')).toBeVisible()
 expect(document.querySelectorAll('.travel-travelsurface')).toHaveLength(1)
})
it('retains the last usable native scene while the replacement is pending or failed',()=>{
 mount([accepted('first','art-1','Usable scene'),{type:'tool-present',toolCallId:'failed',state:'output-error',input:{},errorText:'Invalid generated tree'}])
 expect(screen.getByText('Usable scene')).toBeVisible()
})
it('does not render a rejected partial scene as a view failure while repair continues',()=>{
 mount([{type:'tool-present',toolCallId:'failed',state:'output-error',input:{$type:'TravelSurface',artifactRef:'art-1',children:[{$type:'FareCalendar',artifactRef:'art-1',datasetRef:'expired',legIndex:0}]},errorText:'Invalid generated tree'}])
 expect(screen.queryByText('This view could not be displayed. Retry with the current travel state.')).toBeNull()
})
it('keeps the usable native scene when a later input is still streaming',()=>{
 mount([accepted('first','art-1','Usable scene'),{type:'tool-present',toolCallId:'pending',state:'input-streaming',input:{$type:'TravelSurface',artifactRef:'art-1',title:'Pending scene'}}])
 expect(screen.getByText('Usable scene')).toBeVisible()
})
it('does not supersede a usable scene with an invalid legacy completed tree',()=>{
 mount([accepted('first','art-1','Usable scene'),{type:'tool-present',toolCallId:'invalid',state:'output-available',input:{$type:'UnknownComponent',artifactRef:'art-1'},output:{}}])
 expect(screen.getByText('Usable scene')).toBeVisible()
})
it('retains distinct artifacts and scenes before a later user turn',()=>{
 const earlier:UIMessage[]=[{id:'earlier',role:'assistant',parts:[accepted('earlier','art-1','Earlier turn')]},{id:'new-user',role:'user',parts:[{type:'text',text:'Create another view.'}]}]
 mount([accepted('first','art-1','Current artifact'),accepted('other','art-2','Other artifact')],earlier)
 for(const title of ['Earlier turn','Current artifact','Other artifact'])expect(screen.getByText(title)).toBeVisible()
 expect(document.querySelectorAll('.travel-travelsurface')).toHaveLength(3)
})

it('captures authored multi-leg bindings without a render revision and restores them after replacement',async()=>{
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}})
 vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const fixed=createFixedProjectionFixture({rows:[],sourceVersion:'binding-persistence-v1'}),bridge=fixed.bridge,state=createUIStateStore(),artifactRef=ArtifactIdSchema.parse('art-1')
 const request=(originId:string,destinationId:string,from:string,to:string)=>fixed.scope({originId,destinationId,dateWindow:{from,to},passengers:1,earliestDeparture:{date:from,minutes:0}})
 const load=async(originId:string,destinationId:string,from:string,to:string)=>{const manifest=await bridge.loadScope(request(originId,destinationId,from,to),new AbortController().signal);return bridge.getBinding(manifest.resourceKey)}
 const firstSeed=await load('london','paris','2026-10-09','2026-10-10')
 const secondSeed=await load('paris','rome','2026-10-11','2026-10-12')
 state.initializeMissing(artifactRef,{datasetRefs:[firstSeed.datasetId,secondSeed.datasetId],citySequence:['london','paris','rome'],dates:{start:'2026-10-09',end:'2026-10-12'},stays:[{cityId:'paris',nights:2}]})
 const before=state.get(artifactRef)
 const tree={$type:'TravelSurface',artifactRef,children:[{$type:'FareCards',artifactRef,datasetRef:firstSeed.datasetId,legIndex:0},{$type:'PriceCalendar',artifactRef,datasetRef:secondSeed.datasetId,legIndex:1}]}
 const part={type:'tool-present' as const,toolCallId:'bound-scene',state:'output-available' as const,input:tree,output:{}}
 render(<GenerativeChat services={{state,bridge,activeId:()=>artifactRef,activate:()=>{}}} capture={emptyContext} initialMessages={[{id:'assistant-bound',role:'assistant',parts:[part]}]}/> )
 expect(state.get(artifactRef)).toEqual(before)

 const firstCurrent=await load('london','paris','2026-10-13','2026-10-14')
 const secondCurrent=await load('paris','rome','2026-10-15','2026-10-16')
 state.dispatch({kind:'datasets',artifactId:artifactRef,datasetRefs:[firstCurrent.datasetId,secondCurrent.datasetId]})
 expect(state.get(artifactRef).datasetBindings).toEqual({[firstSeed.datasetId]:'london:paris',[secondSeed.datasetId]:'paris:rome'})
 bridge.release(firstSeed.resourceKey);bridge.release(secondSeed.resourceKey)
 state.dispatch({kind:'sort',artifactId:artifactRef,sort:{field:'durationMinutes',direction:'asc'}})
 expect(resolvePlannerDatasetRef({kind:'FareCards',artifactRef,datasetRef:firstSeed.datasetId},state,bridge)).toBe(firstCurrent.datasetId)
 expect(resolvePlannerDatasetRef({kind:'PriceCalendar',artifactRef,datasetRef:secondSeed.datasetId},state,bridge)).toBe(secondCurrent.datasetId)

 const values=new Map<string,unknown>(),storage:ThreadStorage={async read(key){return values.get(key)},async write(key,value){values.set(key,structuredClone(value))}}
 const persistence=createThreadPersistence(storage),record:PersistedThread={schemaVersion:CONTRACT_VERSION,catalogVersion:CATALOG_VERSION,parserVersion:'native-present-1',queryVersion:'1',messages:[{id:'assistant-bound',role:'assistant',parts:[part]}],artifacts:[{variant:'a',source:JSON.stringify(tree),state:state.get(artifactRef)}],descriptors:[firstCurrent,secondCurrent].map(binding=>({datasetId:binding.datasetId,resourceKey:binding.resourceKey,scope:binding.manifest.coverage,sourceVersion:binding.manifest.source.sourceVersion,complete:binding.manifest.complete}))}
 await persistence.save('bound',record);const saved=await persistence.load('bound');if(!saved)throw new Error('Missing saved bindings')
 const restoredBridge=createFixedProjectionFixture({rows:[],sourceVersion:'binding-persistence-v1'}).bridge,restoredState=createUIStateStore();await persistence.restore(saved,restoredBridge,restoredState,new AbortController().signal)
 expect(resolvePlannerDatasetRef({kind:'FareCards',artifactRef,datasetRef:firstSeed.datasetId},restoredState,restoredBridge)).toBe(firstCurrent.datasetId)
 expect(resolvePlannerDatasetRef({kind:'PriceCalendar',artifactRef,datasetRef:secondSeed.datasetId},restoredState,restoredBridge)).toBe(secondCurrent.datasetId)
})
