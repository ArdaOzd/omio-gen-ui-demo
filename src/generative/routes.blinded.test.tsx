import {describe,expect,it,vi} from 'vitest'
import {render,screen} from '@testing-library/react'
import {GenerativeRoute} from './routes'
import {Study} from './experiments/study'
vi.mock('./variants/b/toolkit',()=>({default:{}}))
vi.mock('./state/persistence',()=>({ThreadConflictError:class extends Error{},createThreadPersistence:()=>({load:async()=>undefined,save:async()=>undefined}),createIndexedDBStorage:()=>({read:async()=>undefined})}))
vi.mock('./chat/runtime-provider',()=>({GenerativeChat:()=> <main>Travel task controls</main>}))
describe('blinded native route keeps engineering diagnostics out of human review',()=>{
 it.each(['a','b'] as const)('hides framework navigation and source diagnostics in blinded %s',async variant=>{
  render(<GenerativeRoute variant={variant} blinded/>);await screen.findByText('Travel task controls');expect(screen.queryByText('Developer conversation diagnostics')).not.toBeInTheDocument();expect(screen.queryByRole('textbox',{name:'Conversation diagnostics'})).not.toBeInTheDocument();expect(screen.queryByText(/Version [AB]/)).not.toBeInTheDocument()
 })
 it('applies the blind boundary to the actual study route while retaining its task form',async()=>{
  render(<Study/>);await screen.findByText('Travel task controls');expect(screen.getByText('Travel interface review · round 1 of 2')).toBeInTheDocument();expect(screen.queryByText('Developer conversation diagnostics')).not.toBeInTheDocument()
 })
 it('keeps source diagnostics available on the unblinded engineering route',async()=>{
  render(<GenerativeRoute variant="b"/>);await screen.findByText('Travel task controls');expect(screen.getByText('Developer conversation diagnostics')).toBeInTheDocument();expect(screen.getByText('Version B · Signed-in Codex')).toBeInTheDocument()
 })
})
