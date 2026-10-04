import { describe,expect,it } from 'vitest';
import { createBrowserTools } from './browser-tools';
import { createFareDataBridge } from '../data/fare-data-bridge';
import { createUIStateStore } from '../state/ui-state-store';
import { ArtifactIdSchema,UIStateRevisionSchema } from '../contracts';
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
