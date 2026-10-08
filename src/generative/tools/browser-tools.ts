import { z } from 'zod';
import { EditArtifactInputSchema,UICommandPatchSchema, type UIStateStore,type ArtifactId,type UICommand,type DispatchResult,type UIStateRevision } from '../contracts';
import { assertNoBulkData } from '../contracts/privacy';
import { InspectDisplayInputSchema, InspectDisplayOutputSchema } from '../contracts/display-context';
import { DisplayInspectionError, type DisplayContextStore } from '../state/display-context';
import type { InputField } from '../contracts/display-context';
import type { ServerFareDataBridge } from '../data/fare-data-bridge';
type UICommandPatch=z.infer<typeof UICommandPatchSchema>;
function scopeMetadata(store:UIStateStore,bridge:ServerFareDataBridge,artifactId:ArtifactId){return store.get(artifactId).datasetRefs.flatMap((datasetRef,legIndex)=>{const binding=bridge.findBinding(datasetRef);if(!binding)return[];const {coverage,source,totalAvailable,complete}=binding.manifest;return[{datasetRef,resourceKey:binding.resourceKey,legIndex,originId:coverage.originId,destinationId:coverage.destinationId,dateWindow:coverage.dateWindow,sourceVersion:source.sourceVersion,totalAvailable,complete}]})}
function completeCommand(command:UICommandPatch,artifactId:ArtifactId,expectedRevision:UIStateRevision):UICommand{
 switch(command.kind){
  case'filters':return{...command,artifactId,expectedRevision}
  case'dates':return{...command,artifactId,expectedRevision}
  case'route':return{...command,artifactId,expectedRevision}
  case'sort':return{...command,artifactId,expectedRevision}
  case'sortByLeg':return{...command,artifactId,expectedRevision}
  case'stays':return{...command,artifactId,expectedRevision}
  case'runtimeVariables':return{...command,artifactId,expectedRevision}
  case'modesByLeg':return{...command,artifactId,expectedRevision}
  case'availableModesByLeg':return{...command,artifactId,expectedRevision}
  case'requestedModesByLeg':return{...command,artifactId,expectedRevision}
  case'displayWindowByLeg':return{...command,artifactId,expectedRevision}
  case'select':return{...command,artifactId,expectedRevision}
  default:{const exhaustive:never=command;return exhaustive}
 }
}
function commandInputFields(command:UICommandPatch):InputField[]{
 switch(command.kind){
  case 'filters':return['modes','carrierIds','minPriceCents','maxPriceCents','maxDurationMinutes','directOnly']
  case 'dates':case 'displayWindowByLeg':return['dateWindow']
  case 'sort':case 'sortByLeg':return['sort']
  case 'stays':return['stayNights']
  case 'route':return['originId','destinationId']
  case 'modesByLeg':case 'availableModesByLeg':case 'requestedModesByLeg':return['modes']
  default:return[]
 }
}
export function createBrowserTools(options:{bridge:ServerFareDataBridge;store:UIStateStore;displayStore?:DisplayContextStore;activeArtifactId:()=>ArtifactId;createArtifact?:()=>ArtifactId;signal?:()=>AbortSignal;dispatch?:(command:UICommand)=>DispatchResult;whenIdle?:(id:ArtifactId)=>Promise<void>}) {
 const wrap=<T>(schema:z.ZodType<T>,description:string,execute:(input:T,signal:AbortSignal)=>Promise<unknown>)=>({
  description, parameters:schema,
  execute:async(input:unknown,context?:{abortSignal?:AbortSignal})=>{const signals=[context?.abortSignal,options.signal?.()].filter((signal):signal is AbortSignal=>signal!==undefined);const signal=AbortSignal.any(signals);try{signal.throwIfAborted();const output=await execute(schema.parse(input),signal);signal.throwIfAborted();assertNoBulkData(output);return output;}catch(error){const output=error instanceof DisplayInspectionError?{status:'error' as const,code:error.code,message:error.message}:{status:'error' as const,code:signal.aborted?'LOCAL_TOOL_CANCELLED':'LOCAL_TOOL_FAILED'};assertNoBulkData(output);return output;}}
 });
 return {
  inspect_display:wrap(InspectDisplayInputSchema,'Inspect at most five items from one immutable display captured for this turn. The capture, handle, result and optional source version must match; this never runs a new fare query.',async input=>{
   if(!options.displayStore)throw new Error('Display inspection unavailable')
   return InspectDisplayOutputSchema.parse(options.displayStore.inspect(input))
  }),
  create_artifact:wrap(z.strictObject({}),'Create and activate a separate empty artifact with a host-owned ID',async()=>{if(!options.createArtifact)throw new Error('Artifact creation unavailable');const artifactId=options.createArtifact();options.store.initializeMissing(artifactId,{});return {artifactId,revision:options.store.get(artifactId).revision};}),
  edit_artifact:wrap(EditArtifactInputSchema,'Apply a bounded typed state patch only at the observed revision',async({artifactRef,expectedRevision,commands},signal)=>{
   for(const command of commands)if(command.kind==='select'&&!options.bridge.findCachedFare(command.fareId))throw new Error('Fare selection is outside the current displayed results');
   signal.throwIfAborted();let current=options.store.get(artifactRef);if(current.revision!==expectedRevision)return {artifactId:artifactRef,status:'stale',revision:current.revision};
   for(const command of commands){const result=(options.dispatch??options.store.dispatch)(completeCommand(command,artifactRef,current.revision));if(result.status==='stale')return {artifactId:artifactRef,...result};options.displayStore?.recordInteraction({artifactId:artifactRef,actor:'agent',action:command.kind==='select'?(command.selected?'select':'deselect'):'input',inputFields:commandInputFields(command)});current=options.store.get(artifactRef);}
   await options.whenIdle?.(artifactRef);
   return {artifactId:artifactRef,status:'applied',revision:options.store.get(artifactRef).revision,scopes:scopeMetadata(options.store,options.bridge,artifactRef)};
  }),
 };
}
