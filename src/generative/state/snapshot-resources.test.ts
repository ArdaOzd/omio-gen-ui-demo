import { expect, it } from 'vitest'
import {
  ArtifactIdSchema,
  CATALOG_VERSION,
  CONTRACT_VERSION,
  FareIdSchema,
  LIMITS,
} from '../contracts'
import {
  FareItemSchema,
  type FareItem,
  type FareScope,
  type FareScopeBinding,
} from '../contracts/query-groups'
import type { ServerFareDataBridge } from '../data/fare-data-bridge'
import { createFixedProjectionFixture, type FixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { createDisplayContextStore } from './display-context'
import { createThreadPersistence, parsePersistedThread } from './persistence'
import { captureAgentContext, captureAgentContextWithSelectedFares, exportAgentContext } from './snapshot-exporter'
import { createUIStateStore } from './ui-state-store'

const id = ArtifactIdSchema.parse('review-art')
const signal = () => new AbortController().signal
const displayStore = () => createDisplayContextStore()

function fare(input: {
  id: string
  originId: string
  destinationId: string
  serviceDate: string
  priceCents?: number
  durationMinutes?: number
  departureMinutes?: number
  carrierId?: string
  carrierName?: string
}): FareItem {
  const carrierName = input.carrierName ?? 'Rail'
  return FareItemSchema.parse({
    id: input.id,
    originId: input.originId,
    destinationId: input.destinationId,
    serviceDate: input.serviceDate,
    mode: 'train',
    carrierId: input.carrierId ?? 'rail',
    carrierName,
    priceCents: input.priceCents ?? 1000,
    durationMinutes: input.durationMinutes ?? 120,
    departureMinutes: input.departureMinutes ?? 600,
    availableSeats: 5,
    currency: 'EUR',
    synthetic: true,
    priceBasis: 'per-passenger-including-demo-fees',
    direct: true,
    legs: [{ legIndex: 0, mode: 'train', carrierName, durationMinutes: input.durationMinutes ?? 120, originId: input.originId, destinationId: input.destinationId, originLabel: input.originId, destinationLabel: input.destinationId }],
  })
}

function scope(fixed: FixedProjectionFixture, originId: string, destinationId: string, from: string, to = from): FareScope {
  return fixed.scope({ originId, destinationId, dateWindow: { from, to }, passengers: 1, earliestDeparture: { date: from, minutes: 0 } })
}

async function cacheScope(bridge: ServerFareDataBridge, value: FareScope): Promise<FareScopeBinding> {
  const manifest = await bridge.loadScope(value, signal())
  await bridge.executeGroup({
    groupId: `snapshot:${value.originId}:${value.destinationId}:${value.dateWindow.from}`,
    scope: value,
    projections: [{ projectionId: 'snapshot-page', kind: 'farePage', filters: { modes: ['train'], carrierIds: [], directOnly: false }, serviceDate: null, sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 100 }],
  }, signal())
  return bridge.getBinding(manifest.resourceKey)
}

function snapshotFixture() {
  return createFixedProjectionFixture({
    sourceVersion: 'snapshot-source-v1',
    rows: value => {
      const day = Number(value.dateWindow.from.slice(-2))
      const base = fare({ id: `${value.originId}-${value.destinationId}-${value.dateWindow.from}`, originId: value.originId, destinationId: value.destinationId, serviceDate: value.dateWindow.from })
      const details = Array.from({ length: 8 }, (_, index) => fare({
        id: `detail-${Math.max(0, day - 1)}-${index}`,
        originId: value.originId,
        destinationId: value.destinationId,
        serviceDate: value.dateWindow.from,
        carrierId: `carrier-${'x'.repeat(70)}`,
        carrierName: 'A very descriptive synthetic railway carrier name used to exercise the bounded context budget',
      }))
      return [base, ...details]
    },
  })
}

it('exports all resources from individually valid artifacts without dropping current references', async () => {
  const fixed = snapshotFixture()
  const state = createUIStateStore()
  const refs = []
  for (let day = 3; day <= 11; day += 1) {
    const date = `2026-10-${String(day).padStart(2, '0')}`
    refs.push((await cacheScope(fixed.bridge, scope(fixed, 'london', 'paris', date))).datasetId)
  }
  const other = ArtifactIdSchema.parse('review-other')
  state.initializeMissing(id, { datasetRefs: refs.slice(0, 5) })
  state.initializeMissing(other, { datasetRefs: refs.slice(5) })
  const context = exportAgentContext({ turnId: 'review', activeArtifactId: id, artifactIds: [other, id], store: state, bridge: fixed.bridge, displayStore: displayStore() })
  expect(context.artifacts.map(artifact => artifact.artifactId)).toEqual([id, other])
  expect(context.datasets.map(dataset => dataset.datasetId)).toEqual(refs)
  expect(context.activeArtifactId).toBe(id)
  expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(LIMITS.snapshotBytes)
})

async function restoredContextFixture(activeResources = 1) {
  const original = snapshotFixture()
  const originalState = createUIStateStore()
  const bindings: FareScopeBinding[] = []
  for (let day = 1; day <= 20; day += 1) {
    const date = `2026-10-${String(day).padStart(2, '0')}`
    bindings.push(await cacheScope(original.bridge, scope(original, 'london', 'paris', date)))
  }
  const artifacts = bindings.map((binding, index) => {
    const artifactId = ArtifactIdSchema.parse(`saved-${String(index).padStart(2, '0')}`)
    originalState.initializeMissing(artifactId, {
      datasetRefs: index === 0 ? bindings.slice(0, activeResources).map(item => item.datasetId) : [binding.datasetId],
      dates: { start: binding.manifest.coverage.dateWindow.from },
      lastInteractionAt: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    })
    return { variant: 'a' as const, source: `root = TravelSurface("${artifactId}")`, state: originalState.get(artifactId) }
  })
  const first = artifacts[0]
  if (!first) throw new Error('Missing fixture artifact')
  const record = parsePersistedThread({
    schemaVersion: CONTRACT_VERSION,
    catalogVersion: CATALOG_VERSION,
    parserVersion: 'native-present-1',
    queryVersion: '1',
    activeArtifactId: first.state.artifactId,
    messages: [{ id: 'saved-history', role: 'user', parts: [{ type: 'text', text: 'Keep all travel views' }] }],
    artifacts,
    descriptors: bindings.map(binding => ({
      datasetId: binding.datasetId,
      resourceKey: binding.resourceKey,
      scope: binding.manifest.coverage,
      sourceVersion: binding.manifest.source.sourceVersion,
      complete: binding.manifest.complete,
    })),
  })
  const restored = snapshotFixture()
  const store = createUIStateStore()
  await createThreadPersistence({ read: async () => record, write: async () => { throw new Error('Read-only fixture') } }).restore(record, restored.bridge, store, signal())
  for (const descriptor of record.descriptors) await cacheScope(restored.bridge, descriptor.scope)
  const artifactIds = record.artifacts.map(artifact => artifact.state.artifactId)
  return {
    record,
    bridge: restored.bridge,
    store,
    displayStore: displayStore(),
    artifactIds,
    activeArtifactId: first.state.artifactId,
    layoutSummaries: new Map(artifactIds.map((artifactId, index) => [artifactId, `Trip ${index}`])),
  }
}

it('captures active plus recent restored views and discoverable older summaries without changing history', async () => {
  const fixture = await restoredContextFixture()
  const before = JSON.stringify(fixture.record)
  const states = fixture.artifactIds.map(artifactId => fixture.store.get(artifactId))
  const context = captureAgentContext({ ...fixture, turnId: 'restored' })
  expect(context.artifacts.map(artifact => artifact.artifactId)).toEqual(['saved-00', 'saved-19', 'saved-18', 'saved-17', 'saved-16', 'saved-15', 'saved-14', 'saved-13'])
  expect(context.olderArtifactSummaries).toHaveLength(12)
  expect(context.olderArtifactSummaries.find(summary => summary.artifactId === 'saved-01')).toMatchObject({ label: 'Trip 1', revision: 0, variant: 'a', lastInteractionAt: '2026-01-02T00:00:00.000Z' })
  for (const summary of context.olderArtifactSummaries) {
    expect(summary).not.toHaveProperty('source')
    expect(summary).not.toHaveProperty('datasetRefs')
    expect(summary).not.toHaveProperty('selectedFareIds')
  }
  expect(context.datasets.map(dataset => dataset.datasetId)).toEqual(context.artifacts.flatMap(artifact => artifact.datasetRefs))
  expect(JSON.stringify(fixture.record)).toBe(before)
  expect(fixture.artifactIds.map(artifactId => fixture.store.get(artifactId))).toEqual(states)
  expect(() => exportAgentContext({ ...fixture, turnId: 'explicit-overlimit' })).toThrow()
})

it('demotes older snapshots to metadata to meet the byte budget while preserving every active resource', async () => {
  const fixture = await restoredContextFixture(8)
  const before = fixture.artifactIds.map(artifactId => fixture.store.get(artifactId))
  const layoutSummaries = new Map(fixture.artifactIds.map((artifactId, index) => [artifactId, `Trip ${index} ${'TravelSurface '.repeat(40)}`]))
  const componentBindings = new Map(fixture.artifactIds.map((artifactId, artifactIndex) => [artifactId, Array.from({ length: 30 }, (_, bindingIndex) => ({ key: `fixture-${artifactIndex}-${bindingIndex}`, type: 'FareCards' }))]))
  const context = captureAgentContext({ ...fixture, layoutSummaries, componentBindings, turnId: 'budget' })
  expect(context.artifacts[0]?.artifactId).toBe(fixture.activeArtifactId)
  expect(context.artifacts.length).toBeLessThan(8)
  expect(context.artifacts[0]?.datasetRefs).toEqual(fixture.store.get(fixture.activeArtifactId).datasetRefs)
  expect(context.olderArtifactSummaries.length + context.artifacts.length).toBe(20)
  const covered = new Set(context.datasets.map(dataset => dataset.datasetId))
  for (const artifact of context.artifacts) for (const ref of artifact.datasetRefs) expect(covered.has(ref)).toBe(true)
  expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(LIMITS.snapshotBytes)
  expect(fixture.artifactIds.map(artifactId => fixture.store.get(artifactId))).toEqual(before)
})

it('keeps every deduplicated planned fare id when selected artifacts are demoted', async () => {
  const fixture = await restoredContextFixture()
  for (const [artifactIndex, artifactId] of fixture.artifactIds.entries()) {
    for (let fareIndex = 0; fareIndex < 8; fareIndex += 1) {
      const current = fixture.store.get(artifactId)
      fixture.store.dispatch({ kind: 'select', artifactId, fareId: FareIdSchema.parse(`planned-${artifactIndex}-${fareIndex}`), selected: true, expectedRevision: current.revision })
    }
  }
  const context = captureAgentContext({ ...fixture, turnId: 'planned-fares' })
  expect(context.artifacts.length).toBeLessThan(fixture.artifactIds.length)
  expect(context.plannedFareIds).toHaveLength(LIMITS.plannedFares)
  expect(new Set(context.plannedFareIds).size).toBe(LIMITS.plannedFares)
  expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(LIMITS.snapshotBytes)
})

it('trims rich fare facts in deterministic order before planned ids', async () => {
  const fixture = await restoredContextFixture()
  const artifactIds = fixture.artifactIds.slice(0, 8)
  for (const [artifactIndex, artifactId] of artifactIds.entries()) {
    for (let fareIndex = 0; fareIndex < 8; fareIndex += 1) {
      const current = fixture.store.get(artifactId)
      fixture.store.dispatch({ kind: 'select', artifactId, fareId: FareIdSchema.parse(`detail-${artifactIndex}-${fareIndex}`), selected: true, expectedRevision: current.revision })
    }
  }
  const context = await captureAgentContextWithSelectedFares({ ...fixture, artifactIds, turnId: 'fact-budget' })
  expect(context.plannedFareIds).toHaveLength(64)
  expect(context.selectedFareFacts.length).toBeGreaterThan(0)
  expect(context.selectedFareFacts.length).toBeLessThan(64)
  expect(context.selectedFareFacts.map(fact => fact.id)).toEqual(context.plannedFareIds?.slice(0, context.selectedFareFacts.length))
  expect(context.selectedFareFacts.filter(fact => fact.id.startsWith('detail-0-'))).toHaveLength(8)
  expect(context.selectedFareFacts[0]?.id).toBe('detail-0-0')
  expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(LIMITS.snapshotBytes)
})

it('captures one immutable selection version while fare lookup is pending', async () => {
  const artifactId = ArtifactIdSchema.parse('held-selection')
  const oldFare = fare({ id: 'fare-old', originId: 'berlin', destinationId: 'prague', serviceDate: '2026-10-06', durationMinutes: 90, departureMinutes: 480 })
  const oldFareId = oldFare.id
  const newFareId = FareIdSchema.parse('fare-new')
  const fixed = createFixedProjectionFixture({ rows: [oldFare], sourceVersion: 'held-source-v1' })
  const binding = await cacheScope(fixed.bridge, scope(fixed, 'berlin', 'prague', '2026-10-06'))
  const store = createUIStateStore()
  store.initializeMissing(artifactId, { datasetRefs: [binding.datasetId], selectedFareIds: [oldFareId] })
  let release: ((value: { version: 1; requestId: string; sourceVersion: string; items: FareItem[]; missingPins: [] }) => void) | undefined
  const held = new Promise<{ version: 1; requestId: string; sourceVersion: string; items: FareItem[]; missingPins: [] }>(resolve => { release = resolve })
  const bridge: ServerFareDataBridge = { ...fixed.bridge, lookupPins: async () => held }
  const pending = captureAgentContextWithSelectedFares({ turnId: 'held', activeArtifactId: artifactId, artifactIds: [artifactId], store, bridge, displayStore: displayStore() })
  let current = store.get(artifactId)
  store.dispatch({ kind: 'select', artifactId, fareId: oldFareId, selected: false, expectedRevision: current.revision })
  current = store.get(artifactId)
  store.dispatch({ kind: 'select', artifactId, fareId: newFareId, selected: true, expectedRevision: current.revision })
  release?.({ version: 1, requestId: 'held-lookup', sourceVersion: binding.manifest.source.sourceVersion, items: [oldFare], missingPins: [] })
  const context = await pending
  expect(context.plannedFareIds).toEqual([oldFareId])
  expect(context.artifacts[0]?.selectedFareIds).toEqual([oldFareId])
  expect(context.selectedFareFacts.map(fact => fact.id)).toEqual([oldFareId])
  expect(store.get(artifactId).selectedFareIds).toEqual([newFareId])
})

it('exports bounded host-derived leg thresholds and selected facts without browser fare rows', async () => {
  const fixed = createFixedProjectionFixture({
    sourceVersion: 'threshold-source-v1',
    rows: value => [fare({
      id: `${value.originId}-${value.destinationId}`,
      originId: value.originId,
      destinationId: value.destinationId,
      serviceDate: value.dateWindow.from,
      durationMinutes: value.originId === 'london' ? 1200 : 120,
      departureMinutes: value.originId === 'london' ? 1260 : 1080,
    })],
  })
  const first = await cacheScope(fixed.bridge, scope(fixed, 'london', 'paris', '2026-10-26'))
  const second = await cacheScope(fixed.bridge, scope(fixed, 'paris', 'rome', '2026-10-30'))
  const store = createUIStateStore()
  store.initializeMissing(id, {
    datasetRefs: [first.datasetId, second.datasetId],
    citySequence: ['london', 'paris', 'rome'],
    dates: { start: '2026-10-26', end: '2026-10-31' },
    stays: [{ cityId: 'paris', nights: 3 }],
    modesByLeg: { 'paris:rome': ['train'] },
    sortByLeg: { 'paris:rome': { field: 'durationMinutes', direction: 'asc' } },
    calendarDateByLeg: { 'paris:rome': '2026-10-30' },
    selectedFareIds: [FareIdSchema.parse('london-paris')],
  })
  const context = await captureAgentContextWithSelectedFares({
    turnId: 'thresholds',
    activeArtifactId: id,
    artifactIds: [id],
    store,
    bridge: fixed.bridge,
    displayStore: displayStore(),
    componentBindings: new Map([[id, [{ key: 'latest-grid', type: 'MultiCityPlanGrid' }]]]),
  })
  expect(context.artifacts[0]?.legThresholds).toEqual([
    expect.objectContaining({ legKey: 'london:paris', earliestDeparture: '2026-10-26T00:00:00.000Z', source: 'trip-date', selectedFareId: 'london-paris' }),
    expect.objectContaining({ legKey: 'paris:rome', earliestDeparture: '2026-10-30T17:00:00.000Z', source: 'selected-arrival', precedingFareId: 'london-paris' }),
  ])
  expect(context.selectedFareFacts).toHaveLength(1)
  expect(context.artifacts[0]).toMatchObject({ modesByLeg: { 'paris:rome': ['train'] }, sortByLeg: { 'paris:rome': { field: 'durationMinutes', direction: 'asc' } }, calendarDateByLeg: { 'paris:rome': '2026-10-30' } })
  expect(context.artifacts[0]?.componentBindings.slice(0, 3)).toEqual([
    { key: 'latest-grid', type: 'MultiCityPlanGrid' },
    { key: 'latest-grid.leg-1.cities', type: 'CityField', legIndex: 0, legKey: 'london:paris', datasetRef: first.datasetId, actionRef: 'route' },
    { key: 'latest-grid.leg-1.date', type: 'TravelDate', legIndex: 0, legKey: 'london:paris', datasetRef: first.datasetId, actionRef: 'dates' },
  ])
  expect(JSON.stringify(context)).not.toMatch(/"rows"|"fares"/)
})

it('compacts synthesized grid bindings while retaining an eight-leg selected itinerary', async () => {
  const fixed = createFixedProjectionFixture({
    sourceVersion: 'eight-leg-source-v1',
    rows: value => {
      const index = Number(value.originId.replace('city-', ''))
      return [fare({ id: `fare-${value.originId}-${value.destinationId}`, originId: value.originId, destinationId: value.destinationId, serviceDate: value.dateWindow.from, priceCents: 1000 + index, durationMinutes: 60, departureMinutes: 480 + index * 120 })]
    },
  })
  const store = createUIStateStore()
  const artifactId = ArtifactIdSchema.parse('eight-leg-grid')
  const refs = []
  const seedRefs = []
  const selected = []
  const cities = Array.from({ length: 9 }, (_, index) => `city-${index}`)
  for (let index = 0; index < 8; index += 1) {
    const seed = await cacheScope(fixed.bridge, scope(fixed, cities[index]!, cities[index + 1]!, '2026-10-25'))
    const current = await cacheScope(fixed.bridge, scope(fixed, cities[index]!, cities[index + 1]!, '2026-10-26'))
    seedRefs.push(seed.datasetId)
    refs.push(current.datasetId)
    selected.push(FareIdSchema.parse(`fare-${cities[index]}-${cities[index + 1]}`))
  }
  store.initializeMissing(artifactId, { datasetRefs: refs, citySequence: cities, dates: { start: '2026-10-26' }, stays: cities.slice(1).map(cityId => ({ cityId, nights: 0 })), selectedFareIds: selected })
  const context = await captureAgentContextWithSelectedFares({
    turnId: 'eight-leg',
    activeArtifactId: artifactId,
    artifactIds: [artifactId],
    store,
    bridge: fixed.bridge,
    displayStore: displayStore(),
    componentBindings: new Map([[artifactId, [{ key: 'newest-grid', type: 'MultiCityPlanGrid' }, ...seedRefs.map((datasetRef, index) => ({ key: `authored-${index + 1}`, type: 'FadeFares', legIndex: index, datasetRef }))]]]),
  })
  const active = context.artifacts[0]
  expect(active?.datasetRefs).toHaveLength(8)
  expect(active?.legThresholds).toHaveLength(8)
  expect(context.plannedFareIds).toHaveLength(8)
  expect(context.selectedFareFacts).toHaveLength(8)
  expect(active?.componentBindings[0]).toEqual({ key: 'newest-grid', type: 'MultiCityPlanGrid' })
  expect(active?.componentBindings.find(binding => binding.key === 'authored-1')?.datasetRef).toBe(refs[0])
  const exportedRefs = new Set(context.datasets.map(dataset => dataset.datasetId))
  for (const binding of active?.componentBindings ?? []) if (binding.datasetRef) expect(exportedRefs.has(binding.datasetRef)).toBe(true)
  expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(LIMITS.snapshotBytes)
  expect(JSON.stringify(context)).not.toMatch(/"rows"|"fares"/)
})
