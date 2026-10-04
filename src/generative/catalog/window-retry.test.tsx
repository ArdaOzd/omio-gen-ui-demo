import { it, expect } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ArtifactIdSchema, FareRowSchema } from '../contracts'
import { createUIStateStore } from '../state/ui-state-store'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createActionRouter } from '../state/action-router'
import { legState } from '../state/leg-bindings'
import { TravelProvider } from './context'
import { CatalogNode } from './component'
const id = ArtifactIdSchema.parse('window')
function row(date:string, mode='train') { return FareRowSchema.parse({id: `${mode}-${date}`, originId:'london', destinationId:'paris', serviceDate:date, mode, carrierId:'demo', priceCents:1000, durationMinutes:140, departureMinutes:600, availableSeats:10, currency:'EUR', synthetic:true, priceBasis:'per-passenger-including-demo-fees', direct:true}) }
it('exposes a real inclusive window, retains state on mount and returns to one date through DateStrip', async () => {
 const bridge=createFareDataBridge({pageSource:async input=>({rows:[row(input.date)],total:1,page:1,pages:1,sourceVersion:'v1'})})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-11'},modes:['train'],passengers:1},new AbortController().signal)
 const state=createUIStateStore();state.initializeMissing(id,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-09'}})
 const before=state.get(id)
 render(<TravelProvider services={{state,bridge,activate:()=>{},activeId:()=>id}}><CatalogNode kind="DateWindow" artifactRef={id}/><CatalogNode kind="DateStrip" artifactRef={id}/><CatalogNode kind="FareCards" artifactRef={id}/></TravelProvider>)
 expect(state.get(id)).toEqual(before)
 fireEvent.change(screen.getByLabelText('Window ends'),{target:{value:'2026-10-11'}})
 await waitFor(()=>expect(screen.getAllByRole('button',{name:/Select Train/})).toHaveLength(3))
 const current=state.get(id);fireEvent.change(screen.getByLabelText('Window ends'),{target:{value:'2026-10-08'}})
 expect(state.get(id)).toEqual(current)
 fireEvent.change(screen.getByLabelText('Departure date'),{target:{value:'2026-10-10'}})
 await waitFor(()=>expect(screen.getAllByRole('button',{name:/Select Train/})).toHaveLength(1))
 expect(state.get(id).dates).toEqual({start:'2026-10-10'})
})
it('offsets both date-window endpoints for a later adjacent leg', () => {
 const state=createUIStateStore();state.initializeMissing(id,{dates:{start:'2026-10-09',end:'2026-10-11'},stays:[{cityId:'london',nights:0},{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}]})
 expect(legState(state.get(id),{originIds:['paris'],destinationIds:['barcelona'],dateWindow:{from:'2026-10-11',to:'2026-10-13'},modes:['train'],passengers:1,complete:true,truncated:false}).dates).toEqual({start:'2026-10-11',end:'2026-10-13'})
})
it('actually retries failed coverage, preserving selections and filters without a model turn', async () => {
 let calls=0, fail=true
 const bridge=createFareDataBridge({pageSource:async input=>{calls++;if(calls>1&&fail)throw new Error('temporary failure');return {rows:[row(input.date),row(input.date,'bus')],total:2,page:1,pages:1,sourceVersion:'v1'}}})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-09'},modes:['train'],passengers:1},new AbortController().signal)
 const state=createUIStateStore();state.initializeMissing(id,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-09'},selectedFareIds:[row('2026-10-09').id]})
 const statuses:string[]=[],router=createActionRouter(state,{bridge,onCoverageStatus:status=>statuses.push(status.status)})
 router({kind:'filters',artifactId:id,filters:{...state.get(id).filters,modes:['bus']}})
 await router.whenIdle(id)
 expect(statuses.at(-1)).toBe('error');const before=state.get(id),count=calls
 render(<TravelProvider services={{state,bridge,dispatch:router,activate:()=>{},activeId:()=>id}}><CatalogNode kind="RetryAction" artifactRef={id}/></TravelProvider>)
 fail=false
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Refresh this view'}));await router.whenIdle(id)})
 expect(calls).toBe(count+1);expect(statuses.at(-1)).toBe('ready')
 expect(state.get(id).selectedFareIds).toEqual(before.selectedFareIds)
 expect(state.get(id).filters).toEqual(before.filters);expect(state.get(id).dates).toEqual(before.dates)
 expect(state.get(id).datasetRefs).toHaveLength(2)
 expect(bridge.getManifest(state.get(id).datasetRefs[1]!)).toMatchObject({coverage:{complete:true,modes:['bus']},rowCount:1})
 router.dispose()
})
it('extends DateWindow beyond cached coverage through local loading of new dates', async () => {
 const requestedDates:string[]=[]
 const bridge=createFareDataBridge({pageSource:async input=>{requestedDates.push(input.date);return {rows:[row(input.date)],total:1,page:1,pages:1,sourceVersion:'v1'}}})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-09'},modes:['train'],passengers:1},new AbortController().signal)
 const state=createUIStateStore();state.initializeMissing(id,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-09'}})
 const router=createActionRouter(state,{bridge})
 render(<TravelProvider services={{state,bridge,dispatch:router,activate:()=>{},activeId:()=>id}}><CatalogNode kind="DateWindow" artifactRef={id}/><CatalogNode kind="FareCards" artifactRef={id}/></TravelProvider>)
 await screen.findByRole('button',{name:/Select Train/})
 await act(async()=>{fireEvent.change(screen.getByLabelText('Window ends'),{target:{value:'2026-10-11'}});await router.whenIdle(id)})
 await waitFor(()=>expect(screen.getAllByRole('button',{name:/Select Train/})).toHaveLength(3))
 expect(requestedDates).toContain('2026-10-10');expect(requestedDates).toContain('2026-10-11')
 expect(state.get(id).datasetRefs).toHaveLength(2)
 expect(state.get(id).dates).toEqual({start:'2026-10-09',end:'2026-10-11'})
 router.dispose()
})
