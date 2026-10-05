import type { UIMessage } from 'ai'
import type { ToolCallMessagePartProps } from '@assistant-ui/react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { GenerativeChat } from '../../chat/runtime-provider'
import { CatalogNode } from '../../catalog/component'
import { createUIStateStore } from '../../state/ui-state-store'
import { createFareDataBridge } from '../../data/fare-data-bridge'
import { ArtifactIdSchema } from '../../contracts'
vi.mock('./toolkit',async()=>{const {z}=await import('zod');return{default:{present:{type:'frontend',parameters:z.record(z.string(),z.unknown()),execute:async()=>({}),render:(props:ToolCallMessagePartProps<Record<string,unknown>,Record<string,never>>)=><CatalogNode kind="TravelSurface" artifactRef={String(props.args.artifactRef)} title={String(props.args.title)}/>}}}})
afterEach(()=>{cleanup();vi.unstubAllGlobals();Reflect.deleteProperty(HTMLElement.prototype,'scrollTo')})
const accepted=(id:string,artifactRef:string,title:string):UIMessage['parts'][number]=>({type:'tool-present',toolCallId:id,state:'output-available',input:{$type:'TravelSurface',artifactRef,title},output:{}})
function mount(parts:UIMessage['parts'],earlier:UIMessage[]=[]){
 Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}})
 vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})
 const state=createUIStateStore();for(const id of ['art-1','art-2'])state.initializeMissing(ArtifactIdSchema.parse(id),{})
 render(<GenerativeChat services={{state,bridge:createFareDataBridge(),activeId:()=>'art-1',activate:()=>{}}} capture={()=>({schemaVersion:'1.0.0',turnId:'test',artifacts:[],olderArtifactSummaries:[],datasets:[],selectedFareFacts:[]})} initialMessages={[...earlier,{id:'assistant-final',role:'assistant',parts}]}/> )
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
