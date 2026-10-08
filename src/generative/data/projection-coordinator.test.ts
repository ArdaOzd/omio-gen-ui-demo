import { describe, expect, it } from 'vitest'
import { ArtifactIdSchema, DatasetIdSchema, DatasetRevisionSchema, UIStateRevisionSchema } from '../contracts'
import { QueryGroupsResponseSchema, type ProjectionFilters, type QueryGroupsRequest, type QueryGroupsResponse } from '../contracts/query-groups'
import { createProjectionCoordinator, type ProjectionRequirement } from './projection-coordinator'
import { ServerQueryError, type ServerQueryClient } from './server-query-client'

const scope = { kind: 'fareScope' as const, originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-26', to: '2026-10-26' }, passengers: 1, earliestDeparture: { date: '2026-10-26', minutes: 0 } }
const filters: ProjectionFilters = { modes: ['train'], carrierIds: [], directOnly: false }
const group = { artifactId: ArtifactIdSchema.parse('artifact-1'), legKey: 'london:paris', purpose: 'primary' }
const datasetId = DatasetIdSchema.parse('scope-1')
const revision = DatasetRevisionSchema.parse(1)

function requirement(projectionKey: string, uiRevision = 1, limit = 20): ProjectionRequirement {
  return {
    group, projectionKey, scope, datasetId, datasetRevision: revision, uiRevision: UIStateRevisionSchema.parse(uiRevision),
    projection: { projectionId: projectionKey, kind: 'farePage', filters, serviceDate: null, sort: { field: 'priceCents', direction: 'asc' }, after: null, limit },
  }
}

function response(request: QueryGroupsRequest, price = 2500): QueryGroupsResponse {
  return QueryGroupsResponseSchema.parse({ version: 1, requestId: request.requestId, sourceVersion: 'source-1', groups: request.groups.map(item => ({
    groupId: item.groupId,
    manifest: { kind: 'fareScopeManifest', resourceKey: 'scope-1', source: { kind: 'search', descriptorId: 'scope-1', sourceVersion: 'source-1' }, coverage: scope, totalAvailable: 1, availableModes: ['train'], availableDateWindow: scope.dateWindow, complete: true },
    projections: item.projections.map(projection => ({
      projectionId: projection.projectionId, kind: 'farePage' as const, inputHash: 'server-input', resultFingerprint: `result-${price}`,
      items: [{ id: `fare-${price}`, originId: 'london', destinationId: 'paris', serviceDate: '2026-10-26', mode: 'train' as const, carrierId: 'carrier-rail', carrierName: 'Rail', priceCents: price, durationMinutes: 160, departureMinutes: 1080, availableSeats: 4, currency: 'EUR' as const, synthetic: true as const, priceBasis: 'per-passenger-including-demo-fees' as const, direct: true, legs: [{ legIndex: 0, mode: 'train' as const, carrierName: 'Rail', durationMinutes: 160, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }] }],
      pageInfo: { total: 1, returned: 1, hasNextPage: false, nextCursor: null },
    })),
  })) })
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

describe('projection coordinator', () => {
  it('coalesces compatible requirements and ignores unrelated UI revisions', async () => {
    const requests: QueryGroupsRequest[] = []
    const client: ServerQueryClient = { queryGroups: async request => { requests.push(request); return response(request) }, lookupPins: async () => { throw new Error('unused') } }
    const coordinator = createProjectionCoordinator(client)
    const first = coordinator.request(requirement('cards'))
    const second = coordinator.request(requirement('table'))
    await tick()
    expect(requests).toHaveLength(1)
    expect(requests[0]?.groups).toHaveLength(1)
    expect(requests[0]?.groups[0]?.projections).toHaveLength(1)
    expect(coordinator.getState(first.intent.queryKey)?.status).toBe('ready')
    expect(coordinator.getState(second.intent.queryKey)?.status).toBe('ready')
    coordinator.request(requirement('cards', 2))
    await tick()
    expect(requests).toHaveLength(1)
    expect(coordinator.getState(first.intent.queryKey)?.intent.uiRevision).toBe(2)
  })

  it('keeps the committed result while new inputs refresh and rejects superseded completion', async () => {
    const pending: Array<{ request: QueryGroupsRequest; resolve: (value: QueryGroupsResponse) => void }> = []
    const client: ServerQueryClient = { queryGroups: request => new Promise(resolve => pending.push({ request, resolve })), lookupPins: async () => { throw new Error('unused') } }
    const coordinator = createProjectionCoordinator(client)
    const initial = coordinator.request(requirement('cards'))
    await tick()
    const firstCall = pending.shift()
    if (!firstCall) throw new Error('Missing initial request')
    firstCall.resolve(response(firstCall.request))
    await tick()
    const ready = coordinator.getState(initial.intent.queryKey)
    if (ready?.status !== 'ready') throw new Error('Initial result did not commit')
    const oldResult = ready.current.resultKey

    coordinator.request(requirement('cards', 2, 10))
    const refreshing = coordinator.getState(initial.intent.queryKey)
    expect(refreshing).toMatchObject({ status: 'refreshing', current: { resultKey: oldResult } })
    await tick()
    const superseded = pending.shift()
    if (!superseded) throw new Error('Missing superseded refresh request')

    coordinator.request(requirement('cards', 3, 5))
    await tick()
    const latest = pending.shift()
    if (!latest) throw new Error('Missing latest refresh request')
    latest.resolve(response(latest.request, 3000))
    await tick()
    superseded.resolve(response(superseded.request, 2800))
    await tick()
    const committed = coordinator.getState(initial.intent.queryKey)
    expect(committed).toMatchObject({ status: 'ready', current: { inputVersion: 3, resultFingerprint: 'result-3000' } })
    if (committed?.status === 'ready') expect(coordinator.captureProjectionResult(committed.current.resultKey)?.projection).toMatchObject({ items: [{ priceCents: 3000 }] })
  })

  it('refreshes source metadata once before rerunning a stale projection', async () => {
    const requests: QueryGroupsRequest[] = []
    let projectionAttempts = 0
    const client: ServerQueryClient = {
      queryGroups: async request => {
        requests.push(request)
        projectionAttempts += 1
        if (projectionAttempts === 1) throw new ServerQueryError(409, 'sourceChanged', 'changed', request.requestId)
        return {
          ...response(request),
          sourceVersion: 'source-2',
          groups: response(request).groups.map(result => ({
            ...result,
            manifest: {
              ...result.manifest,
              source: { ...result.manifest.source, sourceVersion: 'source-2' },
            },
          })),
        }
      },
      lookupPins: async () => { throw new Error('unused') },
    }
    let metadataRefreshes = 0
    const coordinator = createProjectionCoordinator(client, {
      refreshAfterSourceChange: async current => {
        metadataRefreshes += 1
        return {
          ...current,
          sourceVersion: 'source-2',
          datasetRevision: DatasetRevisionSchema.parse(2),
        }
      },
    })
    const initial = coordinator.request({ ...requirement('cards'), sourceVersion: 'source-1' })
    await tick()
    await tick()
    expect(metadataRefreshes).toBe(1)
    expect(requests).toHaveLength(2)
    expect(requests[1]?.expectedSourceVersion).toBe('source-2')
    expect(coordinator.getState(initial.intent.queryKey)).toMatchObject({
      status: 'ready',
      intent: { desiredInputVersion: 2 },
      current: { sourceVersion: 'source-2', datasetRevision: 2 },
    })
  })
})
