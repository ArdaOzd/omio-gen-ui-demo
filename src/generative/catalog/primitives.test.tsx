import { it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ArtifactIdSchema, FareRowSchema } from '../contracts'
import { createUIStateStore } from '../state/ui-state-store'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { TravelProvider } from './context'
import { CatalogNode } from './component'
const id = ArtifactIdSchema.parse('trip')
async function setup() {
 const rows = ['train', 'bus'].map((mode, index) => FareRowSchema.parse({id: `fare-${index}`, originId: 'london', destinationId: 'paris', serviceDate: '2026-10-09', mode, carrierId: index === 0 ? 'eurostar' : 'flixbus', priceCents: index === 0 ? 5500 : 2300, durationMinutes: index === 0 ? 140 : 470, departureMinutes: 600, availableSeats: 10, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true}))
 const bridge = createFareDataBridge({pageSource: async () => ({rows, total: 2, page: 1, pages: 1, sourceVersion: 'fixture-v1'})})
 const manifest = await bridge.load({originIds: ['london'], destinationIds: ['paris'], dateWindow: {from: '2026-10-09', to: '2026-10-09'}, modes: ['train', 'bus'], passengers: 2}, new AbortController().signal)
 const state = createUIStateStore()
 state.initializeMissing(id, {datasetRefs: [manifest.datasetId], dates: {start: '2026-10-09'}, selectedFareIds: [rows[1]!.id]})
 return {state, bridge, activeId: () => id, activate: () => {}}
}
it('keeps selected fare details separate from the synthetic price summary', async () => {
 const services = await setup()
 render(<TravelProvider services={services}><CatalogNode kind="SelectedItinerary" artifactRef={id}/><CatalogNode kind="SyntheticTotal" artifactRef={id}/></TravelProvider>)
 const itinerary = screen.getByRole('region', {name: 'Selected itinerary'})
 await within(itinerary).findByText(/London → Paris/)
 expect(within(itinerary).getByText(/€23.00 per passenger/)).toBeInTheDocument()
 expect(within(itinerary).queryByText('€46.00')).not.toBeInTheDocument()
 expect(within(itinerary).queryByText(/selected legs?|No booking/)).not.toBeInTheDocument()
 expect(screen.getAllByText('€46.00')).toHaveLength(1)
})
it('ranks individual fares in ComparisonTable and limits ModeBreakdown to mode counts', async () => {
 const services = await setup()
 render(<TravelProvider services={services}><CatalogNode kind="ComparisonTable" artifactRef={id}/><CatalogNode kind="ModeBreakdown" artifactRef={id}/></TravelProvider>)
 const ranked = await screen.findByRole('table', {name: 'Compare fares'})
 expect(within(ranked).getAllByRole('row')[1]).toHaveTextContent('BusFlixbus')
 expect(within(ranked).getByRole('columnheader', {name: 'Carrier'})).toBeInTheDocument()
 const counts = await screen.findByRole('table', {name: 'Options by mode'})
 expect(within(counts).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Mode', 'Options'])
 expect(within(counts).queryByText(/€|Fastest|From/)).not.toBeInTheDocument()
})
