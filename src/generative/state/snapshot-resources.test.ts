import {createThreadPersistence,parsePersistedThread} from './persistence'
import {expect,it} from 'vitest'
import {ArtifactIdSchema,CoverageRequestSchema,LIMITS,FareIdSchema,parseQuery,FareRowSchema} from '../contracts'
import {createFareDataBridge} from '../data/fare-data-bridge'
import {createUIStateStore} from './ui-state-store'
import {exportAgentContext,captureAgentContext} from './snapshot-exporter'
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
