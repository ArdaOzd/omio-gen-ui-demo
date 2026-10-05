import React from 'react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
vi.mock('./components/LandingPage.jsx',()=>({default:({search,onSearch}:{search:unknown;onSearch:(value:unknown)=>void})=><button onClick={()=>onSearch(search)}>Search</button>}))
const summaries={train:{count:32,minimum_price_cents:4110},bus:{count:38,minimum_price_cents:1972},flight:{count:27,minimum_price_cents:3603},ferry:{count:0}}
const trip=(mode:string,company:string)=>({id:mode,mode,company,departure_time:'2026-10-04T07:03:00',arrival_time:'2026-10-04T09:03:00',duration_minutes:120,origin:'London',destination:'Paris',price:41.1,available_seats:4,transfers:0})
const response=(mode:string,summary=summaries)=>({outbound:{results:mode?[trip(mode,mode==='train'?'Eurostar':'Bus operator')]:[],mode_summaries:summary,total:mode?summary[mode as keyof typeof summaries].count:0,page:1,limit:20}})
afterEach(()=>vi.unstubAllGlobals())
function mockSearch(search:(url:URL)=>Promise<unknown>){vi.stubGlobal('React',React);vi.stubGlobal('scrollTo',vi.fn());vi.stubGlobal('fetch',vi.fn(async input=>{const url=new URL(String(input),'http://localhost');const body=url.pathname==='/api/search'?await search(url):url.pathname==='/api/metadata'?{timetable:{start_date:'2026-01-01',end_date:'2027-12-31'}}:{locations:[]};return new Response(JSON.stringify(body))}))}
const start=()=>{render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Search'}))}
describe('classic search resolves paged results for its selected mode',()=>{
 it('shows actual trains even when the all-mode price page contains only cheaper buses',async()=>{
  const modes:string[]=[];mockSearch(async url=>{const mode=url.searchParams.get('mode')!;modes.push(mode);return response(mode==='all'?'bus':mode)})
  start();await screen.findByText('Eurostar');expect(modes).toEqual(['all','train']);expect(screen.getByRole('radio',{name:/Trains/})).toHaveAttribute('aria-checked','true');expect(screen.queryByText('No trains match this search')).not.toBeInTheDocument();expect(screen.getByText('32 options')).toBeVisible()
 })
 it('fetches the first available fallback mode',async()=>{
  const modes:string[]=[];const summary={...summaries,train:{count:0,minimum_price_cents:0}};mockSearch(async url=>{const mode=url.searchParams.get('mode')!;modes.push(mode);return response(mode==='all'?'flight':mode,summary)})
  start();await screen.findByText('Bus operator');expect(modes).toEqual(['all','bus']);await waitFor(()=>expect(screen.getByRole('radio',{name:/Buses/})).toHaveAttribute('aria-checked','true'))
 })
 it('preserves an actual empty search without inventing a mode or issuing a second fetch',async()=>{
  const modes:string[]=[];const summary={train:{count:0,minimum_price_cents:0},bus:{count:0,minimum_price_cents:0},flight:{count:0,minimum_price_cents:0},ferry:{count:0}};mockSearch(async url=>{modes.push(url.searchParams.get('mode')!);return response('',summary)})
  start();await screen.findByText('No trains match this search');expect(modes).toEqual(['all']);expect(screen.queryByText('Eurostar')).not.toBeInTheDocument()
 })
 it('does not replace a newer mode search with an obsolete discovered-mode response',async()=>{
  const user=userEvent.setup()
  let resolveTrain!:(value:unknown)=>void;const train=new Promise(resolve=>{resolveTrain=resolve});mockSearch(async url=>{const mode=url.searchParams.get('mode');if(mode==='train')return train;return response(mode==='all'?'bus':'bus')})
  start();await waitFor(()=>expect(vi.mocked(fetch).mock.calls.some(([input])=>String(input).includes('mode=train'))).toBe(true));await user.click(screen.getByRole('radio',{name:/Buses/}));await screen.findByText('Bus operator');await act(async()=>resolveTrain(response('train')));await waitFor(()=>expect(screen.getByRole('radio',{name:/Buses/})).toHaveAttribute('aria-checked','true'));expect(screen.queryByText('Eurostar')).not.toBeInTheDocument()
 })
})
