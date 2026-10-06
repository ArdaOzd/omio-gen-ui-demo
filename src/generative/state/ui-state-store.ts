import { ArtifactUIStateSchema, CompactArtifactSnapshotSchema, DateSchema, UIStateRevisionSchema, CATALOG_VERSION, type ArtifactId, type ArtifactUIState, type UIStateStore, type UICommand, type DispatchResult } from '../contracts'

const dayDelta = (from: string, to: string): number => (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000
const shiftDate = (date: string, days: number): string => DateSchema.parse(new Date(Date.parse(`${date}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10))

export function createUIStateStore(options: { now?: () => string } = {}): UIStateStore {
  const states = new Map<ArtifactId, ArtifactUIState>()
  const listeners = new Map<ArtifactId, Set<() => void>>()
  const now = options.now ?? (() => new Date().toISOString())
  function get(artifactId: ArtifactId): ArtifactUIState {
    const state = states.get(artifactId)
    if (!state) throw new Error('Unknown artifact')
    return structuredClone(state)
  }
  function initializeMissing(artifactId: ArtifactId, defaults: Partial<ArtifactUIState>): void {
    if (states.has(artifactId)) return
    const state = ArtifactUIStateSchema.parse({ revision:0,datasetRefs:[],filters:{modes:[],carrierIds:[],directOnly:false},dates:{start:now().slice(0,10)},citySequence:[],stays:[],modesByLeg:{},availableModesByLeg:{},requestedModesByLeg:{},displayWindowByLeg:{},sort:{field:'priceCents',direction:'asc'},sortByLeg:{},calendarDateByLeg:{},selectedFareIds:[],pending:[],lastInteractionAt:now(),...defaults,artifactId })
    states.set(artifactId,state)
    listeners.get(artifactId)?.forEach(listener => listener())
  }
  function dispatch(command: UICommand): DispatchResult {
    const current = get(command.artifactId)
    if (command.expectedRevision !== undefined && command.expectedRevision !== current.revision) return {status:'stale',revision:current.revision}
    let patch: Partial<ArtifactUIState>
    switch (command.kind) {
      case 'filters': patch={filters:command.filters};break
      case 'dates': {
        const startDelta=dayDelta(current.dates.start,command.dates.start)
        const endDelta=dayDelta(current.dates.end??current.dates.start,command.dates.end??command.dates.start)
        const displayWindowByLeg=Object.fromEntries(Object.entries(current.displayWindowByLeg).map(([key,window])=>[key,{from:shiftDate(window.from,startDelta),to:shiftDate(window.to,endDelta)}]))
        patch={dates:command.dates,displayWindowByLeg};break
      }
      case 'sort': patch={sort:command.sort};break
      case 'sortByLeg':patch={sortByLeg:command.sortByLeg};break
      case 'calendarDateByLeg':patch={calendarDateByLeg:command.calendarDateByLeg};break
      case 'stays': {
        const previousNights=new Map(current.stays.map(stay=>[stay.cityId,stay.nights]))
        const nextNights=new Map(command.stays.map(stay=>[stay.cityId,stay.nights]))
        const displayWindowByLeg={...current.displayWindowByLeg}
        let cumulativeDelta=0
        for(let index=1;index<current.citySequence.length-1;index++){
          const origin=current.citySequence[index]!
          const destination=current.citySequence[index+1]!
          cumulativeDelta+=(nextNights.get(origin)??0)-(previousNights.get(origin)??0)
          const key=`${origin}:${destination}`,window=displayWindowByLeg[key]
          if(window&&cumulativeDelta!==0)displayWindowByLeg[key]={from:shiftDate(window.from,cumulativeDelta),to:shiftDate(window.to,cumulativeDelta)}
        }
        patch={stays:command.stays,displayWindowByLeg};break
      }
      case 'route': {
        const legKeys=new Set(command.citySequence.slice(1).map((destination,index)=>`${command.citySequence[index]}:${destination}`))
        const destinations=new Set(command.citySequence.slice(1))
        const active=<T>(record:Record<string,T>):Record<string,T>=>Object.fromEntries(Object.entries(record).filter(([key])=>legKeys.has(key)))
        patch={citySequence:command.citySequence,stays:current.stays.filter(stay=>destinations.has(stay.cityId)),modesByLeg:active(current.modesByLeg),availableModesByLeg:active(current.availableModesByLeg),requestedModesByLeg:active(current.requestedModesByLeg),displayWindowByLeg:active(current.displayWindowByLeg),sortByLeg:active(current.sortByLeg),calendarDateByLeg:active(current.calendarDateByLeg)};break
      }
      case 'runtimeVariables': patch={runtimeVariables:command.runtimeVariables};break
      case 'modesByLeg': patch={modesByLeg:command.modesByLeg};break
      case 'availableModesByLeg':patch={availableModesByLeg:command.availableModesByLeg};break
      case 'requestedModesByLeg':patch={requestedModesByLeg:command.requestedModesByLeg};break
      case 'displayWindowByLeg':patch={displayWindowByLeg:command.displayWindowByLeg};break
      case 'datasets': patch={datasetRefs:command.datasetRefs};break
      case 'select': patch={selectedFareIds:command.selected ? [...new Set([...current.selectedFareIds,command.fareId])] : current.selectedFareIds.filter(id => id !== command.fareId)};break
      default: {const unreachable: never=command;throw new Error(`Unknown command ${String(unreachable)}`)}
    }
    const next = ArtifactUIStateSchema.parse({...current,...patch,revision:UIStateRevisionSchema.parse(current.revision+1),lastInteractionAt:now()})
    states.set(command.artifactId,next)
    listeners.get(command.artifactId)?.forEach(listener => listener())
    return {status:'applied',revision:next.revision}
  }
  return {get,initializeMissing,dispatch,getIds:()=>[...states.keys()],
    subscribe(id,listener) {const set=listeners.get(id)??new Set<()=>void>();set.add(listener);listeners.set(id,set);return()=>{set.delete(listener)}},
    exportSnapshot(id) {const state=get(id);return CompactArtifactSnapshotSchema.parse({artifactId:state.artifactId,revision:state.revision,datasetRefs:state.datasetRefs,selectedFareIds:state.selectedFareIds,filters:state.filters,dates:state.dates,citySequence:state.citySequence,stays:state.stays,modesByLeg:state.modesByLeg,availableModesByLeg:state.availableModesByLeg,requestedModesByLeg:state.requestedModesByLeg,displayWindowByLeg:state.displayWindowByLeg,pending:state.pending,sort:state.sort,sortByLeg:state.sortByLeg,calendarDateByLeg:state.calendarDateByLeg,runtimeVariables:state.runtimeVariables,legThresholds:[],componentBindings:[],layoutSummary:'Travel artifact with local dates, filters and selections.',catalogVersion:CATALOG_VERSION})},
  }
}
