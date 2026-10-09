import { describe, expect, it, vi } from 'vitest'
import {
  ArtifactIdSchema,
  CATALOG_VERSION,
  CONTRACT_VERSION,
  DatasetIdSchema,
  FareIdSchema,
  type DatasetId,
} from '../contracts'
import { FareItemSchema, ResourceKeySchema, type FareScope, type QueryGroupsResponse, type ResourceKey } from '../contracts/query-groups'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { createArtifactStore } from './artifact-store'
import { createDisplayContextStore } from './display-context'
import { createThreadPersistence, PersistedThreadSchema, type PersistedThread, type ThreadStorage } from './persistence'
import { exportAgentContext } from './snapshot-exporter'
import { createUIStateStore } from './ui-state-store'

const row = FareItemSchema.parse({
  id: FareIdSchema.parse('fare-1'),
  originId: 'london',
  destinationId: 'paris',
  serviceDate: '2026-10-02',
  mode: 'train',
  carrierId: 'test',
  carrierName: 'Test Rail',
  priceCents: 3000,
  durationMinutes: 120,
  departureMinutes: 600,
  availableSeats: 3,
  currency: 'EUR',
  synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees',
  direct: true,
  legs: [{
    legIndex: 0,
    mode: 'train',
    carrierName: 'Test Rail',
    durationMinutes: 120,
    originId: 'london',
    destinationId: 'paris',
    originLabel: 'London',
    destinationLabel: 'Paris',
  }],
})

function memory() {
  const values = new Map<string, unknown>()
  const storage: ThreadStorage = {
    async read(key) { return values.get(key) },
    async write(key, value) { values.set(key, structuredClone(value)) },
  }
  return { values, storage }
}

function scope(to = '2026-10-02'): FareScope {
  return {
    kind: 'fareScope',
    originId: 'london',
    destinationId: 'paris',
    dateWindow: { from: '2026-10-02', to },
    passengers: 1,
    earliestDeparture: { date: '2026-10-02', minutes: 0 },
  }
}

async function fixture(partial = false, sourceVersion = 'persistence-v1') {
  const requested = scope(partial ? '2026-10-03' : '2026-10-02')
  const fixed = createFixedProjectionFixture({
    sourceVersion,
    sourceDateWindow: { from: '2026-10-02', to: '2026-10-02' },
    rows: [row, FareItemSchema.parse({ ...row, id: FareIdSchema.parse('fare-2') })],
  })
  const manifest = await fixed.bridge.loadScope(requested, new AbortController().signal)
  const binding = fixed.bridge.getBinding(manifest.resourceKey)
  await fixed.bridge.lookupPins({
    version: 1,
    requestId: 'pin-persisted-selection',
    sourceVersion: binding.manifest.source.sourceVersion,
    pins: [{ fareId: row.id, resourceKey: binding.resourceKey }],
  }, new AbortController().signal)
  const store = createUIStateStore()
  const id = ArtifactIdSchema.parse('a')
  store.initializeMissing(id, {
    dates: { start: '2026-10-02', ...(partial ? { end: '2026-10-03' } : {}) },
    datasetRefs: [binding.datasetId],
    selectedFareIds: [row.id],
  })
  const record: PersistedThread = {
    schemaVersion: CONTRACT_VERSION,
    catalogVersion: CATALOG_VERSION,
    parserVersion: 'native-present-1',
    queryVersion: '1',
    messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Synthetic journey' }] }],
    plannedFares: [],
    sceneSnapshots: [],
    artifacts: [{ source: '{"$type":"TravelSurface","artifactRef":"a"}', state: store.get(id) }],
    descriptors: [{
      datasetId: binding.datasetId,
      resourceKey: binding.resourceKey,
      scope: binding.manifest.coverage,
      sourceVersion: binding.manifest.source.sourceVersion,
      complete: binding.manifest.complete,
    }],
  }
  return { fixed, bridge: fixed.bridge, binding, store, id, record }
}

function bridgeWithStableResource(sourceVersion: string, resourceKey: ResourceKey) {
  const fixed = createFixedProjectionFixture({
    sourceVersion,
    sourceDateWindow: { from: '2026-10-02', to: '2026-10-02' },
    rows: [FareItemSchema.parse({ ...row, priceCents: 4000 })],
  })
  return createFareDataBridge({
    client: {
      async queryGroups(request, signal): Promise<QueryGroupsResponse> {
        const response = await fixed.client.queryGroups(request, signal)
        return {
          ...response,
          groups: response.groups.map(group => ({
            ...group,
            manifest: {
              ...group.manifest,
              resourceKey,
              source: { ...group.manifest.source, descriptorId: resourceKey },
            },
          })),
        }
      },
      lookupPins: fixed.client.lookupPins,
    },
  })
}

describe('descriptor-only thread persistence', () => {
  it('upgrades pre-cleanup generic artifacts without losing conversation state', async () => {
    const item = await fixture()
    const io = memory()
    const messages = [
      ...item.record.messages,
      { id: 'saved-user', role: 'user', parts: [{ type: 'text', text: 'Keep this selected itinerary' }] },
    ]
    const legacy = {
      ...item.record,
      recordRevision: 3,
      activeArtifactId: item.id,
      messages,
      artifacts: item.record.artifacts.map(artifact => ({ ...artifact, variant: 'a' })),
    }
    io.values.set('pre-cleanup', legacy)

    const persistence = createThreadPersistence(io.storage)
    const loaded = await persistence.load('pre-cleanup')
    expect(loaded).toEqual({ ...item.record, recordRevision: 3, activeArtifactId: item.id, messages })
    expect(io.values.get('pre-cleanup')).toEqual(loaded)
    expect(JSON.stringify(loaded)).not.toContain('"variant"')
    expect(loaded?.artifacts[0]?.state.selectedFareIds).toEqual([row.id])
    expect(loaded?.artifacts[0]?.source).toBe(item.record.artifacts[0]?.source)
    expect(await persistence.load('pre-cleanup')).toEqual(loaded)

    await persistence.save('pre-cleanup', loaded)
    expect(io.values.get('pre-cleanup')).toEqual({ ...loaded, recordRevision: 4 })
  })

  it('rejects unknown or structurally expanded legacy artifact variants', async () => {
    const item = await fixture()
    const io = memory()
    const persistence = createThreadPersistence(io.storage)
    io.values.set('unknown-variant', { ...item.record, artifacts: item.record.artifacts.map(artifact => ({ ...artifact, variant: 'b' })) })
    io.values.set('unknown-field', { ...item.record, artifacts: item.record.artifacts.map(artifact => ({ ...artifact, variant: 'a', retiredRoute: '/a' })) })

    expect(await persistence.load('unknown-variant')).toBeNull()
    expect(await persistence.load('unknown-field')).toBeNull()
  })

  it('continues loading saved 1.1.0 conversations after additive catalog metadata changes', async () => {
    const item = await fixture()
    const io = memory()
    io.values.set('existing', { ...item.record, catalogVersion: '1.1.0' })
    const loaded = await createThreadPersistence(io.storage).load('existing')
    expect(CATALOG_VERSION).toBe('1.1.0')
    expect(loaded?.messages).toEqual(item.record.messages)
    expect(loaded?.artifacts).toEqual(item.record.artifacts)
  })

  it.each([false, true])('restores messages, compact state, and coverage by reloading descriptors (partial=%s)', async partial => {
    const item = await fixture(partial)
    const io = memory()
    const persistence = createThreadPersistence(io.storage)
    await persistence.save('thread', item.record)
    const serialized = JSON.stringify(io.values.get('thread'))
    expect(serialized).not.toContain('"priceCents":')
    expect(serialized).not.toContain('availableSeats')
    expect(serialized).not.toContain('rows')

    const loaded = await persistence.load('thread')
    if (!loaded) throw new Error('Record not saved')
    const next = await fixture(partial)
    const restoredStore = createUIStateStore()
    const bindings = await persistence.restore(loaded, next.bridge, restoredStore, new AbortController().signal)
    expect(bindings[0]?.manifest.complete).toBe(!partial)
    expect(restoredStore.get(item.id).selectedFareIds).toEqual([row.id])
    expect(loaded.messages).toEqual(item.record.messages)
  })

  it('hydrates selected fare pins before publishing restored artifact state', async () => {
    const item = await fixture()
    const fresh = createFixedProjectionFixture({
      sourceVersion: 'persistence-v1',
      sourceDateWindow: { from: '2026-10-02', to: '2026-10-02' },
      rows: [row, FareItemSchema.parse({ ...row, id: FareIdSchema.parse('fare-2') })],
    })
    const lookup = vi.spyOn(fresh.client, 'lookupPins')
    const store = createUIStateStore()

    const bindings = await createThreadPersistence(memory().storage).restore(item.record, fresh.bridge, store, new AbortController().signal)

    expect(lookup).toHaveBeenCalledOnce()
    expect(lookup.mock.calls[0]?.[0]).toMatchObject({
      sourceVersion: 'persistence-v1',
      pins: [{ fareId: row.id, resourceKey: bindings[0]?.resourceKey }],
    })
    expect(fresh.bridge.findCachedFare(row.id, bindings[0]?.resourceKey)).toEqual(row)
    expect(store.get(item.id).selectedFareIds).toEqual([row.id])
  })

  it('keeps a restored selection when its scoped pin is missing', async () => {
    const item = await fixture()
    const fresh = createFixedProjectionFixture({
      sourceVersion: 'persistence-v1',
      sourceDateWindow: { from: '2026-10-02', to: '2026-10-02' },
      rows: [],
    })
    const lookup = vi.spyOn(fresh.client, 'lookupPins')
    const store = createUIStateStore()

    const bindings = await createThreadPersistence(memory().storage).restore(item.record, fresh.bridge, store, new AbortController().signal)

    expect(lookup).toHaveBeenCalledOnce()
    expect(fresh.bridge.findCachedFare(row.id, bindings[0]?.resourceKey)).toBeUndefined()
    expect(store.get(item.id).selectedFareIds).toEqual([row.id])
  })

  it('restores the last active artifact independently from first registration', async () => {
    const item = await fixture()
    const second = ArtifactIdSchema.parse('second')
    item.store.initializeMissing(second, { filters: { modes: ['bus'], carrierIds: [], directOnly: false } })
    const record = {
      ...item.record,
      activeArtifactId: second,
      artifacts: [...item.record.artifacts, { source: '{"$type":"TravelSurface","artifactRef":"second"}', state: item.store.get(second) }],
    }
    const io = memory()
    const persistence = createThreadPersistence(io.storage)
    await persistence.save('two', record)
    const loaded = await persistence.load('two')
    if (!loaded) throw new Error('Missing thread')
    const store = createUIStateStore()
    await persistence.restore(loaded, item.bridge, store, new AbortController().signal)
    const artifacts = createArtifactStore()
    for (const artifact of loaded.artifacts) artifacts.register(artifact.state.artifactId)
    if (loaded.activeArtifactId) artifacts.activate(loaded.activeArtifactId)
    expect(artifacts.getActiveId()).toBe(second)
    expect(store.get(second).filters.modes).toEqual(['bus'])
    expect(store.get(item.id).filters.modes).toEqual([])
  })

  it('rejects nested transport leakage, unsafe records, and incompatible versions without restoring fare items', async () => {
    const io = memory()
    const persistence = createThreadPersistence(io.storage)
    const item = await fixture()
    await expect(persistence.save('unsafe', { ...item.record, messages: [{ tool: { result: { nested: { items: [row] } } } }] })).rejects.toThrow(/bulk-data|normalized fare data/i)
    io.values.set('future', { ...item.record, parserVersion: 'future-parser' })
    expect(await persistence.load('future')).toBeNull()
    io.values.set('corrupt', 'not-a-thread')
    expect(await persistence.load('corrupt')).toBeNull()
  })

  it('refreshes stale source descriptors without dropping conversation or unrelated artifact state', async () => {
    const item = await fixture()
    item.store.dispatch({ kind: 'sort', artifactId: item.id, sort: { field: 'priceCents', direction: 'desc' } })
    const other = ArtifactIdSchema.parse('unaffected')
    item.store.initializeMissing(other, { selectedFareIds: [FareIdSchema.parse('other-fare')] })
    const record: PersistedThread = {
      ...item.record,
      activeArtifactId: item.id,
      artifacts: [
        { ...item.record.artifacts[0]!, state: item.store.get(item.id) },
        { source: 'Other scene', state: item.store.get(other) },
      ],
      descriptors: item.record.descriptors.map(descriptor => ({ ...descriptor, sourceVersion: 'sqlite-demo-v1' })),
    }
    const io = memory()
    const persistence = createThreadPersistence(io.storage)
    await persistence.save('legacy', record)
    const loaded = await persistence.load('legacy')
    if (!loaded) throw new Error('Missing legacy thread')
    const fresh = bridgeWithStableResource('sqlite-demo-v2-new-generation', item.binding.resourceKey)
    const store = createUIStateStore()
    let cleared = false
    let sourceChangedFareIdsByArtifact = new Map()
    await persistence.restore(loaded, fresh, store, new AbortController().signal, sourceChange => {
      cleared = sourceChange.clearedSelections
      sourceChangedFareIdsByArtifact = new Map(sourceChange.sourceChangedFareIdsByArtifact)
    })

    expect(store.get(item.id).revision).toBe(item.store.get(item.id).revision + 1)
    expect(store.get(item.id).selectedFareIds).toEqual([])
    expect(store.get(item.id).sort.direction).toBe('desc')
    expect(store.get(item.id).dates).toEqual(item.store.get(item.id).dates)
    expect(store.get(other).selectedFareIds).toEqual([FareIdSchema.parse('other-fare')])
    expect(loaded.messages).toEqual(record.messages)
    expect(loaded.artifacts[0]?.source).toBe(record.artifacts[0]?.source)
    expect(loaded.activeArtifactId).toBe(item.id)
    expect(fresh.getManifest(item.binding.resourceKey).source.sourceVersion).toBe('sqlite-demo-v2-new-generation')
    expect(cleared).toBe(true)
    expect(sourceChangedFareIdsByArtifact).toEqual(new Map())
  })

  it('identifies only the stale frozen fare when the same owner has a valid live scope', async () => {
    const currentLondonRow = FareItemSchema.parse({ ...row, id: FareIdSchema.parse('fare-current-london-paris') })
    const madridRow = FareItemSchema.parse({
      ...row,
      id: FareIdSchema.parse('fare-madrid-barcelona'),
      originId: 'madrid',
      destinationId: 'barcelona',
      legs: [{
        ...row.legs[0]!,
        originId: 'madrid',
        destinationId: 'barcelona',
        originLabel: 'Madrid',
        destinationLabel: 'Barcelona',
      }],
    })
    const oldSource = createFixedProjectionFixture({
      sourceVersion: 'mixed-source-v1',
      sourceDateWindow: { from: '2026-10-02', to: '2026-10-02' },
      rows: [row, currentLondonRow, madridRow],
    })
    const currentSource = createFixedProjectionFixture({
      sourceVersion: 'mixed-source-v2',
      sourceDateWindow: { from: '2026-10-02', to: '2026-10-02' },
      rows: [row, currentLondonRow, madridRow],
    })
    const londonManifest = await oldSource.bridge.loadScope(scope(), new AbortController().signal)
    const londonBinding = oldSource.bridge.getBinding(londonManifest.resourceKey)
    const currentLondonManifest = await currentSource.bridge.loadScope(scope(), new AbortController().signal)
    const currentLondonBinding = currentSource.bridge.getBinding(currentLondonManifest.resourceKey)
    const madridScope: FareScope = {
      ...scope(),
      originId: 'madrid',
      destinationId: 'barcelona',
    }
    const madridManifest = await currentSource.bridge.loadScope(madridScope, new AbortController().signal)
    const madridBinding = currentSource.bridge.getBinding(madridManifest.resourceKey)
    const restoredQueries = vi.spyOn(currentSource.client, 'queryGroups')
    const restoringBridge = createFareDataBridge({
      client: {
        async queryGroups(request, signal) {
          const response = await currentSource.client.queryGroups(request, signal)
          return {
            ...response,
            groups: response.groups.map(group => group.manifest.coverage.originId === 'london' ? {
              ...group,
              manifest: {
                ...group.manifest,
                resourceKey: londonBinding.resourceKey,
                source: { ...group.manifest.source, descriptorId: londonBinding.resourceKey },
              },
            } : group),
          }
        },
        lookupPins: currentSource.client.lookupPins,
      },
    })
    const owner = ArtifactIdSchema.parse('mixed-scope-owner')
    const frozenState = createUIStateStore()
    frozenState.initializeMissing(owner, { datasetRefs: [londonBinding.datasetId], selectedFareIds: [row.id] })
    const liveState = createUIStateStore()
    liveState.initializeMissing(owner, { selectedFareIds: [] })
    const withoutAvailability = <T extends typeof row>(fare: T) => {
      const { availableSeats: _availableSeats, ...fact } = fare
      return fact
    }
    const record: PersistedThread = {
      schemaVersion: CONTRACT_VERSION,
      catalogVersion: CATALOG_VERSION,
      parserVersion: 'native-present-1',
      queryVersion: '1',
      messages: [{
        id: 'frozen-message',
        role: 'assistant',
        parts: [{ type: 'tool-present', toolCallId: 'frozen-scene', state: 'output-available', input: {}, output: {} }],
      }],
      artifacts: [{ source: 'Current Madrid scene', state: liveState.get(owner) }],
      descriptors: [londonBinding].map(binding => ({
        datasetId: binding.datasetId,
        resourceKey: binding.resourceKey,
        scope: binding.manifest.coverage,
        sourceVersion: binding.manifest.source.sourceVersion,
        complete: binding.manifest.complete,
      })),
      plannedFares: [
        {
          fact: withoutAvailability(row),
          owners: [owner],
          sources: [{ owner, source: londonBinding.manifest.source, scope: londonBinding.manifest.coverage }],
        },
        {
          fact: withoutAvailability(currentLondonRow),
          owners: [owner],
          sources: [{
            owner,
            source: { ...currentLondonBinding.manifest.source, descriptorId: londonBinding.resourceKey },
            scope: currentLondonBinding.manifest.coverage,
          }],
        },
        {
          fact: withoutAvailability(madridRow),
          owners: [owner],
          sources: [{ owner, source: madridBinding.manifest.source, scope: madridBinding.manifest.coverage }],
        },
      ],
      sceneSnapshots: [{ toolCallId: 'frozen-scene', artifactStates: [frozenState.get(owner)] }],
    }
    let sourceChange
    const restored = createUIStateStore()

    await createThreadPersistence(memory().storage).restore(
      record,
      restoringBridge,
      restored,
      new AbortController().signal,
      change => { sourceChange = change },
    )

    expect(restored.get(owner).selectedFareIds).toEqual([])
    expect(sourceChange).toEqual({
      clearedSelections: true,
      sourceChangedFareIdsByArtifact: new Map([[owner, new Set([row.id])]]),
    })
    expect(restoringBridge.getBinding(londonBinding.resourceKey).resourceKey).toBe(londonBinding.resourceKey)
    expect(() => restoringBridge.getBinding(madridBinding.resourceKey)).toThrow('Expired fare scope reference')
    expect(restoredQueries.mock.calls.flatMap(([request]) => request.groups.map(group => group.scope.originId))).toContain('madrid')
  })

  it('reports and releases a stale basket source after its scope leaves retained state', async () => {
    const item = await fixture()
    const owner = item.id
    const state = createUIStateStore()
    state.initializeMissing(owner, {})
    const { availableSeats: _availableSeats, ...fact } = row
    const record: PersistedThread = {
      ...item.record,
      artifacts: [{ source: item.record.artifacts[0]!.source, state: state.get(owner) }],
      descriptors: [],
      plannedFares: [{
        fact,
        owners: [owner],
        sources: [{ owner, source: item.binding.manifest.source, scope: item.binding.manifest.coverage }],
      }],
    }
    const fresh = bridgeWithStableResource('persistence-v2', item.binding.resourceKey)
    let sourceChange

    await createThreadPersistence(memory().storage).restore(
      record,
      fresh,
      createUIStateStore(),
      new AbortController().signal,
      change => { sourceChange = change },
    )

    expect(sourceChange).toEqual({
      clearedSelections: true,
      sourceChangedFareIdsByArtifact: new Map([[owner, new Set([row.id])]]),
    })
    expect(() => fresh.getBinding(item.binding.resourceKey)).toThrow('Expired fare scope reference')
  })

  it('refuses a stale tab save without overwriting a newer conversation', async () => {
    const item = await fixture()
    const io = memory()
    const first = createThreadPersistence(io.storage)
    const second = createThreadPersistence(io.storage)
    await first.save('shared', item.record)
    await second.load('shared')
    await first.save('shared', { ...item.record, messages: [{ id: 'newer', role: 'user', parts: [{ type: 'text', text: 'Newer conversation' }] }] })
    await expect(second.save('shared', item.record)).rejects.toThrow(/another tab/)
    expect((await first.load('shared'))?.messages).toEqual([{ id: 'newer', role: 'user', parts: [{ type: 'text', text: 'Newer conversation' }] }])
  })

  it('serializes saves from the same tab while advancing its record revision', async () => {
    const item = await fixture()
    const io = memory()
    const persistence = createThreadPersistence(io.storage)
    await Promise.all([
      persistence.save('local', item.record),
      persistence.save('local', { ...item.record, messages: [{ id: 'latest', role: 'user', parts: [] }] }),
    ])
    const loaded = await persistence.load('local')
    expect(loaded?.recordRevision).toBe(2)
    expect(loaded?.messages).toEqual([{ id: 'latest', role: 'user', parts: [] }])
  })

  it('persists the bounded fare buying basket with its owning artifact', async () => {
    const item = await fixture()
    const io = memory()
    const persistence = createThreadPersistence(io.storage)
    const { availableSeats: _availableSeats, ...fact } = row
    const plannedFares = [{ fact, owners: [item.id] }]

    await persistence.save('basket', { ...item.record, plannedFares })

    expect((await persistence.load('basket'))?.plannedFares).toEqual(plannedFares)
  })

  it('round-trips complete browser history beyond the compact model-history limit', async () => {
    const item = await fixture()
    const io = memory()
    const persistence = createThreadPersistence(io.storage)
    const messages = Array.from({ length: 250 }, (_, index) => ({ id: `message-${index}`, role: index % 2 ? 'assistant' : 'user', parts: [{ type: 'text', text: `Message ${index}` }] }))
    await persistence.save('long-history', { ...item.record, messages })
    expect((await persistence.load('long-history'))?.messages).toEqual(messages)
  })

  it('round-trips every retained frozen scene beyond the stored-artifact count', async () => {
    const item = await fixture()
    const io = memory()
    const persistence = createThreadPersistence(io.storage)
    const descriptors: PersistedThread['descriptors'] = []
    const sceneSnapshots = Array.from({ length: 21 }, (_, sceneIndex) => {
      const state = createUIStateStore()
      const datasetRefs = Array.from({ length: 8 }, (_, datasetIndex) => {
        const suffix = `${sceneIndex}-${datasetIndex}`
        const datasetId = DatasetIdSchema.parse(`dataset-${suffix}`)
        descriptors.push({
          datasetId,
          resourceKey: ResourceKeySchema.parse(`resource-${suffix}`),
          scope: {
            ...scope(),
            originId: `origin-${suffix}`,
            destinationId: `destination-${suffix}`,
          },
          sourceVersion: 'retained-scenes-v1',
          complete: true,
        })
        return datasetId
      })
      state.initializeMissing(item.id, { datasetRefs })
      return { toolCallId: `scene-${sceneIndex}`, artifactStates: [state.get(item.id)] }
    })
    const messages = sceneSnapshots.map(snapshot => ({
      id: `message-${snapshot.toolCallId}`,
      role: 'assistant',
      parts: [{
        type: 'tool-present',
        toolCallId: snapshot.toolCallId,
        state: 'output-available',
        input: { $type: 'TravelSurface', artifactRef: item.id },
        output: {},
      }],
    }))
    const record = { ...item.record, artifacts: [], descriptors, messages, sceneSnapshots }

    await persistence.save('retained-scenes', record)

    expect(await persistence.load('retained-scenes')).toMatchObject({ descriptors, sceneSnapshots })
    expect(() => PersistedThreadSchema.parse({
      ...record,
      messages: [],
      sceneSnapshots: sceneSnapshots.slice(0, 1),
    })).toThrow('Scene snapshot is not retained in message history')
    expect(() => PersistedThreadSchema.parse({
      ...record,
      descriptors: [...descriptors, { ...descriptors[0]!, datasetId: DatasetIdSchema.parse('orphan-dataset') }],
    })).toThrow('Descriptor is not referenced by retained state')
    expect(() => PersistedThreadSchema.parse({ ...record, descriptors: descriptors.slice(0, -1) })).toThrow('Missing descriptor for retained dataset')
    expect(() => PersistedThreadSchema.parse({ ...record, descriptors: [...descriptors, descriptors[0]!] })).toThrow('Duplicate dataset descriptor')
  })

  it('exports one coherent current revision and allowlisted scope manifests without fare items', async () => {
    const item = await fixture()
    item.store.dispatch({ kind: 'filters', artifactId: item.id, filters: { modes: ['train'], carrierIds: [], directOnly: true } })
    const snapshot = exportAgentContext({
      turnId: 'turn-1',
      activeArtifactId: item.id,
      artifactIds: [item.id],
      store: item.store,
      bridge: item.bridge,
      displayStore: createDisplayContextStore(),
    })
    expect(snapshot.artifacts[0]?.revision).toBe(1)
    expect(snapshot.artifacts[0]?.filters.directOnly).toBe(true)
    expect(snapshot.datasets[0]?.manifest.totalAvailable).toBe(2)
    expect(JSON.stringify(snapshot)).not.toContain('availableSeats":3')
  })
})

it('saves and restores 21 unique descriptors across three valid artifact states', async () => {
  const makeBridge = () => createFixedProjectionFixture({ rows: [], sourceVersion: 'multi-v1' }).bridge
  const bridge = makeBridge()
  const store = createUIStateStore()
  const descriptors: PersistedThread['descriptors'] = []
  const artifacts: PersistedThread['artifacts'] = []
  for (let artifact = 0; artifact < 3; artifact += 1) {
    const refs: DatasetId[] = []
    for (let leg = 0; leg < 7; leg += 1) {
      const date = new Date(Date.UTC(2026, 9, 2 + artifact * 7 + leg)).toISOString().slice(0, 10)
      const requested: FareScope = {
        kind: 'fareScope',
        originId: `origin-${artifact}-${leg}`,
        destinationId: `destination-${artifact}-${leg}`,
        dateWindow: { from: date, to: date },
        passengers: 1,
        earliestDeparture: { date, minutes: 0 },
      }
      const manifest = await bridge.loadScope(requested, new AbortController().signal)
      const binding = bridge.getBinding(manifest.resourceKey)
      refs.push(binding.datasetId)
      descriptors.push({
        datasetId: binding.datasetId,
        resourceKey: binding.resourceKey,
        scope: binding.manifest.coverage,
        sourceVersion: binding.manifest.source.sourceVersion,
        complete: binding.manifest.complete,
      })
    }
    const artifactId = ArtifactIdSchema.parse(`persisted-${artifact}`)
    store.initializeMissing(artifactId, { datasetRefs: refs })
    artifacts.push({ source: JSON.stringify({ $type: 'TravelSurface', artifactRef: artifactId }), state: store.get(artifactId) })
  }
  const activeArtifactId = artifacts[2]?.state.artifactId
  const record: PersistedThread = {
    schemaVersion: CONTRACT_VERSION,
    catalogVersion: CATALOG_VERSION,
    parserVersion: 'native-present-1',
    queryVersion: '1',
    messages: [{ id: 'saved-user', role: 'user', parts: [{ type: 'text', text: 'Keep my three itineraries' }] }],
    activeArtifactId,
    artifacts,
    descriptors,
    plannedFares: [],
    sceneSnapshots: [],
  }
  const io = memory()
  const persistence = createThreadPersistence(io.storage)
  await persistence.save('three', record)
  const loaded = await persistence.load('three')
  if (!loaded) throw new Error('Missing multi-artifact record')
  const restored = createUIStateStore()
  const fresh = makeBridge()
  const bindings = await persistence.restore(loaded, fresh, restored, new AbortController().signal)
  expect(loaded.descriptors).toHaveLength(21)
  expect(bindings).toHaveLength(21)
  expect(loaded.messages).toEqual(record.messages)
  expect(loaded.activeArtifactId).toBe(activeArtifactId)
  for (const artifact of artifacts) expect(restored.get(artifact.state.artifactId)).toEqual(artifact.state)
  expect(JSON.stringify(io.values.get('three'))).not.toContain('"rows":')
})
