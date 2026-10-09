import type { UIMessage } from 'ai'
import type { ToolCallMessagePartProps } from '@assistant-ui/react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { GenerativeChat } from '../chat/runtime-provider'
import { CatalogNode } from '../catalog/component'
import { createUIStateStore } from '../state/ui-state-store'
import { ArtifactIdSchema,CATALOG_VERSION,CONTRACT_VERSION } from '../contracts'
import { resolvePlannerDatasetRef } from '../catalog/trip-planning/binding'
import { createThreadPersistence,type PersistedThread,type ThreadStorage } from '../state/persistence'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { createDisplayContextStore } from '../state/display-context'
import { createPlanningStore } from '../tracker/planning-store'
import { createSceneLifecycle } from './scene-lifecycle'
import type { TravelServices } from '../catalog/context'
vi.mock('./toolkit',async()=>{const {z}=await import('zod');return{default:{present:{type:'frontend',parameters:z.record(z.string(),z.unknown()),execute:async()=>({}),render:(props:ToolCallMessagePartProps<Record<string,unknown>,Record<string,never>>)=><CatalogNode kind="TravelSurface" artifactRef={String(props.args.artifactRef)} title={String(props.args.title)} __displayComponent={{componentRef:{value:`${String(props.args.artifactRef)}:${props.toolCallId}:root`,keySource:'tree-path'},childRefs:[]}}/>}}}})
afterEach(()=>{cleanup();vi.unstubAllGlobals();Reflect.deleteProperty(HTMLElement.prototype,'scrollTo')})
const accepted=(id:string,artifactRef:string,title:string):UIMessage['parts'][number]=>({type:'tool-present',toolCallId:id,state:'output-available',input:{$type:'TravelSurface',artifactRef,title},output:{}})
const acceptedTree=(id:string,input:Record<string,unknown>):UIMessage['parts'][number]=>({type:'tool-present',toolCallId:id,state:'output-available',input,output:{}})
const emptyContext=()=>({schemaVersion:CONTRACT_VERSION as '2.0.0',turnId:'test',artifacts:[],olderArtifactSummaries:[],datasets:[],plannedFareIds:[],selectedFareFacts:[],displayContext:createDisplayContextStore().capture({captureId:'test',artifactIds:[]})})
function mount(parts:UIMessage['parts'],earlier:UIMessage[]=[]){
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}})
 vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const state=createUIStateStore();for(const id of ['art-1','art-2'])state.initializeMissing(ArtifactIdSchema.parse(id),{})
 const bridge=createFixedProjectionFixture({rows:[],sourceVersion:'present-empty-v1'}).bridge,services:TravelServices={state,bridge,activeId:()=>'art-1',activate:()=>{}},displayStore=createDisplayContextStore()
 const initialMessages=[...earlier,{id:'assistant-final',role:'assistant' as const,parts}],snapshots=earlier.flatMap(message=>message.parts.flatMap(part=>part.type==='tool-present'&&part.state==='output-available'?[{toolCallId:part.toolCallId,artifactStates:[state.get(ArtifactIdSchema.parse('art-1'))]}]:[]))
 render(<GenerativeChat services={services} planning={createPlanningStore()} sceneLifecycle={createSceneLifecycle(services,{initialMessages,initialSnapshots:snapshots})} displayStore={displayStore} capture={emptyContext} initialMessages={initialMessages}/> )
 return displayStore
}
async function bookingServices(){
 const fixed=createFixedProjectionFixture({rows:[],sourceVersion:'present-booking-v1'}),artifactRef=ArtifactIdSchema.parse('art-1')
 const scope=(originId:string,destinationId:string)=>fixed.scope({originId,destinationId,dateWindow:{from:'2026-10-09',to:'2026-10-16'},passengers:1,earliestDeparture:{date:'2026-10-09',minutes:0}})
 const manifests=await Promise.all([fixed.bridge.loadScope(scope('london','paris'),new AbortController().signal),fixed.bridge.loadScope(scope('paris','rome'),new AbortController().signal)])
 const datasetRefs=manifests.map(manifest=>fixed.bridge.getBinding(manifest.resourceKey).datasetId)
 const state=createUIStateStore();state.initializeMissing(artifactRef,{datasetRefs,citySequence:['london','paris','rome'],dates:{start:'2026-10-09',end:'2026-10-16'}})
 return{state,bridge:fixed.bridge,artifactRef,datasetRefs}
}
function mountBooking(services:Awaited<ReturnType<typeof bookingServices>>,parts:UIMessage['parts'],earlier:UIMessage[]=[]){
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}})
 vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const travel:TravelServices={state:services.state,bridge:services.bridge,activeId:()=>services.artifactRef,activate:()=>{}},initialMessages=[...earlier,{id:'assistant-final',role:'assistant' as const,parts}]
 const snapshots=earlier.flatMap(message=>message.parts.flatMap(part=>part.type==='tool-present'&&part.state==='output-available'?[{toolCallId:part.toolCallId,artifactStates:[services.state.get(services.artifactRef)]}]:[]))
 render(<GenerativeChat services={travel} planning={createPlanningStore()} sceneLifecycle={createSceneLifecycle(travel,{initialMessages,initialSnapshots:snapshots})} capture={emptyContext} initialMessages={initialMessages}/> )
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
it('freezes an earlier scene and makes the latest whole scene active',()=>{
 const earlier:UIMessage[]=[{id:'earlier',role:'assistant',parts:[accepted('earlier','art-1','Earlier turn')]},{id:'new-user',role:'user',parts:[{type:'text',text:'Create another view.'}]}]
 mount([accepted('first','art-1','Current artifact'),accepted('other','art-2','Other artifact')],earlier)
 expect(screen.getByText('Earlier turn')).toBeVisible();expect(screen.queryByText('Current artifact')).toBeNull();expect(screen.getByText('Other artifact')).toBeVisible()
 expect(screen.getByRole('group',{name:'Previous travel view'})).toBeDisabled()
 expect(document.querySelectorAll('.travel-travelsurface')).toHaveLength(2)
})

it('keeps same-artifact frozen components out of the active display context',()=>{
 const earlier:UIMessage[]=[{id:'earlier',role:'assistant',parts:[accepted('archived','art-1','Archived London scene')]},{id:'new-user',role:'user',parts:[{type:'text',text:'Create Madrid.'}]}]
 const displayStore=mount([accepted('active','art-1','Active Madrid scene')],earlier)
 const refs=displayStore.capture({captureId:'active-only',artifactIds:[ArtifactIdSchema.parse('art-1')]}).components.map(component=>component.identity.componentRef.value)
 expect(refs).toEqual(['art-1:active:root'])
})

it('keeps a booking workflow when a later message adds only a supplementary comparison',async()=>{
 const services=await bookingServices(),[first,second]=services.datasetRefs
 const booking={$type:'TravelSurface',artifactRef:'art-1',title:'Flexible booking',children:[{$type:'FareCalendar',artifactRef:'art-1',datasetRef:first,legIndex:0},{$type:'FareCalendar',artifactRef:'art-1',datasetRef:second,legIndex:1}]}
 const comparison={$type:'TravelSurface',artifactRef:'art-1',title:'Extra comparison',children:[{$type:'CheapestFastest',artifactRef:'art-1',datasetRef:first,legIndex:0}]}
 mountBooking(services,[acceptedTree('comparison',comparison)],[{id:'booking-message',role:'assistant',parts:[acceptedTree('booking',booking)]},{id:'next-user',role:'user',parts:[{type:'text',text:'Compare the first leg.'}]}])
 expect(screen.getByText('Flexible booking')).toBeVisible();expect(screen.getByText('Extra comparison')).toBeVisible()
 expect(document.querySelectorAll('.travel-travelsurface')).toHaveLength(2)
})

it('keeps an earlier booking workflow frozen when a replacement becomes active',async()=>{
 const services=await bookingServices(),[first,second]=services.datasetRefs
 const booking={$type:'TravelSurface',artifactRef:'art-1',title:'Earlier booking',children:[{$type:'FareCalendar',artifactRef:'art-1',datasetRef:first,legIndex:0},{$type:'FareCalendar',artifactRef:'art-1',datasetRef:second,legIndex:1}]}
 const replacement={$type:'TravelSurface',artifactRef:'art-1',title:'Replacement booking',children:[{$type:'MultiCityPlanGrid',artifactRef:'art-1'}]}
 mountBooking(services,[acceptedTree('replacement',replacement)],[{id:'booking-message',role:'assistant',parts:[acceptedTree('booking',booking)]},{id:'next-user',role:'user',parts:[{type:'text',text:'Use the full planner.'}]}])
 expect(screen.getByText('Earlier booking')).toBeVisible();expect(screen.getByText('Replacement booking')).toBeVisible()
 expect(document.querySelectorAll('.travel-travelsurface')).toHaveLength(2)
})

it('shows a sanitized error for restored overlapping owners while a later valid scene stays usable',async()=>{
 const services=await bookingServices(),[first,second]=services.datasetRefs
 const invalid={$type:'TravelSurface',artifactRef:'art-1',title:'Legacy mixed booking',children:[{$type:'MultiCityPlanGrid',artifactRef:'art-1'},{$type:'FareCalendar',artifactRef:'art-1',datasetRef:first,legIndex:0}]}
 const valid={$type:'TravelSurface',artifactRef:'art-1',title:'Valid flexible booking',children:[{$type:'FareCalendar',artifactRef:'art-1',datasetRef:first,legIndex:0},{$type:'FareCalendar',artifactRef:'art-1',datasetRef:second,legIndex:1}]}
 mountBooking(services,[acceptedTree('valid',valid)],[{id:'legacy-message',role:'assistant',parts:[acceptedTree('legacy',invalid)]},{id:'next-user',role:'user',parts:[{type:'text',text:'Repair the planner.'}]}])
 expect(screen.getByText('This view could not be displayed. Retry with the current travel state.')).toBeVisible()
 expect(screen.getByText('Valid flexible booking')).toBeVisible()
})

it('rejects a completed flexible booking that omits a resolved leg',async()=>{
 const services=await bookingServices(),[first]=services.datasetRefs
 const incomplete={$type:'TravelSurface',artifactRef:'art-1',title:'Incomplete flexible booking',children:[{$type:'FareCalendar',artifactRef:'art-1',datasetRef:first,legIndex:0}]}
 mountBooking(services,[acceptedTree('incomplete',incomplete)])
 expect(screen.getByText('This view could not be displayed. Retry with the current travel state.')).toBeVisible()
 expect(screen.queryByText('Incomplete flexible booking')).toBeNull()
})

it('rejects a calendar whose authored dataset handle resolves to another leg',async()=>{
 const services=await bookingServices(),[first]=services.datasetRefs
 const mismatched={$type:'TravelSurface',artifactRef:'art-1',title:'Mismatched flexible booking',children:[{$type:'FareCalendar',artifactRef:'art-1',datasetRef:first,legIndex:0},{$type:'FareCalendar',artifactRef:'art-1',datasetRef:first,legIndex:1}]}
 mountBooking(services,[acceptedTree('mismatched',mismatched)])
 expect(screen.getByText('This view could not be displayed. Retry with the current travel state.')).toBeVisible()
 expect(screen.queryByText('Mismatched flexible booking')).toBeNull()
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
 const part={type:'tool-present' as const,toolCallId:'bound-scene',state:'output-available' as const,input:tree,output:{}},services:TravelServices={state,bridge,activeId:()=>artifactRef,activate:()=>{}},initialMessages=[{id:'assistant-bound',role:'assistant' as const,parts:[part]}]
 render(<GenerativeChat services={services} planning={createPlanningStore()} sceneLifecycle={createSceneLifecycle(services,{initialMessages})} capture={emptyContext} initialMessages={initialMessages}/> )
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
 const persistence=createThreadPersistence(storage),record:PersistedThread={schemaVersion:CONTRACT_VERSION,catalogVersion:CATALOG_VERSION,parserVersion:'native-present-1',queryVersion:'1',messages:[{id:'assistant-bound',role:'assistant',parts:[part]}],artifacts:[{source:JSON.stringify(tree),state:state.get(artifactRef)}],descriptors:[firstCurrent,secondCurrent].map(binding=>({datasetId:binding.datasetId,resourceKey:binding.resourceKey,scope:binding.manifest.coverage,sourceVersion:binding.manifest.source.sourceVersion,complete:binding.manifest.complete})),plannedFares:[],sceneSnapshots:[]}
 await persistence.save('bound',record);const saved=await persistence.load('bound');if(!saved)throw new Error('Missing saved bindings')
 const restoredBridge=createFixedProjectionFixture({rows:[],sourceVersion:'binding-persistence-v1'}).bridge,restoredState=createUIStateStore();await persistence.restore(saved,restoredBridge,restoredState,new AbortController().signal)
 expect(resolvePlannerDatasetRef({kind:'FareCards',artifactRef,datasetRef:firstSeed.datasetId},restoredState,restoredBridge)).toBe(firstCurrent.datasetId)
 expect(resolvePlannerDatasetRef({kind:'PriceCalendar',artifactRef,datasetRef:secondSeed.datasetId},restoredState,restoredBridge)).toBe(secondCurrent.datasetId)
})
