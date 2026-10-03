import { expect, it, vi } from 'vitest'
import { ArtifactIdSchema, FareRowSchema, type QueryIR } from '../contracts'
import { createUIStateStore } from './ui-state-store'
import { createActionRouter, type QueryFareSelectionScope } from './action-router'
import { createFareDataBridge } from '../data/fare-data-bridge'
const id=ArtifactIdSchema.parse('trip')
async function fixture(originId='london',destinationId='paris') {
 let version='v1'
 const bridge=createFareDataBridge({pageSource:async input=>({rows:[FareRowSchema.parse({id:`${input.originId}-${input.destinationId}-${input.date}`,originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'bus',carrierId:'demo',priceCents:1000,durationMinutes:140,departureMinutes:600,availableSeats:10,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})],total:1,page:1,pages:1,sourceVersion:version})})
 const request={originIds:[originId],destinationIds:[destinationId],dateWindow:{from:'2026-10-09',to:'2026-10-15'},modes:['bus' as const],passengers:1}
 const manifest=await bridge.load(request,new AbortController().signal)
 const state=createUIStateStore();state.initializeMissing(id,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-09'}})
 const router=createActionRouter(state,{bridge})
 const query={version:1,sources:[{datasetRef:manifest.datasetId,alias:'f'}],where:{field:'serviceDate',op:'between',value:['2026-10-09','2026-10-15']},limit:100} satisfies QueryIR
 const fare=(date:string)=>FareRowSchema.shape.id.parse(`${originId}-${destinationId}-${date}`)
 const scope=(fareIds:QueryFareSelectionScope['fareIds']):QueryFareSelectionScope=>({kind:'query-result',fareIds,query,currentQuery:()=>query,sources:[{datasetId:manifest.datasetId,revision:manifest.revision,sourceVersion:manifest.source.sourceVersion}]})
 return{bridge,manifest,state,router,query,fare,scope,request,setVersion:(value:string)=>{version=value}}
}
it('retains an explicit authored multi-date choice and exports the aligned date and selected ID', async () => {
 const {state,router,fare,scope}=await fixture(),selected=fare('2026-10-10')
 router.selectFromQuery({kind:'select',artifactId:id,fareId:selected,selected:true},scope([selected]))
 await router.whenIdle(id)
 expect(state.exportSnapshot(id)).toMatchObject({dates:{start:'2026-10-10'},selectedFareIds:[selected]})
 router.dispose()
})
it('rejects a stale native point offer and an obsolete query without silently aligning dates', async () => {
 const {state,router,fare,scope,query}=await fixture(),selected=fare('2026-10-10')
 const existing=fare('2026-10-09')
 router({kind:'select',artifactId:id,fareId:existing,selected:true});await router.whenIdle(id)
 router({kind:'select',artifactId:id,fareId:selected,selected:true});await router.whenIdle(id)
 expect(state.get(id).selectedFareIds).toEqual([existing]);expect(state.get(id).dates.start).toBe('2026-10-09')
 const currentQuery={...query,where:{field:'serviceDate',op:'eq',value:'2026-10-09'}} satisfies QueryIR
 const captured={...scope([selected]),query:{...query,where:{field:'serviceDate',op:'eq',value:'2026-10-10'}} satisfies QueryIR,currentQuery:()=>currentQuery}
 expect(router.selectFromQuery({kind:'select',artifactId:id,fareId:selected,selected:true},captured).status).toBe('stale')
 expect(state.get(id).dates.start).toBe('2026-10-09');router.dispose()
})
it('preserves an explicit inclusive window for an in-window choice and rejects an out-of-window normal offer', async () => {
 const {state,router,fare,scope}=await fixture(),selected=fare('2026-10-10')
 state.dispatch({kind:'dates',artifactId:id,dates:{start:'2026-10-09',end:'2026-10-11'}})
 router.selectFromQuery({kind:'select',artifactId:id,fareId:selected,selected:true},scope([selected]));await router.whenIdle(id)
 expect(state.get(id)).toMatchObject({dates:{start:'2026-10-09',end:'2026-10-11'},selectedFareIds:[selected]})
 router({kind:'select',artifactId:id,fareId:fare('2026-10-12'),selected:true});await router.whenIdle(id)
 expect(state.get(id).dates).toEqual({start:'2026-10-09',end:'2026-10-11'});expect(state.get(id).selectedFareIds).not.toContain(fare('2026-10-12'))
 router.dispose()
})
it('aligns a later leg by its stay offset and lets the latest same-leg choice win', async () => {
 const {state,router,fare,scope}=await fixture('paris','barcelona')
 state.dispatch({kind:'stays',artifactId:id,stays:[{cityId:'london',nights:0},{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}]})
 const first=fare('2026-10-12'),second=fare('2026-10-13')
 router.selectFromQuery({kind:'select',artifactId:id,fareId:first,selected:true},scope([first,second]));await router.whenIdle(id)
 expect(state.get(id).dates.start).toBe('2026-10-10')
 router.selectFromQuery({kind:'select',artifactId:id,fareId:second,selected:true},scope([first,second]));await router.whenIdle(id)
 expect(state.exportSnapshot(id)).toMatchObject({dates:{start:'2026-10-11'},selectedFareIds:[second]})
 router.dispose()
})
it('rejects IDs absent from the completed query and source generations replaced afterward', async () => {
 const {state,bridge,router,request,fare,scope,setVersion}=await fixture(),selected=fare('2026-10-10'),captured=scope([selected])
 expect(router.selectFromQuery({kind:'select',artifactId:id,fareId:selected,selected:true},scope([])).status).toBe('stale')
 bridge.release(captured.sources[0]!.datasetId);setVersion('v2');await bridge.load(request,new AbortController().signal)
 expect(router.selectFromQuery({kind:'select',artifactId:id,fareId:selected,selected:true},captured).status).toBe('stale')
 expect(state.get(id).selectedFareIds).toEqual([]);router.dispose()
})

it('rechecks the normalized query after asynchronous fact lookup before aligning the date', async () => {
 const {state,bridge,router,query,fare,scope}=await fixture(),selected=fare('2026-10-10')
 const original=bridge.lookupFare
 let resume=()=>{}
 const held=new Promise<void>(resolve=>{resume=resolve})
 vi.spyOn(bridge,'lookupFare').mockImplementation(async(id,fields)=>{const fact=await original(id,fields);await held;return fact})
 let current:QueryIR=query
 router.selectFromQuery({kind:'select',artifactId:id,fareId:selected,selected:true},{...scope([selected]),currentQuery:()=>current})
 current={...query,where:{field:'serviceDate',op:'eq',value:'2026-10-09'}}
 resume();await router.whenIdle(id)
 expect(state.get(id).dates).toEqual({start:'2026-10-09'});expect(state.get(id).selectedFareIds).toEqual([])
 router.dispose()
})
