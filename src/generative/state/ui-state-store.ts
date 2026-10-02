import { ArtifactUIStateSchema, CompactArtifactSnapshotSchema, UIStateRevisionSchema, CATALOG_VERSION, type ArtifactId, type ArtifactUIState, type UIStateStore, type UICommand, type DispatchResult } from '../contracts'

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
    const state = ArtifactUIStateSchema.parse({ revision:0,datasetRefs:[],filters:{modes:[],carrierIds:[],directOnly:false},dates:{start:now().slice(0,10)},stays:[],modesByLeg:{},sort:{field:'priceCents',direction:'asc'},selectedFareIds:[],pending:[],lastInteractionAt:now(),...defaults,artifactId })
    states.set(artifactId,state)
    listeners.get(artifactId)?.forEach(listener => listener())
  }
  function dispatch(command: UICommand): DispatchResult {
    const current = get(command.artifactId)
    if (command.expectedRevision !== undefined && command.expectedRevision !== current.revision) return {status:'stale',revision:current.revision}
    let patch: Partial<ArtifactUIState>
    switch (command.kind) {
      case 'filters': patch={filters:command.filters};break
      case 'dates': patch={dates:command.dates};break
      case 'sort': patch={sort:command.sort};break
      case 'stays': patch={stays:command.stays};break
      case 'modesByLeg': patch={modesByLeg:command.modesByLeg};break
      case 'datasets': patch={datasetRefs:command.datasetRefs};break
      case 'select': patch={selectedFareIds:command.selected ? [...new Set([...current.selectedFareIds,command.fareId])] : current.selectedFareIds.filter(id => id !== command.fareId)};break
      default: {const unreachable: never=command;throw new Error(`Unknown command ${String(unreachable)}`)}
    }
    const next = ArtifactUIStateSchema.parse({...current,...patch,revision:UIStateRevisionSchema.parse(current.revision+1),lastInteractionAt:now()})
    states.set(command.artifactId,next)
    listeners.get(command.artifactId)?.forEach(listener => listener())
    return {status:'applied',revision:next.revision}
  }
  return {get,initializeMissing,dispatch,
    subscribe(id,listener) {const set=listeners.get(id)??new Set<()=>void>();set.add(listener);listeners.set(id,set);return()=>{set.delete(listener)}},
    exportSnapshot(id) {const state=get(id);return CompactArtifactSnapshotSchema.parse({artifactId:state.artifactId,revision:state.revision,datasetRefs:state.datasetRefs,selectedFareIds:state.selectedFareIds,filters:state.filters,dates:state.dates,stays:state.stays,modesByLeg:state.modesByLeg,pending:state.pending,sort:state.sort,layoutSummary:'Travel artifact with local dates, filters and selections.',catalogVersion:CATALOG_VERSION})},
  }
}
