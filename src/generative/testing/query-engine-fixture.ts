import {
  CONTRACT_VERSION,
  DatasetIdSchema,
  DatasetManifestSchema,
  DatasetRevisionSchema,
  FareFieldSchema,
  parseQuery,
  type DatasetId,
  type DatasetManifest,
  type FareRow,
  type QueryIR,
} from '../contracts'
import { executeQuery } from '../query/query-engine'

const numeric = new Set(['priceCents', 'durationMinutes', 'departureMinutes', 'availableSeats'])
const boolean = new Set(['synthetic', 'direct'])

export function createQueryEngineFixture(rows: readonly FareRow[], name = 'query-fixture') {
  const datasetId = DatasetIdSchema.parse(name)
  const revision = DatasetRevisionSchema.parse(1)
  const dates = rows.map(row => row.serviceDate).sort()
  const originIds = [...new Set(rows.map(row => row.originId))]
  const destinationIds = [...new Set(rows.map(row => row.destinationId))]
  const modes = [...new Set(rows.map(row => row.mode))]
  const prices = rows.map(row => row.priceCents)
  const durations = rows.map(row => row.durationMinutes)
  const manifest: DatasetManifest = DatasetManifestSchema.parse({
    datasetId,
    revision,
    schemaVersion: CONTRACT_VERSION,
    coverage: {
      originIds,
      destinationIds,
      dateWindow: { from: dates[0] ?? '2026-01-01', to: dates.at(-1) ?? '2026-01-01' },
      modes,
      passengers: 1,
      complete: true,
      truncated: false,
    },
    rowCount: rows.length,
    fields: FareFieldSchema.options.map(field => ({
      name: field,
      type: numeric.has(field) ? 'number' : boolean.has(field) ? 'boolean' : 'string',
      nullable: field === 'carrierName',
      filterable: true,
      groupable: true,
      joinKey: field === 'originId' || field === 'destinationId',
    })),
    compactSummary: {
      minPriceCents: prices.length ? Math.min(...prices) : undefined,
      maxPriceCents: prices.length ? Math.max(...prices) : undefined,
      minDurationMinutes: durations.length ? Math.min(...durations) : undefined,
      maxDurationMinutes: durations.length ? Math.max(...durations) : undefined,
      modeCounts: Object.fromEntries(modes.map(mode => [mode, rows.filter(row => row.mode === mode).length])),
    },
    source: { kind: 'synthetic-fixture', descriptorId: name, sourceVersion: `${name}-v1` },
  })
  const resources = new Map([[datasetId, { rows, revision, sourceVersion: manifest.source.sourceVersion }]])
  return {
    datasetId,
    manifest,
    parse(input: Omit<QueryIR, 'version' | 'sources'> & Partial<Pick<QueryIR, 'version' | 'sources'>>) {
      return parseQuery({ version: 1, sources: [{ datasetRef: datasetId, alias: 'fares' }], ...input }, [manifest])
    },
    execute(input: Omit<QueryIR, 'version' | 'sources'> & Partial<Pick<QueryIR, 'version' | 'sources'>>, signal = new AbortController().signal) {
      return executeQuery(parseQuery({ version: 1, sources: [{ datasetRef: datasetId, alias: 'fares' }], ...input }, [manifest]), resources, signal)
    },
    resources,
  }
}

export function directLeg(row: Omit<FareRow, 'legs'>): FareRow['legs'] {
  return [{
    legIndex: 0,
    mode: row.mode,
    carrierName: row.carrierName ?? row.carrierId,
    durationMinutes: row.durationMinutes,
    originId: row.originId,
    destinationId: row.destinationId,
    originLabel: row.originId,
    destinationLabel: row.destinationId,
  }]
}

export function queryDatasetId(value: string): DatasetId {
  return DatasetIdSchema.parse(value)
}
