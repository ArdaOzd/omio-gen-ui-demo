import { describe, expect, it, vi } from 'vitest'
import { FareItemSchema, type FareScope, type QueryGroupsRequest, type QueryGroupsResponse } from '../contracts/query-groups'
import { createProjectionCoordinator, type ProjectionRequirement } from './projection-coordinator'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import type { ServerQueryClient } from './server-query-client'
import { ArtifactIdSchema, DatasetIdSchema, DatasetRevisionSchema, UIStateRevisionSchema } from '../contracts'

const scope: FareScope = {
  kind: 'fareScope', originId: 'london', destinationId: 'paris',
  dateWindow: { from: '2026-10-02', to: '2026-10-02' }, passengers: 1,
  earliestDeparture: { date: '2026-10-02', minutes: 0 },
}
const row = FareItemSchema.parse({
  id: 'fare', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-02', mode: 'bus',
  carrierId: 'carrier', carrierName: 'Carrier', priceCents: 1000, durationMinutes: 100,
  departureMinutes: 600, availableSeats: 4, currency: 'EUR', synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees', direct: true,
  legs: [{ legIndex: 0, mode: 'bus', carrierName: 'Carrier', durationMinutes: 100, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
})
const filters = { modes: [] as Array<'bus'>, carrierIds: [] as string[], directOnly: false }
const tick = () => new Promise(resolve => setTimeout(resolve, 0))

function requirement(limit: number): ProjectionRequirement {
  return {
    group: { artifactId: ArtifactIdSchema.parse('artifact'), legKey: 'london:paris', purpose: 'page' },
    projectionKey: 'page', scope, datasetId: DatasetIdSchema.parse('scope'), datasetRevision: DatasetRevisionSchema.parse(1),
    uiRevision: UIStateRevisionSchema.parse(1),
    projection: { projectionId: 'page', kind: 'farePage', filters, serviceDate: null, sort: { field: 'priceCents', direction: 'asc' }, after: null, limit },
  }
}

describe('server resource lifecycle', () => {
  it('does not construct or own a browser query worker', () => {
    const worker = vi.fn()
    vi.stubGlobal('Worker', worker)
    const fixture = createFixedProjectionFixture({ rows: [row] })
    fixture.bridge.dispose()
    expect(worker).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('reference-counts one stable scope and expires it after the final release', async () => {
    const fixture = createFixedProjectionFixture({ rows: [row] })
    const first = await fixture.bridge.loadScope(scope, new AbortController().signal)
    const second = await fixture.bridge.loadScope(scope, new AbortController().signal)
    expect(second).toEqual(first)
    expect(fixture.bridge.getBinding(first.resourceKey)).toMatchObject({ datasetRevision: 1 })
    fixture.bridge.release(first.resourceKey)
    expect(fixture.bridge.getManifest(first.resourceKey)).toEqual(first)
    fixture.bridge.release(first.resourceKey)
    expect(() => fixture.bridge.getManifest(first.resourceKey)).toThrow(/expired/i)
  })

  it('keeps an immutable selected fact after its scope and page cache are released', async () => {
    const fixture = createFixedProjectionFixture({ rows: [row] })
    const manifest = await fixture.bridge.loadScope(scope, new AbortController().signal)
    const lookup = await fixture.bridge.lookupPins({
      version: 1, requestId: 'lookup', sourceVersion: manifest.source.sourceVersion,
      pins: [{ fareId: row.id, resourceKey: manifest.resourceKey }],
    }, new AbortController().signal)
    fixture.bridge.release(manifest.resourceKey)
    expect(lookup.items).toEqual([row])
    expect(fixture.bridge.findCachedFare(row.id, manifest.resourceKey)).toEqual(row)
  })

  it('keeps the committed projection visible while a newer input is pending', async () => {
    const fixture = createFixedProjectionFixture({ rows: [row] })
    const pending: Array<{ request: QueryGroupsRequest; resolve: (response: QueryGroupsResponse) => void }> = []
    const client: ServerQueryClient = {
      queryGroups: request => new Promise(resolve => pending.push({ request, resolve })),
      lookupPins: fixture.client.lookupPins,
    }
    const coordinator = createProjectionCoordinator(client)
    const initial = coordinator.request(requirement(10))
    await tick()
    const first = pending.shift()
    if (!first) throw new Error('Missing initial request')
    first.resolve(await fixture.client.queryGroups(first.request, new AbortController().signal))
    await tick()
    const ready = coordinator.getState(initial.intent.queryKey)
    if (ready?.status !== 'ready') throw new Error('Initial result did not commit')
    coordinator.request(requirement(1))
    expect(coordinator.getState(initial.intent.queryKey)).toMatchObject({ status: 'refreshing', current: ready.current })
  })

  it('disposal rejects further scope access without mutating the fixture client', async () => {
    const fixture = createFixedProjectionFixture({ rows: [row] })
    const manifest = await fixture.bridge.loadScope(scope, new AbortController().signal)
    fixture.bridge.dispose()
    expect(() => fixture.bridge.getManifest(manifest.resourceKey)).toThrow(/disposed/i)
    await expect(fixture.client.queryGroups({
      version: 1, requestId: 'after-dispose', expectedSourceVersion: null,
      groups: [{ groupId: 'group', scope, projections: [] }],
    }, new AbortController().signal)).resolves.toMatchObject({ groups: [{ manifest: { totalAvailable: 1 } }] })
  })
})
