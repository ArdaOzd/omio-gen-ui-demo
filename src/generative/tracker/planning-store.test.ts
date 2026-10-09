import { describe, expect, it, vi } from 'vitest'
import { ArtifactIdSchema, BoundedFareFactSchema } from '../contracts'
import { FareScopeBindingSchema } from '../contracts/query-groups'
import { createPlanningStore } from './planning-store'

const owner = ArtifactIdSchema.parse('artifact-one')
const other = ArtifactIdSchema.parse('artifact-two')
const fact = BoundedFareFactSchema.parse({
  id: 'fare-one',
  originId: 'london',
  destinationId: 'paris',
  serviceDate: '2026-11-08',
  mode: 'train',
  carrierId: 'rail',
  carrierName: 'Test Rail',
  priceCents: 4200,
  durationMinutes: 160,
  departureMinutes: 540,
  currency: 'EUR',
  synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees',
  direct: true,
  legs: [{ legIndex: 0, mode: 'train', carrierName: 'Test Rail', durationMinutes: 160, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
})
const binding = (sourceVersion: string) => FareScopeBindingSchema.parse({
  resourceKey: 'london-paris-scope',
  datasetId: 'london-paris-scope',
  datasetRevision: 1,
  manifest: {
    kind: 'fareScopeManifest',
    resourceKey: 'london-paris-scope',
    source: { kind: 'search', descriptorId: 'london-paris-scope', sourceVersion },
    coverage: { kind: 'fareScope', originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-11-08', to: '2026-11-08' }, passengers: 1, earliestDeparture: { date: '2026-11-08', minutes: 0 } },
    totalAvailable: 1,
    availableModes: ['train'],
    availableDateWindow: { from: '2026-11-08', to: '2026-11-08' },
    complete: true,
  },
})

describe('planning store', () => {
  it('keeps one bounded fare fact while tracking every selecting artifact', () => {
    const store = createPlanningStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.select(owner, fact)
    store.select(other, fact)

    expect(store.get()).toEqual([{ fact, owners: [owner, other] }])
    expect(listener).toHaveBeenCalledTimes(2)
    store.deselect(owner, fact.id)
    expect(store.get()).toEqual([{ fact, owners: [other] }])
    store.deselect(other, fact.id)
    expect(store.get()).toEqual([])
  })

  it('restores the persisted basket without sharing the input array', () => {
    const store = createPlanningStore()
    const saved = [{ fact, owners: [owner] }]
    store.restore(saved)
    saved.splice(0)
    expect(store.get()).toEqual([{ fact, owners: [owner] }])
  })

  it('keeps and replaces exact source provenance per owner', () => {
    const store = createPlanningStore()
    const first = binding('planned-source-v1')
    const refreshed = binding('planned-source-v2')
    const revised = BoundedFareFactSchema.parse({ ...fact, priceCents: 3900 })

    store.select(owner, fact, first)
    store.select(other, fact, first)
    store.select(owner, revised, refreshed)

    expect(store.get()).toEqual([{
      fact: revised,
      owners: [owner, other],
      sources: [
        { owner: other, source: first.manifest.source, scope: first.manifest.coverage },
        { owner, source: refreshed.manifest.source, scope: refreshed.manifest.coverage },
      ],
    }])
    store.deselect(owner, fact.id)
    expect(store.get()).toEqual([{
      fact: revised,
      owners: [other],
      sources: [{ owner: other, source: first.manifest.source, scope: first.manifest.coverage }],
    }])
  })
})
