import { describe, expect, it } from 'vitest'
import { ArtifactIdSchema, DatasetIdSchema, DatasetRevisionSchema, UIStateRevisionSchema } from '../contracts'
import {
  FareItemSchema,
  QueryGroupsResponseSchema,
  ResourceKeySchema,
  type QueryGroupsRequest,
} from '../contracts/query-groups'
import { createFareDataBridge } from './fare-data-bridge'
import { ServerQueryError, type ServerQueryClient } from './server-query-client'

const scope = {
  kind: 'fareScope' as const,
  originId: 'london',
  destinationId: 'paris',
  dateWindow: { from: '2026-10-26', to: '2026-10-27' },
  passengers: 1,
  earliestDeparture: { date: '2026-10-26', minutes: 0 },
}
const item = FareItemSchema.parse({
  id: 'fare-1',
  originId: 'london',
  destinationId: 'paris',
  serviceDate: '2026-10-26',
  mode: 'train',
  carrierId: 'carrier-rail',
  carrierName: 'Rail',
  priceCents: 2500,
  durationMinutes: 160,
  departureMinutes: 1080,
  availableSeats: 4,
  currency: 'EUR',
  synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees',
  direct: true,
  legs: [{ legIndex: 0, mode: 'train', carrierName: 'Rail', durationMinutes: 160, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
})

function response(request: QueryGroupsRequest, sourceVersion = 'source-1') {
  return QueryGroupsResponseSchema.parse({
    version: 1,
    requestId: request.requestId,
    sourceVersion,
    groups: request.groups.map(group => ({
      groupId: group.groupId,
      manifest: {
        kind: 'fareScopeManifest',
        resourceKey: 'scope-1',
        source: { kind: 'search', descriptorId: 'scope-1', sourceVersion },
        coverage: scope,
        totalAvailable: 1,
        availableModes: ['train'],
        availableDateWindow: scope.dateWindow,
        complete: true,
      },
      projections: group.projections.map(projection => ({
        kind: 'farePage',
        projectionId: projection.projectionId,
        inputHash: 'server-input',
        resultFingerprint: 'server-result',
        items: [item],
        pageInfo: { total: 1, returned: 1, hasNextPage: false, nextCursor: null },
      })),
    })),
  })
}

describe('server fare data bridge', () => {
  it('loads a logical scope with no fare projection and reuses its stable binding', async () => {
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
    const second = await bridge.loadScope(scope, new AbortController().signal)
    expect(requests).toHaveLength(1)
    expect(requests[0]?.groups[0]?.projections).toEqual([])
    expect(second.resourceKey).toBe(manifest.resourceKey)
    expect(bridge.getBinding(manifest.resourceKey)).toMatchObject({ datasetRevision: 1, datasetId: 'scope-1' })
  })

  it('keeps looked-up pins independently from evicted projection items', async () => {
    const client: ServerQueryClient = {
      queryGroups: async request => response(request),
      lookupPins: async input => ({
        version: 1,
        requestId: input.requestId,
        sourceVersion: input.sourceVersion,
        items: [item],
        missingPins: [],
      }),
    }
    const bridge = createFareDataBridge({ client, maxProjectionItems: 1, maxPinnedItems: 2 })
    const manifest = await bridge.loadScope(scope, new AbortController().signal)
    await bridge.lookupPins({
      version: 1,
      requestId: 'lookup-1',
      sourceVersion: 'source-1',
      pins: [{ fareId: item.id, resourceKey: ResourceKeySchema.parse('scope-1') }],
    }, new AbortController().signal)
    bridge.release(manifest.resourceKey)
    expect(bridge.findCachedFare(item.id, manifest.resourceKey)).toEqual(item)
  })

  it('caches a stable unavailable manifest instead of retrying an outside horizon', async () => {
    let calls = 0
    const outside = {
      ...scope,
      dateWindow: { from: '2028-01-01', to: '2028-01-03' },
      earliestDeparture: { date: '2028-01-01', minutes: 0 },
    }
    const client: ServerQueryClient = {
      queryGroups: async request => {
        calls += 1
        return QueryGroupsResponseSchema.parse({
          version: 1,
          requestId: request.requestId,
          sourceVersion: 'source-1',
          groups: request.groups.map(group => ({
            groupId: group.groupId,
            manifest: {
              kind: 'fareScopeManifest',
              resourceKey: 'scope-outside',
              source: { kind: 'search', descriptorId: 'scope-outside', sourceVersion: 'source-1' },
              coverage: outside,
              totalAvailable: 0,
              availableModes: [],
              availableDateWindow: null,
              complete: false,
            },
            projections: [],
          })),
        })
      },
      lookupPins: async () => { throw new Error('unused') },
    }
    const bridge = createFareDataBridge({ client })
    const first = await bridge.loadScope(outside, new AbortController().signal)
    const second = await bridge.loadScope(outside, new AbortController().signal)
    expect(calls).toBe(1)
    expect(first).toMatchObject({ complete: false, availableDateWindow: null, totalAvailable: 0 })
    expect(second).toEqual(first)
  })

  it('removes a resource old scope identity when refreshed metadata changes coverage', async () => {
    const requests: QueryGroupsRequest[] = []
    const client: ServerQueryClient = {
      queryGroups: async request => {
        requests.push(request)
        const requestedScope = request.groups[0]?.scope ?? scope
        const result = response(request)
        return QueryGroupsResponseSchema.parse({
          ...result,
          groups: result.groups.map(group => ({
            ...group,
            manifest: { ...group.manifest, coverage: requestedScope },
          })),
        })
      },
      lookupPins: async () => { throw new Error('unused') },
    }
    const bridge = createFareDataBridge({ client })
    const later = { ...scope, earliestDeparture: { date: scope.earliestDeparture.date, minutes: 720 } }

    await bridge.loadScope(scope, new AbortController().signal)
    await bridge.refreshScope(later, new AbortController().signal)
    const restored = await bridge.loadScope(scope, new AbortController().signal)

    expect(requests).toHaveLength(3)
    expect(restored.coverage.earliestDeparture).toEqual(scope.earliestDeparture)
  })

  it('refreshes stale source metadata once before rerunning the fixed projection', async () => {
    const requests: QueryGroupsRequest[] = []
    let rejectedStaleProjection = false
    const client: ServerQueryClient = {
      queryGroups: async request => {
        requests.push(request)
        const hasProjection = request.groups.some(group => group.projections.length > 0)
        if (hasProjection && request.expectedSourceVersion === 'source-1' && !rejectedStaleProjection) {
          rejectedStaleProjection = true
          throw new ServerQueryError(409, 'sourceChanged', 'changed', request.requestId)
        }
        return response(request, rejectedStaleProjection ? 'source-2' : 'source-1')
      },
      lookupPins: async () => { throw new Error('unused') },
    }
    const bridge = createFareDataBridge({ client })
    const manifest = await bridge.loadScope(scope, new AbortController().signal)
    const execution = bridge.coordinator.request({
      group: { artifactId: ArtifactIdSchema.parse('artifact-1'), legKey: 'london:paris', purpose: 'results' },
      projectionKey: 'cards:ordered-fares',
      scope,
      projection: {
        projectionId: 'cards',
        kind: 'farePage',
        filters: { modes: [], carrierIds: [], directOnly: false },
        serviceDate: null,
        sort: { field: 'departureMinutes', direction: 'asc' },
        after: null,
        limit: 20,
      },
      datasetId: DatasetIdSchema.parse(manifest.resourceKey),
      datasetRevision: DatasetRevisionSchema.parse(1),
      sourceVersion: manifest.source.sourceVersion,
      uiRevision: UIStateRevisionSchema.parse(0),
    })
    for (let attempt = 0; attempt < 10 && bridge.coordinator.getState(execution.intent.queryKey)?.status !== 'ready'; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    expect(requests.map(request => ({
      expectedSourceVersion: request.expectedSourceVersion,
      projectionCount: request.groups.reduce((total, group) => total + group.projections.length, 0),
    }))).toEqual([
      { expectedSourceVersion: null, projectionCount: 0 },
      { expectedSourceVersion: 'source-1', projectionCount: 1 },
      { expectedSourceVersion: null, projectionCount: 0 },
      { expectedSourceVersion: 'source-2', projectionCount: 1 },
    ])
    expect(bridge.getBinding(manifest.resourceKey)).toMatchObject({
      datasetRevision: 2,
      manifest: { source: { sourceVersion: 'source-2' } },
    })
    expect(bridge.coordinator.getState(execution.intent.queryKey)).toMatchObject({
      status: 'ready',
      intent: { desiredInputVersion: 2 },
      current: { sourceVersion: 'source-2', datasetRevision: 2 },
    })
  })

  it('invalidates cached projection rows and pins when a stable resource moves to a new source', async () => {
    let sourceVersion = 'source-1'
    const refreshedItem = FareItemSchema.parse({ ...item, priceCents: 3100 })
    const client: ServerQueryClient = {
      queryGroups: async request => response(request, sourceVersion),
      lookupPins: async input => ({
        version: 1,
        requestId: input.requestId,
        sourceVersion: input.sourceVersion,
        items: [refreshedItem],
        missingPins: [],
      }),
    }
    const bridge = createFareDataBridge({ client })
    const manifest = await bridge.loadScope(scope, new AbortController().signal)
    await bridge.executeGroup({
      groupId: 'cache-source-transition',
      scope,
      projections: [{
        projectionId: 'page',
        kind: 'farePage',
        filters: { modes: [], carrierIds: [], directOnly: false },
        serviceDate: null,
        sort: { field: 'departureMinutes', direction: 'asc' },
        after: null,
        limit: 10,
      }],
    }, new AbortController().signal)
    await bridge.lookupPins({
      version: 1,
      requestId: 'pin-source-1',
      sourceVersion,
      pins: [{ fareId: item.id, resourceKey: manifest.resourceKey }],
    }, new AbortController().signal)
    expect(bridge.findCachedFare(item.id, manifest.resourceKey)).toBeDefined()

    sourceVersion = 'source-2'
    const refreshed = await bridge.refreshScope(scope, new AbortController().signal)
    expect(refreshed.resourceKey).toBe(manifest.resourceKey)
    expect(bridge.getBinding(manifest.resourceKey)).toMatchObject({
      datasetRevision: 2,
      manifest: { source: { sourceVersion: 'source-2' } },
    })
    expect(bridge.findCachedFare(item.id, manifest.resourceKey)).toBeUndefined()

    await bridge.lookupPins({
      version: 1,
      requestId: 'pin-source-2',
      sourceVersion,
      pins: [{ fareId: item.id, resourceKey: manifest.resourceKey }],
    }, new AbortController().signal)
    expect(bridge.findCachedFare(item.id, manifest.resourceKey)).toMatchObject({ priceCents: 3100 })
  })
})
