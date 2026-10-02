import { z } from 'zod';
import { ArtifactIdSchema,CoverageRequestSchema,DatasetIdSchema,FareIdSchema,FareFieldSchema,parseQuery,DatasetManifestSchema,BoundedFareFactSchema,type FareDataBridge,type UIStateStore,type ArtifactId } from '../contracts';
import { assertNoBulkData } from '../contracts/privacy';
export function createBrowserTools(options:{bridge:FareDataBridge;store:UIStateStore;activeArtifactId:()=>ArtifactId;signal?:()=>AbortSignal}) {
 const signal=()=>options.signal?.()??new AbortController().signal;
 const wrap=<T>(schema:z.ZodType<T>,description:string,execute:(input:T)=>Promise<unknown>)=>({
  description, parameters:schema,
  execute:async(input:unknown)=>{try{const output=await execute(schema.parse(input));assertNoBulkData(output);return output;}catch{return {status:'error',code:'LOCAL_TOOL_FAILED'};}}
 });
 const dataset=z.strictObject({datasetRef:DatasetIdSchema});
 return {
  load_fares:wrap(z.strictObject({coverage:CoverageRequestSchema}),'Load or reuse a bounded browser resource; return only its manifest',async({coverage})=>{
   const manifest=DatasetManifestSchema.parse(await options.bridge.load(coverage,signal()));
   const artifactId=options.activeArtifactId();const state=options.store.get(artifactId);
   options.store.dispatch({artifactId,kind:'datasets',datasetRefs:[...new Set([...state.datasetRefs,manifest.datasetId])].slice(0,8)});
   return manifest;
  }),
  summarize_fares:wrap(z.strictObject({datasetRef:DatasetIdSchema,groupBy:FareFieldSchema}),'Return at most30 grouped counts',async({datasetRef,groupBy})=>{
   const manifest=options.bridge.getManifest(datasetRef);const query=parseQuery({version:1,sources:[{datasetRef,alias:'d'}],groupBy:[groupBy],metrics:[{as:'count',op:'count'}],limit:30},[manifest]);
   const result=await options.bridge.query(query,signal());
   return {datasetId:datasetRef,revision:manifest.revision,groups:result.rows.slice(0,30).map(row=>({label:String(row[groupBy]??''),count:Number(row.count??0)})),truncated:result.truncated};
  }),
  get_top_fares:wrap(z.strictObject({datasetRef:DatasetIdSchema,objective:z.enum(['cheapest','fastest'])}),'Return at most5 compact fare facts',async({datasetRef,objective})=>{
   const manifest=options.bridge.getManifest(datasetRef);const field=objective==='cheapest'?'priceCents':'durationMinutes';
   const query=parseQuery({version:1,sources:[{datasetRef,alias:'d'}],project:['id',field],topK:{k:5,by:field,direction:'asc'},limit:5},[manifest]);
   const result=await options.bridge.query(query,signal());const facts=[];
   for(const row of result.rows.slice(0,5)){const id=FareIdSchema.parse(row.id);facts.push(BoundedFareFactSchema.parse(await options.bridge.lookupFare(id,['id','priceCents','durationMinutes'])));}
   return {datasetId:datasetRef,revision:manifest.revision,facts};
  }),
  get_fare:wrap(z.strictObject({fareId:FareIdSchema}),'Return one compact fare fact',async({fareId})=>BoundedFareFactSchema.parse(await options.bridge.lookupFare(fareId,['id','priceCents','durationMinutes']))),
  get_route:wrap(dataset,'Return compact route and mode coverage',async({datasetRef})=>{
   const manifest=options.bridge.getManifest(datasetRef);return {datasetId:datasetRef,originIds:manifest.coverage.originIds,destinationIds:manifest.coverage.destinationIds,modes:manifest.coverage.modes};
  }),
  find_carriers:wrap(dataset,'Return at most20 carrier IDs',async({datasetRef})=>{
   const manifest=options.bridge.getManifest(datasetRef);const query=parseQuery({version:1,sources:[{datasetRef,alias:'d'}],groupBy:['carrierId'],metrics:[{as:'count',op:'count'}],limit:20},[manifest]);
   const result=await options.bridge.query(query,signal());return {datasetId:datasetRef,carrierIds:result.rows.map(row=>String(row.carrierId)).slice(0,20),truncated:result.truncated};
  }),
 };
}
