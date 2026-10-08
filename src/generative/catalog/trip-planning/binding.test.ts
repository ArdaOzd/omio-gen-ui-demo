import { expect, it } from 'vitest'
import { ArtifactIdSchema, CoverageRequestSchema } from '../../contracts'
import { createFareDataBridge } from '../../data/fare-data-bridge'
import { createUIStateStore } from '../../state/ui-state-store'
import { resolvePlannerDatasetRef } from './binding'

it('rebinds expired scene handles by explicit leg identity and uses a single-leg fallback for saved scenes', async () => {
  const bridge = createFareDataBridge({ pageSource: async input => ({ rows: [], total: 0, pages: 1, page: input.page, sourceVersion: 'binding-v1' }) })
  const load = (originId: string, destinationId: string) => bridge.load(CoverageRequestSchema.parse({ originIds: [originId], destinationIds: [destinationId], dateWindow: { from: '2026-10-09', to: '2026-10-10' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const seed = await load('london', 'paris')
  const current = await load('berlin', 'amsterdam')
  const artifactRef = ArtifactIdSchema.parse('stable-leg')
  const state = createUIStateStore()
  state.initializeMissing(artifactRef, { datasetRefs: [current.datasetId], citySequence: ['berlin', 'amsterdam'] })
  bridge.release(seed.datasetId)

  expect(resolvePlannerDatasetRef({ kind: 'FareCalendar', artifactRef, datasetRef: seed.datasetId, legIndex: 0 }, state, bridge)).toBe(current.datasetId)
  expect(resolvePlannerDatasetRef({ kind: 'FareCalendar', artifactRef, datasetRef: seed.datasetId }, state, bridge)).toBe(current.datasetId)
  expect(() => resolvePlannerDatasetRef({ kind: 'FareCalendar', artifactRef, datasetRef: seed.datasetId, legIndex: 1 }, state, bridge)).toThrow('Unavailable')
  expect(resolvePlannerDatasetRef({ kind: 'FareCards', artifactRef, datasetRef: seed.datasetId, legIndex: 0 }, state, bridge)).toBe(current.datasetId)
  expect(() => resolvePlannerDatasetRef({ kind: 'TravelHero', artifactRef, datasetRef: seed.datasetId, legIndex: 0 }, state, bridge)).toThrow('Unsupported')
})

it('does not guess between current legs when a saved scene omitted leg identity', async () => {
  const bridge = createFareDataBridge({ pageSource: async input => ({ rows: [], total: 0, pages: 1, page: input.page, sourceVersion: 'binding-v1' }) })
  const load = (originId: string, destinationId: string) => bridge.load(CoverageRequestSchema.parse({ originIds: [originId], destinationIds: [destinationId], dateWindow: { from: '2026-10-09', to: '2026-10-10' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const expired = await load('london', 'paris')
  const first = await load('berlin', 'amsterdam')
  const second = await load('amsterdam', 'vienna')
  const artifactRef = ArtifactIdSchema.parse('two-current-legs')
  const state = createUIStateStore()
  state.initializeMissing(artifactRef, { datasetRefs: [first.datasetId, second.datasetId], citySequence: ['berlin', 'amsterdam', 'vienna'] })
  bridge.release(expired.datasetId)

  expect(resolvePlannerDatasetRef({ kind: 'PriceCalendar', artifactRef, datasetRef: expired.datasetId, legIndex: 1 }, state, bridge)).toBe(second.datasetId)
  expect(resolvePlannerDatasetRef({ kind: 'FareCards', artifactRef, legIndex: 1 }, state, bridge)).toBe(second.datasetId)
  expect(() => resolvePlannerDatasetRef({ kind: 'PriceCalendar', artifactRef, datasetRef: expired.datasetId }, state, bridge)).toThrow('Missing leg binding')
})
