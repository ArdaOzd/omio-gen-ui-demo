import { describe, expect, it, vi } from 'vitest'
import { FareItemSchema, QueryGroupsRequestSchema, ResourceKeySchema } from '../contracts/query-groups'
import { createServerQueryClient, ServerQueryError } from './server-query-client'

const scope = { kind: 'fareScope' as const, originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-26', to: '2026-10-26' }, passengers: 1, earliestDeparture: { date: '2026-10-26', minutes: 0 } }
const request = QueryGroupsRequestSchema.parse({ version: 1, requestId: 'request-1', expectedSourceVersion: null, groups: [{ groupId: 'group-1', scope, projections: [] }] })
const manifest = { kind: 'fareScopeManifest', resourceKey: 'scope-1', source: { kind: 'search', descriptorId: 'scope-1', sourceVersion: 'source-1' }, coverage: scope, totalAvailable: 1, availableModes: ['train'], availableDateWindow: scope.dateWindow, complete: true }
const item = FareItemSchema.parse({ id: 'fare-1', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-26', mode: 'train', carrierId: 'carrier-rail', carrierName: 'Rail', priceCents: 2500, durationMinutes: 160, departureMinutes: 1080, availableSeats: 4, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true, legs: [{ legIndex: 0, mode: 'train', carrierName: 'Rail', durationMinutes: 160, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }] })

describe('server query client', () => {
  it('posts and validates query groups and source identity', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ version: 1, requestId: 'request-1', sourceVersion: 'source-1', groups: [{ groupId: 'group-1', manifest, projections: [] }] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const result = await createServerQueryClient({ fetch: fetcher }).queryGroups(request, new AbortController().signal)
    expect(result.groups[0]?.manifest.resourceKey).toBe('scope-1')
    expect(fetcher).toHaveBeenCalledWith('/api/query-groups', expect.objectContaining({ method: 'POST' }))
  })

  it('preserves typed service errors and validates lookup source', async () => {
    const failed = createServerQueryClient({ fetch: async () => new Response(JSON.stringify({ version: 1, requestId: 'request-1', error: { code: 'staleCursor', message: 'Expired cursor' } }), { status: 409 }) })
    await expect(failed.queryGroups(request, new AbortController().signal)).rejects.toMatchObject({ code: 'staleCursor', status: 409 } satisfies Partial<ServerQueryError>)

    const lookup = createServerQueryClient({ fetch: async () => new Response(JSON.stringify({ version: 1, requestId: 'lookup-1', sourceVersion: 'source-1', items: [item], missingPins: [] }), { status: 200 }) })
    await expect(lookup.lookupPins({ version: 1, requestId: 'lookup-1', sourceVersion: 'source-1', pins: [{ fareId: item.id, resourceKey: ResourceKeySchema.parse('scope-1') }] }, new AbortController().signal)).resolves.toMatchObject({ items: [{ id: 'fare-1' }] })
  })

  it('rejects duplicate group identities and omitted lookup pins', async () => {
    const twoGroups = QueryGroupsRequestSchema.parse({
      version: 1,
      requestId: 'request-2',
      expectedSourceVersion: null,
      groups: [
        { groupId: 'group-1', scope, projections: [] },
        { groupId: 'group-2', scope, projections: [] },
      ],
    })
    const duplicateGroups = createServerQueryClient({
      fetch: async () => new Response(JSON.stringify({
        version: 1,
        requestId: 'request-2',
        sourceVersion: 'source-1',
        groups: [
          { groupId: 'group-1', manifest, projections: [] },
          { groupId: 'group-1', manifest, projections: [] },
        ],
      }), { status: 200 }),
    })
    await expect(duplicateGroups.queryGroups(twoGroups, new AbortController().signal)).rejects.toThrow('group identity mismatch')

    const omittedLookup = createServerQueryClient({
      fetch: async () => new Response(JSON.stringify({
        version: 1,
        requestId: 'lookup-2',
        sourceVersion: 'source-1',
        items: [],
        missingPins: [],
      }), { status: 200 }),
    })
    await expect(omittedLookup.lookupPins({
      version: 1,
      requestId: 'lookup-2',
      sourceVersion: 'source-1',
      pins: [{ fareId: item.id, resourceKey: ResourceKeySchema.parse('scope-1') }],
    }, new AbortController().signal)).rejects.toThrow('omitted a requested pin')
  })
})
