import { z } from 'zod'

const ref = z.string().min(1).max(96).regex(/^[a-zA-Z0-9_.:-]+$/)
const hash = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_.:-]+$/)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value), 'Invalid calendar date')
const artifactId = ref.brand<'ArtifactId'>()
const datasetId = ref.brand<'DatasetId'>()
const datasetRevision = z.number().int().nonnegative().brand<'DatasetRevision'>()
const uiStateRevision = z.number().int().nonnegative().brand<'UIStateRevision'>()
const fareId = ref.brand<'FareId'>()
const transportMode = z.enum(['train', 'bus', 'flight', 'ferry'])
const sortSpec = z.strictObject({
  field: z.enum(['priceCents', 'durationMinutes', 'departureMinutes']),
  direction: z.enum(['asc', 'desc']),
})
const travelFilters = z.strictObject({
  modes: z.array(transportMode).max(4),
  carrierIds: z.array(ref).max(20),
  minPriceCents: z.number().int().nonnegative().optional(),
  maxPriceCents: z.number().int().nonnegative().optional(),
  maxDurationMinutes: z.number().int().positive().optional(),
  directOnly: z.boolean(),
})

export const ResourceKeySchema = ref.brand<'ResourceKey'>()
export type ResourceKey = z.infer<typeof ResourceKeySchema>

export const ResultKeySchema = ref.brand<'ResultKey'>()
export type ResultKey = z.infer<typeof ResultKeySchema>

export const FareLegSchema = z.strictObject({
  legIndex: z.number().int().min(0).max(7),
  mode: transportMode,
  carrierName: z.string().trim().min(1).max(120),
  durationMinutes: z.number().int().positive(),
  originId: ref,
  destinationId: ref,
  originLabel: z.string().trim().min(1).max(160),
  destinationLabel: z.string().trim().min(1).max(160),
})
export type FareLeg = z.infer<typeof FareLegSchema>

export const FareItemSchema = z.strictObject({
  id: fareId,
  originId: ref,
  destinationId: ref,
  serviceDate: date,
  mode: transportMode,
  carrierId: ref,
  carrierName: z.string().trim().min(1).max(120).nullable(),
  priceCents: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  departureMinutes: z.number().int().min(0).max(1439),
  availableSeats: z.number().int().nonnegative(),
  currency: z.literal('EUR'),
  synthetic: z.literal(true),
  priceBasis: z.literal('per-passenger-including-demo-fees'),
  direct: z.boolean(),
  legs: z.array(FareLegSchema).max(8),
}).superRefine((fare, context) => {
  if (fare.legs.some((leg, index) => leg.legIndex !== index)) {
    context.addIssue({ code: 'custom', path: ['legs'], message: 'Fare legs must use consecutive ordered indices' })
  }
  if (fare.direct !== (fare.legs.length <= 1)) {
    context.addIssue({ code: 'custom', path: ['direct'], message: 'Direct flag must match the ordered fare legs' })
  }
  const first = fare.legs[0]
  const last = fare.legs.at(-1)
  if (first && first.originId !== fare.originId) {
    context.addIssue({ code: 'custom', path: ['legs', 0, 'originId'], message: 'First fare leg must start at the fare origin' })
  }
  if (last && last.destinationId !== fare.destinationId) {
    context.addIssue({ code: 'custom', path: ['legs', fare.legs.length - 1, 'destinationId'], message: 'Last fare leg must end at the fare destination' })
  }
  fare.legs.slice(1).forEach((leg, index) => {
    if (fare.legs[index]?.destinationId !== leg.originId) {
      context.addIssue({ code: 'custom', path: ['legs', index + 1, 'originId'], message: 'Fare legs must form a continuous route' })
    }
  })
})
export type FareItem = z.infer<typeof FareItemSchema>

export const SelectedFarePinSchema = z.strictObject({
  fareId,
  resourceKey: ResourceKeySchema,
  sourceVersion: ref,
})
export type SelectedFarePin = z.infer<typeof SelectedFarePinSchema>

const DateWindowSchema = z.strictObject({ from: date, to: date })
  .refine(value => value.to >= value.from, 'Invalid date order')

export const FareScopeSchema = z.strictObject({
  kind: z.literal('fareScope'),
  originId: ref,
  destinationId: ref,
  dateWindow: DateWindowSchema,
  passengers: z.number().int().min(1).max(8),
  earliestDeparture: z.strictObject({
    date,
    minutes: z.number().int().min(0).max(1439),
  }),
}).refine(value => value.originId !== value.destinationId, 'Destination must differ from origin')
export type FareScope = z.infer<typeof FareScopeSchema>

export const FareSourceSchema = z.strictObject({
  kind: z.literal('search'),
  descriptorId: ResourceKeySchema,
  sourceVersion: ref,
})
export type FareSource = z.infer<typeof FareSourceSchema>

export const FareScopeManifestSchema = z.strictObject({
  kind: z.literal('fareScopeManifest'),
  resourceKey: ResourceKeySchema,
  source: FareSourceSchema,
  coverage: FareScopeSchema,
  totalAvailable: z.number().int().nonnegative(),
  availableModes: z.array(transportMode).max(4),
  availableDateWindow: DateWindowSchema.nullable(),
  complete: z.boolean(),
}).superRefine((manifest, context) => {
  const requested = manifest.coverage.dateWindow
  const available = manifest.availableDateWindow
  const coversRequest = available?.from === requested.from && available.to === requested.to
  if (manifest.complete !== coversRequest) {
    context.addIssue({ code: 'custom', path: ['complete'], message: 'Complete scope must cover the full requested date window' })
  }
  if (available && (available.from < requested.from || available.to > requested.to)) {
    context.addIssue({ code: 'custom', path: ['availableDateWindow'], message: 'Available date window must be inside the requested scope' })
  }
  if (available === null && (manifest.totalAvailable !== 0 || manifest.availableModes.length !== 0)) {
    context.addIssue({ code: 'custom', path: ['availableDateWindow'], message: 'Unavailable scope cannot report fares or modes' })
  }
  if (manifest.source.descriptorId !== manifest.resourceKey) {
    context.addIssue({ code: 'custom', path: ['source', 'descriptorId'], message: 'Source descriptor must match the logical resource key' })
  }
  if (new Set(manifest.availableModes).size !== manifest.availableModes.length) {
    context.addIssue({ code: 'custom', path: ['availableModes'], message: 'Available modes must be unique' })
  }
})
export type FareScopeManifest = z.infer<typeof FareScopeManifestSchema>

export const FareScopeBindingSchema = z.strictObject({
  resourceKey: ResourceKeySchema,
  datasetId,
  datasetRevision,
  manifest: FareScopeManifestSchema,
}).superRefine((binding, context) => {
  if (binding.resourceKey !== binding.manifest.resourceKey) {
    context.addIssue({ code: 'custom', path: ['resourceKey'], message: 'Binding resource key must match its manifest' })
  }
  if (String(binding.datasetId) !== binding.resourceKey) {
    context.addIssue({ code: 'custom', path: ['datasetId'], message: 'Dataset ID must match the logical resource key' })
  }
})
export type FareScopeBinding = z.infer<typeof FareScopeBindingSchema>

export const ProjectionFiltersSchema = travelFilters.superRefine((filters, context) => {
  if (new Set(filters.modes).size !== filters.modes.length) {
    context.addIssue({ code: 'custom', path: ['modes'], message: 'Duplicate transport mode' })
  }
  if (new Set(filters.carrierIds).size !== filters.carrierIds.length) {
    context.addIssue({ code: 'custom', path: ['carrierIds'], message: 'Duplicate carrier' })
  }
  if (filters.minPriceCents !== undefined && filters.maxPriceCents !== undefined && filters.minPriceCents > filters.maxPriceCents) {
    context.addIssue({ code: 'custom', path: ['maxPriceCents'], message: 'Maximum price must not be below minimum price' })
  }
})
export type ProjectionFilters = z.infer<typeof ProjectionFiltersSchema>

const ProjectionBaseSchema = z.strictObject({ projectionId: ref })

export const FarePageRequestSchema = ProjectionBaseSchema.extend({
  kind: z.literal('farePage'),
  filters: ProjectionFiltersSchema,
  serviceDate: date.nullable(),
  sort: sortSpec,
  after: z.string().min(1).max(2048).nullable(),
  limit: z.number().int().min(1).max(100),
})

export const CalendarDaysRequestSchema = ProjectionBaseSchema.extend({
  kind: z.literal('calendarDays'),
  filters: ProjectionFiltersSchema,
  objective: z.enum(['cheapest', 'fastest']),
})

export const CarrierFacetsRequestSchema = ProjectionBaseSchema.extend({
  kind: z.literal('carrierFacets'),
  filters: ProjectionFiltersSchema,
})

export const ModeSummaryRequestSchema = ProjectionBaseSchema.extend({
  kind: z.literal('modeSummary'),
  filters: ProjectionFiltersSchema,
  baseline: z.enum(['withoutModeFilter', 'active']),
})

export const FareHighlightsRequestSchema = ProjectionBaseSchema.extend({
  kind: z.literal('fareHighlights'),
  filters: ProjectionFiltersSchema,
})

export const ProjectionRequestSchema = z.discriminatedUnion('kind', [
  FarePageRequestSchema,
  CalendarDaysRequestSchema,
  CarrierFacetsRequestSchema,
  ModeSummaryRequestSchema,
  FareHighlightsRequestSchema,
])
export type ProjectionRequest = z.infer<typeof ProjectionRequestSchema>

export const QueryGroupRequestSchema = z.strictObject({
  groupId: ref,
  scope: FareScopeSchema,
  projections: z.array(ProjectionRequestSchema).max(8),
}).superRefine((group, context) => {
  const ids = group.projections.map(projection => projection.projectionId)
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', path: ['projections'], message: 'Duplicate projection ID' })
  }
})
export type QueryGroupRequest = z.infer<typeof QueryGroupRequestSchema>

export const QueryGroupsRequestSchema = z.strictObject({
  version: z.literal(1),
  requestId: ref,
  expectedSourceVersion: ref.nullable(),
  groups: z.array(QueryGroupRequestSchema).min(1).max(8),
}).superRefine((request, context) => {
  const ids = request.groups.map(group => group.groupId)
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', path: ['groups'], message: 'Duplicate group ID' })
  }
})
export type QueryGroupsRequest = z.infer<typeof QueryGroupsRequestSchema>

const ProjectionResultBaseSchema = z.strictObject({
  projectionId: ref,
  inputHash: hash,
  resultFingerprint: hash,
})

export const FarePageResultSchema = ProjectionResultBaseSchema.extend({
  kind: z.literal('farePage'),
  items: z.array(FareItemSchema).max(100),
  pageInfo: z.strictObject({
    total: z.number().int().nonnegative(),
    returned: z.number().int().nonnegative().max(100),
    hasNextPage: z.boolean(),
    nextCursor: z.string().min(1).max(2048).nullable(),
  }),
}).superRefine((result, context) => {
  if (result.pageInfo.returned !== result.items.length) {
    context.addIssue({ code: 'custom', path: ['pageInfo', 'returned'], message: 'Returned count must match items' })
  }
  if (result.pageInfo.returned > result.pageInfo.total) {
    context.addIssue({ code: 'custom', path: ['pageInfo', 'returned'], message: 'Returned count exceeds total' })
  }
  if (result.pageInfo.hasNextPage !== (result.pageInfo.nextCursor !== null)) {
    context.addIssue({ code: 'custom', path: ['pageInfo', 'nextCursor'], message: 'Cursor availability mismatch' })
  }
})

export const CalendarDaysResultSchema = ProjectionResultBaseSchema.extend({
  kind: z.literal('calendarDays'),
  days: z.array(z.strictObject({
    date,
    count: z.number().int().nonnegative(),
    representative: FareItemSchema.nullable(),
  })).max(732),
})

export const CarrierFacetsResultSchema = ProjectionResultBaseSchema.extend({
  kind: z.literal('carrierFacets'),
  options: z.array(z.strictObject({
    carrierId: ref,
    carrierName: z.string().trim().min(1).max(120).nullable(),
    count: z.number().int().nonnegative(),
  })).max(100),
})

export const ModeSummaryResultSchema = ProjectionResultBaseSchema.extend({
  kind: z.literal('modeSummary'),
  baseline: z.enum(['withoutModeFilter', 'active']),
  modes: z.array(z.strictObject({
    mode: transportMode,
    count: z.number().int().nonnegative(),
    minPriceCents: z.number().int().nonnegative().nullable(),
    minDurationMinutes: z.number().int().nonnegative().nullable(),
  })).max(4),
})

export const FareHighlightsResultSchema = ProjectionResultBaseSchema.extend({
  kind: z.literal('fareHighlights'),
  cheapest: FareItemSchema.nullable(),
  fastest: FareItemSchema.nullable(),
})

export const ProjectionResultSchema = z.discriminatedUnion('kind', [
  FarePageResultSchema,
  CalendarDaysResultSchema,
  CarrierFacetsResultSchema,
  ModeSummaryResultSchema,
  FareHighlightsResultSchema,
])
export type ProjectionResult = z.infer<typeof ProjectionResultSchema>

export const QueryGroupResultSchema = z.strictObject({
  groupId: ref,
  manifest: FareScopeManifestSchema,
  projections: z.array(ProjectionResultSchema).max(8),
})
export type QueryGroupResult = z.infer<typeof QueryGroupResultSchema>

export const QueryGroupsResponseSchema = z.strictObject({
  version: z.literal(1),
  requestId: ref,
  sourceVersion: ref,
  groups: z.array(QueryGroupResultSchema).min(1).max(8),
})
export type QueryGroupsResponse = z.infer<typeof QueryGroupsResponseSchema>

export const QueryErrorCodeSchema = z.enum([
  'invalidRequest',
  'unknownScope',
  'staleCursor',
  'sourceChanged',
  'databaseUnavailable',
  'internalError',
])
export type QueryErrorCode = z.infer<typeof QueryErrorCodeSchema>

export const QueryErrorResponseSchema = z.strictObject({
  version: z.literal(1),
  requestId: ref,
  error: z.strictObject({ code: QueryErrorCodeSchema, message: z.string().min(1).max(240) }),
})
export type QueryErrorResponse = z.infer<typeof QueryErrorResponseSchema>

export const LookupPinSchema = z.strictObject({ fareId, resourceKey: ResourceKeySchema })
export type LookupPin = z.infer<typeof LookupPinSchema>

const lookupBase = {
  version: z.literal(1),
  requestId: ref,
  sourceVersion: ref,
  pins: z.array(LookupPinSchema).min(1).max(160),
}
const validateLookupPins = (request: { pins: LookupPin[] }, context: z.RefinementCtx) => {
  const keys = request.pins.map(pin => `${pin.resourceKey}\u0000${pin.fareId}`)
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: 'custom', path: ['pins'], message: 'Duplicate lookup pin' })
  }
}

export const LookupPinsInputSchema = z.strictObject(lookupBase).superRefine(validateLookupPins)
export type LookupPinsInput = z.infer<typeof LookupPinsInputSchema>

export const LookupResourceSchema = z.strictObject({ resourceKey: ResourceKeySchema, scope: FareScopeSchema })
export type LookupResource = z.infer<typeof LookupResourceSchema>

export const LookupPinsRequestSchema = z.strictObject({
  ...lookupBase,
  resources: z.array(LookupResourceSchema).min(1).max(160),
}).superRefine((request, context) => {
  validateLookupPins(request, context)
  const resourceKeys = request.resources.map(resource => resource.resourceKey)
  if (new Set(resourceKeys).size !== resourceKeys.length) {
    context.addIssue({ code: 'custom', path: ['resources'], message: 'Duplicate lookup resource' })
  }
  const declared = new Set(resourceKeys)
  request.pins.forEach((pin, index) => {
    if (!declared.has(pin.resourceKey)) {
      context.addIssue({ code: 'custom', path: ['pins', index, 'resourceKey'], message: 'Undeclared lookup resource' })
    }
  })
})
export type LookupPinsRequest = z.infer<typeof LookupPinsRequestSchema>

export const LookupPinsResponseSchema = z.strictObject({
  version: z.literal(1),
  requestId: ref,
  sourceVersion: ref,
  items: z.array(FareItemSchema).max(160),
  missingPins: z.array(LookupPinSchema).max(160),
})
export type LookupPinsResponse = z.infer<typeof LookupPinsResponseSchema>

export const QueryIntentIdentitySchema = z.strictObject({
  queryKey: ref,
  groupKey: ref,
  projectionKey: ref,
  desiredInputHash: hash,
  desiredInputVersion: z.number().int().positive(),
  uiRevision: uiStateRevision,
})
export type QueryIntentIdentity = z.infer<typeof QueryIntentIdentitySchema>

export const QueryResultIdentitySchema = z.strictObject({
  resultKey: ResultKeySchema,
  inputHash: hash,
  inputVersion: z.number().int().positive(),
  requestId: ref,
  resourceKey: ResourceKeySchema,
  datasetId,
  datasetRevision,
  sourceVersion: ref,
  resultFingerprint: hash,
  total: z.number().int().nonnegative(),
  truncated: z.boolean(),
})
export type QueryResultIdentity = z.infer<typeof QueryResultIdentitySchema>

export const QueryExecutionStateSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('loading'), intent: QueryIntentIdentitySchema }),
  z.strictObject({ status: z.literal('ready'), intent: QueryIntentIdentitySchema, current: QueryResultIdentitySchema }),
  z.strictObject({ status: z.literal('refreshing'), intent: QueryIntentIdentitySchema, current: QueryResultIdentitySchema }),
  z.strictObject({ status: z.literal('error'), intent: QueryIntentIdentitySchema, previous: QueryResultIdentitySchema.optional() }),
])
export type QueryExecutionState = z.infer<typeof QueryExecutionStateSchema>

export const ProjectionResultSnapshotSchema = z.strictObject({
  identity: QueryResultIdentitySchema,
  projection: ProjectionResultSchema,
})
export type ProjectionResultSnapshot = z.infer<typeof ProjectionResultSnapshotSchema>

export interface FareProjectionBridge {
  loadScope(scope: FareScope, signal: AbortSignal): Promise<FareScopeManifest>
  refreshScope(scope: FareScope, signal: AbortSignal): Promise<FareScopeManifest>
  executeGroup(group: QueryGroupRequest, signal: AbortSignal): Promise<QueryGroupResult>
  lookupPins(input: LookupPinsInput, signal: AbortSignal): Promise<LookupPinsResponse>
  getManifest(resourceKey: ResourceKey): FareScopeManifest
  subscribe(resourceKey: ResourceKey, listener: () => void): () => void
  release(resourceKey: ResourceKey): void
  dispose(): void
}

export type ComponentFunction =
  | { kind: 'orderedFares' }
  | { kind: 'dayFares' }
  | { kind: 'calendarDays' }
  | { kind: 'carrierFacets' }
  | { kind: 'modeStats'; baseline: 'withoutModeFilter' | 'active' }
  | { kind: 'fareHighlights' }
  | { kind: 'selectedFacts' }
  | { kind: 'coverage' }
  | { kind: 'locationOptions' }

export const QueryGroupScopeSchema = z.strictObject({
  artifactId,
  legKey: ref,
  purpose: ref,
})
export type QueryGroupScope = z.infer<typeof QueryGroupScopeSchema>
