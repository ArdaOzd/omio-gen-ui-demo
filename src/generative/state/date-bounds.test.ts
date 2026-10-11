import { describe, expect, it } from 'vitest'
import { ArtifactIdSchema, FareIdSchema } from '../contracts'
import { FareItemSchema, type FareItem } from '../contracts/query-groups'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { createActionRouter } from './action-router'
import { latestTripStartDate, maximumStayNights, stateRespectsDateBounds } from './date-bounds'
import { createUIStateStore } from './ui-state-store'

const bounds = { from: '2026-12-01', to: '2026-12-15' } as const
const artifactId = ArtifactIdSchema.parse('bounded-showcase')

function fare(id: string, departureMinutes: number, durationMinutes: number): FareItem {
  return FareItemSchema.parse({
    id,
    originId: 'london',
    destinationId: 'paris',
    serviceDate: '2026-12-15',
    mode: 'train',
    carrierId: 'fixture-rail',
    carrierName: 'Fixture Rail',
    priceCents: 4200,
    durationMinutes,
    departureMinutes,
    availableSeats: 8,
    currency: 'EUR',
    synthetic: true,
    priceBasis: 'per-passenger-including-demo-fees',
    direct: true,
    legs: [{
      legIndex: 0,
      mode: 'train',
      carrierName: 'Fixture Rail',
      durationMinutes,
      originId: 'london',
      destinationId: 'paris',
      originLabel: 'London',
      destinationLabel: 'Paris',
    }],
  })
}

function initializedStore() {
  const store = createUIStateStore({ now: () => '2026-12-01T09:00:00.000Z' })
  store.initializeMissing(artifactId, {
    dates: { start: '2026-12-01', end: '2026-12-15' },
    citySequence: ['london', 'paris', 'barcelona'],
    stays: [{ cityId: 'paris', nights: 3 }, { cityId: 'barcelona', nights: 2 }],
    displayWindowByLeg: {
      'london:paris': { from: '2026-12-01', to: '2026-12-07' },
      'paris:barcelona': { from: '2026-12-04', to: '2026-12-10' },
    },
  })
  return store
}

describe('page-scoped travel date bounds', () => {
  it('limits a multi-day trip start to the latest date that preserves its duration', () => {
    expect(latestTripStartDate({ start: '2026-12-08', end: '2026-12-14' }, bounds)).toBe('2026-12-09')
    expect(latestTripStartDate({ start: '2026-12-08' }, bounds)).toBe('2026-12-15')
  })

  it('rejects every direct date escape while leaving unbounded routers unchanged', () => {
    const store = initializedStore()
    const bounded = createActionRouter(store, { dateBounds: bounds })

    expect(bounded({ kind: 'dates', artifactId, dates: { start: '2026-11-30', end: '2026-12-14' } }).status).toBe('stale')
    expect(bounded({ kind: 'calendarDates', artifactId, dates: { start: '2026-12-01', end: '2026-12-16' } }).status).toBe('stale')
    expect(bounded({ kind: 'calendarDateByLeg', artifactId, calendarDateByLeg: { 'london:paris': '2026-12-16' } }).status).toBe('stale')
    expect(bounded({ kind: 'displayWindowByLeg', artifactId, displayWindowByLeg: { 'london:paris': { from: '2026-12-09', to: '2026-12-16' } } }).status).toBe('stale')
    expect(store.get(artifactId).dates).toEqual({ start: '2026-12-01', end: '2026-12-15' })

    const plainStore = initializedStore()
    const plain = createActionRouter(plainStore)
    expect(plain({ kind: 'dates', artifactId, dates: { start: '2026-11-30', end: '2026-12-14' } }).status).toBe('applied')
  })

  it('uses one remaining-night budget across the whole itinerary', () => {
    const store = initializedStore()
    const router = createActionRouter(store, { dateBounds: bounds })
    expect(maximumStayNights(store.get(artifactId), 'paris', bounds)).toBe(8)
    expect(router({
      kind: 'stays',
      artifactId,
      stays: [{ cityId: 'paris', nights: 8 }, { cityId: 'barcelona', nights: 2 }],
    }).status).toBe('applied')
    expect(maximumStayNights(store.get(artifactId), 'barcelona', bounds)).toBe(6)
    expect(router({
      kind: 'stays',
      artifactId,
      stays: [{ cityId: 'paris', nights: 8 }, { cityId: 'barcelona', nights: 7 }],
    }).status).toBe('stale')
    expect(stateRespectsDateBounds(store.get(artifactId), bounds)).toBe(true)
  })

  it('retains December 15 service rows but blocks selection when arrival crosses the cutoff', async () => {
    const sameDay = fare('same-day', 1_200, 120)
    const overnight = fare('overnight', 1_380, 180)
    const fixture = createFixedProjectionFixture({ rows: [sameDay, overnight], sourceVersion: 'bounded-arrival-v1' })
    const scope = fixture.scope({
      originId: 'london',
      destinationId: 'paris',
      dateWindow: { from: '2026-12-15', to: '2026-12-15' },
      passengers: 1,
      earliestDeparture: { date: '2026-12-15', minutes: 0 },
    })
    const manifest = await fixture.bridge.loadScope(scope, new AbortController().signal)
    const binding = fixture.bridge.getBinding(manifest.resourceKey)
    await fixture.bridge.executeGroup({
      groupId: 'cache-arrival-boundary',
      scope,
      projections: [{
        projectionId: 'arrival-page',
        kind: 'farePage',
        filters: { modes: [], carrierIds: [], directOnly: false },
        serviceDate: null,
        sort: { field: 'departureMinutes', direction: 'asc' },
        after: null,
        limit: 100,
      }],
    }, new AbortController().signal)

    const store = createUIStateStore({ now: () => '2026-12-15T09:00:00.000Z' })
    store.initializeMissing(artifactId, {
      dates: { start: '2026-12-15' },
      citySequence: ['london', 'paris'],
      datasetRefs: [binding.datasetId],
    })
    const router = createActionRouter(store, { bridge: fixture.bridge, dateBounds: bounds })
    expect(router({ kind: 'select', artifactId, fareId: FareIdSchema.parse(overnight.id), selected: true }).status).toBe('stale')
    expect(router({ kind: 'select', artifactId, fareId: FareIdSchema.parse(sameDay.id), selected: true }).status).toBe('applied')
    expect(store.get(artifactId).selectedFareIds).toEqual([FareIdSchema.parse(sameDay.id)])
    router.dispose()
  })
})
