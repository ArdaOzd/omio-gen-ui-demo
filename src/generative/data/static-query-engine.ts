import { z } from 'zod'
import {
  FareItemSchema,
  LookupPinsRequestSchema,
  QueryGroupsRequestSchema,
  ResourceKeySchema,
  type FareItem,
  type FareScope,
  type LookupPinsRequest,
  type LookupPinsResponse,
  type ProjectionFilters,
  type ProjectionRequest,
  type ProjectionResult,
  type QueryGroupResult,
  type QueryGroupsRequest,
  type QueryGroupsResponse,
} from '../contracts/query-groups'
import { stableFingerprint } from './projection-coordinator'
import { ServerQueryError, fareMatchesScope, type ServerQueryClient } from './server-query-client'

const ModeSchema = z.enum(['train', 'bus', 'flight', 'ferry'])
const DateWindowSchema = z.strictObject({ from: z.string().date(), to: z.string().date() })
const LocalMinuteSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/)
const FileSchema = z.strictObject({
  path: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  sha256: Sha256Schema,
  encoding: z.literal('gzip').optional(),
  decodedBytes: z.number().int().nonnegative().optional(),
  decodedSha256: Sha256Schema.optional(),
}).superRefine((file, context) => {
  if (file.encoding === 'gzip' && (file.decodedBytes === undefined || file.decodedSha256 === undefined)) {
    context.addIssue({ code: 'custom', message: 'Gzip assets require decoded integrity metadata' })
  }
})
const ShardDescriptorSchema = FileSchema.safeExtend({
  rowCount: z.number().int().nonnegative(),
  soldOutCount: z.number().int().nonnegative(),
  rowsByDate: z.record(z.string().date(), z.number().int().nonnegative()),
  rowsByMode: z.partialRecord(ModeSchema, z.number().int().nonnegative()),
})
const StaticManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceVersion: z.string().min(1).max(96),
  currency: z.literal('EUR'),
  dateWindow: DateWindowSchema,
  rowCount: z.number().int().positive(),
  soldOutCount: z.number().int().nonnegative(),
  rowsByDate: z.record(z.string().date(), z.number().int().nonnegative()),
  rowsByMode: z.record(ModeSchema, z.number().int().nonnegative()),
  bounds: z.strictObject({
    durationMinutes: z.strictObject({ min: z.number().int().positive(), max: z.number().int().positive() }),
    priceCents: z.strictObject({ min: z.number().int().positive(), max: z.number().int().positive() }),
    arrival: z.strictObject({ min: LocalMinuteSchema, max: LocalMinuteSchema }),
  }),
  arrivalsAfterDateWindowCount: z.number().int().nonnegative(),
  fareTupleFields: z.tuple([
    z.literal('id'),
    z.literal('routeId'),
    z.literal('companyId'),
    z.literal('dayOffset'),
    z.literal('departureMinutes'),
    z.literal('durationMinutes'),
    z.literal('priceCents'),
    z.literal('availableSeats'),
  ]),
  databaseMetadata: z.record(z.string(), z.string()),
  files: z.strictObject({ locations: FileSchema, companies: FileSchema, routes: FileSchema }),
  originShards: z.record(z.string().min(1), ShardDescriptorSchema),
})
const LocationsSchema = z.strictObject({
  schemaVersion: z.literal(1),
  fields: z.tuple([
    z.literal('id'), z.literal('slug'), z.literal('city'), z.literal('countryCode'),
    z.literal('latitude'), z.literal('longitude'),
  ]),
  rows: z.array(z.tuple([
    z.number().int().positive(), z.string().min(1), z.string().min(1), z.string().length(2),
    z.number().finite(), z.number().finite(),
  ])),
})
const CompaniesSchema = z.strictObject({
  schemaVersion: z.literal(1),
  fields: z.tuple([z.literal('id'), z.literal('name'), z.literal('mode')]),
  rows: z.array(z.tuple([z.number().int().positive(), z.string().min(1), ModeSchema])),
})
const RouteTupleSchema = z.tuple([
  z.number().int().positive(), z.string().min(1), ModeSchema,
  z.number().int().positive(), z.number().int().positive(), z.string().min(1), z.string().min(1),
  z.number().int().positive(), z.number().int().positive(), z.number().int().nonnegative(),
  z.enum(['coverage', 'curated']), z.string().url(),
])
const RouteLegTupleSchema = z.tuple([
  z.number().int().positive(), z.number().int().nonnegative(), ModeSchema,
  z.number().int().positive(), z.number().int().positive(), z.string().min(1), z.string().min(1),
  z.number().int().positive(), z.number().int().positive(),
])
const RoutesSchema = z.strictObject({
  schemaVersion: z.literal(1),
  routeFields: z.array(z.string()),
  routes: z.array(RouteTupleSchema),
  routeCompanyFields: z.array(z.string()),
  routeCompanies: z.array(z.tuple([z.number().int().positive(), z.number().int().positive()])),
  routeLegFields: z.array(z.string()),
  routeLegs: z.array(RouteLegTupleSchema),
})
const FareTupleSchema = z.tuple([
  z.number().int().positive(),
  z.number().int().positive(),
  z.number().int().positive(),
  z.number().int().nonnegative(),
  z.number().int().min(0).max(1439),
  z.number().int().positive(),
  z.number().int().positive(),
  z.number().int().nonnegative(),
])
const OriginShardSchema = z.strictObject({
  schemaVersion: z.literal(1),
  originId: z.string().min(1),
  from: z.string().date(),
  to: z.string().date(),
  fields: StaticManifestSchema.shape.fareTupleFields,
  rows: z.array(FareTupleSchema),
})
const CursorSchema = z.strictObject({
  version: z.literal(1),
  sourceVersion: z.string(),
  inputHash: z.string(),
  offset: z.number().int().nonnegative(),
})

type StaticManifest = z.infer<typeof StaticManifestSchema>
type FareTuple = z.infer<typeof FareTupleSchema>
type RouteTuple = z.infer<typeof RouteTupleSchema>
type RouteLegTuple = z.infer<typeof RouteLegTupleSchema>
type DateWindow = FareScope['dateWindow']

type Location = { id: number; slug: string; city: string }
type Company = { id: number; name: string; carrierId: string }
type Route = {
  id: number
  mode: z.infer<typeof ModeSchema>
  origin: Location
  destination: Location
  transferCount: number
  legs: RouteLegTuple[]
}
type Catalog = {
  locationsById: ReadonlyMap<number, Location>
  companiesById: ReadonlyMap<number, Company>
  routesById: ReadonlyMap<number, Route>
  routeKeys: ReadonlySet<string>
}
type CachedOrigin = { rows: FareTuple[]; byId?: ReadonlyMap<number, FareTuple> }

export type StaticQueryEngineOptions = {
  baseUrl: string | URL
  fetch?: typeof globalThis.fetch
  maxCachedOrigins?: number
  arrivalCutoff?: string
}

export type StaticQueryEngine = ServerQueryClient & {
  manifest(): Promise<StaticManifest>
  clearCache(): void
}

const modeOrder = ['train', 'bus', 'flight', 'ferry'] as const
const clone = <T>(value: T): T => structuredClone(value)

function required<K, V>(map: ReadonlyMap<K, V>, key: K, label: string): V {
  const value = map.get(key)
  if (value === undefined) throw new Error(`Static fare corpus is missing ${label}`)
  return value
}

function stableRef(value: string): string {
  let result = 2_166_136_261
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0
    result = Math.imul(result, 16_777_619) >>> 0
  }
  return result.toString(36)
}

function normalizeBaseUrl(value: string | URL): URL {
  const fallback = typeof document === 'undefined' ? 'http://localhost/' : document.baseURI
  const resolved = new URL(value.toString(), fallback)
  return new URL(resolved.href.endsWith('/') ? resolved.href : `${resolved.href}/`)
}

async function sha256(payload: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', payload)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function checkedJson<T>(
  fetcher: typeof globalThis.fetch,
  url: URL,
  schema: z.ZodType<T>,
  descriptor?: z.infer<typeof FileSchema>,
): Promise<T> {
  const response = await fetcher(url)
  if (!response.ok) throw new ServerQueryError(response.status, 'databaseUnavailable', `Static fare asset ${url.pathname} could not load.`, 'static-assets')
  const payload = await response.arrayBuffer()
  let decoded = payload
  if (descriptor?.encoding === 'gzip') {
    const payloadHash = await sha256(payload)
    const isEncoded = payload.byteLength === descriptor.bytes && payloadHash === descriptor.sha256
    const isDecoded = payload.byteLength === descriptor.decodedBytes && payloadHash === descriptor.decodedSha256
    if (!isEncoded && !isDecoded) {
      throw new ServerQueryError(503, 'databaseUnavailable', `Static fare asset ${url.pathname} failed integrity verification.`, 'static-assets')
    }
    if (isEncoded) {
      try {
        const stream = new Response(payload).body?.pipeThrough(new DecompressionStream('gzip'))
        if (!stream) throw new Error('Streaming decompression is unavailable')
        decoded = await new Response(stream).arrayBuffer()
      } catch {
        throw new ServerQueryError(503, 'databaseUnavailable', `Static fare asset ${url.pathname} could not be decompressed.`, 'static-assets')
      }
    }
    if (decoded.byteLength !== descriptor.decodedBytes || await sha256(decoded) !== descriptor.decodedSha256) {
      throw new ServerQueryError(503, 'databaseUnavailable', `Static fare asset ${url.pathname} failed decoded integrity verification.`, 'static-assets')
    }
  } else if (descriptor && (payload.byteLength !== descriptor.bytes || await sha256(payload) !== descriptor.sha256)) {
    throw new ServerQueryError(503, 'databaseUnavailable', `Static fare asset ${url.pathname} failed integrity verification.`, 'static-assets')
  }
  let raw: unknown
  try {
    raw = JSON.parse(new TextDecoder().decode(decoded))
  } catch {
    throw new ServerQueryError(503, 'databaseUnavailable', `Static fare asset ${url.pathname} is not valid JSON.`, 'static-assets')
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const detail = issue ? ` (${issue.path.join('.') || 'root'}: ${issue.message})` : ''
    throw new ServerQueryError(503, 'databaseUnavailable', `Static fare asset ${url.pathname} does not match its schema${detail}.`, 'static-assets')
  }
  return parsed.data
}

function intersect(left: DateWindow, right: DateWindow): DateWindow | null {
  const from = left.from > right.from ? left.from : right.from
  const to = left.to < right.to ? left.to : right.to
  return from <= to ? { from, to } : null
}

function dateFromOffset(from: string, offset: number): string {
  const instant = Date.parse(`${from}T00:00:00.000Z`) + offset * 86_400_000
  return new Date(instant).toISOString().slice(0, 10)
}

function normalizeArrivalCutoff(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value
  const instant = Date.parse(normalized)
  if (!Number.isFinite(instant)) throw new Error('arrivalCutoff must be an ISO date or timestamp')
  return instant
}

function arrivalInstant(from: string, row: FareTuple): number {
  return Date.parse(`${from}T00:00:00.000Z`) + (row[3] * 1_440 + row[4] + row[5]) * 60_000
}

function dates(window: DateWindow): string[] {
  const result: string[] = []
  for (let instant = Date.parse(`${window.from}T00:00:00.000Z`), end = Date.parse(`${window.to}T00:00:00.000Z`); instant <= end; instant += 86_400_000) {
    result.push(new Date(instant).toISOString().slice(0, 10))
  }
  return result
}

function filterRows(
  rows: readonly FareTuple[],
  filters: ProjectionFilters,
  catalog: Catalog,
  options: { ignoreCarriers?: boolean; ignoreModes?: boolean } = {},
): FareTuple[] {
  return rows.filter(row => {
    const route = required(catalog.routesById, row[1], `route ${row[1]}`)
    const company = required(catalog.companiesById, row[2], `company ${row[2]}`)
    return (options.ignoreModes || filters.modes.length === 0 || filters.modes.includes(route.mode))
      && (options.ignoreCarriers || filters.carrierIds.length === 0 || filters.carrierIds.includes(company.carrierId))
      && (filters.minPriceCents === undefined || row[6] >= filters.minPriceCents)
      && (filters.maxPriceCents === undefined || row[6] <= filters.maxPriceCents)
      && (filters.maxDurationMinutes === undefined || row[5] <= filters.maxDurationMinutes)
      && (!filters.directOnly || route.transferCount === 0)
  })
}

function compareRows(
  left: FareTuple,
  right: FareTuple,
  field: 'priceCents' | 'durationMinutes' | 'departureMinutes',
  direction: 'asc' | 'desc',
): number {
  const primaryIndex = field === 'priceCents' ? 6 : field === 'durationMinutes' ? 5 : 4
  let difference = field === 'departureMinutes'
    ? left[3] - right[3] || left[4] - right[4]
    : left[primaryIndex] - right[primaryIndex]
  if (direction === 'desc') difference = -difference
  return difference || left[3] - right[3] || left[4] - right[4] || left[0] - right[0]
}

function projectionIdentity(scope: FareScope, projection: ProjectionRequest) {
  const { projectionId: _projectionId, ...input } = projection
  return { inputHash: stableFingerprint({ scope, projection: input }, 'input') }
}

function cursorInputHash(scope: FareScope, projection: Extract<ProjectionRequest, { kind: 'farePage' }>): string {
  const { projectionId: _projectionId, after: _after, ...definition } = projection
  return stableFingerprint({ scope, projection: definition }, 'cursor-input')
}

function finalizeProjection<T extends Omit<ProjectionResult, 'resultFingerprint'>>(result: T): T & { resultFingerprint: string } {
  return { ...result, resultFingerprint: stableFingerprint(result, 'result') }
}

function encodeCursor(value: z.infer<typeof CursorSchema>): string {
  return btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function decodeCursor(raw: string, sourceVersion: string, inputHash: string, requestId: string): number {
  try {
    const base64 = raw.replaceAll('-', '+').replaceAll('_', '/')
    const parsed = CursorSchema.parse(JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))))
    if (parsed.sourceVersion !== sourceVersion || parsed.inputHash !== inputHash) throw new Error('cursor identity mismatch')
    return parsed.offset
  } catch {
    throw new ServerQueryError(409, 'staleCursor', 'The result cursor no longer matches this fare scope.', requestId)
  }
}

export function createStaticQueryEngine(options: StaticQueryEngineOptions): StaticQueryEngine {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const fetcher = options.fetch ?? fetch
  const maxCachedOrigins = options.maxCachedOrigins ?? 4
  const arrivalCutoff = normalizeArrivalCutoff(options.arrivalCutoff)
  if (!Number.isInteger(maxCachedOrigins) || maxCachedOrigins < 1) throw new Error('maxCachedOrigins must be a positive integer')
  let manifestPromise: Promise<StaticManifest> | undefined
  let catalogPromise: Promise<Catalog> | undefined
  const origins = new Map<string, CachedOrigin>()
  const pendingOrigins = new Map<string, Promise<CachedOrigin>>()

  const loadManifest = () => manifestPromise ??= checkedJson(fetcher, new URL('manifest.json', baseUrl), StaticManifestSchema)

  async function loadCatalog(): Promise<Catalog> {
    if (catalogPromise) return catalogPromise
    catalogPromise = loadManifest().then(async manifest => {
      const [locationsFile, companiesFile, routesFile] = await Promise.all([
        checkedJson(fetcher, new URL(manifest.files.locations.path, baseUrl), LocationsSchema, manifest.files.locations),
        checkedJson(fetcher, new URL(manifest.files.companies.path, baseUrl), CompaniesSchema, manifest.files.companies),
        checkedJson(fetcher, new URL(manifest.files.routes.path, baseUrl), RoutesSchema, manifest.files.routes),
      ])
      const locationsById = new Map<number, Location>(locationsFile.rows.map(row => [row[0], { id: row[0], slug: row[1], city: row[2] }]))
      const companiesById = new Map<number, Company>(companiesFile.rows.map(row => [row[0], { id: row[0], name: row[1], carrierId: `carrier-${stableRef(row[1])}` }]))
      const legsByRoute = new Map<number, RouteLegTuple[]>()
      for (const leg of routesFile.routeLegs) legsByRoute.set(leg[0], [...(legsByRoute.get(leg[0]) ?? []), leg])
      const routesById = new Map<number, Route>()
      const routeKeys = new Set<string>()
      for (const row of routesFile.routes) {
        const route = routeFromTuple(row, locationsById, legsByRoute)
        routesById.set(route.id, route)
        routeKeys.add(`${route.origin.slug}:${route.destination.slug}`)
      }
      return { locationsById, companiesById, routesById, routeKeys }
    })
    return catalogPromise
  }

  function routeFromTuple(row: RouteTuple, locationsById: ReadonlyMap<number, Location>, legsByRoute: ReadonlyMap<number, RouteLegTuple[]>): Route {
    const legs = [...(legsByRoute.get(row[0]) ?? [])].sort((left, right) => left[1] - right[1])
    if (legs.length !== row[9] + 1 || legs.some((leg, index) => leg[1] !== index)) throw new Error(`Static route ${row[0]} has invalid ordered legs`)
    return {
      id: row[0],
      mode: row[2],
      origin: required(locationsById, row[3], `origin location ${row[3]}`),
      destination: required(locationsById, row[4], `destination location ${row[4]}`),
      transferCount: row[9],
      legs,
    }
  }

  function touchOrigin(originId: string, cached: CachedOrigin): CachedOrigin {
    origins.delete(originId)
    origins.set(originId, cached)
    while (origins.size > maxCachedOrigins) {
      const oldest = origins.keys().next().value
      if (typeof oldest !== 'string') break
      origins.delete(oldest)
    }
    return cached
  }

  async function loadOrigin(originId: string): Promise<CachedOrigin> {
    const existing = origins.get(originId)
    if (existing) return touchOrigin(originId, existing)
    const pending = pendingOrigins.get(originId)
    if (pending) return pending
    const promise = Promise.all([loadManifest(), loadCatalog()]).then(async ([manifest, catalog]) => {
      const descriptor = manifest.originShards[originId]
      if (!descriptor) throw new ServerQueryError(400, 'unknownScope', 'The requested origin is not in the static fare corpus.', 'static-assets')
      const shard = await checkedJson(fetcher, new URL(descriptor.path, baseUrl), OriginShardSchema, descriptor)
      if (shard.originId !== originId || shard.from !== manifest.dateWindow.from || shard.to !== manifest.dateWindow.to || shard.rows.length !== descriptor.rowCount) {
        throw new ServerQueryError(503, 'databaseUnavailable', `Static fare shard ${originId} is inconsistent with its manifest.`, 'static-assets')
      }
      for (const row of shard.rows) {
        const route = catalog.routesById.get(row[1])
        if (!route || route.origin.slug !== originId || !catalog.companiesById.has(row[2])) {
          throw new ServerQueryError(503, 'databaseUnavailable', `Static fare shard ${originId} contains an invalid reference.`, 'static-assets')
        }
      }
      return touchOrigin(originId, { rows: shard.rows })
    }).finally(() => pendingOrigins.delete(originId))
    pendingOrigins.set(originId, promise)
    return promise
  }

  async function activeRows(scope: FareScope, available: DateWindow | null, catalog: Catalog): Promise<FareTuple[]> {
    if (!catalog.routeKeys.has(`${scope.originId}:${scope.destinationId}`)) {
      throw new ServerQueryError(400, 'unknownScope', 'The requested origin and destination are not a known fare scope.', 'static-query')
    }
    if (!available) return []
    const manifest = await loadManifest()
    const origin = await loadOrigin(scope.originId)
    return origin.rows.filter(row => {
      const route = required(catalog.routesById, row[1], `route ${row[1]}`)
      const serviceDate = dateFromOffset(manifest.dateWindow.from, row[3])
      return route.destination.slug === scope.destinationId
        && serviceDate >= available.from && serviceDate <= available.to
        && row[7] >= scope.passengers && row[7] > 0
        && (serviceDate > scope.earliestDeparture.date
          || (serviceDate === scope.earliestDeparture.date && row[4] >= scope.earliestDeparture.minutes))
        && (arrivalCutoff === undefined || arrivalInstant(manifest.dateWindow.from, row) <= arrivalCutoff)
    })
  }

  function fareItem(row: FareTuple, manifest: StaticManifest, catalog: Catalog): FareItem {
    const route = required(catalog.routesById, row[1], `route ${row[1]}`)
    const company = required(catalog.companiesById, row[2], `company ${row[2]}`)
    return FareItemSchema.parse({
      id: `fare_${String(row[0]).padStart(9, '0')}`,
      originId: route.origin.slug,
      destinationId: route.destination.slug,
      serviceDate: dateFromOffset(manifest.dateWindow.from, row[3]),
      mode: route.mode,
      carrierId: company.carrierId,
      carrierName: company.name,
      priceCents: row[6],
      durationMinutes: row[5],
      departureMinutes: row[4],
      availableSeats: row[7],
      currency: 'EUR',
      synthetic: true,
      priceBasis: 'per-passenger-including-demo-fees',
      direct: route.transferCount === 0,
      legs: route.legs.map(leg => {
        const legCompany = required(catalog.companiesById, leg[8], `leg company ${leg[8]}`)
        const origin = required(catalog.locationsById, leg[3], `leg origin ${leg[3]}`)
        const destination = required(catalog.locationsById, leg[4], `leg destination ${leg[4]}`)
        return {
          legIndex: leg[1], mode: leg[2], carrierName: legCompany.name, durationMinutes: leg[7],
          originId: origin.slug, destinationId: destination.slug,
          originLabel: origin.city, destinationLabel: destination.city,
        }
      }),
    })
  }

  function project(
    requestId: string,
    sourceVersion: string,
    scope: FareScope,
    projection: ProjectionRequest,
    rows: readonly FareTuple[],
    available: DateWindow | null,
    manifest: StaticManifest,
    catalog: Catalog,
  ): ProjectionResult {
    const identity = projectionIdentity(scope, projection)
    if (projection.kind === 'farePage') {
      const cursorHash = cursorInputHash(scope, projection)
      const matching = filterRows(rows, projection.filters, catalog)
        .filter(row => projection.serviceDate === null || dateFromOffset(manifest.dateWindow.from, row[3]) === projection.serviceDate)
        .sort((left, right) => compareRows(left, right, projection.sort.field, projection.sort.direction))
      const offset = projection.after === null ? 0 : decodeCursor(projection.after, sourceVersion, cursorHash, requestId)
      if (offset > matching.length) throw new ServerQueryError(409, 'staleCursor', 'The result cursor no longer matches this fare scope.', requestId)
      const page = matching.slice(offset, offset + projection.limit)
      const nextOffset = offset + page.length
      const nextCursor = nextOffset < matching.length
        ? encodeCursor({ version: 1, sourceVersion, inputHash: cursorHash, offset: nextOffset })
        : null
      return finalizeProjection({
        projectionId: projection.projectionId,
        kind: projection.kind,
        ...identity,
        items: page.map(row => fareItem(row, manifest, catalog)),
        pageInfo: { total: matching.length, returned: page.length, hasNextPage: nextCursor !== null, nextCursor },
      })
    }
    if (projection.kind === 'calendarDays') {
      const matching = filterRows(rows, projection.filters, catalog)
      const dayRows = new Map<string, FareTuple[]>()
      for (const row of matching) {
        const serviceDate = dateFromOffset(manifest.dateWindow.from, row[3])
        dayRows.set(serviceDate, [...(dayRows.get(serviceDate) ?? []), row])
      }
      const days = available ? dates(available).map(serviceDate => {
        const candidates = dayRows.get(serviceDate) ?? []
        const field = projection.objective === 'cheapest' ? 'priceCents' : 'durationMinutes'
        const representative = [...candidates].sort((left, right) => compareRows(left, right, field, 'asc'))[0]
        return { date: serviceDate, count: candidates.length, representative: representative ? fareItem(representative, manifest, catalog) : null }
      }) : []
      return finalizeProjection({ projectionId: projection.projectionId, kind: projection.kind, ...identity, days })
    }
    if (projection.kind === 'carrierFacets') {
      const counts = new Map<number, number>()
      for (const row of filterRows(rows, projection.filters, catalog, { ignoreCarriers: true })) counts.set(row[2], (counts.get(row[2]) ?? 0) + 1)
      const facets = [...counts].map(([companyId, count]) => ({ company: required(catalog.companiesById, companyId, `company ${companyId}`), count }))
        .sort((left, right) => right.count - left.count || (left.company.name < right.company.name ? -1 : left.company.name > right.company.name ? 1 : 0))
        .map(({ company, count }) => ({ carrierId: company.carrierId, carrierName: company.name, count }))
      return finalizeProjection({ projectionId: projection.projectionId, kind: projection.kind, ...identity, options: facets })
    }
    if (projection.kind === 'modeSummary') {
      const matching = filterRows(rows, projection.filters, catalog, { ignoreModes: projection.baseline === 'withoutModeFilter' })
      const modes = modeOrder.flatMap(mode => {
        const candidates = matching.filter(row => required(catalog.routesById, row[1], `route ${row[1]}`).mode === mode)
        return candidates.length ? [{
          mode,
          count: candidates.length,
          minPriceCents: Math.min(...candidates.map(row => row[6])),
          minDurationMinutes: Math.min(...candidates.map(row => row[5])),
        }] : []
      })
      return finalizeProjection({ projectionId: projection.projectionId, kind: projection.kind, ...identity, baseline: projection.baseline, modes })
    }
    const matching = filterRows(rows, projection.filters, catalog)
    const cheapest = [...matching].sort((left, right) => compareRows(left, right, 'priceCents', 'asc'))[0]
    const fastest = [...matching].sort((left, right) => compareRows(left, right, 'durationMinutes', 'asc'))[0]
    return finalizeProjection({
      projectionId: projection.projectionId,
      kind: projection.kind,
      ...identity,
      cheapest: cheapest ? fareItem(cheapest, manifest, catalog) : null,
      fastest: fastest ? fareItem(fastest, manifest, catalog) : null,
    })
  }

  async function queryGroups(raw: QueryGroupsRequest, signal: AbortSignal): Promise<QueryGroupsResponse> {
    const request = QueryGroupsRequestSchema.parse(raw)
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const [manifest, catalog] = await Promise.all([loadManifest(), loadCatalog()])
    if (request.expectedSourceVersion !== null && request.expectedSourceVersion !== manifest.sourceVersion) {
      throw new ServerQueryError(409, 'sourceChanged', 'The fare source changed. Refresh the displayed results.', request.requestId)
    }
    const groups: QueryGroupResult[] = []
    for (const group of request.groups) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      const available = intersect(group.scope.dateWindow, manifest.dateWindow)
      const rows = await activeRows(group.scope, available, catalog)
      const counts = new Map(modeOrder.map(mode => [mode, 0]))
      for (const row of rows) {
        const route = required(catalog.routesById, row[1], `route ${row[1]}`)
        counts.set(route.mode, (counts.get(route.mode) ?? 0) + 1)
      }
      const resourceKey = ResourceKeySchema.parse(stableFingerprint(group.scope, 'scope'))
      groups.push({
        groupId: group.groupId,
        manifest: {
          kind: 'fareScopeManifest',
          resourceKey,
          source: { kind: 'search', descriptorId: resourceKey, sourceVersion: manifest.sourceVersion },
          coverage: clone(group.scope),
          availableDateWindow: available,
          totalAvailable: rows.length,
          availableModes: modeOrder.filter(mode => (counts.get(mode) ?? 0) > 0),
          complete: available?.from === group.scope.dateWindow.from && available.to === group.scope.dateWindow.to,
        },
        projections: group.projections.map(projection => project(
          request.requestId, manifest.sourceVersion, group.scope, projection, rows, available, manifest, catalog,
        )),
      })
    }
    return { version: 1, requestId: request.requestId, sourceVersion: manifest.sourceVersion, groups }
  }

  async function lookupPins(raw: LookupPinsRequest, signal: AbortSignal): Promise<LookupPinsResponse> {
    const request = LookupPinsRequestSchema.parse(raw)
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const [manifest, catalog] = await Promise.all([loadManifest(), loadCatalog()])
    if (request.sourceVersion !== manifest.sourceVersion) {
      throw new ServerQueryError(409, 'sourceChanged', 'The fare source changed. Refresh the displayed results.', request.requestId)
    }
    const resources = new Map(request.resources.map(resource => [resource.resourceKey, resource.scope]))
    const loaded = new Map<string, CachedOrigin>()
    for (const scope of resources.values()) loaded.set(scope.originId, await loadOrigin(scope.originId))
    const emitted = new Set<string>()
    const items: FareItem[] = []
    const missingPins: LookupPinsResponse['missingPins'] = []
    for (const pin of request.pins) {
      const scope = resources.get(pin.resourceKey)
      const match = /^fare_(\d+)$/.exec(pin.fareId)
      if (!scope || !match) {
        missingPins.push(pin)
        continue
      }
      const integerId = Number(match[1])
      const origin = loaded.get(scope.originId)
      if (!origin) {
        missingPins.push(pin)
        continue
      }
      if (!origin.byId) origin.byId = new Map(origin.rows.map(row => [row[0], row]))
      const row = origin.byId.get(integerId)
      const item = row && (arrivalCutoff === undefined || arrivalInstant(manifest.dateWindow.from, row) <= arrivalCutoff)
        ? fareItem(row, manifest, catalog)
        : undefined
      if (!item || !fareMatchesScope(item, scope)) missingPins.push(pin)
      else if (!emitted.has(item.id)) {
        emitted.add(item.id)
        items.push(item)
      }
    }
    return { version: 1, requestId: request.requestId, sourceVersion: manifest.sourceVersion, items, missingPins }
  }

  return {
    queryGroups,
    lookupPins,
    manifest: loadManifest,
    clearCache() {
      origins.clear()
      pendingOrigins.clear()
    },
  }
}
