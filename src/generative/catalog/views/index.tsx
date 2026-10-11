import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DateSchema, FareIdSchema, FareRowSchema, type ArtifactId,type BoundedFareFact, type FareRow } from '../../contracts'
import { hasLoadedItineraryCoverage } from '../../state/leg-bindings'
import { carrierLabel,cityLabel, departure, duration, money, useArtifact, useFareRows, useQueryFareSelection, useTravelAction, filterPredicate, type QueryFareSelectionSource } from '../context'
import type { WidgetProps } from '../layout'
import type { TravelServices } from '../context'
import { RequestNotice } from '../status/request-notice'
import { FareList } from './fare-list'
import type {DisplayRepresentation} from '../../contracts/display-context'
import type {FareItem,QueryExecutionState} from '../../contracts/query-groups'
import {fareInspectionItems,useProjectionDisplay} from '../display-records'
import {recordDisplayInteraction,useDisplayNode,usePublishDisplay} from '../display-context-provider'
import {useCalendarDays,useFareHighlights,useModeStats,useOrderedFares,useItineraryPlan} from '../context'
import { FareRouteDetails } from '../fare-route-details'
import {fareMatchesScope} from '../../data/server-query-client'
import { clampDateWindow } from '../../state/date-bounds'
function fareDateTime(serviceDate:string,minutes:number){
 const day=Math.floor(minutes/1440),date=new Date(Date.parse(`${serviceDate}T00:00:00.000Z`)+day*86_400_000)
 return `${date.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})} · ${departure(minutes%1440)}`
}
function plotScale(max:number){
 const roughStep=max/5,magnitude=10**Math.floor(Math.log10(roughStep)),normalized=roughStep/magnitude
 const step=(normalized<=1?1:normalized<=2?2:normalized<=5?5:10)*magnitude,niceMax=Math.ceil(max/step)*step
 return{max:niceMax,ticks:Array.from({length:Math.round(niceMax/step)+1},(_,index)=>index*step)}
}
function plotDurationScale(max:number){
 const step=[15,30,60,120,180,240,360,720,1440].find(candidate=>Math.ceil(max/candidate)<=5)
 if(!step)return plotScale(max)
 const niceMax=Math.ceil(max/step)*step
 return{max:niceMax,ticks:Array.from({length:Math.round(niceMax/step)+1},(_,index)=>index*step)}
}
function committedQueryResult(state:QueryExecutionState){return state.status==='ready'||state.status==='refreshing'?state.current:state.status==='error'?state.previous:undefined}
function currentResourceKey(state:QueryExecutionState):string|undefined{return committedQueryResult(state)?.resourceKey}
function queryStatus(data:unknown,state:QueryExecutionState):'loading'|'ready'|'error'{return data?'ready':state.status==='error'?'error':'loading'}
const calendarDayMs=86_400_000
function shiftCalendarDate(date:string,days:number){
 const instant=Date.parse(`${date}T00:00:00.000Z`)+days*calendarDayMs
 if(!Number.isFinite(instant))return undefined
 const candidate=DateSchema.safeParse(new Date(instant).toISOString().slice(0,10))
 return candidate.success?candidate.data:undefined
}
function adjacentCalendarWindow(window:{from:string;to:string},direction:'previous'|'next'){
 const days=direction==='next'?7:-7,from=shiftCalendarDate(window.from,days),to=shiftCalendarDate(window.to,days)
 return from&&to?{from,to}:undefined
}
function fareDisplay(items:readonly FareItem[],total:number,viewport?:{offset:number;limit:number;cursor?:string},rankOffset=0):DisplayRepresentation{const omitted=Math.max(0,total-items.length);return{payload:{kind:'fare-order',orderedFareRefs:items.map((item,index)=>({fareId:item.id,rank:rankOffset+index+1})),...(items.length?{renderedRange:{fromRank:rankOffset+1,toRank:rankOffset+items.length}}:{}),...(viewport?{viewport}:{})},totalDisplayed:total,includedCount:items.length,complete:omitted===0,omittedCount:omitted}}
function useSelection(props:WidgetProps){const selection=useQueryFareSelection(props.artifactRef),display=useDisplayNode();return{state:selection.state,toggle(item:{id:FareItem['id']},source:QueryFareSelectionSource,fareIds:readonly FareItem['id'][]){const selected=selection.state.selectedFareIds.includes(item.id);recordDisplayInteraction(display.store,{artifactId:props.artifactRef,componentRef:display.componentRef,action:selected?'deselect':'select'});return selection.toggle(item,source,fareIds)}}}
export function FareCards(props:WidgetProps) {
 const node=useDisplayNode(),{services,state}=useArtifact(props.artifactRef),selection=useSelection(props),pageSize=7
 const [cursor,setCursor]=useState<string|null>(null),[cursorHistory,setCursorHistory]=useState<Array<string|null>>([])
 const result=useOrderedFares(props.artifactRef,{componentRef:node.componentRef??`${props.artifactRef}:fare-cards`,purpose:'fare-cards',datasetRef:props.datasetRef,cursor,limit:pageSize})
 const pagingIdentity=JSON.stringify({datasetRef:props.datasetRef,datasetRevision:result.requirement.datasetRevision,sourceVersion:result.requirement.sourceVersion,filters:state.filters,sort:state.sort,dates:state.dates,citySequence:state.citySequence})
 useEffect(()=>{setCursor(null);setCursorHistory([])},[pagingIdentity])
 const items=result.data?.items??[],total=result.data?.pageInfo.total??0
 const pageIndex=cursorHistory.length,rankOffset=pageIndex*pageSize
 const viewport={offset:rankOffset,limit:items.length,...(cursor?{cursor}:{})}
 useProjectionDisplay(result,fareDisplay(items,total,items.length?viewport:undefined,rankOffset),fareInspectionItems(items,new Map(),rankOffset));const status=queryStatus(result.data,result.queryState),resourceKey=currentResourceKey(result.queryState)
 if(status==='loading')return <Skeleton className="travel-skeleton" role="status">Finding your options…</Skeleton>
 if(status==='error')return <Alert className="travel-notice">These options could not load. Try refreshing the view.</Alert>
 const fareIds=items.map(item=>item.id)
 return <Card className="travel-panel"><h3>{props.title??'Your options'}</h3><p className="travel-caption">{total} matches · Synthetic fares per passenger</p>{items.length?<FareList rowIds={fareIds}>{items.map(item=>{const selected=selection.state.selectedFareIds.includes(item.id),company=carrierLabel(item,services.bridge,resourceKey);return <Card role="article" className={`travel-fare ${selected?'is-selected':''}`} key={item.id}><div><Badge className={`travel-mode travel-mode-${item.mode}`}>{cityLabel(item.mode)}</Badge><strong>{company}</strong><p>{departure(item.departureMinutes)} · {duration(item.durationMinutes)}</p><small>{cityLabel(item.originId)} → {cityLabel(item.destinationId)} · {item.serviceDate}</small><FareRouteDetails row={item}/></div><div><strong className="travel-price">{money(item.priceCents)}</strong><Button type="button" aria-pressed={selected} aria-label={`Select ${cityLabel(item.mode)} ${company} ${departure(item.departureMinutes)} ${money(item.priceCents)}`} onClick={()=>selection.toggle(item,result,fareIds)}>{selected?'Selected':'Select'}</Button></div></Card>})}</FareList>:<p role="status">No options match. Try another mode, date, or price limit.</p>}<div className="travel-pagination" aria-label="Fare result pages"><Button type="button" variant="outline" disabled={!cursorHistory.length} onClick={()=>{recordDisplayInteraction(node.store,{artifactId:props.artifactRef,componentRef:node.componentRef,action:'input',inputFields:['cursor']});const previous=cursorHistory.at(-1)??null;setCursorHistory(history=>history.slice(0,-1));setCursor(previous)}}>Previous</Button><span>Page {pageIndex+1}</span><Button type="button" variant="outline" disabled={!result.data?.pageInfo.hasNextPage||!result.data.pageInfo.nextCursor} onClick={()=>{const next=result.data?.pageInfo.nextCursor;if(next){recordDisplayInteraction(node.store,{artifactId:props.artifactRef,componentRef:node.componentRef,action:'input',inputFields:['cursor']});setCursorHistory(history=>[...history,cursor]);setCursor(next)}}}>Next</Button></div></Card>
}
export function FarePicker(props:WidgetProps) {
 const node=useDisplayNode(),{services,state}=useArtifact(props.artifactRef),selection=useSelection(props),pageSize=12
 const [cursor,setCursor]=useState<string|null>(null),[cursorHistory,setCursorHistory]=useState<Array<string|null>>([])
 const result=useOrderedFares(props.artifactRef,{componentRef:node.componentRef??`${props.artifactRef}:fare-picker`,purpose:'fare-picker',datasetRef:props.datasetRef,cursor,limit:pageSize})
 const pagingIdentity=JSON.stringify({datasetRef:props.datasetRef,datasetRevision:result.requirement.datasetRevision,sourceVersion:result.requirement.sourceVersion,filters:state.filters,sort:state.sort,dates:state.dates,citySequence:state.citySequence})
 useEffect(()=>{setCursor(null);setCursorHistory([])},[pagingIdentity])
 const items=result.data?.items??[],total=result.data?.pageInfo.total??0,selected=items.find(item=>selection.state.selectedFareIds.includes(item.id))?.id??'',resourceKey=currentResourceKey(result.queryState),status=queryStatus(result.data,result.queryState),pageIndex=cursorHistory.length,rankOffset=pageIndex*pageSize
 useProjectionDisplay(result,fareDisplay(items,total,items.length?{offset:rankOffset,limit:items.length,...(cursor?{cursor}:{})}:undefined,rankOffset),fareInspectionItems(items,new Map(),rankOffset))
 const changePage=(next:string|null,direction:'previous'|'next')=>{recordDisplayInteraction(node.store,{artifactId:props.artifactRef,componentRef:node.componentRef,action:'input',inputFields:['cursor']});if(direction==='previous')setCursorHistory(history=>history.slice(0,-1));else setCursorHistory(history=>[...history,cursor]);setCursor(next)}
 const fareIds=items.map(item=>item.id)
 return <Card className="travel-panel"><h3>{props.title??'Choose a fare'}</h3>{status==='loading'?<p role="status">Finding your options…</p>:status==='error'?<Alert>These options could not load. Try refreshing the view.</Alert>:items.length?<Label className="travel-field">Choose a synthetic fare<NativeSelect aria-label="Choose a synthetic fare" value={selected} onChange={event=>{const item=items.find(candidate=>candidate.id===event.target.value);if(item)selection.toggle(item,result,fareIds);else if(selected)selection.toggle({id:selected},result,fareIds)}}><NativeSelectOption value="">No fare selected on this page</NativeSelectOption>{items.map(item=>{const transfers=item.legs.length-1;return <NativeSelectOption key={item.id} value={item.id}>{cityLabel(item.mode)} · {carrierLabel(item,services.bridge,resourceKey)} · {departure(item.departureMinutes)} · {duration(item.durationMinutes)} · {transfers===0?'Direct':`${transfers} transfer${transfers===1?'':'s'}`} · {money(item.priceCents)}</NativeSelectOption>})}</NativeSelect></Label>:<p role="status">No options match. Try another mode, date, or price limit.</p>}<div className="travel-pagination" aria-label="Fare picker pages"><Button type="button" variant="outline" disabled={!cursorHistory.length} onClick={()=>changePage(cursorHistory.at(-1)??null,'previous')}>Previous</Button><span>Page {pageIndex+1}</span><Button type="button" variant="outline" disabled={!result.data?.pageInfo.hasNextPage||!result.data.pageInfo.nextCursor} onClick={()=>{const next=result.data?.pageInfo.nextCursor;if(next)changePage(next,'next')}}>Next</Button></div><small>Synthetic fares per passenger</small></Card>
}
export function PriceCalendar(props:WidgetProps) {
 const node=useDisplayNode(),{services,state}=useArtifact(props.artifactRef),dispatch=useTravelAction(props.artifactRef),selection=useSelection(props)
 const result=useCalendarDays(props.artifactRef,{componentRef:node.componentRef??`${props.artifactRef}:price-calendar`,purpose:'price-calendar',datasetRef:props.datasetRef,objective:'cheapest'}),days=(result.data?.days??[]).slice(0,62),omitted=Math.max(0,(result.data?.days.length??0)-days.length)
 const cells=days.map(day=>({key:day.date,label:day.date,value:day.representative?.priceCents,unit:(day.representative?'priceCents':'count') as 'priceCents'|'count',fareId:day.representative?.id,available:day.count>0}))
 useProjectionDisplay(result,{payload:{kind:'calendar',cells},totalDisplayed:result.data?.days.length??0,includedCount:days.length,complete:omitted===0,omittedCount:omitted},fareInspectionItems(days.flatMap(day=>day.representative?[day.representative]:[])))
 const status=queryStatus(result.data,result.queryState),legKey=result.requirement.group.legKey
 if(status!=='ready')return <RequestNotice status={status} label="Date comparisons"/>
 const fareIds=days.flatMap(day=>day.representative?[day.representative.id]:[])
 const renderedResult=committedQueryResult(result.queryState),binding=state.datasetRefs.flatMap(datasetId=>services.bridge.findBinding(datasetId)??[]).find(candidate=>`${candidate.manifest.coverage.originId}:${candidate.manifest.coverage.destinationId}`===legKey)
 const window=state.displayWindowByLeg[legKey]??result.requirement.scope.dateWindow,queryReady=!!renderedResult&&result.currentResultKey()===renderedResult.resultKey
 const previousWindow=adjacentCalendarWindow(window,'previous'),nextWindow=adjacentCalendarWindow(window,'next')
 const boundedPrevious=previousWindow&&services.dateBounds?clampDateWindow(previousWindow,services.dateBounds):previousWindow
 const boundedNext=nextWindow&&services.dateBounds?clampDateWindow(nextWindow,services.dateBounds):nextWindow
 const previousDisabled=!queryReady||!boundedPrevious||boundedPrevious.from===window.from&&boundedPrevious.to===window.to
 const nextDisabled=!queryReady||!boundedNext||boundedNext.from===window.from&&boundedNext.to===window.to
 const chooseDate=(date:string)=>{
  if(!renderedResult||!binding)return
  const calendarDateByLeg={...state.calendarDateByLeg,[legKey]:date}
  const command={kind:'calendarDateByLeg' as const,artifactId:state.artifactId,calendarDateByLeg,expectedRevision:state.revision}
  const scope={legKey,date,availableDates:days.filter(day=>day.count>0).map(day=>day.date),resourceKey:binding.resourceKey,datasetId:binding.datasetId,datasetRevision:binding.datasetRevision,sourceVersion:binding.manifest.source.sourceVersion,resultKey:renderedResult.resultKey,currentResultKey:result.currentResultKey,selectionKey:JSON.stringify(state.selectedFareIds)}
  return services.dispatch?.calendarDateFromQuery?.(command,scope)??services.state.dispatch(command)
 }
 const toggleFare=(item:FareItem)=>{
  const selected=selection.state.selectedFareIds.includes(item.id)
  recordDisplayInteraction(node.store,{artifactId:props.artifactRef,componentRef:node.componentRef,action:selected?'deselect':'select'})
  const command={kind:'select' as const,artifactId:state.artifactId,fareId:item.id,selected:!selected}
  if(selected||!services.dispatch?.selectFromQuery)return dispatch(command)
  if(!renderedResult||!binding)return{status:'stale' as const,revision:services.state.get(state.artifactId).revision}
  services.activate(props.artifactRef)
  const scope={kind:'query-result' as const,fareIds,resultKey:renderedResult.resultKey,currentResultKey:result.currentResultKey,resourceKey:binding.resourceKey,datasetId:binding.datasetId,datasetRevision:binding.datasetRevision,sourceVersion:binding.manifest.source.sourceVersion}
  return services.dispatch.selectFromQuery({...command,expectedRevision:services.state.get(state.artifactId).revision},scope)
 }
 const navigate=(target:{from:string;to:string}|undefined)=>{if(!target)return;dispatch({kind:'displayWindowByLeg',artifactId:state.artifactId,displayWindowByLeg:{...state.displayWindowByLeg,[legKey]:target}})}
 return <Card className="travel-panel"><h3>{props.title??'Find your best day'}</h3><div className="travel-inline" role="group" aria-label="Calendar date pages"><Button variant="outline" type="button" aria-label="Previous dates" disabled={previousDisabled} onClick={()=>navigate(boundedPrevious)}><span aria-hidden="true">←</span></Button><Button variant="outline" type="button" aria-label="Next dates" disabled={nextDisabled} onClick={()=>navigate(boundedNext)}><span aria-hidden="true">→</span></Button></div><div className="travel-calendar">{days.map(day=>{const item=day.representative,fareSelected=item?selection.state.selectedFareIds.includes(item.id):false,dateSelected=state.calendarDateByLeg[legKey]===day.date,itemReady=!!item&&!!binding&&queryReady&&fareMatchesScope(item,binding.manifest.coverage);return <div className="travel-calendar-option" key={day.date}><Button variant="outline" type="button" disabled={!itemReady} aria-pressed={dateSelected} onClick={()=>{if(item)chooseDate(day.date)}}><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span><strong>{item?money(item.priceCents):'No fare'}</strong><small>{day.count} options</small></Button>{item&&<Button type="button" size="sm" variant={fareSelected?'default':'outline'} disabled={!itemReady} aria-pressed={fareSelected} aria-label={`${fareSelected?'Remove':'Add'} cheapest fare on ${day.date} ${fareSelected?'from':'to'} trip`} onClick={()=>toggleFare(item)}>{fareSelected?'Added':'Add cheapest'}</Button>}</div>})}</div>{!days.length&&<p role="status">No options match. Use the arrows to try another week.</p>}</Card>
}
export function Comparison(props:WidgetProps) {
 const node=useDisplayNode(),result=useModeStats(props.artifactRef,{componentRef:node.componentRef??`${props.artifactRef}:comparison`,purpose:'comparison-matrix',datasetRef:props.datasetRef,baseline:'active'}),modes=result.data?.modes??[]
 const cells=modes.flatMap(mode=>[{key:`${mode.mode}-price`,label:`${mode.mode} minimum fare`,value:mode.minPriceCents??undefined,unit:'priceCents' as const},{key:`${mode.mode}-duration`,label:`${mode.mode} fastest`,value:mode.minDurationMinutes??undefined,unit:'durationMinutes' as const},{key:`${mode.mode}-count`,label:`${mode.mode} options`,value:mode.count,unit:'count' as const}])
 useProjectionDisplay(result,{payload:{kind:'aggregate',cells},totalDisplayed:cells.length,includedCount:cells.length,complete:true,omittedCount:0})
 const status=queryStatus(result.data,result.queryState);if(status!=='ready')return <RequestNotice status={status} label="Mode comparisons"/>
 return <Card className="travel-panel"><h3>{props.title??'Compare your way there'}</h3><div className="travel-table-wrap"><Table><TableCaption>Synthetic fares per passenger</TableCaption><TableHeader><TableRow><TableHead scope="col">Mode</TableHead><TableHead scope="col">From</TableHead><TableHead scope="col">Fastest</TableHead><TableHead scope="col">Options</TableHead></TableRow></TableHeader><TableBody>{modes.map(mode=><TableRow key={mode.mode}><TableHead scope="row">{cityLabel(mode.mode)}</TableHead><TableCell>{mode.minPriceCents===null?'–':money(mode.minPriceCents)}</TableCell><TableCell>{mode.minDurationMinutes===null?'–':duration(mode.minDurationMinutes)}</TableCell><TableCell>{mode.count}</TableCell></TableRow>)}</TableBody></Table></div>{!modes.length&&<p role="status">No options match. Try another mode, date, or price limit.</p>}</Card>
}
function useSelectedFacts(ref:string){
 const plan=useItineraryPlan(ref)
 return{services:plan.services,state:plan.state,result:plan.status==='ready'?{status:'ready' as const,facts:plan.facts}:{status:'loading' as const}}
}
export function Total(props:WidgetProps) {
 const {services,state,result}=useSelectedFacts(props.artifactRef)
 const passengers=state.datasetRefs[0]?services.bridge.findBinding(state.datasetRefs[0])?.manifest.coverage.passengers??1:1
 const total=result.status==='ready'?result.facts.reduce((sum,f)=>sum+f.priceCents,0)*passengers:0,facts=result.status==='ready'?result.facts:[]
 usePublishDisplay({display:{payload:{kind:'selection',orderedFareRefs:facts.map((fact,index)=>({fareId:fact.id,rank:index+1})),totalPriceCents:total,passengers},totalDisplayed:state.selectedFareIds.length,includedCount:facts.length,complete:facts.length===state.selectedFareIds.length,omittedCount:Math.max(0,state.selectedFareIds.length-facts.length)}})
 return <Card className="travel-total"><span>{props.title??'Synthetic total'}</span>{result.status!=='ready'?<RequestNotice status={result.status} label="Selected fares"/>:<><strong>{money(total)}</strong><p>{passengers} passenger{passengers===1?'':'s'}</p></>}<small>Synthetic total, including demo fees. No booking is available.</small></Card>
}
export function SelectedItinerary(props:WidgetProps) {
 const {state,result}=useSelectedFacts(props.artifactRef),facts=result.status==='ready'?result.facts:[]
 usePublishDisplay({display:{payload:{kind:'selection',orderedFareRefs:facts.map((fact,index)=>({fareId:fact.id,rank:index+1}))},totalDisplayed:state.selectedFareIds.length,includedCount:facts.length,complete:facts.length===state.selectedFareIds.length,omittedCount:Math.max(0,state.selectedFareIds.length-facts.length)}})
 return <Card className="travel-panel" role="region" aria-label="Selected itinerary"><h3>{props.title??'Selected fares'}</h3>{result.status!=='ready'?<RequestNotice status={result.status} label="Selected fares"/>:result.facts.length?<ol className="travel-timeline">{result.facts.map(fact=><li key={fact.id}><strong>{cityLabel(fact.originId)} → {cityLabel(fact.destinationId)}</strong><span>{fact.serviceDate} · {cityLabel(fact.mode)} · {money(fact.priceCents)} per passenger</span></li>)}</ol>:<p role="status">Choose a fare to see your itinerary.</p>}</Card>
}
export function ComparisonTable(props:WidgetProps) {
 const node=useDisplayNode(),{services,state}=useArtifact(props.artifactRef),selection=useSelection(props),pageSize=10
 const [cursor,setCursor]=useState<string|null>(null),[cursorHistory,setCursorHistory]=useState<Array<string|null>>([])
 const result=useOrderedFares(props.artifactRef,{componentRef:node.componentRef??`${props.artifactRef}:comparison-table`,purpose:'comparison-table',datasetRef:props.datasetRef,cursor,limit:pageSize})
 const pagingIdentity=JSON.stringify({datasetRef:props.datasetRef,datasetRevision:result.requirement.datasetRevision,sourceVersion:result.requirement.sourceVersion,filters:state.filters,sort:state.sort,dates:state.dates,citySequence:state.citySequence})
 useEffect(()=>{setCursor(null);setCursorHistory([])},[pagingIdentity])
 const items=result.data?.items??[],total=result.data?.pageInfo.total??0,resourceKey=currentResourceKey(result.queryState),pageIndex=cursorHistory.length,rankOffset=pageIndex*pageSize
 useProjectionDisplay(result,fareDisplay(items,total,items.length?{offset:rankOffset,limit:items.length,...(cursor?{cursor}:{})}:undefined,rankOffset),fareInspectionItems(items,new Map(),rankOffset));const status=queryStatus(result.data,result.queryState);if(status!=='ready')return <RequestNotice status={status} label="Fare comparisons"/>
 const fareIds=items.map(item=>item.id)
 return <Card className="travel-panel"><h3>{props.title??'Compare fares'}</h3><div className="travel-table-wrap"><Table aria-label="Compare fares"><TableCaption>Synthetic fares per passenger</TableCaption><TableHeader><TableRow><TableHead>Mode</TableHead><TableHead>Carrier</TableHead><TableHead>Date</TableHead><TableHead>Departure</TableHead><TableHead>Duration</TableHead><TableHead>Fare</TableHead><TableHead>Trip</TableHead></TableRow></TableHeader><TableBody>{items.map(item=>{const selected=selection.state.selectedFareIds.includes(item.id);return <TableRow key={item.id}><TableHead scope="row">{cityLabel(item.mode)}</TableHead><TableCell>{carrierLabel(item,services.bridge,resourceKey)}</TableCell><TableCell>{item.serviceDate}</TableCell><TableCell>{departure(item.departureMinutes)}</TableCell><TableCell>{duration(item.durationMinutes)}</TableCell><TableCell>{money(item.priceCents)}</TableCell><TableCell><Button type="button" size="sm" variant={selected?'default':'outline'} aria-pressed={selected} aria-label={`${selected?'Remove':'Add'} ${cityLabel(item.mode)} ${money(item.priceCents)} ${selected?'from':'to'} trip`} onClick={()=>selection.toggle(item,result,fareIds)}>{selected?'Added':'Add'}</Button></TableCell></TableRow>})}</TableBody></Table></div>{!items.length&&<p role="status">No options match. Try another mode, date, or price limit.</p>}<div className="travel-pagination" aria-label="Comparison result pages"><Button type="button" variant="outline" disabled={!cursorHistory.length} onClick={()=>{recordDisplayInteraction(node.store,{artifactId:props.artifactRef,componentRef:node.componentRef,action:'input',inputFields:['cursor']});const previous=cursorHistory.at(-1)??null;setCursorHistory(history=>history.slice(0,-1));setCursor(previous)}}>Previous</Button><span>Page {pageIndex+1}</span><Button type="button" variant="outline" disabled={!result.data?.pageInfo.hasNextPage||!result.data.pageInfo.nextCursor} onClick={()=>{const next=result.data?.pageInfo.nextCursor;if(next){recordDisplayInteraction(node.store,{artifactId:props.artifactRef,componentRef:node.componentRef,action:'input',inputFields:['cursor']});setCursorHistory(history=>[...history,cursor]);setCursor(next)}}}>Next</Button></div></Card>
}
export function ModeBreakdown(props:WidgetProps) {
 const node=useDisplayNode(),result=useModeStats(props.artifactRef,{componentRef:node.componentRef??`${props.artifactRef}:mode-breakdown`,purpose:'mode-breakdown',datasetRef:props.datasetRef,baseline:'active'}),modes=result.data?.modes??[],cells=modes.map(mode=>({key:mode.mode,label:cityLabel(mode.mode),value:mode.count,unit:'count' as const}))
 useProjectionDisplay(result,{payload:{kind:'aggregate',cells},totalDisplayed:cells.length,includedCount:cells.length,complete:true,omittedCount:0});const status=queryStatus(result.data,result.queryState);if(status!=='ready')return <RequestNotice status={status} label="Mode counts"/>
 return <Card className="travel-panel"><h3>{props.title??'Options by mode'}</h3><div className="travel-table-wrap"><Table aria-label="Options by mode"><TableHeader><TableRow><TableHead scope="col">Mode</TableHead><TableHead scope="col">Options</TableHead></TableRow></TableHeader><TableBody>{modes.map(mode=><TableRow key={mode.mode}><TableHead scope="row">{cityLabel(mode.mode)}</TableHead><TableCell>{mode.count}</TableCell></TableRow>)}</TableBody></Table></div>{!modes.length&&<p role="status">No options match. Try another mode, date, or price limit.</p>}</Card>
}

export function Coverage(props:WidgetProps) {
 const {services,state}=useArtifact(props.artifactRef),bindings=state.datasetRefs.flatMap(id=>{const binding=services.bridge.findBinding(id);return binding?[binding]:[]}),entries=bindings.map(binding=>({resourceKey:binding.resourceKey,complete:binding.manifest.complete,truncated:!binding.manifest.complete,totalAvailable:binding.manifest.totalAvailable}))
 usePublishDisplay({display:{payload:{kind:'coverage',entries},totalDisplayed:entries.length,includedCount:entries.length,complete:true,omittedCount:0}})
 return <Alert className="travel-notice" role="status" aria-atomic="true"><strong>{props.title??'Travel data scope'}</strong>{!bindings.length&&<p>No travel scope is loaded. Add stops in your next message.</p>}{bindings.map(binding=><p key={binding.resourceKey}>{binding.manifest.complete?'Complete server scope':binding.manifest.availableDateWindow===null?'No fares in the requested coverage window':'Partial server scope'} · {cityLabel(binding.manifest.coverage.originId)} → {cityLabel(binding.manifest.coverage.destinationId)} · {binding.manifest.coverage.dateWindow.from} to {binding.manifest.coverage.dateWindow.to} · {binding.manifest.totalAvailable.toLocaleString()} matching synthetic options</p>)}</Alert>
}
function useRouteStops(ref:string) {
 const {state}=useArtifact(ref)
 return state.citySequence.map((cityId,index)=>({cityId,nights:index===0?0:state.stays.find(stay=>stay.cityId===cityId)?.nights??0}))
}
export function CitySequence(props:WidgetProps) {
 const stops=useRouteStops(props.artifactRef)
 usePublishDisplay({display:{payload:{kind:'route',cityIds:stops.map(stop=>stop.cityId)},totalDisplayed:stops.length,includedCount:stops.length,complete:true,omittedCount:0}})
 return <Card className="travel-panel"><h3>{props.title??'Your stops'}</h3>{!stops.length&&<p role="status">Add stops in your next message to see your route.</p>}<ol className="travel-timeline" aria-label="Travel stops">{stops.map((stop,index)=><li key={`${stop.cityId}-${index}`}><strong>{cityLabel(stop.cityId)}</strong>{stop.nights>0&&<span>{stop.nights} night{stop.nights===1?'':'s'}</span>}</li>)}</ol></Card>
}
export function Route(props:WidgetProps) {
 const cities=useRouteStops(props.artifactRef).map(stop=>stop.cityId)
 usePublishDisplay({display:{payload:{kind:'route',cityIds:cities},totalDisplayed:cities.length,includedCount:cities.length,complete:true,omittedCount:0}})
 return <Card className="travel-panel"><h3>{props.title??'Your route'}</h3>{!cities.length?<p role="status">Add stops in your next message to see your route.</p>:<><svg viewBox="0 0 600 135" role="img" aria-label={`Schematic route: ${cities.map(cityLabel).join(' to ')}`}><path d="M45 55H555" stroke="var(--travel-blue)" strokeWidth="3" fill="none"/>{cities.map((city,i)=>{const x=45+i*510/Math.max(1,cities.length-1);return <g key={`${city}-${i}`}><circle cx={x} cy="55" r="9" fill="var(--travel-blue)"/><text x={x} y="92" textAnchor="middle">{cityLabel(city)}</text></g>})}</svg><small>Schematic route, not a geographic map.</small></>}</Card>
}
export function Timeline(props:WidgetProps) {
 const node=useDisplayNode(),result=useOrderedFares(props.artifactRef,{componentRef:node.componentRef??`${props.artifactRef}:timeline`,purpose:'itinerary-timeline',datasetRef:props.datasetRef,limit:5}),selected=useSelectedFacts(props.artifactRef),selection=useSelection(props),queryItems=result.data?.items??[],total=result.data?.pageInfo.total??0
 useProjectionDisplay(result,fareDisplay(queryItems,total),fareInspectionItems(queryItems));const status=selected.state.selectedFareIds.length?selected.result.status:queryStatus(result.data,result.queryState)
 if(status!=='ready')return <RequestNotice status={status} label="Journey details"/>
 const rows=selected.result.status==='ready'&&selected.result.facts.length?selected.result.facts:queryItems
 const fareIds=queryItems.map(item=>item.id)
 return <Card className="travel-panel"><h3>{props.title??'Journey timeline'}</h3><RequestNotice status="ready" empty={!rows.length}/><ol className="travel-timeline">{rows.map(row=>{const isSelected=selection.state.selectedFareIds.includes(row.id);return <li key={row.id}><span>{row.serviceDate} · {departure(row.departureMinutes)}</span><strong>{cityLabel(row.originId)} → {cityLabel(row.destinationId)}</strong><p>{cityLabel(row.mode)} · {duration(row.durationMinutes)} · {money(row.priceCents)}</p><Button type="button" size="sm" variant={isSelected?'default':'outline'} aria-pressed={isSelected} aria-label={`${isSelected?'Remove':'Add'} ${cityLabel(row.mode)} ${money(row.priceCents)} ${isSelected?'from':'to'} trip`} onClick={()=>selection.toggle(row,result,fareIds)}>{isSelected?'Added':'Add to trip'}</Button></li>})}</ol></Card>
}
export function Plot(props:WidgetProps) {
 const node=useDisplayNode(),{services}=useArtifact(props.artifactRef),selection=useSelection(props),result=useOrderedFares(props.artifactRef,{componentRef:node.componentRef??`${props.artifactRef}:plot`,purpose:'duration-price-plot',datasetRef:props.datasetRef,limit:50}),items=result.data?.items??[],total=result.data?.pageInfo.total??0,resourceKey=currentResourceKey(result.queryState)
 const [hoveredFareId,setHoveredFareId]=useState<FareItem['id']|null>(null),[openFareId,setOpenFareId]=useState<FareItem['id']|null>(null),popoverRef=useRef<HTMLDivElement>(null),popoverActionRef=useRef<HTMLButtonElement>(null),openTriggerRef=useRef<SVGGElement>(null),focusPopoverOnOpen=useRef(false)
 useProjectionDisplay(result,{payload:{kind:'plot',orderedFareRefs:items.map((item,index)=>({fareId:item.id,rank:index+1}))},totalDisplayed:total,includedCount:items.length,complete:total===items.length,omittedCount:Math.max(0,total-items.length)},fareInspectionItems(items));const status=queryStatus(result.data,result.queryState)
 useEffect(()=>{
  if(!openFareId)return
  const closeOnPointerDown=(event:PointerEvent)=>{if(event.target instanceof Node&&!popoverRef.current?.contains(event.target))setOpenFareId(null)}
  const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpenFareId(null);openTriggerRef.current?.focus()}}
  document.addEventListener('pointerdown',closeOnPointerDown)
  document.addEventListener('keydown',closeOnEscape)
  return()=>{document.removeEventListener('pointerdown',closeOnPointerDown);document.removeEventListener('keydown',closeOnEscape)}
 },[openFareId])
 useEffect(()=>{if(openFareId&&focusPopoverOnOpen.current){focusPopoverOnOpen.current=false;popoverActionRef.current?.focus()}},[openFareId])
 useEffect(()=>{if(openFareId&&status==='ready'&&!items.some(item=>item.id===openFareId))setOpenFareId(null)},[items,openFareId,status])
 if(status!=='ready')return <RequestNotice status={status} label="Journey comparisons"/>
 if(!items.length)return <Card className="travel-panel"><h3>{props.title??'Price and journey time'}</h3><RequestNotice status="ready" empty/></Card>
 const fareIds=items.map(item=>item.id)
 const openFare=items.find(item=>item.id===openFareId),inspectedFare=items.find(item=>item.id===(hoveredFareId??openFareId)),left=58,right=446,top=18,bottom=228,width=right-left,height=bottom-top
 const priceScale=plotScale(Math.max(100,...items.map(item=>item.priceCents))),durationScale=plotDurationScale(Math.max(15,...items.map(item=>item.durationMinutes)))
 const pointFor=(item:FareItem)=>({x:left+item.durationMinutes/durationScale.max*width,y:bottom-item.priceCents/priceScale.max*height})
 const openPoint=openFare?pointFor(openFare):undefined,inspectedPoint=inspectedFare?pointFor(inspectedFare):undefined
 const popoverAbove=!!openPoint&&openPoint.y>147
 return <Card className="travel-panel"><h3>{props.title??'Price and journey time'}</h3><RequestNotice status="ready" empty={!items.length}/><p className="travel-caption">Lower prices and shorter journeys sit closer to the bottom-left. Select a point for fare details.</p><div className="travel-plot"><div className="travel-plot-canvas"><svg className="travel-plot-chart" viewBox="0 0 470 294" role="group" aria-label="Duration and price comparison"><path className="travel-plot-axis" d={`M${left} ${top}V${bottom}H${right}`} />{priceScale.ticks.map(value=>{const y=bottom-value/priceScale.max*height;return <g className="travel-plot-tick" key={`price-${value}`}><line x1={left-4} x2={right} y1={y} y2={y}/><text x={left-9} y={y+4} textAnchor="end">{money(value).replace('.00','')}</text></g>})}{durationScale.ticks.map(value=>{const x=left+value/durationScale.max*width;return <g className="travel-plot-tick" key={`duration-${value}`}><line x1={x} x2={x} y1={top} y2={bottom+4}/><text x={x} y={bottom+20} textAnchor="middle">{duration(value)}</text></g>})}<text className="travel-plot-axis-title" x={(left+right)/2} y="283" textAnchor="middle">Journey duration</text><text className="travel-plot-axis-title" x="15" y={(top+bottom)/2} textAnchor="middle" transform={`rotate(-90 15 ${(top+bottom)/2})`}>Price</text>{inspectedFare&&inspectedPoint&&<g className="travel-plot-guides" role="status" aria-label={`${money(inspectedFare.priceCents)}, ${duration(inspectedFare.durationMinutes)}`}><line x1={left} x2={inspectedPoint.x} y1={inspectedPoint.y} y2={inspectedPoint.y}/><line x1={inspectedPoint.x} x2={inspectedPoint.x} y1={inspectedPoint.y} y2={bottom}/><g className="travel-plot-readout"><rect x="3" y={inspectedPoint.y-11} width="50" height="20" rx="6"/><text x="28" y={inspectedPoint.y+4} textAnchor="middle">{money(inspectedFare.priceCents)}</text><rect x={Math.min(right-35,Math.max(left+35,inspectedPoint.x))-35} y={bottom+25} width="70" height="20" rx="6"/><text x={Math.min(right-35,Math.max(left+35,inspectedPoint.x))} y={bottom+40} textAnchor="middle">{duration(inspectedFare.durationMinutes)}</text></g></g>}{items.map(item=>{const selected=selection.state.selectedFareIds.includes(item.id),point=pointFor(item),expanded=item.id===openFareId,company=carrierLabel(item,services.bridge,resourceKey);return <g key={item.id} className={`travel-plot-point${selected?' is-selected':''}`} role="button" tabIndex={0} aria-pressed={selected} aria-expanded={expanded} aria-controls={expanded?`plot-fare-${item.id}`:undefined} aria-label={`View ${cityLabel(item.mode)} ${company}, ${duration(item.durationMinutes)}, ${money(item.priceCents)}`} onPointerEnter={()=>setHoveredFareId(item.id)} onPointerLeave={()=>setHoveredFareId(current=>current===item.id?null:current)} onFocus={()=>setHoveredFareId(item.id)} onBlur={()=>setHoveredFareId(current=>current===item.id?null:current)} onClick={event=>{openTriggerRef.current=event.currentTarget;setOpenFareId(item.id)}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openTriggerRef.current=event.currentTarget;focusPopoverOnOpen.current=true;setOpenFareId(item.id)}}}><circle className="travel-plot-hit-area" cx={point.x} cy={point.y} r="7"/><circle cx={point.x} cy={point.y} r="7" className={`travel-dot travel-mode-${item.mode}`}/><title>{company}</title></g>})}</svg>{openFare&&openPoint&&<><span className="travel-plot-stem" aria-hidden="true" style={{left:`${openPoint.x/470*100}%`,...(popoverAbove?{bottom:`${(294-openPoint.y)/294*100}%`}:{top:`${openPoint.y/294*100}%`})}}/><Card ref={popoverRef} id={`plot-fare-${openFare.id}`} role="dialog" aria-label={`${carrierLabel(openFare,services.bridge,resourceKey)} fare details`} className="travel-plot-popover" style={{left:`clamp(153px, ${openPoint.x/470*100}%, calc(100% - 153px))`,...(popoverAbove?{bottom:`calc(${(294-openPoint.y)/294*100}% + 15px)`}:{top:`calc(${openPoint.y/294*100}% + 15px)`})}}><div className="travel-plot-popover-heading"><div><Badge className={`travel-mode travel-mode-${openFare.mode}`}>{cityLabel(openFare.mode)}</Badge><strong>{carrierLabel(openFare,services.bridge,resourceKey)}</strong></div><strong className="travel-price">{money(openFare.priceCents)}</strong></div><p><strong>{cityLabel(openFare.originId)} → {cityLabel(openFare.destinationId)}</strong></p><dl className="travel-insight-details"><div><dt>Departure</dt><dd>{fareDateTime(openFare.serviceDate,openFare.departureMinutes)}</dd></div><div><dt>Arrival</dt><dd>{fareDateTime(openFare.serviceDate,openFare.departureMinutes+openFare.durationMinutes)}</dd></div><div><dt>Duration</dt><dd>{duration(openFare.durationMinutes)}</dd></div></dl><Button ref={popoverActionRef} type="button" variant={selection.state.selectedFareIds.includes(openFare.id)?'default':'outline'} aria-pressed={selection.state.selectedFareIds.includes(openFare.id)} aria-label={`${selection.state.selectedFareIds.includes(openFare.id)?'Remove':'Add'} ${cityLabel(openFare.mode)} ${money(openFare.priceCents)} ${selection.state.selectedFareIds.includes(openFare.id)?'from':'to'} trip`} onClick={()=>selection.toggle(openFare,result,fareIds)}>{selection.state.selectedFareIds.includes(openFare.id)?'Added':'Add to trip'}</Button></Card></>}</div></div></Card>
}
export function CheapestFastest(props:WidgetProps) {
 const node=useDisplayNode(),{services}=useArtifact(props.artifactRef),selection=useSelection(props),result=useFareHighlights(props.artifactRef,{componentRef:node.componentRef??`${props.artifactRef}:highlights`,purpose:'fare-highlights',datasetRef:props.datasetRef}),highlights=[{name:'Lowest fare',row:result.data?.cheapest??undefined},{name:'Fastest journey',row:result.data?.fastest??undefined}],items=highlights.flatMap(item=>item.row?[item.row]:[]),resourceKey=currentResourceKey(result.queryState)
 useProjectionDisplay(result,{payload:{kind:'fare-highlights',items:highlights.map(item=>({label:item.name,fareId:item.row?.id}))},totalDisplayed:items.length,includedCount:items.length,complete:true,omittedCount:0},fareInspectionItems(items,new Map(highlights.flatMap(item=>item.row?[[item.row.id,item.name]]:[]))));const status=queryStatus(result.data,result.queryState)
 if(status!=='ready')return <RequestNotice status={status} label="Fare comparisons"/>
 const fareIds=items.map(item=>item.id)
 return <Card className="travel-panel"><h3>{props.title??'Cheapest and fastest'}</h3><RequestNotice status="ready" empty={!items.length}/><div className="travel-responsivegrid">{highlights.map(({name,row})=>{const selected=row?selection.state.selectedFareIds.includes(row.id):false;return <Card className={`travel-insight${selected?' is-selected':''}`} key={name}><span>{name}</span><strong>{row?money(row.priceCents):'No match'}</strong><p>{row?`${duration(row.durationMinutes)} · ${cityLabel(row.mode)}`:''}</p>{row&&<dl className="travel-insight-details"><div><dt>Company</dt><dd>{carrierLabel(row,services.bridge,resourceKey)}</dd></div><div><dt>Departure</dt><dd>{fareDateTime(row.serviceDate,row.departureMinutes)}</dd></div><div><dt>Arrival</dt><dd>{fareDateTime(row.serviceDate,row.departureMinutes+row.durationMinutes)}</dd></div></dl>}{row&&<Button type="button" variant={selected?'default':'outline'} aria-pressed={selected} aria-label={`${selected?'Remove':'Add'} ${name.toLocaleLowerCase()} ${cityLabel(row.mode)} ${money(row.priceCents)} ${selected?'from':'to'} trip`} onClick={()=>selection.toggle(row,result,fareIds)}>{selected?'Added':'Add to trip'}</Button>}</Card>})}</div></Card>
}

export function SelectedFareCount(props:WidgetProps) {
 const {state}=useArtifact(props.artifactRef)
 const count=state.selectedFareIds.length
 usePublishDisplay({display:{payload:{kind:'selection',orderedFareRefs:state.selectedFareIds.map((fareId,index)=>({fareId,rank:index+1}))},totalDisplayed:count,includedCount:count,complete:true,omittedCount:0}})
 return <Badge className="travel-caption" role="status" aria-label="Selected fares" aria-atomic="true">{count} selected fare{count===1?'':'s'}</Badge>
}
