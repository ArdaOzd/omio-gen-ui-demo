import { z } from 'zod';
import { EditArtifactInputSchema,ArtifactIdSchema,CoverageRequestSchema,DatasetIdSchema,FareIdSchema,parseQuery,DatasetManifestSchema,BoundedFareFactSchema,type FareDataBridge,type UIStateStore,type ArtifactId,type UICommand,type DispatchResult,LIMITS } from '../contracts';
import {SummarizeFaresInputSchema} from './summarize-schema';
import {filterPredicate} from '../state/filter-predicate';
import {availableModes,legState,legRequest,resolveBoundDatasetId} from '../state/leg-bindings';
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
  load_fares:wrap(z.strictObject({coverage:CoverageRequestSchema,displayWindow:CoverageRequestSchema.shape.dateWindow.optional(),artifactRef:ArtifactIdSchema.optional()}),'Load or reuse a bounded browser resource; return only its manifest. coverage.dateWindow includes the chosen search margin. displayWindow is the exact user-facing trip range and excludes margin days. Coverage originIds/destinationIds use actual city slugs from the host location catalog, never dataset IDs.',async({coverage,displayWindow,artifactRef},signal)=>{
   if(displayWindow&&(displayWindow.from<coverage.dateWindow.from||displayWindow.to>coverage.dateWindow.to))throw new Error('Display window must be inside loaded coverage')
   const artifactId=artifactRef??options.activeArtifactId();const before=options.store.get(artifactId);
   if(before.datasetRefs.length>=LIMITS.artifactDatasets&&!before.datasetRefs.some(id=>{const {complete:_complete,truncated:_truncated,...request}=options.bridge.getManifest(id).coverage;return coverageKey(request)===coverageKey(coverage)}))throw new LocalToolError('DATASET_CAPACITY_EXCEEDED');
   const manifest=DatasetManifestSchema.parse(await options.bridge.load(coverage,signal));if(signal.aborted){options.bridge.release(manifest.datasetId);signal.throwIfAborted()}
   const current=options.store.get(artifactId);
   if(!current.datasetRefs.includes(manifest.datasetId)&&current.datasetRefs.length>=LIMITS.artifactDatasets){options.bridge.release(manifest.datasetId);throw new LocalToolError('DATASET_CAPACITY_EXCEEDED')}
   if(before.datasetRefs.length===0 && current.revision===before.revision){const visible=displayWindow??coverage.dateWindow;options.store.dispatch({artifactId,expectedRevision:before.revision,kind:'dates',dates:{start:visible.from,...(visible.to!==visible.from?{end:visible.to}:{})}})}
   const state=options.store.get(artifactId);
   const routeKey=coverage.originIds[0]&&coverage.destinationIds[0]?`${coverage.originIds[0]}:${coverage.destinationIds[0]}`:undefined
   if(routeKey){const current=options.store.get(artifactId),actual=availableModes(manifest);options.store.dispatch({artifactId,kind:'availableModesByLeg',availableModesByLeg:{...current.availableModesByLeg,[routeKey]:actual}});const scoped=options.store.get(artifactId),chosen=scoped.modesByLeg[routeKey];if(chosen){const retained=chosen.filter(mode=>actual.includes(mode));options.store.dispatch({artifactId,kind:'modesByLeg',modesByLeg:{...scoped.modesByLeg,[routeKey]:retained.length===actual.length?[]:retained}})}if(displayWindow){const updated=options.store.get(artifactId);options.store.dispatch({artifactId,kind:'displayWindowByLeg',displayWindowByLeg:{...updated.displayWindowByLeg,[routeKey]:displayWindow}})}}
   const routedState=options.store.get(artifactId)
   if(routedState.citySequence.length<2&&coverage.originIds[0]&&coverage.destinationIds[0])options.store.dispatch({artifactId,kind:'route',citySequence:[coverage.originIds[0],coverage.destinationIds[0]]})
   else if(coverage.originIds[0]===routedState.citySequence.at(-1)&&coverage.destinationIds[0])options.store.dispatch({artifactId,kind:'route',citySequence:[...routedState.citySequence,coverage.destinationIds[0]]})
   const routed=options.store.get(artifactId);options.store.dispatch({artifactId,kind:'datasets',datasetRefs:[...new Set([...routed.datasetRefs,manifest.datasetId])]});
   return manifest;
  }),
  summarize_fares:wrap(SummarizeFaresInputSchema,'Return at most30 grouped counts. Include artifactRef for the current artifact filters, leg dates and modes; omit artifactRef explicitly for a dataset-wide summary.',async({datasetRef,groupBy,artifactRef},signal)=>{
   const scope=()=>{
    if(!artifactRef)return{manifest:options.bridge.getManifest(datasetRef),where:undefined};
    const state=options.store.get(artifactRef);if(!state.datasetRefs.includes(datasetRef))throw new Error('Dataset outside artifact');
    const id=resolveBoundDatasetId(state,options.bridge,datasetRef),manifest=options.bridge.getManifest(id),request=legRequest(state,manifest.coverage);
    if(!state.datasetRefs.includes(id)||request.passengers!==manifest.coverage.passengers||request.dateWindow.from<manifest.coverage.dateWindow.from||request.dateWindow.to>manifest.coverage.dateWindow.to||!request.modes.every(mode=>manifest.coverage.modes.includes(mode)))throw new Error('Current artifact coverage unavailable');
    return{manifest,where:filterPredicate(legState(state,manifest.coverage))};
   };
   const captured=scope(),manifest=captured.manifest;
   const query=parseQuery({version:1,sources:[{datasetRef:manifest.datasetId,alias:'f'}],where:captured.where,groupBy:[groupBy],metrics:[{as:'count',op:'count'}],limit:30},[manifest]);
   const result=await options.bridge.query(query,signal),current=scope();
   if(result.datasetRevision!==manifest.revision||current.manifest.datasetId!==manifest.datasetId||current.manifest.revision!==manifest.revision||current.manifest.source.sourceVersion!==manifest.source.sourceVersion||JSON.stringify(current.where)!==JSON.stringify(captured.where))throw new Error('Stale summary scope');
   return {datasetId:manifest.datasetId,revision:manifest.revision,groups:result.rows.slice(0,30).map(row=>({label:String(row[groupBy]??''),count:Number(row.count??0)})),truncated:result.truncated};
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
  find_carriers:wrap(dataset,'Return at most20 carrier IDs with local readable names; unknown names use their stable IDs',async({datasetRef},signal)=>{
   const manifest=options.bridge.getManifest(datasetRef);const query=parseQuery({version:1,sources:[{datasetRef,alias:'d'}],groupBy:['carrierId'],metrics:[{as:'count',op:'count'}],limit:20},[manifest]);
   const result=await options.bridge.query(query,signal);return {datasetId:datasetRef,carriers:result.rows.slice(0,20).map(row=>{
    const id=z.string().min(1).max(96).parse(row.carrierId);
    const name=z.string().trim().min(1).max(120).parse(options.bridge.getCarrierLabel?.(id,datasetRef)??id);
    return{id,name};
   }),truncated:result.truncated};
  }),
 };
}
