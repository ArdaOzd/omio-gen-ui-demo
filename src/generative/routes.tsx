import { useEffect, useMemo, useState } from 'react';
import bToolkit from './variants/b/toolkit';
import { getSceneMetadata } from './scene-metadata';
import type { UIMessage } from 'ai';
import { ArtifactIdSchema, CATALOG_VERSION, CONTRACT_VERSION, type ArtifactId } from './contracts';
import { createFareDataBridge } from './data/fare-data-bridge';
import { createUIStateStore } from './state/ui-state-store';
import { createArtifactStore } from './state/artifact-store';
import { createActionRouter } from './state/action-router';
import { captureAgentContext } from './state/snapshot-exporter';
import { createIndexedDBStorage, createThreadPersistence, ThreadConflictError } from './state/persistence';
import { assertNoBulkData } from './contracts/privacy';
import { GenerativeChat } from './chat/runtime-provider';
import type { TravelServices } from './catalog/context';
function createServices(onCoverageStatus:(message:string)=>void){
 const bridge=createFareDataBridge();const state=createUIStateStore();const artifacts=createArtifactStore();
 const createArtifact=()=>{if(artifacts.getIds().length>=8)throw new Error('Eight-artifact limit reached');const id=ArtifactIdSchema.parse(`artifact-${crypto.randomUUID()}`);artifacts.register(id);state.initializeMissing(id,{});artifacts.activate(id);return id;};
 const router=createActionRouter(state,{bridge,activate:id=>artifacts.activate(id),onCoverageStatus:status=>onCoverageStatus(status.status==='loading'?'Loading the requested travel dates…':status.status==='error'?status.message??'Coverage could not be loaded. Try the date again.':'')});
 const services:TravelServices={bridge,state,activeId:artifacts.getActiveId,subscribeActive:artifacts.subscribe,activate:id=>artifacts.activate(ArtifactIdSchema.parse(id)),dispatch:router,whenIdle:router.whenIdle,createArtifact};
 return {services,artifacts,createArtifact,router};
}
export function GenerativeRoute({variant,blinded=false}:{variant:'a'|'b';blinded?:boolean}){
 const [notice,setNotice]=useState('');const [restoreAttempt,setRestoreAttempt]=useState(0);const [restoreError,setRestoreError]=useState(false);const [diagnostics,setDiagnostics]=useState('');const [runtime]=useState(()=>createServices(setNotice));const [registryRevision,setRegistryRevision]=useState(0);const [ready,setReady]=useState(false);const [messages,setMessages]=useState<UIMessage[]>([]);
 const persistence=useMemo(()=>createThreadPersistence(),[]);const key=`travel-${variant}`;
 useEffect(()=>{const controller=new AbortController();setRestoreError(false);persistence.load(key).then(async record=>{
  if(record){const valid=record.messages.filter((message):message is UIMessage=>typeof message==='object'&&message!==null&&'id' in message&&'role' in message&&'parts' in message);setMessages(valid);let sourceRefreshed=false;await persistence.restore(record,runtime.services.bridge,runtime.services.state,controller.signal,cleared=>{sourceRefreshed=true;setNotice(cleared?'Synthetic fare data changed. Coverage was refreshed and previous fare selections were cleared; your conversation and travel preferences are preserved.':'Synthetic fare data changed. Coverage was refreshed; your conversation and travel preferences are preserved.');});for(const artifact of record.artifacts)runtime.artifacts.register(artifact.state.artifactId);if(record.activeArtifactId)runtime.artifacts.activate(record.activeArtifactId);if(sourceRefreshed)await save(valid);}
  if(!runtime.artifacts.getIds().length)runtime.createArtifact();setReady(true);
 }).catch(()=>{if(controller.signal.aborted)return;setRestoreError(true);setNotice('Your saved conversation has been kept. Its travel data could not be restored; retry when the local API is available.');});return()=>controller.abort();},[runtime,persistence,key,restoreAttempt]);
 const {layouts}=getSceneMetadata(messages);
 const capture=()=>captureAgentContext({turnId:`turn-${crypto.randomUUID()}`,variant,activeArtifactId:runtime.artifacts.getActiveId(),artifactIds:runtime.artifacts.getIds(),store:runtime.services.state,bridge:runtime.services.bridge,layoutSummaries:layouts});
 const save=async(next:UIMessage[])=>{
  assertNoBulkData(next);const {sources}=getSceneMetadata(next);const states=runtime.artifacts.getIds().map(id=>runtime.services.state.get(id));const refs=[...new Set(states.flatMap(state=>state.datasetRefs))];
  await persistence.save(key,{schemaVersion:CONTRACT_VERSION,catalogVersion:CATALOG_VERSION,activeArtifactId:runtime.artifacts.getActiveId(),parserVersion:'openui-0.3.0',queryVersion:'1',messages:next,artifacts:states.map(state=>({variant,source:sources.get(state.artifactId)??'No scene authored yet.',state})),descriptors:refs.map(datasetId=>{const manifest=runtime.services.bridge.getManifest(datasetId);return {datasetId,request:{originIds:manifest.coverage.originIds,destinationIds:manifest.coverage.destinationIds,dateWindow:manifest.coverage.dateWindow,modes:manifest.coverage.modes,passengers:manifest.coverage.passengers},sourceVersion:manifest.source.sourceVersion,complete:manifest.coverage.complete}})});
  setMessages(next);
 };
 useEffect(()=>runtime.artifacts.subscribe(()=>setRegistryRevision(value=>value+1)),[runtime]);
 useEffect(()=>{if(!ready)return;let timer:ReturnType<typeof setTimeout>|undefined;const persist=()=>void save(messages).catch(error=>setNotice(error instanceof ThreadConflictError?error.message:'Local history could not be saved.'));const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>{timer=undefined;persist()},30)};const unsub=runtime.artifacts.getIds().map(id=>runtime.services.state.subscribe(id,changed));const stopActive=runtime.artifacts.subscribe(changed);return()=>{if(timer){clearTimeout(timer);persist()}stopActive();unsub.forEach(stop=>stop())}},[runtime,ready,messages,registryRevision]);
 const readDiagnostics=async()=>{
  const persisted=await createIndexedDBStorage().read(key);
  const artifactRecords=runtime.artifacts.getIds().map(id=>({state:runtime.services.state.get(id),source:getSceneMetadata(messages).sources.get(id)}));
  const refs=[...new Set(artifactRecords.flatMap(record=>record.state.datasetRefs))];
  const manifests=refs.map(datasetId=>{try{const manifest=runtime.services.bridge.getManifest(datasetId);return {datasetId,rowCount:manifest.rowCount,coverage:manifest.coverage,sourceVersion:manifest.source.sourceVersion,compactSummary:manifest.compactSummary};}catch{return {datasetId,error:'Manifest unavailable'};}});
  setDiagnostics(JSON.stringify({schemaVersion:CONTRACT_VERSION,threadId:key,activeArtifactId:runtime.artifacts.getActiveId(),messages,artifactRecords,manifests,persisted},null,2));
 };
 if(!ready)return <div className="travel-app">{restoreError?<><p role="alert">{notice}</p><button type="button" onClick={()=>setRestoreAttempt(value=>value+1)}>Retry restoring conversation</button><div aria-label="Saved conversation">{messages.map(message=><p key={message.id}>{message.parts.flatMap(part=>part.type==='text'?[part.text]:[]).join(' ')}</p>)}</div></>:<p role="status">Restoring travel conversation…</p>}</div>;

 return <>{!blinded&&<nav className="travel-variant-nav"><a href="/generative">Compare interfaces</a><a href="/">Classic search</a><span>Version {variant.toUpperCase()} · Signed-in Codex</span></nav>}{notice&&<p role="status">{notice}</p>}<GenerativeChat sceneToolkit={variant==='b'?bToolkit:undefined} variant={variant} services={runtime.services} capture={capture} initialMessages={messages} onMessages={next=>void save(next).catch(error=>setNotice(error instanceof ThreadConflictError?error.message:'Local history could not be saved.'))}/>{import.meta.env.DEV&&!blinded&&<details onToggle={event=>{if(event.currentTarget.open)void readDiagnostics().catch(()=>setDiagnostics('Conversation diagnostics could not be read.'));}}><summary>Developer conversation diagnostics</summary><button type="button" onClick={()=>void readDiagnostics()}>Refresh diagnostics</button><textarea aria-label="Conversation diagnostics" readOnly value={diagnostics} rows={12} style={{width:'100%',fontFamily:'monospace'}}/></details>}</>;
}
export function GenerativeChooser(){return <main className="travel-app"><div className="travel-welcome"><h1>Choose your travel conversation</h1><p>Both interfaces share the same synthetic fares, local controls, and signed-in Codex model.</p><a href="/a">Component composition</a><a href="/b">Reactive program</a><a href="/">Classic travel search</a></div></main>}
