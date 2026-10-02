import { describe,it,expect,vi,afterEach } from 'vitest'
import { render,screen,waitFor,cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TravelProvider } from '../../catalog/context'
import { createUIStateStore } from '../../state/ui-state-store'
import { createFareDataBridge } from '../../data/fare-data-bridge'
import { ArtifactIdSchema } from '../../contracts'
import { createSyntheticRows } from '../../data/synthetic-source'
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
 it('captures @Set and @Reset primitive variables independently for two artifacts',async()=>{
  const services=setup(),other=ArtifactIdSchema.parse('other');services.state.initializeMissing(other,{})
  const program=source+`
$show = false
toggle = RetryAction("art", null, null, null, "Show details", null, null, null, null, null, Action([@Set($show, true)]))
reset = RetryAction("art", null, null, null, "Reset details", null, null, null, null, null, Action([@Reset($show)]))
note = Callout("art", null, null, null, "Details visible")`
  const withActions=program.replace('[mode])','[mode, toggle, reset, $show ? note : null])')
  render(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={withActions}/><ReactiveScene artifactRef={other} program={source.replaceAll('"art"','"other"')}/></TravelProvider>)
  await userEvent.click(screen.getByRole('button',{name:'Show details'}));await screen.findByText('Details visible')
  expect(services.state.exportSnapshot(id).runtimeVariables.$show).toBe(true);expect(services.state.exportSnapshot(other).runtimeVariables).toEqual({})
  await userEvent.click(screen.getByRole('button',{name:'Reset details'}));await waitFor(()=>expect(screen.queryByText('Details visible')).toBeNull());expect(services.state.exportSnapshot(id).runtimeVariables.$show).toBe(false)
 })
 it('recomputes a model-authored grouped query from shared mode edits',async()=>{
  const services=setup();const rows=createSyntheticRows(8).map(row=>({...row,serviceDate:'2026-10-02'}))
  const bridge=createFareDataBridge({pageSource:async input=>({rows,total:rows.length,pages:1,page:input.page,sourceVersion:'test-v1'})})
  const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-02'},passengers:1,modes:['bus','train','flight','ferry']},new AbortController().signal)
  services.state.dispatch({kind:'datasets',artifactId:id,datasetRefs:[manifest.datasetId]})
  const queryBase=`version: 1, sources: [{datasetRef: "${manifest.datasetId}", alias: "f"}], groupBy: ["mode"], metrics: [{as: "count", op: "sum", field: "availableSeats"}], limit: 4`
  const program=source.replace('[mode])','[mode, comparison])')+`
q = Query("local_query", $filters.modes.length > 0 ? {${queryBase}, where: {field: "mode", op: "in", value: $filters.modes}} : {${queryBase}})
comparison = ModeBreakdown("art", "${manifest.datasetId}", null, null, "Generated grouping", null, null, null, null, q)`
  render(<TravelProvider services={{...services,bridge}}><ReactiveScene artifactRef={id} program={program}/></TravelProvider>)
  await waitFor(()=>expect(screen.getAllByRole('row')).toHaveLength(5))
  await userEvent.click(screen.getByRole('button',{name:'Bus'}));await waitFor(()=>expect(screen.getAllByRole('row')).toHaveLength(2));expect(screen.getByRole('row',{name:/Bus/})).toHaveTextContent('18')
 })
})
