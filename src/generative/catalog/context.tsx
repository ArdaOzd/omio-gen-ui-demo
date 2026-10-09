import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { CalendarDateSelectionScope, QueryFareSelectionScope } from '../state/action-router'
import {
  ArtifactIdSchema,
  DatasetIdSchema,
  DatasetRevisionSchema,
  ResourceKeySchema,
  type ArtifactUIState,
  type BoundedFareFact,
  type DatasetId,
  type DispatchResult,
  type FareScopeBinding,
  type FareId,
  type ProjectionFilters,
  type ProjectionRequest,
  type ProjectionResult,
  type ProjectionResultSnapshot,
  type QueryExecutionState,
  type QueryGroupScope,
  type ResultKey,
  type SortSpec,
  type UICommand,
  type UIStateStore,
} from '../contracts'
import { stableFingerprint, type ProjectionRequirement } from '../data/projection-coordinator'
import type { ServerFareDataBridge } from '../data/fare-data-bridge'
import { fallbackLegDate } from '../state/itinerary-schedule'
import { earliestDepartureInWindow } from '../state/leg-bindings'
export { filterPredicate } from '../state/filter-predicate'
export { legKey, legState, resolveBoundDatasetId } from '../state/leg-bindings'

export type TravelServices = {
  bridge: ServerFareDataBridge
  state: UIStateStore
  activate: (id: string) => void
  activeId: () => string | undefined
  artifactIds?: () => ReturnType<typeof ArtifactIdSchema.parse>[]
  subscribeActive?: (listener: () => void) => () => void
  dispatch?: ((command: UICommand) => DispatchResult) & {
    retry?: (id: ReturnType<typeof ArtifactIdSchema.parse>) => Promise<void>
    selectFromQuery?: (command: Extract<UICommand, { kind: 'select' }>, scope: QueryFareSelectionScope) => DispatchResult
    calendarDateFromQuery?: (command: Extract<UICommand, { kind: 'calendarDateByLeg' }>, scope: CalendarDateSelectionScope) => DispatchResult
  }
  record?: (input: unknown) => void
  whenIdle?: (id: ReturnType<typeof ArtifactIdSchema.parse>) => Promise<void>
  createArtifact?: () => ReturnType<typeof ArtifactIdSchema.parse>
}

const TravelContext = createContext<TravelServices | null>(null)

export function TravelProvider({ services, children }: { services: TravelServices; children: ReactNode }) {
  return <TravelContext.Provider value={services}>{children}</TravelContext.Provider>
}

export function useTravelServices() {
  const services = useContext(TravelContext)
  if (!services) throw new Error('Travel provider missing')
  return services
}

export function useArtifact(ref: string) {
  const services = useTravelServices()
  const id = ArtifactIdSchema.parse(ref)
  const revision = useSyncExternalStore(
    listener => services.state.subscribe(id, listener),
    () => services.state.get(id).revision,
    () => services.state.get(id).revision,
  )
  const state = useMemo(() => services.state.get(id), [services.state, id, revision])
  return { services, state }
}

export function useTravelAction(ref: string) {
  const { services, state } = useArtifact(ref)
  return (command: UICommand) => {
    services.activate(ref)
    return (services.dispatch ?? services.state.dispatch)({
      ...command,
      artifactId: state.artifactId,
      expectedRevision: services.state.get(state.artifactId).revision,
    })
  }
}

export type ComponentQueryOptions = {
  componentRef: string
  purpose: string
  groupPurpose?: string
  legKey?: string
  datasetRef?: string
}

export type FarePageQueryOptions = ComponentQueryOptions & {
  cursor?: string | null
  limit?: number
}

export type ComponentQueryResult<T extends ProjectionResult> = {
  requirement: Readonly<ProjectionRequirement>
  queryState: QueryExecutionState
  data: T | undefined
  error: Error | undefined
  refresh: () => void
  captureResult: () => ProjectionResultSnapshot | undefined
  currentResultKey: () => ResultKey | undefined
}

export type QueryFareSelectionSource = Pick<ComponentQueryResult<ProjectionResult>, 'queryState' | 'currentResultKey'>

type FarePageResult = Extract<ProjectionResult, { kind: 'farePage' }>
type CalendarDaysResult = Extract<ProjectionResult, { kind: 'calendarDays' }>
type CarrierFacetsResult = Extract<ProjectionResult, { kind: 'carrierFacets' }>
type ModeSummaryResult = Extract<ProjectionResult, { kind: 'modeSummary' }>
type FareHighlightsResult = Extract<ProjectionResult, { kind: 'fareHighlights' }>

const defaultSort: SortSpec = { field: 'departureMinutes', direction: 'asc' }

function splitLegKey(value: string): { originId: string; destinationId: string } | undefined {
  const separator = value.indexOf(':')
  if (separator < 1 || separator === value.length - 1) return undefined
  return { originId: value.slice(0, separator), destinationId: value.slice(separator + 1) }
}

function bindingCandidates(state: ArtifactUIState, bridge: ServerFareDataBridge): FareScopeBinding[] {
  return state.datasetRefs.flatMap(datasetId => {
    const parsed = DatasetIdSchema.safeParse(datasetId)
    if (!parsed.success) return []
    const binding = bridge.findBinding(parsed.data)
    return binding ? [binding] : []
  })
}

function selectedFacts(state: ArtifactUIState, bridge: ServerFareDataBridge): BoundedFareFact[] {
  return state.selectedFareIds.flatMap(fareId => {
    const item = bridge.findCachedFare(fareId)
    if (!item) return []
    const { availableSeats: _availableSeats, ...fact } = item
    return [fact]
  })
}

function addMinutes(date: string, minutes: number): { date: string; minutes: number } {
  const instant = Date.parse(`${date}T00:00:00.000Z`) + minutes * 60_000
  const value = new Date(instant)
  return { date: value.toISOString().slice(0, 10), minutes: value.getUTCHours() * 60 + value.getUTCMinutes() }
}

function scopeBinding(state: ArtifactUIState, bridge: ServerFareDataBridge, options: ComponentQueryOptions) {
  const bindings = bindingCandidates(state, bridge)
  const requestedDataset = options.datasetRef ? DatasetIdSchema.safeParse(options.datasetRef) : undefined
  const byDataset = requestedDataset?.success ? bridge.findBinding(requestedDataset.data) : undefined
  const byLeg = options.legKey
    ? bindings.find(binding => `${binding.manifest.coverage.originId}:${binding.manifest.coverage.destinationId}` === options.legKey)
    : undefined
  const binding = byDataset ?? byLeg ?? bindings[0]
  const requestedLeg = options.legKey ? splitLegKey(options.legKey) : undefined
  const originId = requestedLeg?.originId ?? binding?.manifest.coverage.originId
  const destinationId = requestedLeg?.destinationId ?? binding?.manifest.coverage.destinationId
  if (!originId || !destinationId) throw new Error('The component has no fare scope')
  const key = `${originId}:${destinationId}`
  const window = state.displayWindowByLeg[key]
    ?? binding?.manifest.coverage.dateWindow
    ?? { from: state.dates.start, to: state.dates.end ?? state.dates.start }
  const previous = [...selectedFacts(state, bridge)].reverse().find(fare => fare.destinationId === originId)
  const threshold = previous
    ? addMinutes(previous.serviceDate, previous.departureMinutes + previous.durationMinutes
      + (state.stays.find(stay => stay.cityId === originId)?.nights ?? 0) * 24 * 60)
    : binding?.manifest.coverage.earliestDeparture ?? { date: window.from, minutes: 0 }
  const earliestDeparture = earliestDepartureInWindow(window,threshold)
  const scope = {
    kind: 'fareScope' as const,
    originId,
    destinationId,
    dateWindow: window,
    passengers: binding?.manifest.coverage.passengers ?? 1,
    earliestDeparture,
  }
  const datasetId = binding?.datasetId ?? DatasetIdSchema.parse(scopeIdentityAsDataset(scope))
  const datasetRevision = binding?.datasetRevision ?? DatasetRevisionSchema.parse(1)
  return { binding, key, scope, datasetId, datasetRevision }
}

function scopeIdentityAsDataset(scope: object): string {
  return stableFingerprint(scope, 'scope')
}

function filtersFor(state: ArtifactUIState, legKey: string, binding?: FareScopeBinding): ProjectionFilters {
  const selectedModes = state.modesByLeg[legKey]
  const requestedModes = state.requestedModesByLeg[legKey]
  const availableModes = state.availableModesByLeg[legKey]
  const fallbackModes = binding?.manifest.availableModes ?? []
  const modes = selectedModes?.length
    ? selectedModes
    : requestedModes?.length
      ? requestedModes
      : state.filters.modes.length
        ? state.filters.modes
        : availableModes?.length
          ? availableModes
          : fallbackModes
  return {
    modes: [...modes],
    carrierIds: [...state.filters.carrierIds],
    ...(state.filters.minPriceCents === undefined ? {} : { minPriceCents: state.filters.minPriceCents }),
    ...(state.filters.maxPriceCents === undefined ? {} : { maxPriceCents: state.filters.maxPriceCents }),
    ...(state.filters.maxDurationMinutes === undefined ? {} : { maxDurationMinutes: state.filters.maxDurationMinutes }),
    directOnly: state.filters.directOnly,
  }
}

function requirementFor(
  state: ArtifactUIState,
  bridge: ServerFareDataBridge,
  options: ComponentQueryOptions,
  projection: (input: {
    filters: ProjectionFilters
    sort: SortSpec
    projectionId: string
    legKey: string
  }) => ProjectionRequest,
): ProjectionRequirement {
  const scoped = scopeBinding(state, bridge, options)
  const projectionId = stableFingerprint({ componentRef: options.componentRef, purpose: options.purpose }, 'projection')
  const group: QueryGroupScope = {
    artifactId: state.artifactId,
    legKey: scoped.key,
    purpose: options.groupPurpose ?? 'leg-results',
  }
  const sort = options.datasetRef || options.legKey
    ? state.sortByLeg[scoped.key] ?? defaultSort
    : state.sort ?? defaultSort
  return {
    group,
    projectionKey: `${options.componentRef}:${options.purpose}`,
    scope: scoped.scope,
    projection: projection({
      filters: filtersFor(state, scoped.key, scoped.binding),
      sort,
      projectionId,
      legKey: scoped.key,
    }),
    datasetId: scoped.datasetId,
    datasetRevision: scoped.datasetRevision,
    sourceVersion: scoped.binding?.manifest.source.sourceVersion,
    uiRevision: state.revision,
  }
}

function committedResultKey(state: QueryExecutionState) {
  if (state.status === 'ready' || state.status === 'refreshing') return state.current.resultKey
  if (state.status === 'error') return state.previous?.resultKey
  return undefined
}

function currentResultKey(state: QueryExecutionState): ResultKey | undefined {
  const current = state.status === 'ready' || state.status === 'refreshing' ? state.current : state.status === 'error' ? state.previous : undefined
  return current?.inputHash === state.intent.desiredInputHash ? current.resultKey : undefined
}

function committedDatasetId(state: QueryExecutionState): DatasetId | undefined {
  if (state.status === 'ready' || state.status === 'refreshing') return state.current.datasetId
  if (state.status === 'error') return state.previous?.datasetId
  return undefined
}

function useProjection<T extends ProjectionResult>(
  artifactRef: string,
  options: ComponentQueryOptions,
  makeProjection: Parameters<typeof requirementFor>[3],
  kind: T['kind'],
): ComponentQueryResult<T> {
  const { services, state } = useArtifact(artifactRef)
  const requirement = requirementFor(state, services.bridge, options, makeProjection)
  const initial = services.bridge.coordinator.request(requirement)
  const queryKey = initial.intent.queryKey
  const queryState = useSyncExternalStore(
    listener => services.bridge.coordinator.subscribe(queryKey, listener),
    () => services.bridge.coordinator.getState(queryKey) ?? initial,
    () => initial,
  )
  const resultKey = committedResultKey(queryState)
  const snapshot = resultKey ? services.bridge.coordinator.captureProjectionResult(resultKey) : undefined
  const data = snapshot?.projection.kind === kind ? snapshot.projection as T : undefined
  return {
    requirement,
    queryState,
    data,
    error: queryState.status === 'error' ? new Error('The fare projection could not be refreshed') : undefined,
    refresh: () => services.bridge.coordinator.retry(queryKey),
    captureResult: () => {
      const current = services.bridge.coordinator.getState(queryKey) ?? queryState
      const currentResultKey = committedResultKey(current)
      return currentResultKey ? services.bridge.coordinator.captureProjectionResult(currentResultKey) : undefined
    },
    currentResultKey: () => currentResultKey(services.bridge.coordinator.getState(queryKey) ?? queryState),
  }
}

function committedResult(state: QueryExecutionState) {
  if (state.status === 'ready' || state.status === 'refreshing') return state.current
  if (state.status === 'error') return state.previous
  return undefined
}

export function useQueryFareSelection(ref: string) {
  const { services, state } = useArtifact(ref)
  const dispatch = useTravelAction(ref)
  return {
    state,
    toggle(item: { id: FareId }, source: QueryFareSelectionSource, fareIds: readonly FareId[]) {
      const selected = state.selectedFareIds.includes(item.id)
      const command = { kind: 'select' as const, artifactId: state.artifactId, fareId: item.id, selected: !selected }
      if (selected || !services.dispatch?.selectFromQuery) return dispatch(command)
      const captured = committedResult(source.queryState)
      if (!captured) return { status: 'stale' as const, revision: services.state.get(state.artifactId).revision }
      services.activate(ref)
      return services.dispatch.selectFromQuery({
        ...command,
        expectedRevision: services.state.get(state.artifactId).revision,
      }, {
        kind: 'query-result',
        fareIds,
        resultKey: captured.resultKey,
        currentResultKey: source.currentResultKey,
        resourceKey: captured.resourceKey,
        datasetId: captured.datasetId,
        datasetRevision: captured.datasetRevision,
        sourceVersion: captured.sourceVersion,
      })
    },
  }
}

export function useOrderedFares(artifactRef: string, options: FarePageQueryOptions): ComponentQueryResult<FarePageResult> {
  return useProjection(artifactRef, options, ({ filters, sort, projectionId }) => ({
    projectionId,
    kind: 'farePage',
    filters,
    serviceDate: null,
    sort,
    after: options.cursor ?? null,
    limit: options.limit ?? 100,
  }), 'farePage')
}

export function useDayFares(artifactRef: string, options: FarePageQueryOptions & { serviceDate: string }): ComponentQueryResult<FarePageResult> {
  return useProjection(artifactRef, options, ({ filters, sort, projectionId }) => ({
    projectionId,
    kind: 'farePage',
    filters,
    serviceDate: options.serviceDate,
    sort,
    after: options.cursor ?? null,
    limit: options.limit ?? 100,
  }), 'farePage')
}

export function useCalendarDays(artifactRef: string, options: ComponentQueryOptions & { objective?: 'cheapest' | 'fastest' }): ComponentQueryResult<CalendarDaysResult> {
  return useProjection(artifactRef, options, ({ filters, sort, projectionId }) => ({
    projectionId,
    kind: 'calendarDays',
    filters,
    objective: options.objective ?? (sort.field === 'durationMinutes' ? 'fastest' : 'cheapest'),
  }), 'calendarDays')
}

export function useCarrierFacets(artifactRef: string, options: ComponentQueryOptions): ComponentQueryResult<CarrierFacetsResult> {
  return useProjection(artifactRef, options, ({ filters, projectionId }) => ({
    projectionId,
    kind: 'carrierFacets',
    filters,
  }), 'carrierFacets')
}

export function useModeStats(artifactRef: string, options: ComponentQueryOptions & { baseline: 'withoutModeFilter' | 'active' }): ComponentQueryResult<ModeSummaryResult> {
  return useProjection(artifactRef, options, ({ filters, projectionId }) => ({
    projectionId,
    kind: 'modeSummary',
    filters,
    baseline: options.baseline,
  }), 'modeSummary')
}

export function useFareHighlights(artifactRef: string, options: ComponentQueryOptions): ComponentQueryResult<FareHighlightsResult> {
  return useProjection(artifactRef, options, ({ filters, projectionId }) => ({
    projectionId,
    kind: 'fareHighlights',
    filters,
  }), 'fareHighlights')
}

export function useScopeManifest(artifactRef: string, options: ComponentQueryOptions) {
  const { services, state } = useArtifact(artifactRef)
  const scoped = scopeBinding(state, services.bridge, options)
  const signature = JSON.stringify(scoped.scope)
  const [result, setResult] = useState<{ signature: string; status: 'loading' | 'ready' | 'error'; binding?: FareScopeBinding }>({
    signature,
    status: scoped.binding ? 'ready' : 'loading',
    binding: scoped.binding,
  })
  useEffect(() => {
    if (scoped.binding) {
      setResult({ signature, status: 'ready', binding: scoped.binding })
      return
    }
    const controller = new AbortController()
    setResult({ signature, status: 'loading' })
    services.bridge.loadScope(scoped.scope, controller.signal).then(manifest => {
      if (!controller.signal.aborted) setResult({ signature, status: 'ready', binding: services.bridge.getBinding(manifest.resourceKey) })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ signature, status: 'error' })
    })
    return () => controller.abort()
  }, [services.bridge, signature])
  return result.signature === signature ? result : { signature, status: 'loading' as const }
}

export function useItineraryPlan(ref: string) {
  const { services, state } = useArtifact(ref)
  const facts = selectedFacts(state, services.bridge)
  const resources = bindingCandidates(state, services.bridge)
  const byKey = new Map(resources.map(binding => [`${binding.manifest.coverage.originId}:${binding.manifest.coverage.destinationId}`, binding]))
  const routeKeys = state.citySequence.slice(1).map((destinationId, index) => `${state.citySequence[index]}:${destinationId}`)
  const ordered = [...routeKeys.flatMap(key => byKey.get(key) ?? []), ...resources.filter(binding => !routeKeys.includes(`${binding.manifest.coverage.originId}:${binding.manifest.coverage.destinationId}`))]
  const factsByLeg = new Map(facts.map(fare => [`${fare.originId}:${fare.destinationId}`, fare]))
  const accepted: BoundedFareFact[] = []
  let blocked = false
  const legs = ordered.map(binding => {
    const coverage = binding.manifest.coverage
    const key = `${coverage.originId}:${coverage.destinationId}`
    const preceding = [...accepted].reverse().find(fare => fare.destinationId === coverage.originId)
    const fallbackDate = fallbackLegDate(state, coverage.originId)
    const fallbackThreshold = fallbackDate > coverage.earliestDeparture.date
      ? { date: fallbackDate, minutes: 0 }
      : coverage.earliestDeparture
    const threshold = preceding
      ? { ...addMinutes(preceding.serviceDate, preceding.departureMinutes + preceding.durationMinutes
        + (state.stays.find(stay => stay.cityId === coverage.originId)?.nights ?? 0) * 24 * 60), source: 'selected-arrival' as const, precedingFareId: preceding.id }
      : { ...fallbackThreshold, source: 'trip-date' as const }
    const selectedFare = factsByLeg.get(key)
    const departure = selectedFare ? Date.parse(`${selectedFare.serviceDate}T00:00:00.000Z`) + selectedFare.departureMinutes * 60_000 : 0
    const earliest = Date.parse(`${threshold.date}T00:00:00.000Z`) + threshold.minutes * 60_000
    const selectionValid = !!selectedFare && !blocked && departure >= earliest
    if (selectionValid && selectedFare) accepted.push(selectedFare)
    else if (selectedFare) blocked = true
    return {
      key,
      datasetId: binding.datasetId,
      resourceKey: binding.resourceKey,
      originId: coverage.originId,
      destinationId: coverage.destinationId,
      threshold,
      coverage,
      availableModes: binding.manifest.availableModes,
      ...(selectedFare ? { selectedFare } : {}),
      selectionValid,
    }
  })
  return {
    services,
    state,
    status: facts.length === state.selectedFareIds.length ? 'ready' as const : 'loading' as const,
    facts,
    legs,
  }
}

export function useFareRows(ref: string, datasetRef?: string) {
  const result = useOrderedFares(ref, { componentRef: `${ref}:fare-rows`, purpose: 'fare-rows', datasetRef })
  return { ...result, status: result.queryState.status, rows: result.data?.items ?? [], datasetId: committedDatasetId(result.queryState) }
}

export function useFareRowsForDate(ref: string, datasetRef: string | undefined, serviceDate: string) {
  const result = useDayFares(ref, { componentRef: `${ref}:day-fares`, purpose: 'day-fares', datasetRef, serviceDate })
  return { ...result, status: result.queryState.status, rows: result.data?.items ?? [], datasetId: committedDatasetId(result.queryState) }
}

export function useFareDayRepresentatives(ref: string, datasetRef?: string) {
  const result = useCalendarDays(ref, { componentRef: `${ref}:calendar-days`, purpose: 'calendar-days', datasetRef })
  return { ...result, status: result.queryState.status, rows: result.data?.days.flatMap(day => day.representative ? [day.representative] : []) ?? [], datasetId: committedDatasetId(result.queryState) }
}

export function useLegFareRows(ref: string, datasetRef?: string) {
  const result = useOrderedFares(ref, { componentRef: `${ref}:leg-fares`, purpose: 'leg-fares', datasetRef })
  return { ...result, status: result.queryState.status, rows: result.data?.items ?? [], datasetId: committedDatasetId(result.queryState) }
}

export const money = (cents: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(cents / 100)
export const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`
export const cityLabel = (id: string) => id.replace(/[-_]/g, ' ').replace(/\b\w/g, character => character.toUpperCase())
export const departure = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
export const carrierLabel = (item: { carrierId: string; carrierName?: string | null }, bridge: ServerFareDataBridge, resourceKey?: string) => item.carrierName
  ?? bridge.getCarrierLabel(item.carrierId, resourceKey ? ResourceKeySchema.parse(resourceKey) : undefined)
  ?? `Synthetic carrier ${item.carrierId}`
