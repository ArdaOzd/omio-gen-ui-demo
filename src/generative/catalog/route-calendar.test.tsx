import {afterEach,expect,it} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {ArtifactIdSchema,FareIdSchema} from '../contracts'
import type {FareItem,FareScope} from '../contracts/query-groups'
import {createFixedProjectionFixture} from '../testing/fixed-projection-fixture'
import {createUIStateStore} from '../state/ui-state-store'
import {createActionRouter} from '../state/action-router'
import {legDate,tripDatesForLegDeparture} from '../state/leg-bindings'
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
const fixed=()=>createFixedProjectionFixture({rows:scope=>dates(scope.dateWindow.from,scope.dateWindow.to).map(date=>fare(scope,date)),sourceVersion:'route-calendar-v1'})
async function load(fixture:ReturnType<typeof fixed>,originId:string,destinationId:string,dateWindow=window){
 const manifest=await fixture.bridge.loadScope(fixture.scope({originId,destinationId,dateWindow,passengers:1,earliestDeparture:{date:dateWindow.from,minutes:0}}),new AbortController().signal)
 return fixture.bridge.getBinding(manifest.resourceKey)
}

afterEach(cleanup)

it('selects the actual second-leg departure and exports the corresponding trip start',async()=>{
 const fixture=fixed(),state=createUIStateStore(),first=await load(fixture,'london','paris'),second=await load(fixture,'paris','barcelona')
 state.initializeMissing(id,{datasetRefs:[first.datasetId,second.datasetId],citySequence:['london','paris','barcelona'],dates:{start:'2026-10-03'},stays:[{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}],availableModesByLeg:{'london:paris':['train'],'paris:barcelona':['train']}})
 const router=createActionRouter(state,{bridge:fixture.bridge}),services={bridge:fixture.bridge,state,dispatch:router,activeId:()=>id,activate:()=>{}}
 render(<TravelProvider services={services}><CatalogNode kind="PriceCalendar" artifactRef={id} datasetRef={second.datasetId}/></TravelProvider>)
 const button=await screen.findByRole('button',{name:/Tue 6 Oct/});fireEvent.click(button);await router.whenIdle(id)
 expect(state.get(id).dates.start).toBe('2026-10-04');expect(legDate(state.get(id),'paris')).toBe('2026-10-06')
 router.dispose()
})

it('includes the first route origin with legal destination-only stay allocations',async()=>{
 const fixture=fixed(),state=createUIStateStore();const manifest=await load(fixture,'london','paris')
 state.initializeMissing(id,{datasetRefs:[manifest.datasetId],citySequence:['london','paris','barcelona'],stays:[{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}]})
 render(<TravelProvider services={{bridge:fixture.bridge,state,activeId:()=>id,activate:()=>{}}}><CatalogNode kind="RouteMap" artifactRef={id}/></TravelProvider>)
 expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Schematic route: London to Paris to Barcelona')
})

it('changes calendar dates through fixed server scopes and keeps sibling fare views mounted',async()=>{
 const fixture=fixed(),state=createUIStateStore(),binding=await load(fixture,'london','paris')
 state.initializeMissing(id,{datasetRefs:[binding.datasetId],citySequence:['london','paris'],dates:{start:'2026-10-03',end:'2026-10-05'},availableModesByLeg:{'london:paris':['train']}})
 const router=createActionRouter(state,{bridge:fixture.bridge}),services={bridge:fixture.bridge,state,dispatch:router,activeId:()=>id,activate:()=>{}}
 render(<TravelProvider services={services}><CatalogNode kind="PriceCalendar" artifactRef={id} datasetRef={binding.datasetId}/><CatalogNode kind="FareCards" artifactRef={id} datasetRef={binding.datasetId}/></TravelProvider>)
 const day=await screen.findByRole('button',{name:/Tue 6 Oct/});fireEvent.click(day);await router.whenIdle(id)
 expect(state.get(id).dates).toEqual({start:'2026-10-06',end:'2026-10-08'})
 await waitFor(()=>expect(screen.getByText('London → Paris · 2026-10-06')).toBeInTheDocument())
 expect(screen.queryAllByText('This view could not be displayed. Ask the assistant to regenerate it.')).toHaveLength(0)
 router.dispose()
})

it('shifts leap-day windows by UTC days and rejects calendar overflow before state mutation',()=>{
 const state=createUIStateStore()
 state.initializeMissing(id,{dates:{start:'2024-02-27',end:'2024-02-29'},stays:[{cityId:'paris',nights:2}]})
 expect(tripDatesForLegDeparture(state.get(id),'paris','2024-03-01')).toEqual({start:'2024-02-28',end:'2024-03-01'})
 const far=ArtifactIdSchema.parse('far-calendar');state.initializeMissing(far,{dates:{start:'9999-12-29',end:'9999-12-31'}})
 const before=state.get(far);expect(()=>tripDatesForLegDeparture(before,'london','9999-12-31')).toThrow();expect(state.get(far)).toEqual(before)
})
