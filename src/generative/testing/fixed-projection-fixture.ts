import { ResourceKeySchema } from '../contracts/query-groups'
import type {
  FareItem,
  FareLeg,
  FareScope,
  LookupPinsResponse,
  ProjectionFilters,
  ProjectionRequest,
  ProjectionResult,
  QueryGroupResult,
  QueryGroupsRequest,
  QueryGroupsResponse,
} from '../contracts/query-groups'
import { createFareDataBridge, type ServerFareDataBridge } from '../data/fare-data-bridge'
import { stableFingerprint } from '../data/projection-coordinator'
import type { ServerQueryClient } from '../data/server-query-client'

type DateWindow = FareScope['dateWindow']
type FareInput = Omit<FareItem, 'legs'> & { legs?: FareLeg[] }
type RowSource = readonly FareInput[] | ((scope: FareScope, signal: AbortSignal) => readonly FareInput[] | Promise<readonly FareInput[]>)

export type FixedProjectionFixtureOptions = {
  rows: RowSource
  sourceVersion?: string
  sourceDateWindow?: DateWindow
}

export type FixedProjectionFixture = {
  bridge: ServerFareDataBridge
  client: ServerQueryClient
  scope(input: Omit<FareScope, 'kind'>): FareScope
}

const modeOrder = ['train', 'bus', 'flight', 'ferry'] as const
const clone = <T>(value: T): T => structuredClone(value)
const resultIdentity = (scope: FareScope, projection: ProjectionRequest) => ({
  inputHash: stableFingerprint({ scope, projection }, 'fixture-input'),
  resultFingerprint: stableFingerprint({ scope, projection }, 'fixture-result'),
})

function normalizedFare(input: FareInput): FareItem {
  const legs = input.legs ?? (input.direct ? [{
    legIndex: 0,
    mode: input.mode,
    carrierName: input.carrierName ?? input.carrierId,
    durationMinutes: input.durationMinutes,
    originId: input.originId,
    destinationId: input.destinationId,
    originLabel: input.originId,
    destinationLabel: input.destinationId,
  }] : [])
  if (!input.direct && legs.length <= 1) throw new Error(`Connected fixture fare ${input.id} requires at least two legs`)
  return clone({ ...input, legs }) as FareItem
}

function intersect(left: DateWindow, right: DateWindow): DateWindow | null {
  const from = left.from > right.from ? left.from : right.from
  const to = left.to < right.to ? left.to : right.to
  return from <= to ? { from, to } : null
}

function activeRows(rows: readonly FareItem[], scope: FareScope, window: DateWindow | null) {
  if (!window) return []
  return rows.filter(row =>
    row.originId === scope.originId
    && row.destinationId === scope.destinationId
    && row.serviceDate >= window.from
    && row.serviceDate <= window.to
    && row.availableSeats >= scope.passengers
    && (row.serviceDate > scope.earliestDeparture.date
      || (row.serviceDate === scope.earliestDeparture.date && row.departureMinutes >= scope.earliestDeparture.minutes)))
}

function filtered(rows: readonly FareItem[], filters: ProjectionFilters, options: { ignoreCarriers?: boolean; ignoreModes?: boolean } = {}) {
  return rows.filter(row =>
    (options.ignoreModes || filters.modes.length === 0 || filters.modes.includes(row.mode))
    && (options.ignoreCarriers || filters.carrierIds.length === 0 || filters.carrierIds.includes(row.carrierId))
    && (filters.minPriceCents === undefined || row.priceCents >= filters.minPriceCents)
    && (filters.maxPriceCents === undefined || row.priceCents <= filters.maxPriceCents)
    && (filters.maxDurationMinutes === undefined || row.durationMinutes <= filters.maxDurationMinutes)
    && (!filters.directOnly || row.direct))
}

function compare(left: FareItem, right: FareItem, field: 'priceCents' | 'durationMinutes' | 'departureMinutes', direction: 'asc' | 'desc') {
  let difference: number
  if (field === 'departureMinutes') {
    difference = left.serviceDate.localeCompare(right.serviceDate) || left.departureMinutes - right.departureMinutes
    if (direction === 'desc') difference = -difference
    return difference || left.id.localeCompare(right.id)
  }
  difference = left[field] - right[field]
  if (direction === 'desc') difference = -difference
  return difference
    || left.serviceDate.localeCompare(right.serviceDate)
    || left.departureMinutes - right.departureMinutes
    || left.id.localeCompare(right.id)
}

function project(scope: FareScope, request: ProjectionRequest, rows: readonly FareItem[]): ProjectionResult {
  const identity = resultIdentity(scope, request)
  if (request.kind === 'farePage') {
    const matching = filtered(rows, request.filters)
      .filter(row => request.serviceDate === null || row.serviceDate === request.serviceDate)
      .sort((left, right) => compare(left, right, request.sort.field, request.sort.direction))
    const offset = request.after === null ? 0 : Number(request.after.slice('fixture-cursor-'.length))
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Stale fixture cursor')
    const items = matching.slice(offset, offset + request.limit)
    const nextOffset = offset + items.length
    return {
      projectionId: request.projectionId,
      kind: request.kind,
      ...identity,
      items: clone(items),
      pageInfo: {
        total: matching.length,
        returned: items.length,
        hasNextPage: nextOffset < matching.length,
        nextCursor: nextOffset < matching.length ? `fixture-cursor-${nextOffset}` : null,
      },
    }
  }
  if (request.kind === 'calendarDays') {
    const matching = filtered(rows, request.filters)
    const days = [...new Set(rows.map(row => row.serviceDate))].sort().map(date => {
      const candidates = matching.filter(row => row.serviceDate === date)
      const field = request.objective === 'cheapest' ? 'priceCents' : 'durationMinutes'
      const representative = [...candidates].sort((left, right) =>
        left[field] - right[field] || left.departureMinutes - right.departureMinutes || left.id.localeCompare(right.id))[0] ?? null
      return { date, count: candidates.length, representative: clone(representative) }
    })
    return { projectionId: request.projectionId, kind: request.kind, ...identity, days }
  }
  if (request.kind === 'carrierFacets') {
    const counts = new Map<string, { carrierName: string | null; count: number }>()
    for (const row of filtered(rows, request.filters, { ignoreCarriers: true })) {
      const entry = counts.get(row.carrierId) ?? { carrierName: row.carrierName, count: 0 }
      entry.count += 1
      counts.set(row.carrierId, entry)
    }
    const options = [...counts].map(([carrierId, value]) => ({ carrierId, ...value }))
      .sort((left, right) => right.count - left.count || (left.carrierName ?? '').localeCompare(right.carrierName ?? ''))
    return { projectionId: request.projectionId, kind: request.kind, ...identity, options }
  }
  if (request.kind === 'modeSummary') {
    const matching = filtered(rows, request.filters, { ignoreModes: request.baseline === 'withoutModeFilter' })
    const modes = modeOrder.flatMap(mode => {
      const candidates = matching.filter(row => row.mode === mode)
      return candidates.length ? [{
        mode,
        count: candidates.length,
        minPriceCents: Math.min(...candidates.map(row => row.priceCents)),
        minDurationMinutes: Math.min(...candidates.map(row => row.durationMinutes)),
      }] : []
    })
    return { projectionId: request.projectionId, kind: request.kind, ...identity, baseline: request.baseline, modes }
  }
  const matching = filtered(rows, request.filters)
  const cheapest = [...matching].sort((left, right) => compare(left, right, 'priceCents', 'asc'))[0] ?? null
  const fastest = [...matching].sort((left, right) => compare(left, right, 'durationMinutes', 'asc'))[0] ?? null
  return { projectionId: request.projectionId, kind: request.kind, ...identity, cheapest: clone(cheapest), fastest: clone(fastest) }
}

export function createFixedProjectionFixture(options: FixedProjectionFixtureOptions): FixedProjectionFixture {
  const sourceVersion = options.sourceVersion ?? 'fixture-source-v1'
  const observed = new Map<string, FareItem>()

  async function rowsFor(scope: FareScope, signal: AbortSignal) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const source = typeof options.rows === 'function' ? await options.rows(scope, signal) : options.rows
    const rows = source.map(normalizedFare)
    for (const row of rows) observed.set(row.id, row)
    return rows
  }

  const client: ServerQueryClient = {
    async queryGroups(request: QueryGroupsRequest, signal: AbortSignal): Promise<QueryGroupsResponse> {
      if (request.expectedSourceVersion !== null && request.expectedSourceVersion !== sourceVersion) throw new Error('sourceChanged')
      const groups: QueryGroupResult[] = []
      for (const group of request.groups) {
        const rows = await rowsFor(group.scope, signal)
        const inferredWindow = options.sourceDateWindow ?? (rows.length ? {
          from: rows.reduce((minimum, row) => row.serviceDate < minimum ? row.serviceDate : minimum, rows[0]!.serviceDate),
          to: rows.reduce((maximum, row) => row.serviceDate > maximum ? row.serviceDate : maximum, rows[0]!.serviceDate),
        } : group.scope.dateWindow)
        const availableDateWindow = intersect(group.scope.dateWindow, inferredWindow)
        const scoped = activeRows(rows, group.scope, availableDateWindow)
        const resourceKey = ResourceKeySchema.parse(stableFingerprint({ sourceVersion, scope: group.scope }, 'fixture-scope'))
        groups.push({
          groupId: group.groupId,
          manifest: {
            kind: 'fareScopeManifest',
            resourceKey,
            source: { kind: 'search', descriptorId: resourceKey, sourceVersion },
            coverage: clone(group.scope),
            availableDateWindow,
            totalAvailable: scoped.length,
            availableModes: modeOrder.filter(mode => scoped.some(row => row.mode === mode)),
            complete: availableDateWindow?.from === group.scope.dateWindow.from && availableDateWindow.to === group.scope.dateWindow.to,
          },
          projections: group.projections.map(projection => project(group.scope, projection, scoped)),
        })
      }
      return { version: 1, requestId: request.requestId, sourceVersion, groups }
    },
    async lookupPins(request): Promise<LookupPinsResponse> {
      if (request.sourceVersion !== sourceVersion) throw new Error('sourceChanged')
      const items: FareItem[] = []
      const missingPins = []
      for (const pin of request.pins) {
        const item = observed.get(pin.fareId)
        if (item) items.push(clone(item))
        else missingPins.push(pin)
      }
      return { version: 1, requestId: request.requestId, sourceVersion, items, missingPins }
    },
  }
  return {
    client,
    bridge: createFareDataBridge({ client }),
    scope: input => ({ kind: 'fareScope', ...input }),
  }
}
