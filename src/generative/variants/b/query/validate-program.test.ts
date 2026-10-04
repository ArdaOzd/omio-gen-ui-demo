import { describe,it,expect } from 'vitest'
import { createSyntheticRows } from '../../../data/synthetic-source'
import { validateReactiveProgram } from './validate-program'
const source=`root = TravelSurface("art", null, null, null, "Trips", null, [mode])
$filters = {modes: [], carrierIds: [], directOnly: false}
mode = ModeChips("art", null, null, null, "Modes", null, null, $filters, "filters")
q = Query("local_query", {version: 1, sources: [{datasetRef: "d", alias: "f"}], limit: 5})`
describe('B program boundary',()=>{
 it('accepts registered components and discovers host-authoritative bindings',()=>expect(validateReactiveProgram(source).bindings).toEqual([{variable:'$filters',field:'filters',artifactRef:'art'}]))
 it.each([source+'\nignored()',source.replace('ModeChips','Unknown'),source.replace('local_query','remote_url'),source.replace('limit: 5','rows: [{priceCents: 1}]'),source+'\n$hidden = {rows: [1]}'])('rejects executable, unknown and bulk channels',program=>expect(()=>validateReactiveProgram(program)).toThrow())
 it('preflights heading limits while allowing bounded Callout explanatory copy',()=>{
  const long='x'.repeat(161)
  expect(()=>validateReactiveProgram(`root = TravelSurface("art", null, null, null, ${JSON.stringify(long)})`)).toThrow('COMPONENT_TITLE_LENGTH')
  expect(()=>validateReactiveProgram(`root = TravelSurface("art", null, null, null, "Trips", null, [note])\nnote = Callout("art", null, null, null, ${JSON.stringify(long)})`)).not.toThrow()
  expect(()=>validateReactiveProgram(`root = Callout("art", null, null, null, ${JSON.stringify('x'.repeat(601))})`)).toThrow()
 })
 it('exposes partial frames but rejects incomplete final output',()=>{expect(()=>validateReactiveProgram('root = TravelSurface("art", null, null, null, "Trips", null, [',{complete:false})).not.toThrow();expect(()=>validateReactiveProgram('root = TravelSurface("art", null, null, null, "Trips", null, [')).toThrow()})
})

it('rejects copied complete fare literals outside state declarations',()=>{
 const row=createSyntheticRows(1)[0],literal=JSON.stringify(row).replace(/"([A-Za-z][A-Za-z0-9]*)":/g,'$1:')
 expect(()=>validateReactiveProgram(`copiedFare = ${literal}\nroot = TravelSurface("art")`)).toThrow()
})


it('rejects literal Set values that cannot enter the declared host field',()=>{
 const primitive=(value:string)=>`$note = "Saved value"\nchange = RetryAction("art",null,null,null,"Change",null,null,null,null,null,Action([@Set($note,${value})]))\nroot = TravelSurface("art",null,null,null,"Trip",null,[change])`
 expect(()=>validateReactiveProgram(primitive(JSON.stringify('x'.repeat(160))))).not.toThrow()
 expect(()=>validateReactiveProgram(primitive(JSON.stringify('x'.repeat(161))))).toThrow('VARIABLE_ASSIGNMENT_TYPE')
 expect(()=>validateReactiveProgram(primitive('[1,2]'))).toThrow('VARIABLE_ASSIGNMENT_TYPE')
 expect(()=>validateReactiveProgram(source+'\nchange = RetryAction("art",null,null,null,"Change",null,null,null,null,null,Action([@Set($filters,"bus")]))')).toThrow('VARIABLE_ASSIGNMENT_TYPE')
})
