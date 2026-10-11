import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ArtifactIdSchema } from '../contracts'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { createActionRouter } from '../state/action-router'
import { createUIStateStore } from '../state/ui-state-store'
import { CatalogNode } from './component'
import { TravelProvider, type TravelServices } from './context'

const artifactId = ArtifactIdSchema.parse('bounded-control-showcase')
const dateBounds = { from: '2026-12-01', to: '2026-12-15' } as const

afterEach(cleanup)

it('exposes the shared date and remaining-stay limits and guards scripted input', async () => {
  const fixture = createFixedProjectionFixture({ rows: [] })
  const manifest = await fixture.bridge.loadScope(fixture.scope({
    originId: 'london',
    destinationId: 'paris',
    dateWindow: dateBounds,
    passengers: 1,
    earliestDeparture: { date: dateBounds.from, minutes: 0 },
  }), new AbortController().signal)
  const binding = fixture.bridge.getBinding(manifest.resourceKey)
  const state = createUIStateStore({ now: () => '2026-12-08T09:00:00.000Z' })
  state.initializeMissing(artifactId, {
    datasetRefs: [binding.datasetId],
    dates: { start: '2026-12-08', end: '2026-12-15' },
    citySequence: ['london', 'paris', 'barcelona'],
    stays: [{ cityId: 'paris', nights: 2 }, { cityId: 'barcelona', nights: 1 }],
    displayWindowByLeg: {
      'london:paris': { from: '2026-12-08', to: '2026-12-14' },
      'paris:barcelona': { from: '2026-12-10', to: '2026-12-15' },
    },
  })
  const router = createActionRouter(state, { bridge: fixture.bridge, dateBounds })
  const services: TravelServices = {
    bridge: fixture.bridge,
    state,
    dispatch: router,
    dateBounds,
    activeId: () => artifactId,
    activate: () => {},
  }
  render(<TravelProvider services={services}>
    <CatalogNode kind="DateStrip" artifactRef={artifactId} title="Departure date" />
    <CatalogNode kind="DateWindow" artifactRef={artifactId} />
    <CatalogNode kind="TravelDate" artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0} title="Trip start" />
    <CatalogNode kind="StayAllocation" artifactRef={artifactId} />
  </TravelProvider>)

  const departure = screen.getByLabelText('Departure date')
  expect(departure).toHaveAttribute('min', dateBounds.from)
  expect(departure).toHaveAttribute('max', dateBounds.to)
  fireEvent.change(departure, { target: { value: '2026-12-16' } })
  expect(state.get(artifactId).dates.start).toBe('2026-12-08')

  expect(screen.getByLabelText('Window starts')).toHaveAttribute('min', dateBounds.from)
  expect(screen.getByLabelText('Window starts')).toHaveAttribute('max', dateBounds.to)
  expect(screen.getByLabelText('Window ends')).toHaveAttribute('max', dateBounds.to)
  expect(screen.getByLabelText('Trip start')).toHaveAttribute('max', '2026-12-08')
  expect(screen.getByLabelText('Paris')).toHaveAttribute('max', '2')
  expect(screen.getByLabelText('Barcelona')).toHaveAttribute('max', '5')
  router.dispose()
})
