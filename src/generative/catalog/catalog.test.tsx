import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createUIStateStore } from '../state/ui-state-store'
import { ArtifactIdSchema } from '../contracts'
import { FareItemSchema, type FareItem, type FareScope } from '../contracts/query-groups'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { TravelProvider, useOrderedFares, filterPredicate } from './context'
import { CatalogNode } from './component'
const artifactId=ArtifactIdSchema.parse('artifact-1')
const fare=(id:string,mode:'train'|'bus',price:number):FareItem=>FareItemSchema.parse({id,originId:'london',destinationId:'paris',serviceDate:'2026-10-09',mode,carrierId:mode==='train'?'eurostar':'flixbus',carrierName:mode==='train'?'Eurostar':'FlixBus',priceCents:price,durationMinutes:mode==='train'?140:470,departureMinutes:600,availableSeats:10,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true,legs:[{legIndex:0,mode,carrierName:mode==='train'?'Eurostar':'FlixBus',durationMinutes:mode==='train'?140:470,originId:'london',destinationId:'paris',originLabel:'London',destinationLabel:'Paris'}]})
async function setup(rows:readonly FareItem[]|((scope:FareScope,signal:AbortSignal)=>readonly FareItem[])=[fare('f1','train',5500),fare('f2','bus',2300)]){
 const fixed=createFixedProjectionFixture({rows,sourceVersion:'fixture-v1'})
 const bridge=fixed.bridge
 const scope=fixed.scope({originId:'london',destinationId:'paris',dateWindow:{from:'2026-10-09',to:'2026-10-09'},passengers:2,earliestDeparture:{date:'2026-10-09',minutes:0}})
 const loaded=await bridge.loadScope(scope,new AbortController().signal),binding=bridge.getBinding(loaded.resourceKey)
 const manifest={...binding,revision:binding.datasetRevision,source:binding.manifest.source}
 const state=createUIStateStore();state.initializeMissing(artifactId,{datasetRefs:[binding.datasetId],dates:{start:'2026-10-09'}})
 const services={bridge,state,activate:()=>{},activeId:()=>artifactId}
 return{services,manifest,state,fixed}
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
 it('applies the global sort control to legacy fare views',async()=>{
  const rows=[
   {...fare('lowest','bus',1000),durationMinutes:500,departureMinutes:700},
   {...fare('highest','train',9000),durationMinutes:300,departureMinutes:500},
   {...fare('fastest','train',5000),durationMinutes:60,departureMinutes:900},
  ]
  const{services}=await setup(rows)
  render(<TravelProvider services={services}><CatalogNode kind="SortSelect" artifactRef={artifactId}/><CatalogNode kind="FareCards" artifactRef={artifactId}/></TravelProvider>)
  const first=()=>within(screen.getAllByRole('article')[0]!)
  await waitFor(()=>expect(first().getByText('€10.00')).toBeInTheDocument())
  fireEvent.change(screen.getByLabelText('Sort options'),{target:{value:'priceCents:desc'}})
  await waitFor(()=>expect(first().getByText('€90.00')).toBeInTheDocument())
  fireEvent.change(screen.getByLabelText('Sort options'),{target:{value:'durationMinutes:asc'}})
  await waitFor(()=>expect(first().getByText('1h 0m',{exact:false})).toBeInTheDocument())
 })
 it('keeps every fare available through bounded seven-row pages',async()=>{
  const rows=Array.from({length:21},(_,index)=>fare(`fare-${index+1}`,'train',1000+index*100))
  const{services,state}=await setup(rows)
  render(<TravelProvider services={services}><CatalogNode kind="FareCards" artifactRef={artifactId}/></TravelProvider>)
  await waitFor(()=>expect(screen.getAllByRole('article')).toHaveLength(7))
  const list=screen.getByRole('region',{name:'Fare options'})
  expect(list).toHaveAttribute('data-scrollable','false');expect(list).not.toHaveAttribute('tabindex')
  expect(screen.getByText('21 matches · Synthetic fares per passenger')).toBeVisible()
  fireEvent.click(screen.getByRole('button',{name:'Next'}));await screen.findByText('Page 2')
  fireEvent.click(screen.getByRole('button',{name:/Select Train Eurostar 10:00 €17.00/}))
  expect(state.get(artifactId).selectedFareIds).toEqual(['fare-8'])
 })
 it('does not make a seven-fare list a separate scroll stop',async()=>{
  const rows=Array.from({length:7},(_,index)=>fare(`fare-${index+1}`,'train',1000+index*100))
  const{services}=await setup(rows)
  render(<TravelProvider services={services}><CatalogNode kind="FareCards" artifactRef={artifactId}/></TravelProvider>)
  await waitFor(()=>expect(screen.getAllByRole('article')).toHaveLength(7))
  const list=screen.getByRole('region',{name:'Fare options'})
  expect(list).toHaveAttribute('data-scrollable','false');expect(list).not.toHaveAttribute('tabindex')
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
 if(kind==='PriceCalendar'){await screen.findByText('No fare');expect(screen.getByText('0 options')).toBeVisible()}
 else await screen.findByText('No options match. Try another mode, date, or price limit.')
 expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();expect(screen.queryByText('€0.00')).not.toBeInTheDocument()
})


it('renders granular route and fare surfaces while retaining the selected fare and filters',async()=>{
 const{services,state,manifest}=await setup()
 state.dispatch({kind:'stays',artifactId,stays:[{cityId:'london',nights:0},{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}]})
 state.dispatch({kind:'route',artifactId,citySequence:['london','paris','barcelona']})
 state.dispatch({kind:'filters',artifactId,filters:{...state.get(artifactId).filters,modes:['bus']}})
 state.dispatch({kind:'select',artifactId,fareId:fare('f2','bus',2300).id,selected:true})
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
 const result=useOrderedFares(artifactId,{componentRef:'pending-query',purpose:'ordered',limit:1})
 return <p data-testid="pending-query">{result.queryState.status}:{String(result.data?.items[0]?.mode??'')}</p>
}

it('accepts an in-flight unchanged query after a selection revision without restarting it',async()=>{
 const{services,state,fixed}=await setup();state.dispatch({kind:'filters',artifactId,filters:{...state.get(artifactId).filters,modes:['bus']}})
 const original=fixed.client.queryGroups.bind(fixed.client);let complete=()=>{}
 const query=vi.spyOn(fixed.client,'queryGroups').mockImplementation((request,signal)=>new Promise(resolve=>{complete=()=>{void original(request,signal).then(resolve)}}))
 render(<TravelProvider services={services}><PendingQueryProbe/></TravelProvider>)
 await waitFor(()=>expect(query).toHaveBeenCalledTimes(1))
 act(()=>{state.dispatch({kind:'select',artifactId,fareId:fare('f2','bus',2300).id,selected:true})})
 await act(async()=>{complete()})
 expect(query).toHaveBeenCalledTimes(1);expect(screen.getByTestId('pending-query')).toHaveTextContent('ready:bus')
})

it('aborts a changed query and rejects its late result after a newer filtered result',async()=>{
 const{services,state,fixed}=await setup();const original=fixed.client.queryGroups.bind(fixed.client);const pending:Array<{signal:AbortSignal;complete:()=>void}>=[]
 vi.spyOn(fixed.client,'queryGroups').mockImplementation((request,signal)=>new Promise(resolve=>{pending.push({signal,complete:()=>{void original(request,new AbortController().signal).then(resolve)}})}))
 render(<TravelProvider services={services}><PendingQueryProbe/></TravelProvider>)
 await waitFor(()=>expect(pending).toHaveLength(1))
 act(()=>{state.dispatch({kind:'filters',artifactId,filters:{...state.get(artifactId).filters,modes:['bus']}})})
 await waitFor(()=>expect(pending).toHaveLength(2));expect(pending[0]?.signal.aborted).toBe(true)
 await act(async()=>{pending[1]?.complete()})
 await act(async()=>{pending[0]?.complete()})
 expect(screen.getByTestId('pending-query')).toHaveTextContent('ready:bus')
})


it('filters inclusive date windows while single dates and date-free summaries retain their contracts',async()=>{
 const{state}=await setup()
 expect(filterPredicate(state.get(artifactId))).toEqual({all:[{field:'serviceDate',op:'eq',value:'2026-10-09'}]})
 state.dispatch({kind:'dates',artifactId,dates:{start:'2026-10-09',end:'2026-10-15'}})
 expect(filterPredicate(state.get(artifactId))).toEqual({all:[{field:'serviceDate',op:'between',value:['2026-10-09','2026-10-15']}]})
 expect(filterPredicate(state.get(artifactId),false)).toBeUndefined()
})


it('queries an outside-cache date through a bounded server projection',async()=>{
 const{services,state,manifest}=await setup(scope=>scope.dateWindow.from==='2026-10-09'?[fare('f2','bus',2300)]:[])
 render(<TravelProvider services={services}><CatalogNode kind="FareCards" artifactRef={artifactId} datasetRef={manifest.datasetId}/></TravelProvider>)
 await screen.findByText('FlixBus')
 act(()=>{state.dispatch({kind:'displayWindowByLeg',artifactId,displayWindowByLeg:{'london:paris':{from:'2026-10-10',to:'2026-10-10'}}})})
 await screen.findByText('No options match. Try another mode, date, or price limit.')
})
