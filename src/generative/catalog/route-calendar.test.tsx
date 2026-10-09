import {afterEach,expect,it} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {ArtifactIdSchema,FareIdSchema} from '../contracts'
import type {FareItem,FareScope} from '../contracts/query-groups'
import {createFixedProjectionFixture} from '../testing/fixed-projection-fixture'
import {createUIStateStore} from '../state/ui-state-store'
import {createActionRouter} from '../state/action-router'
import {tripDatesForLegDeparture} from '../state/leg-bindings'
import {TravelProvider} from './context'
import {CatalogNode} from './component'

const id=ArtifactIdSchema.parse('review-art')
const window={from:'2026-10-03',to:'2026-10-09'}

function dates(from:string,to:string){
 const values:string[]=[]
 for(let current=Date.parse(`${from}T00:00:00.000Z`),last=Date.parse(`${to}T00:00:00.000Z`);current<=last;current+=86_400_000)values.push(new Date(current).toISOString().slice(0,10))
 return values
}
function fare(scope:FareScope,date:string):FareItem{
 return{id:FareIdSchema.parse(`${scope.originId}-${scope.destinationId}-${date}`),originId:scope.originId,destinationId:scope.destinationId,serviceDate:date,mode:'train',carrierId:'rail',carrierName:'Fixture Rail',priceCents:1000,durationMinutes:120,departureMinutes:600,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true,legs:[{legIndex:0,mode:'train',carrierName:'Fixture Rail',durationMinutes:120,originId:scope.originId,destinationId:scope.destinationId,originLabel:scope.originId,destinationLabel:scope.destinationId}]}
}
const fixed=(sourceDateWindow?:FareScope['dateWindow'])=>createFixedProjectionFixture({rows:scope=>dates(scope.dateWindow.from,scope.dateWindow.to).map(date=>fare(scope,date)),sourceVersion:'route-calendar-v1',...(sourceDateWindow?{sourceDateWindow}:{})})
async function load(fixture:ReturnType<typeof fixed>,originId:string,destinationId:string,dateWindow=window){
 const manifest=await fixture.bridge.loadScope(fixture.scope({originId,destinationId,dateWindow,passengers:1,earliestDeparture:{date:dateWindow.from,minutes:0}}),new AbortController().signal)
 return fixture.bridge.getBinding(manifest.resourceKey)
}

afterEach(cleanup)

it('selects the actual second-leg departure without moving the trip window',async()=>{
 const fixture=fixed(),state=createUIStateStore(),first=await load(fixture,'london','paris'),second=await load(fixture,'paris','barcelona')
 state.initializeMissing(id,{datasetRefs:[first.datasetId,second.datasetId],citySequence:['london','paris','barcelona'],dates:{start:'2026-10-03'},stays:[{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}],availableModesByLeg:{'london:paris':['train'],'paris:barcelona':['train']}})
 const router=createActionRouter(state,{bridge:fixture.bridge}),services={bridge:fixture.bridge,state,dispatch:router,activeId:()=>id,activate:()=>{}}
 render(<TravelProvider services={services}><CatalogNode kind="PriceCalendar" artifactRef={id} datasetRef={second.datasetId}/></TravelProvider>)
 const button=await screen.findByRole('button',{name:/Tue 6 Oct/});fireEvent.click(button);await router.whenIdle(id)
 expect(state.get(id).dates.start).toBe('2026-10-03')
 expect(state.get(id).calendarDateByLeg['paris:barcelona']).toBe('2026-10-06')
 expect(button).toHaveAttribute('aria-pressed','true')
 router.dispose()
})

it('includes the first route origin with legal destination-only stay allocations',async()=>{
 const fixture=fixed(),state=createUIStateStore();const manifest=await load(fixture,'london','paris')
 state.initializeMissing(id,{datasetRefs:[manifest.datasetId],citySequence:['london','paris','barcelona'],stays:[{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}]})
 render(<TravelProvider services={{bridge:fixture.bridge,state,activeId:()=>id,activate:()=>{}}}><CatalogNode kind="RouteMap" artifactRef={id}/></TravelProvider>)
 expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Schematic route: London to Paris to Barcelona')
})

it('keeps date selection and fare selection stationary while arrows alone page the visible week',async()=>{
 const fixture=fixed({from:'2026-10-03',to:'2026-10-12'}),state=createUIStateStore(),binding=await load(fixture,'london','paris')
 const staleBinding=await load(fixture,'london','paris')
 state.initializeMissing(id,{datasetRefs:[binding.datasetId],citySequence:['london','paris'],dates:{start:'2026-10-03'},displayWindowByLeg:{'london:paris':window},availableModesByLeg:{'london:paris':['train']}})
 const router=createActionRouter(state,{bridge:fixture.bridge}),services={bridge:fixture.bridge,state,dispatch:router,activeId:()=>id,activate:()=>{}}
 render(<TravelProvider services={services}><CatalogNode kind="PriceCalendar" artifactRef={id} datasetRef={binding.datasetId}/><CatalogNode kind="FareCards" artifactRef={id} datasetRef={binding.datasetId}/></TravelProvider>)
 const day=await screen.findByRole('button',{name:/Tue 6 Oct/});fireEvent.click(day);await router.whenIdle(id)
 expect(state.get(id)).toMatchObject({dates:{start:'2026-10-03'},displayWindowByLeg:{'london:paris':window},calendarDateByLeg:{'london:paris':'2026-10-06'},selectedFareIds:[]})
 expect(state.exportSnapshot(id).calendarDateByLeg['london:paris']).toBe('2026-10-06')
 expect(day).toHaveAttribute('aria-pressed','true')
 expect(screen.getByRole('button',{name:/Sat 3 Oct/})).toBeInTheDocument()
 expect(screen.getByRole('button',{name:/Fri 9 Oct/})).toBeInTheDocument()

 fireEvent.click(screen.getByRole('button',{name:'Add cheapest fare on 2026-10-03 to trip'}));await router.whenIdle(id)
 expect(state.get(id).displayWindowByLeg['london:paris']).toEqual(window)
 expect(state.get(id).calendarDateByLeg['london:paris']).toBe('2026-10-06')
 const staleAdd=screen.getByRole('button',{name:'Add cheapest fare on 2026-10-05 to trip'})

 fireEvent.click(screen.getByRole('button',{name:'Next dates'}));await router.whenIdle(id)
 expect(state.get(id).dates).toEqual({start:'2026-10-03'})
 expect(state.get(id).displayWindowByLeg['london:paris']).toEqual({from:'2026-10-10',to:'2026-10-16'})
 state.dispatch({kind:'datasets',artifactId:id,datasetRefs:[staleBinding.datasetId]})
 const nextDay=await screen.findByRole('button',{name:/Sat 10 Oct/});await waitFor(()=>expect(nextDay).toBeDisabled())
 expect(screen.queryByRole('button',{name:/Tue 6 Oct/})).not.toBeInTheDocument()
 expect(screen.queryByRole('button',{name:/Tue 13 Oct/})).not.toBeInTheDocument()
 expect(screen.getByRole('button',{name:'Next dates'})).toBeEnabled()
 expect(state.get(id).calendarDateByLeg['london:paris']).toBe('2026-10-06')
 fireEvent.click(staleAdd)
 expect(state.get(id).selectedFareIds).toEqual([FareIdSchema.parse('london-paris-2026-10-03')])
 const previous=screen.getByRole('button',{name:'Previous dates'});await waitFor(()=>expect(previous).toBeEnabled())
 fireEvent.click(previous);await router.whenIdle(id)
 const restored=await screen.findByRole('button',{name:/Tue 6 Oct/})
 expect(restored).toHaveAttribute('aria-pressed','true')
 expect(state.get(id).selectedFareIds).toEqual([FareIdSchema.parse('london-paris-2026-10-03')])
 const monday=screen.getByRole('button',{name:/Mon 5 Oct/});await waitFor(()=>expect(monday).toBeEnabled());fireEvent.click(monday)
 expect(state.get(id).calendarDateByLeg['london:paris']).toBe('2026-10-05')
 expect(monday).toHaveAttribute('aria-pressed','true')
 expect(state.get(id).displayWindowByLeg['london:paris']).toEqual(window)
 fireEvent.click(screen.getByRole('button',{name:'Next dates'}));await router.whenIdle(id)
 const nextAdd=await screen.findByRole('button',{name:'Add cheapest fare on 2026-10-10 to trip'});await waitFor(()=>expect(nextAdd).toBeEnabled());fireEvent.click(nextAdd);await router.whenIdle(id)
 expect(state.get(id)).toMatchObject({dates:{start:'2026-10-10'},selectedFareIds:[FareIdSchema.parse('london-paris-2026-10-10')],displayWindowByLeg:{'london:paris':{from:'2026-10-10',to:'2026-10-16'}},calendarDateByLeg:{'london:paris':'2026-10-05'}})
 expect(screen.queryAllByText('This view could not be displayed. Ask the assistant to regenerate it.')).toHaveLength(0)
 router.dispose()
})

it('pages an explicit short display window without changing its span',async()=>{
 const short={from:'2026-10-03',to:'2026-10-05'},fixture=fixed({from:'2026-10-03',to:'2026-10-12'}),state=createUIStateStore(),binding=await load(fixture,'london','paris',short)
 state.initializeMissing(id,{datasetRefs:[binding.datasetId],citySequence:['london','paris'],dates:{start:short.from},displayWindowByLeg:{'london:paris':short},availableModesByLeg:{'london:paris':['train']}})
 const router=createActionRouter(state,{bridge:fixture.bridge}),services={bridge:fixture.bridge,state,dispatch:router,activeId:()=>id,activate:()=>{}}
 render(<TravelProvider services={services}><CatalogNode kind="PriceCalendar" artifactRef={id} datasetRef={binding.datasetId}/></TravelProvider>)
 fireEvent.click(await screen.findByRole('button',{name:'Next dates'}));await router.whenIdle(id)
 expect(state.get(id).displayWindowByLeg['london:paris']).toEqual({from:'2026-10-10',to:'2026-10-12'})
 fireEvent.click(screen.getByRole('button',{name:'Previous dates'}));await router.whenIdle(id)
 expect(state.get(id).displayWindowByLeg['london:paris']).toEqual(short)
 router.dispose()
})

it('shifts leap-day windows by UTC days and rejects calendar overflow before state mutation',()=>{
 const state=createUIStateStore()
 state.initializeMissing(id,{dates:{start:'2024-02-27',end:'2024-02-29'},stays:[{cityId:'paris',nights:2}]})
 expect(tripDatesForLegDeparture(state.get(id),'paris','2024-03-01')).toEqual({start:'2024-02-28',end:'2024-03-01'})
 const far=ArtifactIdSchema.parse('far-calendar');state.initializeMissing(far,{dates:{start:'9999-12-29',end:'9999-12-31'}})
 const before=state.get(far);expect(()=>tripDatesForLegDeparture(before,'london','9999-12-31')).toThrow();expect(state.get(far)).toEqual(before)
})
