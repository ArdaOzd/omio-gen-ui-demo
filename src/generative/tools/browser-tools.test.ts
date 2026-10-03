import { describe,expect,it } from 'vitest';
import { createBrowserTools } from './browser-tools';
import { createFareDataBridge } from '../data/fare-data-bridge';
import { createUIStateStore } from '../state/ui-state-store';
import { ArtifactIdSchema,FareRowSchema,UIStateRevisionSchema,type CoverageRequest } from '../contracts';
const artifactId=ArtifactIdSchema.parse('artifact-test');
const coverage:CoverageRequest={originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-09'},modes:['train'],passengers:1};
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
 it('returns readable carrier names beside filter ids',async()=>{
  const store=createUIStateStore();store.initializeMissing(artifactId,{dates:{start:'2026-10-09'}});
  const row=FareRowSchema.parse({id:'fare-1',originId:'london',destinationId:'paris',serviceDate:'2026-10-09',mode:'train',carrierId:'carrier-1772yvd',carrierName:'ÖBB',priceCents:2900,durationMinutes:120,departureMinutes:615,availableSeats:12,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true});
  const bridge=createFareDataBridge({pageSource:async()=>({rows:[row],total:1,pages:1,page:1,sourceVersion:'fixture'})});
  const manifest=await bridge.load(coverage,new AbortController().signal);
  const tools=createBrowserTools({store,bridge,activeArtifactId:()=>artifactId});
  expect(await tools.find_carriers.execute({datasetRef:manifest.datasetId})).toMatchObject({carriers:[{id:'carrier-1772yvd',name:'ÖBB'}]});
 });
});
