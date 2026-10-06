import {createThreadPersistence,parsePersistedThread} from './persistence'
import {expect,it} from 'vitest'
import {ArtifactIdSchema,BoundedFareFactSchema,CoverageRequestSchema,LIMITS,FareIdSchema,parseQuery,FareRowSchema,type FareDataBridge} from '../contracts'
import {createFareDataBridge} from '../data/fare-data-bridge'
import {createUIStateStore} from './ui-state-store'
import {exportAgentContext,captureAgentContext,captureAgentContextWithSelectedFares} from './snapshot-exporter'
const id=ArtifactIdSchema.parse('review-art')
const request=CoverageRequestSchema.parse({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-03',to:'2026-10-09'},modes:['train'],passengers:1})
const source=async(input:{originId:string;destinationId:string;date:string;page:number})=>({rows:[FareRowSchema.parse({id:FareIdSchema.parse(`${input.originId}-${input.destinationId}-${input.date}`),originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'train',carrierId:'rail',priceCents:1000,durationMinutes:120,departureMinutes:600,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})],total:1,pages:1,page:input.page,sourceVersion:'v1'})
it('exports all resources from individually valid artifacts without dropping current references',async()=>{
 const bridge=createFareDataBridge({pageSource:source}),state=createUIStateStore(),refs=[]
 for(let day=3;day<=11;day++){const date=`2026-10-${String(day).padStart(2,'0')}`;refs.push((await bridge.load({...request,dateWindow:{from:date,to:date}},new AbortController().signal)).datasetId)}
 const other=ArtifactIdSchema.parse('review-other');state.initializeMissing(id,{datasetRefs:refs.slice(0,5)});state.initializeMissing(other,{datasetRefs:refs.slice(5)})
 const context=exportAgentContext({turnId:'review',activeArtifactId:id,artifactIds:[other,id],store:state,bridge});expect(context.artifacts.map(artifact=>artifact.artifactId)).toEqual([id,other]);expect(context.datasets.map(dataset=>dataset.datasetId)).toEqual(refs);expect(context.activeArtifactId).toBe(id);expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(LIMITS.snapshotBytes)
})

async function restoredContextFixture(activeResources=1){
 const originalBridge=createFareDataBridge({pageSource:source}),originalState=createUIStateStore()
 const manifests:Awaited<ReturnType<typeof originalBridge.load>>[]=[]
 for(let day=1;day<=20;day++){const date=`2026-10-${String(day).padStart(2,'0')}`;manifests.push(await originalBridge.load({...request,dateWindow:{from:date,to:date}},new AbortController().signal))}
 const artifacts=manifests.map((manifest,index)=>{const artifactId=ArtifactIdSchema.parse(`saved-${String(index).padStart(2,'0')}`);originalState.initializeMissing(artifactId,{datasetRefs:index===0?manifests.slice(0,activeResources).map(item=>item.datasetId):[manifest.datasetId],dates:{start:manifest.coverage.dateWindow.from},lastInteractionAt:`2026-01-${String(index+1).padStart(2,'0')}T00:00:00.000Z`});return {variant:'a' as const,source:`root = TravelSurface("${artifactId}")`,state:originalState.get(artifactId)}})
 const first=artifacts[0];if(!first)throw new Error('Missing fixture artifact')
 const record=parsePersistedThread({schemaVersion:'1.0.0',catalogVersion:'1.0.0',parserVersion:'native-present-1',queryVersion:'1',activeArtifactId:first.state.artifactId,messages:[{id:'saved-history',role:'user',parts:[{type:'text',text:'Keep all travel views'}]}],artifacts,descriptors:manifests.map(manifest=>({datasetId:manifest.datasetId,request:{originIds:manifest.coverage.originIds,destinationIds:manifest.coverage.destinationIds,dateWindow:manifest.coverage.dateWindow,modes:manifest.coverage.modes,passengers:manifest.coverage.passengers},sourceVersion:manifest.source.sourceVersion,complete:true}))})
 const bridge=createFareDataBridge({pageSource:source}),store=createUIStateStore()
 await createThreadPersistence({read:async()=>record,write:async()=>{throw new Error('Read-only fixture')}}).restore(record,bridge,store,new AbortController().signal)
 const artifactIds=record.artifacts.map(artifact=>artifact.state.artifactId)
 return {record,bridge,store,artifactIds,activeArtifactId:first.state.artifactId,layoutSummaries:new Map(artifactIds.map((artifactId,index)=>[artifactId,`Trip ${index}`]))}
}
it('captures active plus recent restored views and discoverable older summaries without changing history',async()=>{
 const fixture=await restoredContextFixture(),before=JSON.stringify(fixture.record),states=fixture.artifactIds.map(id=>fixture.store.get(id))
 const context=captureAgentContext({...fixture,turnId:'restored'})
 expect(context.artifacts.map(artifact=>artifact.artifactId)).toEqual(['saved-00','saved-19','saved-18','saved-17','saved-16','saved-15','saved-14','saved-13'])
 expect(context.olderArtifactSummaries).toHaveLength(12)
 expect(context.olderArtifactSummaries.find(summary=>summary.artifactId==='saved-01')).toMatchObject({label:'Trip 1',revision:0,variant:'a',lastInteractionAt:'2026-01-02T00:00:00.000Z'})
 for(const summary of context.olderArtifactSummaries){expect(summary).not.toHaveProperty('source');expect(summary).not.toHaveProperty('datasetRefs');expect(summary).not.toHaveProperty('selectedFareIds')}
 expect(context.datasets.map(dataset=>dataset.datasetId)).toEqual(context.artifacts.flatMap(artifact=>artifact.datasetRefs))
 expect(JSON.stringify(fixture.record)).toBe(before);expect(fixture.artifactIds.map(id=>fixture.store.get(id))).toEqual(states)
 expect(()=>exportAgentContext({...fixture,turnId:'explicit-overlimit'})).toThrow()
})
it('demotes older snapshots to metadata to meet the byte budget while preserving every active resource',async()=>{
 const fixture=await restoredContextFixture(8),before=fixture.artifactIds.map(id=>fixture.store.get(id))
 const layoutSummaries=new Map(fixture.artifactIds.map((id,index)=>[id,`Trip ${index} `+'TravelSurface '.repeat(40)]))
 const context=captureAgentContext({...fixture,layoutSummaries,turnId:'budget'})
 expect(context.artifacts[0]?.artifactId).toBe(fixture.activeArtifactId);expect(context.artifacts.length).toBeLessThan(8)
 expect(context.artifacts[0]?.datasetRefs).toEqual(fixture.store.get(fixture.activeArtifactId).datasetRefs)
 expect(context.olderArtifactSummaries.length+context.artifacts.length).toBe(20)
 const covered=new Set(context.datasets.map(dataset=>dataset.datasetId));for(const artifact of context.artifacts)for(const ref of artifact.datasetRefs)expect(covered.has(ref)).toBe(true)
 expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(LIMITS.snapshotBytes)
 expect(fixture.artifactIds.map(id=>fixture.store.get(id))).toEqual(before)
})
it('keeps every deduplicated planned fare id when selected artifacts are demoted',async()=>{
 const fixture=await restoredContextFixture()
 for(const [artifactIndex,artifactId] of fixture.artifactIds.entries())for(let fareIndex=0;fareIndex<8;fareIndex++){
  const current=fixture.store.get(artifactId)
  fixture.store.dispatch({kind:'select',artifactId,fareId:FareIdSchema.parse(`planned-${artifactIndex}-${fareIndex}`),selected:true,expectedRevision:current.revision})
 }
 const context=captureAgentContext({...fixture,turnId:'planned-fares'})
 expect(context.artifacts.length).toBeLessThan(fixture.artifactIds.length)
 expect(context.plannedFareIds).toHaveLength(LIMITS.plannedFares)
 expect(new Set(context.plannedFareIds).size).toBe(LIMITS.plannedFares)
 expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(LIMITS.snapshotBytes)
})
it('trims rich fare facts in deterministic order before planned ids',async()=>{
 const fixture=await restoredContextFixture()
 for(const [artifactIndex,artifactId] of fixture.artifactIds.entries())for(let fareIndex=0;fareIndex<8;fareIndex++){
  const current=fixture.store.get(artifactId)
  fixture.store.dispatch({kind:'select',artifactId,fareId:FareIdSchema.parse(`detail-${artifactIndex}-${fareIndex}`),selected:true,expectedRevision:current.revision})
 }
 const bridge:FareDataBridge={...fixture.bridge,lookupFare:async fareId=>BoundedFareFactSchema.parse({id:fareId,mode:'train',carrierId:'rail',carrierName:'A very descriptive synthetic railway carrier name used to exercise the bounded context budget',priceCents:1000,durationMinutes:90,serviceDate:'2026-10-06',departureMinutes:480,originId:'berlin',destinationId:'prague',currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees'})}
 const context=await captureAgentContextWithSelectedFares({...fixture,bridge,turnId:'fact-budget'})
 expect(context.plannedFareIds).toHaveLength(LIMITS.plannedFares)
 expect(context.selectedFareFacts.length).toBeGreaterThan(0)
 expect(context.selectedFareFacts.length).toBeLessThan(LIMITS.plannedFares)
 expect(context.selectedFareFacts.map(fact=>fact.id)).toEqual(context.plannedFareIds?.slice(0,context.selectedFareFacts.length))
 expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(LIMITS.snapshotBytes)
})
it('captures one immutable selection version while fare lookup is pending',async()=>{
 const artifactId=ArtifactIdSchema.parse('held-selection')
 const oldFareId=FareIdSchema.parse('fare-old')
 const newFareId=FareIdSchema.parse('fare-new')
 const store=createUIStateStore();store.initializeMissing(artifactId,{selectedFareIds:[oldFareId]})
 const base=createFareDataBridge()
 let release:((fact:ReturnType<typeof BoundedFareFactSchema.parse>)=>void)|undefined
 const held=new Promise<ReturnType<typeof BoundedFareFactSchema.parse>>(resolve=>{release=resolve})
 const bridge:FareDataBridge={...base,lookupFare:async()=>held}
 const pending=captureAgentContextWithSelectedFares({turnId:'held',activeArtifactId:artifactId,artifactIds:[artifactId],store,bridge})
 let current=store.get(artifactId);store.dispatch({kind:'select',artifactId,fareId:oldFareId,selected:false,expectedRevision:current.revision})
 current=store.get(artifactId);store.dispatch({kind:'select',artifactId,fareId:newFareId,selected:true,expectedRevision:current.revision})
 release?.(BoundedFareFactSchema.parse({id:oldFareId,mode:'train',carrierId:'rail',carrierName:'Rail',priceCents:1000,durationMinutes:90,serviceDate:'2026-10-06',departureMinutes:480,originId:'berlin',destinationId:'prague',currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees'}))
 const context=await pending
 expect(context.plannedFareIds).toEqual([oldFareId])
 expect(context.artifacts[0]?.selectedFareIds).toEqual([oldFareId])
 expect(context.selectedFareFacts.map(fact=>fact.id)).toEqual([oldFareId])
 expect(store.get(artifactId).selectedFareIds).toEqual([newFareId])
})

it('exports bounded host-derived leg thresholds and selected facts without browser fare rows',async()=>{
 const bridge=createFareDataBridge({pageSource:async input=>({rows:[FareRowSchema.parse({id:`${input.originId}-${input.destinationId}`,originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'train',carrierId:'rail',carrierName:'Rail',priceCents:1000,durationMinutes:input.originId==='london'?1200:120,departureMinutes:input.originId==='london'?1260:1080,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})],total:1,pages:1,page:input.page,sourceVersion:'v1'})})
 const first=await bridge.load({...request,dateWindow:{from:'2026-10-26',to:'2026-10-26'}},new AbortController().signal)
 const second=await bridge.load({...request,originIds:['paris'],destinationIds:['rome'],dateWindow:{from:'2026-10-30',to:'2026-10-30'}},new AbortController().signal)
 const store=createUIStateStore();store.initializeMissing(id,{datasetRefs:[first.datasetId,second.datasetId],citySequence:['london','paris','rome'],dates:{start:'2026-10-26',end:'2026-10-31'},stays:[{cityId:'paris',nights:3}],modesByLeg:{'paris:rome':['train']},sortByLeg:{'paris:rome':{field:'durationMinutes',direction:'asc'}},calendarDateByLeg:{'paris:rome':'2026-10-30'},selectedFareIds:[FareIdSchema.parse('london-paris')]})
 const context=await captureAgentContextWithSelectedFares({turnId:'thresholds',activeArtifactId:id,artifactIds:[id],store,bridge,componentBindings:new Map([[id,[{key:'latest-grid',type:'MultiCityPlanGrid'}]]])})
 expect(context.artifacts[0]?.legThresholds).toEqual([
  expect.objectContaining({legKey:'london:paris',earliestDeparture:'2026-10-26T00:00:00.000Z',source:'trip-date',selectedFareId:'london-paris'}),
  expect.objectContaining({legKey:'paris:rome',earliestDeparture:'2026-10-30T17:00:00.000Z',source:'selected-arrival',precedingFareId:'london-paris'}),
 ])
 expect(context.selectedFareFacts).toHaveLength(1)
 expect(context.artifacts[0]).toMatchObject({modesByLeg:{'paris:rome':['train']},sortByLeg:{'paris:rome':{field:'durationMinutes',direction:'asc'}},calendarDateByLeg:{'paris:rome':'2026-10-30'}})
 expect(context.artifacts[0]?.componentBindings.slice(0,3)).toEqual([{key:'latest-grid',type:'MultiCityPlanGrid'},{key:'latest-grid.leg-1.cities',type:'CityField',legKey:'london:paris',datasetRef:first.datasetId,actionRef:'route'},{key:'latest-grid.leg-1.date',type:'TravelDate',legKey:'london:paris',datasetRef:first.datasetId,actionRef:'dates'}])
 expect(JSON.stringify(context)).not.toMatch(/"rows"|"fares"/)
})

it('compacts synthesized grid bindings while retaining an eight-leg selected itinerary',async()=>{
 const bridge=createFareDataBridge({pageSource:async input=>{const index=Number(input.originId.replace('city-',''));return{rows:[FareRowSchema.parse({id:`fare-${input.originId}-${input.destinationId}`,originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'train',carrierId:'rail',carrierName:'Rail',priceCents:1000+index,durationMinutes:60,departureMinutes:480+index*120,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})],total:1,pages:1,page:input.page,sourceVersion:'v1'}}})
 const store=createUIStateStore(),artifactId=ArtifactIdSchema.parse('eight-leg-grid'),refs=[],selected=[]
 const cities=Array.from({length:9},(_,index)=>`city-${index}`)
 for(let index=0;index<8;index++){const manifest=await bridge.load({originIds:[cities[index]!],destinationIds:[cities[index+1]!],dateWindow:{from:'2026-10-26',to:'2026-10-26'},modes:['train'],passengers:1},new AbortController().signal);refs.push(manifest.datasetId);selected.push(FareIdSchema.parse(`fare-${cities[index]}-${cities[index+1]}`))}
 store.initializeMissing(artifactId,{datasetRefs:refs,citySequence:cities,dates:{start:'2026-10-26'},stays:cities.slice(1).map(cityId=>({cityId,nights:0})),selectedFareIds:selected})
 const context=await captureAgentContextWithSelectedFares({turnId:'eight-leg',activeArtifactId:artifactId,artifactIds:[artifactId],store,bridge,componentBindings:new Map([[artifactId,[{key:'newest-grid',type:'MultiCityPlanGrid'}]]])})
 const active=context.artifacts[0]
 expect(active?.datasetRefs).toHaveLength(8);expect(active?.legThresholds).toHaveLength(8)
 expect(context.plannedFareIds).toHaveLength(8);expect(context.selectedFareFacts).toHaveLength(8)
 expect(active?.componentBindings[0]).toEqual({key:'newest-grid',type:'MultiCityPlanGrid'})
 expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(LIMITS.snapshotBytes)
 expect(JSON.stringify(context)).not.toMatch(/"rows"|"fares"/)
})
