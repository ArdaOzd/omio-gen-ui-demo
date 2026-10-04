import { describe,expect,it } from 'vitest';
import { selectLocations } from './location-catalog';
describe('host-owned travel locations',()=>{it('supplies actual slugs and labels, prioritizes requested cities, and caps metadata',()=>{const input={locations:Array.from({length:144},(_,i)=>({id:`city-${i}`,city:`City ${i}`,display_name:`City ${i}, XX`,latitude:3}))};const result=selectLocations(input,[{text:'City 143'}]);expect(result).toHaveLength(24);expect(result[0]).toEqual({id:'city-143',label:'City 143, XX'});expect(JSON.stringify(result)).not.toContain('latitude');})});
