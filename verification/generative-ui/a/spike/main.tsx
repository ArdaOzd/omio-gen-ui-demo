import { createRoot } from 'react-dom/client'
import { useChatRuntime } from '@assistant-ui/ai-sdk'
import { AssistantRuntimeProvider, AuiConfig, Tools } from '@assistant-ui/react'
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import toolkit from '../../../../src/generative/variants/a/toolkit'
import { ThreadShell } from '../../../../src/generative/chat/thread-shell'
import { createSnapshotTransport } from '../../../../src/generative/chat/transport'
import { TravelProvider } from '../../../../src/generative/catalog/context'
import { createFareDataBridge } from '../../../../src/generative/data/fare-data-bridge'
import { createUIStateStore } from '../../../../src/generative/state/ui-state-store'
import { exportAgentContext } from '../../../../src/generative/state/snapshot-exporter'
import { ArtifactIdSchema, FareRowSchema } from '../../../../src/generative/contracts'
import '../../../../src/generative/catalog/tokens.css'

const artifactId=ArtifactIdSchema.parse('artifact-1');const state=createUIStateStore();let datasetId:string
const bridge=createFareDataBridge({pageSource:async input=>({rows:['train','bus','flight','ferry'].map((mode,i)=>FareRowSchema.parse({id:`fare-${input.date}-${mode}`,originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode,carrierId:['eurostar','flixbus','easyjet','stena'][i],priceCents:[5500,2300,4200,3200][i],durationMinutes:[140,470,90,350][i],departureMinutes:600+i*120,availableSeats:20,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})),total:4,page:1,pages:1,sourceVersion:'fixture-v1'})})
const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-15'},modes:['train','bus','flight','ferry'],passengers:2},new AbortController().signal)
datasetId=manifest.datasetId;state.initializeMissing(artifactId,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-09'}})
const services={bridge,state,activate:()=>{},activeId:()=>artifactId}
const capture=()=>exportAgentContext({turnId:'fixture-turn',activeArtifactId:artifactId,artifactIds:[artifactId],store:state,bridge})
const node=(name:string,key:string,children?:unknown[])=>({$type:name,$key:key,artifactRef:artifactId,datasetRef:datasetId,...(children?{children}:{})})
const scenes=[node('TravelSurface','root',[node('SplitPane','split',[node('Stack','left',[node('ModeChips','mode'),node('DateStrip','date'),node('FareCards','fare')]),node('StickySummary','right',[node('CheapestFastest','insight'),node('SyntheticTotal','total')])])]),node('TravelSurface','root',[node('PriceCalendar','calendar'),node('ResponsiveGrid','grid',[node('ComparisonTable','compare'),node('DurationPricePlot','chart')]),node('Inline','controls',[node('ModeChips','mode'),node('SortSelect','sort')])]),node('TravelSurface','root',[node('Section','route',[node('RouteMap','map'),node('ItineraryTimeline','time')]),node('ResponsiveGrid','controls',[node('ModeChips','mode'),node('DateStrip','date'),node('StayAllocation','stay')]),node('FareCards','fare')])]
const scene=scenes[Number(new URLSearchParams(location.search).get('scene')??0)]??scenes[0];const input=JSON.stringify(scene)
let sends=0;let resume=()=>{}
const requests:unknown[]=[]
const transport=createSnapshotTransport({variant:'a',capture,transport:{fetch:async(_url,init)=>{
 requests.push(JSON.parse(String(init?.body)));sends++
 const stream=new ReadableStream<Uint8Array>({start(controller){const write=(part:unknown)=>controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(part)}\n\n`));write({type:'start',messageId:'assistant-1'});write({type:'start-step'})
 if(sends===1){write({type:'text-start',id:'intro'});write({type:'text-delta',id:'intro',delta:'Before the view.'});write({type:'text-end',id:'intro'});write({type:'tool-input-start',toolCallId:'present-1',toolName:'present'});write({type:'tool-input-delta',toolCallId:'present-1',inputTextDelta:input.slice(0,-2)});resume=()=>{write({type:'tool-input-delta',toolCallId:'present-1',inputTextDelta:input.slice(-2)});write({type:'tool-input-available',toolCallId:'present-1',toolName:'present',input:scene});write({type:'finish-step'});write({type:'finish',finishReason:'tool-calls'});controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));controller.close()}}
 else{write({type:'text-start',id:'outro'});write({type:'text-delta',id:'outro',delta:'After the view. Your changes are current.'});write({type:'text-end',id:'outro'});write({type:'finish-step'});write({type:'finish',finishReason:'stop'});controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));controller.close()}
 }});return new Response(stream,{headers:{'content-type':'text/event-stream','x-vercel-ai-ui-message-stream':'v1'}})
}}})
function App(){const runtime=useChatRuntime({transport,sendAutomaticallyWhen:lastAssistantMessageIsCompleteWithToolCalls});return <div className="travel-app" data-theme={new URLSearchParams(location.search).get('theme')??'blue'}><button type="button" onClick={()=>resume()}>Resume stream</button><button type="button" onClick={()=>{document.getElementById('evidence')?.replaceChildren(document.createTextNode(JSON.stringify({requests,current:state.get(artifactId)})))}}>Inspect evidence</button><pre id="evidence" style={{display:'none'}}/><TravelProvider services={services}><AssistantRuntimeProvider runtime={runtime} config={AuiConfig({tools:Tools({toolkit})})}><ThreadShell/></AssistantRuntimeProvider></TravelProvider></div>}
const root=document.getElementById('root');if(root)createRoot(root).render(<App/>);
