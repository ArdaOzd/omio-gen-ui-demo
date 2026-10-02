import { describe,it,expect,vi,afterEach } from 'vitest'
import { render,screen,waitFor,cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TravelProvider } from '../../catalog/context'
import { createUIStateStore } from '../../state/ui-state-store'
import { createFareDataBridge } from '../../data/fare-data-bridge'
import { ArtifactIdSchema } from '../../contracts'
import { ReactiveScene } from './renderer'
const id=ArtifactIdSchema.parse('art')
const source=`root = TravelSurface("art", null, null, null, "Trips", null, [mode])
$filters = {modes: [], carrierIds: [], directOnly: false}
mode = ModeChips("art", null, null, null, "Modes", null, null, $filters, "filters")`
afterEach(cleanup)
function setup(){const state=createUIStateStore();state.initializeMissing(id,{});return {state,bridge:createFareDataBridge(),activeId:()=>id,activate:vi.fn()}}
describe('B shared-control runtime',()=>{
 it('captures click during stream and preserves it across later defaults',async()=>{
  const services=setup();const view=render(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={source} isStreaming/></TravelProvider>)
  await userEvent.click(screen.getByRole('button',{name:'Bus'}));expect(services.state.exportSnapshot(id).filters.modes).toEqual(['bus'])
  view.rerender(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={source.replace('modes: []','modes: ["train"]')}/></TravelProvider>)
  await waitFor(()=>expect(screen.getByRole('button',{name:'Bus'})).toHaveAttribute('aria-pressed','true'));expect(services.state.get(id).filters.modes).toEqual(['bus'])
 })
 it('retains last usable frame after invalid final output',async()=>{
  const services=setup();const view=render(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={source}/></TravelProvider>)
  view.rerender(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={source+'\nunsafe()'}/></TravelProvider>)
  expect(screen.getByRole('alert')).toBeVisible();await userEvent.click(screen.getByRole('button',{name:'Bus'}));expect(services.state.get(id).filters.modes).toEqual(['bus'])
 })
})
