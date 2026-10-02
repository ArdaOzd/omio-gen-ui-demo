import { useEffect, useMemo, useState } from 'react';
import type { UIMessage } from 'ai';
import { ArtifactIdSchema, CATALOG_VERSION, CONTRACT_VERSION, type ArtifactId } from './contracts';
import { createFareDataBridge } from './data/fare-data-bridge';
import { createUIStateStore } from './state/ui-state-store';
import { createArtifactStore } from './state/artifact-store';
import { createActionRouter } from './state/action-router';
import { exportAgentContext } from './state/snapshot-exporter';
import { createThreadPersistence } from './state/persistence';
import { assertNoBulkData } from './contracts/privacy';
import { GenerativeChat } from './chat/runtime-provider';
import type { TravelServices } from './catalog/context';
function createServices(){
 const bridge=createFareDataBridge();const state=createUIStateStore();const artifacts=createArtifactStore();
 const createArtifact=()=>{if(artifacts.getIds().length>=8)throw new Error('Eight-artifact limit reached');const id=ArtifactIdSchema.parse(`artifact-${crypto.randomUUID()}`);artifacts.register(id);state.initializeMissing(id,{});artifacts.activate(id);return id;};
 const router=createActionRouter(state,{bridge,activate:id=>artifacts.activate(id)});
 const services:TravelServices={bridge,state,activeId:artifacts.getActiveId,subscribeActive:artifacts.subscribe,activate:id=>artifacts.activate(ArtifactIdSchema.parse(id)),dispatch:router,createArtifact};
 return {services,artifacts,createArtifact,router};
}
export function GenerativeRoute({variant}:{variant:'a'|'b'}){
 const [runtime]=useState(createServices);const [registryRevision,setRegistryRevision]=useState(0);const [ready,setReady]=useState(false);const [messages,setMessages]=useState<UIMessage[]>([]);const [notice,setNotice]=useState('');
 const persistence=useMemo(()=>createThreadPersistence(),[]);const key=`travel-${variant}`;
 useEffect(()=>{const controller=new AbortController();persistence.load(key).then(async record=>{
  if(record){await persistence.restore(record,runtime.services.bridge,runtime.services.state,controller.signal);for(const artifact of record.artifacts)runtime.artifacts.register(artifact.state.artifactId);const valid=record.messages.filter((message):message is UIMessage=>typeof message==='object'&&message!==null&&'id' in message&&'role' in message&&'parts' in message);setMessages(valid);}
  if(!runtime.artifacts.getIds().length)runtime.createArtifact();setReady(true);
 }).catch(()=>{if(!runtime.artifacts.getIds().length)runtime.createArtifact();setNotice('Saved history could not be restored. Start a new travel conversation.');setReady(true);});return()=>controller.abort();},[runtime,persistence,key]);
 const capture=()=>exportAgentContext({turnId:`turn-${crypto.randomUUID()}`,activeArtifactId:runtime.artifacts.getActiveId(),artifactIds:runtime.artifacts.getIds(),store:runtime.services.state,bridge:runtime.services.bridge});
 const save=async(next:UIMessage[])=>{
  assertNoBulkData(next);const states=runtime.artifacts.getIds().map(id=>runtime.services.state.get(id));const refs=[...new Set(states.flatMap(state=>state.datasetRefs))];
  await persistence.save(key,{schemaVersion:CONTRACT_VERSION,catalogVersion:CATALOG_VERSION,parserVersion:'openui-0.3.0',queryVersion:'1',messages:next,artifacts:states.map(state=>({variant,source:'Conversation tool parts retain the validated scene source.',state})),descriptors:refs.map(datasetId=>{const manifest=runtime.services.bridge.getManifest(datasetId);return {datasetId,request:{originIds:manifest.coverage.originIds,destinationIds:manifest.coverage.destinationIds,dateWindow:manifest.coverage.dateWindow,modes:manifest.coverage.modes,passengers:manifest.coverage.passengers},sourceVersion:manifest.source.sourceVersion,complete:manifest.coverage.complete}})});
  setMessages(next);
 };
 useEffect(()=>runtime.artifacts.subscribe(()=>setRegistryRevision(value=>value+1)),[runtime]);
 useEffect(()=>{if(!ready)return;let timer:ReturnType<typeof setTimeout>;const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>void save(messages).catch(()=>setNotice('Local history could not be saved.')),30)};const unsub=runtime.artifacts.getIds().map(id=>runtime.services.state.subscribe(id,changed));return()=>{clearTimeout(timer);unsub.forEach(stop=>stop())}},[runtime,ready,messages,registryRevision]);
 if(!ready)return <div className="travel-app"><p role="status">Restoring travel conversation…</p></div>;
 if(variant==='b')return <main className="travel-app"><h1>Reactive travel interface</h1><p>The B renderer is completing its integration checks.</p><a href="/a">Open the travel conversation</a></main>;
 return <><nav className="travel-variant-nav"><a href="/generative">Compare interfaces</a><a href="/">Classic search</a><span>Version A · Signed-in Codex</span></nav>{notice&&<p role="status">{notice}</p>}<GenerativeChat variant={variant} services={runtime.services} capture={capture} initialMessages={messages} onMessages={next=>void save(next).catch(()=>setNotice('Local history could not be saved.'))}/></>;
}
export function GenerativeChooser(){return <main className="travel-app"><div className="travel-welcome"><h1>Choose your travel conversation</h1><p>Both interfaces share the same synthetic fares, local controls, and signed-in Codex model.</p><a href="/a">Component composition</a><a href="/b">Reactive program</a><a href="/">Classic travel search</a></div></main>}
