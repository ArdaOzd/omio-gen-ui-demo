import { act,render,screen,waitFor } from '@testing-library/react'
import { AssistantRuntimeProvider,fromThreadMessageLike,type ThreadMessageLike,useExternalStoreRuntime } from '@assistant-ui/react'
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import { TravelProvider,type TravelServices } from '../catalog/context'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createUIStateStore } from '../state/ui-state-store'
import { assistantWorkingPuns,ThreadShell } from './thread-shell'

const services={bridge:createFareDataBridge(),state:createUIStateStore(),activate:()=>{},activeId:()=>undefined} satisfies TravelServices

function Chat({messages}:{messages:ThreadMessageLike[]}){
 const runtime=useExternalStoreRuntime({messages,isRunning:messages.at(-1)?.status?.type==='running',convertMessage:value=>fromThreadMessageLike(value,'assistant-test',{type:'complete',reason:'unknown'}),onNew:async()=>{}})
 return <TravelProvider services={services}><AssistantRuntimeProvider runtime={runtime}><ThreadShell/></AssistantRuntimeProvider></TravelProvider>
}

const assistant=(status:NonNullable<ThreadMessageLike['status']>,text='',id='assistant-test'):ThreadMessageLike=>({id,role:'assistant',content:text?[{type:'text',text}]:[],status})

beforeEach(()=>{Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}});vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})})
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();Reflect.deleteProperty(HTMLElement.prototype,'scrollTo')})

describe('assistant message activity',()=>{
 it('describes the current 50 million fare catalog in the empty state',()=>{
  render(<Chat messages={[]}/>)
  expect(screen.getByText(/Explore 50 million synthetic fares/)).toBeVisible()
 })

 it('rotates a random travel pun every five seconds and removes it when work completes',async()=>{
  vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0)
  const view=render(<Chat messages={[assistant({type:'running'})]}/>)
  await act(()=>vi.advanceTimersByTimeAsync(5000))
  expect(screen.getByText('starting the bus…')).toBeInTheDocument()
  view.rerender(<Chat messages={[assistant({type:'complete',reason:'stop'},'Finished answer')]}/>)
  expect(screen.queryByText('starting the bus…')).toBeNull()
  expect(vi.getTimerCount()).toBe(0)
 })

 it('keeps the work line after streamed answer text',async()=>{
  vi.spyOn(Math,'random').mockReturnValue(0)
  render(<Chat messages={[assistant({type:'running'},'Partial answer')]}/>)
  await waitFor(()=>expect(screen.getByText('Partial answer')).toBeInTheDocument())
  expect(screen.getByText('Partial answer').compareDocumentPosition(screen.getByText('oiling the engine…'))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 })

 it('shows the work line for an empty running response but not while action is required',()=>{
  vi.spyOn(Math,'random').mockReturnValue(0)
  const view=render(<Chat messages={[assistant({type:'running'})]}/>)
  expect(screen.getByText('oiling the engine…')).toBeInTheDocument()
  view.rerender(<Chat messages={[assistant({type:'requires-action',reason:'interrupt'})]}/>)
  expect(screen.queryByText('oiling the engine…')).toBeNull()
 })

 it('shows one work line only on the current running assistant message',()=>{
  vi.spyOn(Math,'random').mockReturnValue(0)
  render(<Chat messages={[assistant({type:'complete',reason:'stop'},'Earlier answer','assistant-old'),assistant({type:'running'},'','assistant-current')]}/>)
  const line=screen.getByText('oiling the engine…')
  expect(screen.getAllByText(/engine…$/)).toHaveLength(1)
  expect(line.closest('[data-message-id]')).toHaveAttribute('data-message-id','assistant-current')
 })

 it('chooses a fresh starting pun when the same assistant message starts another run',async()=>{
  vi.spyOn(Math,'random').mockReturnValue(.5)
  const view=render(<Chat messages={[assistant({type:'complete',reason:'stop'},'Earlier answer')]}/>)
  view.rerender(<Chat messages={[assistant({type:'running'})]}/>)
  await waitFor(()=>expect(screen.getByText(`${assistantWorkingPuns[14]}…`)).toBeInTheDocument())
 })

 it('offers Retry only for a real assistant error',()=>{
  const view=render(<Chat messages={[assistant({type:'incomplete',reason:'cancelled'})]}/>)
  expect(screen.queryByRole('button',{name:'Retry response'})).toBeNull()
  view.rerender(<Chat messages={[assistant({type:'incomplete',reason:'length'})]}/>)
  expect(screen.queryByRole('button',{name:'Retry response'})).toBeNull()
  view.rerender(<Chat messages={[assistant({type:'complete',reason:'stop'},'Done')]}/>)
  expect(screen.queryByRole('button',{name:'Retry response'})).toBeNull()
  view.rerender(<Chat messages={[assistant({type:'incomplete',reason:'error',error:'failed'})]}/>)
  expect(screen.getByRole('button',{name:'Retry response'})).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('The assistant could not finish this response.')
 })

 it('keeps the complete requested pun set without duplicates',()=>{
  expect(assistantWorkingPuns).toHaveLength(28)
  expect(new Set(assistantWorkingPuns)).toHaveLength(28)
 })
})
