import { expect, it } from 'vitest'
import { ArtifactIdSchema } from '../contracts'
import { FareItemSchema, ResultKeySchema, type FareItem } from '../contracts/query-groups'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { createPlanningStore } from '../tracker/planning-store'
import { createActionRouter, type CoverageLoadStatus, type QueryFareSelectionScope } from './action-router'
import { createUIStateStore } from './ui-state-store'

const id = ArtifactIdSchema.parse('trip')
const dates = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']

function item(originId: string, destinationId: string, serviceDate: string): FareItem {
  return FareItemSchema.parse({
    id: `${originId}-${destinationId}-${serviceDate}`,
    originId,
    destinationId,
    serviceDate,
    mode: 'bus',
    carrierId: 'demo',
    carrierName: 'Demo Bus',
    priceCents: 1000,
    durationMinutes: 140,
    departureMinutes: 600,
    availableSeats: 10,
    currency: 'EUR',
    synthetic: true,
    priceBasis: 'per-passenger-including-demo-fees',
    direct: true,
    legs: [{ legIndex: 0, mode: 'bus', carrierName: 'Demo Bus', durationMinutes: 140, originId, destinationId, originLabel: originId, destinationLabel: destinationId }],
  })
}

async function fixture(originId = 'london', destinationId = 'paris', dateWindow = { from: dates[0]!, to: dates.at(-1)! }, onCoverageStatus?: (status:CoverageLoadStatus)=>void) {
  const fixed = createFixedProjectionFixture({ rows: dates.map(date => item(originId, destinationId, date)), sourceVersion: 'selection-source-v1' })
  const scope = fixed.scope({ originId, destinationId, dateWindow, passengers: 1, earliestDeparture: { date: dateWindow.from, minutes: 0 } })
  const manifest = await fixed.bridge.loadScope(scope, new AbortController().signal)
  const binding = fixed.bridge.getBinding(manifest.resourceKey)
  const group = await fixed.bridge.executeGroup({
    groupId: 'selection-dates',
    scope,
    projections: [{ projectionId: 'selection-page', kind: 'farePage', filters: { modes: ['bus'], carrierIds: [], directOnly: false }, serviceDate: null, sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 100 }],
  }, new AbortController().signal)
  const page = group.projections[0]
  if (!page || page.kind !== 'farePage') throw new Error('Selection fixture did not return a fare page')
  const state = createUIStateStore()
  state.initializeMissing(id, { datasetRefs: [binding.datasetId], dates: { start: dates[0]! } })
  const planning = createPlanningStore()
  const router = createActionRouter(state, { bridge: fixed.bridge, planning, onCoverageStatus })
  let currentResultKey = ResultKeySchema.parse('selection-result-v1')
  const fare = (date: string) => FareItemSchema.shape.id.parse(`${originId}-${destinationId}-${date}`)
  const selectionScope = (fareIds: QueryFareSelectionScope['fareIds']): QueryFareSelectionScope => ({
    kind: 'query-result',
    fareIds,
    resultKey: currentResultKey,
    currentResultKey: () => currentResultKey,
    resourceKey: binding.resourceKey,
    datasetId: binding.datasetId,
    datasetRevision: binding.datasetRevision,
    sourceVersion: binding.manifest.source.sourceVersion,
  })
  return {
    bridge: fixed.bridge,
    state,
    binding,
    planning,
    router,
    fare,
    selectionScope,
    replaceResult: () => { currentResultKey = ResultKeySchema.parse('selection-result-v2') },
  }
}

it('retains an explicit authored multi-date choice with its source and exports the aligned date and selected ID', async () => {
  const { state, binding, planning, router, fare, selectionScope } = await fixture()
  const selected = fare('2026-10-10')
  router.selectFromQuery({ kind: 'select', artifactId: id, fareId: selected, selected: true }, selectionScope([selected]))
  await router.whenIdle(id)
  expect(state.exportSnapshot(id)).toMatchObject({ dates: { start: '2026-10-10' }, selectedFareIds: [selected] })
  expect(planning.get()).toMatchObject([{
    fact: { id: selected },
    owners: [id],
    sources: [{ owner: id, source: binding.manifest.source, scope: binding.manifest.coverage }],
  }])
  router.dispose()
})

it('keeps a covered selection ready when reconciliation needs no new scope', async () => {
  const statuses: CoverageLoadStatus[] = []
  const { state, router, fare, selectionScope } = await fixture('london', 'paris', { from: dates[0]!, to: dates.at(-1)! }, status => statuses.push(status))
  const selected = fare('2026-10-10')

  router.selectFromQuery({ kind: 'select', artifactId: id, fareId: selected, selected: true }, selectionScope([selected]))
  await router.whenIdle(id)

  expect(state.get(id).selectedFareIds).toEqual([selected])
  expect(statuses.filter(status => status.status === 'error')).toEqual([])
  expect(statuses.at(-1)?.status).toBe('ready')
  router.dispose()
})

it('rejects a stale native point offer and an obsolete committed result without silently aligning dates', async () => {
  const { state, router, fare, selectionScope, replaceResult } = await fixture()
  const existing = fare('2026-10-09')
  const selected = fare('2026-10-10')
  router.selectFromQuery({ kind: 'select', artifactId: id, fareId: existing, selected: true }, selectionScope([existing]))
  await router.whenIdle(id)
  const captured = selectionScope([selected])
  replaceResult()
  expect(router.selectFromQuery({ kind: 'select', artifactId: id, fareId: selected, selected: true }, captured).status).toBe('stale')
  expect(state.get(id).dates.start).toBe('2026-10-09')
  expect(state.get(id).selectedFareIds).toEqual([existing])
  router.dispose()
})

it('preserves an explicit inclusive window for an in-window choice and rejects an out-of-window normal offer', async () => {
  const { state, router, fare, selectionScope } = await fixture()
  const selected = fare('2026-10-10')
  state.dispatch({ kind: 'dates', artifactId: id, dates: { start: '2026-10-09', end: '2026-10-11' } })
  router.selectFromQuery({ kind: 'select', artifactId: id, fareId: selected, selected: true }, selectionScope([selected]))
  await router.whenIdle(id)
  expect(state.get(id)).toMatchObject({ dates: { start: '2026-10-09', end: '2026-10-11' }, selectedFareIds: [selected] })
  expect(router.selectFromQuery({ kind: 'select', artifactId: id, fareId: fare('2026-10-12'), selected: true }, selectionScope([])).status).toBe('stale')
  expect(state.get(id).dates).toEqual({ start: '2026-10-09', end: '2026-10-11' })
  expect(state.get(id).selectedFareIds).not.toContain(fare('2026-10-12'))
  router.dispose()
})

it('keeps the trip start for a later leg and lets the latest same-leg choice win', async () => {
  const { state, router, fare, selectionScope } = await fixture('paris', 'barcelona', { from: '2026-10-11', to: '2026-10-15' })
  state.dispatch({ kind: 'route', artifactId: id, citySequence: ['london', 'paris', 'barcelona'] })
  state.dispatch({ kind: 'stays', artifactId: id, stays: [{ cityId: 'paris', nights: 2 }, { cityId: 'barcelona', nights: 4 }] })
  state.dispatch({ kind: 'displayWindowByLeg', artifactId: id, displayWindowByLeg: { 'paris:barcelona': { from: '2026-10-11', to: '2026-10-15' } } })
  const first = fare('2026-10-12')
  const second = fare('2026-10-13')
  router.selectFromQuery({ kind: 'select', artifactId: id, fareId: first, selected: true }, selectionScope([first, second]))
  await router.whenIdle(id)
  expect(state.get(id).dates.start).toBe('2026-10-09')
  router.selectFromQuery({ kind: 'select', artifactId: id, fareId: second, selected: true }, selectionScope([first, second]))
  await router.whenIdle(id)
  expect(state.exportSnapshot(id)).toMatchObject({ dates: { start: '2026-10-09' }, selectedFareIds: [second] })
  router.dispose()
})

it('moves later leg display windows with changed stays while preserving each span', () => {
  const state = createUIStateStore()
  state.initializeMissing(id, {
    citySequence: ['london', 'paris', 'rome', 'vienna'],
    stays: [{ cityId: 'paris', nights: 3 }, { cityId: 'rome', nights: 2 }],
    displayWindowByLeg: {
      'london:paris': { from: '2026-10-10', to: '2026-10-16' },
      'paris:rome': { from: '2026-10-13', to: '2026-10-19' },
      'rome:vienna': { from: '2026-10-15', to: '2026-10-21' },
    },
  })
  state.dispatch({ kind: 'stays', artifactId: id, stays: [{ cityId: 'paris', nights: 1 }, { cityId: 'rome', nights: 3 }] })
  expect(state.get(id).displayWindowByLeg).toEqual({
    'london:paris': { from: '2026-10-10', to: '2026-10-16' },
    'paris:rome': { from: '2026-10-11', to: '2026-10-17' },
    'rome:vienna': { from: '2026-10-14', to: '2026-10-20' },
  })
})

it('rejects IDs absent from the committed result and result handles replaced afterward', async () => {
  const { state, router, fare, selectionScope, replaceResult } = await fixture()
  const selected = fare('2026-10-10')
  expect(router.selectFromQuery({ kind: 'select', artifactId: id, fareId: selected, selected: true }, selectionScope([])).status).toBe('stale')
  const captured = selectionScope([selected])
  replaceResult()
  expect(router.selectFromQuery({ kind: 'select', artifactId: id, fareId: selected, selected: true }, captured).status).toBe('stale')
  expect(state.get(id).selectedFareIds).toEqual([])
  router.dispose()
})

it('rechecks the committed result after asynchronous reconciliation before aligning the date', async () => {
  const { state, router, fare, selectionScope, replaceResult } = await fixture()
  const selected = fare('2026-10-10')
  router.selectFromQuery({ kind: 'select', artifactId: id, fareId: selected, selected: true }, selectionScope([selected]))
  replaceResult()
  await router.whenIdle(id)
  expect(state.get(id).dates).toEqual({ start: '2026-10-09' })
  expect(state.get(id).selectedFareIds).toEqual([])
  router.dispose()
})

it('cancels an obsolete pin lookup before it can realign a newer selection state', async () => {
  const statuses: CoverageLoadStatus[] = []
  const { bridge, state, router, fare, selectionScope } = await fixture('london','paris',{from:dates[0]!,to:dates.at(-1)!},status=>statuses.push(status))
  const originalLookup = bridge.lookupPins.bind(bridge)
  let markStarted = () => {}
  const started = new Promise<void>(resolve => { markStarted = resolve })
  let lookupCount=0
  bridge.lookupPins = async (input, signal) => {
    lookupCount+=1
    if(lookupCount>1)return originalLookup(input,signal)
    markStarted()
    await new Promise<void>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    })
    return originalLookup(input, signal)
  }
  const obsolete = fare('2026-10-10'),selected=fare('2026-10-11')
  router.selectFromQuery({ kind: 'select', artifactId: id, fareId: obsolete, selected: true }, selectionScope([obsolete]))
  await started
  router.selectFromQuery({ kind: 'select', artifactId: id, fareId: selected, selected: true }, selectionScope([obsolete,selected]))
  await router.whenIdle(id)
  expect(state.get(id)).toMatchObject({ dates: { start: '2026-10-11' }, selectedFareIds: [selected] })
  expect(statuses.filter(status=>status.status==='error')).toEqual([])
  router.dispose()
})
