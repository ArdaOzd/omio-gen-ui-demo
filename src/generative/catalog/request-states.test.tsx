import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ArtifactIdSchema } from '../contracts'
import { FareItemSchema } from '../contracts/query-groups'
import { createUIStateStore } from '../state/ui-state-store'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { CatalogNode } from './component'
import { TravelProvider } from './context'

const queryComponents = [
  'CarrierFilter',
  'PriceCalendar',
  'ComparisonTable',
  'ComparisonMatrix',
  'ModeBreakdown',
  'ItineraryTimeline',
  'DurationPricePlot',
  'CheapestFastest',
]

const fare = FareItemSchema.parse({
  id: 'status-fare',
  originId: 'london',
  destinationId: 'paris',
  serviceDate: '2026-10-03',
  mode: 'train',
  carrierId: 'fixture-rail',
  carrierName: 'Fixture Rail',
  priceCents: 1000,
  durationMinutes: 120,
  departureMinutes: 600,
  availableSeats: 8,
  currency: 'EUR',
  synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees',
  direct: true,
  legs: [{
    legIndex: 0,
    mode: 'train',
    carrierName: 'Fixture Rail',
    durationMinutes: 120,
    originId: 'london',
    destinationId: 'paris',
    originLabel: 'London',
    destinationLabel: 'Paris',
  }],
})

async function fixture(options: { to?: string; sourceTo?: string } = {}) {
  const to = options.to ?? '2026-10-03'
  const fixed = createFixedProjectionFixture({
    rows: [fare],
    sourceVersion: 'request-status-v1',
    sourceDateWindow: { from: '2026-10-03', to: options.sourceTo ?? to },
  })
  const manifest = await fixed.bridge.loadScope(fixed.scope({
    originId: 'london',
    destinationId: 'paris',
    dateWindow: { from: '2026-10-03', to },
    passengers: 1,
    earliestDeparture: { date: '2026-10-03', minutes: 0 },
  }), new AbortController().signal)
  const binding = fixed.bridge.getBinding(manifest.resourceKey)
  const state = createUIStateStore()
  const id = ArtifactIdSchema.parse('request-status')
  state.initializeMissing(id, {
    datasetRefs: [binding.datasetId],
    citySequence: ['london', 'paris'],
    dates: { start: '2026-10-03', end: to },
  })
  return {
    ...fixed,
    binding,
    state,
    id,
    services: { bridge: fixed.bridge, state, activate: () => {}, activeId: () => id },
  }
}

async function pinSelected(value: Awaited<ReturnType<typeof fixture>>) {
  await value.bridge.lookupPins({
    version: 1,
    requestId: 'pin-status-fare',
    sourceVersion: value.binding.manifest.source.sourceVersion,
    pins: [{ fareId: fare.id, resourceKey: value.binding.resourceKey }],
  }, new AbortController().signal)
  value.state.dispatch({ kind: 'select', artifactId: value.id, fareId: fare.id, selected: true })
}

describe('visible local request states', () => {
  it.each(queryComponents)('%s exposes a failed projection instead of a blank or empty-looking view', async name => {
    const value = await fixture()
    vi.spyOn(value.client, 'queryGroups').mockRejectedValue(new Error('Injected fixed projection failure'))

    render(<TravelProvider services={value.services}>
      <CatalogNode kind={name} artifactRef={value.id} datasetRef={value.binding.datasetId} />
    </TravelProvider>)

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load|unavailable/i)
    expect(value.state.get(value.id).revision).toBe(0)
  })

  it.each(['SyntheticTotal', 'SelectedItinerary'])('%s never presents a missing selected fact as a zero-value result', async name => {
    const value = await fixture()
    value.state.dispatch({ kind: 'select', artifactId: value.id, fareId: fare.id, selected: true })

    render(<TravelProvider services={value.services}>
      <CatalogNode kind={name} artifactRef={value.id} />
    </TravelProvider>)

    expect(await screen.findByRole('status')).toHaveTextContent(/loading selected fares/i)
    expect(screen.queryByText('€0.00')).not.toBeInTheDocument()
    expect(value.state.get(value.id).selectedFareIds).toEqual([fare.id])
  })
})

it('keeps pinned selected facts stable across unrelated edits and removes them synchronously', async () => {
  const value = await fixture()
  await pinSelected(value)

  render(<TravelProvider services={value.services}>
    <CatalogNode kind="SyntheticTotal" artifactRef={value.id} />
  </TravelProvider>)

  expect(await screen.findByText('€10.00')).toBeVisible()
  act(() => value.state.dispatch({ kind: 'sort', artifactId: value.id, sort: { field: 'durationMinutes', direction: 'desc' } }))
  expect(screen.getByText('€10.00')).toBeVisible()

  act(() => value.state.dispatch({ kind: 'select', artifactId: value.id, fareId: fare.id, selected: false }))
  expect(await screen.findByText('€0.00')).toBeVisible()
  expect(value.state.get(value.id).selectedFareIds).toEqual([])
})

it.each(['CitySequence', 'RouteMap', 'CoverageSummary', 'StayAllocation'])('%s explains a valid empty itinerary without inventing route facts', async name => {
  const value = await fixture()
  const id = ArtifactIdSchema.parse('empty-route')
  value.state.initializeMissing(id, { datasetRefs: [], stays: [] })

  render(<TravelProvider services={value.services}>
    <CatalogNode kind={name} artifactRef={id} />
  </TravelProvider>)

  expect(await screen.findByRole('status')).toHaveTextContent(/Add stops|No travel data|No travel scope/i)
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(value.state.get(id).revision).toBe(0)
})

it('announces stable partial coverage without rewriting artifact state or refetching projections', async () => {
  const value = await fixture({ to: '2026-10-04', sourceTo: '2026-10-03' })
  const query = vi.spyOn(value.client, 'queryGroups')

  render(<TravelProvider services={value.services}>
    <CatalogNode kind="CoverageSummary" artifactRef={value.id} />
  </TravelProvider>)

  expect(screen.getByText(/Partial server scope/)).toBeVisible()
  act(() => value.state.dispatch({ kind: 'sort', artifactId: value.id, sort: { field: 'durationMinutes', direction: 'desc' } }))
  await waitFor(() => expect(screen.getByText(/Partial server scope/)).toBeVisible())
  expect(query).not.toHaveBeenCalled()
  expect(value.state.get(value.id).revision).toBe(1)
})
