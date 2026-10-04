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


it.each(['Select a fare','select a fare','sElEcT a fare'])('accepts ordinary heading and explanatory copy: %s',title=>{
 const program=`note = Callout("art",null,null,null,"How to choose",null,null,null,null,null,null,${JSON.stringify('Compare options, then '+title+'.')})
root = TravelSurface("art",null,null,null,${JSON.stringify(title)},null,[note])`
 expect(()=>validateReactiveProgram(program)).not.toThrow()
})
it.each(['https://example.com','javascript:alert(1)','x'.repeat(601)])('retains prohibited text and size boundaries',text=>{
 expect(()=>validateReactiveProgram(`note = Callout("art",null,null,null,"Note",null,null,null,null,null,null,${JSON.stringify(text)})\nroot = TravelSurface("art",null,null,null,"Trips",null,[note])`)).toThrow('FORBIDDEN_TEXT')
})
it('rejects SQL through query argument and tool boundaries',async()=>{
 const {evaluateQueryArguments}=await import('./program-query')
 const {createUIStateStore}=await import('../../../state/ui-state-store')
 const {ArtifactIdSchema}=await import('../../../contracts')
 const store=createUIStateStore(),id=ArtifactIdSchema.parse('art');store.initializeMissing(id,{})
 for(const query of ['Query("local_query", "SELECT * FROM fares")','Query("local_query", {version:1,sources:[{datasetRef:"d",alias:"f"}],sql:"SELECT * FROM fares",limit:5})','Query("remote_sql", {version:1,sources:[{datasetRef:"d",alias:"f"}],limit:5})']){
  expect(()=>{const program=validateReactiveProgram(`q = ${query}\nroot = TravelSurface("art")`);evaluateQueryArguments(program,'q',store.get(id),{})}).toThrow()
 }
})
