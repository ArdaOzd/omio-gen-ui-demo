import { describe,expect,it } from 'vitest'
import { resolveBoundDatasetId } from './leg-bindings'
import { createActionRouter } from './action-router'
import { createUIStateStore } from './ui-state-store'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { ArtifactIdSchema,FareIdSchema,type FareRow,type CoverageRequest } from '../contracts'
const request:CoverageRequest={originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-08'},modes:['train'],passengers:1}
const row:FareRow={id:FareIdSchema.parse('fare-1'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'train',carrierId:'test',carrierName:'Test Rail',priceCents:1000,durationMinutes:120,departureMinutes:600,availableSeats:4,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true}
describe('direct action coverage routing',()=>{
 it('uses cached dates locally and loads a bounded outside date without a model request',async()=>{
  const dates:string[]=[];const bridge=createFareDataBridge({pageSource:async input=>{dates.push(input.date);return{rows:[{...row,id:FareIdSchema.parse(`fare-${input.date}`),serviceDate:input.date}],total:1,pages:1,page:input.page,sourceVersion:'v1'}}});const manifest=await bridge.load(request,new AbortController().signal);const store=createUIStateStore();const id=ArtifactIdSchema.parse('a');store.initializeMissing(id,{dates:{start:'2026-10-02'},datasetRefs:[manifest.datasetId]});const router=createActionRouter(store,{bridge})
  const before=dates.length;router({kind:'dates',artifactId:id,dates:{start:'2026-10-04'}});await router.whenIdle(id);expect(dates.length).toBe(before)
  router({kind:'dates',artifactId:id,dates:{start:'2026-11-01'}});await router.whenIdle(id);expect(dates.at(-1)).toBe('2026-11-01');const ref=store.get(id).datasetRefs.at(-1);if(!ref)throw new Error('Missing coverage');expect(bridge.getManifest(ref).coverage.dateWindow.from).toBe('2026-11-01');expect(store.get(id).dates.start).toBe('2026-11-01');router.dispose()
 })
 it('rejects late superseded coverage without overwriting the newer date',async()=>{
  let oldFinish:(()=>void)|undefined
  const bridge=createFareDataBridge({pageSource:async input=>{if(input.date==='2026-11-01')await new Promise<void>(resolve=>{oldFinish=resolve});return{rows:[{...row,id:FareIdSchema.parse(`fare-${input.date}`),serviceDate:input.date}],total:1,pages:1,page:input.page,sourceVersion:'v1'}}});const manifest=await bridge.load({...request,dateWindow:{from:'2026-10-02',to:'2026-10-02'}},new AbortController().signal);const store=createUIStateStore();const id=ArtifactIdSchema.parse('a');store.initializeMissing(id,{dates:{start:'2026-10-02'},datasetRefs:[manifest.datasetId]});const router=createActionRouter(store,{bridge})
  router({kind:'dates',artifactId:id,dates:{start:'2026-11-01'}});router({kind:'dates',artifactId:id,dates:{start:'2026-11-02'}});await router.whenIdle(id);oldFinish?.();await new Promise(resolve=>setTimeout(resolve,0));expect(store.get(id).dates.start).toBe('2026-11-02');const ref=store.get(id).datasetRefs.at(-1);if(!ref)throw new Error('Missing coverage');expect(bridge.getManifest(ref).coverage.dateWindow.from).toBe('2026-11-02');router.dispose()
 })
})

it('loads adjacent legs at stay offsets, routes leg modes, and replaces alternative selections',async()=>{
 const calls:Array<{origin:string;destination:string;date:string}>=[]
 const bridge=createFareDataBridge({pageSource:async input=>{calls.push({origin:input.originId,destination:input.destinationId,date:input.date});return {rows:[{...row,id:FareIdSchema.parse(`${input.originId}-${input.destinationId}-${input.date}-train`),originId:input.originId,destinationId:input.destinationId,serviceDate:input.date},{...row,id:FareIdSchema.parse(`${input.originId}-${input.destinationId}-${input.date}-bus`),originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'bus',priceCents:2000}],total:2,pages:1,page:input.page,sourceVersion:'v1'}}})
 const manifest=await bridge.load({...request,dateWindow:{from:'2026-10-02',to:'2026-10-02'},modes:['train','bus']},new AbortController().signal)
 const store=createUIStateStore();const id=ArtifactIdSchema.parse('multi');store.initializeMissing(id,{dates:{start:'2026-10-02'},datasetRefs:[manifest.datasetId]});const router=createActionRouter(store,{bridge})
 router({kind:'stays',artifactId:id,stays:[{cityId:'paris',nights:2},{cityId:'barcelona',nights:4}]});await router.whenIdle(id)
 expect(calls).toContainEqual({origin:'paris',destination:'barcelona',date:'2026-10-04'})
 router({kind:'modesByLeg',artifactId:id,modesByLeg:{'paris:barcelona':['bus']}});await router.whenIdle(id)
 expect(store.get(id).modesByLeg['paris:barcelona']).toEqual(['bus'])
 router({kind:'select',artifactId:id,fareId:FareIdSchema.parse('london-paris-2026-10-02-train'),selected:true});await router.whenIdle(id)
 router({kind:'select',artifactId:id,fareId:FareIdSchema.parse('london-paris-2026-10-02-bus'),selected:true});await router.whenIdle(id)
 router({kind:'select',artifactId:id,fareId:FareIdSchema.parse('paris-barcelona-2026-10-04-bus'),selected:true});await router.whenIdle(id)
 expect(store.get(id).selectedFareIds).toEqual(['london-paris-2026-10-02-bus'])
 router({kind:'stays',artifactId:id,stays:[{cityId:'paris',nights:3},{cityId:'barcelona',nights:4}]});await router.whenIdle(id)
 expect(calls).toContainEqual({origin:'paris',destination:'barcelona',date:'2026-10-05'});expect(store.get(id).selectedFareIds).toEqual(['london-paris-2026-10-02-bus'])
 expect(()=>bridge.getManifest(manifest.datasetId)).not.toThrow();router.dispose()
})

it('resolves old scene refs to new covered handles while retaining a full-scope seed inside the interacted artifact',async()=>{
 const bridge=createFareDataBridge({pageSource:async input=>({rows:[{...row,id:FareIdSchema.parse(`fare-${input.date}`),serviceDate:input.date}],total:1,pages:1,page:input.page,sourceVersion:'v1'})});const seed=await bridge.load({...request,dateWindow:{from:'2026-10-02',to:'2026-10-02'}},new AbortController().signal)
 const store=createUIStateStore();const a=ArtifactIdSchema.parse('a');const b=ArtifactIdSchema.parse('b');for(const id of[a,b])store.initializeMissing(id,{datasetRefs:[seed.datasetId],dates:{start:'2026-10-02'}})
 const router=createActionRouter(store,{bridge});router({kind:'dates',artifactId:a,dates:{start:'2026-11-01'}});await router.whenIdle(a)
 expect(resolveBoundDatasetId(store.get(a),bridge,seed.datasetId)).not.toBe(seed.datasetId);expect(resolveBoundDatasetId(store.get(b),bridge,seed.datasetId)).toBe(seed.datasetId)
 expect(store.get(a).datasetRefs).toContain(seed.datasetId);expect(store.get(b).datasetRefs).toEqual([seed.datasetId]);router.dispose()
})

it('rejects changed source versions and clears unsupported old selections explicitly',async()=>{
 const warnings:string[]=[];const bridge=createFareDataBridge({pageSource:async input=>({rows:[{...row,id:FareIdSchema.parse(`fare-${input.date}`),serviceDate:input.date}],total:1,pages:1,page:input.page,sourceVersion:input.date.startsWith('2026-11')?'v2':'v1'})});const seed=await bridge.load({...request,dateWindow:{from:'2026-10-02',to:'2026-10-02'}},new AbortController().signal)
 const store=createUIStateStore();const id=ArtifactIdSchema.parse('changed');store.initializeMissing(id,{datasetRefs:[seed.datasetId],dates:{start:'2026-10-02'},selectedFareIds:[FareIdSchema.parse('fare-2026-10-02')]});const router=createActionRouter(store,{bridge,onCoverageStatus:status=>{if(status.message)warnings.push(status.message)}})
 router({kind:'dates',artifactId:id,dates:{start:'2026-11-01'}});await router.whenIdle(id)
 expect(store.get(id).datasetRefs).toEqual([seed.datasetId]);expect(store.get(id).selectedFareIds).toEqual([]);expect(warnings.at(-1)).toMatch(/source.*changed/i);router.dispose()
})

it('restores the whole seeded mode scope after a narrow outside-date load',async()=>{
 const bridge=createFareDataBridge({pageSource:async input=>({rows:[{...row,id:FareIdSchema.parse(`train-${input.date}`),serviceDate:input.date},{...row,id:FareIdSchema.parse(`bus-${input.date}`),serviceDate:input.date,mode:'bus'}],total:2,pages:1,page:input.page,sourceVersion:'v1'})});const seed=await bridge.load({...request,dateWindow:{from:'2026-10-02',to:'2026-10-02'},modes:['train','bus']},new AbortController().signal)
 const store=createUIStateStore();const id=ArtifactIdSchema.parse('modes');store.initializeMissing(id,{datasetRefs:[seed.datasetId],dates:{start:'2026-10-02'}});const router=createActionRouter(store,{bridge})
 router({kind:'modesByLeg',artifactId:id,modesByLeg:{'london:paris':['bus']}});await router.whenIdle(id);router({kind:'dates',artifactId:id,dates:{start:'2026-11-01'}});await router.whenIdle(id)
 router({kind:'modesByLeg',artifactId:id,modesByLeg:{'london:paris':[]}});await router.whenIdle(id)
 const current=bridge.getManifest(resolveBoundDatasetId(store.get(id),bridge,seed.datasetId));expect(current.coverage.dateWindow.from).toBe('2026-11-01');expect(current.coverage.modes).toEqual(['train','bus']);router.dispose()
})

it('keeps the chosen trip start and upstream fare when a valid arrival-derived downstream fare is selected',async()=>{
 const bridge=createFareDataBridge({pageSource:async input=>({rows:[{...row,id:FareIdSchema.parse(input.originId==='london'?'overnight-first':'valid-second'),originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,departureMinutes:input.originId==='london'?1260:1080,durationMinutes:input.originId==='london'?1200:120}],total:1,pages:1,page:input.page,sourceVersion:'v1'})})
 const first=await bridge.load({...request,dateWindow:{from:'2026-10-26',to:'2026-10-26'}},new AbortController().signal)
 const second=await bridge.load({...request,originIds:['paris'],destinationIds:['rome'],dateWindow:{from:'2026-10-30',to:'2026-10-30'}},new AbortController().signal)
 const store=createUIStateStore();const id=ArtifactIdSchema.parse('arrival-chain');store.initializeMissing(id,{datasetRefs:[first.datasetId,second.datasetId],citySequence:['london','paris','rome'],dates:{start:'2026-10-26'},stays:[{cityId:'paris',nights:3}]})
 const router=createActionRouter(store,{bridge});const firstId=FareIdSchema.parse('overnight-first'),secondId=FareIdSchema.parse('valid-second')
 router({kind:'select',artifactId:id,fareId:firstId,selected:true});await router.whenIdle(id)
 router({kind:'select',artifactId:id,fareId:secondId,selected:true});await router.whenIdle(id)
 expect(store.get(id).dates.start).toBe('2026-10-26');expect(store.get(id).selectedFareIds).toEqual([firstId,secondId]);router.dispose()
})
