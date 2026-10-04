import { z } from 'zod';
import { EditArtifactInputSchema,ArtifactIdSchema,CoverageRequestSchema,DatasetIdSchema,FareIdSchema,FareFieldSchema,parseQuery,DatasetManifestSchema,BoundedFareFactSchema,type FareDataBridge,type UIStateStore,type ArtifactId,type UICommand,type DispatchResult,LIMITS } from '../contracts';
import { coverageKey } from '../data/resource-loader';
import { assertNoBulkData } from '../contracts/privacy';
class LocalToolError extends Error{constructor(readonly code:'DATASET_CAPACITY_EXCEEDED'){super(code)}}
export function createBrowserTools(options:{bridge:FareDataBridge;store:UIStateStore;activeArtifactId:()=>ArtifactId;createArtifact?:()=>ArtifactId;signal?:()=>AbortSignal;dispatch?:(command:UICommand)=>DispatchResult;whenIdle?:(id:ArtifactId)=>Promise<void>}) {
 const wrap=<T>(schema:z.ZodType<T>,description:string,execute:(input:T,signal:AbortSignal)=>Promise<unknown>)=>({
  description, parameters:schema,
  execute:async(input:unknown,context?:{abortSignal?:AbortSignal})=>{const signals=[context?.abortSignal,options.signal?.()].filter((signal):signal is AbortSignal=>signal!==undefined);const signal=AbortSignal.any(signals);try{signal.throwIfAborted();const output=await execute(schema.parse(input),signal);signal.throwIfAborted();assertNoBulkData(output);return output;}catch(error){return {status:'error',code:signal.aborted?'LOCAL_TOOL_CANCELLED':error instanceof LocalToolError?error.code:'LOCAL_TOOL_FAILED'};}}
 });
 const dataset=z.strictObject({datasetRef:DatasetIdSchema});
 return {
  create_artifact:wrap(z.strictObject({}),'Create and activate a separate empty artifact with a host-owned ID',async()=>{if(!options.createArtifact)throw new Error('Artifact creation unavailable');const artifactId=options.createArtifact();options.store.initializeMissing(artifactId,{});return {artifactId,revision:options.store.get(artifactId).revision};}),
  edit_artifact:wrap(EditArtifactInputSchema,'Apply a bounded typed state patch only at the observed revision',async({artifactRef,expectedRevision,commands},signal)=>{
   for(const command of commands)if(command.kind==='select')await options.bridge.lookupFare(command.fareId,['id']);
   signal.throwIfAborted();let current=options.store.get(artifactRef);if(current.revision!==expectedRevision)return {artifactId:artifactRef,status:'stale',revision:current.revision};
   for(const command of commands){const result=(options.dispatch??options.store.dispatch)({...command,artifactId:artifactRef,expectedRevision:current.revision});if(result.status==='stale')return {artifactId:artifactRef,...result};current=options.store.get(artifactRef);}
   await options.whenIdle?.(artifactRef);
   return {artifactId:artifactRef,status:'applied',revision:options.store.get(artifactRef).revision};
  }),
  load_fares:wrap(z.strictObject({coverage:CoverageRequestSchema,artifactRef:ArtifactIdSchema.optional()}),'Load or reuse a bounded browser resource; return only its manifest. Coverage originIds/destinationIds use actual city slugs from the host location catalog (for example london, paris, barcelona), never dataset IDs.',async({coverage,artifactRef},signal)=>{
   const artifactId=artifactRef??options.activeArtifactId();const before=options.store.get(artifactId);
   if(before.datasetRefs.length>=LIMITS.artifactDatasets&&!before.datasetRefs.some(id=>{const {complete:_complete,truncated:_truncated,...request}=options.bridge.getManifest(id).coverage;return coverageKey(request)===coverageKey(coverage)}))throw new LocalToolError('DATASET_CAPACITY_EXCEEDED');
   const manifest=DatasetManifestSchema.parse(await options.bridge.load(coverage,signal));if(signal.aborted){options.bridge.release(manifest.datasetId);signal.throwIfAborted()}
   const current=options.store.get(artifactId);
   if(!current.datasetRefs.includes(manifest.datasetId)&&current.datasetRefs.length>=LIMITS.artifactDatasets){options.bridge.release(manifest.datasetId);throw new LocalToolError('DATASET_CAPACITY_EXCEEDED')}
   if(before.datasetRefs.length===0 && current.revision===before.revision)options.store.dispatch({artifactId,expectedRevision:before.revision,kind:'dates',dates:{start:coverage.dateWindow.from}});
   const state=options.store.get(artifactId);
   options.store.dispatch({artifactId,kind:'datasets',datasetRefs:[...new Set([...state.datasetRefs,manifest.datasetId])]});
   return manifest;
  }),
  summarize_fares:wrap(z.strictObject({datasetRef:DatasetIdSchema,groupBy:FareFieldSchema}),'Return at most30 grouped counts',async({datasetRef,groupBy},signal)=>{
   const manifest=options.bridge.getManifest(datasetRef);const query=parseQuery({version:1,sources:[{datasetRef,alias:'d'}],groupBy:[groupBy],metrics:[{as:'count',op:'count'}],limit:30},[manifest]);
   const result=await options.bridge.query(query,signal);
   return {datasetId:datasetRef,revision:manifest.revision,groups:result.rows.slice(0,30).map(row=>({label:String(row[groupBy]??''),count:Number(row.count??0)})),truncated:result.truncated};
  }),
  get_top_fares:wrap(z.strictObject({datasetRef:DatasetIdSchema,objective:z.enum(['cheapest','fastest'])}),'Return at most5 compact fare facts',async({datasetRef,objective},signal)=>{
   const manifest=options.bridge.getManifest(datasetRef);const field=objective==='cheapest'?'priceCents':'durationMinutes';
   const query=parseQuery({version:1,sources:[{datasetRef,alias:'d'}],project:['id',field],topK:{k:5,by:field,direction:'asc'},limit:5},[manifest]);
   const result=await options.bridge.query(query,signal);const facts=[];
   for(const row of result.rows.slice(0,5)){const id=FareIdSchema.parse(row.id);facts.push(BoundedFareFactSchema.parse(await options.bridge.lookupFare(id,['id','priceCents','durationMinutes'])));}
   return {datasetId:datasetRef,revision:manifest.revision,facts};
  }),
  get_fare:wrap(z.strictObject({fareId:FareIdSchema}),'Return one compact fare fact',async({fareId})=>BoundedFareFactSchema.parse(await options.bridge.lookupFare(fareId,['id','priceCents','durationMinutes']))),
  get_route:wrap(dataset,'Return compact route and mode coverage',async({datasetRef})=>{
   const manifest=options.bridge.getManifest(datasetRef);return {datasetId:datasetRef,originIds:manifest.coverage.originIds,destinationIds:manifest.coverage.destinationIds,modes:manifest.coverage.modes};
  }),
  find_carriers:wrap(dataset,'Return at most20 carrier IDs',async({datasetRef},signal)=>{
   const manifest=options.bridge.getManifest(datasetRef);const query=parseQuery({version:1,sources:[{datasetRef,alias:'d'}],groupBy:['carrierId'],metrics:[{as:'count',op:'count'}],limit:20},[manifest]);
   const result=await options.bridge.query(query,signal);return {datasetId:datasetRef,carrierIds:result.rows.map(row=>String(row.carrierId)).slice(0,20),truncated:result.truncated};
  }),
 };
}
