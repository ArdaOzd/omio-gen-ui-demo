import { z } from 'zod';
const locationsSchema=z.object({locations:z.array(z.object({id:z.string().max(96),city:z.string().max(96),display_name:z.string().max(120)})).max(256)});
export function selectLocations(input:unknown,history:unknown){
 const locations=locationsSchema.parse(input).locations;
 const text=JSON.stringify(history).toLowerCase();
 return locations.map((location,index)=>({location,index,matched:text.includes(location.city.toLowerCase())||text.includes(location.id)})).sort((a,b)=>Number(b.matched)-Number(a.matched)||(a.matched&&b.matched?b.location.city.length-a.location.city.length:0)||a.index-b.index).slice(0,24).map(({location})=>({id:location.id,label:location.display_name}));
}
export async function loadLocationCatalog(history:unknown){
 const response=await fetch(`http://127.0.0.1:${process.env.API_PORT??8000}/api/locations`,{signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error('Travel locations unavailable');
 return selectLocations(await response.json(),history);
}
