import {afterEach,expect,it} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {ArtifactIdSchema,CoverageRequestSchema,FareIdSchema,FareRowSchema} from '../contracts'
import {createFareDataBridge} from '../data/fare-data-bridge'
import {createUIStateStore} from '../state/ui-state-store'
import {createActionRouter} from '../state/action-router'
import {legDate,tripDatesForLegDeparture} from '../state/leg-bindings'
import {TravelProvider} from './context'
import {CatalogNode} from './component'
const id=ArtifactIdSchema.parse('review-art')
const request=CoverageRequestSchema.parse({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-03',to:'2026-10-09'},modes:['train'],passengers:1})
const source=async(input:{originId:string;destinationId:string;date:string;page:number})=>({rows:[FareRowSchema.parse({id:FareIdSchema.parse(`${input.originId}-${input.destinationId}-${input.date}`),originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'train',carrierId:'rail',priceCents:1000,durationMinutes:120,departureMinutes:600,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})],total:1,pages:1,page:input.page,sourceVersion:'v1'})
afterEach(cleanup)
it('selects the actual second-leg departure and exports the corresponding trip start',async()=>{
 const bridge=createFareDataBridge({pageSource:source}),state=createUIStateStore()
 const first=await bridge.load(request,new AbortController().signal),second=await bridge.load({...request,originIds:['paris'],destinationIds:['barcelona']},new AbortController().signal)
 state.initializeMissing(id,{datasetRefs:[first.datasetId,second.datasetId],dates:{start:'2026-10-03'},stays:[{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}]})
 const router=createActionRouter(state,{bridge}),services={bridge,state,dispatch:router,activeId:()=>id,activate:()=>{}}
 render(<TravelProvider services={services}><CatalogNode kind="PriceCalendar" artifactRef={id} datasetRef={second.datasetId}/></TravelProvider>)
 const button=await screen.findByRole('button',{name:/Tue 6 Oct/});fireEvent.click(button);await router.whenIdle(id)
 expect(state.get(id).dates.start).toBe('2026-10-04');expect(legDate(state.get(id),'paris')).toBe('2026-10-06');expect(button).toHaveAttribute('aria-pressed','true')
})
it('includes the first route origin with legal destination-only stay allocations',async()=>{
 const bridge=createFareDataBridge({pageSource:source}),state=createUIStateStore();const manifest=await bridge.load(request,new AbortController().signal)
 state.initializeMissing(id,{datasetRefs:[manifest.datasetId],stays:[{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}]})
 render(<TravelProvider services={{bridge,state,activeId:()=>id,activate:()=>{}}}><CatalogNode kind="RouteMap" artifactRef={id}/></TravelProvider>)
 expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Schematic route: London to Paris to Barcelona')
})
it('disables a calendar day whose shifted trip would require fares that are not downloaded',async()=>{
 const bridge=createFareDataBridge({pageSource:source}),state=createUIStateStore()
 const manifest=await bridge.load(request,new AbortController().signal)
 state.initializeMissing(id,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-03',end:'2026-10-05'}})
 const router=createActionRouter(state,{bridge}),services={bridge,state,dispatch:router,activeId:()=>id,activate:()=>{}}
 render(<TravelProvider services={services}><CatalogNode kind="PriceCalendar" artifactRef={id} datasetRef={manifest.datasetId}/><CatalogNode kind="FareCards" artifactRef={id} datasetRef={manifest.datasetId}/></TravelProvider>)
 const before=state.get(id),day=await screen.findByRole('button',{name:/Fri 9 Oct/}),add=screen.getByRole('button',{name:'Add cheapest fare on 2026-10-09 to trip'})
 expect(day).toBeDisabled();expect(day).toHaveAttribute('aria-pressed','false');expect(add).toBeDisabled()
 fireEvent.click(day);fireEvent.click(add);await router.whenIdle(id)
 expect(state.get(id)).toEqual(before)
 expect(screen.queryAllByText('This view could not be displayed. Ask the assistant to regenerate it.')).toHaveLength(0)
})

it('changes to a downloaded calendar day locally and keeps sibling fare views mounted',async()=>{
 const bridge=createFareDataBridge({pageSource:source}),state=createUIStateStore()
 const manifest=await bridge.load(request,new AbortController().signal)
 state.initializeMissing(id,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-03',end:'2026-10-05'}})
 const router=createActionRouter(state,{bridge}),services={bridge,state,dispatch:router,activeId:()=>id,activate:()=>{}}
 render(<TravelProvider services={services}><CatalogNode kind="PriceCalendar" artifactRef={id} datasetRef={manifest.datasetId}/><CatalogNode kind="FareCards" artifactRef={id} datasetRef={manifest.datasetId}/></TravelProvider>)
 const day=await screen.findByRole('button',{name:/Tue 6 Oct/});expect(day).not.toBeDisabled();fireEvent.click(day);await router.whenIdle(id)
 expect(state.get(id).dates).toEqual({start:'2026-10-06',end:'2026-10-08'});expect(state.get(id).datasetRefs).toEqual([manifest.datasetId])
 await waitFor(()=>expect(day).toHaveAttribute('aria-pressed','true'))
 expect(await screen.findByText('London → Paris · 2026-10-06')).toBeInTheDocument()
 expect(screen.queryAllByText('This view could not be displayed. Ask the assistant to regenerate it.')).toHaveLength(0)
})


it('shifts leap-day windows by UTC days and rejects calendar overflow before state mutation',()=>{
 const state=createUIStateStore()
 state.initializeMissing(id,{dates:{start:'2024-02-27',end:'2024-02-29'},stays:[{cityId:'paris',nights:2}]})
 expect(tripDatesForLegDeparture(state.get(id),'paris','2024-03-01')).toEqual({start:'2024-02-28',end:'2024-03-01'})
 const far=ArtifactIdSchema.parse('far-calendar');state.initializeMissing(far,{dates:{start:'9999-12-29',end:'9999-12-31'}})
 const before=state.get(far)
 expect(()=>tripDatesForLegDeparture(before,'london','9999-12-31')).toThrow()
 expect(state.get(far)).toEqual(before)
})
