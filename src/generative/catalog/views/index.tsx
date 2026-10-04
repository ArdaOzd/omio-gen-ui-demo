import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { type ArtifactId,type BoundedFareFact } from '../../contracts'
import { legDate,tripDatesForLegDeparture } from '../../state/leg-bindings'
import { carrierLabel,cityLabel, departure, duration, money, useArtifact, useFareRows, useTravelAction, useTravelQuery, filterPredicate } from '../context'
import type { WidgetProps } from '../layout'
import type { TravelServices } from '../context'
import { RequestNotice } from '../status/request-notice'
export function FareCards(props:WidgetProps) {
 const result=useFareRows(props.artifactRef,props.datasetRef); const dispatch=useTravelAction(props.artifactRef)
 if(result.status==='loading')return <div className="travel-skeleton" role="status">Finding your options…</div>
 if(result.status==='error')return <div role="alert" className="travel-notice">These options could not load. Try refreshing the view.</div>
 return <section className="travel-panel"><h3>{props.title??'Your options'}</h3><p className="travel-caption">{result.data?.total??0} matches · Synthetic fares per passenger</p>{result.rows.length?<div className="travel-fares">{result.rows.slice(0,20).map(row=><article className={`travel-fare ${result.state.selectedFareIds.includes(row.id)?'is-selected':''}`} key={row.id}><div><span className={`travel-mode travel-mode-${row.mode}`}>{cityLabel(row.mode)}</span><strong>{carrierLabel(row,result.services.bridge,result.datasetId)}</strong><p>{departure(row.departureMinutes)} · {duration(row.durationMinutes)}</p><small>{cityLabel(row.originId)} → {cityLabel(row.destinationId)} · {row.serviceDate}</small></div><div><strong className="travel-price">{money(row.priceCents)}</strong><button type="button" aria-pressed={result.state.selectedFareIds.includes(row.id)} aria-label={`Select ${cityLabel(row.mode)} ${carrierLabel(row,result.services.bridge,result.datasetId)} ${departure(row.departureMinutes)} ${money(row.priceCents)}`} onClick={()=>dispatch({kind:'select',artifactId:result.state.artifactId,fareId:row.id,selected:!result.state.selectedFareIds.includes(row.id)})}>{result.state.selectedFareIds.includes(row.id)?'Selected':'Select'}</button></div></article>)}</div>:<p role="status">No options match. Try another mode, date, or price limit.</p>}{(result.data?.total??0)>20&&<p className="travel-caption">Showing the first 20. Narrow your filters to compare more closely.</p>}</section>
}
export function FarePicker(props:WidgetProps) {
 const result=useFareRows(props.artifactRef,props.datasetRef);const dispatch=useTravelAction(props.artifactRef)
 const selected=result.rows.find(row=>result.state.selectedFareIds.includes(row.id))?.id??''
 return <section className="travel-panel"><h3>{props.title??'Choose a fare'}</h3>{result.status==='loading'?<p role="status">Finding your options…</p>:result.status==='error'?<p role="alert">These options could not load. Try refreshing the view.</p>:result.rows.length?<label className="travel-field">Choose a synthetic fare<select aria-label="Choose a synthetic fare" value={selected} onChange={event=>{
  const row=result.rows.find(item=>item.id===event.target.value)
  if(row)dispatch({kind:'select',artifactId:result.state.artifactId,fareId:row.id,selected:true})
  else if(selected)dispatch({kind:'select',artifactId:result.state.artifactId,fareId:selected,selected:false})
 }}><option value="">No fare selected</option>{result.rows.map(row=><option key={row.id} value={row.id}>{cityLabel(row.mode)} · {carrierLabel(row,result.services.bridge,result.datasetId)} · {departure(row.departureMinutes)} · {duration(row.durationMinutes)} · {money(row.priceCents)}</option>)}</select></label>:<p role="status">No options match. Try another mode, date, or price limit.</p>}<small>Synthetic fares per passenger</small></section>
}
export function PriceCalendar(props:WidgetProps) {
 const result=useTravelQuery(props.artifactRef,props.datasetRef,(state,id)=>({version:1,sources:[{datasetRef:id,alias:'f'}],where:filterPredicate(state,false),groupBy:['serviceDate'],metrics:[{as:'minimum',op:'min',field:'priceCents'},{as:'count',op:'count'}],orderBy:[{field:'serviceDate',direction:'asc'}],limit:30}));const dispatch=useTravelAction(props.artifactRef)
 const [dateError,setDateError]=useState('')
 const origin=result.datasetId?result.services.bridge.getManifest(result.datasetId).coverage.originIds[0]??'':''
 const chooseDate=(date:string)=>{let dates:ReturnType<typeof tripDatesForLegDeparture>;try{dates=tripDatesForLegDeparture(result.services.state.get(result.state.artifactId),origin,date)}catch{setDateError('This departure would move the itinerary outside supported calendar dates.');return}dispatch({kind:'dates',artifactId:result.state.artifactId,dates});setDateError('')}
 if(result.status!=='ready')return <RequestNotice status={result.status} label="Date comparisons"/>
 return <section className="travel-panel"><h3>{props.title??'Find your best day'}</h3><div className="travel-calendar">{result.data?.rows.map(row=>typeof row.serviceDate==='string'&&typeof row.minimum==='number'?<button key={row.serviceDate} type="button" aria-pressed={legDate(result.state,origin)===row.serviceDate} onClick={()=>{if(typeof row.serviceDate==='string')chooseDate(row.serviceDate)}}><span>{new Date(`${row.serviceDate}T12:00:00`).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span><strong>{money(row.minimum)}</strong><small>{row.count} options</small></button>:null)}</div>{dateError&&<p role="alert">{dateError}</p>}{result.status==='ready'&&!result.data?.rows.length&&<p role="status">No options match. Try another mode, date, or price limit.</p>}</section>
}
export function Comparison(props:WidgetProps) {
 const result=useTravelQuery(props.artifactRef,props.datasetRef,(state,id)=>({version:1,sources:[{datasetRef:id,alias:'f'}],where:filterPredicate(state),groupBy:['mode'],metrics:[{as:'minimum',op:'min',field:'priceCents'},{as:'fastest',op:'min',field:'durationMinutes'},{as:'count',op:'count'}],limit:4}));
 if(result.status!=='ready')return <RequestNotice status={result.status} label="Mode comparisons"/>
 return <section className="travel-panel"><h3>{props.title??'Compare your way there'}</h3><div className="travel-table-wrap"><table><caption>Synthetic fares per passenger</caption><thead><tr><th scope="col">Mode</th><th scope="col">From</th><th scope="col">Fastest</th><th scope="col">Options</th></tr></thead><tbody>{result.data?.rows.map(row=><tr key={String(row.mode)}><th scope="row">{cityLabel(String(row.mode))}</th><td>{typeof row.minimum==='number'?money(row.minimum):'–'}</td><td>{typeof row.fastest==='number'?duration(row.fastest):'–'}</td><td>{row.count}</td></tr>)}</tbody></table></div>{result.status==='ready'&&!result.data?.rows.length&&<p role="status">No options match. Try another mode, date, or price limit.</p>}</section>
}
type SelectedFactsResult={identity:string;status:'loading'|'error'}|{identity:string;status:'ready';facts:BoundedFareFact[]}
function selectedFactsIdentity(services:Pick<TravelServices,'state'|'bridge'>,id:ArtifactId){
 const current=services.state.get(id)
 return JSON.stringify({artifactId:id,selected:current.selectedFareIds,sources:current.datasetRefs.map(ref=>{const manifest=services.bridge.getManifest(ref);return{datasetId:ref,revision:manifest.revision,sourceVersion:manifest.source.sourceVersion}})})
}
function useSelectedFacts(ref:string){
 const {services,state}=useArtifact(ref),refs=JSON.stringify(state.datasetRefs)
 const subscribe=useMemo(()=>(listener:()=>void)=>{const releases=state.datasetRefs.map(id=>services.bridge.subscribe(id,listener));return()=>releases.forEach(release=>release())},[services.bridge.subscribe,refs])
 const read=()=>selectedFactsIdentity(services,state.artifactId)
 const identity=useSyncExternalStore(subscribe,read,read)
 const [result,setResult]=useState<SelectedFactsResult>({identity,status:'loading'})
 useEffect(()=>{let active=true;setResult({identity,status:'loading'});Promise.all(state.selectedFareIds.map(id=>services.bridge.lookupFare(id,[]))).then(facts=>{if(active&&selectedFactsIdentity(services,state.artifactId)===identity)setResult({identity,status:'ready',facts})}).catch(()=>{if(active&&selectedFactsIdentity(services,state.artifactId)===identity)setResult({identity,status:'error'})});return()=>{active=false}},[services.bridge.lookupFare,services.bridge.getManifest,services.state,state.artifactId,identity])
 const current:SelectedFactsResult=result.identity===identity?result:{identity,status:'loading'}
 return{services,state,result:current}
}
export function Total(props:WidgetProps) {
 const {services,state,result}=useSelectedFacts(props.artifactRef)
 const passengers=state.datasetRefs[0]?services.bridge.getManifest(state.datasetRefs[0]).coverage.passengers:1
 return <section className="travel-total"><span>{props.title??'Synthetic total'}</span>{result.status!=='ready'?<RequestNotice status={result.status} label="Selected fares"/>:<><strong>{money(result.facts.reduce((sum,f)=>sum+f.priceCents,0)*passengers)}</strong><p>{passengers} passenger{passengers===1?'':'s'}</p></>}<small>Synthetic total, including demo fees. No booking is available.</small></section>
}
export function SelectedItinerary(props:WidgetProps) {
 const {result}=useSelectedFacts(props.artifactRef)
 return <section className="travel-panel" aria-label="Selected itinerary"><h3>{props.title??'Selected fares'}</h3>{result.status!=='ready'?<RequestNotice status={result.status} label="Selected fares"/>:result.facts.length?<ol className="travel-timeline">{result.facts.map(fact=><li key={fact.id}><strong>{cityLabel(fact.originId)} → {cityLabel(fact.destinationId)}</strong><span>{fact.serviceDate} · {cityLabel(fact.mode)} · {money(fact.priceCents)} per passenger</span></li>)}</ol>:<p role="status">Choose a fare to see your itinerary.</p>}</section>
}
export function ComparisonTable(props:WidgetProps) {
 const result=useTravelQuery(props.artifactRef,props.datasetRef,(state,id)=>({version:1,sources:[{datasetRef:id,alias:'f'}],where:filterPredicate(state),project:['id','mode','carrierId','carrierName','serviceDate','departureMinutes','durationMinutes','priceCents'],orderBy:[state.sort,{field:'departureMinutes',direction:'asc'},{field:'id',direction:'asc'}],limit:20}))
 if(result.status!=='ready')return <RequestNotice status={result.status} label="Fare comparisons"/>
 const rows=result.data?.rows??[]
 const first=rows[0]
 const columns=first&&'priceCents' in first?['mode','carrierName','serviceDate','departureMinutes','durationMinutes','priceCents']:Object.keys(first??{}).filter(field=>field!=='id')
 const labels:Record<string,string>={mode:'Mode',carrierId:'Carrier',carrierName:'Carrier',serviceDate:'Date',departureMinutes:'Departure',durationMinutes:'Duration',priceCents:'Fare',minimum:'From',fastest:'Fastest',count:'Options'}
 const display=(field:string,value:unknown,row:Record<string,unknown>)=>field==='carrierId'&&typeof value==='string'?carrierLabel({carrierId:value},result.services.bridge,result.datasetId):field==='carrierName'&&typeof row.carrierId==='string'?carrierLabel({carrierId:row.carrierId,carrierName:typeof value==='string'?value:undefined},result.services.bridge,result.datasetId):typeof value==='number'?['priceCents','minimum'].includes(field)?money(value):['durationMinutes','fastest'].includes(field)?duration(value):field==='departureMinutes'?departure(value):String(value):typeof value==='string'?['mode','carrierId'].includes(field)?cityLabel(value):value:'–'
 return <section className="travel-panel"><h3>{props.title??'Compare fares'}</h3><div className="travel-table-wrap"><table aria-label="Compare fares"><caption>Synthetic fares per passenger</caption><thead><tr>{columns.map(field=><th scope="col" key={field}>{labels[field]??cityLabel(field)}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={typeof row.id==='string'?row.id:index}>{columns.map((field,column)=>column===0?<th key={field} scope="row">{display(field,row[field],row)}</th>:<td key={field}>{display(field,row[field],row)}</td>)}</tr>)}</tbody></table></div>{result.status==='ready'&&!rows.length&&<p role="status">No options match. Try another mode, date, or price limit.</p>}</section>
}
export function ModeBreakdown(props:WidgetProps) {
 const result=useTravelQuery(props.artifactRef,props.datasetRef,(state,id)=>({version:1,sources:[{datasetRef:id,alias:'f'}],where:filterPredicate(state),groupBy:['mode'],metrics:[{as:'count',op:'count'}],limit:4}))
 if(result.status!=='ready')return <RequestNotice status={result.status} label="Mode counts"/>
 return <section className="travel-panel"><h3>{props.title??'Options by mode'}</h3><div className="travel-table-wrap"><table aria-label="Options by mode"><thead><tr><th scope="col">Mode</th><th scope="col">Options</th></tr></thead><tbody>{result.data?.rows.map(row=><tr key={String(row.mode)}><th scope="row">{cityLabel(String(row.mode))}</th><td>{row.count}</td></tr>)}</tbody></table></div>{result.status==='ready'&&!result.data?.rows.length&&<p role="status">No options match. Try another mode, date, or price limit.</p>}</section>
}

export function Coverage(props:WidgetProps) {
 const {services,state}=useArtifact(props.artifactRef),refs=JSON.stringify(state.datasetRefs)
 const subscribe=useMemo(()=>(listener:()=>void)=>{const releases=state.datasetRefs.map(id=>services.bridge.subscribe(id,listener));return()=>releases.forEach(release=>release())},[services.bridge.subscribe,refs])
 const read=()=>JSON.stringify(state.datasetRefs.map(id=>services.bridge.getManifest(id).revision))
 useSyncExternalStore(subscribe,read,read)
 const manifests=state.datasetRefs.map(id=>services.bridge.getManifest(id))
 return <section className="travel-notice" role="status" aria-atomic="true"><strong>{props.title??'Loaded travel data'}</strong>{!manifests.length&&<p>No travel data is loaded. Add stops in your next message.</p>}{manifests.map(m=><p key={m.datasetId}>{m.coverage.complete?'Complete':'Partial'} · {cityLabel(m.coverage.originIds.join(', '))} → {cityLabel(m.coverage.destinationIds.join(', '))} · {m.coverage.dateWindow.from} to {m.coverage.dateWindow.to} · {m.rowCount.toLocaleString()} synthetic fares</p>)}</section>
}
function useRouteStops(ref:string) {
 const {services,state}=useArtifact(ref)
 const legs=state.datasetRefs.map(id=>services.bridge.getManifest(id).coverage)
 const origin=legs[0]?.originIds[0]
 if(state.stays.length)return origin&&state.stays[0]?.cityId!==origin?[{cityId:origin,nights:0},...state.stays]:state.stays
 const distinct=legs.filter((leg,index)=>legs.findIndex(other=>other.originIds[0]===leg.originIds[0]&&other.destinationIds[0]===leg.destinationIds[0])===index)
 const cities=distinct.length?[distinct[0].originIds[0],...distinct.map(leg=>leg.destinationIds[0])].filter((city):city is string=>typeof city==='string'):[]
 return cities.map(cityId=>({cityId,nights:0}))
}
export function CitySequence(props:WidgetProps) {
 const stops=useRouteStops(props.artifactRef)
 return <section className="travel-panel"><h3>{props.title??'Your stops'}</h3>{!stops.length&&<p role="status">Add stops in your next message to see your route.</p>}<ol className="travel-timeline" aria-label="Travel stops">{stops.map((stop,index)=><li key={`${stop.cityId}-${index}`}><strong>{cityLabel(stop.cityId)}</strong>{stop.nights>0&&<span>{stop.nights} night{stop.nights===1?'':'s'}</span>}</li>)}</ol></section>
}
export function Route(props:WidgetProps) {
 const cities=useRouteStops(props.artifactRef).map(stop=>stop.cityId)
 return <section className="travel-panel"><h3>{props.title??'Your route'}</h3>{!cities.length?<p role="status">Add stops in your next message to see your route.</p>:<><svg viewBox="0 0 600 135" role="img" aria-label={`Schematic route: ${cities.map(cityLabel).join(' to ')}`}><path d="M45 55H555" stroke="var(--travel-blue)" strokeWidth="3" fill="none"/>{cities.map((city,i)=>{const x=45+i*510/Math.max(1,cities.length-1);return <g key={`${city}-${i}`}><circle cx={x} cy="55" r="9" fill="var(--travel-blue)"/><text x={x} y="92" textAnchor="middle">{cityLabel(city)}</text></g>})}</svg><small>Schematic route, not a geographic map.</small></>}</section>
}
export function Timeline(props:WidgetProps) {
 const result=useFareRows(props.artifactRef,props.datasetRef);const selected=useSelectedFacts(props.artifactRef)
 const status=selected.state.selectedFareIds.length?selected.result.status:result.status
 if(status!=='ready')return <RequestNotice status={status} label="Journey details"/>
 const rows=selected.result.status==='ready'&&selected.result.facts.length?selected.result.facts:result.rows.slice(0,5)
 return <section className="travel-panel"><h3>{props.title??'Journey timeline'}</h3><RequestNotice status="ready" empty={!rows.length}/><ol className="travel-timeline">{rows.map(row=><li key={row.id}><span>{row.serviceDate} · {departure(row.departureMinutes)}</span><strong>{cityLabel(row.originId)} → {cityLabel(row.destinationId)}</strong><p>{cityLabel(row.mode)} · {duration(row.durationMinutes)} · {money(row.priceCents)}</p></li>)}</ol></section>
}
export function Plot(props:WidgetProps) {
 const result=useFareRows(props.artifactRef,props.datasetRef);const maxPrice=Math.max(1,...result.rows.map(r=>r.priceCents));const maxDuration=Math.max(1,...result.rows.map(r=>r.durationMinutes));const dispatch=useTravelAction(props.artifactRef)
 if(result.status!=='ready')return <RequestNotice status={result.status} label="Journey comparisons"/>
 return <section className="travel-panel"><h3>{props.title??'Price and journey time'}</h3><RequestNotice status="ready" empty={!result.rows.length}/><p className="travel-caption">Left is faster · lower is cheaper · choose a point to select</p><svg viewBox="0 0 450 260" role="group" aria-label="Duration and price comparison"><path d="M45 15V225H440" fill="none" stroke="currentColor"/>{result.rows.slice(0,50).map(row=><circle key={row.id} cx={45+row.durationMinutes/maxDuration*370} cy={220-row.priceCents/maxPrice*180} r="7" className={`travel-dot travel-mode-${row.mode}`} role="button" tabIndex={0} aria-label={`${cityLabel(row.mode)} ${duration(row.durationMinutes)} ${money(row.priceCents)}`} onClick={()=>dispatch({kind:'select',artifactId:result.state.artifactId,fareId:row.id,selected:true})} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();dispatch({kind:'select',artifactId:result.state.artifactId,fareId:row.id,selected:true})}}}><title>{carrierLabel(row,result.services.bridge,result.datasetId)}</title></circle>)}<text x="220" y="253">Journey duration</text></svg></section>
}
export function CheapestFastest(props:WidgetProps) {
 const cheapest=useTravelQuery(props.artifactRef,props.datasetRef,(state,id)=>({version:1,sources:[{datasetRef:id,alias:'f'}],where:filterPredicate(state),orderBy:[{field:'priceCents',direction:'asc'}],limit:1}));const fastest=useTravelQuery(props.artifactRef,props.datasetRef,(state,id)=>({version:1,sources:[{datasetRef:id,alias:'f'}],where:filterPredicate(state),orderBy:[{field:'durationMinutes',direction:'asc'}],limit:1}))
 const status=cheapest.status==='error'||fastest.status==='error'?'error':cheapest.status==='loading'||fastest.status==='loading'?'loading':'ready'
 if(status!=='ready')return <RequestNotice status={status} label="Fare comparisons"/>
 return <section className="travel-panel"><h3>{props.title??'Cheapest and fastest'}</h3><RequestNotice status="ready" empty={!cheapest.data?.rows.length&&!fastest.data?.rows.length}/><div className="travel-responsivegrid">{[{name:'Lowest fare',row:cheapest.data?.rows[0]},{name:'Fastest journey',row:fastest.data?.rows[0]}].map(({name,row})=><div className="travel-insight" key={name}><span>{name}</span><strong>{row&&typeof row.priceCents==='number'?money(row.priceCents):'No match'}</strong><p>{row&&typeof row.durationMinutes==='number'?duration(row.durationMinutes):''} {row?cityLabel(String(row.mode)):''}</p></div>)}</div></section>
}

export function SelectedFareCount(props:WidgetProps) {
 const {state}=useArtifact(props.artifactRef)
 const count=state.selectedFareIds.length
 return <p className="travel-caption" role="status" aria-label="Selected fares" aria-atomic="true">{count} selected fare{count===1?'':'s'}</p>
}
