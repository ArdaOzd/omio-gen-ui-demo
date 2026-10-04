import {describe,expect,it,vi} from 'vitest'
import {act,render,screen,waitFor} from '@testing-library/react'
import {ArtifactIdSchema,CoverageRequestSchema,FareRowSchema} from '../contracts'
import {createFareDataBridge} from '../data/fare-data-bridge'
import {createUIStateStore} from '../state/ui-state-store'
import {TravelProvider} from './context'
import {CatalogNode} from './component'
import {ReactiveScene} from '../variants/b/renderer'
const names=['CarrierFilter','PriceCalendar','ComparisonTable','ComparisonMatrix','ModeBreakdown','ItineraryTimeline','DurationPricePlot','CheapestFastest']
async function fixture(){
 const bridge=createFareDataBridge({pageSource:async input=>({rows:[FareRowSchema.parse({id:'status-fare',originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'train',carrierId:'rail',priceCents:1000,durationMinutes:120,departureMinutes:600,availableSeats:8,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})],total:1,page:1,pages:1,sourceVersion:'v1'})})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-03',to:'2026-10-03'},modes:['train'],passengers:1},new AbortController().signal)
 const state=createUIStateStore(),id=ArtifactIdSchema.parse('request-status');state.initializeMissing(id,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-03'}})
 return{bridge,state,id,manifest,services:{bridge,state,activate:()=>{},activeId:()=>id}}
}
describe('visible local request states',()=>{
 it.each(names)('%s exposes a failed query instead of a blank or empty-looking view',async name=>{
  const value=await fixture();vi.spyOn(value.bridge,'query').mockRejectedValue(new Error('Injected local query failure'))
  render(<TravelProvider services={value.services}><CatalogNode kind={name} artifactRef={value.id} datasetRef={value.manifest.datasetId}/></TravelProvider>)
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load|unavailable/i)
  expect(value.state.get(value.id).revision).toBe(0)
 })
 it.each(['SyntheticTotal','SelectedItinerary'])('%s does not show a zero total or permanent loading when selected facts fail',async name=>{
  const value=await fixture();value.state.dispatch({kind:'select',artifactId:value.id,fareId:FareRowSchema.shape.id.parse('status-fare'),selected:true})
  vi.spyOn(value.bridge,'lookupFare').mockRejectedValue(new Error('Injected fact failure'))
  render(<TravelProvider services={value.services}><CatalogNode kind={name} artifactRef={value.id}/></TravelProvider>)
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load|unavailable/i)
  expect(screen.queryByText('€0.00')).not.toBeInTheDocument();expect(value.state.get(value.id).selectedFareIds).toEqual(['status-fare'])
 })
 it('shows a genuine OpenUI query failure rather than an empty comparison table',async()=>{
  const value=await fixture();vi.spyOn(value.bridge,'query').mockRejectedValue(new Error('Injected query failure'))
  const program=`q = Query("local_query", {version:1,sources:[{datasetRef:"${value.manifest.datasetId}",alias:"f"}],groupBy:["mode"],metrics:[{as:"count",op:"count"}],limit:4})\nview = ModeBreakdown("${value.id}", "${value.manifest.datasetId}", null, null, "Modes", null, null, null, null, q)\nroot = TravelSurface("${value.id}", null, null, null, "Trip", null, [view])`
  render(<TravelProvider services={value.services}><ReactiveScene artifactRef={value.id} program={program}/></TravelProvider>)
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load|unavailable/i)
  expect(value.state.exportSnapshot(value.id).selectedFareIds).toEqual([])
 })
})

it('keeps ready facts stable across unrelated edits and rejects an older selected-fare result',async()=>{
 const value=await fixture(),fare=FareRowSchema.shape.id.parse('status-fare'),original=value.bridge.lookupFare
 value.state.dispatch({kind:'select',artifactId:value.id,fareId:fare,selected:true})
 let releaseOld:()=>void=()=>{},first=true
 const lookup=vi.spyOn(value.bridge,'lookupFare').mockImplementation(async(id,fields)=>{const fact=await original(id,fields);if(first){first=false;await new Promise<void>(resolve=>{releaseOld=resolve})}return fact})
 render(<TravelProvider services={value.services}><CatalogNode kind="SyntheticTotal" artifactRef={value.id}/></TravelProvider>)
 await waitFor(()=>expect(lookup).toHaveBeenCalledTimes(1));expect(screen.queryByText('€0.00')).not.toBeInTheDocument()
 act(()=>value.state.dispatch({kind:'select',artifactId:value.id,fareId:fare,selected:false}))
 await screen.findByText('€0.00');await act(async()=>releaseOld());expect(screen.queryByText('€10.00')).not.toBeInTheDocument()
 const calls=lookup.mock.calls.length
 act(()=>value.state.dispatch({kind:'sort',artifactId:value.id,sort:{field:'durationMinutes',direction:'desc'}}))
 expect(screen.getByText('€0.00')).toBeVisible();expect(lookup).toHaveBeenCalledTimes(calls)
})
it('refreshes selected facts on real resource generation changes and rejects late old-source facts',async()=>{
 let generation=1
 const bridge=createFareDataBridge({maxRows:1,pageSource:async input=>({rows:['one','two'].map(id=>FareRowSchema.parse({id,originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'train',carrierId:'rail',priceCents:generation*1000,durationMinutes:120,departureMinutes:600,availableSeats:8,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})),total:2,page:1,pages:2,sourceVersion:`v${generation}`})})
 const request=CoverageRequestSchema.parse({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-03',to:'2026-10-03'},modes:['train'],passengers:1})
 const manifest=await bridge.load(request,new AbortController().signal),state=createUIStateStore(),id=ArtifactIdSchema.parse('source-facts')
 state.initializeMissing(id,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-03'},selectedFareIds:[FareRowSchema.shape.id.parse('one')]})
 const original=bridge.lookupFare;let releaseOld:()=>void=()=>{},first=true
 const lookup=vi.spyOn(bridge,'lookupFare').mockImplementation(async(id,fields)=>{const fact=await original(id,fields);if(first){first=false;await new Promise<void>(resolve=>{releaseOld=resolve})}return fact})
 render(<TravelProvider services={{bridge,state,activate:()=>{},activeId:()=>id}}><CatalogNode kind="SyntheticTotal" artifactRef={id}/></TravelProvider>)
 await waitFor(()=>expect(lookup).toHaveBeenCalledTimes(1))
 generation=2;await act(async()=>{await bridge.load(request,new AbortController().signal)})
 await screen.findByText('€20.00');await act(async()=>releaseOld());expect(screen.getByText('€20.00')).toBeVisible();expect(screen.queryByText('€10.00')).not.toBeInTheDocument()
 expect(state.get(id).selectedFareIds).toEqual(['one']);expect(state.get(id).revision).toBe(0)
 const calls=lookup.mock.calls.length;act(()=>state.dispatch({kind:'sort',artifactId:id,sort:{field:'durationMinutes',direction:'desc'}}));expect(screen.getByText('€20.00')).toBeVisible();expect(lookup).toHaveBeenCalledTimes(calls)
})

it.each(['CitySequence','RouteMap','CoverageSummary','StayAllocation'])('%s explains a valid empty itinerary without inventing route facts',async name=>{
 const value=await fixture();const id=ArtifactIdSchema.parse('empty-route');value.state.initializeMissing(id,{datasetRefs:[],stays:[]})
 render(<TravelProvider services={value.services}><CatalogNode kind={name} artifactRef={id}/></TravelProvider>)
 expect(await screen.findByRole('status')).toHaveTextContent(/Add stops|No travel data/i)
 expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(value.state.get(id).revision).toBe(0)
})

it('announces current coverage after a resource reload without rewriting artifact state',async()=>{
 let complete=false;const bridge=createFareDataBridge({maxRows:1,pageSource:async input=>({rows:[FareRowSchema.parse({id:'coverage-fare',originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'train',carrierId:'rail',priceCents:1000,durationMinutes:120,departureMinutes:600,availableSeats:8,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true}),...(complete?[]:[FareRowSchema.parse({id:'coverage-extra',originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'train',carrierId:'rail',priceCents:1000,durationMinutes:120,departureMinutes:600,availableSeats:8,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})])],total:complete?1:2,page:1,pages:complete?1:2,sourceVersion:'coverage-v1'})})
 const request=CoverageRequestSchema.parse({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-03',to:'2026-10-03'},modes:['train'],passengers:1}),manifest=await bridge.load(request,new AbortController().signal),state=createUIStateStore(),id=ArtifactIdSchema.parse('coverage-status')
 state.initializeMissing(id,{datasetRefs:[manifest.datasetId]});render(<TravelProvider services={{bridge,state,activate:()=>{},activeId:()=>id}}><CatalogNode kind="CoverageSummary" artifactRef={id}/></TravelProvider>)
 expect(screen.getByText(/Partial ·/)).toBeVisible();complete=true;await act(async()=>{await bridge.load(request,new AbortController().signal)})
 expect(await screen.findByRole('status')).toHaveTextContent(/Complete ·/);expect(state.get(id).revision).toBe(0)
})
