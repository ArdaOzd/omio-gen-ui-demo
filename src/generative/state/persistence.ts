import { z } from 'zod'
import { ArtifactIdSchema,ArtifactUIStateSchema,DatasetIdSchema,CONTRACT_VERSION,CATALOG_VERSION,UIStateRevisionSchema,LIMITS,type ArtifactId,type BoundedFareFact,type FareId,type UIStateStore } from '../contracts'
import { FareScopeSchema,ResourceKeySchema,type FareScope,type FareScopeBinding,type LookupPin } from '../contracts/query-groups'
import type { ServerFareDataBridge } from '../data/fare-data-bridge'
import { assertNoBulkData } from '../contracts/privacy'
import { PlannedFareSchema } from '../tracker/planning-store'
import { SceneSnapshotSchema } from '../presentation/scene-lifecycle'
const descriptor=z.strictObject({datasetId:DatasetIdSchema,resourceKey:ResourceKeySchema,scope:FareScopeSchema,sourceVersion:z.string().min(1).max(96),complete:z.boolean()})
const retainedSceneIds=(messages:unknown[]):Set<string>=>{
 const ids=new Set<string>()
 for(const message of messages){
  if(typeof message!=='object'||message===null||!('parts'in message)||!Array.isArray(message.parts))continue
  for(const part of message.parts)if(typeof part==='object'&&part!==null&&'type'in part&&part.type==='tool-present'&&'state'in part&&part.state==='output-available'&&'toolCallId'in part&&typeof part.toolCallId==='string')ids.add(part.toolCallId)
 }
 return ids
}
type PersistedReferences={
 messages:unknown[]
 descriptors:Array<{datasetId:string}>
 artifacts:Array<{state:{datasetRefs:readonly string[]}}>
 sceneSnapshots:Array<{toolCallId:string;artifactStates:Array<{datasetRefs:readonly string[]}>}>
}
function validatePersistedReferences(record:PersistedReferences,context:z.core.$RefinementCtx):void{
 const retained=retainedSceneIds(record.messages),seen=new Set<string>()
 record.sceneSnapshots.forEach((snapshot,index)=>{
  if(seen.has(snapshot.toolCallId))context.addIssue({code:'custom',path:['sceneSnapshots',index,'toolCallId'],message:'Duplicate scene snapshot'})
  else seen.add(snapshot.toolCallId)
  if(!retained.has(snapshot.toolCallId))context.addIssue({code:'custom',path:['sceneSnapshots',index,'toolCallId'],message:'Scene snapshot is not retained in message history'})
 })
 const referenced=new Set([
  ...record.artifacts.flatMap(artifact=>artifact.state.datasetRefs),
  ...record.sceneSnapshots.flatMap(snapshot=>snapshot.artifactStates.flatMap(state=>state.datasetRefs)),
 ])
 const described=new Set<string>()
 record.descriptors.forEach((item,index)=>{
  if(described.has(item.datasetId))context.addIssue({code:'custom',path:['descriptors',index,'datasetId'],message:'Duplicate dataset descriptor'})
  else described.add(item.datasetId)
  if(!referenced.has(item.datasetId))context.addIssue({code:'custom',path:['descriptors',index,'datasetId'],message:'Descriptor is not referenced by retained state'})
 })
 for(const datasetId of referenced)if(!described.has(datasetId))context.addIssue({code:'custom',path:['descriptors'],message:`Missing descriptor for retained dataset: ${datasetId}`})
}
const persistedThreadFields={recordRevision:z.number().int().nonnegative().optional(),schemaVersion:z.literal(CONTRACT_VERSION),catalogVersion:z.literal(CATALOG_VERSION),activeArtifactId:ArtifactIdSchema.optional(),parserVersion:z.literal('native-present-1'),queryVersion:z.literal('1'),messages:z.array(z.unknown()),descriptors:z.array(descriptor),plannedFares:z.array(PlannedFareSchema).max(LIMITS.plannedFares).default([]),sceneSnapshots:z.array(SceneSnapshotSchema).default([])}
const artifactRecords=z.array(z.strictObject({source:z.string().max(60000),state:ArtifactUIStateSchema})).max(LIMITS.storedArtifacts)
export const PersistedThreadSchema=z.strictObject({...persistedThreadFields,artifacts:artifactRecords}).superRefine(validatePersistedReferences)
const LegacyPersistedThreadSchema=z.strictObject({...persistedThreadFields,artifacts:z.array(z.strictObject({variant:z.literal('a'),source:z.string().max(60000),state:ArtifactUIStateSchema})).max(LIMITS.storedArtifacts)}).superRefine(validatePersistedReferences)
export type PersistedThread=z.infer<typeof PersistedThreadSchema>
export interface ThreadStorage {read(key:string):Promise<unknown>;write(key:string,value:PersistedThread,expectedRevision?:number):Promise<void>}
export class ThreadConflictError extends Error{constructor(){super('A newer conversation was saved in another tab. Reload to see it; this tab has not overwritten it.');this.name='ThreadConflictError'}}
function recordRevision(input:unknown):number{return typeof input==='object'&&input!==null&&'recordRevision'in input&&typeof input.recordRevision==='number'?input.recordRevision:0}
function parseStoredThread(input:unknown):{record:PersistedThread;migrated:boolean}{
 assertNoBulkData(input)
 const current=PersistedThreadSchema.safeParse(input)
 if(current.success)return{record:current.data,migrated:false}
 const legacy=LegacyPersistedThreadSchema.parse(input)
 return{record:PersistedThreadSchema.parse({...legacy,artifacts:legacy.artifacts.map(artifact=>({source:artifact.source,state:artifact.state}))}),migrated:true}
}
export function parsePersistedThread(input:unknown):PersistedThread{return parseStoredThread(input).record}
export function createIndexedDBStorage(databaseName='omio-generative-state'):ThreadStorage{
 const database=new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(databaseName,1);request.onupgradeneeded=()=>request.result.createObjectStore('threads');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Local persistence unavailable'))})
 return{async read(key){const db=await database;return new Promise((resolve,reject)=>{const request=db.transaction('threads','readonly').objectStore('threads').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Thread reload failed'))})},async write(key,value,expectedRevision){const db=await database;await new Promise<void>((resolve,reject)=>{const tx=db.transaction('threads','readwrite'),store=tx.objectStore('threads'),current=store.get(key);let conflict=false;current.onsuccess=()=>{if(expectedRevision!==undefined&&recordRevision(current.result)!==expectedRevision){conflict=true;tx.abort();return;}store.put(value,key)};tx.oncomplete=()=>resolve();tx.onabort=()=>reject(conflict?new ThreadConflictError():new Error('Thread save failed'));tx.onerror=()=>reject(new Error('Thread save failed'))})}}
}
async function hydrateRestoredSelections(record:PersistedThread,bindings:FareScopeBinding[],changed:ReadonlySet<string>,bridge:ServerFareDataBridge,signal:AbortSignal):Promise<void>{
 const byDataset=new Map(bindings.map(binding=>[binding.datasetId,binding]))
 const pinsBySource=new Map<string,Map<string,LookupPin>>()
 for(const artifact of record.artifacts){
  if(artifact.state.datasetRefs.some(ref=>changed.has(ref)))continue
  for(const datasetId of artifact.state.datasetRefs){
   const binding=byDataset.get(datasetId)
   if(!binding)continue
   for(const fareId of artifact.state.selectedFareIds){
    if(bridge.findCachedFare(fareId,binding.resourceKey))continue
    const pins=pinsBySource.get(binding.manifest.source.sourceVersion)??new Map<string,LookupPin>()
    pins.set(`${binding.resourceKey}\u0000${fareId}`,{fareId,resourceKey:binding.resourceKey})
    pinsBySource.set(binding.manifest.source.sourceVersion,pins)
   }
  }
 }
 const requests:Promise<unknown>[]=[]
 for(const [sourceVersion,pins] of pinsBySource){
  const values=[...pins.values()]
  for(let offset=0;offset<values.length;offset+=160)requests.push(bridge.lookupPins({version:1,requestId:`restore-${crypto.randomUUID()}`,sourceVersion,pins:values.slice(offset,offset+160)},signal))
 }
 await Promise.all(requests)
}
export type SourceChange={clearedSelections:boolean;sourceChangedFareIdsByArtifact:ReadonlyMap<ArtifactId,ReadonlySet<FareId>>}
function fareMatchesScope(fare:BoundedFareFact,scope:FareScope):boolean{
 return fare.originId===scope.originId&&fare.destinationId===scope.destinationId&&fare.serviceDate>=scope.dateWindow.from&&fare.serviceDate<=scope.dateWindow.to&&(fare.serviceDate>scope.earliestDeparture.date||(fare.serviceDate===scope.earliestDeparture.date&&fare.departureMinutes>=scope.earliestDeparture.minutes))
}
function addChangedFare(result:Map<ArtifactId,Set<FareId>>,owner:ArtifactId,fareId:FareId):void{
 const ids=result.get(owner)??new Set<FareId>();ids.add(fareId);result.set(owner,ids)
}
function legacyChangedFareIdsByArtifact(record:PersistedThread,changed:ReadonlySet<string>):Map<ArtifactId,Set<FareId>>{
 const descriptors=new Map(record.descriptors.map(item=>[item.datasetId,item]))
 const states=[...record.artifacts.map(artifact=>artifact.state),...record.sceneSnapshots.flatMap(snapshot=>snapshot.artifactStates)]
 const result=new Map<ArtifactId,Set<FareId>>()
 for(const state of states){
  const scopes=state.datasetRefs.filter(ref=>changed.has(ref)).flatMap(ref=>{const item=descriptors.get(ref);return item?[item.scope]:[]})
  if(!scopes.length)continue
  for(const entry of record.plannedFares){
   if(!entry.owners.includes(state.artifactId)||entry.sources?.some(source=>source.owner===state.artifactId)||!scopes.some(scope=>fareMatchesScope(entry.fact,scope)))continue
   addChangedFare(result,state.artifactId,entry.fact.id)
  }
 }
 return result
}
async function validatePlannedFareSources(record:PersistedThread,bridge:ServerFareDataBridge,signal:AbortSignal,result:Map<ArtifactId,Set<FareId>>):Promise<void>{
 await Promise.all(record.plannedFares.flatMap(entry=>(entry.sources??[]).map(async saved=>{
  const manifest=await bridge.loadScope(saved.scope,signal)
  try{
   if(manifest.resourceKey!==saved.source.descriptorId)throw new Error('Restored fare scope identity changed')
   if(manifest.source.sourceVersion!==saved.source.sourceVersion)addChangedFare(result,saved.owner,entry.fact.id)
  }finally{bridge.release(manifest.resourceKey)}
 })))
}
export function createThreadPersistence(storage:ThreadStorage=createIndexedDBStorage()){
 const revisions=new Map<string,number>();let pending:Promise<void>=Promise.resolve();
 return{save(key:string,input:unknown):Promise<void>{const operation=pending.then(async()=>{const expected=revisions.get(key)??0;if(recordRevision(await storage.read(key))!==expected)throw new ThreadConflictError();const record=parsePersistedThread({...parsePersistedThread(input),recordRevision:expected+1});await storage.write(key,record,expected);revisions.set(key,expected+1)});pending=operation.catch(()=>{});return operation},async load(key:string):Promise<PersistedThread|null>{const raw=await storage.read(key),revision=recordRevision(raw);revisions.set(key,revision);if(raw===undefined||raw===null)return null;let parsed:{record:PersistedThread;migrated:boolean};try{parsed=parseStoredThread(raw)}catch{return null}if(parsed.migrated)await storage.write(key,parsed.record,revision);return parsed.record},async restore(record:PersistedThread,bridge:ServerFareDataBridge,store:UIStateStore,signal:AbortSignal,onSourceChanged?:(change:SourceChange)=>void){
  const valid=parsePersistedThread(record)
  const changed=new Set<string>();let clearedSelections=false;
  const loaded=await Promise.all(valid.descriptors.map(async descriptor=>{const manifest=await bridge.loadScope(descriptor.scope,signal);const binding=bridge.getBinding(manifest.resourceKey);if(binding.datasetId!==descriptor.datasetId||binding.resourceKey!==descriptor.resourceKey)throw new Error('Restored fare scope identity changed');if(manifest.source.sourceVersion!==descriptor.sourceVersion)changed.add(binding.datasetId);return binding}))
  await hydrateRestoredSelections(valid,loaded,changed,bridge,signal)
  const sourceChangedFareIdsByArtifact=legacyChangedFareIdsByArtifact(valid,changed)
  await validatePlannedFareSources(valid,bridge,signal,sourceChangedFareIdsByArtifact)
  for(const artifact of valid.artifacts){for(const ref of artifact.state.datasetRefs)if(!loaded.some(binding=>binding.datasetId===ref))throw new Error('Missing reload descriptor');const affected=artifact.state.datasetRefs.some(ref=>changed.has(ref));if(affected&&artifact.state.selectedFareIds.length)clearedSelections=true;store.initializeMissing(artifact.state.artifactId,affected?{...artifact.state,revision:UIStateRevisionSchema.parse(artifact.state.revision+1),selectedFareIds:[]}:artifact.state)}
  if(sourceChangedFareIdsByArtifact.size)clearedSelections=true
  if(changed.size||sourceChangedFareIdsByArtifact.size)onSourceChanged?.({clearedSelections,sourceChangedFareIdsByArtifact});
  return loaded
 }}
}
