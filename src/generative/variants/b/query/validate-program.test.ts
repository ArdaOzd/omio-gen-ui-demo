import { describe,it,expect } from 'vitest'
import { validateReactiveProgram } from './validate-program'
const source=`root = TravelSurface("art", null, null, null, "Trips", null, [mode])
$filters = {modes: [], carrierIds: [], directOnly: false}
mode = ModeChips("art", null, null, null, "Modes", null, null, $filters, "filters")
q = Query("local_query", {version: 1, sources: [{datasetRef: "d", alias: "f"}], limit: 5})`
describe('B program boundary',()=>{
 it('accepts registered components and discovers host-authoritative bindings',()=>expect(validateReactiveProgram(source).bindings).toEqual([{variable:'$filters',field:'filters',artifactRef:'art'}]))
 it.each([source+'\nignored()',source.replace('ModeChips','Unknown'),source.replace('local_query','remote_url'),source.replace('limit: 5','rows: [{priceCents: 1}]'),source+'\n$hidden = {rows: [1]}'])('rejects executable, unknown and bulk channels',program=>expect(()=>validateReactiveProgram(program)).toThrow())
 it('exposes partial frames but rejects incomplete final output',()=>{expect(()=>validateReactiveProgram('root = TravelSurface("art", null, null, null, "Trips", null, [',{complete:false})).not.toThrow();expect(()=>validateReactiveProgram('root = TravelSurface("art", null, null, null, "Trips", null, [')).toThrow()})
})
