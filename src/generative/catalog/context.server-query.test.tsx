import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
  ArtifactIdSchema,
  DatasetIdSchema,
  QueryGroupsResponseSchema,
  type QueryGroupsRequest,
} from '../contracts'
import { FareItemSchema } from '../contracts/query-groups'
import { createFareDataBridge } from '../data/fare-data-bridge'
import type { ServerQueryClient } from '../data/server-query-client'
import { createUIStateStore } from '../state/ui-state-store'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { TravelProvider, useCalendarDays, useItineraryPlan, useOrderedFares, type TravelServices } from './context'

const artifactId = ArtifactIdSchema.parse('artifact-query-hooks')
const scope = {
  kind: 'fareScope' as const,
  originId: 'london',
  destinationId: 'paris',
  dateWindow: { from: '2026-10-26', to: '2026-10-27' },
  passengers: 1,
  earliestDeparture: { date: '2026-10-26', minutes: 0 },
}

function response(request: QueryGroupsRequest) {
  return QueryGroupsResponseSchema.parse({
    version: 1,
    requestId: request.requestId,
    sourceVersion: 'source-1',
    groups: request.groups.map(group => ({
      groupId: group.groupId,
      manifest: {
        kind: 'fareScopeManifest',
        resourceKey: 'scope-1',
        source: { kind: 'search', descriptorId: 'scope-1', sourceVersion: 'source-1' },
        coverage: scope,
        totalAvailable: 2,
        availableModes: ['train', 'bus'],
        availableDateWindow: scope.dateWindow,
        complete: true,
      },
      projections: group.projections.map(projection => ({
        projectionId: projection.projectionId,
        kind: 'calendarDays',
        inputHash: 'server-input',
        resultFingerprint: projection.filters.carrierIds.length ? 'result-filtered' : 'result-all',
        days: [
          { date: '2026-10-26', count: 1, representative: null },
          { date: '2026-10-27', count: 1, representative: null },
        ],
      })),
    })),
  })
}

describe('fixed projection hooks', () => {
  it('bounds stay-derived fallback thresholds by the server scope earliest departure', async () => {
    const fixed = createFixedProjectionFixture({ rows: [], sourceVersion: 'schedule-source-v1' })
    const firstManifest = await fixed.bridge.loadScope(fixed.scope({
      originId: 'london',
      destinationId: 'paris',
      dateWindow: { from: '2026-10-26', to: '2026-11-02' },
      passengers: 1,
      earliestDeparture: { date: '2026-10-26', minutes: 0 },
    }), new AbortController().signal)
    const secondManifest = await fixed.bridge.loadScope(fixed.scope({
      originId: 'paris',
      destinationId: 'rome',
      dateWindow: { from: '2026-10-26', to: '2026-11-02' },
      passengers: 1,
      earliestDeparture: { date: '2026-10-26', minutes: 14 * 60 },
    }), new AbortController().signal)
    const state = createUIStateStore()
    state.initializeMissing(artifactId, {
      datasetRefs: [DatasetIdSchema.parse(firstManifest.resourceKey), DatasetIdSchema.parse(secondManifest.resourceKey)],
      dates: { start: '2026-10-26', end: '2026-11-02' },
      citySequence: ['london', 'paris', 'rome'],
      stays: [{ cityId: 'paris', nights: 3 }],
    })
    const services = { bridge: fixed.bridge, state, activeId: () => artifactId, activate: () => {} } satisfies TravelServices
    const wrapper = ({ children }: { children: ReactNode }) => <TravelProvider services={services}>{children}</TravelProvider>
    const { result } = renderHook(() => useItineraryPlan(artifactId), { wrapper })

    expect(result.current.legs[1]?.threshold).toEqual({ date: '2026-10-29', minutes: 0, source: 'trip-date' })
    act(() => state.dispatch({ kind: 'stays', artifactId, stays: [{ cityId: 'paris', nights: 0 }] }))
    await waitFor(() => expect(result.current.legs[1]?.threshold).toEqual({ date: '2026-10-26', minutes: 14 * 60, source: 'trip-date' }))
  })

  it('uses chronological default ordering for an explicitly bound leg', async () => {
    const fixed = createFixedProjectionFixture({ rows: [], sourceVersion: 'sort-source-v1' })
    const manifest = await fixed.bridge.loadScope(fixed.scope(scope), new AbortController().signal)
    const binding = fixed.bridge.getBinding(manifest.resourceKey)
    const state = createUIStateStore()
    state.initializeMissing(artifactId, {
      datasetRefs: [binding.datasetId],
      dates: { start: '2026-10-26', end: '2026-10-27' },
      citySequence: ['london', 'paris'],
    })
    const services = { bridge: fixed.bridge, state, activeId: () => artifactId, activate: () => {} } satisfies TravelServices
    const wrapper = ({ children }: { children: ReactNode }) => <TravelProvider services={services}>{children}</TravelProvider>
    const { result } = renderHook(() => useOrderedFares(artifactId, {
      componentRef: 'fare-strip',
      purpose: 'fare-strip',
      datasetRef: binding.datasetId,
      limit: 7,
    }), { wrapper })

    await waitFor(() => expect(result.current.queryState.status).toBe('ready'))
    expect(result.current.requirement.projection).toMatchObject({
      kind: 'farePage',
      sort: { field: 'departureMinutes', direction: 'asc' },
    })
  })

  it('moves the earliest departure into a later display window', async () => {
    const rows = ['2026-10-26', '2026-10-27'].map((serviceDate, index) => FareItemSchema.parse({
      id: `dated-fare-${index + 1}`,
      originId: 'london',
      destinationId: 'paris',
      serviceDate,
      mode: 'train',
      carrierId: 'rail',
      carrierName: 'Mode Rail',
      priceCents: 2_000 + index * 100,
      durationMinutes: 120,
      departureMinutes: 480,
      availableSeats: 4,
      currency: 'EUR',
      synthetic: true,
      priceBasis: 'per-passenger-including-demo-fees',
      direct: true,
      legs: [{ legIndex: 0, mode: 'train', carrierName: 'Mode Rail', durationMinutes: 120, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
    }))
    const fixed = createFixedProjectionFixture({ rows, sourceVersion: 'date-shift-source-v1', sourceDateWindow: { from: '2026-10-26', to: '2026-10-27' } })
    const initialScope = fixed.scope({ ...scope, dateWindow: { from: '2026-10-26', to: '2026-10-26' } })
    const manifest = await fixed.bridge.loadScope(initialScope, new AbortController().signal)
    const binding = fixed.bridge.getBinding(manifest.resourceKey)
    const state = createUIStateStore({ now: () => '2026-10-26T00:00:00.000Z' })
    state.initializeMissing(artifactId, {
      datasetRefs: [binding.datasetId],
      dates: { start: '2026-10-26' },
      citySequence: ['london', 'paris'],
      displayWindowByLeg: { 'london:paris': { from: '2026-10-26', to: '2026-10-26' } },
    })
    const services = { bridge: fixed.bridge, state, activeId: () => artifactId, activate: () => {} } satisfies TravelServices
    const wrapper = ({ children }: { children: ReactNode }) => <TravelProvider services={services}>{children}</TravelProvider>
    const { result } = renderHook(() => useOrderedFares(artifactId, {
      componentRef: 'date-shift-fares',
      purpose: 'date-shift-fares',
      datasetRef: binding.datasetId,
      limit: 8,
    }), { wrapper })

    await waitFor(() => expect(result.current.data?.items[0]?.serviceDate).toBe('2026-10-26'))
    act(() => state.dispatch({ kind: 'dates', artifactId, dates: { start: '2026-10-27' } }))

    await waitFor(() => expect(result.current.requirement.scope).toMatchObject({
      dateWindow: { from: '2026-10-27', to: '2026-10-27' },
      earliestDeparture: { date: '2026-10-27', minutes: 0 },
    }))
    await waitFor(() => expect(result.current.data?.items[0]?.serviceDate).toBe('2026-10-27'))
    expect(result.current.queryState.status).toBe('ready')
  })

  it('exposes normalized desired inputs and ignores selected calendar date invalidation', async () => {
    const requests: QueryGroupsRequest[] = []
    const client: ServerQueryClient = {
      queryGroups: async request => {
        requests.push(request)
        return response(request)
      },
      lookupPins: async () => { throw new Error('unused') },
    }
    const bridge = createFareDataBridge({ client })
    const manifest = await bridge.loadScope(scope, new AbortController().signal)
    const state = createUIStateStore({ now: () => '2026-10-26T00:00:00.000Z' })
    state.initializeMissing(artifactId, {
      datasetRefs: [DatasetIdSchema.parse(manifest.resourceKey)],
      dates: { start: '2026-10-26', end: '2026-10-27' },
      citySequence: ['london', 'paris'],
    })
    const services = {
      bridge,
      state,
      activeId: () => artifactId,
      activate: () => {},
    } satisfies TravelServices
    const wrapper = ({ children }: { children: ReactNode }) => <TravelProvider services={services}>{children}</TravelProvider>
    const { result } = renderHook(() => useCalendarDays(artifactId, {
      componentRef: 'calendar-1',
      purpose: 'calendar-days',
      objective: 'cheapest',
    }), { wrapper })

    await waitFor(() => expect(result.current.queryState.status).toBe('ready'))
    expect(requests).toHaveLength(2)
    expect(result.current.requirement).toMatchObject({
      group: { artifactId, legKey: 'london:paris', purpose: 'leg-results' },
      scope,
      projection: { kind: 'calendarDays', objective: 'cheapest' },
    })
    expect(result.current.data?.days).toHaveLength(2)

    act(() => {
      state.dispatch({
        kind: 'calendarDateByLeg',
        artifactId,
        calendarDateByLeg: { 'london:paris': '2026-10-27' },
      })
    })
    await waitFor(() => expect(result.current.queryState.intent.uiRevision).toBe(1))
    expect(requests).toHaveLength(2)
    expect(result.current.queryState.status).toBe('ready')

    act(() => {
      state.dispatch({
        kind: 'filters',
        artifactId,
        filters: { ...state.get(artifactId).filters, carrierIds: ['carrier-rail'] },
      })
    })
    await waitFor(() => expect(requests).toHaveLength(3))
    expect(requests[2]?.groups[0]?.projections[0]).toMatchObject({
      kind: 'calendarDays',
      filters: { carrierIds: ['carrier-rail'] },
    })
  })
})
