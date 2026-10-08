import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ArtifactIdSchema } from '../contracts'
import { FareItemSchema, type FareItem } from '../contracts/query-groups'
import { createUIStateStore } from '../state/ui-state-store'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { CatalogNode } from './component'
import { TravelProvider, type TravelServices } from './context'

const id = ArtifactIdSchema.parse('trip')
const signal = () => new AbortController().signal

function fare(input: {
  id: string
  originId: string
  destinationId: string
  serviceDate: string
  mode: 'train' | 'bus'
  carrierId: string
  carrierName: string
  priceCents: number
}): FareItem {
  return FareItemSchema.parse({
    ...input,
    durationMinutes: input.mode === 'train' ? 140 : 470,
    departureMinutes: 600,
    availableSeats: 10,
    currency: 'EUR',
    synthetic: true,
    priceBasis: 'per-passenger-including-demo-fees',
    direct: true,
    legs: [{
      legIndex: 0,
      mode: input.mode,
      carrierName: input.carrierName,
      durationMinutes: input.mode === 'train' ? 140 : 470,
      originId: input.originId,
      destinationId: input.destinationId,
      originLabel: input.originId,
      destinationLabel: input.destinationId,
    }],
  })
}

const rows = [
  fare({ id: 'fare-0', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-09', mode: 'train', carrierId: 'eurostar', carrierName: 'Eurostar', priceCents: 5500 }),
  fare({ id: 'fare-1', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-09', mode: 'bus', carrierId: 'flixbus', carrierName: 'FlixBus', priceCents: 2300 }),
]

async function loadScope(bridge: ReturnType<typeof createFixedProjectionFixture>['bridge'], originId: string, destinationId: string, from: string, to = from) {
  const manifest = await bridge.loadScope({
    kind: 'fareScope',
    originId,
    destinationId,
    dateWindow: { from, to },
    passengers: 2,
    earliestDeparture: { date: from, minutes: 0 },
  }, signal())
  return bridge.getBinding(manifest.resourceKey)
}

async function setup() {
  const fixture = createFixedProjectionFixture({ rows, sourceVersion: 'fixture-v1' })
  const binding = await loadScope(fixture.bridge, 'london', 'paris', '2026-10-09')
  await fixture.bridge.lookupPins({
    version: 1,
    requestId: 'selected-fare',
    sourceVersion: binding.manifest.source.sourceVersion,
    pins: [{ fareId: rows[1]!.id, resourceKey: binding.resourceKey }],
  }, signal())
  const state = createUIStateStore()
  state.initializeMissing(id, { datasetRefs: [binding.datasetId], dates: { start: '2026-10-09' }, selectedFareIds: [rows[1]!.id] })
  return { state, bridge: fixture.bridge, activeId: () => id, activate: () => {} } satisfies TravelServices
}

it('keeps selected fare details separate from the synthetic price summary', async () => {
  const services = await setup()
  render(<TravelProvider services={services}><CatalogNode kind="SelectedItinerary" artifactRef={id}/><CatalogNode kind="SyntheticTotal" artifactRef={id}/></TravelProvider>)
  const itinerary = screen.getByRole('region', { name: 'Selected itinerary' })
  await within(itinerary).findByText(/London → Paris/)
  expect(within(itinerary).getByText(/€23.00 per passenger/)).toBeInTheDocument()
  expect(within(itinerary).queryByText('€46.00')).not.toBeInTheDocument()
  expect(within(itinerary).queryByText(/selected legs?|No booking/)).not.toBeInTheDocument()
  expect(screen.getAllByText('€46.00')).toHaveLength(1)
})

it('ranks individual fares in ComparisonTable and limits ModeBreakdown to mode counts', async () => {
  const services = await setup()
  render(<TravelProvider services={services}><CatalogNode kind="ComparisonTable" artifactRef={id}/><CatalogNode kind="ModeBreakdown" artifactRef={id}/></TravelProvider>)
  const ranked = await screen.findByRole('table', { name: 'Compare fares' })
  expect(within(ranked).getAllByRole('row')[1]).toHaveTextContent('BusFlixBus')
  expect(within(ranked).getByRole('columnheader', { name: 'Carrier' })).toBeInTheDocument()
  const counts = await screen.findByRole('table', { name: 'Options by mode' })
  expect(within(counts).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Mode', 'Options'])
  expect(within(counts).queryByText(/€|Fastest|From/)).not.toBeInTheDocument()
})

it('keeps multileg selected facts and total independent of current filters', async () => {
  const selected = [
    fare({ id: 'london-paris-2026-10-09', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-09', mode: 'train', carrierId: 'demo-train', carrierName: 'Demo Rail', priceCents: 1000 }),
    fare({ id: 'paris-barcelona-2026-10-11', originId: 'paris', destinationId: 'barcelona', serviceDate: '2026-10-11', mode: 'bus', carrierId: 'demo-bus', carrierName: 'Demo Bus', priceCents: 2300 }),
  ]
  const fixture = createFixedProjectionFixture({ rows: selected, sourceVersion: 'multileg-v1' })
  const first = await loadScope(fixture.bridge, 'london', 'paris', '2026-10-09')
  const second = await loadScope(fixture.bridge, 'paris', 'barcelona', '2026-10-11')
  await fixture.bridge.lookupPins({
    version: 1,
    requestId: 'multileg-pins',
    sourceVersion: first.manifest.source.sourceVersion,
    pins: [
      { fareId: selected[0]!.id, resourceKey: first.resourceKey },
      { fareId: selected[1]!.id, resourceKey: second.resourceKey },
    ],
  }, signal())
  const state = createUIStateStore()
  state.initializeMissing(id, { datasetRefs: [first.datasetId, second.datasetId], dates: { start: '2026-10-09' }, selectedFareIds: selected.map(row => row.id), filters: { modes: ['bus'], carrierIds: [], directOnly: false } })
  const before = state.get(id)
  const services = { state, bridge: fixture.bridge, activeId: () => id, activate: () => {} } satisfies TravelServices
  render(<TravelProvider services={services}><CatalogNode kind="SelectedItinerary" artifactRef={id}/><CatalogNode kind="SyntheticTotal" artifactRef={id}/></TravelProvider>)
  const itinerary = await screen.findByRole('region', { name: 'Selected itinerary' })
  await within(itinerary).findByText('London → Paris')
  await within(itinerary).findByText('Paris → Barcelona')
  expect(itinerary).toHaveTextContent('2026-10-09')
  expect(itinerary).toHaveTextContent('2026-10-11')
  expect(itinerary).toHaveTextContent('Train')
  expect(itinerary).toHaveTextContent('Bus')
  await screen.findByText('€66.00')
  expect(state.get(id)).toEqual(before)
})
