import { describe, expect, it } from 'vitest'
import {
  QueryGroupsRequestSchema,
  type FareItem,
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
})
