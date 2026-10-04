import type {UIMessage} from 'ai'
import {GenerativeChat} from '../../chat/runtime-provider'
import {createUIStateStore} from '../../state/ui-state-store'
import {createFareDataBridge} from '../../data/fare-data-bridge'
import {ArtifactIdSchema} from '../../contracts'
import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,render,screen,waitFor} from '@testing-library/react'
import {bToolkit,createBToolkit,hasAcceptedRepairAfter,SceneToolFrame} from './toolkit'
vi.mock('../a/toolkit-client',()=>({default:{}}))
afterEach(()=>{cleanup();vi.unstubAllGlobals();Reflect.deleteProperty(HTMLElement.prototype,'scrollTo')})
it('never leaves a captured terminal failed compose input as a preparing skeleton',()=>{
 const view=render(<SceneToolFrame args={{}} isStreaming={false} failed repaired={false}/>)
 expect(screen.queryByText('Preparing reactive view…')).toBeNull()
 expect(screen.getByRole('status')).toHaveTextContent('could not be completed')
 view.rerender(<SceneToolFrame args={{}} isStreaming={false} failed repaired/>)
 expect(screen.queryByRole('status')).toBeNull()
})

it('only supersedes a failed tool with a later accepted compose in the same message',()=>{
 const failed={type:'tool-call',toolCallId:'failed',toolName:'compose_reactive_scene'}
 const accepted={type:'tool-call',toolCallId:'repair',toolName:'compose_reactive_scene',args:{artifactRef:'art',programRevision:5,program:'root = TravelSurface("art")'},result:{status:'accepted'}}
 expect(hasAcceptedRepairAfter([failed,accepted],'failed')).toBe(true)
 expect(hasAcceptedRepairAfter([accepted,failed],'failed')).toBe(false)
 expect(hasAcceptedRepairAfter([failed,{...accepted,result:{status:'error'}}],'failed')).toBe(false)
 expect(hasAcceptedRepairAfter([accepted],'missing')).toBe(false)
})

it('renders captured output-error history through the real AI SDK chat adapter',async()=>{
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}})
 vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const state=createUIStateStore();state.initializeMissing(ArtifactIdSchema.parse('art'),{})
 const services={state,bridge:createFareDataBridge(),activeId:()=>'art',activate:()=>{}}
 const failed: UIMessage={id:'captured-assistant',role:'assistant',parts:[{type:'tool-compose_reactive_scene',toolCallId:'ba0dbf46-f26a-4def-95d7-4a3150fdf266',state:'output-error',input:{},errorText:'This scene could not be completed. One bounded repair is allowed.'}]}
 render(<GenerativeChat variant="b" services={services} sceneToolkit={bToolkit} capture={()=>({schemaVersion:'1.0.0',turnId:'test',artifacts:[],datasets:[],selectedFareFacts:[]})} initialMessages={[failed]}/>)
 await waitFor(()=>expect(screen.queryByText('Preparing reactive view…')).toBeNull())
 expect(screen.getByText(/This generated view could not be completed/)).toBeVisible()
})

it('keeps the accepted scene and removes its earlier failed tool through the native runtime',async()=>{
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}})
 vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const state=createUIStateStore();state.initializeMissing(ArtifactIdSchema.parse('art'),{})
 const services={state,bridge:createFareDataBridge(),activeId:()=>'art',activate:()=>{}}
 const messages: UIMessage[]=[{id:'captured-assistant',role:'assistant',parts:[
  {type:'tool-compose_reactive_scene',toolCallId:'failed',state:'output-error',input:{},errorText:'One bounded repair is allowed.'},
  {type:'tool-compose_reactive_scene',toolCallId:'repair',state:'output-available',input:{artifactRef:'art',programRevision:5,program:'root = TravelSurface("art", null, null, null, "Accepted travel view")'},output:{artifactId:'art',programRevision:5,status:'accepted'}}
 ]}]
 render(<GenerativeChat variant="b" services={services} sceneToolkit={bToolkit} capture={()=>({schemaVersion:'1.0.0',turnId:'test',artifacts:[],datasets:[],selectedFareFacts:[]})} initialMessages={messages}/>)
 await screen.findByText('Accepted travel view')
 expect(screen.queryByText('Preparing reactive view…')).toBeNull()
 expect(screen.queryByText(/This generated view could not be completed/)).toBeNull()
})

it.each(['accepted','pending','error','invalid','different','older-turn'])('preserves scene ownership for native %s tool ordering',async scenario=>{
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}})
 vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const state=createUIStateStore();state.initializeMissing(ArtifactIdSchema.parse('art'),{});state.initializeMissing(ArtifactIdSchema.parse('other'),{})
 const services={state,bridge:createFareDataBridge(),activeId:()=>'art',activate:()=>{}}
 const scene=(artifactRef:string,title:string,toolCallId:string)=>({type:'tool-compose_reactive_scene' as const,toolCallId,state:'output-available' as const,input:{artifactRef,programRevision:5,program:`root = TravelSurface("${artifactRef}", null, null, null, "${title}")`},output:{artifactId:artifactRef,programRevision:5,status:'accepted'}})
 const first=scene('art','First usable scene','first'),second=scene(scenario==='different'?'other':'art','New accepted scene','second')
 if(scenario==='invalid')second.input.program+='\nunknown()'
 const messages: UIMessage[]=scenario==='older-turn'?[{id:'first-turn',role:'assistant',parts:[first]},{id:'later-user',role:'user',parts:[{type:'text',text:'Update this view'}]},{id:'later-turn',role:'assistant',parts:[second]}]:[{id:'same-turn',role:'assistant',parts:[first,scenario==='pending'?{type:'tool-compose_reactive_scene',toolCallId:'pending',state:'input-streaming',input:{artifactRef:'art'}}:scenario==='error'?{type:'tool-compose_reactive_scene',toolCallId:'error',state:'output-error',input:{},errorText:'Repair was not accepted'}:second]}]
 render(<GenerativeChat variant="b" services={services} sceneToolkit={bToolkit} capture={()=>({schemaVersion:'1.0.0',turnId:'test',artifacts:[],datasets:[],selectedFareFacts:[]})} initialMessages={messages}/>)
 if(scenario==='accepted'){await screen.findByText('New accepted scene');expect(screen.queryByText('First usable scene')).toBeNull()}
 else{await screen.findByText('First usable scene');if(scenario==='different'||scenario==='older-turn')await screen.findByText('New accepted scene')}
})

it.each(['legacy-title','body'])('renders captured explanatory Callout text through native %s history',async shape=>{
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}})
 vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const state=createUIStateStore();state.initializeMissing(ArtifactIdSchema.parse('art'),{})
 const services={state,bridge:createFareDataBridge(),activeId:()=>'art',activate:()=>{}}
 const explanation='Demo fares cover October 2–8. Choose dates allowing two nights in Paris, then four in Barcelona. No return leg or accommodation is included. Ferry fares are absent from this synthetic coverage.'
 const notice=shape==='legacy-title'?`note = Callout("art", null, null, null, ${JSON.stringify(explanation)})`:`note = Callout("art", null, null, null, "Coverage notes", null, null, null, null, null, null, ${JSON.stringify(explanation)})`
 const messages:UIMessage[]=[{id:'explanatory-scene',role:'assistant',parts:[{type:'tool-compose_reactive_scene',toolCallId:'callout-scene',state:'output-available',input:{artifactRef:'art',programRevision:1,program:`root = TravelSurface("art", null, null, null, "Travel options", null, [note])\n${notice}`},output:{artifactId:'art',programRevision:1,status:'accepted'}}]}]
 render(<GenerativeChat variant="b" services={services} sceneToolkit={bToolkit} capture={()=>({schemaVersion:'1.0.0',turnId:'test',artifacts:[],datasets:[],selectedFareFacts:[]})} initialMessages={messages}/>)
 expect(await screen.findByText(explanation)).toHaveProperty('tagName','P')
 expect(screen.queryByRole('alert')).toBeNull()
})

it('acknowledges only host-owned artifacts and loaded datasets with native error metadata',async()=>{
 const state=createUIStateStore(),id=ArtifactIdSchema.parse('art');state.initializeMissing(id,{})
 const bridge=createFareDataBridge({pageSource:async()=>({rows:[],total:0,pages:1,page:1,sourceVersion:'scope-proof'})}),services={state,bridge,activeId:()=>id,activate:()=>{}}
 const tool=createBToolkit(services).compose_reactive_scene
 const input={artifactRef:id,programRevision:0,program:'root = TravelSurface("art", null, null, null, "Trip", null, [offers])\noffers = FareCards("art", "unregistered-dataset")'}
 expect(await tool.execute(input)).toMatchObject({isError:true,result:{status:'error'}})
 expect(await tool.execute({...input,artifactRef:'missing'})).toMatchObject({isError:true,result:{status:'error'}})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-03',to:'2026-10-03'},modes:['train'],passengers:1},new AbortController().signal)
 state.dispatch({kind:'datasets',artifactId:id,datasetRefs:[manifest.datasetId]})
 expect(await tool.execute({...input,program:input.program.replace('unregistered-dataset',manifest.datasetId)})).toMatchObject({isError:false,result:{status:'accepted'}})
 expect(await tool.execute({...input,program:`root = TravelSurface("art")\nq = Query("local_query", {version:1,sources:[{datasetRef:"ghost",alias:"f"}],limit:5})`})).toMatchObject({isError:true,result:{status:'error'}})
})
it('keeps invalid saved acknowledgements as failure records instead of mounting unknown resources',async()=>{
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}});vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const state=createUIStateStore();state.initializeMissing(ArtifactIdSchema.parse('art'),{})
 const messages:UIMessage[]=[{id:'invalid-historical-scene',role:'assistant',parts:[{type:'tool-compose_reactive_scene',toolCallId:'invalid-ref',state:'output-available',input:{artifactRef:'art',programRevision:0,program:'root = TravelSurface("art", null, null, null, "Trip", null, [offers])\noffers = FareCards("art", "unregistered-dataset")'},output:{artifactId:'art',programRevision:0,status:'accepted'}}]}]
 const before=JSON.stringify(messages),services={state,bridge:createFareDataBridge(),activeId:()=>'art',activate:()=>{}}
 render(<GenerativeChat variant="b" services={services} capture={()=>({schemaVersion:'1.0.0',turnId:'t',artifacts:[],datasets:[],selectedFareFacts:[]})} initialMessages={messages}/>)
 expect(await screen.findByText(/This generated view could not be completed/)).toBeVisible()
 expect(screen.queryByText(/travel data is not available/)).toBeNull();expect(JSON.stringify(messages)).toBe(before)
})
