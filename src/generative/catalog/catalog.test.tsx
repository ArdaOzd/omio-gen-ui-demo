import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createUIStateStore } from '../state/ui-state-store'
import { ArtifactIdSchema, FareRowSchema, type FareRow, type BoundedQueryResult } from '../contracts'
import { TravelProvider, useTravelQuery, filterPredicate } from './context'
import { CatalogNode } from './component'
const artifactId=ArtifactIdSchema.parse('artifact-1')
const fare=(id:string,mode:'train'|'bus',price:number):FareRow=>FareRowSchema.parse({id,originId:'london',destinationId:'paris',serviceDate:'2026-10-09',mode,carrierId:mode==='train'?'eurostar':'flixbus',carrierName:mode==='train'?'Eurostar':'FlixBus',priceCents:price,durationMinutes:mode==='train'?140:470,departureMinutes:600,availableSeats:10,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})
async function setup(options:Parameters<typeof createFareDataBridge>[0]={}){
 const bridge=createFareDataBridge({pageSource:async()=>({rows:[fare('f1','train',5500),fare('f2','bus',2300)],total:2,page:1,pages:1,sourceVersion:'fixture-v1'}),...options})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-09'},modes:['train','bus'],passengers:2},new AbortController().signal)
 const state=createUIStateStore();state.initializeMissing(artifactId,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-09'}})
 const services={bridge,state,activate:()=>{},activeId:()=>artifactId}
 return{services,manifest,state}
}
describe('shared direct travel controls',()=>{
 it('updates siblings, selections and synthetic totals locally across repeated revisions',async()=>{
  const{services,state}=await setup()
  render(<TravelProvider services={services}><CatalogNode kind="ModeChips" artifactRef={artifactId}/><CatalogNode kind="FareCards" artifactRef={artifactId}/><CatalogNode kind="SyntheticTotal" artifactRef={artifactId}/></TravelProvider>)
  await screen.findByText('Eurostar');expect(screen.getByText('FlixBus')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Train'}));await waitFor(()=>expect(screen.queryByText('FlixBus')).not.toBeInTheDocument())
  fireEvent.click(screen.getByRole('button',{name:'Train'}));await screen.findByText('FlixBus')
  fireEvent.click(screen.getByRole('button',{name:/Select Bus FlixBus/}));await screen.findByText('€46.00')
  expect(state.get(artifactId).revision).toBe(3);expect(state.get(artifactId).selectedFareIds).toHaveLength(1)
 })
 it('allows complete controls during streaming without overwriting a newer click',async()=>{
  const{services,state}=await setup()
  const view=render(<TravelProvider services={services}><CatalogNode kind="ModeChips" artifactRef={artifactId} $status="streaming"/></TravelProvider>)
  fireEvent.click(screen.getByRole('button',{name:'Bus'}));const revision=state.get(artifactId).revision
  view.rerender(<TravelProvider services={services}><CatalogNode kind="ModeChips" artifactRef={artifactId} $status="done"/></TravelProvider>)
  expect(screen.getByRole('button',{name:'Bus'})).toHaveAttribute('aria-pressed','true');expect(state.get(artifactId).revision).toBe(revision)
 })
})

it('moves tab focus with arrow keys and keeps roving focus in the selected tab',async()=>{
 const{services}=await setup()
 render(<TravelProvider services={services}><CatalogNode kind="Tabs" artifactRef={artifactId}><p>Calendar</p><p>Timeline</p></CatalogNode></TravelProvider>)
 const tabs=screen.getAllByRole('tab');tabs[0]?.focus();fireEvent.keyDown(tabs[0]!,{key:'ArrowRight'})
 expect(tabs[1]).toHaveFocus();expect(tabs[1]).toHaveAttribute('aria-selected','true')
 fireEvent.keyDown(tabs[1]!,{key:'Home'});expect(tabs[0]).toHaveFocus()
 expect(fireEvent.keyDown(tabs[0]!,{key:'ArrowRight',altKey:true})).toBe(true);expect(tabs[0]).toHaveFocus();expect(tabs[0]).toHaveAttribute('aria-selected','true')
})

it('keeps explicit leg mode controls separate from the global mode filter',async()=>{
 const{services,state,manifest}=await setup()
 render(<TravelProvider services={services}><CatalogNode kind="ModeChips" artifactRef={artifactId} datasetRef={manifest.datasetId}/><CatalogNode kind="FareCards" artifactRef={artifactId} datasetRef={manifest.datasetId}/></TravelProvider>)
 fireEvent.click(screen.getByRole('button',{name:'Bus'}))
 await screen.findByText('FlixBus');await waitFor(()=>expect(screen.queryByText('Eurostar')).not.toBeInTheDocument())
 expect(state.get(artifactId).filters.modes).toEqual([]);expect(state.get(artifactId).modesByLeg['london:paris']).toEqual(['bus'])
})

it.each(['ComparisonTable','PriceCalendar'])('explains a ready empty %s result instead of leaving a blank view',async kind=>{
 const{services,state,manifest}=await setup();state.dispatch({kind:'filters',artifactId,filters:{...state.get(artifactId).filters,maxPriceCents:0}})
 render(<TravelProvider services={services}><CatalogNode kind={kind} artifactRef={artifactId} datasetRef={manifest.datasetId}/></TravelProvider>)
 await screen.findByText('No options match. Try another mode, date, or price limit.')
 expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();expect(screen.queryByText('€0.00')).not.toBeInTheDocument()
})


it('renders granular route and fare surfaces while retaining the selected fare and filters',async()=>{
 const{services,state,manifest}=await setup()
 state.dispatch({kind:'stays',artifactId,stays:[{cityId:'london',nights:0},{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}]})
 state.dispatch({kind:'filters',artifactId,filters:{...state.get(artifactId).filters,modes:['bus']}})
 state.dispatch({kind:'select',artifactId,fareId:FareRowSchema.parse(fare('f2','bus',2300)).id,selected:true})
 const before=state.get(artifactId)
 const view=render(<TravelProvider services={services}><CatalogNode kind="RouteMap" artifactRef={artifactId} datasetRef={manifest.datasetId}/><CatalogNode kind="CitySequence" artifactRef={artifactId}/><CatalogNode kind="FarePicker" artifactRef={artifactId} datasetRef={manifest.datasetId}/><CatalogNode kind="FareCards" artifactRef={artifactId} datasetRef={manifest.datasetId}/></TravelProvider>)
 const picker=await screen.findByRole('combobox',{name:'Choose a synthetic fare'})
 expect(picker).toHaveValue('f2')
 expect(screen.getByRole('img',{name:'Schematic route: London to Paris to Barcelona'})).toBeInTheDocument()
 expect(screen.getByRole('list',{name:'Travel stops'})).toHaveTextContent('LondonParis2 nightsBarcelona4 nights')
 expect(view.container.querySelectorAll('.travel-fares')).toHaveLength(1)
 expect(screen.getAllByRole('heading',{name:'Your options'})).toHaveLength(1)
 expect(state.get(artifactId)).toEqual(before)
 fireEvent.change(picker,{target:{value:''}})
 await waitFor(()=>expect(state.get(artifactId).selectedFareIds).toEqual([]))
 expect(state.get(artifactId).filters.modes).toEqual(['bus'])
 fireEvent.change(await screen.findByRole('combobox',{name:'Choose a synthetic fare'}),{target:{value:'f2'}})
 await waitFor(()=>expect(state.get(artifactId).selectedFareIds).toEqual(['f2']))
})

it('keeps the selected fare button mounted and focused when only selection changes',async()=>{
 const{services}=await setup()
 render(<TravelProvider services={services}><CatalogNode kind="FareCards" artifactRef={artifactId}/><CatalogNode kind="SyntheticTotal" artifactRef={artifactId}/></TravelProvider>)
 const button=await screen.findByRole('button',{name:/Select Bus FlixBus/})
 button.focus();fireEvent.click(button)
 await screen.findByText('€46.00')
 expect(button).toBeInTheDocument();expect(button).toHaveFocus();expect(button).toHaveAttribute('aria-pressed','true')
})


function PendingQueryProbe(){
 const result=useTravelQuery(artifactId,undefined,(state,id)=>({version:1,sources:[{datasetRef:id,alias:'f'}],where:state.filters.modes.length?{field:'mode',op:'in',value:state.filters.modes}:undefined,limit:1}))
 return <p data-testid="pending-query">{result.status}:{String(result.data?.rows[0]?.mode??'')}</p>
}

it('accepts an in-flight unchanged query after a selection revision without restarting it',async()=>{
 const{services,state,manifest}=await setup();let complete:(value:BoundedQueryResult)=>void=()=>{}
 const query=vi.spyOn(services.bridge,'query').mockImplementation(()=>new Promise(resolve=>{complete=resolve}))
 render(<TravelProvider services={services}><PendingQueryProbe/></TravelProvider>)
 await waitFor(()=>expect(query).toHaveBeenCalledTimes(1))
 act(()=>{state.dispatch({kind:'select',artifactId,fareId:fare('f2','bus',2300).id,selected:true})})
 await act(async()=>{complete({rows:[{mode:'bus'}],total:1,truncated:false,datasetRevision:manifest.revision,requestId:'same-query'})})
 expect(query).toHaveBeenCalledTimes(1);expect(screen.getByTestId('pending-query')).toHaveTextContent('ready:bus')
})

it('aborts a changed query and rejects its late result after a newer filtered result',async()=>{
 const{services,state,manifest}=await setup();const pending:Array<{signal:AbortSignal;complete:(value:BoundedQueryResult)=>void}>=[]
 vi.spyOn(services.bridge,'query').mockImplementation((_query,signal)=>new Promise(resolve=>{pending.push({signal,complete:resolve})}))
 render(<TravelProvider services={services}><PendingQueryProbe/></TravelProvider>)
 await waitFor(()=>expect(pending).toHaveLength(1))
 act(()=>{state.dispatch({kind:'filters',artifactId,filters:{...state.get(artifactId).filters,modes:['bus']}})})
 await waitFor(()=>expect(pending).toHaveLength(2));expect(pending[0]?.signal.aborted).toBe(true)
 await act(async()=>{pending[1]?.complete({rows:[{mode:'bus'}],total:1,truncated:false,datasetRevision:manifest.revision,requestId:'new-query'})})
 await act(async()=>{pending[0]?.complete({rows:[{mode:'train'}],total:1,truncated:false,datasetRevision:manifest.revision,requestId:'old-query'})})
 expect(screen.getByTestId('pending-query')).toHaveTextContent('ready:bus')
})


it('filters inclusive date windows while single dates and date-free summaries retain their contracts',async()=>{
 const{state}=await setup()
 expect(filterPredicate(state.get(artifactId))).toEqual({all:[{field:'serviceDate',op:'eq',value:'2026-10-09'}]})
 state.dispatch({kind:'dates',artifactId,dates:{start:'2026-10-09',end:'2026-10-15'}})
 expect(filterPredicate(state.get(artifactId))).toEqual({all:[{field:'serviceDate',op:'between',value:['2026-10-09','2026-10-15']}]})
 expect(filterPredicate(state.get(artifactId),false)).toBeUndefined()
})


it('keeps an outside-cache date loading until real coverage arrives rather than claiming no fares',async()=>{
 const{services,state,manifest}=await setup({pageSource:async input=>({rows:input.date==='2026-10-09'?[fare('f2','bus',2300)]:[],total:input.date==='2026-10-09'?1:0,page:1,pages:1,sourceVersion:'fixture-v1'})})
 render(<TravelProvider services={services}><CatalogNode kind="FareCards" artifactRef={artifactId} datasetRef={manifest.datasetId}/></TravelProvider>)
 await screen.findByText('FlixBus')
 act(()=>{state.dispatch({kind:'dates',artifactId,dates:{start:'2026-10-10'}})})
 expect(await screen.findByRole('status')).toHaveTextContent('Finding your options')
 expect(screen.queryByText('No options match. Try another mode, date, or price limit.')).not.toBeInTheDocument()
 const fresh=await services.bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-10',to:'2026-10-10'},modes:['train','bus'],passengers:2},new AbortController().signal)
 act(()=>{state.dispatch({kind:'datasets',artifactId,datasetRefs:[manifest.datasetId,fresh.datasetId]})})
 await screen.findByText('No options match. Try another mode, date, or price limit.')
})
