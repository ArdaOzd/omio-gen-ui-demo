import type { ArtifactId, ArtifactUIState, BoundedFareFact, DatasetId, DatasetRevision, DispatchResult, FareId, UICommand, UIStateStore } from '../contracts'
import type { FareScope, ResourceKey, ResultKey } from '../contracts/query-groups'
import type { ServerFareDataBridge } from '../data/fare-data-bridge'
import { availableModes, legDate, legKey, legRequest, manifestCovers, orderedLegResources } from './leg-bindings'
import { scheduleLegs, staleDownstreamFareIds } from './itinerary-schedule'
import { releaseDatasetWhenUnowned } from './dataset-ownership'

export type QueryFareSelectionScope = {
  kind: 'query-result'
  fareIds: readonly FareId[]
  resultKey: ResultKey
  currentResultKey: () => ResultKey | undefined
  resourceKey: ResourceKey
  datasetId: DatasetId
  datasetRevision: DatasetRevision
  sourceVersion: string
}

export type CalendarDateSelectionScope = {
  legKey: string
  date?: string
  availableDates: readonly string[]
  resourceKey: ResourceKey
  datasetId: DatasetId
  datasetRevision: DatasetRevision
  sourceVersion: string
  resultKey: ResultKey
  currentResultKey: () => ResultKey | undefined
  selectionKey: string
}

export type CoverageLoadStatus = { artifactId: ArtifactId; status: 'loading' | 'ready' | 'error'; message?: string }

const signature = (state: ArtifactUIState) => JSON.stringify({
  dates: state.dates,
  citySequence: state.citySequence,
  stays: state.stays,
  modes: state.filters.modes,
  modesByLeg: state.modesByLeg,
  displayWindowByLeg: state.displayWindowByLeg,
  selectedFareIds: state.selectedFareIds,
})

function cachedSelectedFacts(state: ArtifactUIState, bridge: ServerFareDataBridge): BoundedFareFact[] {
  return state.selectedFareIds.flatMap(fareId => {
    const item = bridge.findCachedFare(fareId)
    if (!item) return []
    const { availableSeats: _availableSeats, ...fact } = item
    return [fact]
  })
}

function routePairs(state: ArtifactUIState, bridge: ServerFareDataBridge): Array<{ originId: string; destinationId: string }> {
  if (state.citySequence.length > 1) return state.citySequence.slice(1).map((destinationId, index) => ({ originId: state.citySequence[index]!, destinationId }))
  return orderedLegResources(state, bridge).map(resource => ({ originId: resource.coverage.originId, destinationId: resource.coverage.destinationId }))
}

function requestsFor(state: ArtifactUIState, bridge: ServerFareDataBridge, selectedFacts: readonly BoundedFareFact[]): FareScope[] {
  const resources = orderedLegResources(state, bridge)
  const byKey = new Map(resources.map(resource => [resource.key, resource.coverage]))
  const fallbackPassengers = resources[0]?.coverage.passengers ?? 1
  return routePairs(state, bridge).map(({ originId, destinationId }) => {
    const key = `${originId}:${destinationId}`
    const from = state.displayWindowByLeg[key]?.from ?? legDate(state, originId)
    const to = state.displayWindowByLeg[key]?.to ?? (state.dates.end ? legDate(state, originId, state.dates.end) : from)
    const seed = byKey.get(key) ?? { kind: 'fareScope' as const, originId, destinationId, dateWindow: { from, to }, passengers: fallbackPassengers, earliestDeparture: { date: from, minutes: 0 } }
    return legRequest(state, seed, selectedFacts)
  })
}

const scheduleCoverages = (scopes: readonly FareScope[]) => scopes.map(scope => ({ originIds: [scope.originId], destinationIds: [scope.destinationId] }))

export function createActionRouter(store: UIStateStore, options: { bridge?: ServerFareDataBridge; activate?: (id: ArtifactId) => void; onCoverageStatus?: (status: CoverageLoadStatus) => void; onSourceChanged?: (artifactId: ArtifactId, resourceKey: ResourceKey) => void } = {}) {
  const requests = new Map<ArtifactId, { controller: AbortController; promise: Promise<void> }>()
  const selections = new Map<ArtifactId, { token: symbol; controller: AbortController; promise: Promise<void> }>()
  type SourceWatch = { sourceVersion: string; selectedLegByFare: ReadonlyMap<FareId, string>; stop: () => void }
  const sourceWatches = new Map<ArtifactId, Map<ResourceKey, SourceWatch>>()

  const syncSourceWatches = (artifactId: ArtifactId): void => {
    const bridge = options.bridge
    if (!bridge) return
    const state = store.get(artifactId)
    const current = sourceWatches.get(artifactId) ?? new Map<ResourceKey, SourceWatch>()
    const bindings = state.datasetRefs.flatMap(datasetId => bridge.findBinding(datasetId) ?? [])
    const selectedLegByFare = new Map<FareId, string>()
    for (const fareId of state.selectedFareIds) {
      const fact = bridge.findCachedFare(fareId)
      if (fact) selectedLegByFare.set(fareId, `${fact.originId}:${fact.destinationId}`)
    }
    const active = new Set(bindings.map(binding => binding.resourceKey))
    for (const [resourceKey, watch] of current) if (!active.has(resourceKey)) {
      watch.stop()
      current.delete(resourceKey)
    }
    for (const watch of current.values()) watch.selectedLegByFare = selectedLegByFare
    for (const binding of bindings) {
      if (current.has(binding.resourceKey)) continue
      const resourceKey = binding.resourceKey
      const watch: SourceWatch = { sourceVersion: binding.manifest.source.sourceVersion, selectedLegByFare, stop: () => {} }
      watch.stop = bridge.subscribe(resourceKey, () => {
        let latest
        try { latest = bridge.getBinding(resourceKey) } catch { return }
        const nextSource = latest.manifest.source.sourceVersion
        if (nextSource === watch.sourceVersion) return
        watch.sourceVersion = nextSource
        const state = store.get(artifactId)
        const changedKey = legKey(latest.manifest.coverage)
        const route = routePairs(state, bridge).map(pair => `${pair.originId}:${pair.destinationId}`)
        const changedIndex = route.indexOf(changedKey)
        if (changedIndex < 0) return
        for (const fareId of state.selectedFareIds) {
          const selectedKey = watch.selectedLegByFare.get(fareId)
          const selectedIndex = selectedKey ? route.indexOf(selectedKey) : -1
          if (selectedIndex >= 0 && selectedIndex < changedIndex) continue
          const currentState = store.get(artifactId)
          if (currentState.selectedFareIds.includes(fareId)) store.dispatch({ kind: 'select', artifactId, fareId, selected: false, expectedRevision: currentState.revision })
        }
        options.onSourceChanged?.(artifactId, resourceKey)
        void retry(artifactId, [])
      })
      current.set(resourceKey, watch)
    }
    sourceWatches.set(artifactId, current)
  }

  const currentScope = (artifactId: ArtifactId, scope: QueryFareSelectionScope): boolean => {
    const bridge = options.bridge
    if (!bridge || scope.resultKey !== scope.currentResultKey()) return false
    const binding = bridge.findBinding(scope.datasetId)
    return !!binding
      && store.get(artifactId).datasetRefs.includes(scope.datasetId)
      && binding.resourceKey === scope.resourceKey
      && binding.datasetRevision === scope.datasetRevision
      && binding.manifest.source.sourceVersion === scope.sourceVersion
  }

  const currentCalendarScope = (artifactId: ArtifactId, command: Extract<UICommand, { kind: 'calendarDateByLeg' }>, scope: CalendarDateSelectionScope): boolean => {
    const bridge = options.bridge
    if (!bridge || scope.resultKey !== scope.currentResultKey()) return false
    const state = store.get(artifactId)
    const binding = bridge.findBinding(scope.datasetId)
    if (!binding || !state.datasetRefs.includes(scope.datasetId) || binding.resourceKey !== scope.resourceKey || legKey(binding.manifest.coverage) !== scope.legKey || binding.datasetRevision !== scope.datasetRevision || binding.manifest.source.sourceVersion !== scope.sourceVersion || scope.selectionKey !== JSON.stringify(state.selectedFareIds)) return false
    const changed = [...new Set([...Object.keys(state.calendarDateByLeg), ...Object.keys(command.calendarDateByLeg)])].filter(key => state.calendarDateByLeg[key] !== command.calendarDateByLeg[key])
    return changed.length === 1 && changed[0] === scope.legKey && command.calendarDateByLeg[scope.legKey] === scope.date && (!scope.date || scope.availableDates.includes(scope.date))
  }

  const retry = (artifactId: ArtifactId, suppliedFacts?: readonly BoundedFareFact[]): Promise<void> => {
    const bridge = options.bridge
    if (!bridge) return Promise.resolve()
    requests.get(artifactId)?.controller.abort()
    requests.delete(artifactId)
    let state = store.get(artifactId)
    const selectedFacts = suppliedFacts ? [...suppliedFacts] : cachedSelectedFacts(state, bridge)
    const plans = requestsFor(state, bridge, selectedFacts)
    if (!plans.length) {
      options.onCoverageStatus?.({ artifactId, status: 'ready' })
      return Promise.resolve()
    }
    const currentBindings = state.datasetRefs.flatMap(id => bridge.findBinding(id) ?? [])
    const missing = plans.filter(plan => !currentBindings.some(binding => manifestCovers(binding.manifest, plan)))
    const controller = new AbortController()
    const captured = signature(state)
    options.onCoverageStatus?.({ artifactId, status: missing.length ? 'loading' : 'ready' })
    const promise = Promise.resolve().then(async () => {
      const loadedKeys: ResourceKey[] = []
      try {
        for (const scope of missing) {
          const manifest = await bridge.loadScope(scope, controller.signal)
          loadedKeys.push(manifest.resourceKey)
        }
        if (controller.signal.aborted || requests.get(artifactId)?.controller !== controller || signature(store.get(artifactId)) !== captured) throw new Error('Superseded coverage')
        const refreshed = store.get(artifactId)
        const allBindings = [...refreshed.datasetRefs.flatMap(id => bridge.findBinding(id) ?? []), ...loadedKeys.map(key => bridge.getBinding(key))]
        const latest = new Map(allBindings.map(binding => [legKey(binding.manifest.coverage), binding]))
        const activeKeys = plans.map(legKey)
        const bindings = activeKeys.flatMap(key => latest.get(key) ?? [])
        if (bindings.length !== activeKeys.length) throw new Error('Missing route scope')
        if (bindings.length > 8) throw new Error('Eight-leg limit reached')
        const refs = bindings.map(binding => binding.datasetId)
        const availableModesByLeg = { ...refreshed.availableModesByLeg }
        const requestedModesByLeg = { ...refreshed.requestedModesByLeg }
        const modesByLeg = { ...refreshed.modesByLeg }
        for (const binding of bindings) {
          const key = legKey(binding.manifest.coverage)
          const actual = availableModes(binding.manifest)
          availableModesByLeg[key] = actual
          if (!requestedModesByLeg[key]) requestedModesByLeg[key] = refreshed.filters.modes.length ? refreshed.filters.modes : actual
          const chosen = modesByLeg[key]
          if (chosen) {
            const retained = chosen.filter(mode => actual.includes(mode))
            modesByLeg[key] = retained.length === actual.length ? [] : retained
          }
        }
        let current = store.get(artifactId)
        for (const command of [
          { kind: 'availableModesByLeg' as const, artifactId, availableModesByLeg },
          { kind: 'requestedModesByLeg' as const, artifactId, requestedModesByLeg },
          { kind: 'modesByLeg' as const, artifactId, modesByLeg },
          { kind: 'datasets' as const, artifactId, datasetRefs: refs },
        ]) {
          const result = store.dispatch({ ...command, expectedRevision: current.revision })
          if (result.status === 'stale') throw new Error('Stale scope update')
          current = store.get(artifactId)
        }
        for (const previous of refreshed.datasetRefs) if (!refs.includes(previous)) releaseDatasetWhenUnowned(store, bridge, artifactId, previous)
        syncSourceWatches(artifactId)
        options.onCoverageStatus?.({ artifactId, status: 'ready' })
      } catch (error) {
        for (const resourceKey of loadedKeys) bridge.release(resourceKey)
        if (!controller.signal.aborted) options.onCoverageStatus?.({ artifactId, status: 'error', message: error instanceof Error && error.message === 'Eight-leg limit reached' ? 'This travel view supports at most eight adjacent legs.' : 'Could not load this synthetic coverage. Check the route dates and try again.' })
      } finally {
        if (requests.get(artifactId)?.controller === controller) requests.delete(artifactId)
      }
    })
    requests.set(artifactId, { controller, promise })
    return promise
  }

  const reconcileSelection = (artifactId: ArtifactId, command: Extract<UICommand, { kind: 'select' }> | undefined, scope: QueryFareSelectionScope | undefined): void => {
    const bridge = options.bridge
    if (!bridge) return
    selections.get(artifactId)?.controller.abort()
    const token = Symbol()
    const controller = new AbortController()
    const selectedKey = JSON.stringify(store.get(artifactId).selectedFareIds)
    const promise = Promise.resolve().then(async () => {
      if (selections.get(artifactId)?.token !== token || JSON.stringify(store.get(artifactId).selectedFareIds) !== selectedKey) return
      if (command?.selected && scope) await bridge.lookupPins({version:1,requestId:`selection-${crypto.randomUUID()}`,sourceVersion:scope.sourceVersion,pins:[{fareId:command.fareId,resourceKey:scope.resourceKey}]},controller.signal)
      if (selections.get(artifactId)?.token !== token || JSON.stringify(store.get(artifactId).selectedFareIds) !== selectedKey) return
      let state = store.get(artifactId)
      const facts = cachedSelectedFacts(state, bridge)
      if (facts.length !== state.selectedFareIds.length) throw new Error('Selected fare is unavailable')
      if (command?.selected && scope && !currentScope(artifactId, scope)) {
        const current = store.get(artifactId)
        if (current.selectedFareIds.includes(command.fareId)) store.dispatch({ kind: 'select', artifactId, fareId: command.fareId, selected: false, expectedRevision: current.revision })
        await retry(artifactId, cachedSelectedFacts(store.get(artifactId), bridge))
        return
      }
      const chosen = command?.selected ? facts.find(fact => fact.id === command.fareId) : undefined
      const firstRoute = routePairs(state, bridge)[0]
      if (chosen && !state.dates.end && firstRoute?.originId === chosen.originId && firstRoute.destinationId === chosen.destinationId) {
        const offset = Date.parse(legDate(state, chosen.originId)) - Date.parse(state.dates.start)
        const start = new Date(Date.parse(chosen.serviceDate) - offset).toISOString().slice(0, 10)
        if (start !== state.dates.start) {
          const aligned = store.dispatch({ kind: 'calendarDates', artifactId, dates: { start }, expectedRevision: state.revision })
          if (aligned.status === 'stale') throw new Error('Stale selected-date alignment')
          state = store.get(artifactId)
        }
      }
      const plans = requestsFor(state, bridge, facts)
      const coverages = scheduleCoverages(plans)
      const stale = new Set(staleDownstreamFareIds(state, coverages, facts))
      const scheduled = scheduleLegs(state, coverages, facts)
      const last = new Map<string, FareId>()
      for (const fact of facts) {
        const key = `${fact.originId}:${fact.destinationId}`
        const leg = scheduled.find(candidate => candidate.key === key)
        if (leg?.selectionValid) last.set(key, fact.id)
      }
      for (const fact of facts) {
        if (!stale.has(fact.id) && last.get(`${fact.originId}:${fact.destinationId}`) === fact.id) continue
        const current = store.get(artifactId)
        store.dispatch({ kind: 'select', artifactId, fareId: fact.id, selected: false, expectedRevision: current.revision })
      }
      await retry(artifactId, cachedSelectedFacts(store.get(artifactId), bridge))
    }).catch(() => {
      if(controller.signal.aborted||selections.get(artifactId)?.token!==token)return
      if (command?.selected && selections.get(artifactId)?.token === token) {
        const current = store.get(artifactId)
        if (current.selectedFareIds.includes(command.fareId)) store.dispatch({ kind: 'select', artifactId, fareId: command.fareId, selected: false, expectedRevision: current.revision })
      }
      options.onCoverageStatus?.({ artifactId, status: 'error', message: 'The selected synthetic fare is no longer available.' })
    }).finally(() => {
      if (selections.get(artifactId)?.token === token) selections.delete(artifactId)
    })
    selections.set(artifactId, { token, controller, promise })
  }

  const route = (command: UICommand, selectionScope?: QueryFareSelectionScope, calendarScope?: CalendarDateSelectionScope): DispatchResult => {
    if (command.kind === 'select' && command.selected && selectionScope && (!selectionScope.fareIds.includes(command.fareId) || !currentScope(command.artifactId, selectionScope))) return { status: 'stale', revision: store.get(command.artifactId).revision }
    if (command.kind === 'calendarDateByLeg' && (!calendarScope || !currentCalendarScope(command.artifactId, command, calendarScope))) return { status: 'stale', revision: store.get(command.artifactId).revision }
    const result = store.dispatch({ ...command, expectedRevision: command.expectedRevision ?? store.get(command.artifactId).revision })
    if (result.status !== 'applied') return result
    options.activate?.(command.artifactId)
    if (!options.bridge) return result
    if (command.kind === 'select') reconcileSelection(command.artifactId, command, selectionScope)
    else if (['dates', 'calendarDates', 'route', 'stays'].includes(command.kind)) {
      reconcileSelection(command.artifactId, undefined, undefined)
    } else if (['filters', 'modesByLeg', 'displayWindowByLeg'].includes(command.kind)) {
      void retry(command.artifactId)
    }
    return result
  }

  const cancelPending = () => {
    for (const request of requests.values()) request.controller.abort()
    requests.clear()
    selections.forEach(selection=>selection.controller.abort())
    selections.clear()
    for (const watches of sourceWatches.values()) for (const watch of watches.values()) watch.stop()
    sourceWatches.clear()
  }
  return Object.assign(route, {
    retry,
    selectFromQuery: (command: Extract<UICommand, { kind: 'select' }>, scope: QueryFareSelectionScope) => route(command, scope),
    calendarDateFromQuery: (command: Extract<UICommand, { kind: 'calendarDateByLeg' }>, scope: CalendarDateSelectionScope) => route(command, undefined, scope),
    whenIdle: async (id: ArtifactId) => { await Promise.all([requests.get(id)?.promise, selections.get(id)?.promise]) },
    cancelPending,
    dispose: cancelPending,
  })
}
