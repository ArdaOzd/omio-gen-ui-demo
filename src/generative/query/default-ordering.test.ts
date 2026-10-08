import { expect, it } from 'vitest'
import { FareRowSchema } from '../contracts'
import { createQueryEngineFixture } from '../testing/query-engine-fixture'

const fare = (id: string, priceCents: number, durationMinutes: number, departureMinutes: number, availableSeats: number) => FareRowSchema.parse({
  id, originId: 'london', destinationId: 'paris', serviceDate: '2026-10-03', mode: 'train', carrierId: 'rail',
  carrierName: 'Rail', priceCents, durationMinutes, departureMinutes, availableSeats, currency: 'EUR', synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees', direct: true,
  legs: [{ legIndex: 0, mode: 'train', carrierName: 'Rail', durationMinutes, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
})
const rows = [fare('lowest', 1000, 120, 600, 1), fare('highest', 1200, 130, 700, 9), fare('middle', 1100, 125, 650, 5)]

it('orders validated source fields before applying the bounded default output projection', async () => {
  const fixture = createQueryEngineFixture(rows, 'default-ordering')
  for (const input of [
    { orderBy: [{ field: 'availableSeats' as const, direction: 'desc' as const }], limit: 2 },
    { topK: { by: 'availableSeats' as const, direction: 'desc' as const, k: 2 }, limit: 3 },
  ]) {
    const result = await fixture.execute(input)
    expect(result.rows.map(row => row.id)).toEqual(['highest', 'middle'])
    expect(result.total).toBe(3)
    expect(result.truncated).toBe(true)
    for (const row of result.rows) {
      expect(row).not.toHaveProperty('availableSeats')
      expect(row).not.toHaveProperty('direct')
    }
  }
  expect(() => fixture.parse({ project: ['id'], orderBy: [{ field: 'availableSeats', direction: 'desc' }], limit: 2 })).toThrow('Unknown ordering')
})
