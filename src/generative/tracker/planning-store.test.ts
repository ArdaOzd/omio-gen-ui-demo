import { describe, expect, it, vi } from 'vitest'
import { ArtifactIdSchema, BoundedFareFactSchema } from '../contracts'
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
})
