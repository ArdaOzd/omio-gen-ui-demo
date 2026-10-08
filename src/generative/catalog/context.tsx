import {filterPredicate} from '../state/filter-predicate'
export {filterPredicate} from '../state/filter-predicate'
import type { CalendarDateSelectionScope,QueryFareSelectionScope } from '../state/action-router'
import { legKey, legState, legRequest, orderedLegResources, resolveBoundDatasetId } from '../state/leg-bindings'
import { scheduleLegs } from '../state/itinerary-schedule'
export { legKey, legState, resolveBoundDatasetId } from '../state/leg-bindings'
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ArtifactIdSchema, DatasetIdSchema, FareRowSchema, parseQuery, type ArtifactUIState, type BoundedQueryResult, type Coverage, type FareDataBridge, type FareRow, type QueryIR, type UICommand, type UIStateStore, type DispatchResult } from '../contracts'

export type TravelServices = { bridge: FareDataBridge; state: UIStateStore; activate: (id: string) => void; activeId: () => string | undefined; artifactIds?:()=>ReturnType<typeof ArtifactIdSchema.parse>[]; subscribeActive?: (listener:()=>void)=>()=>void; dispatch?: ((command:UICommand)=>DispatchResult)&{retry?:(id:ReturnType<typeof ArtifactIdSchema.parse>)=>Promise<void>;selectFromQuery?:(command:Extract<UICommand,{kind:'select'}>,scope:QueryFareSelectionScope)=>DispatchResult;calendarDateFromQuery?:(command:Extract<UICommand,{kind:'calendarDateByLeg'}>,scope:CalendarDateSelectionScope)=>DispatchResult}; record?: (input: unknown) => void; queryForView?:()=>QueryIR; whenIdle?: (id:ReturnType<typeof ArtifactIdSchema.parse>)=>Promise<void>; createArtifact?: () => ReturnType<typeof ArtifactIdSchema.parse> }
const TravelContext = createContext<TravelServices | null>(null)
export function TravelProvider({ services, children }: { services: TravelServices; children: ReactNode }) { return <TravelContext.Provider value={services}>{children}</TravelContext.Provider> }
export function useTravelServices() { const services = useContext(TravelContext); if (!services) throw new Error('Travel provider missing'); return services }
export function useArtifact(ref: string) {
  const services = useTravelServices()
  const id = ArtifactIdSchema.parse(ref)
  const revision = useSyncExternalStore(listener => services.state.subscribe(id, listener), () => services.state.get(id).revision, () => services.state.get(id).revision)
  const state = useMemo(() => services.state.get(id), [services.state,id,revision])
  return { services, state }
}
export function useTravelAction(ref: string) {
  const { services, state } = useArtifact(ref)
  return (command: UICommand) => { services.activate(ref); return (services.dispatch??services.state.dispatch)({ ...command, artifactId: state.artifactId, expectedRevision: services.state.get(state.artifactId).revision }) }
}
export function useItineraryPlan(ref:string){
  const {services,state}=useArtifact(ref)
  const identity=JSON.stringify(state.selectedFareIds)
  const [selection,setSelection]=useState<{identity:string;status:'loading'|'ready'|'error';facts:Awaited<ReturnType<FareDataBridge['lookupFare']>>[]}>({identity,status:'loading',facts:[]})
  useEffect(()=>{let active=true;setSelection({identity,status:'loading',facts:[]});Promise.all(state.selectedFareIds.map(id=>services.bridge.lookupFare(id,[]))).then(facts=>{if(active)setSelection({identity,status:'ready',facts})}).catch(()=>{if(active)setSelection({identity,status:'error',facts:[]})});return()=>{active=false}},[identity,services.bridge])
  const current=selection.identity===identity?selection:{identity,status:'loading' as const,facts:[]}
  const resources=orderedLegResources(state,services.bridge)
  const schedule=scheduleLegs(state,resources.map(resource=>resource.coverage),current.facts)
  const legs=resources.flatMap(resource=>{const leg=schedule.find(item=>item.key===resource.key);return leg?[{...resource,...leg}]:[]})
  return{services,state,status:current.status,facts:current.facts,legs}
}
export function useTravelQuery(ref: string, datasetRef: string | undefined, make: (state: ArtifactUIState, datasetId: ReturnType<typeof DatasetIdSchema.parse>, coverage: Coverage) => QueryIR) {
  const plan=useItineraryPlan(ref),{ services, state }=plan
  const requestedId = datasetRef ? DatasetIdSchema.parse(datasetRef) : state.datasetRefs[0]
  const datasetId=requestedId?resolveBoundDatasetId(state,services.bridge,requestedId,plan.facts):undefined
  const manifest=datasetId?services.bridge.getManifest(datasetId):undefined
  const requested=manifest?legRequest(state,manifest.coverage,plan.facts):undefined
  const covered=!!manifest&&!!requested&&requested.passengers===manifest.coverage.passengers&&requested.dateWindow.from>=manifest.coverage.dateWindow.from&&requested.dateWindow.to<=manifest.coverage.dateWindow.to&&requested.modes.every(mode=>manifest.coverage.modes.includes(mode))
  const [resourceRevision, refresh] = useState(0)
  useEffect(() => datasetId ? services.bridge.subscribe(datasetId, () => refresh(n => n + 1)) : undefined, [services.bridge, datasetId])
  let encoded=''
  try{if(datasetId){const coverage=services.bridge.getManifest(datasetId).coverage;encoded=JSON.stringify(services.queryForView?.()??make(legState(state,coverage,plan.facts),datasetId,coverage))}}catch{/* The effect exposes a bounded query error. */}
  const queryKey=encoded
  const [result, setResult] = useState<{status:'loading'|'ready'|'error'; data?:BoundedQueryResult;queryKey?:string}>({status:'loading'})
  useEffect(() => {
    if (!datasetId) { setResult({status:'error'}); return }
    if (!covered) { setResult({status:'loading'}); return }
    const controller = new AbortController()
    setResult({status:'loading'})
    try {
      const raw=JSON.parse(encoded)
      const query = parseQuery(raw, raw.sources.map((source:{datasetRef:string})=>services.bridge.getManifest(DatasetIdSchema.parse(source.datasetRef))))
      const generations=query.sources.map(source=>{const current=services.bridge.getManifest(source.datasetRef);return{datasetId:source.datasetRef,revision:current.revision,sourceVersion:current.source.sourceVersion}})
      services.bridge.query(query, controller.signal).then(data => {
        if(controller.signal.aborted)return
        const latest=services.state.get(state.artifactId)
        const coverage=services.bridge.getManifest(datasetId).coverage;const current=services.queryForView?.()??make(legState(latest,coverage,plan.facts),datasetId,coverage)
        if(JSON.stringify(current)!==encoded||generations.some(source=>{const manifest=services.bridge.getManifest(source.datasetId);return manifest.revision!==source.revision||manifest.source.sourceVersion!==source.sourceVersion}))return
        setResult({status:'ready',data,queryKey})
      }).catch(() => { if (!controller.signal.aborted) setResult({status:'error'}) })
    } catch { setResult({status:'error'}) }
    return () => controller.abort()
  }, [services, datasetId, encoded, queryKey, state.artifactId, resourceRevision, covered])
  const coherent=result.status==='ready'&&result.queryKey!==queryKey?{status:'loading' as const}:result
  const currentQueryKey=()=>{
    if(!datasetId)return''
    const latest=services.state.get(state.artifactId),coverage=services.bridge.getManifest(datasetId).coverage
    return JSON.stringify(services.queryForView?.()??make(legState(latest,coverage,plan.facts),datasetId,coverage))
  }
  return { ...coherent, state, services, datasetId, facts:plan.facts,queryKey,currentQueryKey }
}
export function useFareRows(ref: string, datasetRef?: string) {
  const result = useTravelQuery(ref, datasetRef, (state, id) => ({ version:1, sources:[{datasetRef:id,alias:'fares'}], where:filterPredicate(state), project:FareRowSchema.keyof().options, orderBy:[state.sort,{field:'departureMinutes',direction:'asc'},{field:'id',direction:'asc'}],limit:100 }))
  const rows = useMemo(() => { const parsed: FareRow[]=[]; for (const row of result.data?.rows ?? []) { const valid=FareRowSchema.safeParse(row); if (valid.success) parsed.push(valid.data) } return parsed }, [result.data])
  return {...result,rows}
}
function parsedFareRows(result: ReturnType<typeof useTravelQuery>): FareRow[] {
  const parsed: FareRow[]=[]
  for (const row of result.data?.rows ?? []) { const valid=FareRowSchema.safeParse(row); if(valid.success)parsed.push(valid.data) }
  return parsed
}
export function useFareRowsForDate(ref:string,datasetRef:string|undefined,date:string){
 const result=useTravelQuery(ref,datasetRef,(state,id,coverage)=>{const filtered=filterPredicate(state),day={field:'serviceDate' as const,op:'eq' as const,value:date},sort=plannerSort(state,coverage);return{version:1,sources:[{datasetRef:id,alias:'fares'}],where:filtered&&'all'in filtered?{all:[...filtered.all,day]}:filtered?{all:[filtered,day]}:day,project:FareRowSchema.keyof().options,orderBy:[sort,{field:'departureMinutes',direction:'asc'},{field:'id',direction:'asc'}],limit:100}})
 const rows=useMemo(()=>parsedFareRows(result),[result.data])
 return{...result,rows}
}
export function useFareDayRepresentatives(ref:string,datasetRef?:string){
 const result=useTravelQuery(ref,datasetRef,(state,id,coverage)=>{const sort=calendarSort(state,coverage);return{version:1,sources:[{datasetRef:id,alias:'fares'}],where:filterPredicate(state),groupBy:['serviceDate'],project:FareRowSchema.keyof().options,groupTop:{by:sort.field,direction:sort.direction},orderBy:[{field:'serviceDate',direction:'asc'}],limit:62}})
 const rows=useMemo(()=>parsedFareRows(result),[result.data])
  return{...result,rows}
}
const chronologicalLegSort:ArtifactUIState['sort']={field:'departureMinutes',direction:'asc'}
const cheapestCalendarSort:ArtifactUIState['sort']={field:'priceCents',direction:'asc'}
const fastestCalendarSort:ArtifactUIState['sort']={field:'durationMinutes',direction:'asc'}
function plannerSort(state:ArtifactUIState,coverage:Coverage):ArtifactUIState['sort']{const key=legKey(coverage);return key?state.sortByLeg[key]??chronologicalLegSort:chronologicalLegSort}
function calendarSort(state:ArtifactUIState,coverage:Coverage):ArtifactUIState['sort']{const key=legKey(coverage),sort=key?state.sortByLeg[key]:undefined;return sort?.field==='durationMinutes'?fastestCalendarSort:cheapestCalendarSort}
export function useLegFareRows(ref:string,datasetRef?:string){
 const result=useTravelQuery(ref,datasetRef,(state,id,coverage)=>{const sort=plannerSort(state,coverage),orderBy:NonNullable<QueryIR['orderBy']>=sort.field==='departureMinutes'&&sort.direction==='asc'?[{field:'serviceDate',direction:'asc'},{field:'departureMinutes',direction:'asc'},{field:'id',direction:'asc'}]:[sort,{field:'serviceDate',direction:'asc'},{field:'departureMinutes',direction:'asc'}];return{version:1,sources:[{datasetRef:id,alias:'fares'}],where:filterPredicate(state),project:FareRowSchema.keyof().options,orderBy,limit:100}})
 const rows=useMemo(()=>parsedFareRows(result),[result.data])
 return{...result,rows}
}
export const money = (cents:number) => new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(cents/100)
export const duration = (minutes:number) => `${Math.floor(minutes/60)}h ${minutes%60}m`
export const cityLabel = (id:string) => id.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
export const departure = (minutes:number) => `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`

export const carrierLabel=(row:Pick<FareRow,'carrierId'|'carrierName'>,bridge:FareDataBridge,datasetId?:ReturnType<typeof DatasetIdSchema.parse>)=>row.carrierName??bridge.getCarrierLabel?.(row.carrierId,datasetId)??`Synthetic carrier ${row.carrierId}`
