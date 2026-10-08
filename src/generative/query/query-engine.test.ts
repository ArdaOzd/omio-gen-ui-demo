import { describe, expect, it } from 'vitest'
import { executeQuery } from './query-engine'
import { parseQuery } from '../contracts'
import { DatasetIdSchema, DatasetRevisionSchema, FareIdSchema, type FareRow, type QueryIR } from '../contracts'
import { createQueryEngineFixture } from '../testing/query-engine-fixture'
const datasetId=DatasetIdSchema.parse('fixture')
const fare=(input:Omit<FareRow,'legs'>):FareRow=>({...input,legs:[{legIndex:0,mode:input.mode,carrierName:input.carrierName??input.carrierId,durationMinutes:input.durationMinutes,originId:input.originId,destinationId:input.destinationId,originLabel:input.originId,destinationLabel:input.destinationId}]})
const rows:FareRow[]=[
fare({id:FareIdSchema.parse('c'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'train',carrierId:'eurostar',carrierName:'Eurostar',priceCents:3000,durationMinutes:140,departureMinutes:600,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true}),
fare({id:FareIdSchema.parse('a'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'bus',carrierId:'flix',carrierName:'FlixBus',priceCents:1000,durationMinutes:400,departureMinutes:900,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true}),
fare({id:FareIdSchema.parse('b'),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'bus',carrierId:'flix',carrierName:'FlixBus',priceCents:1000,durationMinutes:380,departureMinutes:800,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})]
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
 it('returns one complete representative from every group before applying the result limit',async()=>{
  const nextDay={...rows[0]!,id:FareIdSchema.parse('next-day'),serviceDate:'2026-10-03',priceCents:9000,durationMinutes:80}
  const result=await executeQuery(query({groupBy:['serviceDate'],project:['id','serviceDate','mode','priceCents','durationMinutes','departureMinutes'],groupTop:{by:'durationMinutes',direction:'asc'},orderBy:[{field:'serviceDate',direction:'asc'}]}),new Map([[datasetId,{rows:[...rows,nextDay],revision:DatasetRevisionSchema.parse(1),sourceVersion:'v1'}]]),new AbortController().signal)
  expect(result.rows).toEqual([
   {id:'c',serviceDate:'2026-10-02',mode:'train',priceCents:3000,durationMinutes:140,departureMinutes:600},
   {id:'next-day',serviceDate:'2026-10-03',mode:'train',priceCents:9000,durationMinutes:80,departureMinutes:600},
  ])
 })
 it('filters nested predicates and honors cancellation',async()=>{
  const result=await executeQuery(query({project:['id'],where:{all:[{field:'mode',op:'in',value:['bus']},{field:'durationMinutes',op:'between',value:[350,390]}]}}),resources,new AbortController().signal)
  expect(result.rows).toEqual([{id:'b'}]);const controller=new AbortController();controller.abort();await expect(executeQuery(query({}),resources,controller.signal)).rejects.toMatchObject({name:'AbortError'})
 })
 it('executes the exact-minute threshold day plus following-day predicate used after a selected arrival',async()=>{
  const where={all:[{any:[{all:[{field:'serviceDate' as const,op:'eq' as const,value:'2026-10-02'},{field:'departureMinutes' as const,op:'gte' as const,value:700}]},{field:'serviceDate' as const,op:'between' as const,value:['2026-10-03','2026-10-04']}]}]}
  const manifest=createQueryEngineFixture(rows,'threshold').manifest
  const parsed=parseQuery({...query({where,project:['id']}),sources:[{datasetRef:manifest.datasetId,alias:'fares'}]},[manifest])
  const future={...rows[0]!,id:FareIdSchema.parse('future'),serviceDate:'2026-10-03',departureMinutes:100}
  const result=await executeQuery(parsed,new Map([[manifest.datasetId,{rows:[...rows,future],revision:DatasetRevisionSchema.parse(1),sourceVersion:'v1'}]]),new AbortController().signal)
  expect(result.rows).toEqual([{id:'a'},{id:'b'},{id:'future'}])
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
 const fixture=createQueryEngineFixture(dated,'date-window'),manifest=fixture.manifest
 const input:QueryIR={version:1,sources:[{datasetRef:manifest.datasetId,alias:'fares'}],where:{field:'serviceDate',op:'between',value:['2026-10-02','2026-10-03']},groupBy:['mode'],metrics:[{as:'minimum',op:'min',field:'priceCents'},{as:'fastest',op:'min',field:'durationMinutes'},{as:'count',op:'count'}],limit:4}
 const result=await fixture.execute(parseQuery(input,[manifest]))
 expect(result.rows).toEqual([{mode:'bus',minimum:1000,fastest:380,count:2}])
 expect(()=>parseQuery({...input,where:{field:'carrierId',op:'between',value:['a','z']}},[manifest])).toThrow(/Comparison requires/)
 expect(()=>parseQuery({...input,project:['priceCents'],orderBy:[{field:'priceCents',direction:'asc'}]},[manifest])).toThrow(/Unknown ordering/)
})
