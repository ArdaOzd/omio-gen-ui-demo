import { CONTRACT_VERSION,LIMITS,parseAgentContext,type AgentContextEnvelope,type ArtifactId,type BoundedFareFact,type CompactArtifactSnapshot,type ComponentBinding,type DatasetId,type OlderArtifactSummary,type UIStateStore } from '../contracts'
import type { FareItem, FareScopeBinding, LookupPin, ResourceKey } from '../contracts/query-groups'
import { assertNoBulkData } from '../contracts/privacy'
import type { FrozenDisplayContext } from '../contracts/display-context'
import type { ServerFareDataBridge } from '../data/fare-data-bridge'
import type { DisplayContextStore } from './display-context'
type ExportInput={turnId:string;activeArtifactId?:ArtifactId;artifactIds:ArtifactId[];store:UIStateStore;bridge:ServerFareDataBridge;displayStore:DisplayContextStore;selectedFareFacts?:BoundedFareFact[];plannedFareFacts?:readonly BoundedFareFact[];olderArtifactSummaries?:OlderArtifactSummary[];layoutSummaries?:ReadonlyMap<string,string>;componentBindings?:ReadonlyMap<string,readonly ComponentBinding[]>}
type SnapshotRecord={snapshot:CompactArtifactSnapshot;lastInteractionAt:string;authoredBindingCount:number}
type PreparedCapture={turnId:string;activeArtifactId?:ArtifactId;records:SnapshotRecord[];bindings:Map<string,FareScopeBinding>;plannedFareIds:ReturnType<UIStateStore['get']>['selectedFareIds'];displayContext:FrozenDisplayContext;pinsBySource:Map<string,LookupPin[]>;cachedFacts:BoundedFareFact[]}
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
 const latestByLeg=new Map(snapshot.datasetRefs.flatMap(datasetRef=>{const binding=input.bridge.findBinding(datasetRef);if(!binding)return[];const coverage=binding.manifest.coverage,key=`${coverage.originId}:${coverage.destinationId}`;return[[key,datasetRef] as const]}))
 const currentByIndex=snapshot.citySequence.slice(1).map((destination,index)=>{const key=`${snapshot.citySequence[index]}:${destination}`;return{key,datasetRef:latestByLeg.get(key)}})
 return [...(input.componentBindings?.get(snapshot.artifactId)??snapshot.componentBindings)].flatMap(binding=>{
  if(binding.legIndex!==undefined){const current=currentByIndex[binding.legIndex];return current?.datasetRef?[{...binding,legKey:current.key,datasetRef:current.datasetRef}]:[]}
  if(!binding.datasetRef||activeLegKeys.size===0)return[binding]
  const currentBinding=input.bridge.findBinding(binding.datasetRef)
  if(!currentBinding)return[]
  const coverage=currentBinding.manifest.coverage,key=`${coverage.originId}:${coverage.destinationId}`,current=latestByLeg.get(key)
  return activeLegKeys.has(key)&&current?[{...binding,datasetRef:current}]:[]
 })
}
function snapshots(input:ExportInput){
 const ids=[...new Set([...(input.activeArtifactId?[input.activeArtifactId]:[]),...input.artifactIds])]
 return ids.map(id=>{
  const snapshot=input.store.exportSnapshot(id),authored=currentAuthoredBindings(input,snapshot)
  const grid=authored.find(binding=>binding.type==='MultiCityPlanGrid')
  if(!grid)return{...snapshot,componentBindings:authored,layoutSummary:input.layoutSummaries?.get(id)??snapshot.layoutSummary}
  const latest=new Map<string,DatasetId>(snapshot.datasetRefs.flatMap(datasetRef=>{const binding=input.bridge.findBinding(datasetRef);if(!binding)return[];const coverage=binding.manifest.coverage;return[[`${coverage.originId}:${coverage.destinationId}`,datasetRef] as const]}))
  const route=snapshot.citySequence
  const internals:ComponentBinding[]=route.slice(1).flatMap((destination,index)=>{
   const legKey=`${route[index]}:${destination}`,datasetRef=latest.get(legKey);if(!datasetRef)return[]
   const prefix=`${grid.key??'grid'}.leg-${index+1}`
   const bindings:ComponentBinding[]=[
    {key:`${prefix}.cities`,type:'CityField',legIndex:index,legKey,datasetRef,actionRef:'route'},
    {key:`${prefix}.date`,type:'TravelDate',legIndex:index,legKey,datasetRef,actionRef:'dates'},
    {key:`${prefix}.transport`,type:'TransportSelect',legIndex:index,legKey,datasetRef,actionRef:'modesByLeg'},
    {key:`${prefix}.order`,type:'FareOrder',legIndex:index,legKey,datasetRef,actionRef:'sortByLeg'},
    {key:`${prefix}.fares`,type:'FadeFares',legIndex:index,legKey,datasetRef,actionRef:'select',selectorRef:'visibleFares'},
   ]
   if(index<route.length-2)bindings.push({key:`${prefix}.stay`,type:'StayDuration',legIndex:index,legKey,datasetRef,actionRef:'stays',selectorRef:'legSchedule'})
   return bindings
  })
  return{...snapshot,componentBindings:[...authored,...internals].slice(0,LIMITS.treeNodes),layoutSummary:input.layoutSummaries?.get(id)??snapshot.layoutSummary}
 })
}
function bindingFor(input:ExportInput,datasetId:DatasetId):FareScopeBinding{
 const binding=input.bridge.findBinding(datasetId)
 if(!binding)throw new Error(`Missing captured fare scope: ${datasetId}`)
 return binding
}
function envelope(input:ExportInput,artifacts:CompactArtifactSnapshot[],olderArtifactSummaries:OlderArtifactSummary[],displayContext:FrozenDisplayContext):AgentContextEnvelope{
 const refs=[...new Set(artifacts.flatMap(artifact=>artifact.datasetRefs))]
 const plannedFareIds=[...new Set(snapshots(input).flatMap(artifact=>artifact.selectedFareIds))]
 return {schemaVersion:CONTRACT_VERSION,turnId:input.turnId,activeArtifactId:input.activeArtifactId,artifacts,olderArtifactSummaries,datasets:refs.map(id=>bindingFor(input,id)),plannedFareIds,selectedFareFacts:input.selectedFareFacts??[],displayContext}
}
function finish(candidate:AgentContextEnvelope):AgentContextEnvelope{
 const snapshot=parseAgentContext(candidate);assertNoBulkData(snapshot);return snapshot
}
export function exportAgentContext(input:ExportInput):AgentContextEnvelope{
 const artifacts=snapshots(input)
 const displayContext=input.displayStore.capture({captureId:input.turnId,artifactIds:artifacts.map(artifact=>artifact.artifactId)})
 return finish(envelope(input,artifacts,input.olderArtifactSummaries??[],displayContext))
}
function prepareCapture(input:Omit<ExportInput,'olderArtifactSummaries'|'selectedFareFacts'>):PreparedCapture{
 const records=prioritizeRecords(snapshots(input).map(snapshot=>({snapshot,lastInteractionAt:input.store.get(snapshot.artifactId).lastInteractionAt,authoredBindingCount:currentAuthoredBindings(input,input.store.exportSnapshot(snapshot.artifactId)).length})),input.activeArtifactId)
 const bindings=new Map<string,FareScopeBinding>()
 for(const datasetId of new Set(records.flatMap(record=>record.snapshot.datasetRefs)))bindings.set(datasetId,structuredClone(bindingFor(input,datasetId)))
 const plannedFareIds=[...new Set([...records.flatMap(record=>record.snapshot.selectedFareIds),...(input.plannedFareFacts??[]).map(fact=>fact.id)])]
 const displayContext=input.displayStore.capture({captureId:input.turnId,artifactIds:records.map(record=>record.snapshot.artifactId)})
 const componentByRef=new Map(displayContext.components.map(component=>[component.identity.componentRef.value,component]))
 const pinsBySource=new Map<string,LookupPin[]>()
 const cachedFacts:BoundedFareFact[]=(input.plannedFareFacts??[]).map(fact=>structuredClone(fact))
 for(const fareId of plannedFareIds){
  const shown=displayContext.shownFareFacts.find(candidate=>candidate.fact.id===fareId)
  const displayedBy=shown?.displayedBy.flatMap(owner=>componentByRef.get(owner.componentRef)??[]).find(component=>component.execution)
  const result=displayedBy?.execution?.status==='ready'||displayedBy?.execution?.status==='refreshing'?displayedBy.execution.current:displayedBy?.execution?.status==='error'?displayedBy.execution.previous:undefined
  let binding=result?bindings.get(result.datasetId):undefined
  if(!binding)binding=[...bindings.values()].find(candidate=>input.bridge.findCachedFare(fareId,candidate.resourceKey))
  if(!binding)continue
  const cached=input.bridge.findCachedFare(fareId,binding.resourceKey)
  if(cached){const{availableSeats:_availableSeats,...fact}=cached;cachedFacts.push(structuredClone(fact))}
  const sourceVersion=binding.manifest.source.sourceVersion
  const pins=pinsBySource.get(sourceVersion)??[]
  if(!pins.some(pin=>pin.fareId===fareId&&pin.resourceKey===binding.resourceKey))pins.push({fareId,resourceKey:binding.resourceKey})
  pinsBySource.set(sourceVersion,pins)
 }
 return {turnId:input.turnId,activeArtifactId:input.activeArtifactId,records,bindings,plannedFareIds,displayContext,pinsBySource,cachedFacts}
}
function displayFareIds(component:FrozenDisplayContext['components'][number]):string[]{
 const payload=component.display?.payload
 if(!payload)return[]
 if(payload.kind==='fare-order'||payload.kind==='plot'||payload.kind==='selection')return payload.orderedFareRefs.map(item=>item.fareId)
 if(payload.kind==='fare-highlights')return payload.items.flatMap(item=>item.fareId?[item.fareId]:[])
 if(payload.kind==='calendar'||payload.kind==='aggregate')return payload.cells.flatMap(cell=>cell.fareId?[cell.fareId]:[])
 return[]
}
function compactDisplayContext(context:FrozenDisplayContext,artifactIds:Set<string>,componentLimit:number,factLimit:number):FrozenDisplayContext{
 const belonging=context.components.filter(component=>artifactIds.has(component.identity.scope.artifactId))
 const components=belonging.slice(0,componentLimit)
 const componentRefs=new Set(components.map(component=>component.identity.componentRef.value))
 const exposedOrderedIds=[...new Set(components.filter(component=>component.visibility==='visible').flatMap(displayFareIds))].slice(0,100)
 const eligibleFacts=context.shownFareFacts.flatMap(fact=>{
  const displayedBy=fact.displayedBy.filter(owner=>componentRefs.has(owner.componentRef))
  return displayedBy.length?[{...fact,displayedBy}]:[]
 })
 const shownFareFacts=eligibleFacts.slice(0,factLimit)
 const omittedComponents=context.completeness.omittedComponents+(context.components.length-belonging.length)+(belonging.length-components.length)
 const omittedFacts=context.completeness.omittedFacts+(context.shownFareFacts.length-eligibleFacts.length)+(eligibleFacts.length-shownFareFacts.length)
 return {
  ...context,
  components,
  activeViews:context.activeViews.filter(ref=>componentRefs.has(ref)),
  exposedOrderedIds,
  shownFareFacts,
  recentInteractions:context.recentInteractions.filter(event=>artifactIds.has(event.artifactId)),
  completeness:{complete:context.completeness.complete&&omittedComponents===0&&omittedFacts===0,omittedComponents,omittedFacts},
 }
}
function addMinutes(date:string,minutes:number):{date:string;minutes:number}{
 const instant=Date.parse(`${date}T00:00:00.000Z`)+minutes*60_000,value=new Date(instant)
 return{date:value.toISOString().slice(0,10),minutes:value.getUTCHours()*60+value.getUTCMinutes()}
}
function thresholdIso(threshold:{date:string;minutes:number}):string{return new Date(Date.parse(`${threshold.date}T00:00:00.000Z`)+threshold.minutes*60_000).toISOString()}
function legThresholds(record:SnapshotRecord,bindings:Map<string,FareScopeBinding>,facts:BoundedFareFact[]):CompactArtifactSnapshot['legThresholds']{
 const byKey=new Map<string,FareScopeBinding>(record.snapshot.datasetRefs.flatMap(datasetId=>{const binding=bindings.get(datasetId);return binding?[[`${binding.manifest.coverage.originId}:${binding.manifest.coverage.destinationId}`,binding] as const]:[]}))
 const keys=record.snapshot.citySequence.slice(1).map((destinationId,index)=>`${record.snapshot.citySequence[index]}:${destinationId}`)
 const ordered=(keys.length?keys:[...byKey.keys()]).flatMap(key=>byKey.get(key)??[])
 const factsByKey=new Map(facts.map(fact=>[`${fact.originId}:${fact.destinationId}`,fact]))
 const accepted:BoundedFareFact[]=[]
 let blocked=false
 return ordered.map(binding=>{
  const scope=binding.manifest.coverage,key=`${scope.originId}:${scope.destinationId}`
  const preceding=[...accepted].reverse().find(fare=>fare.destinationId===scope.originId)
  const threshold=preceding?addMinutes(preceding.serviceDate,preceding.departureMinutes+preceding.durationMinutes+(record.snapshot.stays.find(stay=>stay.cityId===scope.originId)?.nights??0)*1440):scope.earliestDeparture
  const selectedFare=factsByKey.get(key),departure=selectedFare?Date.parse(`${selectedFare.serviceDate}T00:00:00.000Z`)+selectedFare.departureMinutes*60_000:0,earliest=Date.parse(`${threshold.date}T00:00:00.000Z`)+threshold.minutes*60_000
  if(selectedFare&&!blocked&&departure>=earliest)accepted.push(selectedFare);else if(selectedFare)blocked=true
  return{legKey:key,originId:scope.originId,destinationId:scope.destinationId,earliestDeparture:thresholdIso(threshold),source:preceding?'selected-arrival':'trip-date',...(preceding?{precedingFareId:preceding.id}:{}),...(selectedFare?{selectedFareId:selectedFare.id}:{})}
 })
}
function capturePreparedContext(prepared:PreparedCapture,selectedFareFacts:BoundedFareFact[]):AgentContextEnvelope{
 const records=[...prepared.records]
 selectedFareFacts=prioritizeFacts(prepared,selectedFareFacts)
 const included=records.slice(0,LIMITS.artifacts)
 let factCount=selectedFareFacts.length
 let compactFactLabels=false
 let summaryLimit=LIMITS.storedArtifacts
 let displayComponentLimit=prepared.displayContext.components.length
 let displayFactLimit=prepared.displayContext.shownFareFacts.length
 const bindingLimits=new Map(records.map(record=>[record.snapshot.artifactId,record.snapshot.componentBindings.length]))
 while(true){
  const ids=new Set(included.map(record=>record.snapshot.artifactId))
  const summaries=records.filter(record=>!ids.has(record.snapshot.artifactId)).map(record=>({artifactId:record.snapshot.artifactId,label:record.snapshot.layoutSummary.slice(0,160),revision:record.snapshot.revision,lastInteractionAt:record.lastInteractionAt})).slice(0,summaryLimit)
  const artifacts=included.map(record=>{
   const facts=selectedFareFacts.filter(fact=>record.snapshot.selectedFareIds.includes(fact.id))
   return{...record.snapshot,componentBindings:record.snapshot.componentBindings.slice(0,bindingLimits.get(record.snapshot.artifactId)),legThresholds:legThresholds(record,prepared.bindings,facts)}
  })
  const refs=[...new Set(artifacts.flatMap(artifact=>artifact.datasetRefs))]
  const includedFacts=selectedFareFacts.slice(0,factCount).map(fact=>compactFactLabels?{...fact,carrierName:null}:fact)
  const displayContext=compactDisplayContext(prepared.displayContext,ids,displayComponentLimit,displayFactLimit)
  const candidate:AgentContextEnvelope={schemaVersion:CONTRACT_VERSION,turnId:prepared.turnId,activeArtifactId:prepared.activeArtifactId,artifacts,olderArtifactSummaries:summaries,datasets:refs.map(id=>{
   const binding=prepared.bindings.get(id)
   if(!binding)throw new Error('Missing captured fare scope binding')
   return binding
  }),plannedFareIds:prepared.plannedFareIds,selectedFareFacts:includedFacts,displayContext}
  if(new TextEncoder().encode(JSON.stringify(candidate)).length<=LIMITS.snapshotBytes)return finish(candidate)
  const synthetic=[...included].reverse().find(record=>(bindingLimits.get(record.snapshot.artifactId)??0)>record.authoredBindingCount)
  if(synthetic){const limit=bindingLimits.get(synthetic.snapshot.artifactId)??0;bindingLimits.set(synthetic.snapshot.artifactId,limit-1)}
  else if(!compactFactLabels&&factCount>0)compactFactLabels=true
  else if(displayFactLimit>0)displayFactLimit-=1
  else if(displayComponentLimit>0)displayComponentLimit-=1
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
 const resolved=await Promise.allSettled([...prepared.pinsBySource].map(([sourceVersion,pins])=>input.bridge.lookupPins({version:1,requestId:`pins-${crypto.randomUUID()}`,sourceVersion,pins},new AbortController().signal)))
 const remote=resolved.flatMap(result=>result.status==='fulfilled'?result.value.items:[]).map(item=>{const{availableSeats:_availableSeats,...fact}=item;return fact})
 const facts=[...new Map([...prepared.cachedFacts,...remote].map(fact=>[fact.id,fact])).values()]
 return capturePreparedContext(prepared,facts)
}
