import { DateSchema, type ArtifactUIState, type BoundedFareFact, type DatasetId, type TransportMode } from '../contracts'
import type { FareScope, FareScopeManifest, ResourceKey } from '../contracts/query-groups'
import type { ServerFareDataBridge } from '../data/fare-data-bridge'
import { fallbackLegDate, legThreshold } from './itinerary-schedule'

export function legKey(coverage: Pick<FareScope, 'originId' | 'destinationId'>): string {
  return `${coverage.originId}:${coverage.destinationId}`
}

export function earliestDepartureInWindow(window:FareScope['dateWindow'],threshold:FareScope['earliestDeparture']):FareScope['earliestDeparture']{
  if(threshold.date<window.from)return{date:window.from,minutes:0}
  if(threshold.date>window.to)return{date:window.to,minutes:1439}
  return{date:threshold.date,minutes:threshold.minutes}
}

export type LegResource = { key: string; datasetId: DatasetId; resourceKey: ResourceKey; coverage: FareScope; manifest: FareScopeManifest }

export function availableModes(manifest: Pick<FareScopeManifest, 'availableModes'>): TransportMode[] {
  return [...manifest.availableModes]
}

export function manifestCovers(manifest: FareScopeManifest, request: FareScope): boolean {
  const coverage = manifest.coverage
  const available = manifest.availableDateWindow
  return coverage.originId === request.originId
    && coverage.destinationId === request.destinationId
    && coverage.passengers === request.passengers
    && coverage.earliestDeparture.date === request.earliestDeparture.date
    && coverage.earliestDeparture.minutes === request.earliestDeparture.minutes
    && available !== null
    && request.dateWindow.from >= available.from
    && request.dateWindow.to <= available.to
}

export function orderedLegResources(state: ArtifactUIState, bridge: ServerFareDataBridge): LegResource[] {
  const resources = state.datasetRefs.flatMap(datasetId => {
    const binding = bridge.findBinding(datasetId)
    if (!binding) return []
    return [{ key: legKey(binding.manifest.coverage), datasetId, resourceKey: binding.resourceKey, coverage: binding.manifest.coverage, manifest: binding.manifest }]
  })
  const latest = new Map(resources.map(resource => [resource.key, resource]))
  const first = resources[0]?.coverage.originId
  const route = state.citySequence.length > 1 ? state.citySequence : [first, ...state.stays.map(stay => stay.cityId)]
  const stops = route.filter((city, index, all): city is string => !!city && (index === 0 || city !== all[index - 1]))
  if (stops.length > 1) {
    const ordered = stops.slice(1).flatMap((destination, index) => {
      const resource = latest.get(`${stops[index]}:${destination}`)
      return resource ? [resource] : []
    })
    if (state.citySequence.length > 1) return ordered.length === stops.length - 1 ? ordered : []
    if (ordered.length) return ordered
  }
  const seen = new Set<string>()
  return resources.flatMap(resource => {
    if (seen.has(resource.key)) return []
    seen.add(resource.key)
    return [latest.get(resource.key) ?? resource]
  })
}

export function legDate(state: ArtifactUIState, originId: string, value = state.dates.start): string {
  return fallbackLegDate({ ...state, dates: { start: value } }, originId)
}

export function tripDatesForLegDeparture(state: ArtifactUIState, originId: string, departureDate: string): ArtifactUIState['dates'] {
  const shift = Date.parse(departureDate) - Date.parse(legDate(state, originId))
  const shifted = (value: string) => DateSchema.parse(new Date(Date.parse(value) + shift).toISOString().slice(0, 10))
  return { start: shifted(state.dates.start), ...(state.dates.end ? { end: shifted(state.dates.end) } : {}) }
}

export function legRequest(state: ArtifactUIState, coverage: FareScope, selectedFacts: readonly BoundedFareFact[] = []): FareScope {
  const key = legKey(coverage)
  const threshold = legThreshold(state, { originIds: [coverage.originId], destinationIds: [coverage.destinationId] }, selectedFacts)
  const visible = state.displayWindowByLeg[key]
  const fallbackTo = visible?.to ?? (state.dates.end ? legDate(state, coverage.originId, state.dates.end) : threshold.date)
  const requestedFrom = visible?.from && visible.from > threshold.date ? visible.from : threshold.date
  const from = requestedFrom > fallbackTo ? fallbackTo : requestedFrom
  const dateWindow={from,to:fallbackTo}
  return { ...coverage, dateWindow, earliestDeparture:earliestDepartureInWindow(dateWindow,threshold) }
}

export function hasLoadedItineraryCoverage(state: ArtifactUIState, bridge: ServerFareDataBridge, selectedFacts: readonly BoundedFareFact[] = []): boolean {
  const resources = orderedLegResources(state, bridge)
  if (!resources.length) return false
  const first = resources[0]?.coverage.originId
  const route = state.citySequence.length > 1 ? state.citySequence : state.stays.length && first ? [first, ...state.stays.map(stay => stay.cityId)] : []
  const stops = route.filter((city, index, all) => !!city && (index === 0 || city !== all[index - 1]))
  if (stops.length > 1 && resources.length !== stops.length - 1) return false
  return resources.every(resource => manifestCovers(resource.manifest, legRequest(state, resource.coverage, selectedFacts)))
}

export function legState(state: ArtifactUIState, coverage: FareScope, selectedFacts: readonly BoundedFareFact[] = []): ArtifactUIState {
  const key = legKey(coverage)
  const threshold = legThreshold(state, { originIds: [coverage.originId], destinationIds: [coverage.destinationId] }, selectedFacts)
  const visible = state.displayWindowByLeg[key]
  const requestedEnd = visible?.to ?? (state.dates.end ? legDate(state, coverage.originId, state.dates.end) : undefined)
  const requestedStart = visible?.from && visible.from > threshold.date ? visible.from : threshold.date
  const outside = !!requestedEnd && requestedStart > requestedEnd
  const earliestMinutes = requestedStart === threshold.date ? threshold.minutes : 0
  return { ...state, runtimeVariables: { ...state.runtimeVariables, $earliestDepartureMinutes: earliestMinutes, $outsideDisplayWindow: outside }, dates: outside ? { start: requestedEnd, end: requestedEnd } : { start: requestedStart, ...(requestedEnd && requestedEnd >= requestedStart ? { end: requestedEnd } : {}) }, sort: state.sortByLeg[key] ?? state.sort, filters: { ...state.filters, modes: state.modesByLeg[key] ?? state.filters.modes } }
}

export function resolveBoundDatasetId(state: ArtifactUIState, bridge: ServerFareDataBridge, seedRef: DatasetId, selectedFacts: readonly BoundedFareFact[] = []): DatasetId {
  const initial = bridge.findBinding(seedRef)
  if (!initial) {
    const key = state.datasetBindings[seedRef]
    const rebound = key ? [...state.datasetRefs].reverse().find(id => {
      const binding = bridge.findBinding(id)
      return binding ? legKey(binding.manifest.coverage) === key : false
    }) : undefined
    if (rebound) return rebound
    throw new Error('Expired dataset reference')
  }
  const request = legRequest(state, initial.manifest.coverage, selectedFacts)
  const current = [...state.datasetRefs].reverse().find(id => {
    const binding = bridge.findBinding(id)
    return !!binding && legKey(binding.manifest.coverage) === legKey(initial.manifest.coverage) && manifestCovers(binding.manifest, request)
  })
  const currentBinding = current ? bridge.findBinding(current) : undefined
  if (currentBinding && currentBinding.manifest.source.sourceVersion !== initial.manifest.source.sourceVersion) throw new Error('Travel source changed; reload this artifact')
  return current ?? seedRef
}
