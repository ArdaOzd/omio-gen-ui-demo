import { describe, expect, it } from 'vitest'
import { FareItemSchema, type FareScope } from '../contracts/query-groups'
import { assertNoBulkData } from '../contracts/privacy'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'

const scope: FareScope = {
  kind: 'fareScope', originId: 'london', destinationId: 'paris',
  dateWindow: { from: '2026-10-02', to: '2026-10-02' }, passengers: 1,
  earliestDeparture: { date: '2026-10-02', minutes: 0 },
}
const named = FareItemSchema.parse({
  id: 'same-fare', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-02', mode: 'bus',
  carrierId: 'carrier-1ixeerp', carrierName: 'Blablacar Bus', priceCents: 2103, durationMinutes: 120,
  departureMinutes: 540, availableSeats: 9, currency: 'EUR', synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees', direct: true,
  legs: [{ legIndex: 0, mode: 'bus', carrierName: 'Blablacar Bus', durationMinutes: 120, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
})
const filters = { modes: [] as Array<'bus'>, carrierIds: [] as string[], directOnly: false }

describe('authoritative carrier labels', () => {
  it('retains source carrier names through page results, pin lookup, and the bridge label index', async () => {
    const fixture = createFixedProjectionFixture({ rows: [named] })
    const manifest = await fixture.bridge.loadScope(scope, new AbortController().signal)
    const page = await fixture.bridge.executeGroup({
      groupId: 'page', scope, projections: [{
        projectionId: 'page', kind: 'farePage', filters, serviceDate: null,
        sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 10,
      }],
    }, new AbortController().signal)
    expect(page.projections[0]).toMatchObject({ items: [{ carrierId: named.carrierId, carrierName: named.carrierName }] })
    const lookup = await fixture.bridge.lookupPins({
      version: 1, requestId: 'lookup', sourceVersion: manifest.source.sourceVersion,
      pins: [{ fareId: named.id, resourceKey: manifest.resourceKey }],
    }, new AbortController().signal)
    expect(lookup.items[0]).toMatchObject({ carrierId: named.carrierId, carrierName: named.carrierName })
    expect(fixture.bridge.getCarrierLabel(named.carrierId, manifest.resourceKey)).toBe('Blablacar Bus')
  })

  it('orders nullable carrier names without relaxing the privacy boundary', async () => {
    const legacy = FareItemSchema.parse({ ...named, id: 'legacy', carrierName: null })
    const fixture = createFixedProjectionFixture({ rows: [legacy, { ...named, id: FareItemSchema.shape.id.parse('named') }] })
    const result = await fixture.bridge.executeGroup({
      groupId: 'facets', scope, projections: [{ projectionId: 'facets', kind: 'carrierFacets', filters }],
    }, new AbortController().signal)
    expect(result.projections[0]).toMatchObject({ options: [{ carrierId: named.carrierId, count: 2 }] })
    expect(() => assertNoBulkData({ hidden: { const: [legacy] } })).toThrow('Copied normalized fare data')
  })

  it('keeps labels source-scoped and removes a released resource label', async () => {
    const updated = FareItemSchema.parse({ ...named, id: 'updated', carrierName: 'Updated API provider', serviceDate: '2026-10-03' })
    const fixture = createFixedProjectionFixture({ rows: [named, updated], sourceDateWindow: { from: '2026-10-02', to: '2026-10-03' } })
    const first = await fixture.bridge.loadScope(scope, new AbortController().signal)
    const secondScope = { ...scope, dateWindow: { from: '2026-10-03', to: '2026-10-03' }, earliestDeparture: { date: '2026-10-03', minutes: 0 } }
    const second = await fixture.bridge.loadScope(secondScope, new AbortController().signal)
    await fixture.bridge.executeGroup({ groupId: 'first', scope, projections: [{ projectionId: 'page', kind: 'farePage', filters, serviceDate: null, sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 10 }] }, new AbortController().signal)
    await fixture.bridge.executeGroup({ groupId: 'second', scope: secondScope, projections: [{ projectionId: 'page', kind: 'farePage', filters, serviceDate: null, sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 10 }] }, new AbortController().signal)
    expect(fixture.bridge.getCarrierLabel(named.carrierId, first.resourceKey)).toBe('Blablacar Bus')
    expect(fixture.bridge.getCarrierLabel(named.carrierId, second.resourceKey)).toBe('Updated API provider')
    expect(fixture.bridge.getCarrierLabel(named.carrierId)).toBeUndefined()
    fixture.bridge.release(first.resourceKey)
    expect(fixture.bridge.getCarrierLabel(named.carrierId, first.resourceKey)).toBeUndefined()
    expect(fixture.bridge.getCarrierLabel(named.carrierId)).toBe('Updated API provider')
  })

  it('uses stable carrier IDs while returning authoritative names in exclude-self facets', async () => {
    const fixture = createFixedProjectionFixture({ rows: [named] })
    const result = await fixture.bridge.executeGroup({
      groupId: 'carriers', scope, projections: [{
        projectionId: 'carriers', kind: 'carrierFacets', filters: { ...filters, carrierIds: [named.carrierId] },
      }],
    }, new AbortController().signal)
    expect(result.projections[0]).toMatchObject({ options: [{ carrierId: 'carrier-1ixeerp', carrierName: 'Blablacar Bus', count: 1 }] })
  })
})
