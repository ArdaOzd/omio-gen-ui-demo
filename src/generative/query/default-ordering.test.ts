import { expect, it } from 'vitest'
import { FareRowSchema, parseQuery } from '../contracts'
import { createFareDataBridge } from '../data/fare-data-bridge'
const rows=[
 FareRowSchema.parse({id:'lowest',originId:'london',destinationId:'paris',serviceDate:'2026-10-03',mode:'train',carrierId:'rail',priceCents:1000,durationMinutes:120,departureMinutes:600,availableSeats:1,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:false}),
 FareRowSchema.parse({id:'highest',originId:'london',destinationId:'paris',serviceDate:'2026-10-03',mode:'train',carrierId:'rail',priceCents:1200,durationMinutes:130,departureMinutes:700,availableSeats:9,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true}),
 FareRowSchema.parse({id:'middle',originId:'london',destinationId:'paris',serviceDate:'2026-10-03',mode:'train',carrierId:'rail',priceCents:1100,durationMinutes:125,departureMinutes:650,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true}),
]
it('orders validated source fields before applying the bounded default output projection',async()=>{
 const bridge=createFareDataBridge({pageSource:async()=>({rows,total:3,pages:1,page:1,sourceVersion:'v1'})})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-03',to:'2026-10-03'},modes:['train'],passengers:1},new AbortController().signal)
 for(const input of [
  {orderBy:[{field:'availableSeats',direction:'desc'}],limit:2},
  {topK:{by:'availableSeats',direction:'desc',k:2},limit:3},
 ]){
  const query=parseQuery({version:1,sources:[{datasetRef:manifest.datasetId,alias:'f'}],...input},[manifest])
  const result=await bridge.query(query,new AbortController().signal)
  expect(result.rows.map(row=>row.id)).toEqual(['highest','middle'])
  expect(result.total).toBe(3);expect(result.truncated).toBe(true)
  for(const row of result.rows){expect(row).not.toHaveProperty('availableSeats');expect(row).not.toHaveProperty('direct')}
 }
 expect(()=>parseQuery({version:1,sources:[{datasetRef:manifest.datasetId,alias:'f'}],project:['id'],orderBy:[{field:'availableSeats',direction:'desc'}],limit:2},[manifest])).toThrow('Unknown ordering')
})
