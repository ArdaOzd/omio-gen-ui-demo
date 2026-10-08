import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import type { FareItem, FareScope, ProjectionFilters } from '../../src/generative/contracts/query-groups'
import { createFareDataBridge } from '../../src/generative/data/fare-data-bridge'

const port = 18523
const baseUrl = `http://127.0.0.1:${port}`
const database = process.env.OMIO_DATABASE ?? resolve('data/omio.sqlite3')
const server = spawn('python3', ['-m', 'backend.app', '--database', database, '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
})

type Metadata = {
  source_version: string
  timetable: { start_date: string; end_date: string; fare_count: number }
}

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

const chronological = (fare: FareItem): [string, number, string] => [
  fare.serviceDate,
  fare.departureMinutes,
  fare.id,
]

try {
  let healthy = false
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) {
        healthy = true
        break
      }
    } catch {}
    await new Promise(resolveDelay => setTimeout(resolveDelay, 100))
  }
  assert.equal(healthy, true, 'Owned Python API did not become ready')

  const metadataResponse = await fetch(`${baseUrl}/api/metadata`)
  assert.equal(metadataResponse.ok, true, 'Metadata endpoint was unavailable')
  const metadata = await metadataResponse.json() as Metadata
  const from = metadata.timetable.start_date
  const candidateTo = addDays(from, 2)
  const to = candidateTo <= metadata.timetable.end_date ? candidateTo : metadata.timetable.end_date
  const scope: FareScope = {
    kind: 'fareScope',
    originId: 'london',
    destinationId: 'paris',
    dateWindow: { from, to },
    passengers: 2,
    earliestDeparture: { date: from, minutes: 0 },
  }
  const filters: ProjectionFilters = { modes: [], carrierIds: [], directOnly: false }
  const bridge = createFareDataBridge({ baseUrl })
  const signal = new AbortController().signal
  const manifest = await bridge.loadScope(scope, signal)
  assert.equal(manifest.complete, true)
  assert.deepEqual(manifest.availableDateWindow, scope.dateWindow)
  assert.ok(manifest.totalAvailable > 0)

  const group = await bridge.executeGroup({
    groupId: 'verify:london:paris',
    scope,
    projections: [
      { projectionId: 'page', kind: 'farePage', filters, serviceDate: null, sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 5 },
      { projectionId: 'calendar', kind: 'calendarDays', filters, objective: 'cheapest' },
      { projectionId: 'carriers', kind: 'carrierFacets', filters },
      { projectionId: 'modes', kind: 'modeSummary', filters, baseline: 'withoutModeFilter' },
      { projectionId: 'highlights', kind: 'fareHighlights', filters },
    ],
  }, signal)
  assert.deepEqual(group.projections.map(projection => projection.kind), [
    'farePage',
    'calendarDays',
    'carrierFacets',
    'modeSummary',
    'fareHighlights',
  ])
  const page = group.projections[0]
  assert.equal(page?.kind, 'farePage')
  if (page?.kind !== 'farePage') throw new Error('Fare page projection was missing')
  assert.equal(page.items.length, 5)
  const order = page.items.map(chronological)
  assert.deepEqual(order, [...order].sort((left, right) => left[0].localeCompare(right[0]) || left[1] - right[1] || left[2].localeCompare(right[2])))

  const selected = page.items[0]
  assert.ok(selected, 'Fare page did not contain a selectable fare')
  const lookup = await bridge.lookupPins({
    version: 1,
    requestId: 'verify-lookup',
    sourceVersion: manifest.source.sourceVersion,
    pins: [{ fareId: selected.id, resourceKey: manifest.resourceKey }],
  }, signal)
  assert.equal(lookup.items[0]?.id, selected.id)
  assert.equal(lookup.missingPins.length, 0)

  console.log(JSON.stringify({
    apiPort: port,
    database,
    sourceVersion: metadata.source_version,
    sourceFareCount: metadata.timetable.fare_count,
    scope: manifest.coverage,
    availableDateWindow: manifest.availableDateWindow,
    totalAvailable: manifest.totalAvailable,
    projectionKinds: group.projections.map(projection => projection.kind),
    pageItems: page.items.length,
    selectedFareId: selected.id,
  }, null, 2))
  bridge.release(manifest.resourceKey)
  bridge.dispose()
} finally {
  server.kill('SIGTERM')
}
