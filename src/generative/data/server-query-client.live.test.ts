import { describe, expect, it } from 'vitest'
import {
  QueryGroupsRequestSchema,
  type FareItem,
  type ProjectionFilters,
  type ProjectionRequest,
} from '../contracts/query-groups'
import { createServerQueryClient, ServerQueryError } from './server-query-client'

const liveBackend = process.env.LIVE_BACKEND_URL
const live = describe.runIf(liveBackend)
const client = createServerQueryClient({ baseUrl: liveBackend })
const signal = () => new AbortController().signal
const scope = {
  kind: 'fareScope' as const,
  originId: 'london',
  destinationId: 'paris',
  dateWindow: { from: '2026-10-26', to: '2026-11-05' },
  passengers: 1,
  earliestDeparture: { date: '2026-10-26', minutes: 1020 },
}
const filters = { modes: [] as Array<'train' | 'bus' | 'flight' | 'ferry'>, carrierIds: [], directOnly: false }

function request(requestId: string, projections: ProjectionRequest[], expectedSourceVersion: string | null = null) {
  return QueryGroupsRequestSchema.parse({
    version: 1,
    requestId,
    expectedSourceVersion,
    groups: [{ groupId: 'live:london:paris', scope, projections }],
  })
}

function chronological(item: FareItem): [string, number, string] {
  return [item.serviceDate, item.departureMinutes, item.id]
}

live('server query client live wire', () => {
  it('validates manifest-only and all five fixed projection variants', async () => {
    const manifestOnly = await client.queryGroups(request('live-manifest', []), signal())
    const manifest = manifestOnly.groups[0]?.manifest
    expect(manifestOnly.groups[0]?.projections).toEqual([])
    expect(manifest).toMatchObject({
      complete: true,
      coverage: scope,
      source: { sourceVersion: manifestOnly.sourceVersion },
    })
    expect(manifest?.totalAvailable).toBeGreaterThan(0)

    const response = await client.queryGroups(request('live-all-variants', [
      { projectionId: 'page', kind: 'farePage', filters, serviceDate: null, sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 3 },
      { projectionId: 'calendar', kind: 'calendarDays', filters, objective: 'cheapest' },
      { projectionId: 'facets', kind: 'carrierFacets', filters },
      { projectionId: 'modes', kind: 'modeSummary', filters, baseline: 'withoutModeFilter' },
      { projectionId: 'highlights', kind: 'fareHighlights', filters },
    ], manifestOnly.sourceVersion), signal())
    expect(response.groups[0]?.projections.map(projection => projection.kind)).toEqual([
      'farePage',
      'calendarDays',
      'carrierFacets',
      'modeSummary',
      'fareHighlights',
    ])
    expect(response.sourceVersion).toBe(manifestOnly.sourceVersion)
  })

  it('validates cursor page two, chronological ordering, lookup scalars, and source errors', async () => {
    const firstResponse = await client.queryGroups(request('live-page-1', [
      { projectionId: 'page', kind: 'farePage', filters, serviceDate: null, sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 3 },
    ]), signal())
    const firstGroup = firstResponse.groups[0]
    const first = firstGroup?.projections[0]
    if (!firstGroup || first?.kind !== 'farePage' || !first.pageInfo.nextCursor) throw new Error('Live fixture did not produce a second page')

    const secondResponse = await client.queryGroups(request('live-page-2', [
      { projectionId: 'page', kind: 'farePage', filters, serviceDate: null, sort: { field: 'departureMinutes', direction: 'asc' }, after: first.pageInfo.nextCursor, limit: 3 },
    ], firstResponse.sourceVersion), signal())
    const second = secondResponse.groups[0]?.projections[0]
    if (second?.kind !== 'farePage') throw new Error('Live fixture omitted page two')
    expect(second.pageInfo.total).toBe(first.pageInfo.total)
    expect(new Set([...first.items, ...second.items].map(item => item.id)).size).toBe(first.items.length + second.items.length)
    const ordered = [...first.items, ...second.items].map(chronological)
    expect(ordered).toEqual([...ordered].sort((left, right) => left[0].localeCompare(right[0]) || left[1] - right[1] || left[2].localeCompare(right[2])))

    const fare = first.items[0]
    if (!fare) throw new Error('Live fixture returned no fare')
    const lookup = await client.lookupPins({
      version: 1,
      requestId: 'live-lookup',
      sourceVersion: firstResponse.sourceVersion,
      pins: [{ fareId: fare.id, resourceKey: firstGroup.manifest.resourceKey }],
    }, signal())
    const lookedUp = lookup.items[0]
    expect(lookedUp).toMatchObject({
      id: fare.id,
      priceCents: expect.any(Number),
      durationMinutes: expect.any(Number),
      departureMinutes: expect.any(Number),
      availableSeats: expect.any(Number),
    })
    expect(lookedUp?.carrierName === null || typeof lookedUp?.carrierName === 'string').toBe(true)

    await expect(client.queryGroups(request('live-stale-source', [], 'sqlite-demo-v2-stale'), signal()))
      .rejects.toMatchObject({ code: 'sourceChanged', status: 409 } satisfies Partial<ServerQueryError>)
  })

  it('validates ordered connection legs and truthful direct-only filtering', async () => {
    const flightFilters: ProjectionFilters = { ...filters, modes: ['flight'] }
    const allFlightsResponse = await client.queryGroups(request('live-connecting-flights', [{
      projectionId: 'flights',
      kind: 'farePage',
      filters: flightFilters,
      serviceDate: null,
      sort: { field: 'priceCents', direction: 'asc' },
      after: null,
      limit: 100,
    }]), signal())
    const allFlights = allFlightsResponse.groups[0]?.projections[0]
    if (allFlights?.kind !== 'farePage') throw new Error('Live fixture omitted flight fares')
    const connecting = allFlights.items.find(item => !item.direct)
    expect(connecting).toBeDefined()
    expect(connecting?.legs.length).toBeGreaterThan(1)
    expect(connecting?.legs.map(leg => leg.legIndex)).toEqual(connecting?.legs.map((_leg, index) => index))

    const directFlightsResponse = await client.queryGroups(request('live-direct-flights', [{
      projectionId: 'direct-flights',
      kind: 'farePage',
      filters: { ...flightFilters, directOnly: true },
      serviceDate: null,
      sort: { field: 'priceCents', direction: 'asc' },
      after: null,
      limit: 100,
    }], allFlightsResponse.sourceVersion), signal())
    const directFlights = directFlightsResponse.groups[0]?.projections[0]
    if (directFlights?.kind !== 'farePage') throw new Error('Live fixture omitted direct flight fares')
    expect(directFlights.items.every(item => item.direct && item.legs.length <= 1)).toBe(true)
    expect(directFlights.pageInfo.total).toBeLessThan(allFlights.pageInfo.total)
  })

  it('returns stable partial and unavailable manifests outside the source horizon', async () => {
    const manifestFor = async (requestId: string, from: string, to: string) => {
      const response = await client.queryGroups(QueryGroupsRequestSchema.parse({
        version: 1,
        requestId,
        expectedSourceVersion: null,
        groups: [{
          groupId: requestId,
          scope: {
            ...scope,
            dateWindow: { from, to },
            earliestDeparture: { date: from, minutes: 0 },
          },
          projections: [],
        }],
      }), signal())
      return response.groups[0]?.manifest
    }
    await expect(manifestFor('live-partial-horizon', '2026-10-01', '2026-10-09')).resolves.toMatchObject({
      availableDateWindow: { from: '2026-10-08', to: '2026-10-09' },
      complete: false,
    })
    await expect(manifestFor('live-outside-horizon', '2026-10-01', '2026-10-02')).resolves.toMatchObject({
      availableDateWindow: null,
      complete: false,
      totalAvailable: 0,
      availableModes: [],
    })
  })
})
