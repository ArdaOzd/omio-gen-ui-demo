import { fireEvent,render,screen,waitFor,within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach,expect,it,vi } from 'vitest'
import { type UIMessage } from 'ai'
import { ArtifactIdSchema,BoundedFareFactSchema,FareIdSchema,type UIStateStore } from './contracts'
import type { TravelServices } from './catalog/context'
import type { PlanningStore } from './tracker/planning-store'
import { createUIStateStore } from './state/ui-state-store'
const io=vi.hoisted(()=>({load:vi.fn(),restore:vi.fn(),save:vi.fn(),capture:vi.fn()}))
vi.mock('./state/persistence',async importOriginal=>({...await importOriginal<typeof import('./state/persistence')>(),createThreadPersistence:()=>io}))
vi.mock('./data/fare-data-bridge',()=>({createFareDataBridge:()=>({})}))
vi.mock('./state/action-router',()=>({createActionRouter:()=>Object.assign(vi.fn(),{whenIdle:async()=>{},dispose:()=>{}})}))
vi.mock('./chat/runtime-provider',async()=>{
 const [{TravelProvider},{PlanningTracker}]=await Promise.all([import('./catalog/context'),import('./tracker/planning-tracker')])
 return{GenerativeChat:({initialMessages,initialRunMessageId,services,planning,capture,onLiveMessages}:{initialMessages:UIMessage[];initialRunMessageId?:string;services:TravelServices;planning:PlanningStore;capture:()=>Promise<unknown>;onLiveMessages:(messages:UIMessage[])=>void})=><TravelProvider services={services}><div data-testid="restored-chat" data-run-message={initialRunMessageId}>{initialMessages.flatMap(message=>message.parts.map(part=>part.type==='text'?part.text:'')).join(' ')}</div><button type="button" onClick={()=>void capture().then(io.capture)}>Capture agent context</button><button type="button" onClick={()=>{services.createArtifact?.();void capture().then(io.capture)}}>Create artifact and capture</button><button type="button" onClick={()=>onLiveMessages([])}>Regenerate without old scene</button><PlanningTracker store={planning}/></TravelProvider>}
})
import { GenerativeRoute } from './routes'
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();sessionStorage.clear();window.history.replaceState({},'','/generative')})
it('keeps the saved conversation untouched when resources fail, then restores it on retry',async()=>{
 const messages=[{id:'saved-user',role:'user',parts:[{type:'text',text:'Preserved travel conversation'}]}]
 const savedState=createUIStateStore(),retained=ArtifactIdSchema.parse('retained');savedState.initializeMissing(retained,{})
 io.load.mockResolvedValue({messages,artifacts:[{state:savedState.get(retained)}],activeArtifactId:'retained',plannedFares:[],sceneSnapshots:[]})
 io.restore.mockRejectedValueOnce(new Error('API unavailable')).mockImplementationOnce(async(_record:unknown,_bridge:unknown,store:UIStateStore)=>{store.initializeMissing(ArtifactIdSchema.parse('retained'),{})})
 render(<GenerativeRoute/>);await screen.findByRole('button',{name:'Retry restoring conversation'});expect(screen.queryByTestId('restored-chat')).toBeNull();expect(io.save).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Retry restoring conversation'}));await waitFor(()=>expect(screen.getByTestId('restored-chat').textContent).toBe('Preserved travel conversation'));expect(io.load).toHaveBeenCalledTimes(2);expect(io.save).not.toHaveBeenCalled();
})
it('persists a smart-planner prompt before opening chat and marks it to run',async()=>{
 const handoff={id:'planner-test',prompt:'  Plan Prague to Rome by train.  '}
 sessionStorage.setItem('omio-smart-planner-handoff',JSON.stringify(handoff));window.history.replaceState({},'','/generative?handoff=planner-test')
 io.load.mockResolvedValue(null);io.save.mockResolvedValue(undefined)
 render(<GenerativeRoute/>);const chat=await screen.findByTestId('restored-chat')
 expect(chat.textContent).toBe(handoff.prompt);expect(chat.dataset.runMessage).toBe(handoff.id)
 expect(io.save).toHaveBeenCalledOnce();expect(io.save.mock.calls[0][1].messages).toEqual([{id:handoff.id,role:'user',parts:[{type:'text',text:handoff.prompt}]}])
})
it('captures a newly created active artifact before its first scene is presented',async()=>{
 io.load.mockResolvedValue(null);io.save.mockResolvedValue(undefined)
 render(<GenerativeRoute/>);await screen.findByTestId('restored-chat')
 await userEvent.setup().click(screen.getByRole('button',{name:'Create artifact and capture'}));await waitFor(()=>expect(io.capture).toHaveBeenCalledOnce())
 const context=io.capture.mock.calls[0]?.[0]
 expect(context.artifacts).toHaveLength(1)
 expect(context.activeArtifactId).toBe(context.artifacts[0].artifactId)
})
it('keeps the accepted scene while prioritizing a new active artifact in continuation context',async()=>{
 const accepted=ArtifactIdSchema.parse('accepted-scene'),savedState=createUIStateStore();savedState.initializeMissing(accepted,{})
 const messages:UIMessage[]=[{id:'accepted-message',role:'assistant',parts:[{type:'tool-present',toolCallId:'accepted-present',state:'output-available',input:{$type:'TravelSurface',artifactRef:accepted},output:{}}]}]
 io.load.mockResolvedValue({messages,artifacts:[{state:savedState.get(accepted)}],activeArtifactId:accepted,plannedFares:[],sceneSnapshots:[]})
 io.restore.mockImplementation(async(_record:unknown,_bridge:unknown,store:UIStateStore)=>{store.initializeMissing(accepted,savedState.get(accepted))})
 io.save.mockResolvedValue(undefined)
 render(<GenerativeRoute/>);await screen.findByTestId('restored-chat')
 await userEvent.setup().click(screen.getByRole('button',{name:'Create artifact and capture'}));await waitFor(()=>expect(io.capture).toHaveBeenCalledOnce())
 const context=io.capture.mock.calls[0]?.[0]
 expect(context.artifacts.map((artifact:{artifactId:string})=>artifact.artifactId)).toEqual([context.activeArtifactId,accepted])
 expect(context.activeArtifactId).not.toBe(accepted)
})
it('restores the per-chat fare basket with buying controls and persists cancellation',async()=>{
 const owner=ArtifactIdSchema.parse('retained-basket'),savedState=createUIStateStore();savedState.initializeMissing(owner,{citySequence:['madrid','barcelona']})
 const fact=BoundedFareFactSchema.parse({id:'saved-london-paris',originId:'london',destinationId:'paris',serviceDate:'2026-11-08',mode:'train',carrierId:'eurostar',carrierName:'Eurostar',priceCents:4200,durationMinutes:150,departureMinutes:540,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true,legs:[{legIndex:0,mode:'train',carrierName:'Eurostar',durationMinutes:150,originId:'london',destinationId:'paris',originLabel:'London',destinationLabel:'Paris'}]})
 io.load.mockResolvedValue({messages:[{id:'saved-user',role:'user',parts:[{type:'text',text:'Show another component'}]}],artifacts:[{state:savedState.get(owner)}],activeArtifactId:owner,plannedFares:[{fact,owners:[owner]}],sceneSnapshots:[]})
 io.restore.mockImplementation(async(_record:unknown,_bridge:unknown,store:UIStateStore)=>{store.initializeMissing(owner,savedState.get(owner))})
 io.save.mockResolvedValue(undefined)
 render(<GenerativeRoute/>);const tracker=await screen.findByRole('complementary',{name:'Fare buying tracker'})
 expect(within(tracker).getByText('London → Paris')).toBeInTheDocument();expect(within(tracker).getByText('2026-11-08 · 09:00–11:30')).toBeInTheDocument();expect(within(tracker).getByText('Train · Eurostar')).toBeInTheDocument()
 const user=userEvent.setup();await user.click(within(tracker).getByRole('button',{name:'Buy'}));expect(screen.getByRole('dialog')).toHaveTextContent('Congrats, you are set for the trip.');await user.click(screen.getByRole('button',{name:'Close'}))
 await user.click(within(tracker).getByRole('button',{name:'Cancel London to Paris on 2026-11-08'}));await waitFor(()=>expect(screen.queryByRole('complementary',{name:'Fare buying tracker'})).toBeNull())
 await waitFor(()=>expect(io.save.mock.calls.some(([,record])=>record.plannedFares.length===0)).toBe(true))
})
it('drops a stale frozen fare without dropping a current fare owned by the same artifact',async()=>{
 const owner=ArtifactIdSchema.parse('mixed-source-owner'),savedState=createUIStateStore();savedState.initializeMissing(owner,{selectedFareIds:[FareIdSchema.parse('valid-madrid-barcelona')]})
 const fact=(id:string,originId:string,destinationId:string)=>BoundedFareFactSchema.parse({id,originId,destinationId,serviceDate:'2026-11-08',mode:'train',carrierId:'rail',carrierName:'Test Rail',priceCents:4200,durationMinutes:150,departureMinutes:540,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true,legs:[{legIndex:0,mode:'train',carrierName:'Test Rail',durationMinutes:150,originId,destinationId,originLabel:originId,destinationLabel:destinationId}]})
 const stale=fact('stale-london-paris','london','paris'),valid=fact('valid-madrid-barcelona','madrid','barcelona')
  const validSource={owner,source:{kind:'search' as const,descriptorId:'private-madrid-scope',sourceVersion:'private-basket-source-v2'},scope:{kind:'fareScope' as const,originId:'madrid',destinationId:'barcelona',dateWindow:{from:'2026-11-08',to:'2026-11-08'},passengers:1,earliestDeparture:{date:'2026-11-08',minutes:0}}}
 const messages:UIMessage[]=[{id:'saved-user',role:'user',parts:[{type:'text',text:'Keep only current fares'}]}]
 io.load.mockResolvedValue({messages,artifacts:[{state:savedState.get(owner)}],activeArtifactId:owner,plannedFares:[{fact:stale,owners:[owner]},{fact:valid,owners:[owner],sources:[validSource]}],sceneSnapshots:[]})
 io.restore.mockImplementation(async(_record:unknown,_bridge:unknown,store:UIStateStore,_signal:AbortSignal,onSourceChanged:(change:{clearedSelections:boolean;sourceChangedFareIdsByArtifact:ReadonlyMap<typeof owner,ReadonlySet<typeof stale.id>>})=>void)=>{store.initializeMissing(owner,savedState.get(owner));onSourceChanged({clearedSelections:true,sourceChangedFareIdsByArtifact:new Map([[owner,new Set([stale.id])]])})})
 io.save.mockResolvedValue(undefined)

 render(<GenerativeRoute/>);const tracker=await screen.findByRole('complementary',{name:'Fare buying tracker'})
 expect(within(tracker).queryByText('London → Paris')).toBeNull();expect(within(tracker).getByText('Madrid → Barcelona')).toBeInTheDocument()
 await userEvent.setup().click(screen.getByRole('button',{name:'Capture agent context'}));await waitFor(()=>expect(io.capture).toHaveBeenCalledOnce())
 expect(io.capture.mock.calls[0]?.[0]).toMatchObject({plannedFareIds:[valid.id],selectedFareFacts:[valid]})
  expect(JSON.stringify(io.capture.mock.calls[0]?.[0])).not.toContain('private-basket-source-v2')
})
it('retains a shared fare and its current source when another owner becomes stale',async()=>{
 const staleOwner=ArtifactIdSchema.parse('stale-shared-owner'),currentOwner=ArtifactIdSchema.parse('current-shared-owner'),savedState=createUIStateStore();savedState.initializeMissing(staleOwner,{});savedState.initializeMissing(currentOwner,{})
 const fact=BoundedFareFactSchema.parse({id:'shared-london-paris',originId:'london',destinationId:'paris',serviceDate:'2026-11-08',mode:'train',carrierId:'rail',carrierName:'Test Rail',priceCents:4200,durationMinutes:150,departureMinutes:540,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true,legs:[{legIndex:0,mode:'train',carrierName:'Test Rail',durationMinutes:150,originId:'london',destinationId:'paris',originLabel:'London',destinationLabel:'Paris'}]})
 const scope={kind:'fareScope' as const,originId:'london',destinationId:'paris',dateWindow:{from:'2026-11-08',to:'2026-11-08'},passengers:1,earliestDeparture:{date:'2026-11-08',minutes:0}}
 const source=(owner:typeof staleOwner,version:string)=>({owner,source:{kind:'search' as const,descriptorId:'shared-london-scope',sourceVersion:version},scope})
 io.load.mockResolvedValue({messages:[],artifacts:[{state:savedState.get(staleOwner)},{state:savedState.get(currentOwner)}],activeArtifactId:currentOwner,plannedFares:[{fact,owners:[staleOwner,currentOwner],sources:[source(staleOwner,'shared-v1'),source(currentOwner,'shared-v2')]}],sceneSnapshots:[]})
 io.restore.mockImplementation(async(_record:unknown,_bridge:unknown,store:UIStateStore,_signal:AbortSignal,onSourceChanged:(change:{clearedSelections:boolean;sourceChangedFareIdsByArtifact:ReadonlyMap<typeof staleOwner,ReadonlySet<typeof fact.id>>})=>void)=>{store.initializeMissing(staleOwner,savedState.get(staleOwner));store.initializeMissing(currentOwner,savedState.get(currentOwner));onSourceChanged({clearedSelections:true,sourceChangedFareIdsByArtifact:new Map([[staleOwner,new Set([fact.id])]])})})
 io.save.mockResolvedValue(undefined)

 render(<GenerativeRoute/>);const tracker=await screen.findByRole('complementary',{name:'Fare buying tracker'})
 expect(within(tracker).getByText('London → Paris')).toBeInTheDocument()
})
it('prunes removed scene snapshots before saving regenerated history',async()=>{
 const owner=ArtifactIdSchema.parse('regenerated-scene'),savedState=createUIStateStore();savedState.initializeMissing(owner,{})
 const messages:UIMessage[]=[{id:'saved-scene',role:'assistant',parts:[{type:'tool-present',toolCallId:'old-scene',state:'output-available',input:{$type:'TravelSurface',artifactRef:owner,title:'Old scene'},output:{}}]}]
 const sceneSnapshots=[{toolCallId:'old-scene',artifactStates:[savedState.get(owner)]}]
 io.load.mockResolvedValue({messages,artifacts:[{state:savedState.get(owner)}],activeArtifactId:owner,plannedFares:[],sceneSnapshots})
 io.restore.mockImplementation(async(_record:unknown,_bridge:unknown,store:UIStateStore)=>{store.initializeMissing(owner,savedState.get(owner))})
 io.save.mockResolvedValue(undefined)

 render(<GenerativeRoute/>);await screen.findByTestId('restored-chat');await userEvent.setup().click(screen.getByRole('button',{name:'Regenerate without old scene'}))

 await waitFor(()=>expect(io.save).toHaveBeenCalled())
 expect(io.save.mock.calls.at(-1)?.[1]).toMatchObject({messages:[],sceneSnapshots:[]})
})
it('can leave a session whose saved travel data fails to restore without overwriting it',async()=>{
 const timestamp='2026-10-07T10:00:00.000Z'
 localStorage.setItem('omio-chat-session-history',JSON.stringify({version:1,activeSessionId:'broken',collapsed:false,sessions:[
  {id:'broken',title:'Broken session',createdAt:timestamp,updatedAt:timestamp},
  {id:'available',title:'Available session',createdAt:timestamp,updatedAt:timestamp},
 ]}))
 const saved={messages:[{id:'saved-user',role:'user',parts:[{type:'text',text:'Do not overwrite me'}]}],artifacts:[],descriptors:[],plannedFares:[],sceneSnapshots:[]}
 io.load.mockImplementation(async(id:string)=>id==='broken'?saved:null)
 io.restore.mockRejectedValue(new Error('API unavailable'))
 render(<GenerativeRoute/>);await screen.findByRole('button',{name:'Retry restoring conversation'})
 fireEvent.click(screen.getByRole('button',{name:'Available session'}))
 await screen.findByTestId('restored-chat')
 expect(io.load).toHaveBeenCalledWith('available')
 expect(io.save).not.toHaveBeenCalled()
})
