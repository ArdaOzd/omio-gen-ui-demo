import { act,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { AssistantRuntimeProvider,fromThreadMessageLike,type AppendMessage,type ThreadMessageLike,useExternalStoreRuntime } from '@assistant-ui/react'
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import { TravelProvider,type TravelServices } from '../catalog/context'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createUIStateStore } from '../state/ui-state-store'
import { assistantWorkingPuns,ThreadShell } from './thread-shell'

const services={bridge:createFareDataBridge(),state:createUIStateStore(),activate:()=>{},activeId:()=>undefined} satisfies TravelServices

function Chat({messages,onNew}:{messages:ThreadMessageLike[];onNew?:(message:AppendMessage)=>Promise<void>}){
 const runtime=useExternalStoreRuntime({messages,isRunning:messages.at(-1)?.status?.type==='running',convertMessage:value=>fromThreadMessageLike(value,'assistant-test',{type:'complete',reason:'unknown'}),onNew:onNew??(async()=>{})})
 return <TravelProvider services={services}><AssistantRuntimeProvider runtime={runtime}><ThreadShell/></AssistantRuntimeProvider></TravelProvider>
}

const assistant=(status:NonNullable<ThreadMessageLike['status']>,text='',id='assistant-test'):ThreadMessageLike=>({id,role:'assistant',content:text?[{type:'text',text}]:[],status})

beforeEach(()=>{Object.defineProperty(HTMLElement.prototype,'scrollTo',{configurable:true,value:()=>{}});vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})})
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();Reflect.deleteProperty(HTMLElement.prototype,'scrollTo')})

describe('assistant message activity',()=>{
 it('sends each curated prompt from a concise default option',async()=>{
  const onNew=vi.fn<(message:AppendMessage)=>Promise<void>>(async()=>{}),options=[
   ['Compare price vs time','I’m going from London to Paris on 28 October 2026. Help me choose between saving money and saving time. Show the exact options and make the price-versus-duration tradeoff obvious.'],
   ['Filter a direct trip','Find me a direct London to Paris trip between 26 October and 1 November 2026 for at most €80. Give me a compact shortlist I can add to my trip, with useful filters close by.'],
   ['View a departure board','Show me the London to Paris journeys on 8 November 2026 as a visual departure board. Start with simple route orientation, then put the options in chronological departure and arrival order so I can understand the day at a glance. Finish with a small actionable shortlist and help me choose between saving time and saving money.'],
   ['Pick one journey',"My travel date is fixed: Madrid to Paris on 8 November 2026. I don't need a calendar or a trip planner, and I don't want a long list. Give me a compact pick-one selector with a small alternatives table, plus a clear selected-trip summary and synthetic total as I choose."],
  ] as const
  render(<Chat messages={[]} onNew={onNew}/>)
  for(const [index,[label,prompt]] of options.entries()){
   fireEvent.click(screen.getByRole('button',{name:label}))
   await waitFor(()=>expect(onNew).toHaveBeenCalledTimes(index+1))
   expect(onNew.mock.calls[index]?.[0].content).toEqual([{type:'text',text:prompt}])
  }
 })

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
