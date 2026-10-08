import { describe, expect, it } from 'vitest'
import { ArtifactIdSchema, FareIdSchema, UIStateRevisionSchema } from '../contracts'
import { FareItemSchema, type FareItem, type FareScope } from '../contracts/query-groups'
import { createUIStateStore } from '../state/ui-state-store'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'

const scope: FareScope = {
  kind: 'fareScope', originId: 'london', destinationId: 'paris',
  dateWindow: { from: '2026-10-02', to: '2026-10-02' }, passengers: 2,
  earliestDeparture: { date: '2026-10-02', minutes: 0 },
}
const fare = (id: string, mode: 'train' | 'bus', priceCents: number): FareItem => FareItemSchema.parse({
  id, originId: 'london', destinationId: 'paris', serviceDate: '2026-10-02', mode,
  carrierId: 'test', carrierName: 'Test Rail', priceCents, durationMinutes: 120,
  departureMinutes: 600, availableSeats: 4, currency: 'EUR', synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees', direct: true,
  legs: [{ legIndex: 0, mode, carrierName: 'Test Rail', durationMinutes: 120, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
})
const first = fare('fare-1', 'train', 3000)
const second = fare('fare-2', 'bus', 1000)
const filters = { modes: [] as Array<'train' | 'bus'>, carrierIds: [] as string[], directOnly: false }

describe('server fare data and artifact state', () => {
  it('loads one logical scope and keeps server completeness separate from page materialization', async () => {
    let calls = 0
    const fixture = createFixedProjectionFixture({ rows: () => { calls += 1; return [first, second] } })
    const manifest = await fixture.bridge.loadScope(scope, new AbortController().signal)
    const group = await fixture.bridge.executeGroup({
      groupId: 'page', scope, projections: [{
        projectionId: 'page', kind: 'farePage', filters, serviceDate: null,
        sort: { field: 'priceCents', direction: 'asc' }, after: null, limit: 1,
      }],
    }, new AbortController().signal)
    expect(calls).toBe(2)
    expect(manifest).toMatchObject({ complete: true, totalAvailable: 2 })
    expect(group.projections[0]).toMatchObject({
      items: [{ id: second.id }],
      pageInfo: { total: 2, returned: 1, hasNextPage: true },
    })
  })

  it('keeps selected lookup facts after the bounded projection cache is evicted', async () => {
    const fixture = createFixedProjectionFixture({ rows: [first, second] })
    const bridge = fixture.bridge
    const manifest = await bridge.loadScope(scope, new AbortController().signal)
    await bridge.lookupPins({
      version: 1, requestId: 'pin', sourceVersion: manifest.source.sourceVersion,
      pins: [{ fareId: first.id, resourceKey: manifest.resourceKey }],
    }, new AbortController().signal)
    bridge.release(manifest.resourceKey)
    expect(bridge.findCachedFare(first.id, manifest.resourceKey)).toEqual(first)
    expect(() => bridge.getManifest(manifest.resourceKey)).toThrow(/expired/i)
  })

  it('represents source windows outside the requested dates without retrying or inventing rows', async () => {
    const fixture = createFixedProjectionFixture({
      rows: [first, second], sourceDateWindow: { from: '2026-10-02', to: '2026-10-02' },
    })
    const outside = { ...scope, dateWindow: { from: '2026-10-03', to: '2026-10-03' }, earliestDeparture: { date: '2026-10-03', minutes: 0 } }
    const manifest = await fixture.bridge.loadScope(outside, new AbortController().signal)
    expect(manifest).toMatchObject({ complete: false, availableDateWindow: null, totalAvailable: 0, availableModes: [] })
  })

  it('preserves newer clicks and isolates two artifacts sharing one server scope', () => {
    const a = ArtifactIdSchema.parse('artifact-a'); const b = ArtifactIdSchema.parse('artifact-b')
    const store = createUIStateStore()
    store.initializeMissing(a, { dates: { start: '2026-10-02' } })
    store.initializeMissing(b, { dates: { start: '2026-10-02' } })
    expect(store.dispatch({ kind: 'select', artifactId: a, fareId: FareIdSchema.parse(first.id), selected: true }).status).toBe('applied')
    const current = store.get(a).revision
    store.initializeMissing(a, { selectedFareIds: [], revision: UIStateRevisionSchema.parse(0) })
    expect(store.get(a).selectedFareIds).toEqual([first.id])
    expect(store.dispatch({ kind: 'select', artifactId: a, fareId: FareIdSchema.parse(second.id), selected: true, expectedRevision: UIStateRevisionSchema.parse(0) }).status).toBe('stale')
    expect(store.dispatch({ kind: 'select', artifactId: a, fareId: FareIdSchema.parse(second.id), selected: true, expectedRevision: current }).status).toBe('applied')
    expect(store.get(b).selectedFareIds).toEqual([])
    expect(store.exportSnapshot(a).selectedFareIds).toEqual([first.id, second.id])
  })
})
