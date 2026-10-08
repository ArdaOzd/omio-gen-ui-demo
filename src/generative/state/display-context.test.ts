import { describe, expect, it } from 'vitest'
import { ComponentIdentitySchema, type InspectDisplayItem } from '../contracts/display-context'
import { QueryExecutionStateSchema, QueryGroupScopeSchema } from '../contracts/query-groups'
import { createDisplayContextStore, DisplayInspectionError } from './display-context'

const identity = (value: string, componentType = 'FareCards') => ComponentIdentitySchema.parse({
  componentRef: { value, keySource: 'authored-key' },
  componentType,
  scope: { kind: 'leg', artifactId: 'artifact-1', legIndex: 0, legKey: 'london:paris', resourceKey: 'scope-1' },
  authored: {},
})

const intent = (desiredInputHash: string, desiredInputVersion: number) => ({
  queryKey: 'fare-list',
  groupKey: 'artifact-1:leg:london:paris',
  projectionKey: 'ordered',
  desiredInputHash,
  desiredInputVersion,
  uiRevision: 3,
})

const current = (inputHash: string, inputVersion: number, resultKey = `result-${inputVersion}`) => ({
  resultKey,
  inputHash,
  inputVersion,
  requestId: `request-${inputVersion}`,
  resourceKey: 'scope-1',
  datasetId: 'dataset-1',
  datasetRevision: 1,
  sourceVersion: 'source-1',
  resultFingerprint: `fingerprint-${inputVersion}`,
  total: 2,
  truncated: false,
})

const inspectionItems: InspectDisplayItem[] = [
  { itemId: 'fare-1', rank: 1, label: 'First fare' },
  { itemId: 'fare-2', rank: 2, label: 'Second fare' },
]

const fact = (id: string) => ({
  id,
  originId: 'london',
  destinationId: 'paris',
  serviceDate: '2026-10-26',
  mode: 'train' as const,
  carrierId: 'rail',
  carrierName: 'Rail',
  priceCents: 2500,
  durationMinutes: 120,
  departureMinutes: 600,
  currency: 'EUR' as const,
  synthetic: true as const,
  priceBasis: 'per-passenger-including-demo-fees' as const,
  direct: true,
  legs: [{ legIndex: 0, mode: 'train' as const, carrierName: 'Rail', durationMinutes: 120, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
})

const connectedFact = (id: string) => ({
  ...fact(id),
  destinationId: 'rome',
  direct: false,
  durationMinutes: 240,
  legs: [
    { legIndex: 0, mode: 'train' as const, carrierName: 'Rail', durationMinutes: 60, originId: 'london', destinationId: 'brussels', originLabel: 'London', destinationLabel: 'Brussels' },
    { legIndex: 1, mode: 'train' as const, carrierName: 'Rail', durationMinutes: 60, originId: 'brussels', destinationId: 'paris', originLabel: 'Brussels', destinationLabel: 'Paris' },
    { legIndex: 2, mode: 'train' as const, carrierName: 'Rail', durationMinutes: 60, originId: 'paris', destinationId: 'milan', originLabel: 'Paris', destinationLabel: 'Milan' },
    { legIndex: 3, mode: 'train' as const, carrierName: 'Rail', durationMinutes: 60, originId: 'milan', destinationId: 'rome', originLabel: 'Milan', destinationLabel: 'Rome' },
  ],
})

describe('display context store', () => {
  it('replaces an unmounted streaming identity but rejects a simultaneous owner collision', () => {
    const store = createDisplayContextStore()
    const partial = identity('root.streaming', 'ArtifactSkeleton')
    const complete = { ...identity('root.streaming', 'FareCards'), authored: { title: 'Current fares' } }
    const cleanup = store.register(partial)
    expect(() => store.register(complete)).toThrow(/Conflicting display component/)
    cleanup()
    expect(() => store.register(complete)).not.toThrow()
    expect(store.get('root.streaming')?.identity).toEqual(complete)
  })

  it('captures a pending intent separately from the result still displayed', () => {
    const store = createDisplayContextStore()
    store.register(identity('root.fares'))
    store.setGroup('root.fares', QueryGroupScopeSchema.parse({ artifactId: 'artifact-1', legKey: 'london:paris', purpose: 'primary-fare-list' }))
    store.setInputs('root.fares', {
      values: { originId: 'london', destinationId: 'paris', passengers: 2, modes: ['train'] },
      provenance: [
        { field: 'passengers', origin: 'user', eventSequence: 8, componentRef: 'root.passengers' },
        { field: 'originId', origin: 'unknown' },
      ],
    })
    store.setExecution('root.fares', QueryExecutionStateSchema.parse({ status: 'refreshing', intent: intent('input-new', 2), current: current('input-old', 1) }))
    store.setDisplay('root.fares', {
      payload: { kind: 'fare-order', orderedFareRefs: [{ fareId: 'fare-1', rank: 1 }, { fareId: 'fare-2', rank: 2 }], viewport: { offset: 0, limit: 2 } },
      totalDisplayed: 2,
      includedCount: 2,
      complete: true,
      omittedCount: 0,
    }, { ...current('input-old', 1), items: inspectionItems })

    const capture = store.capture({ captureId: 'capture-1', artifactIds: ['artifact-1'] })
    expect(capture.components[0]?.execution).toMatchObject({
      status: 'refreshing',
      intent: { desiredInputHash: 'input-new', desiredInputVersion: 2 },
      current: { inputHash: 'input-old', inputVersion: 1 },
    })
    expect(capture.exposedOrderedIds).toEqual(['fare-1', 'fare-2'])
    expect(capture.components[0]?.provenance).toEqual([
      { field: 'passengers', origin: 'user', eventSequence: 8, componentRef: 'root.passengers' },
      { field: 'originId', origin: 'unknown' },
    ])
  })

  it('keeps inspection bound to the immutable captured result', () => {
    const store = createDisplayContextStore()
    store.register(identity('root.fares'))
    store.setExecution('root.fares', QueryExecutionStateSchema.parse({ status: 'ready', intent: intent('input-old', 1), current: current('input-old', 1) }))
    store.setDisplay('root.fares', {
      payload: { kind: 'fare-order', orderedFareRefs: [{ fareId: 'fare-1', rank: 1 }, { fareId: 'fare-2', rank: 2 }] },
      totalDisplayed: 2,
      includedCount: 2,
      complete: true,
      omittedCount: 0,
    }, { ...current('input-old', 1), items: inspectionItems })
    const frozen = store.capture({ captureId: 'capture-1', artifactIds: ['artifact-1'] })
    const handle = frozen.components[0]?.display?.displayHandle
    expect(handle).toBeTruthy()

    store.setExecution('root.fares', QueryExecutionStateSchema.parse({ status: 'ready', intent: intent('input-new', 2), current: current('input-new', 2) }))
    store.setDisplay('root.fares', {
      payload: { kind: 'fare-order', orderedFareRefs: [{ fareId: 'fare-3', rank: 1 }] },
      totalDisplayed: 1,
      includedCount: 1,
      complete: true,
      omittedCount: 0,
    }, { ...current('input-new', 2), items: [{ itemId: 'fare-3', rank: 1 }] })

    expect(store.inspect({ captureId: 'capture-1', displayHandle: handle!, resultKey: 'result-1', limit: 1 })).toMatchObject({
      inputHash: 'input-old',
      resultFingerprint: 'fingerprint-1',
      sourceVersion: 'source-1',
      items: [{ itemId: 'fare-1', rank: 1 }],
      nextCursor: '1',
      complete: false,
    })
    expect(() => store.inspect({ captureId: 'capture-1', displayHandle: handle!, resultKey: 'result-2' })).toThrowError(DisplayInspectionError)
  })

  it('records the active tab without deleting hidden child output', () => {
    const store = createDisplayContextStore()
    store.register(identity('root.tabs', 'Tabs'))
    store.register(identity('root.tabs.list'))
    store.register(identity('root.tabs.calendar', 'FareCalendar'))
    store.setDisplay('root.tabs.calendar', {
      payload: { kind: 'calendar', cells: [{ key: '2026-10-08', label: '8 Oct', value: 2, unit: 'count', available: true }] },
      totalDisplayed: 1,
      includedCount: 1,
      complete: true,
      omittedCount: 0,
    })
    store.setActiveChild('root.tabs', 'root.tabs.list', ['root.tabs.list', 'root.tabs.calendar'])

    const capture = store.capture({ captureId: 'capture-tabs', artifactIds: ['artifact-1'] })
    expect(capture.components.find(entry => entry.identity.componentRef.value === 'root.tabs')?.display?.payload).toEqual({
      kind: 'layout',
      activeChildRef: 'root.tabs.list',
      childRefs: ['root.tabs.list', 'root.tabs.calendar'],
    })
    expect(capture.components.find(entry => entry.identity.componentRef.value === 'root.tabs.calendar')).toMatchObject({
      visibility: 'hidden-tab',
      display: { payload: { kind: 'calendar' } },
    })
  })

  it('exposes only the visible viewport and never labels a hidden-tab fare as shown', () => {
    const store = createDisplayContextStore()
    store.register(identity('root.visible'))
    store.register(identity('root.hidden'))
    store.setExecution('root.visible', QueryExecutionStateSchema.parse({ status: 'ready', intent: intent('input-old', 1), current: current('input-old', 1) }))
    store.setExecution('root.hidden', QueryExecutionStateSchema.parse({ status: 'ready', intent: intent('input-old', 1), current: current('input-old', 1) }))
    store.setDisplay('root.visible', {
      payload: { kind: 'fare-order', orderedFareRefs: [{ fareId: 'fare-1', rank: 1 }, { fareId: 'fare-2', rank: 2 }, { fareId: 'fare-3', rank: 3 }], viewport: { offset: 1, limit: 1 } },
      totalDisplayed: 3,
      includedCount: 3,
      complete: true,
      omittedCount: 0,
    }, { ...current('input-old', 1), items: [{ itemId: 'fare-2', rank: 2, fact: fact('fare-2') }] })
    store.setDisplay('root.hidden', {
      payload: { kind: 'fare-order', orderedFareRefs: [{ fareId: 'fare-hidden', rank: 1 }] },
      totalDisplayed: 1,
      includedCount: 1,
      complete: true,
      omittedCount: 0,
    }, { ...current('input-old', 1), items: [{ itemId: 'fare-hidden', rank: 1, fact: fact('fare-hidden') }] })
    store.setVisibility('root.hidden', 'hidden-tab')

    const capture = store.capture({ captureId: 'capture-viewport', artifactIds: ['artifact-1'] })
    expect(capture.exposedOrderedIds).toEqual(['fare-2'])
    expect(capture.shownFareFacts.map(item => item.fact.id)).toEqual(['fare-2'])
    expect(capture.components.find(item => item.identity.componentRef.value === 'root.hidden')?.display?.displayHandle).toBeTruthy()
  })

  it('expires old captures and bounds interaction history', () => {
    const store = createDisplayContextStore({ maxCapturedDisplays: 1, maxEvents: 2 })
    store.register(identity('root.fares'))
    for (let index = 0; index < 3; index++) store.recordInteraction({ artifactId: 'artifact-1', componentRef: 'root.fares', actor: 'user', action: 'scroll', inputFields: [] })
    const first = store.capture({ captureId: 'capture-1', artifactIds: ['artifact-1'] })
    const second = store.capture({ captureId: 'capture-2', artifactIds: ['artifact-1'] })
    expect(first.recentInteractions.map(event => event.sequence)).toEqual([2, 3])
    expect(second.recentInteractions).toHaveLength(2)
    expect(() => store.inspect({ captureId: 'capture-1', displayHandle: 'display-1', resultKey: 'result-1' })).toThrowError(DisplayInspectionError)
  })

  it('caps complex shown facts explicitly without silently claiming completeness', () => {
    const store = createDisplayContextStore()
    store.register(identity('root.connections'))
    store.setExecution('root.connections', QueryExecutionStateSchema.parse({ status: 'ready', intent: intent('connections', 1), current: current('connections', 1) }))
    const items = Array.from({ length: 13 }, (_, index) => ({ itemId: `connection-${index + 1}`, rank: index + 1, fact: connectedFact(`connection-${index + 1}`) }))
    store.setDisplay('root.connections', {
      payload: { kind: 'fare-order', orderedFareRefs: items.map(item => ({ fareId: item.itemId, rank: item.rank })) },
      totalDisplayed: items.length,
      includedCount: items.length,
      complete: true,
      omittedCount: 0,
    }, { ...current('connections', 1), items })

    const capture = store.capture({ captureId: 'capture-connections', artifactIds: ['artifact-1'] })
    expect(capture.shownFareFacts).toHaveLength(12)
    expect(capture.shownFareFacts[0]?.fact.legs).toHaveLength(4)
    expect(capture.completeness).toMatchObject({ complete: false, omittedFacts: 1 })
    expect(new TextEncoder().encode(JSON.stringify(capture)).length).toBeLessThanOrEqual(24 * 1024)
  })
})
