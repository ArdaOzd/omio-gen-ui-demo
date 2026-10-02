import type {UIMessage} from 'ai'
import {GenerativeChat} from '../../chat/runtime-provider'
import {createUIStateStore} from '../../state/ui-state-store'
import {createFareDataBridge} from '../../data/fare-data-bridge'
import {ArtifactIdSchema} from '../../contracts'
import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,render,screen,waitFor} from '@testing-library/react'
import {bToolkit,hasAcceptedRepairAfter,SceneToolFrame} from './toolkit'
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
 const accepted={type:'tool-call',toolCallId:'repair',toolName:'compose_reactive_scene',result:{status:'accepted'}}
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
