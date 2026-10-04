import * as duckdb from '@duckdb/duckdb-wasm'
import wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import workerUrl from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import { createSyntheticRows } from '../../src/generative/data/synthetic-source'
import { createWorkerQueryEngine } from '../../src/generative/query/worker-client'
import { DatasetIdSchema,DatasetRevisionSchema,type QueryIR,type JsonScalar } from '../../src/generative/contracts'
import thresholds from './thresholds.json'
import {createFareDataBridge} from '../../src/generative/data/fare-data-bridge'
import {parseQuery} from '../../src/generative/contracts'
import {nullableOracleCases,nullableRows} from './nullable-oracle'

type Metric={engine:string;rows:number;startupMs:number;ingestMs:number;incrementalAppendMs?:number;appendCorrect?:boolean;workloads:Array<{name:string;p50Ms:number;p95Ms:number;resultBytes:number;correct:boolean}>;visibleCancelMs?:number;workerCancelAckMs?:number;mainThreadLongTasks:number;heapBytes?:number}
type Report={timestamp:string;thresholds:typeof thresholds;metrics:Metric[];nullableOracle?:Array<{name:string;typescriptCorrect:boolean;duckdbCorrect:boolean;agreement:boolean}>;invertedOracleRejected?:boolean;error?:string;done:boolean}
declare global{interface Window{queryBenchmark:Report}}
window.queryBenchmark={timestamp:new Date().toISOString(),thresholds,metrics:[],done:false}
const longTasks:PerformanceEntry[]=[]
new PerformanceObserver(list=>longTasks.push(...list.getEntries())).observe({entryTypes:['longtask']})
const id=DatasetIdSchema.parse('benchmark');const rightId=DatasetIdSchema.parse('right')
const base:QueryIR={version:1,sources:[{datasetRef:id,alias:'f'}],limit:5}
const workloads:Array<{name:string;ir:QueryIR;sql:string}>= [
 {name:'nullableFilter',ir:{...base,project:['id','carrierName'],where:{field:'carrierName',op:'in',value:[null,'Provider 0']}},sql:"SELECT id,carrierName FROM fares WHERE carrierName IS NULL OR carrierName='Provider 0' ORDER BY id LIMIT 5"},
 {name:'defaultProjection',ir:{...base},sql:'SELECT id,mode,carrierId,carrierName,priceCents,durationMinutes,serviceDate,departureMinutes,originId,destinationId FROM fares ORDER BY id LIMIT 5'},
 {name:'topK',ir:{...base,project:['id','priceCents'],topK:{k:5,by:'priceCents',direction:'asc'}},sql:'SELECT id, priceCents FROM fares ORDER BY priceCents, id LIMIT 5'},
 {name:'filter',ir:{...base,project:['id','priceCents'],where:{all:[{field:'mode',op:'eq',value:'train'},{field:'priceCents',op:'lte',value:5000}]},orderBy:[{field:'priceCents',direction:'asc'}]},sql:"SELECT id, priceCents FROM fares WHERE mode='train' AND priceCents<=5000 ORDER BY priceCents,id LIMIT 5"},
 {name:'group',ir:{...base,groupBy:['mode'],metrics:[{as:'offers',op:'count'},{as:'minimum',op:'min',field:'priceCents'}],orderBy:[{field:'mode',direction:'asc'}]},sql:'SELECT mode, count(*)::INTEGER AS offers, min(priceCents)::INTEGER AS minimum FROM fares GROUP BY mode ORDER BY mode'},
 {name:'join',ir:{...base,sources:[{datasetRef:id,alias:'f'},{datasetRef:rightId,alias:'r'}],joins:[{rightAlias:'r',leftKey:'destinationId',rightKey:'originId',kind:'inner'}],project:['id','priceCents'],orderBy:[{field:'priceCents',direction:'asc'}]},sql:'SELECT f.id,f.priceCents FROM fares f JOIN cities r ON f.destinationId=r.originId ORDER BY f.priceCents,f.id LIMIT 5'},
]
function percentile(samples:number[],fraction:number){return [...samples].sort((a,b)=>a-b)[Math.ceil(samples.length*fraction)-1]??0}
function benchmarkRows(count:number){return createSyntheticRows(count).map((row,index)=>index%3===0?{...row,carrierName:`Provider ${index%16}`}:row)}
function expected(name:string,count:number):Array<Record<string,JsonScalar>>{if(name==='nullableFilter')return [0,1,2,4,5].map(index=>({id:`synthetic-${String(index).padStart(9,'0')}`,carrierName:index===0?'Provider 0':null}));if(name==='defaultProjection')return benchmarkRows(5).map(row=>({id:row.id,mode:row.mode,carrierId:row.carrierId,carrierName:row.carrierName??null,priceCents:row.priceCents,durationMinutes:row.durationMinutes,serviceDate:row.serviceDate,departureMinutes:row.departureMinutes,originId:row.originId,destinationId:row.destinationId}));if(name==='group')return[{mode:'bus',offers:count/4,minimum:1017},{mode:'ferry',offers:count/4,minimum:1051},{mode:'flight',offers:count/4,minimum:1034},{mode:'train',offers:count/4,minimum:1000}];return Array.from({length:5},(_,index)=>({id:`synthetic-${String(index*1000).padStart(9,'0')}`,priceCents:1000}))}

function csvRows(rows:ReturnType<typeof benchmarkRows>){
 const fields=['id','mode','carrierId','carrierName','priceCents','durationMinutes','serviceDate','departureMinutes','originId','destinationId'] as const
 return fields.join(',')+'\n'+rows.map(row=>fields.map(field=>row[field]==null?'':JSON.stringify(row[field])).join(',')).join('\n')
}
async function runNullableOracle(){
 const worker=new Worker(new URL('../../src/generative/query/worker.ts',import.meta.url),{type:'module'}),engine=createWorkerQueryEngine(worker)
 const bridge=createFareDataBridge({queryEngine:engine,pageSource:async()=>({rows:nullableRows,total:4,pages:1,page:1,sourceVersion:'nullable-oracle-v1'})})
 const duckWorker=new Worker(workerUrl),database=new duckdb.AsyncDuckDB(new duckdb.VoidLogger(),duckWorker)
 try{
  const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-02'},modes:['train','bus','flight','ferry'],passengers:1},new AbortController().signal)
  await database.instantiate(wasm);const connection=await database.connect()
  try{
   await connection.query('CREATE TABLE nullable_fares(id VARCHAR,carrierName VARCHAR,priceCents INTEGER)')
   const insert=await connection.prepare('INSERT INTO nullable_fares VALUES(?,?,?)')
   try{for(const row of nullableRows)await insert.query(row.id,row.carrierName??null,row.priceCents)}finally{await insert.close()}
   const cases=nullableOracleCases(manifest.datasetId);window.queryBenchmark.nullableOracle=[]
   for(const item of cases){
    const typescript=(await bridge.query(parseQuery(item.query,[manifest]),new AbortController().signal)).rows
    const statement=await connection.prepare(item.sql)
    try{
     const table=await statement.query(...item.params),actual=table.toArray().map(row=>row.toJSON())
     window.queryBenchmark.nullableOracle.push({name:item.name,typescriptCorrect:JSON.stringify(typescript)===JSON.stringify(item.expected),duckdbCorrect:JSON.stringify(actual)===JSON.stringify(item.expected),agreement:JSON.stringify(typescript)===JSON.stringify(actual)})
    }finally{await statement.close()}
   }
   const wrong=await connection.prepare('SELECT id,carrierName FROM nullable_fares WHERE carrierName = ? ORDER BY id')
   try{const rows=(await wrong.query(null)).toArray();window.queryBenchmark.invertedOracleRejected=rows.length===0&&cases[0]?.expected.length===2}finally{await wrong.close()}
   if(!window.queryBenchmark.invertedOracleRejected||window.queryBenchmark.nullableOracle.some(item=>!item.typescriptCorrect||!item.duckdbCorrect||!item.agreement))throw new Error('Nullable differential oracle failed')
  }finally{await connection.close()}
 }finally{engine.dispose();await database.terminate();duckWorker.terminate()}
}

async function run(){
 await runNullableOracle()
 for(const count of thresholds.rowCounts){
  const rows=benchmarkRows(count);const first=rows[0];if(!first)throw new Error('Benchmark requires rows')
  const started=performance.now();const worker=new Worker(new URL('../../src/generative/query/worker.ts',import.meta.url),{type:'module'})
  let canceledAt:number|undefined;let cancelAck:number|undefined
  worker.addEventListener('message',event=>{if(event.data?.kind==='error'&&event.data.code==='canceled'&&canceledAt!==undefined)cancelAck=performance.now()-canceledAt})
  const engine=createWorkerQueryEngine(worker);const ready=performance.now();await engine.register(id,{rows,revision:DatasetRevisionSchema.parse(1),sourceVersion:'benchmark-v1'});await engine.register(rightId,{rows:[{...first,originId:'paris'}],revision:DatasetRevisionSchema.parse(1),sourceVersion:'benchmark-v1'})
  const metric:Metric={engine:'typescript-worker',rows:count,startupMs:ready-started,ingestMs:performance.now()-ready,workloads:[],mainThreadLongTasks:0}
  const queryLongTaskStart=longTasks.length
  for(const workload of workloads){const times:number[]=[];let result:Array<Record<string,JsonScalar>>=[];for(let sample=0;sample<thresholds.samplesPerWorkload;sample++){const start=performance.now();result=(await engine.execute(workload.ir,new AbortController().signal)).rows;times.push(performance.now()-start)}metric.workloads.push({name:workload.name,p50Ms:percentile(times,.5),p95Ms:percentile(times,.95),resultBytes:new TextEncoder().encode(JSON.stringify(result)).length,correct:JSON.stringify(result)===JSON.stringify(expected(workload.name,count))})}
  metric.mainThreadLongTasks=longTasks.length-queryLongTaskStart
  const controller=new AbortController();const cancellation=engine.execute({...base,project:['id','priceCents'],orderBy:[{field:'priceCents',direction:'desc'}]},controller.signal).catch(()=>undefined);await new Promise(resolve=>setTimeout(resolve,10));canceledAt=performance.now();controller.abort();await cancellation;metric.visibleCancelMs=performance.now()-canceledAt;await new Promise(resolve=>setTimeout(resolve,100));metric.workerCancelAckMs=cancelAck;const delta=benchmarkRows(count+1000).slice(count);const appendStart=performance.now();await engine.append(id,delta,DatasetRevisionSchema.parse(2));metric.incrementalAppendMs=performance.now()-appendStart;const appended=await engine.execute({...base,metrics:[{as:'offers',op:'count'}]},new AbortController().signal);metric.appendCorrect=appended.rows[0]?.offers===count+1000;engine.dispose();window.queryBenchmark.metrics.push(metric)
  const duckStart=performance.now();const duckWorker=new Worker(workerUrl);const database=new duckdb.AsyncDuckDB(new duckdb.VoidLogger(),duckWorker);await database.instantiate(wasm);const connection=await database.connect();const duckReady=performance.now()
  const csv=csvRows(rows)
  await database.registerFileText('fares.csv',csv);await connection.query("CREATE TABLE fares AS SELECT * FROM read_csv('fares.csv',header=true,types={'serviceDate':'VARCHAR','carrierName':'VARCHAR'})");await connection.query("CREATE TABLE cities AS SELECT 'paris'::VARCHAR AS originId")
  const duckMetric:Metric={engine:'duckdb-wasm',rows:count,startupMs:duckReady-duckStart,ingestMs:performance.now()-duckReady,workloads:[],mainThreadLongTasks:0}
  const duckLongTaskStart=longTasks.length
  for(const workload of workloads){const times:number[]=[];let result:Array<Record<string,JsonScalar>>=[];for(let sample=0;sample<thresholds.samplesPerWorkload;sample++){const start=performance.now();const table=await connection.query(workload.sql);result=table.toArray().map(row=>{const values:Record<string,JsonScalar>={};for(const [key,value] of Object.entries(row.toJSON())){if(typeof value==='bigint')values[key]=Number(value);else if(value===null||typeof value==='string'||typeof value==='number'||typeof value==='boolean')values[key]=value;else throw new Error('Unexpected benchmark scalar')}return values});times.push(performance.now()-start)}duckMetric.workloads.push({name:workload.name,p50Ms:percentile(times,.5),p95Ms:percentile(times,.95),resultBytes:new TextEncoder().encode(JSON.stringify(result)).length,correct:JSON.stringify(result)===JSON.stringify(expected(workload.name,count))})}
  duckMetric.mainThreadLongTasks=longTasks.length-duckLongTaskStart
  const duckDelta=benchmarkRows(count+1000).slice(count);const duckAppendStart=performance.now();await database.registerFileText('delta.csv',csvRows(duckDelta));await connection.query("INSERT INTO fares SELECT * FROM read_csv('delta.csv',header=true,types={'serviceDate':'VARCHAR','carrierName':'VARCHAR'})");duckMetric.incrementalAppendMs=performance.now()-duckAppendStart;const countResult=await connection.query('SELECT count(*)::INTEGER AS total FROM fares');duckMetric.appendCorrect=countResult.get(0)?.total===count+1000;
  await connection.close();await database.terminate();duckWorker.terminate();window.queryBenchmark.metrics.push(duckMetric)
 }
}
run().catch(error=>{window.queryBenchmark.error=error instanceof Error?error.message:String(error)}).finally(()=>{window.queryBenchmark.done=true;const target=document.getElementById('status');if(target)target.textContent=JSON.stringify(window.queryBenchmark,null,2)})
