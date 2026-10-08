import { FareIdSchema,type FareRow } from '../contracts'
export function createSyntheticRows(count:number):FareRow[]{
 if(!Number.isInteger(count)||count<0||count>1_000_000)throw new Error('Synthetic row budget exceeded')
 const modes:FareRow['mode'][]=['train','bus','flight','ferry']
 const carrierNames=['Northstar Rail','CityLink Coaches','Aurora Air','Bluewater Ferries','Alpine Rail','Capital Coaches','Skybridge Air','Harbour Ferries','Coastline Rail','Greenline Coaches','Horizon Air','Island Ferries','Metro Rail','Regional Coaches','Sunrise Air','Channel Ferries']
 return Array.from({length:count},(_,index)=>({id:FareIdSchema.parse(`synthetic-${String(index).padStart(9,'0')}`),originId:'london',destinationId:'paris',serviceDate:`2026-10-${String(index%28+1).padStart(2,'0')}`,mode:modes[index%4]??'train',carrierId:`carrier-${index%16}`,carrierName:carrierNames[index%16]??'Travel Partner',priceCents:1000+(index%1000)*17,durationMinutes:60+index%720,departureMinutes:index%1440,availableSeats:9,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true,legs:[]}))
}
