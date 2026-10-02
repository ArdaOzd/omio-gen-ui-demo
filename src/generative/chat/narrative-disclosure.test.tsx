import {afterEach,expect,it,vi} from 'vitest'
import {render,screen,cleanup} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {UIMessage} from 'ai'
import {GenerativeChat} from './runtime-provider'
import {bToolkit} from '../variants/b/toolkit'
import {createUIStateStore} from '../state/ui-state-store'
import {createFareDataBridge} from '../data/fare-data-bridge'
import {ArtifactIdSchema} from '../contracts'
vi.mock('../variants/a/toolkit-client',()=>({default:{}}))
afterEach(()=>{cleanup();vi.unstubAllGlobals();Reflect.deleteProperty(HTMLElement.prototype,'scrollTo')})
function setup(parts:UIMessage['parts']){
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}});vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const state=createUIStateStore();state.initializeMissing(ArtifactIdSchema.parse('art'),{filters:{modes:['bus'],carrierIds:[],directOnly:false}})
 const messages:UIMessage[]=[{id:'assistant-steps',role:'assistant',parts}],before=JSON.stringify(messages)
 render(<GenerativeChat variant="b" sceneToolkit={bToolkit} services={{state,bridge:createFareDataBridge(),activeId:()=>'art',activate:()=>{}}} capture={()=>({schemaVersion:'1.0.0',turnId:'test',artifacts:[],datasets:[],selectedFareFacts:[]})} initialMessages={messages}/>)
 return {messages,before,state}
}
const scene:UIMessage['parts'][number]={type:'tool-compose_reactive_scene',toolCallId:'scene',state:'output-available',input:{artifactRef:'art',programRevision:1,program:'root = TravelSurface("art", null, null, null, "Usable travel view", null, [mode])\nmode = ModeChips("art")'},output:{artifactId:'art',programRevision:1,status:'accepted'}}
it('folds all completed earlier-step prose while keeping the final text and scene visible',async()=>{
 const {messages,before,state}=setup([{type:'step-start'},{type:'text',text:'Earlier planning prose.'},scene,{type:'text',text:'Earlier post-presentation prose.'},{type:'step-start'},{type:'text',text:'Final response first part.'},{type:'text',text:'Final response second part.'}])
 await screen.findByText('Usable travel view')
 expect(screen.getByText('Earlier planning prose.')).not.toBeVisible();expect(screen.getByText('Earlier post-presentation prose.')).not.toBeVisible()
 expect(screen.getByText('Final response first part.')).toBeVisible();expect(screen.getByText('Final response second part.')).toBeVisible()
 expect(screen.getByRole('button',{name:'Bus'})).toHaveAttribute('aria-pressed','true')
 await userEvent.click(screen.getByText('Completed steps'))
 await userEvent.click(screen.getByRole('button',{name:'Bus'}));expect(state.get(ArtifactIdSchema.parse('art')).filters.modes).toEqual([])
 expect(screen.getByText('Earlier planning prose.')).toBeVisible();expect(screen.getByText('Earlier post-presentation prose.')).toBeVisible()
 expect(JSON.stringify(messages)).toBe(before)
})
it('leaves tool-step and pending final narrative visible',async()=>{
 setup([{type:'step-start'},{type:'text',text:'Planning still in progress.'},scene,{type:'step-start'},{type:'text',text:'Pending final narrative.',state:'streaming'}])
 await screen.findByText('Usable travel view')
 expect(screen.getByText('Planning still in progress.')).toBeVisible();expect(screen.getByText('Pending final narrative.')).toBeVisible();expect(screen.queryByText('Completed steps')).toBeNull()
})
