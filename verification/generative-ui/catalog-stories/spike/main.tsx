import {createRoot} from 'react-dom/client'
import {useChatRuntime} from '@assistant-ui/ai-sdk'
import {AssistantRuntimeProvider,AuiConfig,Tools} from '@assistant-ui/react'
import {lastAssistantMessageIsCompleteWithToolCalls} from 'ai'
import {useEffect,useState} from 'react'
import toolkit from '../../../../src/generative/variants/a/toolkit-client'
import {createBToolkit} from '../../../../src/generative/variants/b/toolkit'
import {ThreadShell} from '../../../../src/generative/chat/thread-shell'
import {createSnapshotTransport} from '../../../../src/generative/chat/transport'
import {TravelProvider} from '../../../../src/generative/catalog/context'
import {createFareDataBridge} from '../../../../src/generative/data/fare-data-bridge'
import {createUIStateStore} from '../../../../src/generative/state/ui-state-store'
import {createActionRouter,type CoverageLoadStatus} from '../../../../src/generative/state/action-router'
import {exportAgentContext} from '../../../../src/generative/state/snapshot-exporter'
import {ArtifactIdSchema,DatasetIdSchema,FareIdSchema,UIStateRevisionSchema,FareRowSchema,type FareDataBridge,type QueryIR} from '../../../../src/generative/contracts'
import {assertNoBulkData} from '../../../../src/generative/contracts/privacy'
import {catalogDescriptors} from '../../../../src/generative/catalog/generated/catalog'
import {storyInventory,storyStates,queryStoryNames,selectedFactStoryNames,emptyRouteStoryNames} from '../inventory'
import '../../../../src/generative/catalog/tokens.css'
const params=new URLSearchParams(location.search),name=params.get('component')??'FareCards',variant=params.get('variant')==='b'?'b':'a'
const descriptor=catalogDescriptors.find(item=>item.name===name);if(!descriptor)throw new Error('Unknown story component')
const stage=storyStates.find(item=>item===params.get('state'))??'ready'
const artifactId=ArtifactIdSchema.parse('catalog-story'),store=createUIStateStore(),sourceCalls:string[]=[],queryCalls:string[]=[]
let released=stage!=='loading',failed=stage==='error',failCoverage=false,coverageStatus:CoverageLoadStatus|undefined
const bridge=createFareDataBridge({maxRows:stage==='partial'?4:1000,pageSource:async input=>{
 sourceCalls.push(input.date);if(input.date==='2026-10-10'&&stage==='loading')await gate()
 if(failCoverage){failCoverage=false;throw new Error('Story source unavailable')}
 const rows=stage==='empty'?[]:['train','bus','flight','ferry'].map((mode,index)=>FareRowSchema.parse({id:`fare-${input.date}-${mode}`,originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode,carrierId:['eurostar','flixbus','easyjet','stena'][index],priceCents:[5500,2300,4200,3200][index],durationMinutes:[140,470,90,350][index],departureMinutes:600+index*120,availableSeats:20,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:index!==1}))
 return{rows,total:rows.length,page:1,pages:1,sourceVersion:'catalog-story-v1'}
}})
const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-03',to:'2026-10-09'},modes:['train','bus','flight','ferry'],passengers:2},new AbortController().signal)
const datasetId=manifest.datasetId
const emptyRoute=stage==='empty'&&emptyRouteStoryNames.has(name)
store.initializeMissing(artifactId,{datasetRefs:emptyRoute?[]:[datasetId],dates:{start:'2026-10-03'},stays:emptyRoute?[]:[{cityId:'paris',nights:2}],selectedFareIds:selectedFactStoryNames.has(name)&&stage!=='empty'?[FareIdSchema.parse('fare-2026-10-03-train')]:[]})
const waiters:Array<()=>void>=[],release=()=>{released=true;waiters.splice(0).forEach(resolve=>resolve())}
const gate=async()=>{if(!released)await new Promise<void>(resolve=>waiters.push(resolve));if(failed)throw new Error('Story local request unavailable')}
let queriesSettled=0,factsStarted=0,factsSettled=0
const observed:FareDataBridge={...bridge,query:async(query,signal)=>{queryCalls.push(JSON.stringify(query));try{await gate();return await bridge.query(query,signal)}finally{queriesSettled++}},lookupFare:async(id,fields)=>{factsStarted++;try{if(selectedFactStoryNames.has(name))await gate();return await bridge.lookupFare(id,fields)}finally{factsSettled++}}}
const listeners=new Set<()=>void>(),router=createActionRouter(store,{bridge:observed,onCoverageStatus:status=>{coverageStatus=status;listeners.forEach(listener=>listener())}})
const services={bridge:observed,state:store,dispatch:router,whenIdle:router.whenIdle,activeId:()=>artifactId,activate:()=>{}}
const capture=()=>exportAgentContext({turnId:'catalog-story-turn',activeArtifactId:artifactId,artifactIds:[artifactId],store,bridge})
const ref=stage==='invalid-ref'?DatasetIdSchema.parse('unregistered-story-resource'):datasetId
const child=(index:number)=>({$type:'Callout',$key:`child-${index}`,artifactRef:artifactId,title:`Panel ${index}`,body:`Shared layout panel ${index}.`})
const leaf={$type:name,$key:'story-node',artifactRef:artifactId,...(name==='ModeChips'&&stage!=='invalid-ref'?{}:(emptyRoute?{}:{datasetRef:ref})),title:descriptor.group==='status'?undefined:name,body:name==='Callout'?'Short travel explanation.':undefined,...(descriptor.children?{children:[child(1),child(2),...(name==='TravelSurface'&&stage==='partial'?[{$type:'CoverageSummary',$key:'coverage-companion',artifactRef:artifactId}]:[])]}:{})}
const recipe=params.get('recipe')==='complex'
const recipeParts=[{$type:'Stack',$key:'recipe-main',artifactRef:artifactId,children:[{$type:'ModeChips',$key:'modes',artifactRef:artifactId},{$type:'DateWindow',$key:'dates',artifactRef:artifactId},{$type:'FareCards',$key:'fares',artifactRef:artifactId,datasetRef:ref}]},{$type:'StickySummary',$key:'recipe-summary',artifactRef:artifactId,children:[{$type:'SelectedFareCount',$key:'count',artifactRef:artifactId},{$type:'SyntheticTotal',$key:'total',artifactRef:artifactId},{$type:'SelectedItinerary',$key:'selected',artifactRef:artifactId},{$type:'CoverageSummary',$key:'coverage',artifactRef:artifactId},{$type:'RouteMap',$key:'route',artifactRef:artifactId}]}]
if(recipe)leaf.children=recipeParts
const tree=name==='TravelSurface'?leaf:{$type:'TravelSurface',$key:'story-root',artifactRef:artifactId,children:[leaf,...(stage==='partial'?[{$type:'CoverageSummary',$key:'coverage-companion',artifactRef:artifactId}]:[])]}
const query:QueryIR={version:1,sources:[{datasetRef:ref,alias:'f'}],project:FareRowSchema.keyof().options,where:{field:'serviceDate',op:'eq',value:'2026-10-03'},limit:100}
if(['ComparisonMatrix','ModeBreakdown'].includes(name)){delete query.project;query.groupBy=['mode'];query.metrics=[{as:'minimum',op:'min',field:'priceCents'},{as:'fastest',op:'min',field:'durationMinutes'},{as:'count',op:'count'}]}
if(name==='PriceCalendar'){delete query.project;delete query.where;query.groupBy=['serviceDate'];query.metrics=[{as:'minimum',op:'min',field:'priceCents'},{as:'count',op:'count'}]}
if(name==='CarrierFilter'){delete query.project;query.groupBy=['carrierId'];query.metrics=[{as:'count',op:'count'}]}
const bChildren=descriptor.children?`[panel1,panel2${name==='TravelSurface'&&stage==='partial'?',coverage':''}]`:'null'
const program=recipe?`q = Query("local_query", ${JSON.stringify(query)})\nmodes = ModeChips("${artifactId}")\ndates = DateWindow("${artifactId}")\nfares = FareCards("${artifactId}", "${ref}", null, null, "Available fares", null, null, null, null, q)\nmain = Stack("${artifactId}", null, null, null, "Choose your journey", null, [modes,dates,fares])\ncount = SelectedFareCount("${artifactId}")\ntotal = SyntheticTotal("${artifactId}")\nselected = SelectedItinerary("${artifactId}")\ncoverage = CoverageSummary("${artifactId}")\nroute = RouteMap("${artifactId}")\nsummary = StickySummary("${artifactId}", null, null, null, "Your choices", null, [count,total,selected,coverage,route])\nsplit = SplitPane("${artifactId}", null, null, null, "Plan a trip", null, [main,summary])\nroot = TravelSurface("${artifactId}", null, null, null, "Travel planner", null, [split])`:`${queryStoryNames.has(name)?`q = Query("local_query", ${JSON.stringify(query)})\n`:''}panel1 = Callout("${artifactId}", null, null, null, "Panel 1", null, null, null, null, null, null, "Shared layout panel 1.")
panel2 = Callout("${artifactId}", null, null, null, "Panel 2", null, null, null, null, null, null, "Shared layout panel 2.")
view = ${name}("${artifactId}", ${name==='ModeChips'&&stage!=='invalid-ref'?'null':(emptyRoute?'null':JSON.stringify(ref))}, null, null, ${descriptor.group==='status'?'null':JSON.stringify(name)}, null, ${bChildren}, null, null, ${queryStoryNames.has(name)?'q':'null'}, null, ${name==='Callout'?'"Short travel explanation."':'null'})
${stage==='partial'?`coverage = CoverageSummary("${artifactId}")\n`:''}root = ${name==='TravelSurface'?'view':`TravelSurface("${artifactId}", null, null, null, "Catalog story", null, [view${stage==='partial'?',coverage':''}])`}`
const bToolkit=createBToolkit(services),compose=bToolkit.compose_reactive_scene,toolResults:unknown[]=[]
const nativeB={...bToolkit,compose_reactive_scene:{...compose,execute:async(input:Parameters<typeof compose.execute>[0])=>{const result=await compose.execute(input);toolResults.push(result);return result}}}
const requests:unknown[]=[];let sends=0
const transport=createSnapshotTransport({variant,capture,transport:{fetch:async(_url,init)=>{
 const request=JSON.parse(String(init?.body));assertNoBulkData(request);requests.push(request);sends++
 const chunks:unknown[]=sends===1?[{type:'start',messageId:'story-assistant'},{type:'start-step'},{type:'tool-input-available',toolCallId:'story-present',toolName:variant==='a'?'present':'compose_reactive_scene',input:variant==='a'?tree:{artifactRef:artifactId,programRevision:0,program}},{type:'finish-step'},{type:'finish',finishReason:'tool-calls'}]:[{type:'start',messageId:'story-assistant'},{type:'start-step'},{type:'text-start',id:'story-done'},{type:'text-delta',id:'story-done',delta:'Story fixture complete.'},{type:'text-end',id:'story-done'},{type:'finish-step'},{type:'finish',finishReason:'stop'}]
 return new Response(new ReadableStream<Uint8Array>({start(controller){for(const part of chunks)controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(part)}\n\n`));controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));controller.close()}}),{headers:{'content-type':'text/event-stream','x-vercel-ai-ui-message-stream':'v1'}})
}}})
const evidence=()=>({name,variant,stage,sourceCalls,queryCalls,queriesSettled,factsStarted,factsSettled,requests,capture:capture(),current:store.get(artifactId),coverageStatus,toolResults,requiresRequest:queryStoryNames.has(name)||(selectedFactStoryNames.has(name)&&store.get(artifactId).selectedFareIds.length>0),inventory:storyInventory})
Object.assign(window,{catalogStory:{evidence,release:()=>release(),retryCoverage:async()=>{failed=false;failCoverage=true;router({kind:'dates',artifactId,dates:{start:'2026-10-10'}});await router.whenIdle(artifactId)},stale:()=>{const previous=store.get(artifactId).revision;router({kind:'sort',artifactId,sort:{field:'durationMinutes',direction:'desc'}});const result=router({kind:'sort',artifactId,expectedRevision:UIStateRevisionSchema.parse(previous),sort:{field:'priceCents',direction:'desc'}});return{result,current:store.get(artifactId)}},whenIdle:()=>router.whenIdle(artifactId)}})
function NativeChat(){const runtime=useChatRuntime({transport,sendAutomaticallyWhen:lastAssistantMessageIsCompleteWithToolCalls});return <AssistantRuntimeProvider runtime={runtime} config={AuiConfig({tools:Tools({toolkit:variant==='a'?toolkit:nativeB})})}><ThreadShell/></AssistantRuntimeProvider>}
function App(){const [,refresh]=useState(0);useEffect(()=>{const listener=()=>refresh(value=>value+1);listeners.add(listener);return()=>{listeners.delete(listener)}},[]);return <div className="travel-app" data-theme={params.get('theme')==='sand'?'sand':'blue'}><header style={{padding:16}}><h1>Catalog story: {name}</h1><p>{variant.toUpperCase()} · {stage} · deterministic adapter fixture, model calls blocked</p><button onClick={()=>release()}>Release local query</button></header><TravelProvider services={services}>{coverageStatus&&<p role={coverageStatus.status==='error'?'alert':'status'}>{coverageStatus.message??`Coverage ${coverageStatus.status}`}</p>}<NativeChat/></TravelProvider></div>}
const root=document.getElementById('root');if(root)createRoot(root).render(<App/>);
