import { describe,expect,it } from 'vitest';
import { createBrowserTools } from './browser-tools';
import { createFareDataBridge } from '../data/fare-data-bridge';
import { createUIStateStore } from '../state/ui-state-store';
import { ArtifactIdSchema,UIStateRevisionSchema,FareRowSchema,CoverageRequestSchema } from '../contracts';
const artifactId=ArtifactIdSchema.parse('artifact-test');
const coverage={originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-09'},modes:['train'],passengers:1};
function setup(){const store=createUIStateStore();store.initializeMissing(artifactId,{dates:{start:'2026-10-02'}});const bridge=createFareDataBridge({pageSource:async()=>({rows:[],total:0,pages:1,page:1,sourceVersion:'fixture'})});return {store,tools:createBrowserTools({store,bridge,activeArtifactId:()=>artifactId})};}
describe('bounded direct artifact tools',()=>{
 it('rejects a stale model edit after the user selects a different date',async()=>{
  const {store,tools}=setup();store.dispatch({artifactId,kind:'dates',dates:{start:'2026-10-10'}});
  expect(await tools.edit_artifact.execute({artifactRef:artifactId,expectedRevision:0,commands:[{kind:'dates',dates:{start:'2026-10-09'}}]})).toMatchObject({status:'stale'});
  expect(store.get(artifactId).dates.start).toBe('2026-10-10');
 });
 it('applies bounded typed stay and mode initialization at the current revision',async()=>{
  const {store,tools}=setup();expect(await tools.edit_artifact.execute({artifactRef:artifactId,expectedRevision:UIStateRevisionSchema.parse(0),commands:[{kind:'stays',stays:[{cityId:'paris',nights:2},{cityId:'berlin',nights:4}]},{kind:'modesByLeg',modesByLeg:{leg1:['train']}}]})).toMatchObject({status:'applied',revision:2});
  expect(store.get(artifactId).stays.map(stay=>stay.nights)).toEqual([2,4]);
 });
 it('sets the first resource date from coverage and returns no rows',async()=>{
  const {store,tools}=setup();const result=await tools.load_fares.execute({coverage});expect(result).toMatchObject({rowCount:0,coverage:{complete:true}});expect(store.get(artifactId).dates.start).toBe('2026-10-09');expect(result).not.toHaveProperty('rows');
 });
 it('keeps the exact display window separate from the wider browser coverage margin',async()=>{
  const {store,tools}=setup()
  const result=await tools.load_fares.execute({coverage:{...coverage,dateWindow:{from:'2026-10-06',to:'2026-10-12'}},displayWindow:{from:'2026-10-09',to:'2026-10-10'}})
  expect(result).toMatchObject({coverage:{dateWindow:{from:'2026-10-06',to:'2026-10-12'}}})
  expect(store.get(artifactId).dates).toEqual({start:'2026-10-09',end:'2026-10-10'})
  const before=store.get(artifactId)
  expect(await tools.load_fares.execute({coverage,displayWindow:{from:'2026-10-08',to:'2026-10-10'}})).toMatchObject({status:'error'})
  expect(store.get(artifactId)).toEqual(before)
 });
});

it('propagates SDK cancellation and never commits late coverage',async()=>{
 const store=createUIStateStore();store.initializeMissing(artifactId,{})
 let release=()=>{},started=()=>{},observed:AbortSignal|undefined
 const ready=new Promise<void>(resolve=>{started=resolve}),gate=new Promise<void>(resolve=>{release=resolve})
 const bridge=createFareDataBridge({pageSource:async(_input,signal)=>{observed=signal;started();await gate;return{rows:[],total:0,pages:1,page:1,sourceVersion:'fixture'}}})
 const controller=new AbortController(),tool=createBrowserTools({store,bridge,activeArtifactId:()=>artifactId}).load_fares
 const pending=tool.execute({coverage},{abortSignal:controller.signal})
 await ready;controller.abort();release()
 expect(await pending).toMatchObject({status:'error'})
 expect(observed?.aborted).toBe(true);expect(store.get(artifactId).datasetRefs).toEqual([])
})
it('reports capacity instead of acknowledging an unretained ninth resource',async()=>{
 const store=createUIStateStore();store.initializeMissing(artifactId,{})
 const bridge=createFareDataBridge({pageSource:async()=>({rows:[],total:0,pages:1,page:1,sourceVersion:'fixture'})})
 const tools=createBrowserTools({store,bridge,activeArtifactId:()=>artifactId})
 for(let day=1;day<=8;day++){const date=`2026-10-${String(day).padStart(2,'0')}`;await tools.load_fares.execute({coverage:{...coverage,dateWindow:{from:date,to:date}}})}
 const before=store.get(artifactId),date='2026-10-09'
 expect(await tools.load_fares.execute({coverage:{...coverage,dateWindow:{from:date,to:date}}})).toMatchObject({status:'error',code:'DATASET_CAPACITY_EXCEEDED'})
 expect(store.get(artifactId)).toEqual(before)
 expect(await tools.load_fares.execute({coverage:{...coverage,dateWindow:{from:'2026-10-01',to:'2026-10-01'}}})).toHaveProperty('datasetId')
})


it('returns bounded names from the requested resource without copying fare rows',async()=>{
 const store=createUIStateStore();store.initializeMissing(artifactId,{})
 const bridge=createFareDataBridge({pageSource:async input=>({rows:Array.from({length:25},(_,index)=>FareRowSchema.parse({id:`fare-${input.date}-${index}`,originId:'london',destinationId:'paris',serviceDate:input.date,mode:'train',carrierId:`carrier-${index}`,carrierName:index===0?(input.date==='2026-10-09'?'ÖBB':'Other resource name'):index===1?undefined:`Named provider ${index}`,priceCents:2900,durationMinutes:120,departureMinutes:600,availableSeats:12,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})),total:25,page:1,pages:1,sourceVersion:'fixture'})})
 const first=await bridge.load(CoverageRequestSchema.parse(coverage),new AbortController().signal)
 const second=await bridge.load(CoverageRequestSchema.parse({...coverage,dateWindow:{from:'2026-10-10',to:'2026-10-10'}}),new AbortController().signal)
 const tools=createBrowserTools({store,bridge,activeArtifactId:()=>artifactId})
 const output=await tools.find_carriers.execute({datasetRef:first.datasetId})
 expect(output).toMatchObject({datasetId:first.datasetId,carriers:expect.arrayContaining([{id:'carrier-0',name:'ÖBB'},{id:'carrier-1',name:'carrier-1'}]),truncated:true})
 expect(output).toHaveProperty('carriers',expect.any(Array))
 if(typeof output==='object'&&output!==null&&'carriers' in output&&Array.isArray(output.carriers))expect(output.carriers).toHaveLength(20)
 else throw new Error('Expected bounded carrier metadata')
 expect(JSON.stringify(output)).not.toMatch(/priceCents|durationMinutes|availableSeats|rows|Other resource name|undefined|null/)
 expect(await tools.find_carriers.execute({datasetRef:second.datasetId})).toMatchObject({carriers:expect.arrayContaining([{id:'carrier-0',name:'Other resource name'}])})
 bridge.release(first.datasetId)
 expect(await tools.find_carriers.execute({datasetRef:first.datasetId})).toEqual({status:'error',code:'LOCAL_TOOL_FAILED'})
})
it('keeps cancellation and unsafe-input guards on carrier metadata',async()=>{
 const{tools}=setup(),controller=new AbortController();controller.abort()
 expect(await tools.find_carriers.execute({datasetRef:'dataset-1'},{abortSignal:controller.signal})).toEqual({status:'error',code:'LOCAL_TOOL_CANCELLED'})
 expect(await tools.find_carriers.execute({datasetRef:'dataset-1',rows:[{id:'fare-1',priceCents:100}]})).toEqual({status:'error',code:'LOCAL_TOOL_FAILED'})
})

it('returns readable carrier names beside filter ids',async()=>{
  const store=createUIStateStore();store.initializeMissing(artifactId,{dates:{start:'2026-10-09'}});
  const row=FareRowSchema.parse({id:'fare-1',originId:'london',destinationId:'paris',serviceDate:'2026-10-09',mode:'train',carrierId:'carrier-1772yvd',carrierName:'ÖBB',priceCents:2900,durationMinutes:120,departureMinutes:615,availableSeats:12,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true});
  const bridge=createFareDataBridge({pageSource:async()=>({rows:[row],total:1,pages:1,page:1,sourceVersion:'fixture'})});
  const manifest=await bridge.load(CoverageRequestSchema.parse(coverage),new AbortController().signal);
  const tools=createBrowserTools({store,bridge,activeArtifactId:()=>artifactId});
  expect(await tools.find_carriers.execute({datasetRef:manifest.datasetId})).toMatchObject({carriers:[{id:'carrier-1772yvd',name:'ÖBB'}]});
 });
