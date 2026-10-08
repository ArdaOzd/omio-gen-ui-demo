import { fireEvent,render,screen,waitFor } from '@testing-library/react'
import { beforeEach,expect,it,vi } from 'vitest'
import { type UIMessage } from 'ai'
import { ArtifactIdSchema,type UIStateStore } from './contracts'
const io=vi.hoisted(()=>({load:vi.fn(),restore:vi.fn(),save:vi.fn()}))
vi.mock('./state/persistence',async importOriginal=>({...await importOriginal<typeof import('./state/persistence')>(),createThreadPersistence:()=>io}))
vi.mock('./data/fare-data-bridge',()=>({createFareDataBridge:()=>({})}))
vi.mock('./state/action-router',()=>({createActionRouter:()=>Object.assign(vi.fn(),{whenIdle:async()=>{},dispose:()=>{}})}))
vi.mock('./chat/runtime-provider',()=>({GenerativeChat:({initialMessages,initialRunMessageId}:{initialMessages:UIMessage[];initialRunMessageId?:string})=><div data-testid="restored-chat" data-run-message={initialRunMessageId}>{initialMessages.flatMap(message=>message.parts.map(part=>part.type==='text'?part.text:'')).join(' ')}</div>}))
import { GenerativeRoute } from './routes'
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();sessionStorage.clear();window.history.replaceState({},'','/generative')})
it('keeps the saved conversation untouched when resources fail, then restores it on retry',async()=>{
 const messages=[{id:'saved-user',role:'user',parts:[{type:'text',text:'Preserved travel conversation'}]}]
 io.load.mockResolvedValue({messages,artifacts:[{state:{artifactId:'retained'}}],activeArtifactId:'retained'})
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
it('can leave a session whose saved travel data fails to restore without overwriting it',async()=>{
 const timestamp='2026-10-07T10:00:00.000Z'
 localStorage.setItem('omio-chat-session-history',JSON.stringify({version:1,activeSessionId:'broken',collapsed:false,sessions:[
  {id:'broken',title:'Broken session',createdAt:timestamp,updatedAt:timestamp},
  {id:'available',title:'Available session',createdAt:timestamp,updatedAt:timestamp},
 ]}))
 const saved={messages:[{id:'saved-user',role:'user',parts:[{type:'text',text:'Do not overwrite me'}]}],artifacts:[],descriptors:[]}
 io.load.mockImplementation(async(id:string)=>id==='broken'?saved:null)
 io.restore.mockRejectedValue(new Error('API unavailable'))
 render(<GenerativeRoute/>);await screen.findByRole('button',{name:'Retry restoring conversation'})
 fireEvent.click(screen.getByRole('button',{name:'Available session'}))
 await screen.findByTestId('restored-chat')
 expect(io.load).toHaveBeenCalledWith('available')
 expect(io.save).not.toHaveBeenCalled()
})
