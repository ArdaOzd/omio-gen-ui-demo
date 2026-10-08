import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ArtifactIdSchema, ResourceKeySchema, type DatasetId, type UICommand } from '../contracts'
import { FareItemSchema, type FareItem } from '../contracts/query-groups'
import { createFareDataBridge, type ServerFareDataBridge } from '../data/fare-data-bridge'
import type { ServerQueryClient } from '../data/server-query-client'
import { createActionRouter, type QueryFareSelectionScope } from '../state/action-router'
import { createUIStateStore } from '../state/ui-state-store'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { CatalogNode } from './component'
import { TravelProvider, type TravelServices } from './context'

const artifactId = ArtifactIdSchema.parse('scoped-fare-selection')
const rows = [
  fare('visible-train', 'train', 5_500),
  fare('visible-bus', 'bus', 2_300),
]

function fare(id: string, mode: 'train' | 'bus', priceCents: number): FareItem {
  const carrierName = mode === 'train' ? 'Eurostar' : 'FlixBus'
  return FareItemSchema.parse({
    id,
    originId: 'london',
    destinationId: 'paris',
    serviceDate: '2026-10-09',
    mode,
    carrierId: mode === 'train' ? 'eurostar' : 'flixbus',
    carrierName,
    priceCents,
    durationMinutes: mode === 'train' ? 140 : 470,
    departureMinutes: mode === 'train' ? 660 : 600,
    availableSeats: 8,
    currency: 'EUR',
    synthetic: true,
    priceBasis: 'per-passenger-including-demo-fees',
    direct: true,
    legs: [{ legIndex: 0, mode, carrierName, durationMinutes: mode === 'train' ? 140 : 470, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
  })
}

async function loadedBridge(client?: ServerQueryClient) {
  const fixed = createFixedProjectionFixture({ rows, sourceVersion: 'selection-source-v1' })
  const bridge = client ? createFareDataBridge({ client }) : fixed.bridge
  const manifest = await bridge.loadScope(fixed.scope({
    originId: 'london',
    destinationId: 'paris',
    dateWindow: { from: '2026-10-09', to: '2026-10-09' },
    passengers: 1,
    earliestDeparture: { date: '2026-10-09', minutes: 0 },
  }), new AbortController().signal)
  return { fixed, bridge, binding: bridge.getBinding(manifest.resourceKey) }
}

async function retryFailureBridge() {
  const fixed = createFixedProjectionFixture({ rows, sourceVersion: 'selection-source-v1' })
  let failure: 'none' | 'all' | 'train-filter' = 'none'
  const client: ServerQueryClient = {
    queryGroups: async (request, signal) => {
      const trainFilter = request.groups.some(group => group.projections.some(projection => 'filters' in projection && projection.filters.modes.includes('train')))
      if (failure === 'all' || (failure === 'train-filter' && trainFilter)) throw new Error('fixture query failure')
      return fixed.client.queryGroups(request, signal)
    },
    lookupPins: (request, signal) => fixed.client.lookupPins(request, signal),
  }
  const bridge = createFareDataBridge({ client })
  const manifest = await bridge.loadScope(fixed.scope({ originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-09', to: '2026-10-09' }, passengers: 1, earliestDeparture: { date: '2026-10-09', minutes: 0 } }), new AbortController().signal)
  return { bridge, binding: bridge.getBinding(manifest.resourceKey), failWith(value: typeof failure) { failure = value } }
}

function captureRequestedQueryKey(bridge: ServerFareDataBridge): () => string | undefined {
  const request = bridge.coordinator.request.bind(bridge.coordinator)
  let queryKey: string | undefined
  bridge.coordinator.request = requirement => {
    const result = request(requirement)
    queryKey = result.intent.queryKey
    return result
  }
  return () => queryKey
}

function withForcedSameInputError(storedBridge: ServerFareDataBridge) {
  const coordinator = storedBridge.coordinator
  const forced = new Map<string, NonNullable<ReturnType<typeof coordinator.getState>>>()
  const listeners = new Map<string, Set<() => void>>()
  const bridge: ServerFareDataBridge = {
    ...storedBridge,
    coordinator: {
      ...coordinator,
      getState(queryKey) {
        return forced.get(queryKey) ?? coordinator.getState(queryKey)
      },
      subscribe(queryKey, listener) {
        const subscribed = listeners.get(queryKey) ?? new Set<() => void>()
        subscribed.add(listener)
        listeners.set(queryKey, subscribed)
        const unsubscribe = coordinator.subscribe(queryKey, listener)
        return () => {
          unsubscribe()
          subscribed.delete(listener)
          if (!subscribed.size) listeners.delete(queryKey)
        }
      },
    },
  }
  return {
    bridge,
    fail(queryKey: string) {
      const current = coordinator.getState(queryKey)
      if (current?.status !== 'ready') throw new Error('Expected a committed query result')
      forced.set(queryKey, { status: 'error', intent: current.intent, previous: current.current })
      listeners.get(queryKey)?.forEach(listener => listener())
    },
  }
}

function renderFareCards(bridge: ServerFareDataBridge, datasetId: DatasetId, beforeSelect: () => void = () => {}) {
  const state = createUIStateStore()
  state.initializeMissing(artifactId, { datasetRefs: [datasetId], citySequence: ['london', 'paris'], dates: { start: '2026-10-09' } })
  const router = createActionRouter(state, { bridge })
  const selectFromQuery = vi.fn((command: Extract<UICommand, { kind: 'select' }>, scope: QueryFareSelectionScope) => {
    beforeSelect()
    return router.selectFromQuery(command, scope)
  })
  const dispatch = Object.assign((command: UICommand) => router(command), { selectFromQuery })
  const services = { bridge, state, dispatch, activeId: () => artifactId, activate: () => {} } satisfies TravelServices
  render(<TravelProvider services={services}><CatalogNode kind="FareCards" artifactRef={artifactId} datasetRef={datasetId} /></TravelProvider>)
  return { state, router, selectFromQuery }
}

describe('query-scoped fare selection', () => {
  it('captures the visible result for selection while keeping deselection independent', async () => {
    const { bridge, binding } = await loadedBridge()
    const { state, router, selectFromQuery } = renderFareCards(bridge, binding.datasetId)

    const button = await screen.findByRole('button', { name: /Select Bus FlixBus/ })
    fireEvent.click(button)
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[1]!.id])
    expect(selectFromQuery).toHaveBeenCalledTimes(1)
    const scope = selectFromQuery.mock.calls[0]?.[1]
    expect(scope).toMatchObject({
      kind: 'query-result',
      fareIds: [rows[1]!.id, rows[0]!.id],
      resourceKey: binding.resourceKey,
      datasetId: binding.datasetId,
      datasetRevision: binding.datasetRevision,
      sourceVersion: binding.manifest.source.sourceVersion,
    })
    expect(scope?.currentResultKey()).toBe(scope?.resultKey)

    fireEvent.click(screen.getByRole('button', { name: /Select Bus FlixBus/ }))
    expect(state.get(artifactId).selectedFareIds).toEqual([])
    expect(selectFromQuery).toHaveBeenCalledTimes(1)
    router.dispose()
  })

  it('rejects a visible fare after a newer filter intent supersedes its committed result', async () => {
    const fixed = createFixedProjectionFixture({ rows, sourceVersion: 'selection-source-v1' })
    let holdFiltered = false
    let releaseFiltered: () => void = () => {}
    let markFilteredStarted: () => void = () => {}
    const filteredGate = new Promise<void>(resolve => { releaseFiltered = resolve })
    const filteredStarted = new Promise<void>(resolve => { markFilteredStarted = resolve })
    const client: ServerQueryClient = {
      queryGroups: async (request, signal) => {
        const filtered = request.groups.some(group => group.projections.some(projection => 'filters' in projection && projection.filters.modes.includes('train')))
        if (holdFiltered && filtered) {
          markFilteredStarted()
          await filteredGate
        }
        return fixed.client.queryGroups(request, signal)
      },
      lookupPins: (request, signal) => fixed.client.lookupPins(request, signal),
    }
    const bridge = createFareDataBridge({ client })
    const manifest = await bridge.loadScope(fixed.scope({ originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-09', to: '2026-10-09' }, passengers: 1, earliestDeparture: { date: '2026-10-09', minutes: 0 } }), new AbortController().signal)
    const binding = bridge.getBinding(manifest.resourceKey)
    const { state, router } = renderFareCards(bridge, binding.datasetId)
    await screen.findByRole('button', { name: /Select Bus FlixBus/ })

    holdFiltered = true
    act(() => state.dispatch({ kind: 'filters', artifactId, filters: { ...state.get(artifactId).filters, modes: ['train'] } }))
    await filteredStarted
    fireEvent.click(screen.getByRole('button', { name: /Select Bus FlixBus/ }))
    expect(state.get(artifactId).selectedFareIds).toEqual([])

    releaseFiltered()
    await waitFor(() => expect(screen.queryByRole('button', { name: /Select Bus FlixBus/ })).not.toBeInTheDocument())
    router.dispose()
  })

  it('accepts the visible result after a same-input retry fails', async () => {
    const loaded = await loadedBridge()
    const forced = withForcedSameInputError(loaded.bridge)
    const bridge = forced.bridge
    const requestedQueryKey = captureRequestedQueryKey(bridge)
    const { state, router } = renderFareCards(bridge, loaded.binding.datasetId)
    const button = await screen.findByRole('button', { name: /Select Bus FlixBus/ })
    const queryKey = requestedQueryKey()
    if (!queryKey) throw new Error('FareCards query key missing')

    act(() => forced.fail(queryKey))
    await waitFor(() => expect(bridge.coordinator.getState(queryKey)?.status).toBe('error'))
    fireEvent.click(button)
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[1]!.id])
    router.dispose()
  })

  it('rejects the previous visible result after a different input fails', async () => {
    const { bridge, binding, failWith } = await retryFailureBridge()
    const requestedQueryKey = captureRequestedQueryKey(bridge)
    const { state, router } = renderFareCards(bridge, binding.datasetId)
    const button = await screen.findByRole('button', { name: /Select Bus FlixBus/ })
    const queryKey = requestedQueryKey()
    if (!queryKey) throw new Error('FareCards query key missing')

    failWith('train-filter')
    act(() => state.dispatch({ kind: 'filters', artifactId, filters: { ...state.get(artifactId).filters, modes: ['train'] } }))
    await waitFor(() => expect(bridge.coordinator.getState(queryKey)?.status).toBe('error'))
    fireEvent.click(button)
    expect(state.get(artifactId).selectedFareIds).toEqual([])
    router.dispose()
  })

  it.each(['resource', 'source'] as const)('rejects a click when the captured %s identity is no longer current', async drift => {
    const { bridge: storedBridge, binding } = await loadedBridge()
    let changed = false
    const bridge: ServerFareDataBridge = {
      ...storedBridge,
      findBinding(datasetId) {
        const current = storedBridge.findBinding(datasetId)
        if (!current || !changed) return current
        if (drift === 'resource') return { ...current, resourceKey: ResourceKeySchema.parse('replacement-resource') }
        return { ...current, manifest: { ...current.manifest, source: { ...current.manifest.source, sourceVersion: 'selection-source-v2' } } }
      },
    }
    const { state, router } = renderFareCards(bridge, binding.datasetId, () => { changed = true })

    fireEvent.click(await screen.findByRole('button', { name: /Select Bus FlixBus/ }))
    expect(state.get(artifactId).selectedFareIds).toEqual([])
    router.dispose()
  })
})
