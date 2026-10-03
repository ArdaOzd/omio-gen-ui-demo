import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import { ArtifactIdSchema, FareRowSchema } from '../contracts'
import { createUIStateStore } from '../state/ui-state-store'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { TravelProvider } from './context'
import { CatalogNode } from './component'
import { ReactiveScene } from '../variants/b/renderer'
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

it.each(['a','b'])('keeps multileg selected facts and total independent of current filters in %s', async variant => {
 const bridge=createFareDataBridge({pageSource:async input=>({rows:[FareRowSchema.parse({id:`${input.originId}-${input.destinationId}-${input.date}`,originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:input.originId==='london'?'train':'bus',carrierId:'demo',priceCents:input.originId==='london'?1000:2300,durationMinutes:140,departureMinutes:600,availableSeats:10,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})],total:1,page:1,pages:1,sourceVersion:'v1'})})
 const manifest=await bridge.load({originIds:['london','paris'],destinationIds:['paris','barcelona'],dateWindow:{from:'2026-10-09',to:'2026-10-11'},modes:['train','bus'],passengers:2},new AbortController().signal)
 const state=createUIStateStore()
 state.initializeMissing(id,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-09'},selectedFareIds:[FareRowSchema.shape.id.parse('london-paris-2026-10-09'),FareRowSchema.shape.id.parse('paris-barcelona-2026-10-11')],filters:{modes:['bus'],carrierIds:[],directOnly:false}})
 const before=state.get(id),services={state,bridge,activeId:()=>id,activate:()=>{}}
 const program='root = TravelSurface("trip", null, null, null, "Trip", null, [itinerary, total])\nitinerary = SelectedItinerary("trip")\ntotal = SyntheticTotal("trip")'
 render(<TravelProvider services={services}>{variant==='a'?<><CatalogNode kind="SelectedItinerary" artifactRef={id}/><CatalogNode kind="SyntheticTotal" artifactRef={id}/></>:<ReactiveScene artifactRef={id} program={program}/>}</TravelProvider>)
 const itinerary=await screen.findByRole('region',{name:'Selected itinerary'})
 await within(itinerary).findByText('London → Paris');await within(itinerary).findByText('Paris → Barcelona')
 expect(itinerary).toHaveTextContent('2026-10-09');expect(itinerary).toHaveTextContent('2026-10-11')
 expect(itinerary).toHaveTextContent('Train');expect(itinerary).toHaveTextContent('Bus')
 await screen.findByText('€66.00');expect(state.get(id)).toEqual(before)
})

it('renders the captured genuine B grouped ComparisonTable without replacing its query', async () => {
 const services=await setup()
 const datasetId=services.state.get(id).datasetRefs[0]!
 const captured=readFileSync('verification/generative-ui/b/live/program-0.openui','utf8')
 const source=captured.replaceAll('artifact-8119f590-0744-4fbc-b0ee-5ccf42cd5e84',id).replaceAll('dataset-1hq3nnw',datasetId)
 render(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={source}/></TravelProvider>)
 const table=await screen.findByRole('table',{name:'Compare fares'})
 await within(table).findByText('€23.00')
 expect(within(table).getAllByRole('columnheader').map(header=>header.textContent)).toEqual(['Mode','From','Fastest','Options'])
 expect(within(table).getByRole('row',{name:/Bus/})).toHaveTextContent('7h 50m')
 expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
