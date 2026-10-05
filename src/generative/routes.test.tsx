import { fireEvent,render,screen,waitFor } from '@testing-library/react'
import { beforeEach,expect,it,vi } from 'vitest'
import { type UIMessage } from 'ai'
import { ArtifactIdSchema,type UIStateStore } from './contracts'
const io=vi.hoisted(()=>({load:vi.fn(),restore:vi.fn(),save:vi.fn()}))
vi.mock('./state/persistence',async importOriginal=>({...await importOriginal<typeof import('./state/persistence')>(),createThreadPersistence:()=>io}))
vi.mock('./data/fare-data-bridge',()=>({createFareDataBridge:()=>({})}))
vi.mock('./state/action-router',()=>({createActionRouter:()=>Object.assign(vi.fn(),{whenIdle:async()=>{},dispose:()=>{}})}))
vi.mock('./chat/runtime-provider',()=>({GenerativeChat:({initialMessages}:{initialMessages:UIMessage[]})=><div data-testid="restored-chat">{initialMessages.flatMap(message=>message.parts.map(part=>part.type==='text'?part.text:'')).join(' ')}</div>}))
import { GenerativeRoute } from './routes'
beforeEach(()=>vi.clearAllMocks())
it('keeps the saved conversation untouched when resources fail, then restores it on retry',async()=>{
 const messages=[{id:'saved-user',role:'user',parts:[{type:'text',text:'Preserved travel conversation'}]}]
 io.load.mockResolvedValue({messages,artifacts:[{state:{artifactId:'retained'}}],activeArtifactId:'retained'})
 io.restore.mockRejectedValueOnce(new Error('API unavailable')).mockImplementationOnce(async(_record:unknown,_bridge:unknown,store:UIStateStore)=>{store.initializeMissing(ArtifactIdSchema.parse('retained'),{})})
 render(<GenerativeRoute/>);await screen.findByRole('button',{name:'Retry restoring conversation'});expect(screen.queryByTestId('restored-chat')).toBeNull();expect(io.save).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Retry restoring conversation'}));await waitFor(()=>expect(screen.getByTestId('restored-chat').textContent).toBe('Preserved travel conversation'));expect(io.load).toHaveBeenCalledTimes(2);expect(io.save).not.toHaveBeenCalled();
})
