import {afterEach,expect,it,vi} from 'vitest'
import {render,screen,cleanup} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {UIMessage} from 'ai'
import {GenerativeChat} from './runtime-provider'
import {createUIStateStore} from '../state/ui-state-store'
import {createFareDataBridge} from '../data/fare-data-bridge'
import {ArtifactIdSchema} from '../contracts'
import {createDisplayContextStore} from '../state/display-context'
type TestNode={$type:string;artifactRef:string;title?:string;children?:TestNode[]}
vi.mock('../presentation/toolkit-client',async()=>{const {z}=await import('zod');const {CatalogNode}=await import('../catalog/component');const renderNode=(node:TestNode)=><CatalogNode kind={node.$type} artifactRef={node.artifactRef} title={node.title}>{node.children?.map((child,index)=><span key={index}>{renderNode(child)}</span>)}</CatalogNode>;return{default:{present:{type:'frontend',parameters:z.record(z.string(),z.unknown()),execute:async()=>({}),render:({args}:{args:TestNode})=>renderNode(args)}}}})
afterEach(()=>{cleanup();vi.unstubAllGlobals();Reflect.deleteProperty(HTMLElement.prototype,'scrollTo')})
function setup(parts:UIMessage['parts']){
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}});vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const state=createUIStateStore();state.initializeMissing(ArtifactIdSchema.parse('art'),{filters:{modes:['bus'],carrierIds:[],directOnly:false}})
 const messages:UIMessage[]=[{id:'assistant-steps',role:'assistant',parts}],before=JSON.stringify(messages)
 const displayContext=createDisplayContextStore().capture({captureId:'test',artifactIds:[]})
 render(<GenerativeChat services={{state,bridge:createFareDataBridge(),activeId:()=>'art',activate:()=>{}}} capture={()=>({schemaVersion:'2.0.0',turnId:'test',artifacts:[],olderArtifactSummaries:[],datasets:[],selectedFareFacts:[],plannedFareIds:[],displayContext})} initialMessages={messages}/>)
 return {messages,before,state}
}
const scene:UIMessage['parts'][number]={type:'tool-present',toolCallId:'scene',state:'output-available',input:{$type:'TravelSurface',artifactRef:'art',title:'Usable travel view',children:[{$type:'ModeChips',artifactRef:'art'}]},output:{}}
it('shows completed step prose inline with the final text and scene',async()=>{
 const {messages,before,state}=setup([{type:'step-start'},{type:'text',text:'Earlier planning prose.'},scene,{type:'text',text:'Earlier post-presentation prose.'},{type:'step-start'},{type:'text',text:'Final response first part.'},{type:'text',text:'Final response second part.'}])
 await screen.findByText('Usable travel view')
 expect(screen.getByText('Earlier planning prose.')).toBeVisible();expect(screen.getByText('Earlier post-presentation prose.')).toBeVisible()
 expect(screen.getByText('Final response first part.')).toBeVisible();expect(screen.getByText('Final response second part.')).toBeVisible()
 expect(screen.queryByText('Completed steps')).toBeNull()
 expect(screen.getByRole('button',{name:'Bus'})).toHaveAttribute('aria-pressed','true')
 await userEvent.click(screen.getByRole('button',{name:'Bus'}));expect(state.get(ArtifactIdSchema.parse('art')).filters.modes).toEqual([])
 expect(JSON.stringify(messages)).toBe(before)
})
it('leaves tool-step and pending final narrative visible',async()=>{
 setup([{type:'step-start'},{type:'text',text:'Planning still in progress.'},scene,{type:'step-start'},{type:'text',text:'Pending final narrative.',state:'streaming'}])
 await screen.findByText('Usable travel view')
 expect(screen.getByText('Planning still in progress.')).toBeVisible();expect(screen.getByText('Pending final narrative.')).toBeVisible();expect(screen.queryByText('Completed steps')).toBeNull()
})

it('omits completed frontend tool status while preserving the completed tool results',async()=>{
 const parts:UIMessage['parts']=[{type:'step-start'},
  {type:'tool-edit_artifact',toolCallId:'edit-first',state:'output-available',input:{artifactRef:'art',expectedRevision:0,commands:[]},output:{artifactId:'art',status:'applied',revision:1}},
  {type:'tool-edit_artifact',toolCallId:'edit-second',state:'output-available',input:{artifactRef:'art',expectedRevision:1,commands:[]},output:{artifactId:'art',status:'applied',revision:2}},
  scene,{type:'step-start'},{type:'text',text:'Your travel view is ready.'}]
 const {messages,before}=setup(parts)
 await screen.findByText('Usable travel view')
 expect(screen.getByText('Your travel view is ready.')).toBeVisible()
 expect(screen.queryByText('Travel data updated locally.')).toBeNull()
 expect(screen.queryByText('Completed steps')).toBeNull()
 expect(messages[0]?.parts.filter(part=>part.type==='tool-edit_artifact')).toHaveLength(2)
 expect(JSON.stringify(messages)).toBe(before)
})
it('keeps useful local tool error and stale feedback visible',()=>{
 setup([{type:'tool-create_artifact',toolCallId:'create-error',state:'output-available',input:{},output:{status:'error',code:'LOCAL_TOOL_FAILED'}},{type:'tool-edit_artifact',toolCallId:'edit-stale',state:'output-available',input:{artifactRef:'art',expectedRevision:0,commands:[]},output:{artifactId:'art',status:'stale',revision:1}}])
 expect(screen.getByText('I could not update the travel data. Your current plan is unchanged; try again or adjust the request.')).toBeVisible()
 expect(screen.getByText('Your travel plan changed before that update finished. I kept the newer version.')).toBeVisible()
})
