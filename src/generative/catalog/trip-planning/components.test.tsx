import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArtifactIdSchema, CoverageRequestSchema, FareRowSchema, type FareRow } from '../../contracts'
import { createFareDataBridge } from '../../data/fare-data-bridge'
import { createActionRouter } from '../../state/action-router'
import { createUIStateStore } from '../../state/ui-state-store'
import { TravelProvider } from '../context'
import { FadeFares, FareCalendar, FareOrder, MultiCityPlanGrid, TravelDate, sortFares } from './components'

const artifactId = ArtifactIdSchema.parse('trip-planning-test')

function fare(input: { id: string; date: string; mode: 'train' | 'bus'; price: number; duration: number; departure: number }): FareRow {
  return FareRowSchema.parse({
    id: input.id,
    originId: 'london',
    destinationId: 'paris',
    serviceDate: input.date,
    mode: input.mode,
    carrierId: input.mode === 'train' ? 'eurostar' : 'flixbus',
    carrierName: input.mode === 'train' ? 'Eurostar' : 'FlixBus',
    priceCents: input.price,
    durationMinutes: input.duration,
    departureMinutes: input.departure,
    availableSeats: 12,
    currency: 'EUR',
    synthetic: true,
    priceBasis: 'per-passenger-including-demo-fees',
    direct: true,
  })
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('trip planning fare ordering', () => {
  const laterCheap = fare({ id: 'later-cheap', date: '2026-10-10', mode: 'bus', price: 900, duration: 420, departure: 480 })
  const earlyLateDeparture = fare({ id: 'early-late', date: '2026-10-09', mode: 'train', price: 3000, duration: 160, departure: 720 })
  const earlyEarlyDeparture = fare({ id: 'early-early', date: '2026-10-09', mode: 'bus', price: 2000, duration: 360, departure: 420 })

  it('uses service date then departure for the default order', () => {
    expect(sortFares([laterCheap, earlyLateDeparture, earlyEarlyDeparture], 'none').map(row => row.id)).toEqual(['early-early', 'early-late', 'later-cheap'])
  })

  it('keeps cheapest and fastest as independent choices', () => {
    expect(sortFares([earlyLateDeparture, laterCheap], 'cheapest')[0]?.id).toBe('later-cheap')
    expect(sortFares([laterCheap, earlyLateDeparture], 'fastest')[0]?.id).toBe('early-late')
  })
})

it('uses a compact icon dropdown in the grid and omits zero-count modes', async () => {
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({locations:[{slug:'london',display_name:'London, GB'},{slug:'paris',display_name:'Paris, FR'}]}),{status:200,headers:{'content-type':'application/json'}})))
  const train=fare({id:'train-only',date:'2026-10-09',mode:'train',price:3200,duration:150,departure:540})
  const bridge=createFareDataBridge({pageSource:async()=>({rows:[train],total:1,pages:1,page:1,sourceVersion:'grid-dropdown-v1'})})
  const manifest=await bridge.load(CoverageRequestSchema.parse({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-09'},modes:['train','bus'],passengers:1}),new AbortController().signal)
  const state=createUIStateStore();state.initializeMissing(artifactId,{datasetRefs:[manifest.datasetId],citySequence:['london','paris'],dates:{start:'2026-10-09'}})
  render(<TravelProvider services={{bridge,state,activeId:()=>artifactId,activate:()=>{}}}><MultiCityPlanGrid artifactRef={artifactId}/></TravelProvider>)
  const trigger=await screen.findByRole('button',{name:'Transport: All available'})
  await userEvent.click(trigger)
  expect(await screen.findByRole('menuitemcheckbox',{name:'Train'})).toBeChecked()
  expect(screen.queryByRole('menuitemcheckbox',{name:'Bus'})).not.toBeInTheDocument()
})

it('hides old-route fares while replacement coverage is loading', async () => {
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({locations:[{slug:'london',display_name:'London, GB'},{slug:'paris',display_name:'Paris, FR'},{slug:'rome',display_name:'Rome, IT'}]}),{status:200,headers:{'content-type':'application/json'}})))
  let releaseRome: (() => void) | undefined
  const romeGate = new Promise<void>(resolve => { releaseRome = resolve })
  const bridge=createFareDataBridge({pageSource:async input=>{
    if(input.destinationId==='rome')await romeGate
    const row=fare({id:input.destinationId==='rome'?'new-rome-fare':'old-paris-fare',date:input.date,mode:'train',price:input.destinationId==='rome'?4700:3200,duration:150,departure:540})
    return{rows:[{...row,destinationId:input.destinationId}],total:1,pages:1,page:input.page,sourceVersion:'route-refresh-v1'}
  }})
  const seed=await bridge.load(CoverageRequestSchema.parse({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-09'},modes:['train'],passengers:1}),new AbortController().signal)
  const state=createUIStateStore();state.initializeMissing(artifactId,{datasetRefs:[seed.datasetId],citySequence:['london','paris'],dates:{start:'2026-10-09'},displayWindowByLeg:{'london:paris':{from:'2026-10-09',to:'2026-10-09'}}})
  const router=createActionRouter(state,{bridge})
  render(<TravelProvider services={{bridge,state,dispatch:router,activeId:()=>artifactId,activate:()=>{}}}><MultiCityPlanGrid artifactRef={artifactId}/></TravelProvider>)
  await screen.findByText('€32.00')

  router({kind:'route',artifactId,citySequence:['london','rome']})
  await screen.findByText('No route is ready yet')
  expect(screen.queryByText('€32.00')).not.toBeInTheDocument()
  expect(screen.queryByRole('button',{name:'Choose fare'})).not.toBeInTheDocument()

  releaseRome?.()
  await router.whenIdle(artifactId)
  await screen.findByRole('region',{name:'Multi-city trip planner'})
  expect(await screen.findByText('€47.00')).toBeInTheDocument()
  expect(screen.getByRole('region',{name:'Multi-city trip planner'})).toHaveTextContent('London to Rome')
  router.dispose()
})

it('shows only the leg display window and persists a day chosen from selected modes', async () => {
  const request = CoverageRequestSchema.parse({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-09', to: '2026-10-11' }, modes: ['train', 'bus'], passengers: 1 })
  const bridge = createFareDataBridge({ pageSource: async input => {
    const rows = [
      fare({ id: `train-${input.date}`, date: input.date, mode: 'train', price: 5200, duration: 150, departure: 540 }),
      fare({ id: `bus-${input.date}`, date: input.date, mode: 'bus', price: 2400, duration: 430, departure: 600 }),
    ]
    return { rows, total: rows.length, pages: 1, page: input.page, sourceVersion: 'trip-ui-v1' }
  } })
  const manifest = await bridge.load(request, new AbortController().signal)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, {
    datasetRefs: [manifest.datasetId],
    citySequence: ['london', 'paris'],
    dates: { start: '2026-10-09', end: '2026-10-11' },
    stays: [{ cityId: 'paris', nights: 0 }],
    displayWindowByLeg: { 'london:paris': { from: '2026-10-09', to: '2026-10-11' } },
    availableModesByLeg: { 'london:paris': ['train', 'bus'] },
    modesByLeg: { 'london:paris': ['bus'] },
  })
  const router = createActionRouter(state, { bridge })
  const services = { bridge, state, dispatch: router, activeId: () => artifactId, activate: () => {} }
  render(<TravelProvider services={services}><FareCalendar artifactRef={artifactId} datasetRef={manifest.datasetId} /></TravelProvider>)

  const days = await screen.findAllByRole('button', { name: /Oct/ })
  expect(days).toHaveLength(3)
  expect(screen.queryByText(/12 Oct/)).not.toBeInTheDocument()
  expect(screen.getAllByLabelText('Bus')).toHaveLength(3)
  expect(screen.queryByLabelText('Train')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /Sat 10 Oct/ }))
  await waitFor(() => expect(state.get(artifactId).calendarDateByLeg['london:paris']).toBe('2026-10-10'))
  expect(screen.getByRole('button', { name: /Sat 10 Oct/ })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Choose' }))
  await router.whenIdle(artifactId)
  expect(state.get(artifactId).selectedFareIds).toEqual(['bus-2026-10-10'])
})

it('shifts the full itinerary window before querying and rendering a new first-leg date', async () => {
  const loadedDates: string[] = []
  const request = CoverageRequestSchema.parse({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-09', to: '2026-10-11' }, modes: ['train'], passengers: 1 })
  const bridge = createFareDataBridge({ pageSource: async input => {
    loadedDates.push(input.date)
    const row = fare({ id: `train-${input.date}`, date: input.date, mode: 'train', price: 5200, duration: 150, departure: 540 })
    return { rows: [row], total: 1, pages: 1, page: input.page, sourceVersion: 'trip-date-shift-v1' }
  } })
  const manifest = await bridge.load(request, new AbortController().signal)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, {
    datasetRefs: [manifest.datasetId],
    citySequence: ['london', 'paris'],
    dates: { start: '2026-10-09', end: '2026-10-11' },
    displayWindowByLeg: { 'london:paris': { from: '2026-10-09', to: '2026-10-11' } },
    availableModesByLeg: { 'london:paris': ['train'] },
  })
  const router = createActionRouter(state, { bridge })
  const services = { bridge, state, dispatch: router, activeId: () => artifactId, activate: () => {} }
  render(<TravelProvider services={services}><TravelDate artifactRef={artifactId} datasetRef={manifest.datasetId} /><FareCalendar artifactRef={artifactId} datasetRef={manifest.datasetId} /></TravelProvider>)

  fireEvent.change(screen.getByLabelText('Departure'), { target: { value: '2026-10-10' } })
  await router.whenIdle(artifactId)

  expect(state.get(artifactId).dates).toEqual({ start: '2026-10-10', end: '2026-10-12' })
  expect(state.get(artifactId).displayWindowByLeg['london:paris']).toEqual({ from: '2026-10-10', to: '2026-10-12' })
  expect(loadedDates).toContain('2026-10-12')
  await waitFor(() => expect(screen.getAllByRole('button', { name: /Oct/ })).toHaveLength(3))
  expect(screen.getByRole('button', { name: /Mon 12 Oct/ })).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Departure'), { target: { value: '2026-10-09' } })
  await router.whenIdle(artifactId)
  expect(state.get(artifactId).dates).toEqual({ start: '2026-10-09', end: '2026-10-11' })
  expect(state.get(artifactId).displayWindowByLeg['london:paris']).toEqual({ from: '2026-10-09', to: '2026-10-11' })
  router.dispose()
})

it('lets a later-leg departure move backward by reducing its stay', async () => {
  const pageSource = async (input: { originId: string; destinationId: string; date: string; page: number }) => ({ rows: [FareRowSchema.parse({ id: `${input.originId}-${input.destinationId}-${input.date}`, originId: input.originId, destinationId: input.destinationId, serviceDate: input.date, mode: 'train', carrierId: 'rail', carrierName: 'Fixture Rail', priceCents: 3200, durationMinutes: 180, departureMinutes: 600, availableSeats: 12, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true })], total: 1, pages: 1, page: input.page, sourceVersion: 'trip-stay-date-v1' })
  const bridge = createFareDataBridge({ pageSource })
  const first = await bridge.load(CoverageRequestSchema.parse({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-26', to: '2026-11-02' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const second = await bridge.load(CoverageRequestSchema.parse({ originIds: ['paris'], destinationIds: ['rome'], dateWindow: { from: '2026-10-26', to: '2026-11-02' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, { datasetRefs: [first.datasetId, second.datasetId], citySequence: ['london', 'paris', 'rome'], dates: { start: '2026-10-26', end: '2026-11-02' }, stays: [{ cityId: 'paris', nights: 3 }, { cityId: 'rome', nights: 0 }] })
  const router = createActionRouter(state, { bridge })
  render(<TravelProvider services={{ bridge, state, dispatch: router, activeId: () => artifactId, activate: () => {} }}><TravelDate artifactRef={artifactId} datasetRef={second.datasetId} /></TravelProvider>)
  const input = screen.getByLabelText('Departure')

  expect(input).toHaveValue('2026-10-29')
  expect(input).toHaveAttribute('min', '2026-10-26')
  fireEvent.change(input, { target: { value: '2026-10-31' } })
  await router.whenIdle(artifactId)
  expect(state.get(artifactId).stays.find(stay => stay.cityId === 'paris')?.nights).toBe(5)

  fireEvent.change(screen.getByLabelText('Departure'), { target: { value: '2026-10-30' } })
  await router.whenIdle(artifactId)
  expect(state.get(artifactId).stays.find(stay => stay.cityId === 'paris')?.nights).toBe(4)
  router.dispose()
})

it('queries leg fares chronologically by default and restores that order after price sorting', async () => {
  const rows = [fare({ id: 'expensive-earliest', date: '2026-10-09', mode: 'train', price: 99_900, duration: 160, departure: 60 })]
  for (let index = 0; index < 100; index += 1) rows.push(fare({ id: `cheap-later-${index}`, date: '2026-10-10', mode: 'train', price: 1_000 + index, duration: 160, departure: 120 + index }))
  const bridge = createFareDataBridge({ pageSource: async input => { const dated = rows.filter(row => row.serviceDate === input.date); return { rows: dated, total: dated.length, pages: 1, page: input.page, sourceVersion: 'trip-order-v1' } } })
  const manifest = await bridge.load(CoverageRequestSchema.parse({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-09', to: '2026-10-10' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, { datasetRefs: [manifest.datasetId], citySequence: ['london', 'paris'], dates: { start: '2026-10-09', end: '2026-10-10' } })
  const services = { bridge, state, activeId: () => artifactId, activate: () => {} }
  render(<TravelProvider services={services}><FareOrder artifactRef={artifactId} datasetRef={manifest.datasetId} /><FadeFares artifactRef={artifactId} datasetRef={manifest.datasetId} /></TravelProvider>)

  await screen.findByText('€999.00')
  fireEvent.click(screen.getByRole('button', { name: 'Cheapest' }))
  await waitFor(() => expect(screen.queryByText('€999.00')).not.toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: 'Departure' }))
  await screen.findByText('€999.00')
})

it('defaults calendar days to complete cheapest representatives and keeps fastest card details from one fare', async () => {
  const firstDay = Array.from({ length: 100 }, (_, index) => fare({ id: `filler-${index}`, date: '2026-10-09', mode: 'bus', price: 2_000 + index, duration: 400 + index, departure: 200 + index }))
  firstDay.push(fare({ id: 'true-cheapest', date: '2026-10-09', mode: 'bus', price: 500, duration: 700, departure: 900 }))
  firstDay.push(fare({ id: 'true-fastest', date: '2026-10-09', mode: 'train', price: 99_900, duration: 60, departure: 1_000 }))
  const rows = [...firstDay, fare({ id: 'second-day', date: '2026-10-10', mode: 'train', price: 4_000, duration: 120, departure: 400 })]
  const bridge = createFareDataBridge({ pageSource: async input => { const dated=rows.filter(row=>row.serviceDate===input.date),pages=Math.max(1,Math.ceil(dated.length/100));return{rows:dated.slice((input.page-1)*100,input.page*100),total:dated.length,pages,page:input.page,sourceVersion:'calendar-groups-v1'} } })
  const manifest = await bridge.load(CoverageRequestSchema.parse({ originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-10'},modes:['train','bus'],passengers:1 }),new AbortController().signal)
  const state=createUIStateStore()
  state.initializeMissing(artifactId,{datasetRefs:[manifest.datasetId],citySequence:['london','paris'],dates:{start:'2026-10-09',end:'2026-10-10'},availableModesByLeg:{'london:paris':['train','bus']}})
  render(<TravelProvider services={{bridge,state,activeId:()=>artifactId,activate:()=>{}}}><FareCalendar artifactRef={artifactId} datasetRef={manifest.datasetId}/></TravelProvider>)

  const cheapestDay=await screen.findByRole('button',{name:/Fri 9 Oct.*€5\.00.*Bus.*11h 40m/})
  expect(cheapestDay).toBeInTheDocument()
  expect(screen.getByRole('radio',{name:'Cheapest'})).toBeChecked()
  expect(screen.getByRole('button',{name:/Sat 10 Oct/})).toBeInTheDocument()

  fireEvent.click(screen.getByRole('radio',{name:'Fastest'}))
  await screen.findByRole('button',{name:/Fri 9 Oct.*€999\.00.*Train.*1h 0m/})
  expect(screen.queryByRole('button',{name:/Fri 9 Oct.*€5\.00.*1h 0m/})).not.toBeInTheDocument()
})

it('excludes coverage margins for a later leg and shows a status when its threshold passes the display end', async () => {
  const pageSource = async (input: { originId: string; destinationId: string; date: string; page: number }) => {
    const row = FareRowSchema.parse({
      id: `${input.originId}-${input.destinationId}-${input.date}`,
      originId: input.originId,
      destinationId: input.destinationId,
      serviceDate: input.date,
      mode: 'train',
      carrierId: 'rail',
      carrierName: 'Fixture Rail',
      priceCents: 3200,
      durationMinutes: 180,
      departureMinutes: 600,
      availableSeats: 12,
      currency: 'EUR',
      synthetic: true,
      priceBasis: 'per-passenger-including-demo-fees',
      direct: true,
    })
    return { rows: [row], total: 1, pages: 1, page: input.page, sourceVersion: 'trip-window-v1' }
  }
  const bridge = createFareDataBridge({ pageSource })
  const first = await bridge.load(CoverageRequestSchema.parse({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-23', to: '2026-11-03' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const second = await bridge.load(CoverageRequestSchema.parse({ originIds: ['paris'], destinationIds: ['rome'], dateWindow: { from: '2026-10-27', to: '2026-11-05' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, {
    datasetRefs: [first.datasetId, second.datasetId],
    citySequence: ['london', 'paris', 'rome'],
    dates: { start: '2026-10-26', end: '2026-11-01' },
    stays: [{ cityId: 'paris', nights: 4 }, { cityId: 'rome', nights: 0 }],
    displayWindowByLeg: { 'london:paris': { from: '2026-10-26', to: '2026-11-01' }, 'paris:rome': { from: '2026-10-30', to: '2026-11-01' } },
    availableModesByLeg: { 'london:paris': ['train'], 'paris:rome': ['train'] },
  })
  render(<TravelProvider services={{ bridge, state, activeId: () => artifactId, activate: () => {} }}><FareCalendar artifactRef={artifactId} datasetRef={second.datasetId} /></TravelProvider>)

  await waitFor(() => expect(document.querySelectorAll('.trip-calendar-day')).toHaveLength(3))
  expect(screen.queryByText(/29 Oct/)).not.toBeInTheDocument()
  expect(screen.queryByText(/2 Nov/)).not.toBeInTheDocument()

  const current = state.get(artifactId)
  state.dispatch({ kind: 'stays', artifactId, expectedRevision: current.revision, stays: [{ cityId: 'paris', nights: 8 }, { cityId: 'rome', nights: 0 }] })
  const shifted = state.get(artifactId)
  state.dispatch({ kind: 'displayWindowByLeg', artifactId, expectedRevision: shifted.revision, displayWindowByLeg: { ...shifted.displayWindowByLeg, 'paris:rome': { from: '2026-10-30', to: '2026-11-01' } } })
  await screen.findByText('No departures fit this trip window; adjust the previous fare or stay.')
  expect(document.querySelectorAll('.trip-calendar-day')).toHaveLength(0)
})
