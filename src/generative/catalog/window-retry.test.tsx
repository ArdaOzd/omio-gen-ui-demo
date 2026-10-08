import {it,expect} from 'vitest'
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {ArtifactIdSchema,FareIdSchema} from '../contracts'
import type {FareItem,FareScope} from '../contracts/query-groups'
import {createFixedProjectionFixture} from '../testing/fixed-projection-fixture'
import {createUIStateStore} from '../state/ui-state-store'
import {createActionRouter} from '../state/action-router'
import {legState} from '../state/leg-bindings'
import {TravelProvider} from './context'
import {CatalogNode} from './component'

const id=ArtifactIdSchema.parse('window')
function dates(scope:FareScope){const values:string[]=[];for(let current=Date.parse(`${scope.dateWindow.from}T00:00:00.000Z`),last=Date.parse(`${scope.dateWindow.to}T00:00:00.000Z`);current<=last;current+=86_400_000)values.push(new Date(current).toISOString().slice(0,10));return values}
function row(scope:FareScope,date:string,mode:'train'|'bus'='train'):FareItem{return{id:FareIdSchema.parse(`${mode}-${date}`),originId:scope.originId,destinationId:scope.destinationId,serviceDate:date,mode,carrierId:'demo',carrierName:'Demo',priceCents:1000,durationMinutes:140,departureMinutes:600,availableSeats:10,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true,legs:[{legIndex:0,mode,carrierName:'Demo',durationMinutes:140,originId:scope.originId,destinationId:scope.destinationId,originLabel:scope.originId,destinationLabel:scope.destinationId}]}}
const scope=(from:string,to=from)=>({originId:'london',destinationId:'paris',dateWindow:{from,to},passengers:1,earliestDeparture:{date:from,minutes:0}})
async function binding(fixed:ReturnType<typeof createFixedProjectionFixture>,from:string,to=from){const manifest=await fixed.bridge.loadScope(fixed.scope(scope(from,to)),new AbortController().signal);return fixed.bridge.getBinding(manifest.resourceKey)}

it('exposes an inclusive window, retains state on mount and returns to one date through DateStrip',async()=>{
 const fixed=createFixedProjectionFixture({rows:value=>dates(value).map(date=>row(value,date)),sourceDateWindow:{from:'2026-10-01',to:'2026-10-15'}}),loaded=await binding(fixed,'2026-10-09'),state=createUIStateStore()
 state.initializeMissing(id,{datasetRefs:[loaded.datasetId],citySequence:['london','paris'],dates:{start:'2026-10-09'},availableModesByLeg:{'london:paris':['train']}})
 const router=createActionRouter(state,{bridge:fixed.bridge}),before=state.get(id)
 render(<TravelProvider services={{state,bridge:fixed.bridge,dispatch:router,activate:()=>{},activeId:()=>id}}><CatalogNode kind="DateWindow" artifactRef={id}/><CatalogNode kind="DateStrip" artifactRef={id}/><CatalogNode kind="FareCards" artifactRef={id}/></TravelProvider>)
 expect(state.get(id)).toEqual(before)
 fireEvent.change(screen.getByLabelText('Window ends'),{target:{value:'2026-10-11'}});await router.whenIdle(id)
 await waitFor(()=>expect(screen.getAllByRole('button',{name:/Select Train/})).toHaveLength(3))
 const current=state.get(id);fireEvent.change(screen.getByLabelText('Window ends'),{target:{value:'2026-10-08'}});expect(state.get(id)).toEqual(current)
 fireEvent.change(screen.getByLabelText('Departure date'),{target:{value:'2026-10-10'}});await router.whenIdle(id)
 await waitFor(()=>expect(screen.getAllByRole('button',{name:/Select Train/})).toHaveLength(1));expect(state.get(id).dates).toEqual({start:'2026-10-10'})
 router.dispose()
})

it('offsets both date-window endpoints for a later adjacent leg',()=>{
 const state=createUIStateStore();state.initializeMissing(id,{dates:{start:'2026-10-09',end:'2026-10-11'},stays:[{cityId:'london',nights:0},{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}]})
 const coverage:FareScope={kind:'fareScope',originId:'paris',destinationId:'barcelona',dateWindow:{from:'2026-10-11',to:'2026-10-13'},passengers:1,earliestDeparture:{date:'2026-10-11',minutes:0}}
 expect(legState(state.get(id),coverage).dates).toEqual({start:'2026-10-11',end:'2026-10-13'})
})

it('actually retries failed fixed-scope coverage while preserving selection and filters',async()=>{
 let fail=false,calls=0
 const fixed=createFixedProjectionFixture({sourceDateWindow:{from:'2026-10-01',to:'2026-10-15'},rows:value=>{calls+=1;if(fail)throw new Error('temporary failure');return dates(value).flatMap(date=>[row(value,date),row(value,date,'bus')])}})
 const loaded=await binding(fixed,'2026-10-09'),state=createUIStateStore();state.initializeMissing(id,{datasetRefs:[loaded.datasetId],citySequence:['london','paris'],dates:{start:'2026-10-09'},selectedFareIds:[row(fixed.scope(scope('2026-10-09')),'2026-10-09').id],filters:{modes:['bus'],carrierIds:[],directOnly:false}})
 const statuses:string[]=[],router=createActionRouter(state,{bridge:fixed.bridge,onCoverageStatus:value=>statuses.push(value.status)})
 fail=true;const current=state.get(id);router({kind:'dates',artifactId:id,expectedRevision:current.revision,dates:{start:'2026-10-09',end:'2026-10-11'}});await router.whenIdle(id)
 expect(statuses.at(-1)).toBe('error');const before=state.get(id),count=calls
 render(<TravelProvider services={{state,bridge:fixed.bridge,dispatch:router,activate:()=>{},activeId:()=>id}}><CatalogNode kind="RetryAction" artifactRef={id}/></TravelProvider>)
 fail=false;await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Refresh this view'}));await router.whenIdle(id)})
 expect(calls).toBeGreaterThan(count);expect(statuses.at(-1)).toBe('ready');expect(state.get(id).selectedFareIds).toEqual(before.selectedFareIds);expect(state.get(id).filters).toEqual(before.filters);expect(state.get(id).dates).toEqual(before.dates);expect(state.get(id).datasetRefs).toHaveLength(1)
 router.dispose()
})

it('extends DateWindow beyond cached coverage through local loading of a new fixed scope',async()=>{
 const requested:string[]=[]
 const fixed=createFixedProjectionFixture({sourceDateWindow:{from:'2026-10-01',to:'2026-10-15'},rows:value=>{requested.push(`${value.dateWindow.from}:${value.dateWindow.to}`);return dates(value).map(date=>row(value,date))}}),loaded=await binding(fixed,'2026-10-09'),state=createUIStateStore()
 state.initializeMissing(id,{datasetRefs:[loaded.datasetId],citySequence:['london','paris'],dates:{start:'2026-10-09'},availableModesByLeg:{'london:paris':['train']}})
 const router=createActionRouter(state,{bridge:fixed.bridge})
 render(<TravelProvider services={{state,bridge:fixed.bridge,dispatch:router,activate:()=>{},activeId:()=>id}}><CatalogNode kind="DateWindow" artifactRef={id}/><CatalogNode kind="FareCards" artifactRef={id}/></TravelProvider>)
 await screen.findByRole('button',{name:/Select Train/});await act(async()=>{fireEvent.change(screen.getByLabelText('Window ends'),{target:{value:'2026-10-11'}});await router.whenIdle(id)})
 await waitFor(()=>expect(screen.getAllByRole('button',{name:/Select Train/})).toHaveLength(3));expect(requested).toContain('2026-10-09:2026-10-11');expect(state.get(id).datasetRefs).toHaveLength(1);expect(state.get(id).dates).toEqual({start:'2026-10-09',end:'2026-10-11'})
 router.dispose()
})
