import { type ArtifactUIState,type Coverage,type FareDataBridge,type DatasetId,type CoverageRequest } from '../contracts'
export function legKey(coverage:Pick<Coverage,'originIds'|'destinationIds'>):string|undefined{return coverage.originIds.length===1&&coverage.destinationIds.length===1?`${coverage.originIds[0]}:${coverage.destinationIds[0]}`:undefined}
export function legDate(state:ArtifactUIState,originId:string,date=state.dates.start):string{
 const stop=state.stays.findIndex(stay=>stay.cityId===originId)
 const nights=stop<0?0:state.stays.slice(0,stop+1).reduce((sum,stay)=>sum+stay.nights,0)
 return new Date(Date.parse(date)+nights*86400000).toISOString().slice(0,10)
}
export function legRequest(state:ArtifactUIState,coverage:Coverage):CoverageRequest{
 const key=legKey(coverage);const chosen=key?state.modesByLeg[key]??state.filters.modes:state.filters.modes
 return {originIds:coverage.originIds,destinationIds:coverage.destinationIds,dateWindow:{from:legDate(state,coverage.originIds[0]??''),to:legDate(state,coverage.originIds[0]??'',state.dates.end??state.dates.start)},modes:chosen.length?chosen:coverage.modes,passengers:coverage.passengers}
}
export function legState(state:ArtifactUIState,coverage:Coverage):ArtifactUIState{
 const key=legKey(coverage)
 return {...state,dates:{start:legDate(state,coverage.originIds[0]??''),...(state.dates.end?{end:legDate(state,coverage.originIds[0]??'',state.dates.end)}:{})},filters:{...state.filters,modes:key&&state.modesByLeg[key]!==undefined?state.modesByLeg[key]??[]:state.filters.modes}}
}

export function resolveBoundDatasetId(state:ArtifactUIState,bridge:FareDataBridge,seedRef:DatasetId):DatasetId{
 const initial=bridge.getManifest(seedRef);const request=legRequest(state,initial.coverage)
 const current=[...state.datasetRefs].reverse().find(id=>{const candidate=bridge.getManifest(id);const coverage=candidate.coverage;return legKey(coverage)===legKey(initial.coverage)&&request.dateWindow.from>=coverage.dateWindow.from&&request.dateWindow.to<=coverage.dateWindow.to&&request.modes.every(mode=>coverage.modes.includes(mode))})
 if(current&&bridge.getManifest(current).source.sourceVersion!==initial.source.sourceVersion)throw new Error('Travel source changed; reload this artifact')
 return current??seedRef
}
