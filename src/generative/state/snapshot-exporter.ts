import { CONTRACT_VERSION,LIMITS,parseAgentContext,type AgentContextEnvelope,type ArtifactId,type BoundedFareFact,type CompactArtifactSnapshot,type ComponentBinding,type FareDataBridge,type OlderArtifactSummary,type UIStateStore } from '../contracts'
import { assertNoBulkData } from '../contracts/privacy'
import { scheduleLegs, thresholdDateTime } from './itinerary-schedule'
type ExportInput={turnId:string;activeArtifactId?:ArtifactId;artifactIds:ArtifactId[];store:UIStateStore;bridge:FareDataBridge;selectedFareFacts?:BoundedFareFact[];olderArtifactSummaries?:OlderArtifactSummary[];layoutSummaries?:ReadonlyMap<string,string>;componentBindings?:ReadonlyMap<string,readonly ComponentBinding[]>}
type SnapshotRecord={snapshot:CompactArtifactSnapshot;lastInteractionAt:string;authoredBindingCount:number}
type PreparedCapture={turnId:string;activeArtifactId?:ArtifactId;records:SnapshotRecord[];manifests:Map<string,ReturnType<FareDataBridge['getManifest']>>;plannedFareIds:ReturnType<UIStateStore['get']>['selectedFareIds']}
function prioritizeRecords(records:SnapshotRecord[],activeArtifactId?:ArtifactId):SnapshotRecord[]{
 return [...records].sort((left,right)=>Number(right.snapshot.artifactId===activeArtifactId)-Number(left.snapshot.artifactId===activeArtifactId)||Date.parse(right.lastInteractionAt)-Date.parse(left.lastInteractionAt)||(left.snapshot.artifactId===right.snapshot.artifactId?0:left.snapshot.artifactId<right.snapshot.artifactId?-1:1))
}
function prioritizeFacts(prepared:PreparedCapture,facts:BoundedFareFact[]):BoundedFareFact[]{
 const ownerPriority=new Map<string,number>()
 prepared.records.forEach((record,index)=>record.snapshot.selectedFareIds.forEach(fareId=>{if(!ownerPriority.has(fareId))ownerPriority.set(fareId,index)}))
 const selectionOrder=new Map(prepared.plannedFareIds.map((fareId,index)=>[fareId,index]))
 const unique=new Map(facts.map(fact=>[fact.id,fact]))
 return [...unique.values()].sort((left,right)=>(ownerPriority.get(left.id)??Number.MAX_SAFE_INTEGER)-(ownerPriority.get(right.id)??Number.MAX_SAFE_INTEGER)||left.serviceDate.localeCompare(right.serviceDate)||left.departureMinutes-right.departureMinutes||(selectionOrder.get(left.id)??Number.MAX_SAFE_INTEGER)-(selectionOrder.get(right.id)??Number.MAX_SAFE_INTEGER)||left.id.localeCompare(right.id))
}
function currentAuthoredBindings(input:ExportInput,snapshot:CompactArtifactSnapshot):ComponentBinding[]{
 const activeLegKeys=new Set(snapshot.citySequence.slice(1).map((destination,index)=>`${snapshot.citySequence[index]}:${destination}`))
 const latestByLeg=new Map(snapshot.datasetRefs.flatMap(datasetRef=>{try{const coverage=input.bridge.getManifest(datasetRef).coverage,key=`${coverage.originIds[0]??''}:${coverage.destinationIds[0]??''}`;return key===':'?[]:[[key,datasetRef] as const]}catch{return[]}}))
 return [...(input.componentBindings?.get(snapshot.artifactId)??snapshot.componentBindings)].flatMap(binding=>{
  if(!binding.datasetRef||activeLegKeys.size===0)return[binding]
  try{const coverage=input.bridge.getManifest(binding.datasetRef).coverage,key=`${coverage.originIds[0]??''}:${coverage.destinationIds[0]??''}`;const current=latestByLeg.get(key);return activeLegKeys.has(key)&&current?[{...binding,datasetRef:current}]:[]}catch{return[]}
 })
}
function snapshots(input:ExportInput){
 const ids=[...new Set([...(input.activeArtifactId?[input.activeArtifactId]:[]),...input.artifactIds])]
 return ids.map(id=>{
  const snapshot=input.store.exportSnapshot(id),authored=currentAuthoredBindings(input,snapshot)
  const grid=authored.find(binding=>binding.type==='MultiCityPlanGrid')
  if(!grid)return{...snapshot,componentBindings:authored,layoutSummary:input.layoutSummaries?.get(id)??snapshot.layoutSummary}
  const latest=new Map(snapshot.datasetRefs.flatMap(datasetRef=>{const coverage=input.bridge.getManifest(datasetRef).coverage,key=`${coverage.originIds[0]??''}:${coverage.destinationIds[0]??''}`;return key===':'?[]:[[key,datasetRef] as const]}))
  const route=snapshot.citySequence
  const internals:ComponentBinding[]=route.slice(1).flatMap((destination,index)=>{
   const legKey=`${route[index]}:${destination}`,datasetRef=latest.get(legKey);if(!datasetRef)return[]
   const prefix=`${grid.key??'grid'}.leg-${index+1}`
   const bindings:ComponentBinding[]=[
    {key:`${prefix}.cities`,type:'CityField',legKey,datasetRef,actionRef:'route'},
    {key:`${prefix}.date`,type:'TravelDate',legKey,datasetRef,actionRef:'dates'},
    {key:`${prefix}.transport`,type:'TransportSelect',legKey,datasetRef,actionRef:'modesByLeg'},
    {key:`${prefix}.order`,type:'FareOrder',legKey,datasetRef,actionRef:'sortByLeg'},
    {key:`${prefix}.fares`,type:'FadeFares',legKey,datasetRef,actionRef:'select',selectorRef:'visibleFares'},
   ]
   if(index<route.length-2)bindings.push({key:`${prefix}.stay`,type:'StayDuration',legKey,datasetRef,actionRef:'stays',selectorRef:'legSchedule'})
   return bindings
  })
  return{...snapshot,componentBindings:[...authored,...internals].slice(0,LIMITS.treeNodes),layoutSummary:input.layoutSummaries?.get(id)??snapshot.layoutSummary}
 })
}
function envelope(input:ExportInput,artifacts:CompactArtifactSnapshot[],olderArtifactSummaries:OlderArtifactSummary[]):AgentContextEnvelope{
 const refs=[...new Set(artifacts.flatMap(artifact=>artifact.datasetRefs))]
 const plannedFareIds=[...new Set(snapshots(input).flatMap(artifact=>artifact.selectedFareIds))]
 return {schemaVersion:CONTRACT_VERSION,turnId:input.turnId,activeArtifactId:input.activeArtifactId,artifacts,olderArtifactSummaries,datasets:refs.map(id=>input.bridge.getManifest(id)),plannedFareIds,selectedFareFacts:input.selectedFareFacts??[]}
}
function finish(candidate:AgentContextEnvelope):AgentContextEnvelope{
 const snapshot=parseAgentContext(candidate);assertNoBulkData(snapshot);return snapshot
}
export function exportAgentContext(input:ExportInput):AgentContextEnvelope{
 return finish(envelope(input,snapshots(input),input.olderArtifactSummaries??[]))
}
function prepareCapture(input:Omit<ExportInput,'olderArtifactSummaries'|'selectedFareFacts'>):PreparedCapture{
 const records=prioritizeRecords(snapshots(input).map(snapshot=>({snapshot,lastInteractionAt:input.store.get(snapshot.artifactId).lastInteractionAt,authoredBindingCount:currentAuthoredBindings(input,input.store.exportSnapshot(snapshot.artifactId)).length})),input.activeArtifactId)
 const manifests=new Map<string,ReturnType<FareDataBridge['getManifest']>>()
 for(const datasetId of new Set(records.flatMap(record=>record.snapshot.datasetRefs)))manifests.set(datasetId,structuredClone(input.bridge.getManifest(datasetId)))
 return {turnId:input.turnId,activeArtifactId:input.activeArtifactId,records,manifests,plannedFareIds:[...new Set(records.flatMap(record=>record.snapshot.selectedFareIds))]}
}
function capturePreparedContext(prepared:PreparedCapture,selectedFareFacts:BoundedFareFact[]):AgentContextEnvelope{
 const records=[...prepared.records]
 selectedFareFacts=prioritizeFacts(prepared,selectedFareFacts)
 const included=records.slice(0,LIMITS.artifacts)
 let factCount=selectedFareFacts.length
 let compactFactLabels=false
 let summaryLimit=LIMITS.storedArtifacts
 const bindingLimits=new Map(records.map(record=>[record.snapshot.artifactId,record.snapshot.componentBindings.length]))
 while(true){
  const ids=new Set(included.map(record=>record.snapshot.artifactId))
  const summaries=records.filter(record=>!ids.has(record.snapshot.artifactId)).map(record=>({artifactId:record.snapshot.artifactId,variant:'a' as const,label:record.snapshot.layoutSummary.slice(0,160),revision:record.snapshot.revision,lastInteractionAt:record.lastInteractionAt})).slice(0,summaryLimit)
  const artifacts=included.map(record=>{
   const facts=selectedFareFacts.filter(fact=>record.snapshot.selectedFareIds.includes(fact.id))
   const byLeg=new Map(record.snapshot.datasetRefs.flatMap(id=>{const coverage=prepared.manifests.get(id)?.coverage;return coverage?[[`${coverage.originIds[0]??''}:${coverage.destinationIds[0]??''}`,coverage] as const]:[]}))
   const coverages=record.snapshot.citySequence.length>1?record.snapshot.citySequence.slice(1).flatMap((destination,index)=>{const coverage=byLeg.get(`${record.snapshot.citySequence[index]}:${destination}`);return coverage?[coverage]:[]}):[...byLeg.values()]
   const legThresholds=scheduleLegs(record.snapshot,coverages,facts).map(leg=>({legKey:leg.key,originId:leg.originId,destinationId:leg.destinationId,earliestDeparture:thresholdDateTime(leg.threshold),source:leg.threshold.source,...(leg.threshold.precedingFareId?{precedingFareId:leg.threshold.precedingFareId}:{}),...(leg.selectedFare?{selectedFareId:leg.selectedFare.id}:{})}))
   return{...record.snapshot,componentBindings:record.snapshot.componentBindings.slice(0,bindingLimits.get(record.snapshot.artifactId)),legThresholds}
  })
  const refs=[...new Set(artifacts.flatMap(artifact=>artifact.datasetRefs))]
  const includedFacts=selectedFareFacts.slice(0,factCount).map(fact=>compactFactLabels?{...fact,carrierName:null}:fact)
  const candidate:AgentContextEnvelope={schemaVersion:CONTRACT_VERSION,turnId:prepared.turnId,activeArtifactId:prepared.activeArtifactId,artifacts,olderArtifactSummaries:summaries,datasets:refs.map(id=>{
   const manifest=prepared.manifests.get(id)
   if(!manifest)throw new Error('Missing captured dataset manifest')
   return manifest
  }),plannedFareIds:prepared.plannedFareIds,selectedFareFacts:includedFacts}
  if(new TextEncoder().encode(JSON.stringify(candidate)).length<=LIMITS.snapshotBytes)return finish(candidate)
  const synthetic=[...included].reverse().find(record=>(bindingLimits.get(record.snapshot.artifactId)??0)>record.authoredBindingCount)
  if(synthetic){const limit=bindingLimits.get(synthetic.snapshot.artifactId)??0;bindingLimits.set(synthetic.snapshot.artifactId,limit-1)}
  else if(!compactFactLabels&&factCount>0)compactFactLabels=true
  else if(included.length>1)included.pop()
  else if(factCount>0)factCount-=1
  else if(summaryLimit>0)summaryLimit-=1
  else {
    const record=included[0],limit=record?bindingLimits.get(record.snapshot.artifactId)??0:0
    if(record&&limit>1)bindingLimits.set(record.snapshot.artifactId,limit-1)
    else throw new Error('Agent context cannot fit the bounded active artifact')
  }
 }
}
export function captureAgentContext(input:Omit<ExportInput,'olderArtifactSummaries'>):AgentContextEnvelope{
 return capturePreparedContext(prepareCapture(input),input.selectedFareFacts??[])
}
export async function captureAgentContextWithSelectedFares(input:Omit<ExportInput,'olderArtifactSummaries'|'selectedFareFacts'>):Promise<AgentContextEnvelope>{
 const prepared=prepareCapture(input)
 const resolved=await Promise.allSettled(prepared.plannedFareIds.map(fareId=>input.bridge.lookupFare(fareId,[])))
 const facts=resolved.flatMap(result=>result.status==='fulfilled'?[result.value]:[])
 return capturePreparedContext(prepared,facts)
}
