import {filterPredicate} from '../state/filter-predicate'
export {filterPredicate} from '../state/filter-predicate'
import type { QueryFareSelectionScope } from '../state/action-router'
import { legState, legRequest, resolveBoundDatasetId } from '../state/leg-bindings'
export { legKey, legState, resolveBoundDatasetId } from '../state/leg-bindings'
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ArtifactIdSchema, DatasetIdSchema, FareRowSchema, parseQuery, type ArtifactUIState, type BoundedQueryResult, type FareDataBridge, type FareRow, type QueryIR, type UICommand, type UIStateStore, type DispatchResult } from '../contracts'

export type TravelServices = { bridge: FareDataBridge; state: UIStateStore; activate: (id: string) => void; activeId: () => string | undefined; artifactIds?:()=>ReturnType<typeof ArtifactIdSchema.parse>[]; subscribeActive?: (listener:()=>void)=>()=>void; dispatch?: ((command:UICommand)=>DispatchResult)&{retry?:(id:ReturnType<typeof ArtifactIdSchema.parse>)=>Promise<void>;selectFromQuery?:(command:Extract<UICommand,{kind:'select'}>,scope:QueryFareSelectionScope)=>DispatchResult}; record?: (input: unknown) => void; queryForView?:()=>QueryIR; whenIdle?: (id:ReturnType<typeof ArtifactIdSchema.parse>)=>Promise<void>; createArtifact?: () => ReturnType<typeof ArtifactIdSchema.parse> }
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
export function useTravelQuery(ref: string, datasetRef: string | undefined, make: (state: ArtifactUIState, datasetId: ReturnType<typeof DatasetIdSchema.parse>) => QueryIR) {
  const { services, state } = useArtifact(ref)
  const requestedId = datasetRef ? DatasetIdSchema.parse(datasetRef) : state.datasetRefs[0]
  const datasetId=requestedId?resolveBoundDatasetId(state,services.bridge,requestedId):undefined
  const manifest=datasetId?services.bridge.getManifest(datasetId):undefined
  const requested=manifest?legRequest(state,manifest.coverage):undefined
  const covered=!!manifest&&!!requested&&requested.passengers===manifest.coverage.passengers&&requested.dateWindow.from>=manifest.coverage.dateWindow.from&&requested.dateWindow.to<=manifest.coverage.dateWindow.to&&requested.modes.every(mode=>manifest.coverage.modes.includes(mode))
  const [resourceRevision, refresh] = useState(0)
  useEffect(() => datasetId ? services.bridge.subscribe(datasetId, () => refresh(n => n + 1)) : undefined, [services.bridge, datasetId])
  let encoded=''
  try{if(datasetId)encoded=JSON.stringify(services.queryForView?.()??make(legState(state,services.bridge.getManifest(datasetId).coverage), datasetId))}catch{/* The effect exposes a bounded query error. */}
  const [result, setResult] = useState<{status:'loading'|'ready'|'error'; data?:BoundedQueryResult}>({status:'loading'})
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
        const current=services.queryForView?.()??make(legState(latest,services.bridge.getManifest(datasetId).coverage),datasetId)
        if(JSON.stringify(current)!==encoded||generations.some(source=>{const manifest=services.bridge.getManifest(source.datasetId);return manifest.revision!==source.revision||manifest.source.sourceVersion!==source.sourceVersion}))return
        setResult({status:'ready',data})
      }).catch(() => { if (!controller.signal.aborted) setResult({status:'error'}) })
    } catch { setResult({status:'error'}) }
    return () => controller.abort()
  }, [services, datasetId, encoded, state.artifactId, resourceRevision, covered])
  return { ...result, state, services, datasetId }
}
export function useFareRows(ref: string, datasetRef?: string) {
  const result = useTravelQuery(ref, datasetRef, (state, id) => ({ version:1, sources:[{datasetRef:id,alias:'fares'}], where:filterPredicate(state), project:FareRowSchema.keyof().options, orderBy:[state.sort,{field:'departureMinutes',direction:'asc'},{field:'id',direction:'asc'}],limit:100 }))
  const rows = useMemo(() => { const parsed: FareRow[]=[]; for (const row of result.data?.rows ?? []) { const valid=FareRowSchema.safeParse(row); if (valid.success) parsed.push(valid.data) } return parsed }, [result.data])
  return {...result,rows}
}
export const money = (cents:number) => new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(cents/100)
export const duration = (minutes:number) => `${Math.floor(minutes/60)}h ${minutes%60}m`
export const cityLabel = (id:string) => id.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
export const departure = (minutes:number) => `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`

export const carrierLabel=(row:Pick<FareRow,'carrierId'|'carrierName'>,bridge:FareDataBridge,datasetId?:ReturnType<typeof DatasetIdSchema.parse>)=>row.carrierName??bridge.getCarrierLabel?.(row.carrierId,datasetId)??`Synthetic carrier ${row.carrierId}`
