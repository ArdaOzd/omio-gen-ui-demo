import { expect, it } from 'vitest'
import type { ArtifactUIState } from '../contracts'
import { normalizeLegacyRouteTextBindings, resolveRouteText } from './route-text'

const state = (citySequence: string[], stays: ArtifactUIState['stays'] = []): Pick<ArtifactUIState, 'citySequence' | 'dates' | 'stays'> => ({
  citySequence,
  dates: { start: '2026-12-08' },
  stays,
})

it('resolves explicit trip and leg route tokens from current canonical state', () => {
  const current = state(['london', 'paris', 'amsterdam'], [{ cityId: 'paris', nights: 15 }, { cityId: 'amsterdam', nights: 0 }])
  expect(resolveRouteText('{{tripRoute}} · {{tripOrigin}} to {{tripDestination}}', current)).toBe('London → Paris → Amsterdam · London to Amsterdam')
  expect(resolveRouteText('{{legNumber}} · {{legRoute}} · {{legFrom}} to {{legTo}}', current, 1)).toBe('2 · Paris → Amsterdam · Paris to Amsterdam')
  expect(resolveRouteText('Start {{startDateLong}}, with {{staySummary}}.', current)).toBe('Start 8 December 2026, with 15 nights in Paris.')
})

it('does not retain stale cities when a bound leg is removed', () => {
  expect(resolveRouteText('{{legNumber}} · {{legRoute}}', state(['london', 'paris']), 1)).toBe('2 · Route unavailable')
})

it('normalizes only exact legacy route slots and keeps editorial prose unchanged', () => {
  const normalized = normalizeLegacyRouteTextBindings({
    $type: 'TravelSurface',
    artifactRef: 'artifact-1',
    children: [{
      $type: 'TravelHero',
      artifactRef: 'artifact-1',
      title: 'London → Paris → Barcelona',
      body: 'Start 8 December 2026, with two nights in Paris and four in Barcelona. All timetables and fares are synthetic demo data.',
    }, {
      $type: 'ResponsiveGrid',
      artifactRef: 'artifact-1',
      children: [{
        $type: 'Section',
        artifactRef: 'artifact-1',
        title: '2 · Paris → Barcelona',
        body: 'Barcelona has a distinctive architecture.',
        children: [{ $type: 'CheapestFastest', artifactRef: 'artifact-1', datasetRef: 'seed-2', legIndex: 1 }],
      }],
    }],
  })
  const children = Array.isArray(normalized.children) ? normalized.children : []
  const hero = children[0]
  const grid = children[1]
  const section = grid && Array.isArray(grid.children) ? grid.children[0] : undefined
  expect(hero).toMatchObject({
    title: '{{tripRoute}}',
    body: 'Start {{startDateLong}}, with {{staySummary}}. All timetables and fares are synthetic demo data.',
  })
  expect(section).toMatchObject({
    title: '{{legNumber}} · {{legRoute}}',
    routeTextLegIndex: 1,
    body: 'Barcelona has a distinctive architecture.',
  })
  const editorial = normalizeLegacyRouteTextBindings({
    $type: 'TravelSurface', artifactRef: 'artifact-1', children: {
      $type: 'TravelHero', artifactRef: 'artifact-1', title: 'London → Paris', body: 'Start slowly, with care.',
    },
  })
  expect(editorial.children).toMatchObject({ body: 'Start slowly, with care.' })
})

it('does not infer a container leg binding from another artifact', () => {
  const normalized = normalizeLegacyRouteTextBindings({
    $type: 'TravelSurface', artifactRef: 'artifact-1', children: {
      $type: 'Section', artifactRef: 'artifact-1', title: '2 · Paris → Barcelona', children: {
        $type: 'CheapestFastest', artifactRef: 'artifact-2', datasetRef: 'seed-2', legIndex: 1,
      },
    },
  })
  expect(normalized.children).toMatchObject({ title: '2 · Paris → Barcelona' })
})
