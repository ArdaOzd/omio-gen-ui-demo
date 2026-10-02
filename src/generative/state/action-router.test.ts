import { describe,expect,it } from 'vitest'
import { createActionRouter } from './action-router'
import { createUIStateStore } from './ui-state-store'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { ArtifactIdSchema,FareIdSchema,type FareRow,type CoverageRequest } from '../contracts'
const request:CoverageRequest={originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-08'},modes:['train'],passengers:1}
const row:FareRow={id:FareIdSchema.parse('fare-1'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'train',carrierId:'test',priceCents:1000,durationMinutes:120,departureMinutes:600,availableSeats:4,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true}
describe('direct action coverage routing',()=>{
 it('uses cached dates locally and loads a bounded outside date without a model request',async()=>{
  const dates:string[]=[];const bridge=createFareDataBridge({pageSource:async input=>{dates.push(input.date);return{rows:[{...row,id:FareIdSchema.parse(`fare-${input.date}`),serviceDate:input.date}],total:1,pages:1,page:input.page,sourceVersion:'v1'}}});const manifest=await bridge.load(request,new AbortController().signal);const store=createUIStateStore();const id=ArtifactIdSchema.parse('a');store.initializeMissing(id,{dates:{start:'2026-10-02'},datasetRefs:[manifest.datasetId]});const router=createActionRouter(store,{bridge})
  const before=dates.length;router({kind:'dates',artifactId:id,dates:{start:'2026-10-04'}});await router.whenIdle(id);expect(dates.length).toBe(before)
  router({kind:'dates',artifactId:id,dates:{start:'2026-11-01'}});await router.whenIdle(id);expect(dates.at(-1)).toBe('2026-11-01');const ref=store.get(id).datasetRefs[0];if(!ref)throw new Error('Missing coverage');expect(bridge.getManifest(ref).coverage.dateWindow.from).toBe('2026-11-01');expect(store.get(id).dates.start).toBe('2026-11-01');router.dispose()
 })
 it('rejects late superseded coverage without overwriting the newer date',async()=>{
  let oldFinish:(()=>void)|undefined
  const bridge=createFareDataBridge({pageSource:async input=>{if(input.date==='2026-11-01')await new Promise<void>(resolve=>{oldFinish=resolve});return{rows:[{...row,id:FareIdSchema.parse(`fare-${input.date}`),serviceDate:input.date}],total:1,pages:1,page:input.page,sourceVersion:'v1'}}});const manifest=await bridge.load({...request,dateWindow:{from:'2026-10-02',to:'2026-10-02'}},new AbortController().signal);const store=createUIStateStore();const id=ArtifactIdSchema.parse('a');store.initializeMissing(id,{dates:{start:'2026-10-02'},datasetRefs:[manifest.datasetId]});const router=createActionRouter(store,{bridge})
  router({kind:'dates',artifactId:id,dates:{start:'2026-11-01'}});router({kind:'dates',artifactId:id,dates:{start:'2026-11-02'}});await router.whenIdle(id);oldFinish?.();await new Promise(resolve=>setTimeout(resolve,0));expect(store.get(id).dates.start).toBe('2026-11-02');const ref=store.get(id).datasetRefs[0];if(!ref)throw new Error('Missing coverage');expect(bridge.getManifest(ref).coverage.dateWindow.from).toBe('2026-11-02');router.dispose()
 })
})
