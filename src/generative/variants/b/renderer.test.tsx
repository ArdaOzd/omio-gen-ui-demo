import { describe,it,expect,vi,afterEach } from 'vitest'
import { render,screen,waitFor,cleanup,act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TravelProvider } from '../../catalog/context'
import { createUIStateStore } from '../../state/ui-state-store'
import { createFareDataBridge } from '../../data/fare-data-bridge'
import { ArtifactIdSchema,FareIdSchema,FareRowSchema } from '../../contracts'
import { createSyntheticRows } from '../../data/synthetic-source'
import { createActionRouter } from '../../state/action-router'
import { ReactiveScene } from './renderer'
const id=ArtifactIdSchema.parse('art')
const source=`root = TravelSurface("art", null, null, null, "Trips", null, [mode])
$filters = {modes: [], carrierIds: [], directOnly: false}
mode = ModeChips("art", null, null, null, "Modes", null, null, $filters, "filters")`
afterEach(cleanup)
function setup(){const state=createUIStateStore({now:()=>'2026-10-02T12:00:00.000Z'});state.initializeMissing(id,{});return {state,bridge:createFareDataBridge(),activeId:()=>id,activate:vi.fn()}}
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
  const bridge=createFareDataBridge({pageSource:async input=>({rows:rows.map(row=>({...row,id:FareIdSchema.parse(`${row.id}:${input.date}`),serviceDate:input.date,availableSeats:input.date==='2026-10-03'?18:9})),total:rows.length,pages:1,page:input.page,sourceVersion:'test-v1'})})
  const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-02'},passengers:1,modes:['bus','train','flight','ferry']},new AbortController().signal)
  services.state.dispatch({kind:'datasets',artifactId:id,datasetRefs:[manifest.datasetId]})
  const queryBase=`version: 1, sources: [{datasetRef: "${manifest.datasetId}", alias: "f"}], groupBy: ["mode"], metrics: [{as: "count", op: "sum", field: "availableSeats"}], limit: 4`
  const program=source.replace('[mode])','[mode, date, comparison, toggle, $show ? note : null])')+`
$show = false
$dates = {start: "2026-10-02"}
date = DateStrip("art", null, null, null, "Generated departure", null, null, $dates, "dates")
toggle = RetryAction("art", null, null, null, "Show query details", null, null, null, null, null, Action([@Set($show, true)]))
note = Callout("art", null, null, null, "Generated calculation retained")
q = Query("local_query", $filters.modes.length > 0 ? {${queryBase}, where: {all: [{field: "mode", op: "in", value: $filters.modes}, {field: "serviceDate", op: "eq", value: $dates.start}]}} : {${queryBase}, where: {field: "serviceDate", op: "eq", value: $dates.start}})
comparison = ModeBreakdown("art", "${manifest.datasetId}", null, null, "Generated grouping", null, null, null, null, q)`
  render(<TravelProvider services={{...services,bridge}}><ReactiveScene artifactRef={id} program={program}/></TravelProvider>)
  await waitFor(()=>expect(screen.getAllByRole('row')).toHaveLength(5))
  await userEvent.click(screen.getByRole('button',{name:'Bus'}));await waitFor(()=>expect(screen.getAllByRole('row')).toHaveLength(2));expect(screen.getByRole('row',{name:/Bus/})).toHaveTextContent('18')
  await userEvent.click(screen.getByRole('button',{name:'Show query details'}));await screen.findByText('Generated calculation retained');await waitFor(()=>expect(screen.getByRole('row',{name:/Bus/})).toHaveTextContent('18'))
  services.state.dispatch({kind:'dates',artifactId:id,dates:{start:'2026-10-03'}})
  await screen.findByText('Loading mode counts…');expect(screen.queryByRole('table')).toBeNull()
  const fresh=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-03',to:'2026-10-03'},passengers:1,modes:['bus','train','flight','ferry']},new AbortController().signal)
  services.state.dispatch({kind:'datasets',artifactId:id,datasetRefs:[manifest.datasetId,fresh.datasetId]})
  await waitFor(()=>expect(screen.getByRole('row',{name:/Bus/})).toHaveTextContent('36'))
 })
})

it('keeps an authored fare selection in host state and retains the focused native selector',async()=>{
 const services=setup(),rows=createSyntheticRows(2).map(row=>({...row,serviceDate:'2026-10-02'}))
 const bridge=createFareDataBridge({pageSource:async()=>({rows,total:rows.length,pages:1,page:1,sourceVersion:'selection-proof'})})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-02'},passengers:1,modes:['bus','train','flight','ferry']},new AbortController().signal)
 services.state.dispatch({kind:'datasets',artifactId:id,datasetRefs:[manifest.datasetId]})
 const program=`$selectedFareIds = []
q = Query("local_query", {version:1,sources:[{datasetRef:"${manifest.datasetId}",alias:"f"}],project:${JSON.stringify(FareRowSchema.keyof().options)},limit:100})
picker = FarePicker("art", "${manifest.datasetId}", null, null, "Choose fare", null, null, $selectedFareIds, "selectedFareIds", q)
root = TravelSurface("art", null, null, null, "Trip", null, [picker])`
 render(<TravelProvider services={{...services,bridge}}><ReactiveScene artifactRef={id} program={program}/></TravelProvider>)
 await waitFor(()=>expect(screen.getAllByRole('option')).toHaveLength(3))
 const picker=screen.getByRole('combobox',{name:'Choose a synthetic fare'})
 picker.focus();await userEvent.selectOptions(picker,rows[0]!.id)
 await waitFor(()=>expect(services.state.get(id).selectedFareIds).toEqual([rows[0]!.id]))
 expect(picker).toBeInTheDocument();expect(picker).toHaveFocus();expect(picker).toHaveValue(rows[0]!.id)
})

async function wideQueryFixture(){
 const services=setup()
 const bridge=createFareDataBridge({pageSource:async input=>({rows:createSyntheticRows(2).map(row=>({...row,id:FareIdSchema.parse(`${row.id}:${input.date}`),serviceDate:input.date})),total:2,pages:1,page:1,sourceVersion:'wide-query-proof'})})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-03'},passengers:1,modes:['bus','train','flight','ferry']},new AbortController().signal)
 services.state.dispatch({kind:'datasets',artifactId:id,datasetRefs:[manifest.datasetId]})
 const dispatch=createActionRouter(services.state,{bridge})
 const program=`$selectedFareIds = []
$filters = {modes: [], carrierIds: [], directOnly: false}
mode = ModeChips("art", null, null, null, "Modes", null, null, $filters, "filters")
q = Query("local_query", $filters.modes.length > 0 ? {version:1,sources:[{datasetRef:"${manifest.datasetId}",alias:"f"}],where:{field:"mode",op:"in",value:$filters.modes},project:${JSON.stringify(FareRowSchema.keyof().options)},limit:100} : {version:1,sources:[{datasetRef:"${manifest.datasetId}",alias:"f"}],project:${JSON.stringify(FareRowSchema.keyof().options)},limit:100})
picker = FarePicker("art", "${manifest.datasetId}", null, null, "Choose fare", null, null, $selectedFareIds, "selectedFareIds", q)
root = TravelSurface("art", null, null, null, "Trip", null, [mode, picker])`
 return {services:{...services,bridge,dispatch,whenIdle:dispatch.whenIdle},program,later:FareIdSchema.parse('synthetic-000000001:2026-10-03')}
}
it('aligns an authored wide-query choice to its fare date while retaining the actual native picker and focus',async()=>{
 const {services,program,later}=await wideQueryFixture()
 render(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={program}/></TravelProvider>)
 await waitFor(()=>expect(screen.getAllByRole('option')).toHaveLength(5))
 const picker=screen.getByRole('combobox',{name:'Choose a synthetic fare'});picker.focus()
 await userEvent.selectOptions(picker,later);await act(()=>services.whenIdle(id))
 expect(services.state.exportSnapshot(id)).toMatchObject({dates:{start:'2026-10-03'},selectedFareIds:[later]})
 expect(screen.getByRole('combobox',{name:'Choose a synthetic fare'})).toBe(picker);expect(picker).toHaveFocus();expect(picker).toHaveValue(later)
 services.dispatch.dispose()
})
it('rejects a deferred older authored query after a filter change and preserves the new selection',async()=>{
 const {services,program,later}=await wideQueryFixture(),query=services.bridge.query
 const pending:Array<()=>void>=[]
 vi.spyOn(services.bridge,'query').mockImplementation(async(input,signal)=>{
  const result=await query(input,signal)
  if(!input.where)await new Promise<void>(resolve=>pending.push(resolve))
  return result
 })
 render(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={program}/></TravelProvider>)
 await waitFor(()=>expect(pending.length).toBeGreaterThan(0))
 await userEvent.click(screen.getByRole('button',{name:'Bus'}))
 await waitFor(()=>expect(screen.getAllByRole('option')).toHaveLength(3))
 const picker=screen.getByRole('combobox',{name:'Choose a synthetic fare'});picker.focus();await userEvent.selectOptions(picker,later)
 await act(()=>services.whenIdle(id));await act(async()=>{pending.forEach(resolve=>resolve());await Promise.resolve()})
 expect(services.state.exportSnapshot(id)).toMatchObject({dates:{start:'2026-10-03'},filters:{modes:['bus']},selectedFareIds:[later]})
 expect(screen.getAllByRole('option')).toHaveLength(3);expect(picker).toHaveFocus();expect(picker).toHaveValue(later)
 services.dispatch.dispose()
})

it('exposes an authored query/view shape mismatch as a bounded repairable error',async()=>{
 const {services,program}=await wideQueryFixture()
 const incompatible=program.replaceAll(JSON.stringify(FareRowSchema.keyof().options),'["mode"]')
 render(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={incompatible}/></TravelProvider>)
 await screen.findByRole('alert')
 expect(screen.getByRole('alert')).toHaveTextContent('These options could not load. Try refreshing the view.')
 expect(screen.queryByText(/No options match/)).toBeNull();expect(services.state.get(id).selectedFareIds).toEqual([])
 services.dispatch.dispose()
})


it('waits for uncovered-date coverage and then renders the current authored grouping',async()=>{
 const services=setup()
 const bridge=createFareDataBridge({pageSource:async input=>({rows:createSyntheticRows(8).map(row=>({...row,id:FareIdSchema.parse(`${row.id}:${input.date}`),serviceDate:input.date,availableSeats:input.date==='2026-10-03'?18:9})),total:8,pages:1,page:input.page,sourceVersion:'coverage-query-proof'})})
 const load=(date:string)=>bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:date,to:date},passengers:1,modes:['bus','train','flight','ferry']},new AbortController().signal)
 const first=await load('2026-10-02');services.state.dispatch({kind:'datasets',artifactId:id,datasetRefs:[first.datasetId]})
 const program=`$filters = {modes: [], carrierIds: [], directOnly: false}
$dates = {start: "2026-10-02"}
mode = ModeChips("art", null, null, null, "Modes", null, null, $filters, "filters")
date = DateStrip("art", null, null, null, "Departure", null, null, $dates, "dates")
q = Query("local_query", {version:1,sources:[{datasetRef:"${first.datasetId}",alias:"f"}],where:{all:[{field:"mode",op:"in",value:$filters.modes},{field:"serviceDate",op:"eq",value:$dates.start}]},groupBy:["mode"],metrics:[{as:"count",op:"sum",field:"availableSeats"}],limit:4})
comparison = ModeBreakdown("art", "${first.datasetId}", null, null, "Grouping", null, null, null, null, q)
root = TravelSurface("art", null, null, null, "Trips", null, [mode, date, comparison])`
 render(<TravelProvider services={{...services,bridge}}><ReactiveScene artifactRef={id} program={program}/></TravelProvider>)
 await userEvent.click(screen.getByRole('button',{name:'Bus'}));await waitFor(()=>expect(screen.getByRole('row',{name:/Bus/})).toHaveTextContent('18'))
 act(()=>{services.state.dispatch({kind:'dates',artifactId:id,dates:{start:'2026-10-03'}})})
 await screen.findByText('Loading mode counts…');expect(screen.queryByRole('table')).toBeNull()
 const fresh=await load('2026-10-03')
 act(()=>{services.state.dispatch({kind:'datasets',artifactId:id,datasetRefs:[first.datasetId,fresh.datasetId]})})
 await waitFor(()=>expect(screen.getByRole('row',{name:/Bus/})).toHaveTextContent('36'))
 expect(services.state.get(id).filters.modes).toEqual(['bus']);expect(screen.queryByRole('alert')).toBeNull()
})


it('retains an authored hidden primitive after selecting a fare from persisted state',async()=>{
 const {services,program,later}=await wideQueryFixture()
 services.state.dispatch({kind:'runtimeVariables',artifactId:id,runtimeVariables:{$showTimeline:true}})
 const withToggle=program.replace('[mode, picker])','[mode, picker, hide, $showTimeline ? timeline : null])')+`
$showTimeline = false
hide = RetryAction("art", null, null, null, "Hide timeline", null, null, null, null, null, Action([@Set($showTimeline, false)]))
timeline = Callout("art", null, null, null, "Authored timeline")`
 render(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={withToggle}/></TravelProvider>)
 await screen.findByText('Authored timeline');await waitFor(()=>expect(screen.getAllByRole('option')).toHaveLength(5))
 await userEvent.click(screen.getByRole('button',{name:'Hide timeline'}))
 await waitFor(()=>expect(screen.queryByText('Authored timeline')).toBeNull());expect(services.state.get(id).runtimeVariables.$showTimeline).toBe(false)
 const picker=screen.getByRole('combobox',{name:'Choose a synthetic fare'});picker.focus();await userEvent.selectOptions(picker,later);await act(()=>services.whenIdle(id))
 expect(services.state.get(id).runtimeVariables.$showTimeline).toBe(false);expect(screen.queryByText('Authored timeline')).toBeNull();expect(picker).toHaveFocus()
 services.dispatch.dispose()
})

it('commits a genuine ordered mutation and hidden primitive before subsequent fare selection',async()=>{
 const {services,program,later}=await wideQueryFixture()
 services.state.dispatch({kind:'runtimeVariables',artifactId:id,runtimeVariables:{$showTimeline:true}})
 const withToggle=program.replace('[mode, picker])','[mode, picker, hide, $showTimeline ? timeline : null])')+`
$showTimeline = false
hide = RetryAction("art", null, null, null, "Hide timeline", null, null, null, null, null, Action([@Run(hideMutation), @Set($showTimeline, false)]))
hideMutation = Mutation("patch_artifact_state", {kind:"runtimeVariables",runtimeVariables:{"$showTimeline":false}})
timeline = Callout("art", null, null, null, "Authored timeline")`
 render(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={withToggle}/></TravelProvider>)
 await screen.findByText('Authored timeline');await waitFor(()=>expect(screen.getAllByRole('option')).toHaveLength(5))
 await userEvent.click(screen.getByRole('button',{name:'Hide timeline'}))
 await waitFor(()=>expect(screen.queryByText('Authored timeline')).toBeNull());expect(services.state.get(id).runtimeVariables.$showTimeline).toBe(false)
 const picker=screen.getByRole('combobox',{name:'Choose a synthetic fare'});picker.focus();await userEvent.selectOptions(picker,later);await act(()=>services.whenIdle(id))
 expect(services.state.get(id).runtimeVariables.$showTimeline).toBe(false);expect(screen.queryByText('Authored timeline')).toBeNull();expect(picker).toHaveFocus()
 services.dispatch.dispose()
})


it('bounds a computed invalid Set at the native state callback and keeps the last saved view',async()=>{
 const services=setup();services.state.dispatch({kind:'runtimeVariables',artifactId:id,runtimeVariables:{$note:'Saved value',$left:'x'.repeat(80),$right:'y'.repeat(81)}})
 const program=`$note = "Saved value"
$left = "${'x'.repeat(80)}"
$right = "${'y'.repeat(81)}"
change = RetryAction("art",null,null,null,"Expand note",null,null,null,null,null,Action([@Set($note,$left + $right)]))
note = Callout("art",null,null,null,$note)
root = TravelSurface("art",null,null,null,"Trip",null,[change,note])`
 const before=services.state.exportSnapshot(id)
 render(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={program}/></TravelProvider>)
 await userEvent.click(screen.getByRole('button',{name:'Expand note'}))
 expect(await screen.findByRole('alert')).toHaveTextContent('saved-state limits')
 expect(services.state.exportSnapshot(id)).toEqual(before);expect(screen.getByText('Saved value')).toBeVisible();expect(screen.queryByText('x'.repeat(80)+'y'.repeat(81))).toBeNull()
})
