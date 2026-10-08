import { describe, expect, it } from 'vitest'
import {
  FareItemSchema,
  QueryGroupsRequestSchema,
  QueryGroupsResponseSchema,
} from './query-groups'

const filters = { modes: ['train'] as const, carrierIds: [], directOnly: false }
const scope = {
  kind: 'fareScope' as const,
  originId: 'london',
  destinationId: 'paris',
  dateWindow: { from: '2026-10-26', to: '2026-10-28' },
  passengers: 1,
  earliestDeparture: { date: '2026-10-26', minutes: 600 },
}

const item = FareItemSchema.parse({
  id: 'fare-1', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-26', mode: 'train',
  carrierId: 'carrier-rail', carrierName: null, priceCents: 2500, durationMinutes: 160,
  departureMinutes: 1080, availableSeats: 4, currency: 'EUR', synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees', direct: true,
})

describe('fixed query-group contracts', () => {
  it('accepts the closed projection union and manifest-only groups', () => {
    expect(QueryGroupsRequestSchema.parse({ version: 1, requestId: 'request-1', expectedSourceVersion: null, groups: [
      { groupId: 'manifest', scope, projections: [] },
      { groupId: 'views', scope, projections: [
        { projectionId: 'page', kind: 'farePage', filters, serviceDate: null, sort: { field: 'priceCents', direction: 'asc' }, after: null, limit: 25 },
        { projectionId: 'calendar', kind: 'calendarDays', filters, objective: 'cheapest' },
        { projectionId: 'carriers', kind: 'carrierFacets', filters },
        { projectionId: 'modes', kind: 'modeSummary', filters, baseline: 'withoutModeFilter' },
        { projectionId: 'highlights', kind: 'fareHighlights', filters },
      ] },
    ] }).groups).toHaveLength(2)
  })

  it('rejects arbitrary query fields and inconsistent page metadata', () => {
    expect(() => QueryGroupsRequestSchema.parse({ version: 1, requestId: 'request-1', expectedSourceVersion: null, groups: [{
      groupId: 'bad', scope, projections: [{ projectionId: 'bad', kind: 'farePage', filters, serviceDate: null, sort: { field: 'priceCents', direction: 'asc' }, after: null, limit: 25, sql: 'select *' }],
    }] })).toThrow()
    expect(() => QueryGroupsResponseSchema.parse({ version: 1, requestId: 'request-1', sourceVersion: 'source-1', groups: [{
      groupId: 'views',
      manifest: { kind: 'fareScopeManifest', resourceKey: 'scope-1', source: { kind: 'search', descriptorId: 'scope-1', sourceVersion: 'source-1' }, coverage: scope, totalAvailable: 1, availableModes: ['train'], complete: true },
      projections: [{ projectionId: 'page', kind: 'farePage', inputHash: 'input-1', resultFingerprint: 'result-1', items: [item], pageInfo: { total: 1, returned: 0, hasNextPage: false, nextCursor: null } }],
    }] })).toThrow(/Returned count/)
  })
})
