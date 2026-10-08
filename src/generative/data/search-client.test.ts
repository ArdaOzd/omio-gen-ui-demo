import { describe, expect, it } from 'vitest'
import { createSearchPageSource } from './search-client'

const input={originId:'london',destinationId:'paris',date:'2026-10-09',passengers:1,page:1,limit:100}
const outbound={date:input.date,page:1,pages:1,total:1,results:[{id:'fare_000000001',mode:'train',company:'Demo',departure_time:'2026-10-09T09:00:00',duration_minutes:120,transfers:0,legs:[{leg_index:0,mode:'train',company:'Demo',duration_minutes:120,origin:{id:'london',city:'London'},destination:{id:'paris',city:'Paris'}}],origin:{id:'london'},destination:{id:'paris'},price_cents:10000,currency:'EUR',available_seats:3}]}

describe('authoritative search source identity',()=>{
 it('propagates changed source generations while retaining typed fare facts',async()=>{let sourceVersion='fixture-generation-one';const fetcher:typeof fetch=async()=>new Response(JSON.stringify({source_version:sourceVersion,outbound}));const source=createSearchPageSource({fetch:fetcher});const first=await source(input,new AbortController().signal);sourceVersion='fixture-generation-two';const second=await source(input,new AbortController().signal);expect(first.sourceVersion).toBe('fixture-generation-one');expect(second.sourceVersion).toBe('fixture-generation-two');expect(second.rows).toEqual(first.rows);});
 it('rejects unversioned responses instead of assigning a constant identity',async()=>{const fetcher:typeof fetch=async()=>new Response(JSON.stringify({outbound}));await expect(createSearchPageSource({fetch:fetcher})(input,new AbortController().signal)).rejects.toThrow();});
 it('keeps the readable company name beside the stable carrier id',async()=>{
  const namedOutbound={...outbound,results:[{...outbound.results[0],company:'ÖBB'}]}
  const fetcher:typeof fetch=async()=>new Response(JSON.stringify({source_version:'fixture-generation-one',outbound:namedOutbound}))
  const page=await createSearchPageSource({fetch:fetcher})(input,new AbortController().signal)
 expect(page.rows[0]).toMatchObject({carrierId:'carrier-1772yvd',carrierName:'ÖBB'})
 });
 it('derives directness from the API transfer count',async()=>{
  const base=outbound.results[0]
  const connected={...outbound,results:[{...base,transfers:2,legs:[
   {...base.legs[0],destination:{id:'brussels',city:'Brussels'}},
   {...base.legs[0],leg_index:1,origin:{id:'brussels',city:'Brussels'},destination:{id:'lille',city:'Lille'}},
   {...base.legs[0],leg_index:2,origin:{id:'lille',city:'Lille'}},
  ]}]}
  const fetcher:typeof fetch=async()=>new Response(JSON.stringify({source_version:'fixture-generation-one',outbound:connected}))
  const page=await createSearchPageSource({fetch:fetcher})(input,new AbortController().signal)
  expect(page.rows[0]?.direct).toBe(false)
  expect(page.rows[0]?.legs).toHaveLength(3)
  expect(page.rows[0]?.legs?.[0]).toMatchObject({legIndex:0,mode:'train',carrierName:'Demo',originLabel:'London',destinationLabel:'Brussels'})
 });
});
