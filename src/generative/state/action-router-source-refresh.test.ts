import { describe, expect, it } from 'vitest'
import { ArtifactIdSchema, DatasetIdSchema, QueryGroupsResponseSchema, type QueryGroupsRequest } from '../contracts'
import { FareItemSchema, type FareScope, type QueryGroupRequest } from '../contracts/query-groups'
import { createFareDataBridge } from '../data/fare-data-bridge'
import type { ServerQueryClient } from '../data/server-query-client'
import { createActionRouter } from './action-router'
import { createUIStateStore } from './ui-state-store'

const item = (id: string, originId: string, destinationId: string, serviceDate: string, departureMinutes: number, durationMinutes: number) => FareItemSchema.parse({
  id,
  originId,
  destinationId,
  serviceDate,
  mode: 'train',
  carrierId: 'rail',
  carrierName: 'Rail',
  priceCents: 2500,
  durationMinutes,
  departureMinutes,
  availableSeats: 4,
  currency: 'EUR',
  synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees',
  direct: true,
  legs: [{ legIndex: 0, mode: 'train', carrierName: 'Rail', durationMinutes, originId, destinationId, originLabel: originId, destinationLabel: destinationId }],
})

describe('source-version selection invalidation', () => {
  it('clears the changed leg and downstream selections before rebuilding thresholds', async () => {
    let sourceVersion = 'source-1'
    const fares = [
      item('fare-london-paris', 'london', 'paris', '2026-10-26', 600, 120),
      item('fare-paris-rome', 'paris', 'rome', '2026-10-27', 900, 180),
    ]
    const client: ServerQueryClient = {
      queryGroups: async (request: QueryGroupsRequest) => QueryGroupsResponseSchema.parse({
        version: 1,
        requestId: request.requestId,
        sourceVersion,
        groups: request.groups.map(group => {
          const routeKey = `${group.scope.originId}-${group.scope.destinationId}`
          const matching = fares.filter(fare => fare.originId === group.scope.originId && fare.destinationId === group.scope.destinationId)
          return {
            groupId: group.groupId,
            manifest: {
              kind: 'fareScopeManifest',
              resourceKey: `scope-${routeKey}`,
              source: { kind: 'search', descriptorId: `scope-${routeKey}`, sourceVersion },
              coverage: group.scope,
              totalAvailable: matching.length,
              availableModes: matching.length ? ['train'] : [],
              availableDateWindow: matching.length ? group.scope.dateWindow : null,
              complete: matching.length > 0,
            },
            projections: group.projections.map(projection => {
              if (projection.kind !== 'farePage') throw new Error('This fixture supports fare pages only')
              return { projectionId: projection.projectionId, kind: 'farePage', inputHash: `input-${routeKey}`, resultFingerprint: `result-${routeKey}-${sourceVersion}`, items: matching, pageInfo: { total: matching.length, returned: matching.length, hasNextPage: false, nextCursor: null } }
            }),
          }
        }),
      }),
      lookupPins: async () => { throw new Error('unused') },
    }
    const bridge = createFareDataBridge({ client })
    const firstScope: FareScope = { kind: 'fareScope', originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-26', to: '2026-10-26' }, passengers: 1, earliestDeparture: { date: '2026-10-26', minutes: 0 } }
    const secondScope: FareScope = { kind: 'fareScope', originId: 'paris', destinationId: 'rome', dateWindow: { from: '2026-10-27', to: '2026-10-27' }, passengers: 1, earliestDeparture: { date: '2026-10-27', minutes: 0 } }
    const first = await bridge.loadScope(firstScope, new AbortController().signal)
    const second = await bridge.loadScope(secondScope, new AbortController().signal)
    const page = (scope: FareScope, groupId: string): QueryGroupRequest => ({
      groupId,
      scope,
      projections: [{ projectionId: `${groupId}-page`, kind: 'farePage', filters: { modes: [], carrierIds: [], directOnly: false }, serviceDate: null, sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 20 }],
    })
    await bridge.executeGroup(page(firstScope, 'first'), new AbortController().signal)
    await bridge.executeGroup(page(secondScope, 'second'), new AbortController().signal)

    const artifactId = ArtifactIdSchema.parse('artifact-source-refresh')
    const store = createUIStateStore({ now: () => '2026-10-26T00:00:00.000Z' })
    store.initializeMissing(artifactId, {
      datasetRefs: [DatasetIdSchema.parse(first.resourceKey), DatasetIdSchema.parse(second.resourceKey)],
      citySequence: ['london', 'paris', 'rome'],
      dates: { start: '2026-10-26' },
      stays: [{ cityId: 'paris', nights: 1 }],
      selectedFareIds: [fares[0]!.id, fares[1]!.id],
    })
    const changed: string[] = []
    const router = createActionRouter(store, { bridge, onSourceChanged: (_artifactId, resourceKey) => changed.push(resourceKey) })
    await router.retry(artifactId)

    sourceVersion = 'source-2'
    await bridge.refreshScope(firstScope, new AbortController().signal)
    await router.whenIdle(artifactId)

    expect(store.get(artifactId).selectedFareIds).toEqual([])
    expect(changed).toContain(first.resourceKey)
    const currentSecond = bridge.findBinding(DatasetIdSchema.parse(second.resourceKey))
    expect(currentSecond?.manifest.coverage.earliestDeparture).toEqual({ date: '2026-10-27', minutes: 0 })
    router.dispose()
  })
})
