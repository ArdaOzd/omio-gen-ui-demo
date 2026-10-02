import { useEffect, useMemo, useState } from 'react';
import bToolkit from './variants/b/toolkit';
import { validatePresentTree, type PresentNode } from './variants/a/tree';
import { catalogDescriptors } from './catalog/generated/catalog';
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
function createServices(onCoverageStatus:(message:string)=>void){
 const bridge=createFareDataBridge();const state=createUIStateStore();const artifacts=createArtifactStore();
 const createArtifact=()=>{if(artifacts.getIds().length>=8)throw new Error('Eight-artifact limit reached');const id=ArtifactIdSchema.parse(`artifact-${crypto.randomUUID()}`);artifacts.register(id);state.initializeMissing(id,{});artifacts.activate(id);return id;};
 const router=createActionRouter(state,{bridge,activate:id=>artifacts.activate(id),onCoverageStatus:status=>onCoverageStatus(status.status==='loading'?'Loading the requested travel dates…':status.status==='error'?status.message??'Coverage could not be loaded. Try the date again.':'')});
 const services:TravelServices={bridge,state,activeId:artifacts.getActiveId,subscribeActive:artifacts.subscribe,activate:id=>artifacts.activate(ArtifactIdSchema.parse(id)),dispatch:router,whenIdle:router.whenIdle,createArtifact};
 return {services,artifacts,createArtifact,router};
}
export function GenerativeRoute({variant,blinded=false}:{variant:'a'|'b';blinded?:boolean}){
 const [notice,setNotice]=useState('');const [runtime]=useState(()=>createServices(setNotice));const [registryRevision,setRegistryRevision]=useState(0);const [ready,setReady]=useState(false);const [messages,setMessages]=useState<UIMessage[]>([]);
 const persistence=useMemo(()=>createThreadPersistence(),[]);const key=`travel-${variant}`;
 useEffect(()=>{const controller=new AbortController();persistence.load(key).then(async record=>{
  if(record){await persistence.restore(record,runtime.services.bridge,runtime.services.state,controller.signal);for(const artifact of record.artifacts)runtime.artifacts.register(artifact.state.artifactId);if(record.activeArtifactId)runtime.artifacts.activate(record.activeArtifactId);const valid=record.messages.filter((message):message is UIMessage=>typeof message==='object'&&message!==null&&'id' in message&&'role' in message&&'parts' in message);setMessages(valid);}
  if(!runtime.artifacts.getIds().length)runtime.createArtifact();setReady(true);
 }).catch(()=>{if(!runtime.artifacts.getIds().length)runtime.createArtifact();setNotice('Saved history could not be restored. Start a new travel conversation.');setReady(true);});return()=>controller.abort();},[runtime,persistence,key]);
 const sceneSources=new Map<string,string>();const layouts=new Map<string,string>();
 for(const message of messages)for(const part of message.parts){if(part.type==='tool-present'&&part.input){try{const tree=validatePresentTree(part.input);const describe=(node:PresentNode):string=>node.$type+(node.children?`(${(Array.isArray(node.children)?node.children:typeof node.children==='object'?[node.children]:[]).map(describe).join(',')})`:'');sceneSources.set(tree.artifactRef,JSON.stringify(tree));layouts.set(tree.artifactRef,describe(tree).slice(0,600));}catch{}}else if(part.type==='tool-compose_reactive_scene'&&part.input&&typeof part.input==='object'&&'program' in part.input&&'artifactRef' in part.input&&typeof part.input.program==='string'&&typeof part.input.artifactRef==='string'){sceneSources.set(part.input.artifactRef,part.input.program);layouts.set(part.input.artifactRef,catalogDescriptors.filter(descriptor=>part.input&&typeof part.input==='object'&&'program' in part.input&&typeof part.input.program==='string'&&part.input.program.includes(descriptor.name+'(')).map(d=>d.name).join(' / ').slice(0,600));}}
 const capture=()=>{const snapshot=exportAgentContext({turnId:`turn-${crypto.randomUUID()}`,activeArtifactId:runtime.artifacts.getActiveId(),artifactIds:runtime.artifacts.getIds(),store:runtime.services.state,bridge:runtime.services.bridge});snapshot.artifacts=snapshot.artifacts.map(artifact=>({...artifact,layoutSummary:layouts.get(artifact.artifactId)??artifact.layoutSummary}));return snapshot;};
 const save=async(next:UIMessage[])=>{
  assertNoBulkData(next);const states=runtime.artifacts.getIds().map(id=>runtime.services.state.get(id));const refs=[...new Set(states.flatMap(state=>state.datasetRefs))];
  await persistence.save(key,{schemaVersion:CONTRACT_VERSION,catalogVersion:CATALOG_VERSION,activeArtifactId:runtime.artifacts.getActiveId(),parserVersion:'openui-0.3.0',queryVersion:'1',messages:next,artifacts:states.map(state=>({variant,source:sceneSources.get(state.artifactId)??'No scene authored yet.',state})),descriptors:refs.map(datasetId=>{const manifest=runtime.services.bridge.getManifest(datasetId);return {datasetId,request:{originIds:manifest.coverage.originIds,destinationIds:manifest.coverage.destinationIds,dateWindow:manifest.coverage.dateWindow,modes:manifest.coverage.modes,passengers:manifest.coverage.passengers},sourceVersion:manifest.source.sourceVersion,complete:manifest.coverage.complete}})});
  setMessages(next);
 };
 useEffect(()=>runtime.artifacts.subscribe(()=>setRegistryRevision(value=>value+1)),[runtime]);
 useEffect(()=>{if(!ready)return;let timer:ReturnType<typeof setTimeout>;const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>void save(messages).catch(()=>setNotice('Local history could not be saved.')),30)};const unsub=runtime.artifacts.getIds().map(id=>runtime.services.state.subscribe(id,changed));return()=>{clearTimeout(timer);unsub.forEach(stop=>stop())}},[runtime,ready,messages,registryRevision]);
 if(!ready)return <div className="travel-app"><p role="status">Restoring travel conversation…</p></div>;
 
 return <>{!blinded&&<nav className="travel-variant-nav"><a href="/generative">Compare interfaces</a><a href="/">Classic search</a><span>Version {variant.toUpperCase()} · Signed-in Codex</span></nav>}{notice&&<p role="status">{notice}</p>}<GenerativeChat sceneToolkit={variant==='b'?bToolkit:undefined} variant={variant} services={runtime.services} capture={capture} initialMessages={messages} onMessages={next=>void save(next).catch(()=>setNotice('Local history could not be saved.'))}/></>;
}
export function GenerativeChooser(){return <main className="travel-app"><div className="travel-welcome"><h1>Choose your travel conversation</h1><p>Both interfaces share the same synthetic fares, local controls, and signed-in Codex model.</p><a href="/a">Component composition</a><a href="/b">Reactive program</a><a href="/">Classic travel search</a></div></main>}
