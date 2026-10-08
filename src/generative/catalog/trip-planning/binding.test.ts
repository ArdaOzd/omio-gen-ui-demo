import { expect, it } from 'vitest'
import { ArtifactIdSchema } from '../../contracts'
import { createUIStateStore } from '../../state/ui-state-store'
import { createFixedProjectionFixture } from '../../testing/fixed-projection-fixture'
import { resolvePlannerDatasetRef } from './binding'

const signal = () => new AbortController().signal
const window = { from: '2026-10-09', to: '2026-10-10' }

async function setup() {
  const fixture = createFixedProjectionFixture({ rows: [], sourceDateWindow: window })
  const load = async (originId: string, destinationId: string) => {
    const manifest = await fixture.bridge.loadScope(fixture.scope({
      originId,
      destinationId,
      dateWindow: window,
      passengers: 1,
      earliestDeparture: { date: window.from, minutes: 0 },
    }), signal())
    return fixture.bridge.getBinding(manifest.resourceKey)
  }
  return { ...fixture, load }
}

it('rebinds expired scene handles by explicit leg identity and uses a single-leg fallback for saved scenes', async () => {
  const { bridge, load } = await setup()
  const seed = await load('london', 'paris')
  const current = await load('berlin', 'amsterdam')
  const artifactRef = ArtifactIdSchema.parse('stable-leg')
  const state = createUIStateStore()
  state.initializeMissing(artifactRef, { datasetRefs: [current.datasetId], citySequence: ['berlin', 'amsterdam'] })
  bridge.release(seed.resourceKey)

  expect(resolvePlannerDatasetRef({ kind: 'FareCalendar', artifactRef, datasetRef: seed.datasetId, legIndex: 0 }, state, bridge)).toBe(current.datasetId)
  expect(resolvePlannerDatasetRef({ kind: 'FareCalendar', artifactRef, datasetRef: seed.datasetId }, state, bridge)).toBe(current.datasetId)
  expect(resolvePlannerDatasetRef({ kind: 'FareCalendar', artifactRef, datasetRef: seed.datasetId, legIndex: 1 }, state, bridge)).toBeUndefined()
  expect(resolvePlannerDatasetRef({ kind: 'FareCards', artifactRef, datasetRef: seed.datasetId, legIndex: 0 }, state, bridge)).toBe(current.datasetId)
  expect(() => resolvePlannerDatasetRef({ kind: 'TravelHero', artifactRef, datasetRef: seed.datasetId, legIndex: 0 }, state, bridge)).toThrow('Unsupported')
})

it('does not guess between current legs when a saved scene omitted leg identity', async () => {
  const { bridge, load } = await setup()
  const expired = await load('london', 'paris')
  const first = await load('berlin', 'amsterdam')
  const second = await load('amsterdam', 'vienna')
  const artifactRef = ArtifactIdSchema.parse('two-current-legs')
  const state = createUIStateStore()
  state.initializeMissing(artifactRef, { datasetRefs: [first.datasetId, second.datasetId], citySequence: ['berlin', 'amsterdam', 'vienna'] })
  bridge.release(expired.resourceKey)

  expect(resolvePlannerDatasetRef({ kind: 'PriceCalendar', artifactRef, datasetRef: expired.datasetId, legIndex: 1 }, state, bridge)).toBe(second.datasetId)
  expect(resolvePlannerDatasetRef({ kind: 'FareCards', artifactRef, legIndex: 1 }, state, bridge)).toBe(second.datasetId)
  expect(() => resolvePlannerDatasetRef({ kind: 'PriceCalendar', artifactRef, datasetRef: expired.datasetId }, state, bridge)).toThrow('Missing leg binding')
})
