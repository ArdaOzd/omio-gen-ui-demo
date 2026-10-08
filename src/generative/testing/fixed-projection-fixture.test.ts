import { describe, expect, it } from 'vitest'
import { FareItemSchema } from '../contracts/query-groups'
import { createFixedProjectionFixture } from './fixed-projection-fixture'

const direct = FareItemSchema.parse({
  id: 'fare-direct', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-26', mode: 'train',
  carrierId: 'carrier-rail', carrierName: 'Rail', priceCents: 3500, durationMinutes: 160, departureMinutes: 600,
  availableSeats: 8, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true,
  legs: [{ legIndex: 0, mode: 'train', carrierName: 'Rail', durationMinutes: 160, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
})
const connected = FareItemSchema.parse({
  ...direct, id: 'fare-connected', mode: 'flight', carrierId: 'carrier-air', carrierName: 'Air', priceCents: 2500,
  durationMinutes: 200, departureMinutes: 700, direct: false,
  legs: [
    { legIndex: 0, mode: 'flight', carrierName: 'Air', durationMinutes: 100, originId: 'london', destinationId: 'frankfurt', originLabel: 'London', destinationLabel: 'Frankfurt' },
    { legIndex: 1, mode: 'flight', carrierName: 'Air', durationMinutes: 100, originId: 'frankfurt', destinationId: 'paris', originLabel: 'Frankfurt', destinationLabel: 'Paris' },
  ],
})
const filters = { modes: [] as Array<'train' | 'flight'>, carrierIds: [] as string[], directOnly: false }

describe('fixed projection fixture', () => {
  it('serves only the closed projection union with production bridge semantics', async () => {
    const fixture = createFixedProjectionFixture({ rows: [direct, connected], sourceDateWindow: { from: '2026-10-26', to: '2026-10-27' } })
    const scope = fixture.scope({
      originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-26', to: '2026-10-27' },
      passengers: 1, earliestDeparture: { date: '2026-10-26', minutes: 0 },
    })
    const manifest = await fixture.bridge.loadScope(scope, new AbortController().signal)
    const result = await fixture.bridge.executeGroup({
      groupId: 'fixture-group', scope, projections: [
        { projectionId: 'page', kind: 'farePage', filters, serviceDate: null, sort: { field: 'priceCents', direction: 'asc' }, after: null, limit: 10 },
        { projectionId: 'calendar', kind: 'calendarDays', filters, objective: 'cheapest' },
        { projectionId: 'carriers', kind: 'carrierFacets', filters: { ...filters, carrierIds: ['carrier-rail'] } },
        { projectionId: 'modes', kind: 'modeSummary', filters: { ...filters, modes: ['train'] }, baseline: 'withoutModeFilter' },
        { projectionId: 'highlights', kind: 'fareHighlights', filters },
      ],
    }, new AbortController().signal)
    expect(manifest).toMatchObject({ complete: true, totalAvailable: 2 })
    expect(result.projections.map(projection => projection.kind)).toEqual(['farePage', 'calendarDays', 'carrierFacets', 'modeSummary', 'fareHighlights'])
    expect(result.projections[0]).toMatchObject({ items: [{ id: 'fare-connected' }, { id: 'fare-direct' }] })
    expect(result.projections[2]).toMatchObject({ options: [{ carrierId: 'carrier-air' }, { carrierId: 'carrier-rail' }] })
    expect(result.projections[3]).toMatchObject({ modes: [{ mode: 'train' }, { mode: 'flight' }] })
    expect(result.projections[4]).toMatchObject({ cheapest: { id: 'fare-connected' }, fastest: { id: 'fare-direct' } })

    const directOnly = await fixture.bridge.executeGroup({
      groupId: 'direct-only', scope, projections: [{
        projectionId: 'page', kind: 'farePage', filters: { ...filters, directOnly: true }, serviceDate: null,
        sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 10,
      }],
    }, new AbortController().signal)
    expect(directOnly.projections[0]).toMatchObject({ items: [{ id: 'fare-direct' }] })

    const lookup = await fixture.bridge.lookupPins({
      version: 1, requestId: 'lookup', sourceVersion: manifest.source.sourceVersion,
      pins: [{ fareId: connected.id, resourceKey: manifest.resourceKey }],
    }, new AbortController().signal)
    expect(lookup.items[0]).toEqual(connected)
  })

  it('reports unavailable fixture coverage once and returns bounded empty projections', async () => {
    const fixture = createFixedProjectionFixture({ rows: [direct], sourceDateWindow: { from: '2026-10-26', to: '2026-10-27' } })
    const scope = fixture.scope({
      originId: 'london', destinationId: 'paris', dateWindow: { from: '2028-01-01', to: '2028-01-02' },
      passengers: 1, earliestDeparture: { date: '2028-01-01', minutes: 0 },
    })
    const manifest = await fixture.bridge.loadScope(scope, new AbortController().signal)
    const result = await fixture.bridge.executeGroup({
      groupId: 'outside', scope, projections: [{ projectionId: 'calendar', kind: 'calendarDays', filters, objective: 'cheapest' }],
    }, new AbortController().signal)
    expect(manifest).toMatchObject({ availableDateWindow: null, complete: false, totalAvailable: 0, availableModes: [] })
    expect(result.projections[0]).toMatchObject({ days: [] })
  })
})
