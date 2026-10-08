import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TravelProvider, type TravelServices } from '../../catalog/context'
import { FareCards } from '../../catalog/views'
import {
  ArtifactIdSchema,
} from '../../contracts'
import { FareItemSchema, type FareItem } from '../../contracts/query-groups'
import { createUIStateStore } from '../../state/ui-state-store'
import { createActionRouter } from '../../state/action-router'
import { createFixedProjectionFixture } from '../../testing/fixed-projection-fixture'
import { PlanningTracker } from './planning-tracker'

const rows = [
  FareItemSchema.parse({ id: 'fare-late', originId: 'prague', destinationId: 'vienna', serviceDate: '2026-10-08', mode: 'train', carrierId: 'night-rail', carrierName: 'Night Rail', priceCents: 9000, durationMinutes: 240, departureMinutes: 1080, availableSeats: 4, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true, legs: [{ legIndex: 0, mode: 'train', carrierName: 'Night Rail', durationMinutes: 240, originId: 'prague', destinationId: 'vienna', originLabel: 'Prague', destinationLabel: 'Vienna' }] }),
  FareItemSchema.parse({ id: 'fare-early', originId: 'berlin', destinationId: 'prague', serviceDate: '2026-10-06', mode: 'bus', carrierId: 'central-bus', carrierName: 'Central Bus', priceCents: 4500, durationMinutes: 300, departureMinutes: 480, availableSeats: 6, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true, legs: [{ legIndex: 0, mode: 'bus', carrierName: 'Central Bus', durationMinutes: 300, originId: 'berlin', destinationId: 'prague', originLabel: 'Berlin', destinationLabel: 'Prague' }] }),
]
const signal = () => new AbortController().signal

async function load(bridge: ReturnType<typeof createFixedProjectionFixture>['bridge'], fare: FareItem) {
  const manifest = await bridge.loadScope({ kind: 'fareScope', originId: fare.originId, destinationId: fare.destinationId, dateWindow: { from: fare.serviceDate, to: fare.serviceDate }, passengers: 1, earliestDeparture: { date: fare.serviceDate, minutes: 0 } }, signal())
  return bridge.getBinding(manifest.resourceKey)
}

async function fixture(selected = true) {
  const first = ArtifactIdSchema.parse('artifact-first')
  const second = ArtifactIdSchema.parse('artifact-second')
  const fixed = createFixedProjectionFixture({ rows, sourceVersion: 'tracker-v1' })
  const [late, early] = await Promise.all(rows.map(fare => load(fixed.bridge, fare)))
  await fixed.bridge.lookupPins({ version: 1, requestId: 'tracker-pins', sourceVersion: late.manifest.source.sourceVersion, pins: [{ fareId: rows[0]!.id, resourceKey: late.resourceKey }, { fareId: rows[1]!.id, resourceKey: early.resourceKey }] }, signal())
  const state = createUIStateStore()
  state.initializeMissing(first, { datasetRefs: [late.datasetId], selectedFareIds: selected ? [rows[0]!.id] : [] })
  state.initializeMissing(second, { datasetRefs: [early.datasetId, late.datasetId], selectedFareIds: selected ? [rows[1]!.id, rows[0]!.id] : [] })
  let active = first
  const services = { bridge: fixed.bridge, state, activeId: () => active, artifactIds: () => [first, second], activate: id => { active = ArtifactIdSchema.parse(id) } } satisfies TravelServices
  return { first, second, services, state }
}

describe('Version A planning tracker', () => {
  it('stays hidden until a fare is selected', async () => {
    const { services } = await fixture(false)
    render(<TravelProvider services={services}><PlanningTracker /></TravelProvider>)
    expect(screen.queryByRole('complementary', { name: 'Planning tracker' })).toBeNull()
  })

  it('sorts all artifacts chronologically, deduplicates fares, and keeps source cards in sync', async () => {
    const user = userEvent.setup()
    const { first, second, services, state } = await fixture()
    render(<TravelProvider services={services}><FareCards artifactRef={first} /><PlanningTracker /></TravelProvider>)
    const tracker = await screen.findByRole('complementary', { name: 'Planning tracker' })
    await waitFor(() => expect(within(tracker).queryByText('Loading selected fares…')).toBeNull())
    const items = within(tracker).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Berlin → Prague')
    expect(items[1]).toHaveTextContent('Prague → Vienna')

    await user.click(within(tracker).getByRole('button', { name: 'Cancel Prague to Vienna on 2026-10-08' }))
    expect(state.get(first).selectedFareIds).toEqual([])
    expect(state.get(second).selectedFareIds).toEqual([rows[1]!.id])
    await waitFor(() => expect(screen.getByRole('button', { name: /Night Rail.*18:00/ })).toHaveTextContent('Select'))

    await user.click(within(tracker).getByRole('button', { name: 'Clear all' }))
    expect(state.get(second).selectedFareIds).toEqual([])
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Planning tracker' })).toBeNull())
  })

  it('opens an accessible confirmation and restores focus after Escape', async () => {
    const user = userEvent.setup()
    const { services } = await fixture()
    render(<TravelProvider services={services}><PlanningTracker /></TravelProvider>)
    const buy = await screen.findByRole('button', { name: 'Buy' })
    await user.click(buy)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Congrats, you are set for the trip.')
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(buy).toHaveFocus()
  })

  it('removes a selected fare from the tracker after its route leg is replaced', async () => {
    const selected = FareItemSchema.parse({ id: 'london-paris', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-08', mode: 'train', carrierId: 'rail', carrierName: 'Test Rail', priceCents: 4000, durationMinutes: 160, departureMinutes: 540, availableSeats: 4, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true, legs: [{ legIndex: 0, mode: 'train', carrierName: 'Test Rail', durationMinutes: 160, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }] })
    const fixed = createFixedProjectionFixture({ sourceVersion: 'route-tracker-v1', sourceDateWindow: { from: '2026-10-08', to: '2026-10-08' }, rows: scope => [{ ...selected, id: scope.originId + '-' + scope.destinationId, originId: scope.originId, destinationId: scope.destinationId, legs: [{ ...selected.legs[0]!, originId: scope.originId, destinationId: scope.destinationId, originLabel: scope.originId, destinationLabel: scope.destinationId }] }] })
    const seededManifest = await fixed.bridge.loadScope({ kind: 'fareScope', originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-08', to: '2026-10-08' }, passengers: 1, earliestDeparture: { date: '2026-10-08', minutes: 0 } }, signal())
    const seeded = fixed.bridge.getBinding(seededManifest.resourceKey)
    await fixed.bridge.lookupPins({ version: 1, requestId: 'route-tracker-pin', sourceVersion: seeded.manifest.source.sourceVersion, pins: [{ fareId: selected.id, resourceKey: seeded.resourceKey }] }, signal())
    const artifactId = ArtifactIdSchema.parse('route-tracker')
    const state = createUIStateStore()
    state.initializeMissing(artifactId, { datasetRefs: [seeded.datasetId], citySequence: ['london', 'paris'], dates: { start: '2026-10-08' }, selectedFareIds: [selected.id] })
    const router = createActionRouter(state, { bridge: fixed.bridge })
    const services = { bridge: fixed.bridge, state, dispatch: router, whenIdle: router.whenIdle, activeId: () => artifactId, artifactIds: () => [artifactId], activate: () => {} } satisfies TravelServices
    render(<TravelProvider services={services}><PlanningTracker /></TravelProvider>)
    await screen.findByRole('complementary', { name: 'Planning tracker' })

    router({ kind: 'route', artifactId, citySequence: ['london', 'rome'] })
    await router.whenIdle(artifactId)

    expect(state.exportSnapshot(artifactId).selectedFareIds).toEqual([])
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Planning tracker' })).toBeNull())
    router.dispose()
  })
})
