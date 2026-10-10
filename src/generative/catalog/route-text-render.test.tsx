import { act, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ArtifactIdSchema } from '../contracts'
import { createUIStateStore } from '../state/ui-state-store'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { CatalogNode } from './component'
import { TravelProvider, type TravelServices } from './context'

const artifactId = ArtifactIdSchema.parse('route-text-artifact')
const alternateArtifactId = ArtifactIdSchema.parse('alternate-route-text-artifact')

function setup(citySequence = ['london', 'paris', 'barcelona']) {
  const bridge = createFixedProjectionFixture({ rows: [], sourceVersion: 'route-text-v1' }).bridge
  const state = createUIStateStore()
  state.initializeMissing(artifactId, {
    citySequence,
    dates: { start: '2026-12-08' },
    stays: [{ cityId: 'paris', nights: 2 }, { cityId: 'barcelona', nights: 4 }],
  })
  const services = { bridge, state, activeId: () => artifactId, activate: () => {} } satisfies TravelServices
  return { services, state }
}

it('updates bound headings, prose and tab labels after local route edits', () => {
  const { services, state } = setup()
  render(<TravelProvider services={services}>
    <CatalogNode kind="TravelHero" artifactRef={artifactId} title="{{tripRoute}}" body="Start {{startDateLong}}, with {{staySummary}}." />
    <CatalogNode kind="Section" artifactRef={artifactId} title="{{legNumber}} · {{legRoute}}" routeTextLegIndex={1} />
    <CatalogNode kind="Callout" artifactRef={artifactId} routeTextLegIndex={1} body="Trip from {{tripOrigin}} to {{tripDestination}}" children="From {{legFrom}} to {{legTo}}" />
    <CatalogNode kind="CoverageSummary" artifactRef={artifactId} datasetRef="retired-paris-barcelona-scope" title="Synthetic timetable coverage" />
    <CatalogNode kind="Tabs" artifactRef={artifactId} title="Journeys">
      <CatalogNode kind="Section" artifactRef={artifactId} title="First leg" tabLabel="{{legRoute}}" routeTextLegIndex={0} />
      <CatalogNode kind="Section" artifactRef={artifactId} title="Second leg" tabLabel="{{legRoute}}" routeTextLegIndex={1} />
    </CatalogNode>
  </TravelProvider>)

  expect(screen.getByRole('heading', { name: 'London → Paris → Barcelona' })).toBeVisible()
  expect(screen.getByText('Trip from London to Barcelona')).toBeVisible()
  expect(screen.getByRole('heading', { name: '2 · Paris → Barcelona' })).toBeVisible()
  expect(screen.getByText('From Paris to Barcelona')).toBeVisible()
  expect(screen.getByRole('tab', { name: 'Paris → Barcelona' })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('Synthetic timetable coverage')

  act(() => {
    state.dispatch({ kind: 'route', artifactId, citySequence: ['london', 'paris', 'amsterdam'] })
    state.dispatch({ kind: 'stays', artifactId, stays: [{ cityId: 'paris', nights: 15 }, { cityId: 'amsterdam', nights: 0 }] })
  })
  expect(screen.getByRole('heading', { name: 'London → Paris → Amsterdam' })).toBeVisible()
  expect(screen.getByText('Trip from London to Amsterdam')).toBeVisible()
  expect(screen.getByRole('heading', { name: '2 · Paris → Amsterdam' })).toBeVisible()
  expect(screen.getByText('From Paris to Amsterdam')).toBeVisible()
  expect(screen.getByRole('tab', { name: 'Paris → Amsterdam' })).toBeVisible()
  expect(screen.queryByText(/Barcelona/)).not.toBeInTheDocument()

  act(() => {
    state.dispatch({ kind: 'route', artifactId, citySequence: ['paris', 'london', 'amsterdam'] })
  })
  expect(screen.getByRole('heading', { name: 'Paris → London → Amsterdam' })).toBeVisible()
  expect(screen.getByRole('heading', { name: '2 · London → Amsterdam' })).toBeVisible()
  expect(screen.getByRole('tab', { name: 'Paris → London' })).toBeVisible()

  act(() => {
    state.dispatch({ kind: 'route', artifactId, citySequence: ['london', 'paris'] })
  })
  expect(screen.getByRole('heading', { name: '2 · Route unavailable' })).toBeVisible()
  expect(screen.getByRole('tab', { name: 'Route unavailable' })).toBeVisible()
  expect(screen.queryByText(/Amsterdam|Barcelona/)).not.toBeInTheDocument()
})

it('resolves against the provider state so a frozen scene keeps its captured route', () => {
  const live = setup(['london', 'paris', 'amsterdam'])
  const frozen = setup(['london', 'paris', 'barcelona'])
  render(<>
    <TravelProvider services={frozen.services}><CatalogNode kind="TravelHero" artifactRef={artifactId} title="{{tripRoute}}" /></TravelProvider>
    <TravelProvider services={live.services}><CatalogNode kind="TravelHero" artifactRef={artifactId} title="{{tripRoute}}" /></TravelProvider>
  </>)
  expect(screen.getByRole('heading', { name: 'London → Paris → Barcelona' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'London → Paris → Amsterdam' })).toBeVisible()
})

it('resolves each tab label from the child artifact and subscribes to that route', () => {
  const { services, state } = setup()
  state.initializeMissing(alternateArtifactId, { citySequence: ['prague', 'vienna'] })
  render(<TravelProvider services={services}>
    <CatalogNode kind="Tabs" artifactRef={artifactId} title="Trips">
      <CatalogNode kind="Section" artifactRef={alternateArtifactId} title="Alternate trip" tabLabel="{{tripRoute}}" />
    </CatalogNode>
  </TravelProvider>)
  expect(screen.getByRole('tab', { name: 'Prague → Vienna' })).toBeVisible()
  act(() => {
    state.dispatch({ kind: 'route', artifactId: alternateArtifactId, citySequence: ['prague', 'berlin'] })
  })
  expect(screen.getByRole('tab', { name: 'Prague → Berlin' })).toBeVisible()
  expect(screen.queryByRole('tab', { name: /London/ })).not.toBeInTheDocument()
})
