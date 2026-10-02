import { z } from 'zod'
import { ArtifactIdSchema,ArtifactUIStateSchema,CoverageRequestSchema,DatasetIdSchema,CONTRACT_VERSION,CATALOG_VERSION,UIStateRevisionSchema,type FareDataBridge,type UIStateStore } from '../contracts'
import { assertNoBulkData } from '../contracts/privacy'
const descriptor=z.strictObject({datasetId:DatasetIdSchema,request:CoverageRequestSchema,sourceVersion:z.string().min(1).max(96),complete:z.boolean()})
export const PersistedThreadSchema=z.strictObject({schemaVersion:z.literal(CONTRACT_VERSION),catalogVersion:z.literal(CATALOG_VERSION),activeArtifactId:ArtifactIdSchema.optional(),parserVersion:z.literal('openui-0.3.0'),queryVersion:z.literal('1'),messages:z.array(z.unknown()).max(200),artifacts:z.array(z.strictObject({variant:z.enum(['a','b']),source:z.string().max(60000),state:ArtifactUIStateSchema})).max(20),descriptors:z.array(descriptor).max(20)})
export type PersistedThread=z.infer<typeof PersistedThreadSchema>
export interface ThreadStorage {read(key:string):Promise<unknown>;write(key:string,value:PersistedThread):Promise<void>}
export function parsePersistedThread(input:unknown):PersistedThread{assertNoBulkData(input);return PersistedThreadSchema.parse(input)}
export function createIndexedDBStorage(databaseName='omio-generative-state'):ThreadStorage{
 const database=new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(databaseName,1);request.onupgradeneeded=()=>request.result.createObjectStore('threads');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Local persistence unavailable'))})
 return{async read(key){const db=await database;return new Promise((resolve,reject)=>{const request=db.transaction('threads','readonly').objectStore('threads').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Thread reload failed'))})},async write(key,value){const db=await database;await new Promise<void>((resolve,reject)=>{const tx=db.transaction('threads','readwrite');tx.objectStore('threads').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('Thread save failed'))})}}
}
export function createThreadPersistence(storage:ThreadStorage=createIndexedDBStorage()){
 return{async save(key:string,input:unknown){const record=parsePersistedThread(input);await storage.write(key,record)},async load(key:string):Promise<PersistedThread|null>{const raw=await storage.read(key);if(raw===undefined||raw===null)return null;try{return parsePersistedThread(raw)}catch{return null}},async restore(record:PersistedThread,bridge:FareDataBridge,store:UIStateStore,signal:AbortSignal,onSourceChanged?:(clearedSelections:boolean)=>void){
  const valid=parsePersistedThread(record)
  const changed=new Set<string>();let clearedSelections=false;
  const loaded=await Promise.all(valid.descriptors.map(async descriptor=>{const manifest=await bridge.load(descriptor.request,signal);if(manifest.source.sourceVersion!==descriptor.sourceVersion)changed.add(manifest.datasetId);return manifest}))
  for(const artifact of valid.artifacts){for(const ref of artifact.state.datasetRefs)if(!loaded.some(manifest=>manifest.datasetId===ref))throw new Error('Missing reload descriptor');const affected=artifact.state.datasetRefs.some(ref=>changed.has(ref));if(affected&&artifact.state.selectedFareIds.length)clearedSelections=true;store.initializeMissing(artifact.state.artifactId,affected?{...artifact.state,revision:UIStateRevisionSchema.parse(artifact.state.revision+1),selectedFareIds:[]}:artifact.state)}
  if(changed.size)onSourceChanged?.(clearedSelections);
  return loaded
 }}
}
