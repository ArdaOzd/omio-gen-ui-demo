import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TravelProvider, type TravelServices } from '../catalog/context'
import { FareCards } from '../catalog/views'
import {
  ArtifactIdSchema,
  type UICommand,
} from '../contracts'
import { FareItemSchema, type FareItem } from '../contracts/query-groups'
import { createUIStateStore } from '../state/ui-state-store'
import { createActionRouter } from '../state/action-router'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { PlanningTracker } from './planning-tracker'
import { createPlanningStore } from './planning-store'

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
  const planning = createPlanningStore()
  if (selected) {
    const [lateFare, earlyFare] = rows
    if (!lateFare || !earlyFare) throw new Error('Missing tracker fixture fares')
    const { availableSeats: _lateSeats, ...lateFact } = lateFare
    const { availableSeats: _earlySeats, ...earlyFact } = earlyFare
    planning.select(first, lateFact)
    planning.select(second, earlyFact)
    planning.select(second, lateFact)
  }
  const dispatch = (command: UICommand) => {
    const result = state.dispatch({ ...command, expectedRevision: command.expectedRevision ?? state.get(command.artifactId).revision })
    if (result.status === 'applied' && command.kind === 'select' && !command.selected) planning.deselect(command.artifactId, command.fareId)
    return result
  }
  let active = first
  const services = { bridge: fixed.bridge, state, dispatch, activeId: () => active, artifactIds: () => [first, second], activate: id => { active = ArtifactIdSchema.parse(id) } } satisfies TravelServices
  return { first, second, planning, services, state }
}

describe('planning tracker', () => {
  it('stays hidden until a fare is selected', async () => {
    const { planning, services } = await fixture(false)
    render(<TravelProvider services={services}><PlanningTracker store={planning} /></TravelProvider>)
    expect(screen.queryByRole('complementary', { name: 'Fare buying tracker' })).toBeNull()
  })

  it('sorts all artifacts chronologically, deduplicates fares, and keeps source cards in sync', async () => {
    const user = userEvent.setup()
    const { first, second, planning, services, state } = await fixture()
    render(<TravelProvider services={services}><FareCards artifactRef={first} /><PlanningTracker store={planning} /></TravelProvider>)
    const tracker = await screen.findByRole('complementary', { name: 'Fare buying tracker' })
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
    const { planning, services } = await fixture()
    render(<TravelProvider services={services}><PlanningTracker store={planning} /></TravelProvider>)
    const buy = await screen.findByRole('button', { name: 'Buy' })
    await user.click(buy)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Congrats, you are set for the trip.')
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(buy).toHaveFocus()
  })

  it('keeps a selected fare with full buying details after its active route is replaced', async () => {
    const selected = FareItemSchema.parse({ id: 'london-paris', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-08', mode: 'train', carrierId: 'rail', carrierName: 'Test Rail', priceCents: 4000, durationMinutes: 160, departureMinutes: 540, availableSeats: 4, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true, legs: [{ legIndex: 0, mode: 'train', carrierName: 'Test Rail', durationMinutes: 160, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }] })
    const fixed = createFixedProjectionFixture({ sourceVersion: 'route-tracker-v1', sourceDateWindow: { from: '2026-10-08', to: '2026-10-08' }, rows: scope => [FareItemSchema.parse({ ...selected, id: scope.originId + '-' + scope.destinationId, originId: scope.originId, destinationId: scope.destinationId, legs: [{ ...selected.legs[0]!, originId: scope.originId, destinationId: scope.destinationId, originLabel: scope.originId, destinationLabel: scope.destinationId }] })] })
    const seededManifest = await fixed.bridge.loadScope({ kind: 'fareScope', originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-08', to: '2026-10-08' }, passengers: 1, earliestDeparture: { date: '2026-10-08', minutes: 0 } }, signal())
    const seeded = fixed.bridge.getBinding(seededManifest.resourceKey)
    await fixed.bridge.lookupPins({ version: 1, requestId: 'route-tracker-pin', sourceVersion: seeded.manifest.source.sourceVersion, pins: [{ fareId: selected.id, resourceKey: seeded.resourceKey }] }, signal())
    const artifactId = ArtifactIdSchema.parse('route-tracker')
    const state = createUIStateStore()
    state.initializeMissing(artifactId, { datasetRefs: [seeded.datasetId], citySequence: ['london', 'paris'], dates: { start: '2026-10-08' }, selectedFareIds: [selected.id] })
    const planning = createPlanningStore()
    const { availableSeats: _availableSeats, ...selectedFact } = selected
    planning.select(artifactId, selectedFact)
    const router = createActionRouter(state, { bridge: fixed.bridge, planning })
    const services = { bridge: fixed.bridge, state, dispatch: router, whenIdle: router.whenIdle, activeId: () => artifactId, artifactIds: () => [artifactId], activate: () => {} } satisfies TravelServices
    render(<TravelProvider services={services}><PlanningTracker store={planning} /></TravelProvider>)
    const tracker = await screen.findByRole('complementary', { name: 'Fare buying tracker' })

    router({ kind: 'route', artifactId, citySequence: ['london', 'rome'] })
    await router.whenIdle(artifactId)

    expect(state.exportSnapshot(artifactId).selectedFareIds).toEqual([])
    expect(within(tracker).getByText('London → Paris')).toBeInTheDocument()
    expect(within(tracker).getByText('2026-10-08 · 09:00–11:40')).toBeInTheDocument()
    expect(within(tracker).getByText('Train · Test Rail')).toBeInTheDocument()
    const buy=within(tracker).getByRole('button',{name:'Buy'})
    await userEvent.setup().click(buy)
    expect(screen.getByRole('dialog')).toHaveTextContent('Congrats, you are set for the trip.')
    await userEvent.setup().click(screen.getByRole('button',{name:'Close'}))
    await userEvent.setup().click(within(tracker).getByRole('button', { name: 'Cancel London to Paris on 2026-10-08' }))
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Fare buying tracker' })).toBeNull())
    router.dispose()
  })
})
