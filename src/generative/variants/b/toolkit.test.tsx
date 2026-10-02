import {afterEach,expect,it} from 'vitest'
import {cleanup,render,screen} from '@testing-library/react'
import {hasAcceptedRepairAfter,SceneToolFrame} from './toolkit'
afterEach(cleanup)
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
