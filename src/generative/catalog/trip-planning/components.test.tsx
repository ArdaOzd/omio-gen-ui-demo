import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ArtifactIdSchema, CoverageRequestSchema, FareRowSchema, type FareRow } from '../../contracts'
import { createFareDataBridge } from '../../data/fare-data-bridge'
import { createActionRouter } from '../../state/action-router'
import { createUIStateStore } from '../../state/ui-state-store'
import { TravelProvider } from '../context'
import { FareCalendar, sortFares } from './components'

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

afterEach(cleanup)

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
  await screen.findByText('No departures fit this trip window; adjust the previous fare or stay.')
  expect(document.querySelectorAll('.trip-calendar-day')).toHaveLength(0)
})
