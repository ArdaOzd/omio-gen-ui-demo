import { DateSchema,type ArtifactUIState,type BoundedFareFact,type Coverage,type FareDataBridge,type DatasetId,type CoverageRequest } from '../contracts'
import { fallbackLegDate,legThreshold } from './itinerary-schedule'
export function legKey(coverage:Pick<Coverage,'originIds'|'destinationIds'>):string|undefined{return coverage.originIds.length===1&&coverage.destinationIds.length===1?`${coverage.originIds[0]}:${coverage.destinationIds[0]}`:undefined}
export type LegResource={key:string;datasetId:DatasetId;coverage:Coverage}
export function orderedLegResources(state:ArtifactUIState,bridge:FareDataBridge):LegResource[]{
 const resources=state.datasetRefs.flatMap(datasetId=>{const coverage=bridge.getManifest(datasetId).coverage,key=legKey(coverage);return key?[{key,datasetId,coverage}]:[]})
 const latest=new Map(resources.map(resource=>[resource.key,resource]))
 const first=resources[0]?.coverage.originIds[0]
 const route=state.citySequence.length>1?state.citySequence:[first,...state.stays.map(stay=>stay.cityId)]
 const stops=route.filter((city,index,all):city is string=>!!city&&(index===0||city!==all[index-1]))
 if(stops.length>1){
  const ordered=stops.slice(1).flatMap((destination,index)=>{const resource=latest.get(`${stops[index]}:${destination}`);return resource?[resource]:[]})
  if(ordered.length)return ordered
 }
 const seen=new Set<string>()
 return resources.flatMap(resource=>{if(seen.has(resource.key))return[];seen.add(resource.key);return[latest.get(resource.key)??resource]})
}
export function legDate(state:ArtifactUIState,originId:string,date=state.dates.start):string{
 return fallbackLegDate({...state,dates:{start:date}},originId)
}
export function tripDatesForLegDeparture(state:ArtifactUIState,originId:string,departureDate:string):ArtifactUIState['dates']{
 const shift=Date.parse(departureDate)-Date.parse(legDate(state,originId))
 const shifted=(date:string)=>DateSchema.parse(new Date(Date.parse(date)+shift).toISOString().slice(0,10))
 return {start:shifted(state.dates.start),...(state.dates.end?{end:shifted(state.dates.end)}:{})}
}
export function legRequest(state:ArtifactUIState,coverage:Coverage,selectedFacts:readonly BoundedFareFact[]=[]):CoverageRequest{
 const key=legKey(coverage);const chosen=key?state.modesByLeg[key]??state.filters.modes:state.filters.modes
 const threshold=legThreshold(state,coverage,selectedFacts)
 const visible=key?state.displayWindowByLeg[key]:undefined
 const fallbackTo=visible?.to??legDate(state,coverage.originIds[0]??'',state.dates.end??state.dates.start)
 const requestedFrom=visible?.from&&visible.from>threshold.date?visible.from:threshold.date
 const from=requestedFrom>fallbackTo?fallbackTo:requestedFrom
 return {originIds:coverage.originIds,destinationIds:coverage.destinationIds,dateWindow:{from,to:fallbackTo},modes:chosen.length?chosen:key?state.availableModesByLeg[key]??coverage.modes:coverage.modes,passengers:coverage.passengers}
}
export function legState(state:ArtifactUIState,coverage:Coverage,selectedFacts:readonly BoundedFareFact[]=[]):ArtifactUIState{
 const key=legKey(coverage)
 const threshold=legThreshold(state,coverage,selectedFacts)
 const visible=key?state.displayWindowByLeg[key]:undefined
 const requestedEnd=visible?.to??(state.dates.end?legDate(state,coverage.originIds[0]??'',state.dates.end):undefined)
 const requestedStart=visible?.from&&visible.from>threshold.date?visible.from:threshold.date
 const outside=!!requestedEnd&&requestedStart>requestedEnd
 const earliestMinutes=requestedStart===threshold.date?threshold.minutes:0
 return {...state,runtimeVariables:{...state.runtimeVariables,$earliestDepartureMinutes:earliestMinutes,$outsideDisplayWindow:outside},dates:outside?{start:requestedEnd,end:requestedEnd}:{start:requestedStart,...(requestedEnd&&requestedEnd>=requestedStart?{end:requestedEnd}:{})},sort:key&&state.sortByLeg[key]?state.sortByLeg[key]:state.sort,filters:{...state.filters,modes:key&&state.modesByLeg[key]!==undefined?state.modesByLeg[key]??[]:state.filters.modes}}
}

export function resolveBoundDatasetId(state:ArtifactUIState,bridge:FareDataBridge,seedRef:DatasetId,selectedFacts:readonly BoundedFareFact[]=[]):DatasetId{
 const initial=bridge.getManifest(seedRef);const request=legRequest(state,initial.coverage,selectedFacts)
 const current=[...state.datasetRefs].reverse().find(id=>{const candidate=bridge.getManifest(id);const coverage=candidate.coverage;return legKey(coverage)===legKey(initial.coverage)&&request.dateWindow.from>=coverage.dateWindow.from&&request.dateWindow.to<=coverage.dateWindow.to&&request.modes.every(mode=>coverage.modes.includes(mode))})
 if(current&&bridge.getManifest(current).source.sourceVersion!==initial.source.sourceVersion)throw new Error('Travel source changed; reload this artifact')
 return current??seedRef
}
