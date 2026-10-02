import React,{useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import {useChat} from '@ai-sdk/react'
import {lastAssistantMessageIsCompleteWithToolCalls} from 'ai'
import {AssistantRuntimeProvider,AuiConfig,Tools} from '@assistant-ui/react'
import {useAISDKRuntime} from '@assistant-ui/ai-sdk'
import {createFareDataBridge} from '../../../../src/generative/data/fare-data-bridge'
import {createUIStateStore} from '../../../../src/generative/state/ui-state-store'
import {createActionRouter} from '../../../../src/generative/state/action-router'
import {exportAgentContext} from '../../../../src/generative/state/snapshot-exporter'
import {createSnapshotTransport} from '../../../../src/generative/chat/transport'
import {ThreadShell} from '../../../../src/generative/chat/thread-shell'
import {TravelProvider} from '../../../../src/generative/catalog/context'
import {createBrowserTools} from '../../../../src/generative/tools/browser-tools'
import bToolkit from '../../../../src/generative/variants/b/toolkit'
export async function mountResume(request,captured){
 const bridge=createFareDataBridge(),state=createUIStateStore(),ids=[],manifests=[]
 for(const descriptor of request.currentContext.datasets){const {complete,truncated,...coverage}=descriptor.coverage;manifests.push(await bridge.load(coverage,new AbortController().signal))}
 for(const snapshot of request.currentContext.artifacts){const {layoutSummary,catalogVersion,...defaults}=snapshot;state.initializeMissing(snapshot.artifactId,{...captured.artifactState,...defaults});ids.push(snapshot.artifactId)}
 let active=request.currentContext.activeArtifactId
 const router=createActionRouter(state,{bridge,activate:id=>{active=id}})
 const services={state,bridge,activeId:()=>active,activate:id=>{active=id},dispatch:router,whenIdle:router.whenIdle,createArtifact:()=>{const id=`artifact-${crypto.randomUUID()}`;ids.push(id);state.initializeMissing(id,{});active=id;return id}}
 const capture=()=>exportAgentContext({turnId:`turn-${crypto.randomUUID()}`,activeArtifactId:active,artifactIds:ids,store:state,bridge})
 const tools=createBrowserTools({bridge,store:state,activeArtifactId:()=>active,dispatch:router,whenIdle:router.whenIdle,createArtifact:services.createArtifact})
 const frontend=Object.fromEntries(Object.entries(tools).map(([name,tool])=>[name,{...tool,type:'frontend',render:()=> <div role="status">Travel data updated locally.</div>}]))
 let first=true
 const transport=createSnapshotTransport({variant:'b',capture,transport:{body:{provider:'codex'},fetch:async(url,init)=>{if(first){first=false;init={...init,body:JSON.stringify(request)}}return fetch(url,init)}}})
 function ResumeChat(){
  const chat=useChat({id:request.id,messages:request.messages,transport,sendAutomaticallyWhen:lastAssistantMessageIsCompleteWithToolCalls,onFinish:({messages})=>{globalThis.__resumeMessages=messages}})
  const runtime=useAISDKRuntime(chat)
  useEffect(()=>{transport.setRuntime(runtime)},[runtime])
  useEffect(()=>{globalThis.__continueExactTail=()=>chat.sendMessage()},[chat.sendMessage])
  return <TravelProvider services={services}><AssistantRuntimeProvider runtime={runtime} config={AuiConfig({tools:Tools({toolkit:{...frontend,...bToolkit}})})}><ThreadShell/></AssistantRuntimeProvider></TravelProvider>
 }
 const original=document.getElementById('root');if(original)original.style.display='none'
 const host=document.createElement('div');host.className='travel-app resume-host';document.body.append(host);createRoot(host).render(<ResumeChat/>);globalThis.__resumeCapture=capture
 return manifests.map(manifest=>({datasetId:manifest.datasetId,rowCount:manifest.rowCount}))
}
