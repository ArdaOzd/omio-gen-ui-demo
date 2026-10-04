import {describe,expect,it} from 'vitest'
import {createFareDataBridge} from '../data/fare-data-bridge'
import {createUIStateStore} from '../state/ui-state-store'
import {createBrowserTools} from './browser-tools'
import {ArtifactIdSchema,FareIdSchema,parseQuery,type FareRow,type CoverageRequest,type QueryIR} from '../contracts'
import {filterPredicate} from '../catalog/context'
import {legState} from '../state/leg-bindings'
import {parseToolInput,parseToolOutput} from '../../../agent/request-schema'
const artifactRef=ArtifactIdSchema.parse('summary-artifact')
const coverage:CoverageRequest={originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-10'},modes:['bus','train'],passengers:1}
function fare(id:string,patch:Partial<FareRow>={}):FareRow{return{id:FareIdSchema.parse(id),originId:'london',destinationId:'paris',serviceDate:'2026-10-09',mode:'bus',carrierId:'chosen',priceCents:1500,durationMinutes:120,departureMinutes:600,availableSeats:4,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true,...patch}}
async function fixture(){
 const rows=[fare('yes-1'),fare('yes-2'),fare('train',{mode:'train'}),fare('carrier',{carrierId:'other'}),fare('cheap',{priceCents:100}),fare('price',{priceCents:5000}),fare('duration',{durationMinutes:500}),fare('direct',{direct:false}),fare('later',{serviceDate:'2026-10-10'})]
 const bridge=createFareDataBridge({pageSource:async input=>{const result=rows.filter(row=>row.serviceDate===input.date);return{rows:result,total:result.length,pages:1,page:1,sourceVersion:'summary-v1'}}}),manifest=await bridge.load(coverage,new AbortController().signal)
 const store=createUIStateStore();store.initializeMissing(artifactRef,{dates:{start:'2026-10-09'},datasetRefs:[manifest.datasetId],filters:{modes:['bus'],carrierIds:['chosen'],minPriceCents:1000,maxPriceCents:2000,maxDurationMinutes:200,directOnly:true}})
 const queries:QueryIR[]=[],observed={...bridge,query:(input:QueryIR,signal:AbortSignal)=>{queries.push(input);return bridge.query(input,signal)}}
 return{bridge,store,manifest,queries,tools:createBrowserTools({bridge:observed,store,activeArtifactId:()=>artifactRef})}
}
describe('scoped bounded fare summaries',()=>{
 it('matches the widget filter QueryIR and actual counts while retaining explicit dataset-wide calls',async()=>{
  const{bridge,store,manifest,queries,tools}=await fixture(),state=legState(store.get(artifactRef),manifest.coverage)
  const query=parseQuery({version:1,sources:[{datasetRef:manifest.datasetId,alias:'f'}],where:filterPredicate(state),groupBy:['mode'],metrics:[{as:'count',op:'count'}],limit:30},[manifest])
  const widget=await bridge.query(query,new AbortController().signal)
  expect(widget.rows).toEqual([{mode:'bus',count:2}])
  const input={datasetRef:manifest.datasetId,groupBy:'mode',artifactRef}
  expect(parseToolInput('summarize_fares',input)).toEqual(input)
  const summary=await tools.summarize_fares.execute(input)
  expect(summary).toMatchObject({datasetId:manifest.datasetId,revision:manifest.revision,groups:[{label:'bus',count:2}],truncated:false})
  expect(parseToolOutput('summarize_fares',summary)).toEqual(summary)
  expect(queries[0]).toEqual(query)
  expect(await tools.summarize_fares.execute({datasetRef:manifest.datasetId,groupBy:'mode'})).toMatchObject({groups:[{label:'bus',count:8},{label:'train',count:1}]})
  expect(JSON.stringify(summary)).not.toContain('priceCents')
 })
 it('rejects foreign ownership and unavailable date coverage rather than inventing an empty summary',async()=>{
  const{store,manifest,tools}=await fixture(),other=ArtifactIdSchema.parse('foreign');store.initializeMissing(other,{dates:{start:'2026-10-09'}})
  expect(await tools.summarize_fares.execute({datasetRef:manifest.datasetId,groupBy:'mode',artifactRef:other})).toMatchObject({status:'error'})
  store.dispatch({kind:'dates',artifactId:artifactRef,dates:{start:'2026-10-11'}})
  expect(await tools.summarize_fares.execute({datasetRef:manifest.datasetId,groupBy:'mode',artifactRef})).toMatchObject({status:'error'})
 })
 it('rejects arbitrary queries, raw filters and row payloads at both tool boundaries',async()=>{
  const{manifest,tools}=await fixture()
  for(const extras of [{where:{field:'mode',op:'eq',value:'bus'}},{filters:{rows:[{id:'private'}]}},{sql:'SELECT * FROM fares'}]){
   const input={datasetRef:manifest.datasetId,groupBy:'mode',artifactRef,...extras}
   expect(()=>parseToolInput('summarize_fares',input)).toThrow()
   expect(await tools.summarize_fares.execute(input)).toMatchObject({status:'error'})
  }
 })
 it('uses inclusive current date windows and rejects obsolete filter results without changing local state',async()=>{
  const{bridge,store,manifest,tools}=await fixture()
  store.dispatch({kind:'dates',artifactId:artifactRef,dates:{start:'2026-10-09',end:'2026-10-10'}})
  expect(await tools.summarize_fares.execute({datasetRef:manifest.datasetId,groupBy:'mode',artifactRef})).toMatchObject({groups:[{label:'bus',count:3}]})
  let evaluated=()=>{},finish=()=>{};const ready=new Promise<void>(resolve=>{evaluated=resolve}),gate=new Promise<void>(resolve=>{finish=resolve})
  const delayed=createBrowserTools({store,activeArtifactId:()=>artifactRef,bridge:{...bridge,async query(input,signal){const result=await bridge.query(input,signal);evaluated();await gate;return result}}})
  const pending=delayed.summarize_fares.execute({datasetRef:manifest.datasetId,groupBy:'mode',artifactRef});await ready
  store.dispatch({kind:'filters',artifactId:artifactRef,filters:{...store.get(artifactRef).filters,modes:['train']}});const latest=store.get(artifactRef);finish()
  expect(await pending).toMatchObject({status:'error'})
  expect(store.get(artifactRef)).toEqual(latest)
 })
 it('resolves the current second-leg city/date/mode scope from an older bound resource',async()=>{
  const bridge=createFareDataBridge({pageSource:async input=>({rows:[fare(`${input.date}-bus`,{originId:input.originId,destinationId:input.destinationId,serviceDate:input.date}),fare(`${input.date}-train`,{originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'train'})],total:2,pages:1,page:1,sourceVersion:'leg-v1'})})
  const request={...coverage,originIds:['paris'],destinationIds:['barcelona'],dateWindow:{from:'2026-10-11',to:'2026-10-11'}},old=await bridge.load(request,new AbortController().signal),fresh=await bridge.load({...request,dateWindow:{from:'2026-10-12',to:'2026-10-12'}},new AbortController().signal)
  const store=createUIStateStore();store.initializeMissing(artifactRef,{dates:{start:'2026-10-10'},stays:[{cityId:'paris',nights:2}],datasetRefs:[old.datasetId,fresh.datasetId],filters:{modes:['train'],carrierIds:[],directOnly:false},modesByLeg:{'paris:barcelona':['bus']}})
  const tools=createBrowserTools({bridge,store,activeArtifactId:()=>artifactRef})
  expect(await tools.summarize_fares.execute({datasetRef:old.datasetId,groupBy:'mode',artifactRef})).toMatchObject({datasetId:fresh.datasetId,groups:[{label:'bus',count:1}]})
  expect(await tools.summarize_fares.execute({datasetRef:old.datasetId,groupBy:'originId',artifactRef})).toMatchObject({groups:[{label:'paris',count:1}]})
 })
 it('retains the thirty-group cap and honest truncation without row output',async()=>{
  const rows=Array.from({length:40},(_,i)=>fare(`group-${i}`,{carrierId:`carrier-${String(i).padStart(2,'0')}`})),bridge=createFareDataBridge({pageSource:async()=>({rows,total:40,pages:1,page:1,sourceVersion:'group-v1'})}),manifest=await bridge.load({...coverage,dateWindow:{from:'2026-10-09',to:'2026-10-09'}},new AbortController().signal),store=createUIStateStore();store.initializeMissing(artifactRef,{dates:{start:'2026-10-09'},datasetRefs:[manifest.datasetId]})
  const summary=await createBrowserTools({bridge,store,activeArtifactId:()=>artifactRef}).summarize_fares.execute({datasetRef:manifest.datasetId,groupBy:'carrierId',artifactRef}),parsed=parseToolOutput('summarize_fares',summary)
  expect(parsed).toMatchObject({truncated:true,groups:expect.arrayContaining([{label:'carrier-00',count:1}])})
  expect(summary).toHaveProperty('groups',expect.any(Array))
  if(typeof summary!=='object'||summary===null||!('groups'in summary)||!Array.isArray(summary.groups))throw new Error('Missing bounded groups')
  expect(summary.groups).toHaveLength(30)
  expect(JSON.stringify(summary)).not.toContain('priceCents')
 })

})
