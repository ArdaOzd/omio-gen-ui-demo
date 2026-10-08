import { describe, expect, it } from 'vitest'
import { ArtifactIdSchema, FareIdSchema } from '../contracts'
import {
  FareItemSchema,
  ResultKeySchema,
  type FareItem,
  type FareScope,
  type FareScopeBinding,
} from '../contracts/query-groups'
import { createFixedProjectionFixture, type FixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { createActionRouter } from './action-router'
import { createUIStateStore } from './ui-state-store'

function scope(
  originId = 'london',
  destinationId = 'paris',
  from = '2026-10-02',
  to = from,
  minutes = 0,
): FareScope {
  return {
    kind: 'fareScope',
    originId,
    destinationId,
    dateWindow: { from, to },
    passengers: 1,
    earliestDeparture: { date: from, minutes },
  }
}

function dates(value: FareScope): string[] {
  const result: string[] = []
  for (let current = Date.parse(`${value.dateWindow.from}T00:00:00.000Z`), last = Date.parse(`${value.dateWindow.to}T00:00:00.000Z`); current <= last; current += 86_400_000) {
    result.push(new Date(current).toISOString().slice(0, 10))
  }
  return result
}

function fare(value: FareScope, serviceDate: string, mode: 'train' | 'bus' = 'train', overrides: Partial<FareItem> = {}): FareItem {
  const durationMinutes = overrides.durationMinutes ?? 120
  return FareItemSchema.parse({
    id: `${value.originId}-${value.destinationId}-${serviceDate}-${mode}`,
    originId: value.originId,
    destinationId: value.destinationId,
    serviceDate,
    mode,
    carrierId: mode === 'train' ? 'test-rail' : 'test-bus',
    carrierName: mode === 'train' ? 'Test Rail' : 'Test Bus',
    priceCents: mode === 'train' ? 1000 : 2000,
    durationMinutes,
    departureMinutes: 600,
    availableSeats: 4,
    currency: 'EUR',
    synthetic: true,
    priceBasis: 'per-passenger-including-demo-fees',
    direct: true,
    legs: [{
      legIndex: 0,
      mode,
      carrierName: mode === 'train' ? 'Test Rail' : 'Test Bus',
      durationMinutes,
      originId: value.originId,
      destinationId: value.destinationId,
      originLabel: value.originId,
      destinationLabel: value.destinationId,
    }],
    ...overrides,
  })
}

function fixture(options: {
  sourceVersion?: string
  rows?: (value: FareScope, signal: AbortSignal) => readonly FareItem[] | Promise<readonly FareItem[]>
} = {}) {
  const calls: FareScope[] = []
  const fixed = createFixedProjectionFixture({
    sourceVersion: options.sourceVersion ?? 'action-router-v1',
    rows: async (value, signal) => {
      calls.push(structuredClone(value))
      return options.rows ? options.rows(value, signal) : dates(value).flatMap(date => [fare(value, date), fare(value, date, 'bus')])
    },
  })
  return { fixed, calls }
}

async function loadAndCache(fixed: FixedProjectionFixture, value: FareScope): Promise<FareScopeBinding> {
  const manifest = await fixed.bridge.loadScope(value, new AbortController().signal)
  const binding = fixed.bridge.getBinding(manifest.resourceKey)
  await fixed.bridge.executeGroup({
    groupId: `cache-${binding.resourceKey}`,
    scope: value,
    projections: [{
      projectionId: 'cache-page',
      kind: 'farePage',
      filters: { modes: [], carrierIds: [], directOnly: false },
      serviceDate: null,
      sort: { field: 'departureMinutes', direction: 'asc' },
      after: null,
      limit: 100,
    }],
  }, new AbortController().signal)
  return binding
}

function bindingFor(bridge: FixedProjectionFixture['bridge'], refs: readonly FareScopeBinding['datasetId'][], originId: string, destinationId: string) {
  return refs.flatMap(ref => bridge.findBinding(ref) ?? []).find(binding =>
    binding.manifest.coverage.originId === originId && binding.manifest.coverage.destinationId === destinationId)
}

describe('direct action coverage routing', () => {
  it('rejects a calendar day captured from an obsolete committed result', async () => {
    const { fixed } = fixture()
    const binding = await loadAndCache(fixed, scope('london', 'paris', '2026-10-02', '2026-10-08'))
    const store = createUIStateStore()
    const id = ArtifactIdSchema.parse('stale-calendar-result')
    store.initializeMissing(id, {
      datasetRefs: [binding.datasetId],
      citySequence: ['london', 'paris'],
      dates: { start: '2026-10-02', end: '2026-10-08' },
    })
    const router = createActionRouter(store, { bridge: fixed.bridge })
    let currentResultKey = ResultKeySchema.parse('calendar-result-1')
    const captured = {
      legKey: 'london:paris',
      date: '2026-10-03',
      availableDates: ['2026-10-03'],
      resourceKey: binding.resourceKey,
      datasetId: binding.datasetId,
      datasetRevision: binding.datasetRevision,
      sourceVersion: binding.manifest.source.sourceVersion,
      resultKey: currentResultKey,
      currentResultKey: () => currentResultKey,
      selectionKey: JSON.stringify(store.get(id).selectedFareIds),
    }
    currentResultKey = ResultKeySchema.parse('calendar-result-2')
    const before = store.get(id)
    expect(router.calendarDateFromQuery({ kind: 'calendarDateByLeg', artifactId: id, calendarDateByLeg: { 'london:paris': '2026-10-03' } }, captured)).toEqual({ status: 'stale', revision: before.revision })
    expect(store.get(id)).toEqual(before)
    router.dispose()
  })

  it('keeps filter edits inside the current scope and loads a bounded new date without a model turn', async () => {
    const { fixed, calls } = fixture()
    const initial = await loadAndCache(fixed, scope('london', 'paris', '2026-10-02', '2026-10-08'))
    const store = createUIStateStore()
    const id = ArtifactIdSchema.parse('bounded-date')
    store.initializeMissing(id, { dates: { start: '2026-10-02', end: '2026-10-08' }, citySequence: ['london', 'paris'], datasetRefs: [initial.datasetId] })
    const router = createActionRouter(store, { bridge: fixed.bridge })

    const before = calls.length
    router({ kind: 'filters', artifactId: id, filters: { ...store.get(id).filters, directOnly: true } })
    await router.whenIdle(id)
    expect(calls).toHaveLength(before)

    router({ kind: 'dates', artifactId: id, dates: { start: '2026-11-01' } })
    await router.whenIdle(id)
    expect(calls.some(call => call.dateWindow.from === '2026-11-01' && call.dateWindow.to === '2026-11-01')).toBe(true)
    const current = bindingFor(fixed.bridge, store.get(id).datasetRefs, 'london', 'paris')
    expect(current?.manifest.coverage.dateWindow).toEqual({ from: '2026-11-01', to: '2026-11-01' })
    expect(store.get(id).dates.start).toBe('2026-11-01')
    router.dispose()
  })

  it('rejects a late superseded scope without overwriting the newer date', async () => {
    let firstStarted = () => {}
    const started = new Promise<void>(resolve => { firstStarted = resolve })
    const { fixed } = fixture({ rows: async (value, signal) => {
      if (value.dateWindow.from === '2026-11-01') {
        firstStarted()
        await new Promise<void>((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
        })
      }
      return dates(value).map(date => fare(value, date))
    } })
    const initial = await loadAndCache(fixed, scope())
    const store = createUIStateStore()
    const id = ArtifactIdSchema.parse('superseded-date')
    store.initializeMissing(id, { dates: { start: '2026-10-02' }, citySequence: ['london', 'paris'], datasetRefs: [initial.datasetId] })
    const router = createActionRouter(store, { bridge: fixed.bridge })

    router({ kind: 'dates', artifactId: id, dates: { start: '2026-11-01' } })
    await started
    router({ kind: 'dates', artifactId: id, dates: { start: '2026-11-02' } })
    await router.whenIdle(id)
    expect(store.get(id).dates.start).toBe('2026-11-02')
    expect(bindingFor(fixed.bridge, store.get(id).datasetRefs, 'london', 'paris')?.manifest.coverage.dateWindow.from).toBe('2026-11-02')
    router.dispose()
  })

  it('cancels held coverage so navigation can continue and ignores its late result', async () => {
    let started = () => {}
    let finish = () => {}
    const observed = new Promise<void>(resolve => { started = resolve })
    const held = new Promise<void>(resolve => { finish = resolve })
    const { fixed } = fixture({ rows: async (value, signal) => {
      if (value.dateWindow.from === '2026-11-01') {
        started()
        await Promise.race([
          held,
          new Promise<never>((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })),
        ])
      }
      return dates(value).map(date => fare(value, date))
    } })
    const initial = await loadAndCache(fixed, scope())
    const store = createUIStateStore()
    const id = ArtifactIdSchema.parse('cancel-held')
    store.initializeMissing(id, { dates: { start: '2026-10-02' }, citySequence: ['london', 'paris'], datasetRefs: [initial.datasetId] })
    const router = createActionRouter(store, { bridge: fixed.bridge })

    router({ kind: 'dates', artifactId: id, dates: { start: '2026-11-01' } })
    await observed
    router.cancelPending()
    await router.whenIdle(id)
    expect(store.get(id).datasetRefs).toEqual([initial.datasetId])
    finish()
    await Promise.resolve()
    expect(store.get(id).datasetRefs).toEqual([initial.datasetId])
    router.dispose()
  })
})

it('loads adjacent legs at stay offsets, routes leg modes, and replaces invalid alternatives', async () => {
  const { fixed, calls } = fixture()
  const firstScope = scope()
  const first = await loadAndCache(fixed, firstScope)
  const store = createUIStateStore()
  const id = ArtifactIdSchema.parse('multi')
  store.initializeMissing(id, {
    dates: { start: '2026-10-02' },
    citySequence: ['london', 'paris', 'barcelona'],
    datasetRefs: [first.datasetId],
  })
  const router = createActionRouter(store, { bridge: fixed.bridge })

  router({ kind: 'stays', artifactId: id, stays: [{ cityId: 'paris', nights: 2 }, { cityId: 'barcelona', nights: 4 }] })
  await router.whenIdle(id)
  expect(calls.some(call => call.originId === 'paris' && call.destinationId === 'barcelona' && call.dateWindow.from === '2026-10-04')).toBe(true)
  const second = bindingFor(fixed.bridge, store.get(id).datasetRefs, 'paris', 'barcelona')
  if (!second) throw new Error('Missing second leg')
  await fixed.bridge.executeGroup({
    groupId: 'cache-second-leg',
    scope: second.manifest.coverage,
    projections: [{ projectionId: 'second-page', kind: 'farePage', filters: { modes: [], carrierIds: [], directOnly: false }, serviceDate: null, sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 100 }],
  }, new AbortController().signal)

  router({ kind: 'modesByLeg', artifactId: id, modesByLeg: { 'paris:barcelona': ['bus'] } })
  await router.whenIdle(id)
  expect(store.get(id).modesByLeg['paris:barcelona']).toEqual(['bus'])

  const firstTrain = fare(firstScope, '2026-10-02').id
  const firstBus = fare(firstScope, '2026-10-02', 'bus').id
  const secondBus = fare(second.manifest.coverage, '2026-10-04', 'bus').id
  router({ kind: 'select', artifactId: id, fareId: firstTrain, selected: true })
  await router.whenIdle(id)
  router({ kind: 'select', artifactId: id, fareId: firstBus, selected: true })
  await router.whenIdle(id)
  router({ kind: 'select', artifactId: id, fareId: secondBus, selected: true })
  await router.whenIdle(id)
  expect(store.get(id).selectedFareIds).toEqual([firstBus])

  router({ kind: 'stays', artifactId: id, stays: [{ cityId: 'paris', nights: 3 }, { cityId: 'barcelona', nights: 4 }] })
  await router.whenIdle(id)
  expect(calls.some(call => call.originId === 'paris' && call.destinationId === 'barcelona' && call.dateWindow.from === '2026-10-05')).toBe(true)
  expect(store.get(id).selectedFareIds).toEqual([firstBus])
  expect(() => fixed.bridge.getBinding(first.resourceKey)).not.toThrow()
  router.dispose()
})

it('prunes fares from removed route legs without letting an older route edit win', async () => {
  const { fixed } = fixture()
  const initialScope = scope()
  const seed = await loadAndCache(fixed, initialScope)
  const selected = fare(initialScope, '2026-10-02').id
  const store = createUIStateStore()
  const id = ArtifactIdSchema.parse('route-selection')
  store.initializeMissing(id, {
    datasetRefs: [seed.datasetId],
    citySequence: ['london', 'paris'],
    dates: { start: '2026-10-02' },
    selectedFareIds: [selected],
  })
  const router = createActionRouter(store, { bridge: fixed.bridge })

  router({ kind: 'route', artifactId: id, citySequence: ['london', 'rome'] })
  router({ kind: 'route', artifactId: id, citySequence: ['london', 'paris'] })
  await router.whenIdle(id)
  expect(store.get(id).selectedFareIds).toEqual([selected])

  router({ kind: 'route', artifactId: id, citySequence: ['london', 'rome'] })
  await router.whenIdle(id)
  expect(store.get(id).selectedFareIds).toEqual([])
  expect(store.exportSnapshot(id).selectedFareIds).toEqual([])
  expect(store.get(id).datasetRefs.map(datasetId => fixed.bridge.findBinding(datasetId)?.manifest.coverage).every(coverage => coverage?.originId === 'london' && coverage.destinationId === 'rome')).toBe(true)
  router.dispose()
})

it('replaces current scope atomically and retains a shared old scope until its last owner leaves', async () => {
  const { fixed } = fixture()
  const seed = await loadAndCache(fixed, scope())
  const store = createUIStateStore()
  const first = ArtifactIdSchema.parse('owner-a')
  const second = ArtifactIdSchema.parse('owner-b')
  for (const artifactId of [first, second]) store.initializeMissing(artifactId, { datasetRefs: [seed.datasetId], citySequence: ['london', 'paris'], dates: { start: '2026-10-02' } })
  const router = createActionRouter(store, { bridge: fixed.bridge })

  router({ kind: 'dates', artifactId: first, dates: { start: '2026-11-01' } })
  await router.whenIdle(first)
  expect(store.get(first).datasetRefs).not.toContain(seed.datasetId)
  expect(store.get(second).datasetRefs).toEqual([seed.datasetId])
  expect(() => fixed.bridge.getBinding(seed.resourceKey)).not.toThrow()

  router({ kind: 'dates', artifactId: second, dates: { start: '2026-11-02' } })
  await router.whenIdle(second)
  expect(() => fixed.bridge.getBinding(seed.resourceKey)).toThrow()
  router.dispose()
})

it('rejects a direct selection from an expired fare scope', async () => {
  const { fixed } = fixture()
  const initialScope = scope()
  const expired = await loadAndCache(fixed, initialScope)
  const store = createUIStateStore()
  const id = ArtifactIdSchema.parse('expired-selection')
  store.initializeMissing(id, { dates: { start: '2026-10-02' } })
  fixed.bridge.release(expired.resourceKey)
  const router = createActionRouter(store, { bridge: fixed.bridge })
  router({ kind: 'select', artifactId: id, fareId: FareIdSchema.parse(fare(initialScope, '2026-10-02').id), selected: true })
  await router.whenIdle(id)
  expect(store.get(id).selectedFareIds).toEqual([])
  router.dispose()
})

it('drops zero-count modes while retaining requested modes for later scopes', async () => {
  const { fixed } = fixture({ rows: value => dates(value).map(date => fare(value, date)) })
  const seed = await loadAndCache(fixed, scope())
  const store = createUIStateStore()
  const id = ArtifactIdSchema.parse('actual-modes')
  store.initializeMissing(id, {
    datasetRefs: [seed.datasetId],
    citySequence: ['london', 'paris'],
    dates: { start: '2026-10-02' },
    availableModesByLeg: { 'london:paris': ['train', 'bus'] },
    requestedModesByLeg: { 'london:paris': ['train', 'bus'] },
    modesByLeg: { 'london:paris': ['bus'] },
  })
  const router = createActionRouter(store, { bridge: fixed.bridge })
  router({ kind: 'dates', artifactId: id, dates: { start: '2026-11-01' } })
  await router.whenIdle(id)
  expect(store.get(id).availableModesByLeg['london:paris']).toEqual(['train'])
  expect(store.get(id).modesByLeg['london:paris']).toEqual([])
  expect(store.get(id).requestedModesByLeg['london:paris']).toEqual(['train', 'bus'])
  router.dispose()
})

it('keeps the trip start and upstream fare when a valid arrival-derived downstream fare is selected', async () => {
  const firstScope = scope('london', 'paris', '2026-10-26')
  const secondScope = scope('paris', 'rome', '2026-10-30', '2026-10-30', 17 * 60)
  const firstFare = fare(firstScope, '2026-10-26', 'train', { id: FareIdSchema.parse('overnight-first'), departureMinutes: 21 * 60, durationMinutes: 20 * 60 })
  const secondFare = fare(secondScope, '2026-10-30', 'train', { id: FareIdSchema.parse('valid-second'), departureMinutes: 18 * 60 })
  const { fixed } = fixture({ rows: value => value.originId === 'london' ? [firstFare] : [secondFare] })
  const first = await loadAndCache(fixed, firstScope)
  const second = await loadAndCache(fixed, secondScope)
  const store = createUIStateStore()
  const id = ArtifactIdSchema.parse('arrival-chain')
  store.initializeMissing(id, {
    datasetRefs: [first.datasetId, second.datasetId],
    citySequence: ['london', 'paris', 'rome'],
    dates: { start: '2026-10-26' },
    stays: [{ cityId: 'paris', nights: 3 }],
  })
  const router = createActionRouter(store, { bridge: fixed.bridge })
  router({ kind: 'select', artifactId: id, fareId: firstFare.id, selected: true })
  await router.whenIdle(id)
  router({ kind: 'select', artifactId: id, fareId: secondFare.id, selected: true })
  await router.whenIdle(id)
  expect(store.get(id).dates.start).toBe('2026-10-26')
  expect(store.get(id).selectedFareIds).toEqual([firstFare.id, secondFare.id])
  router.dispose()
})
