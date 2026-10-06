import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  ArtifactIdSchema,
  CoverageRequestSchema,
  FareRowSchema,
  type FareRow,
} from '../../contracts'
import { createFareDataBridge } from '../../data/fare-data-bridge'
import { createActionRouter } from '../../state/action-router'
import { createUIStateStore } from '../../state/ui-state-store'
import { TravelProvider } from '../context'
import { CityField, FareCalendar, TravelDate } from './components'

const artifactId = ArtifactIdSchema.parse('trip-planning-review-controls')

function fare(input: {
  id: string
  originId: string
  destinationId: string
  date: string
  departure: number
  duration: number
}): FareRow {
  return FareRowSchema.parse({
    id: input.id,
    originId: input.originId,
    destinationId: input.destinationId,
    serviceDate: input.date,
    mode: 'train',
    carrierId: 'fixture-rail',
    carrierName: 'Fixture Rail',
    priceCents: 3200,
    durationMinutes: input.duration,
    departureMinutes: input.departure,
    availableSeats: 12,
    currency: 'EUR',
    synthetic: true,
    priceBasis: 'per-passenger-including-demo-fees',
    direct: true,
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('excludes an adjacent duplicate city while allowing the final leg to return to the first origin', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ locations: [
    { slug: 'london', display_name: 'London, GB' },
    { slug: 'paris', display_name: 'Paris, FR' },
    { slug: 'rome', display_name: 'Rome, IT' },
  ] }), { status: 200, headers: { 'content-type': 'application/json' } })))

  const bridge = createFareDataBridge({ pageSource: async input => {
    const row = fare({ id: `${input.originId}-${input.destinationId}-${input.date}`, originId: input.originId, destinationId: input.destinationId, date: input.date, departure: 600, duration: 180 })
    return { rows: [row], total: 1, pages: 1, page: input.page, sourceVersion: 'review-city-v1' }
  } })
  const first = await bridge.load(CoverageRequestSchema.parse({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-26', to: '2026-11-01' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const second = await bridge.load(CoverageRequestSchema.parse({ originIds: ['paris'], destinationIds: ['rome'], dateWindow: { from: '2026-10-29', to: '2026-11-01' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, {
    datasetRefs: [first.datasetId, second.datasetId],
    citySequence: ['london', 'paris', 'rome'],
    dates: { start: '2026-10-26', end: '2026-11-01' },
    stays: [{ cityId: 'paris', nights: 3 }, { cityId: 'rome', nights: 0 }],
    availableModesByLeg: { 'london:paris': ['train'], 'paris:rome': ['train'] },
  })
  const router = createActionRouter(state, { bridge })
  const services = { bridge, state, dispatch: router, activeId: () => artifactId, activate: () => {} }
  render(<TravelProvider services={services}>
    <CityField artifactRef={artifactId} datasetRef={first.datasetId} />
    <CityField artifactRef={artifactId} datasetRef={second.datasetId} />
  </TravelProvider>)

  await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(4))
  const firstDestination = screen.getAllByRole('combobox')[1]
  fireEvent.focus(firstDestination)
  fireEvent.change(firstDestination, { target: { value: 'London' } })
  expect(screen.queryByRole('option', { name: 'London, GB' })).not.toBeInTheDocument()

  const finalDestination = screen.getAllByRole('combobox')[3]
  fireEvent.focus(finalDestination)
  fireEvent.change(finalDestination, { target: { value: 'London' } })
  const returnOption = await screen.findByRole('option', { name: 'London, GB' })
  expect(() => fireEvent.click(returnOption)).not.toThrow()
  await router.whenIdle(artifactId)
  expect(state.get(artifactId).citySequence).toEqual(['london', 'paris', 'london'])
  router.dispose()
})

it('moves the first-leg date and its complete display window forward and backward', async () => {
  const bridge = createFareDataBridge({ pageSource: async input => {
    const row = fare({ id: `${input.originId}-${input.destinationId}-${input.date}`, originId: input.originId, destinationId: input.destinationId, date: input.date, departure: 600, duration: 180 })
    return { rows: [row], total: 1, pages: 1, page: input.page, sourceVersion: 'review-first-date-v1' }
  } })
  const manifest = await bridge.load(CoverageRequestSchema.parse({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-26', to: '2026-11-01' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, {
    datasetRefs: [manifest.datasetId],
    citySequence: ['london', 'paris'],
    dates: { start: '2026-10-26', end: '2026-11-01' },
    displayWindowByLeg: { 'london:paris': { from: '2026-10-26', to: '2026-11-01' } },
    availableModesByLeg: { 'london:paris': ['train'] },
  })
  const router = createActionRouter(state, { bridge })
  render(<TravelProvider services={{ bridge, state, dispatch: router, activeId: () => artifactId, activate: () => {} }}>
    <TravelDate artifactRef={artifactId} datasetRef={manifest.datasetId} />
    <FareCalendar artifactRef={artifactId} datasetRef={manifest.datasetId} />
  </TravelProvider>)

  const input = await screen.findByLabelText('Departure')
  expect(input).not.toHaveAttribute('min')
  fireEvent.change(input, { target: { value: '2026-10-27' } })
  await router.whenIdle(artifactId)
  expect(state.get(artifactId).dates).toEqual({ start: '2026-10-27', end: '2026-11-02' })
  expect(state.get(artifactId).displayWindowByLeg['london:paris']).toEqual({ from: '2026-10-27', to: '2026-11-02' })
  await screen.findByRole('button', { name: /Mon 2 Nov/ })

  fireEvent.change(screen.getByLabelText('Departure'), { target: { value: '2026-10-25' } })
  await router.whenIdle(artifactId)
  expect(state.get(artifactId).dates).toEqual({ start: '2026-10-25', end: '2026-10-31' })
  expect(state.get(artifactId).displayWindowByLeg['london:paris']).toEqual({ from: '2026-10-25', to: '2026-10-31' })
  await screen.findByRole('button', { name: /Sun 25 Oct/ })
  router.dispose()
})

it('moves a selected-arrival later leg forward and backward by changing only its stay', async () => {
  const bridge = createFareDataBridge({ pageSource: async input => {
    const firstLeg = input.originId === 'london'
    const row = fare({
      id: `${input.originId}-${input.destinationId}-${input.date}`,
      originId: input.originId,
      destinationId: input.destinationId,
      date: input.date,
      departure: firstLeg && input.date === '2026-10-26' ? 1260 : 1080,
      duration: firstLeg && input.date === '2026-10-26' ? 1200 : 120,
    })
    return { rows: [row], total: 1, pages: 1, page: input.page, sourceVersion: 'review-date-v1' }
  } })
  const first = await bridge.load(CoverageRequestSchema.parse({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-26', to: '2026-11-02' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const second = await bridge.load(CoverageRequestSchema.parse({ originIds: ['paris'], destinationIds: ['rome'], dateWindow: { from: '2026-10-27', to: '2026-11-02' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, {
    datasetRefs: [first.datasetId, second.datasetId],
    citySequence: ['london', 'paris', 'rome'],
    dates: { start: '2026-10-26', end: '2026-11-02' },
    stays: [{ cityId: 'paris', nights: 3 }, { cityId: 'rome', nights: 0 }],
    selectedFareIds: [FareRowSchema.parse(fare({ id: 'london-paris-2026-10-26', originId: 'london', destinationId: 'paris', date: '2026-10-26', departure: 1260, duration: 1200 })).id],
  })
  const router = createActionRouter(state, { bridge })
  render(<TravelProvider services={{ bridge, state, dispatch: router, activeId: () => artifactId, activate: () => {} }}>
    <TravelDate artifactRef={artifactId} datasetRef={second.datasetId} />
  </TravelProvider>)

  const input = await screen.findByLabelText('Departure')
  await waitFor(() => expect(input).toHaveValue('2026-10-30'))
  expect(input).toHaveAttribute('min', '2026-10-27')

  fireEvent.change(input, { target: { value: '2026-10-31' } })
  await router.whenIdle(artifactId)
  expect(state.get(artifactId).stays.find(stay => stay.cityId === 'paris')?.nights).toBe(4)

  fireEvent.change(screen.getByLabelText('Departure'), { target: { value: '2026-10-29' } })
  await router.whenIdle(artifactId)
  expect(state.get(artifactId).stays.find(stay => stay.cityId === 'paris')?.nights).toBe(2)
  expect(state.get(artifactId).dates).toEqual({ start: '2026-10-26', end: '2026-11-02' })
  router.dispose()
})

it('moves a later-leg display window earlier when its explicit date moves before the original window', async () => {
  const bridge = createFareDataBridge({ pageSource: async input => {
    const row = fare({
      id: `${input.originId}-${input.destinationId}-${input.date}`,
      originId: input.originId,
      destinationId: input.destinationId,
      date: input.date,
      departure: 480,
      duration: 120,
    })
    return { rows: [row], total: 1, pages: 1, page: input.page, sourceVersion: 'review-leg-window-v1' }
  } })
  const first = await bridge.load(CoverageRequestSchema.parse({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-10', to: '2026-10-16' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const second = await bridge.load(CoverageRequestSchema.parse({ originIds: ['paris'], destinationIds: ['rome'], dateWindow: { from: '2026-10-13', to: '2026-10-19' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, {
    datasetRefs: [first.datasetId, second.datasetId],
    citySequence: ['london', 'paris', 'rome'],
    dates: { start: '2026-10-10', end: '2026-10-16' },
    stays: [{ cityId: 'paris', nights: 3 }, { cityId: 'rome', nights: 0 }],
    displayWindowByLeg: { 'london:paris': { from: '2026-10-10', to: '2026-10-16' }, 'paris:rome': { from: '2026-10-13', to: '2026-10-19' } },
    availableModesByLeg: { 'london:paris': ['train'], 'paris:rome': ['train'] },
    selectedFareIds: [fare({ id: 'london-paris-2026-10-10', originId: 'london', destinationId: 'paris', date: '2026-10-10', departure: 480, duration: 120 }).id],
  })
  const router = createActionRouter(state, { bridge })
  render(<TravelProvider services={{ bridge, state, dispatch: router, activeId: () => artifactId, activate: () => {} }}>
    <TravelDate artifactRef={artifactId} datasetRef={second.datasetId} />
    <FareCalendar artifactRef={artifactId} datasetRef={second.datasetId} />
  </TravelProvider>)

  const input = await screen.findByLabelText('Departure')
  await waitFor(() => expect(input).toHaveValue('2026-10-13'))
  fireEvent.change(input, { target: { value: '2026-10-11' } })
  await router.whenIdle(artifactId)

  expect(screen.getByLabelText('Departure')).toHaveValue('2026-10-11')
  expect(state.get(artifactId).stays.find(stay => stay.cityId === 'paris')?.nights).toBe(1)
  expect(state.get(artifactId).displayWindowByLeg['paris:rome']).toEqual({ from: '2026-10-11', to: '2026-10-17' })
  await screen.findByRole('button', { name: /Sun 11 Oct/ })
  expect(screen.queryByRole('button', { name: /Sun 18 Oct/ })).not.toBeInTheDocument()
  router.dispose()
})

it('keeps the stored calendar selection equal to the visible valid day after a threshold shift', async () => {
  const bridge = createFareDataBridge({ pageSource: async input => {
    const firstLeg = input.originId === 'london'
    const row = fare({
      id: `${input.originId}-${input.destinationId}-${input.date}`,
      originId: input.originId,
      destinationId: input.destinationId,
      date: input.date,
      departure: firstLeg && input.date === '2026-10-26' ? 1260 : 1080,
      duration: firstLeg && input.date === '2026-10-26' ? 1200 : 120,
    })
    return { rows: [row], total: 1, pages: 1, page: input.page, sourceVersion: 'review-calendar-v1' }
  } })
  const first = await bridge.load(CoverageRequestSchema.parse({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-26', to: '2026-11-02' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const second = await bridge.load(CoverageRequestSchema.parse({ originIds: ['paris'], destinationIds: ['rome'], dateWindow: { from: '2026-10-27', to: '2026-11-02' }, modes: ['train'], passengers: 1 }), new AbortController().signal)
  const state = createUIStateStore()
  state.initializeMissing(artifactId, {
    datasetRefs: [first.datasetId, second.datasetId],
    citySequence: ['london', 'paris', 'rome'],
    dates: { start: '2026-10-26', end: '2026-11-02' },
    stays: [{ cityId: 'paris', nights: 2 }, { cityId: 'rome', nights: 0 }],
    displayWindowByLeg: { 'london:paris': { from: '2026-10-26', to: '2026-11-02' }, 'paris:rome': { from: '2026-10-29', to: '2026-11-02' } },
    availableModesByLeg: { 'london:paris': ['train'], 'paris:rome': ['train'] },
    calendarDateByLeg: { 'paris:rome': '2026-10-29' },
    selectedFareIds: [fare({ id: 'london-paris-2026-10-26', originId: 'london', destinationId: 'paris', date: '2026-10-26', departure: 1260, duration: 1200 }).id],
  })
  const router = createActionRouter(state, { bridge })
  render(<TravelProvider services={{ bridge, state, dispatch: router, activeId: () => artifactId, activate: () => {} }}>
    <FareCalendar artifactRef={artifactId} datasetRef={second.datasetId} />
  </TravelProvider>)

  const initiallyPressed = await screen.findByRole('button', { pressed: true })
  expect(initiallyPressed).toHaveTextContent('Thu 29 Oct')
  expect(state.get(artifactId).calendarDateByLeg['paris:rome']).toBe('2026-10-29')

  const current = state.get(artifactId)
  router({ kind: 'stays', artifactId, expectedRevision: current.revision, stays: [{ cityId: 'paris', nights: 3 }, { cityId: 'rome', nights: 0 }] })
  await router.whenIdle(artifactId)
  const shiftedPressed = await screen.findByRole('button', { pressed: true })
  await waitFor(() => expect(shiftedPressed).toHaveTextContent('Fri 30 Oct'))
  expect(state.get(artifactId).calendarDateByLeg['paris:rome']).toBe('2026-10-30')
  router.dispose()
})
