import { expect, it } from 'vitest'
import { FareItemSchema } from '../contracts/query-groups'
import { ArtifactIdSchema, DatasetIdSchema, DatasetRevisionSchema, UIStateRevisionSchema } from '../contracts'
import { effectiveInputs, fareInspectionItems } from './display-records'

it('serializes the exact normalized query input without inventing a time zone', () => {
  const input = effectiveInputs({
    group: { artifactId: ArtifactIdSchema.parse('artifact-1'), legKey: 'paris:rome', purpose: 'leg-results' },
    projectionKey: 'calendar',
    scope: {
      kind: 'fareScope',
      originId: 'paris',
      destinationId: 'rome',
      dateWindow: { from: '2026-10-11', to: '2026-10-14' },
      passengers: 2,
      earliestDeparture: { date: '2026-10-12', minutes: 75 },
    },
    projection: {
      projectionId: 'projection-1',
      kind: 'farePage',
      filters: { modes: ['train'], carrierIds: ['rail'], directOnly: true },
      serviceDate: '2026-10-13',
      sort: { field: 'departureMinutes', direction: 'asc' },
      after: null,
      limit: 20,
    },
    datasetId: DatasetIdSchema.parse('dataset-1'),
    datasetRevision: DatasetRevisionSchema.parse(1),
    sourceVersion: 'source-1',
    uiRevision: UIStateRevisionSchema.parse(4),
  })
  expect(input).toEqual({
    originId: 'paris',
    destinationId: 'rome',
    dateWindow: { from: '2026-10-11', to: '2026-10-14' },
    passengers: 2,
    earliestDeparture: { serviceDate: '2026-10-12', departureMinutes: 75 },
    modes: ['train'],
    carrierIds: ['rail'],
    directOnly: true,
    serviceDate: '2026-10-13',
    selectedDate: '2026-10-13',
    sort: { field: 'departureMinutes', direction: 'asc' },
    cursor: null,
    limit: 20,
  })
  expect(JSON.stringify(input)).not.toMatch(/timeZone|timezone|instant|Z"/)
})

it('drops browser-only availability fields from display inspection facts', () => {
  const item = FareItemSchema.parse({
    id: 'fare-1', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-09', mode: 'train', carrierId: 'rail', carrierName: 'Rail',
    priceCents: 2500, durationMinutes: 120, departureMinutes: 600, availableSeats: 9, currency: 'EUR', synthetic: true,
    priceBasis: 'per-passenger-including-demo-fees', direct: true,
    legs: [{ legIndex: 0, mode: 'train', carrierName: 'Rail', durationMinutes: 120, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
  })
  const [inspection] = fareInspectionItems([item])
  expect(inspection?.fact).toMatchObject({ id: 'fare-1', serviceDate: '2026-10-09', departureMinutes: 600 })
  expect(inspection?.fact).not.toHaveProperty('availableSeats')
  expect(inspection?.fact).toMatchObject({ direct: true, legs: [{ legIndex: 0, originId: 'london', destinationId: 'paris' }] })
})
