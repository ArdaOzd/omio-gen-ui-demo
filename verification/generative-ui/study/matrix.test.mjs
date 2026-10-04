import{test}from'node:test'
import assert from'node:assert/strict'
import{buildMatrix,summarize,withheld,canResume,assertFixture,assertRuntime}from'./matrix.mjs'
const scenarios=Array.from({length:12},(_,index)=>({id:`family-${index}`}))
test('full plan matrix contains 96 unique cells in balanced paired orders',()=>{const cells=buildMatrix(scenarios);assert.equal(cells.length,96);assert.equal(new Set(cells.map(cell=>cell.id)).size,96);for(let index=0;index<cells.length;index+=2){assert.equal(cells[index].scenario,cells[index+1].scenario);assert.notEqual(cells[index].variant,cells[index+1].variant);assert.deepEqual(cells[index].order,cells[index+1].order)}assert.equal(cells.filter(cell=>cell.position===0&&cell.variant==='a').length,24);assert.equal(cells.filter(cell=>cell.position===0&&cell.variant==='b').length,24);assert.equal(withheld.length,12)})
test('selected cases retain cold/warm and both wordings, and failures are summarized honestly',()=>{assert.equal(buildMatrix(scenarios,{selected:['family-3']}).length,8);assert.deepEqual(summarize([{variant:'a',outcome:'pass'},{variant:'b',outcome:'fail'}]),{cells:2,excludedFromComparison:0,passing:1,failing:1,byVariant:{a:{cells:1,passing:1},b:{cells:1,passing:0}},humanRatings:null})})

test('resume preserves completed failures and rejects another corpus or app revision',()=>{const cell=buildMatrix(scenarios)[0];const fixture={sourceVersion:'fixture-generation',rowCount:10000000};const report={...cell,fixture,fixtureValid:true,runtime,runtimeValid:true,appRevision:'frozen-sha',model:'gpt-6.1-sol',reasoning:'high',provider:'signed-in-codex',liveModelAuthorship:true,outcome:'fail'};assert.equal(canResume(report,cell,runtime,fixture),true);assert.equal(canResume(report,cell,{...runtime,appRevision:'new-sha'},fixture),false);assert.equal(canResume({...report,variant:'b'},cell,runtime,fixture),false);assert.equal(canResume({...report,liveModelAuthorship:false},cell,runtime,fixture),true);assert.equal(canResume({...report,outcome:'running'},cell,runtime,fixture),false);assert.equal(canResume(report,cell,runtime,{...fixture,sourceVersion:'changed-generation'}),false);assert.equal(canResume({...report,fixtureValid:false},cell,runtime,fixture),false)})

test('fixture gate accepts only the frozen source generation and real row count',()=>{const fixture={sourceVersion:'fixture-generation',rowCount:10000000};assert.doesNotThrow(()=>assertFixture({...fixture},fixture));assert.throws(()=>assertFixture({...fixture,sourceVersion:'new-generation'},fixture),/identity changed/);assert.throws(()=>assertFixture({...fixture,rowCount:1000000},fixture),/identity changed/);assert.throws(()=>assertFixture({sourceVersion:null,rowCount:10000000},fixture),/could not be verified/)})

const runtime={appRevision:'frozen-sha',provider:'signed-in-codex',model:'gpt-6.1-sol',reasoningEffort:'high'}
test('runtime gate rejects a different served app or provider configuration before calls',()=>{
 const health={status:'ok',service:'omio-generative-agent',...runtime}
 assert.deepEqual(assertRuntime(health,runtime),runtime)
 for(const key of Object.keys(runtime))assert.throws(()=>assertRuntime({...health,[key]:'changed'},runtime),/Runtime identity changed/)
 assert.throws(()=>assertRuntime({...health,reasoningEffort:undefined},runtime),/could not be verified/)
 assert.throws(()=>assertRuntime({...health,service:'different-service'},runtime),/could not be verified/)
 assert.throws(()=>assertRuntime({...health,status:'unavailable'},runtime),/could not be verified/)
})
test('resume excludes samples without matching verified runtime identity',()=>{
 const cell=buildMatrix(scenarios)[0],fixture={sourceVersion:'fixture-generation',rowCount:10000000}
 const report={...cell,fixture,fixtureValid:true,appRevision:runtime.appRevision,runtime,runtimeValid:true,model:runtime.model,reasoning:runtime.reasoningEffort,provider:runtime.provider,liveModelAuthorship:true,outcome:'fail'}
 assert.equal(canResume(report,cell,runtime,fixture),true)
 assert.equal(canResume({...report,runtime:undefined},cell,runtime,fixture),false)
 assert.equal(canResume({...report,runtimeValid:false},cell,runtime,fixture),false)
 assert.equal(canResume({...report,excludedFromComparison:true},cell,runtime,fixture),false)
 assert.equal(canResume(report,cell,{...runtime,reasoningEffort:'low'},fixture),false)
})

test('a resumed cell must link the same immutable run environment',()=>{const cell=buildMatrix(scenarios)[0],fixture={sourceVersion:'fixture',rowCount:10000000},report={...cell,runtime,appRevision:runtime.appRevision,runtimeValid:true,fixture,model:runtime.model,reasoning:runtime.reasoningEffort,provider:runtime.provider,liveModelAuthorship:true,outcome:'pass',runEnvironment:{id:'environment-one'}};assert.equal(canResume(report,cell,runtime,fixture,'environment-one'),true);assert.equal(canResume(report,cell,runtime,fixture,'environment-two'),false);assert.equal(canResume({...report,runEnvironment:undefined},cell,runtime,fixture,'environment-one'),false)});
