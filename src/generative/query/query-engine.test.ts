import { describe, expect, it } from 'vitest'
import { executeQuery } from './query-engine'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { parseQuery } from '../contracts'
import { DatasetIdSchema, DatasetRevisionSchema, FareIdSchema, type FareRow, type QueryIR } from '../contracts'
const datasetId=DatasetIdSchema.parse('fixture')
const rows:FareRow[]=[
{id:FareIdSchema.parse('c'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'train',carrierId:'eurostar',priceCents:3000,durationMinutes:140,departureMinutes:600,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true},
{id:FareIdSchema.parse('a'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'bus',carrierId:'flix',priceCents:1000,durationMinutes:400,departureMinutes:900,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true},
{id:FareIdSchema.parse('b'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'bus',carrierId:'flix',priceCents:1000,durationMinutes:380,departureMinutes:800,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true}]
const query=(extra:Partial<QueryIR>):QueryIR=>({version:1,sources:[{datasetRef:datasetId,alias:'fares'}],limit:10,...extra})
const resources=new Map([[datasetId,{rows,revision:DatasetRevisionSchema.parse(1),sourceVersion:'v1'}]])
describe('bounded local queries',()=>{
 it('returns deterministic ties and a capped projection',async()=>{
  const result=await executeQuery(query({project:['id','priceCents'],orderBy:[{field:'priceCents',direction:'asc'}],limit:2}),resources,new AbortController().signal)
  expect(result.rows).toEqual([{id:'a',priceCents:1000},{id:'b',priceCents:1000}]);expect(result.total).toBe(3);expect(result.truncated).toBe(true)
 })
 it('groups with exact independent fixture sums and averages',async()=>{
  const result=await executeQuery(query({groupBy:['mode'],metrics:[{as:'offers',op:'count'},{as:'total',op:'sum',field:'priceCents'},{as:'average',op:'avg',field:'durationMinutes'}],orderBy:[{field:'mode',direction:'asc'}]}),resources,new AbortController().signal)
  expect(result.rows).toEqual([{mode:'bus',offers:2,total:2000,average:390},{mode:'train',offers:1,total:3000,average:140}])
 })
 it('filters nested predicates and honors cancellation',async()=>{
  const result=await executeQuery(query({project:['id'],where:{all:[{field:'mode',op:'in',value:['bus']},{field:'durationMinutes',op:'between',value:[350,390]}]}}),resources,new AbortController().signal)
  expect(result.rows).toEqual([{id:'b'}]);const controller=new AbortController();controller.abort();await expect(executeQuery(query({}),resources,controller.signal)).rejects.toMatchObject({name:'AbortError'})
 })
 it('rejects mixed source versions and join expansion before any result',async()=>{
  const other=DatasetIdSchema.parse('other');const multi=new Map(resources);multi.set(other,{rows,revision:DatasetRevisionSchema.parse(2),sourceVersion:'v2'})
  await expect(executeQuery(query({sources:[{datasetRef:datasetId,alias:'left'},{datasetRef:other,alias:'right'}],joins:[{rightAlias:'right',leftKey:'destinationId',rightKey:'destinationId',kind:'inner'}]}),multi,new AbortController().signal)).rejects.toThrow(/source version/i)
  multi.set(other,{rows,revision:DatasetRevisionSchema.parse(2),sourceVersion:'v1'})
  await expect(executeQuery(query({sources:[{datasetRef:datasetId,alias:'left'},{datasetRef:other,alias:'right'}],joins:[{rightAlias:'right',leftKey:'destinationId',rightKey:'destinationId',kind:'inner'}]}),multi,new AbortController().signal,{maxJoinRows:4})).rejects.toThrow(/join expansion/i)
 })
})

it('executes authored inclusive date-window queries through manifest validation',async()=>{
 const dated=rows.map((row,index)=>({...row,serviceDate:`2026-10-${String(index+1).padStart(2,'0')}`}))
 const bridge=createFareDataBridge({pageSource:async input=>({rows:dated.filter(row=>row.serviceDate===input.date),total:1,pages:1,page:input.page,sourceVersion:'v1'})})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-01',to:'2026-10-03'},modes:['train','bus'],passengers:1},new AbortController().signal)
 const input:QueryIR={version:1,sources:[{datasetRef:manifest.datasetId,alias:'fares'}],where:{field:'serviceDate',op:'between',value:['2026-10-02','2026-10-03']},groupBy:['mode'],metrics:[{as:'minimum',op:'min',field:'priceCents'},{as:'fastest',op:'min',field:'durationMinutes'},{as:'count',op:'count'}],limit:4}
 const result=await bridge.query(parseQuery(input,[manifest]),new AbortController().signal)
 expect(result.rows).toEqual([{mode:'bus',minimum:1000,fastest:380,count:2}])
 expect(()=>parseQuery({...input,where:{field:'carrierId',op:'between',value:['a','z']}},[manifest])).toThrow(/Comparison requires/)
})
