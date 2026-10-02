export const LEAKAGE_SENTINEL = 'private-fare-sentinel-4c917d';
const forbidden = new Set(['rows', 'fares', 'rowBuffers', 'rawData', 'price_cents', 'available_seats', 'sql', 'html', 'css', 'javascript']);
export function assertNoBulkData(input: unknown): void {
  const walk = (value: unknown): void => {
    if (typeof value === 'string' && value.includes(LEAKAGE_SENTINEL)) throw new Error('Private sentinel leaked');
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        if (forbidden.has(key)) throw new Error(`Forbidden bulk-data field: ${key}`);
        walk(item);
      }
    }
  };
  walk(input);
}
