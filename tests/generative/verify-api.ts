import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { createFareDataBridge } from '../../src/generative/data/fare-data-bridge'
import { createSearchPageSource } from '../../src/generative/data/search-client'
const port=18523
const database=process.env.OMIO_DATABASE??resolve('data/omio.sqlite3')
const server=spawn('python3',['-m','backend.app','--database',database,'--port',String(port)],{stdio:['ignore','pipe','pipe']})
try{
 let healthy=false
 for(let attempt=0;attempt<30;attempt++){try{const response=await fetch(`http://127.0.0.1:${port}/api/health`);if(response.ok){healthy=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,100))}
 assert.equal(healthy,true,'Owned Python API did not become ready')
 const bridge=createFareDataBridge({pageSource:createSearchPageSource({baseUrl:`http://127.0.0.1:${port}`})})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-08'},modes:['train','bus','flight'],passengers:2},new AbortController().signal)
 assert.equal(manifest.coverage.complete,true);assert.equal(manifest.coverage.truncated,false);assert.ok(manifest.rowCount>7)
 const cheapest=await bridge.query({version:1,sources:[{datasetRef:manifest.datasetId,alias:'fares'}],project:['id','priceCents','mode'],orderBy:[{field:'priceCents',direction:'asc'}],limit:5},new AbortController().signal)
 assert.equal(cheapest.rows.length,5);assert.ok(cheapest.rows.every(row=>typeof row.priceCents==='number'))
 const prices=cheapest.rows.map(row=>row.priceCents);assert.deepEqual(prices,[...prices].sort((left,right)=>Number(left)-Number(right)))
 const grouped=await bridge.query({version:1,sources:[{datasetRef:manifest.datasetId,alias:'fares'}],groupBy:['mode'],metrics:[{as:'offers',op:'count'}],limit:4},new AbortController().signal)
 assert.equal(grouped.rows.reduce((total,row)=>total+Number(row.offers),0),manifest.rowCount)
 console.log(JSON.stringify({apiPort:port,database,coverage:manifest.coverage,rowCount:manifest.rowCount,topK:cheapest.rows.length,groupCounts:grouped.rows},null,2))
 bridge.release(manifest.datasetId)
}finally{server.kill('SIGTERM')}
