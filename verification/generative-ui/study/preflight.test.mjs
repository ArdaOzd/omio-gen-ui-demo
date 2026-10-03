import{test}from'node:test'
import assert from'node:assert/strict'
import{runMatrix}from'./run-matrix.mjs'

test('runner preflight verifies real health identity without opening browsers or calling models',async()=>{
 const runtime={appRevision:'frozen-sha',provider:'signed-in-codex',model:'gpt-6.1-sol',reasoningEffort:'high'},fixture={sourceVersion:'fixture-generation',rowCount:10000000}
 const previousFetch=globalThis.fetch,previousLog=console.log,previousArgv=process.argv,keys=['OMIO_APP_REVISION','OMIO_SOURCE_VERSION','OMIO_FIXTURE_ROWS','OMIO_SCENARIOS'],previousEnv=Object.fromEntries(keys.map(key=>[key,process.env[key]])),requested=[]
 let health={status:'ok',service:'omio-generative-agent',...runtime}
 Object.assign(process.env,{OMIO_APP_REVISION:runtime.appRevision,OMIO_SOURCE_VERSION:fixture.sourceVersion,OMIO_FIXTURE_ROWS:String(fixture.rowCount),OMIO_SCENARIOS:'all'});process.argv=[...process.argv,'--preflight'];console.log=()=>{}
 globalThis.fetch=async url=>{requested.push(String(url));if(String(url).endsWith('/api/health'))return Response.json({source_version:fixture.sourceVersion,fare_count:fixture.rowCount});if(String(url).endsWith('/api/agent/health'))return Response.json(health);throw new Error('Unexpected non-health request')}
 try{
  assert.deepEqual(await runMatrix([{id:'cheap-fast'}]),{runtime,fixture,cells:8,modelCalls:0})
  health={...health,appRevision:'different-running-app'}
  await assert.rejects(()=>runMatrix([{id:'cheap-fast'}]),/Runtime identity changed/)
  health={...health,appRevision:runtime.appRevision,reasoningEffort:undefined}
  await assert.rejects(()=>runMatrix([{id:'cheap-fast'}]),/could not be verified/)
  assert.equal(requested.length,6);assert.ok(requested.every(url=>url.endsWith('/api/health')||url.endsWith('/api/agent/health')))
 }finally{globalThis.fetch=previousFetch;console.log=previousLog;process.argv=previousArgv;for(const key of keys){if(previousEnv[key]===undefined)delete process.env[key];else process.env[key]=previousEnv[key]}}
})
