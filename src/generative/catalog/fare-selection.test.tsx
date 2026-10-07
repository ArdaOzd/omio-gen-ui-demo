import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PlanningTracker } from '../variants/a/planning-tracker'
import { ArtifactIdSchema, FareRowSchema, type FareRow } from '../contracts'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createUIStateStore } from '../state/ui-state-store'
import { CatalogNode } from './component'
import { TravelProvider, type TravelServices } from './context'

const artifactId = ArtifactIdSchema.parse('fare-actions')
const rows = [
  FareRowSchema.parse({ id: 'cheap-bus', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-09', mode: 'bus', carrierId: 'flixbus', carrierName: 'FlixBus', priceCents: 2300, durationMinutes: 470, departureMinutes: 600, availableSeats: 10, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true }),
  FareRowSchema.parse({ id: 'fast-train', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-09', mode: 'train', carrierId: 'eurostar', carrierName: 'Eurostar', priceCents: 5500, durationMinutes: 140, departureMinutes: 660, availableSeats: 8, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true }),
]

async function fixture(fares: FareRow[] = rows) {
  const bridge = createFareDataBridge({ pageSource: async input => ({ rows: fares.filter(row => row.serviceDate === input.date), total: fares.length, page: input.page, pages: 1, sourceVersion: 'fare-actions-v1' }) })
  const manifest = await bridge.load({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-09', to: '2026-10-09' }, modes: ['train', 'bus'], passengers: 1 }, new AbortController().signal)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, { datasetRefs: [manifest.datasetId], dates: { start: '2026-10-09' } })
  const services = { bridge, state, activeId: () => artifactId, artifactIds: () => [artifactId], activate: () => {} } satisfies TravelServices
  return { manifest, services, state }
}

describe('generated fare selection', () => {
  it('adds cheapest and fastest summaries to the persistent tracker and demo Buy flow', async () => {
    const user = userEvent.setup()
    const { services, state } = await fixture()
    render(<TravelProvider services={services}><CatalogNode kind="CheapestFastest" artifactRef={artifactId} /><PlanningTracker /></TravelProvider>)

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
    const tracker = await screen.findByRole('complementary', { name: 'Planning tracker' })
    await within(tracker).findByText('London → Paris')
    expect(within(tracker).getByText('€23.00')).toBeInTheDocument()
    await user.click(within(tracker).getByRole('button', { name: 'Buy' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Congrats, you are set for the trip.')
  })

  it('keeps duplicate cheapest and fastest summaries synchronized and deduplicated', async () => {
    const user = userEvent.setup()
    const { services, state } = await fixture([rows[0]!])
    render(<TravelProvider services={services}><CatalogNode kind="CheapestFastest" artifactRef={artifactId} /><PlanningTracker /></TravelProvider>)

    await user.click(await screen.findByRole('button', { name: 'Add lowest fare Bus €23.00 to trip' }))
    expect(screen.getAllByText('FlixBus')).toHaveLength(2)
    expect(screen.getAllByText('9 Oct 2026 · 10:00')).toHaveLength(2)
    expect(screen.getAllByText('9 Oct 2026 · 17:50')).toHaveLength(2)
    expect(await screen.findAllByRole('button', { name: /Remove .* €23\.00 from trip/ })).toHaveLength(2)
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[0]!.id])
    const tracker = screen.getByRole('complementary', { name: 'Planning tracker' })
    expect(within(tracker).getAllByRole('listitem')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Remove fastest journey Bus €23.00 from trip' }))
    expect(state.get(artifactId).selectedFareIds).toEqual([])
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Planning tracker' })).toBeNull())
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

  it('toggles the exact plotted fare with an accessible pressed state', async () => {
    const user = userEvent.setup()
    const { services, state } = await fixture()
    render(<TravelProvider services={services}><CatalogNode kind="DurationPricePlot" artifactRef={artifactId} /></TravelProvider>)

    const point = await screen.findByRole('button', { name: 'Add Bus 7h 50m €23.00 to trip' })
    expect(point).toHaveAttribute('aria-pressed', 'false')
    await user.click(point)
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[0]!.id])
    expect(screen.getByRole('button', { name: 'Remove Bus 7h 50m €23.00 from trip' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Remove Bus 7h 50m €23.00 from trip' }))
    expect(state.get(artifactId).selectedFareIds).toEqual([])
  })

  it('keeps calendar date browsing separate from adding that day cheapest fare', async () => {
    const user = userEvent.setup()
    const { manifest, services, state } = await fixture()
    render(<TravelProvider services={services}><CatalogNode kind="PriceCalendar" artifactRef={artifactId} datasetRef={manifest.datasetId} /></TravelProvider>)

    await user.click(await screen.findByRole('button', { name: /Fri 9 Oct.*€23\.00.*2 options/ }))
    expect(state.get(artifactId).selectedFareIds).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Add cheapest fare on 2026-10-09 to trip' }))
    expect(state.get(artifactId).selectedFareIds).toEqual([rows[0]!.id])
  })
})
