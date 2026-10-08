import { FareFieldSchema } from './index';
const fareFields=FareFieldSchema.options.filter(field=>field!=='carrierName');
export const hasFareRowFields=(keys:readonly string[]):boolean=>fareFields.every(field=>keys.includes(field));
export const LEAKAGE_SENTINEL = 'private-fare-sentinel-4c917d';
const forbidden = new Set(['rows', 'fares', 'rowBuffers', 'rawData', 'price_cents', 'available_seats', 'sql', 'html', 'css', 'javascript']);
export function assertNoBulkData(input: unknown): void {
  const walk = (value: unknown): void => {
    if (typeof value === 'string' && value.includes(LEAKAGE_SENTINEL)) throw new Error('Private sentinel leaked');
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (value && typeof value === 'object') {
      const entries=Object.entries(value);
      if(hasFareRowFields(entries.map(([key])=>key))&&fareFields.every(field=>{const item=Reflect.get(value,field);return item===null||['string','number','boolean'].includes(typeof item)}))throw new Error('Copied normalized fare data');
      for (const [key, item] of entries) {
        if (forbidden.has(key)) throw new Error(`Forbidden bulk-data field: ${key}`);
        walk(item);
      }
    }
  };
  walk(input);
}
