import { z } from 'zod'
import { FareRowSchema } from '../contracts'
import { stableRef, type PageSource } from './resource-loader'
const endpointSchema=z.object({id:z.string(),city:z.string()})
const rowSchema=z.object({id:z.string(),mode:z.string(),company:z.string(),departure_time:z.string(),duration_minutes:z.number(),transfers:z.number().int().nonnegative(),legs:z.array(z.object({leg_index:z.number().int().nonnegative(),mode:z.string(),company:z.string(),duration_minutes:z.number(),origin:endpointSchema,destination:endpointSchema})),origin:z.object({id:z.string()}),destination:z.object({id:z.string()}),price_cents:z.number(),currency:z.literal('EUR'),available_seats:z.number()})
const responseSchema=z.object({source_version:z.string().min(1).max(96),outbound:z.object({date:z.string(),page:z.number().int(),pages:z.number().int(),total:z.number().int(),results:z.array(rowSchema)})})
export function createSearchPageSource(options:{fetch?:typeof fetch;baseUrl?:string}={}):PageSource {
  const fetcher=options.fetch??fetch
  return async(input,signal)=>{
    const params=new URLSearchParams({origin:input.originId,destination:input.destinationId,departure_date:input.date,passengers:String(input.passengers),page:String(input.page),limit:String(input.limit),sort:'price_asc',mode:'all'})
    const response=await fetcher(`${options.baseUrl??''}/api/search?${params}`,{signal})
    if (!response.ok) throw new Error(`Fare search failed (${response.status})`)
    const payload=responseSchema.parse(await response.json())
    const data=payload.outbound
    return {page:data.page,pages:data.pages,total:data.total,sourceVersion:payload.source_version,rows:data.results.map(row=>{
      if (row.transfers!==Math.max(0,row.legs.length-1)) throw new Error('Fare transfer count does not match route legs')
      const datePart=row.departure_time.includes('T')?row.departure_time.split('T')[1]:row.departure_time
      const [hours,minutes]=(datePart??'').split(':').map(Number)
      return FareRowSchema.parse({id:row.id,originId:row.origin.id,destinationId:row.destination.id,serviceDate:data.date,mode:row.mode,carrierId:`carrier-${stableRef(row.company)}`,carrierName:row.company,priceCents:row.price_cents,durationMinutes:row.duration_minutes,departureMinutes:(hours??0)*60+(minutes??0),availableSeats:row.available_seats,currency:row.currency,synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:row.transfers===0,legs:row.legs.map(leg=>({legIndex:leg.leg_index,mode:leg.mode,carrierName:leg.company,durationMinutes:leg.duration_minutes,originId:leg.origin.id,destinationId:leg.destination.id,originLabel:leg.origin.city,destinationLabel:leg.destination.city}))})
    })}
  }
}
