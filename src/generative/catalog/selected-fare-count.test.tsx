import { describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { ArtifactIdSchema, FareIdSchema } from '../contracts'
import { createUIStateStore } from '../state/ui-state-store'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { TravelProvider } from './context'
import { CatalogNode } from './component'
import { validatePresentTree } from '../variants/a/tree'
const artifactId = ArtifactIdSchema.parse('count-artifact')
const otherId = ArtifactIdSchema.parse('other-artifact')
describe('selected fare count catalog extension', () => {
 it('updates from current artifact selections without queries or copied facts', () => {
  const state = createUIStateStore()
  state.initializeMissing(artifactId, {})
  state.initializeMissing(otherId, {selectedFareIds: [FareIdSchema.parse('unrelated')]})
  const bridge = createFareDataBridge()
  const query = vi.spyOn(bridge, 'query')
  const lookup = vi.spyOn(bridge, 'lookupFare')
  const services = {state, bridge, activeId: () => artifactId, activate: () => {}}
  validatePresentTree({$type: 'TravelSurface', artifactRef: artifactId, children: [{$type: 'SelectedFareCount', artifactRef: artifactId}]})
  render(<TravelProvider services={services}><CatalogNode kind="SelectedFareCount" artifactRef={artifactId}/></TravelProvider>)
  expect(screen.getByRole('status', {name: 'Selected fares'})).toHaveTextContent('0 selected fares')
  act(() => { state.dispatch({kind: 'select', artifactId, fareId: FareIdSchema.parse('fare-1'), selected: true}) })
  expect(screen.getByRole('status', {name: 'Selected fares'})).toHaveTextContent('1 selected fare')
  act(() => { state.dispatch({kind: 'select', artifactId, fareId: FareIdSchema.parse('fare-2'), selected: true}) })
  expect(screen.getByRole('status', {name: 'Selected fares'})).toHaveTextContent('2 selected fares')
  act(() => { state.dispatch({kind: 'select', artifactId, fareId: FareIdSchema.parse('fare-1'), selected: false}) })
  expect(screen.getByRole('status', {name: 'Selected fares'})).toHaveTextContent('1 selected fare')
  expect(state.get(otherId).selectedFareIds).toEqual(['unrelated'])
  expect(query).not.toHaveBeenCalled()
  expect(lookup).not.toHaveBeenCalled()
  cleanup()
 })
 it('rejects model-supplied counts, rows and unresolved A references', () => {
  const node = {$type: 'SelectedFareCount', artifactRef: artifactId}
  for (const extra of [{count: 99}, {rows: [{id: 'fare-1', priceCents: 100}]}]) expect(() => validatePresentTree({$type: 'TravelSurface', artifactRef: artifactId, children: [{...node, ...extra}]})).toThrow()
  expect(() => validatePresentTree({$type: 'TravelSurface', artifactRef: artifactId, children: [node]}, {artifactIds: new Set(), datasetIds: new Set()})).toThrow()
 })
 it('reports an unknown host artifact', () => {
  const state = createUIStateStore()
  state.initializeMissing(otherId, {})
  render(<TravelProvider services={{state, bridge: createFareDataBridge(), activeId: () => otherId, activate: () => {}}}><CatalogNode kind="SelectedFareCount" artifactRef={artifactId}/></TravelProvider>)
  expect(screen.getByRole('status')).toHaveTextContent('not available')
 })
})
