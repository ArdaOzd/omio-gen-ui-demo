import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PlanningTracker } from '../tracker/planning-tracker'
import { createPlanningStore } from '../tracker/planning-store'
import { ArtifactIdSchema } from '../contracts'
import { FareItemSchema, type FareItem } from '../contracts/query-groups'
import { createUIStateStore } from '../state/ui-state-store'
import { createActionRouter } from '../state/action-router'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { CatalogNode } from './component'
import { TravelProvider, type TravelServices } from './context'

const artifactId = ArtifactIdSchema.parse('fare-actions')
const rows = [
  FareItemSchema.parse({ id: 'cheap-bus', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-09', mode: 'bus', carrierId: 'flixbus', carrierName: 'FlixBus', priceCents: 2300, durationMinutes: 470, departureMinutes: 600, availableSeats: 10, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true, legs: [{ legIndex: 0, mode: 'bus', carrierName: 'FlixBus', durationMinutes: 470, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }] }),
  FareItemSchema.parse({ id: 'fast-train', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-09', mode: 'train', carrierId: 'eurostar', carrierName: 'Eurostar', priceCents: 5500, durationMinutes: 140, departureMinutes: 660, availableSeats: 8, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true, legs: [{ legIndex: 0, mode: 'train', carrierName: 'Eurostar', durationMinutes: 140, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }] }),
]

async function fixture(fares: FareItem[] = rows) {
  const fixed = createFixedProjectionFixture({ rows: fares, sourceVersion: 'fare-actions-v1' })
  const bridge = fixed.bridge
  const manifest = await bridge.loadScope(fixed.scope({ originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-09', to: '2026-10-09' }, passengers: 1, earliestDeparture: { date: '2026-10-09', minutes: 0 } }), new AbortController().signal)
  const binding = bridge.getBinding(manifest.resourceKey)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, { datasetRefs: [binding.datasetId], dates: { start: '2026-10-09' } })
  const planning = createPlanningStore()
  const router = createActionRouter(state, { bridge, planning })
  const services = { bridge, state, dispatch: router, activeId: () => artifactId, artifactIds: () => [artifactId], activate: () => {} } satisfies TravelServices
  return { binding, planning, services, state }
}

describe('generated fare selection', () => {
  it('adds cheapest and fastest summaries to the persistent tracker and demo Buy flow', async () => {
    const user = userEvent.setup()
    const { planning, services, state } = await fixture()
    render(<TravelProvider services={services}><CatalogNode kind="CheapestFastest" artifactRef={artifactId} /><PlanningTracker store={planning} /></TravelProvider>)

    const lowest = (await screen.findByText('Lowest fare')).closest<HTMLElement>('.travel-insight')
    const fastest = screen.getByText('Fastest journey').closest<HTMLElement>('.travel-insight')
    if (!lowest || !fastest) throw new Error('Fare summary cards missing')
    expect(lowest).toHaveTextContent('FlixBus')
    expect(lowest).toHaveTextContent('Departure9 Oct 2026 · 10:00')
    expect(lowest).toHaveTextContent('Arrival9 Oct 2026 · 17:50')
    expect(fastest).toHaveTextContent('Eurostar')
    expect(fastest).toHaveTextContent('Departure9 Oct 2026 · 11:00')
    expect(fastest).toHaveTextContent('Arrival9 Oct 2026 · 13:20')

    await user.click(await screen.findByRole('button', { name: 'Add lowest fare Bus €23.00 to trip' }))
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[0]!.id])
    const tracker = await screen.findByRole('complementary', { name: 'Fare buying tracker' })
    await within(tracker).findByText('London → Paris')
    expect(within(tracker).getByText('€23.00')).toBeInTheDocument()
    await user.click(within(tracker).getByRole('button', { name: 'Buy' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Congrats, you are set for the trip.')
  })

  it('keeps duplicate cheapest and fastest summaries synchronized and deduplicated', async () => {
    const user = userEvent.setup()
    const { planning, services, state } = await fixture([rows[0]!])
    render(<TravelProvider services={services}><CatalogNode kind="CheapestFastest" artifactRef={artifactId} /><PlanningTracker store={planning} /></TravelProvider>)

    await user.click(await screen.findByRole('button', { name: 'Add lowest fare Bus €23.00 to trip' }))
    expect(screen.getAllByText('FlixBus')).toHaveLength(2)
    expect(screen.getAllByText('9 Oct 2026 · 10:00')).toHaveLength(2)
    expect(screen.getAllByText('9 Oct 2026 · 17:50')).toHaveLength(2)
    expect(await screen.findAllByRole('button', { name: /Remove .* €23\.00 from trip/ })).toHaveLength(2)
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[0]!.id])
    const tracker = screen.getByRole('complementary', { name: 'Fare buying tracker' })
    expect(within(tracker).getAllByRole('listitem')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Remove fastest journey Bus €23.00 from trip' }))
    expect(state.get(artifactId).selectedFareIds).toEqual([])
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Fare buying tracker' })).toBeNull())
  })

  it('selects exact fare IDs from comparison tables and timelines', async () => {
    const user = userEvent.setup()
    const { services, state } = await fixture()
    render(<TravelProvider services={services}><CatalogNode kind="ComparisonTable" artifactRef={artifactId} /><CatalogNode kind="ItineraryTimeline" artifactRef={artifactId} /></TravelProvider>)

    const table = await screen.findByRole('table', { name: 'Compare fares' })
    await user.click(within(table).getByRole('button', { name: 'Add Bus €23.00 to trip' }))
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[0]!.id])
    await user.click(within(table).getByRole('button', { name: 'Remove Bus €23.00 from trip' }))
    expect(state.get(artifactId).selectedFareIds).toEqual([])

    const timeline = screen.getByRole('heading', { name: 'Journey timeline' }).closest<HTMLElement>('.travel-panel')
    if (!timeline) throw new Error('Timeline missing')
    await user.click(within(timeline).getByRole('button', { name: 'Add Train €55.00 to trip' }))
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[1]!.id])
  })

  it('selects a fare from a narrower query while retaining its owned broader dataset binding', async () => {
    const user = userEvent.setup()
    const fixed = createFixedProjectionFixture({ rows, sourceVersion: 'fare-actions-v1' })
    const manifest = await fixed.bridge.loadScope(fixed.scope({
      originId: 'london',
      destinationId: 'paris',
      dateWindow: { from: '2026-10-08', to: '2026-10-10' },
      passengers: 1,
      earliestDeparture: { date: '2026-10-08', minutes: 0 },
    }), new AbortController().signal)
    const binding = fixed.bridge.getBinding(manifest.resourceKey)
    const state = createUIStateStore()
    state.initializeMissing(artifactId, {
      datasetRefs: [binding.datasetId],
      citySequence: ['london', 'paris'],
      dates: { start: '2026-10-09', end: '2026-10-09' },
      displayWindowByLeg: { 'london:paris': { from: '2026-10-09', to: '2026-10-09' } },
    })
    const router = createActionRouter(state, { bridge: fixed.bridge })
    const services = { bridge: fixed.bridge, state, dispatch: router, activeId: () => artifactId, activate: () => {} } satisfies TravelServices

    render(<TravelProvider services={services}><CatalogNode kind="ComparisonTable" artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0} /></TravelProvider>)

    await user.click(await screen.findByRole('button', { name: 'Add Bus €23.00 to trip' }))
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[0]!.id])
    await router.whenIdle(artifactId)
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[0]!.id])
  })

  it('inspects a plotted fare and changes the trip from its anchored detail card', async () => {
    const user = userEvent.setup()
    const { services, state } = await fixture()
    render(<TravelProvider services={services}><CatalogNode kind="DurationPricePlot" artifactRef={artifactId} /></TravelProvider>)

    const chart = await screen.findByRole('group', { name: 'Duration and price comparison' })
    expect(within(chart).getByText('€20')).toBeInTheDocument()
    expect(within(chart).getByText('2h 0m')).toBeInTheDocument()
    const point = await screen.findByRole('button', { name: 'View Bus FlixBus, 7h 50m, €23.00' })
    expect(point).toHaveAttribute('aria-pressed', 'false')
    expect(point).toHaveAttribute('aria-expanded', 'false')
    await user.hover(point)
    expect(screen.getByRole('status', { name: '€23.00, 7h 50m' })).toBeInTheDocument()

    await user.click(point)
    expect(state.get(artifactId).selectedFareIds).toEqual([])
    expect(point).toHaveAttribute('aria-expanded', 'true')
    const details = screen.getByRole('dialog', { name: 'FlixBus fare details' })
    expect(details).toHaveTextContent('London → Paris')
    expect(details).toHaveTextContent('Departure9 Oct 2026 · 10:00')
    expect(details).toHaveTextContent('Arrival9 Oct 2026 · 17:50')
    expect(details).toHaveTextContent('Duration7h 50m')

    const add = within(details).getByRole('button', { name: 'Add Bus €23.00 to trip' })
    await user.click(add)
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[0]!.id])
    expect(screen.getByRole('dialog', { name: 'FlixBus fare details' })).toBeInTheDocument()
    await user.click(within(details).getByRole('button', { name: 'Remove Bus €23.00 from trip' }))
    expect(state.get(artifactId).selectedFareIds).toEqual([])

    await user.click(screen.getByRole('heading', { name: 'Price and journey time' }))
    expect(screen.queryByRole('dialog', { name: 'FlixBus fare details' })).toBeNull()

    point.focus()
    await user.keyboard('{Enter}')
    expect(within(screen.getByRole('dialog', { name: 'FlixBus fare details' })).getByRole('button', { name: 'Add Bus €23.00 to trip' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'FlixBus fare details' })).toBeNull()
    expect(point).toHaveFocus()
  })

  it('keeps calendar date browsing separate from adding that day cheapest fare', async () => {
    const user = userEvent.setup()
    const { binding, services, state } = await fixture()
    render(<TravelProvider services={services}><CatalogNode kind="PriceCalendar" artifactRef={artifactId} datasetRef={binding.datasetId} /></TravelProvider>)

    await user.click(await screen.findByRole('button', { name: /Fri 9 Oct.*€23\.00.*2 options/ }))
    expect(state.get(artifactId).selectedFareIds).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Add cheapest fare on 2026-10-09 to trip' }))
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[0]!.id])
  })
})
