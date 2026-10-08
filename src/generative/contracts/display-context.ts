import { z } from 'zod'
import { QueryExecutionStateSchema, QueryGroupScopeSchema } from './query-groups'

const ref = z.string().min(1).max(160).regex(/^[a-zA-Z0-9_.:-]+$/)
const componentRefValue = z.string().min(1).max(240).regex(/^[a-zA-Z0-9_.:-]+$/)
const text = z.string().max(240)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const fareId = ref

export const DISPLAY_CONTEXT_VERSION = 1
export const DISPLAY_LIMITS = Object.freeze({
  components: 80,
  orderedFareRefs: 100,
  cells: 62,
  interactions: 32,
  shownFacts: 12,
  inspectItems: 5,
})

export const ComponentRefSchema = z.strictObject({
  value: componentRefValue,
  keySource: z.enum(['authored-key', 'tree-path']),
})
export type ComponentRef = z.infer<typeof ComponentRefSchema>

export const InputOriginSchema = z.enum(['user', 'agent', 'default', 'derived', 'unknown'])
export type InputOrigin = z.infer<typeof InputOriginSchema>

export const InputFieldSchema = z.enum([
  'originId',
  'destinationId',
  'dateWindow',
  'serviceDate',
  'passengers',
  'modes',
  'carrierIds',
  'minPriceCents',
  'maxPriceCents',
  'maxDurationMinutes',
  'directOnly',
  'sort',
  'earliestDeparture',
  'selectedDate',
  'stayNights',
  'cursor',
  'limit',
])
export type InputField = z.infer<typeof InputFieldSchema>

export const InputProvenanceSchema = z.strictObject({
  field: InputFieldSchema,
  origin: InputOriginSchema,
  eventSequence: z.number().int().nonnegative().optional(),
  componentRef: componentRefValue.optional(),
  derivedFrom: z.array(InputFieldSchema).max(8).optional(),
})
export type InputProvenance = z.infer<typeof InputProvenanceSchema>

export const EffectiveInputsSchema = z.strictObject({
  originId: ref.optional(),
  destinationId: ref.optional(),
  dateWindow: z.strictObject({ from: date, to: date }).optional(),
  serviceDate: date.nullable().optional(),
  passengers: z.number().int().min(1).max(8).optional(),
  modes: z.array(z.enum(['train', 'bus', 'flight', 'ferry'])).max(4).optional(),
  carrierIds: z.array(ref).max(20).optional(),
  minPriceCents: z.number().int().nonnegative().optional(),
  maxPriceCents: z.number().int().nonnegative().optional(),
  maxDurationMinutes: z.number().int().positive().optional(),
  directOnly: z.boolean().optional(),
  sort: z.strictObject({
    field: z.enum(['priceCents', 'durationMinutes', 'departureMinutes']),
    direction: z.enum(['asc', 'desc']),
  }).optional(),
  earliestDeparture: z.strictObject({ serviceDate: date, departureMinutes: z.number().int().min(0).max(1439) }).optional(),
  selectedDate: date.optional(),
  stayNights: z.number().int().min(0).max(30).optional(),
  cursor: z.string().min(1).max(512).nullable().optional(),
  limit: z.number().int().min(1).max(100).optional(),
})
export type EffectiveInputs = z.infer<typeof EffectiveInputsSchema>

export const DisplayScopeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('artifact'), artifactId: ref }),
  z.strictObject({ kind: z.literal('leg'), artifactId: ref, legIndex: z.number().int().min(0).max(7), legKey: ref, resourceKey: ref }),
  z.strictObject({ kind: z.literal('selection'), artifactId: ref }),
])
export type DisplayScope = z.infer<typeof DisplayScopeSchema>

export const ComponentIdentitySchema = z.strictObject({
  componentRef: ComponentRefSchema,
  componentType: ref,
  scope: DisplayScopeSchema,
  authored: z.strictObject({
    title: text.optional(),
    body: text.optional(),
    variant: z.enum(['default', 'compact', 'emphasis']).optional(),
    actionRef: ref.optional(),
    selectorRef: ref.optional(),
  }),
})
export type ComponentIdentity = z.infer<typeof ComponentIdentitySchema>

export const DisplayVisibilitySchema = z.enum(['visible', 'hidden-tab', 'offscreen', 'unknown'])
export type DisplayVisibility = z.infer<typeof DisplayVisibilitySchema>

export const OrderedFareRefSchema = z.strictObject({
  fareId,
  rank: z.number().int().positive(),
  label: text.optional(),
})
export type OrderedFareRef = z.infer<typeof OrderedFareRefSchema>

export const DisplayCellSchema = z.strictObject({
  key: ref,
  label: text,
  value: z.number().finite().optional(),
  unit: z.enum(['count', 'priceCents', 'durationMinutes']).optional(),
  fareId: fareId.optional(),
  available: z.boolean().optional(),
})
export type DisplayCell = z.infer<typeof DisplayCellSchema>

const orderedFareRefs = z.array(OrderedFareRefSchema).max(DISPLAY_LIMITS.orderedFareRefs)
const displayCells = z.array(DisplayCellSchema).max(DISPLAY_LIMITS.cells)
export const DisplayPayloadSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('fare-order'),
    orderedFareRefs,
    renderedRange: z.strictObject({ fromRank: z.number().int().positive(), toRank: z.number().int().positive() }).optional(),
    viewport: z.strictObject({ offset: z.number().int().nonnegative(), limit: z.number().int().positive().max(100), cursor: z.string().max(512).optional() }).optional(),
    selectedFareId: fareId.optional(),
  }),
  z.strictObject({ kind: z.literal('fare-highlights'), items: z.array(z.strictObject({ label: text, fareId: fareId.optional() })).max(8) }),
  z.strictObject({ kind: z.literal('calendar'), selectedDate: date.optional(), cells: displayCells }),
  z.strictObject({ kind: z.literal('aggregate'), cells: displayCells }),
  z.strictObject({ kind: z.literal('plot'), orderedFareRefs }),
  z.strictObject({ kind: z.literal('selection'), orderedFareRefs, totalPriceCents: z.number().int().nonnegative().optional(), passengers: z.number().int().min(1).max(8).optional() }),
  z.strictObject({ kind: z.literal('route'), cityIds: z.array(ref).max(9) }),
  z.strictObject({ kind: z.literal('coverage'), entries: z.array(z.strictObject({ resourceKey: ref, complete: z.boolean(), truncated: z.boolean(), totalAvailable: z.number().int().nonnegative() })).max(8) }),
  z.strictObject({ kind: z.literal('status'), label: text }),
  z.strictObject({ kind: z.literal('layout'), activeChildRef: componentRefValue.optional(), childRefs: z.array(componentRefValue).max(24) }),
])
export type DisplayPayload = z.infer<typeof DisplayPayloadSchema>

export const DisplayRepresentationSchema = z.strictObject({
  payload: DisplayPayloadSchema,
  totalDisplayed: z.number().int().nonnegative(),
  includedCount: z.number().int().nonnegative(),
  complete: z.boolean(),
  omittedCount: z.number().int().nonnegative(),
  displayHandle: ref.optional(),
}).superRefine((value, context) => {
  if (value.includedCount > value.totalDisplayed) context.addIssue({ code: 'custom', message: 'Included display count exceeds total displayed' })
  if (value.complete && value.omittedCount !== 0) context.addIssue({ code: 'custom', message: 'Complete display cannot omit entries' })
  if (!value.complete && value.omittedCount === 0) context.addIssue({ code: 'custom', message: 'Incomplete display must report omissions' })
})
export type DisplayRepresentation = z.infer<typeof DisplayRepresentationSchema>

export const DisplayLedgerEntrySchema = z.strictObject({
  identity: ComponentIdentitySchema,
  group: QueryGroupScopeSchema.optional(),
  inputs: EffectiveInputsSchema,
  provenance: z.array(InputProvenanceSchema).max(InputFieldSchema.options.length),
  execution: QueryExecutionStateSchema.optional(),
  display: DisplayRepresentationSchema.optional(),
  visibility: DisplayVisibilitySchema,
  renderOrder: z.number().int().nonnegative(),
})
export type DisplayLedgerEntry = z.infer<typeof DisplayLedgerEntrySchema>

const boundedFact = z.strictObject({
  id: fareId,
  mode: z.enum(['train', 'bus', 'flight', 'ferry']),
  carrierId: ref,
  carrierName: z.string().trim().min(1).max(120).nullish(),
  priceCents: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  serviceDate: date,
  departureMinutes: z.number().int().min(0).max(1439),
  originId: ref,
  destinationId: ref,
  currency: z.literal('EUR'),
  synthetic: z.literal(true),
  priceBasis: z.literal('per-passenger-including-demo-fees'),
  direct: z.boolean(),
  legs: z.array(z.strictObject({
    legIndex: z.number().int().nonnegative().max(7),
    mode: z.enum(['train', 'bus', 'flight', 'ferry']),
    carrierName: z.string().trim().min(1).max(120),
    durationMinutes: z.number().int().positive(),
    originId: ref,
    destinationId: ref,
    originLabel: text,
    destinationLabel: text,
  })).min(1).max(8),
}).superRefine((value, context) => {
  if (value.direct !== (value.legs.length <= 1)) context.addIssue({ code: 'custom', message: 'Directness must match the ordered fare legs' })
  value.legs.forEach((leg, index) => {
    if (leg.legIndex !== index) context.addIssue({ code: 'custom', message: 'Fare legs must be ordered and contiguous', path: ['legs', index, 'legIndex'] })
  })
})

export const DisplayedFareFactSchema = z.strictObject({
  sourceVersion: ref,
  fact: boundedFact,
  displayedBy: z.array(z.strictObject({ componentRef: componentRefValue, rank: z.number().int().positive().optional(), label: text.optional() })).min(1).max(16),
})
export type DisplayedFareFact = z.infer<typeof DisplayedFareFactSchema>

export const SemanticInteractionSchema = z.strictObject({
  sequence: z.number().int().nonnegative(),
  artifactId: ref,
  componentRef: componentRefValue.optional(),
  actor: z.enum(['user', 'agent', 'derived']),
  action: z.enum(['input', 'select', 'deselect', 'activate-tab', 'scroll', 'retry']),
  inputFields: z.array(InputFieldSchema).max(InputFieldSchema.options.length),
})
export type SemanticInteraction = z.infer<typeof SemanticInteractionSchema>

export const FrozenDisplayContextSchema = z.strictObject({
  version: z.literal(DISPLAY_CONTEXT_VERSION),
  captureId: ref,
  components: z.array(DisplayLedgerEntrySchema).max(DISPLAY_LIMITS.components),
  activeViews: z.array(componentRefValue).max(DISPLAY_LIMITS.components),
  exposedOrderedIds: z.array(fareId).max(DISPLAY_LIMITS.orderedFareRefs),
  shownFareFacts: z.array(DisplayedFareFactSchema).max(DISPLAY_LIMITS.shownFacts),
  recentInteractions: z.array(SemanticInteractionSchema).max(DISPLAY_LIMITS.interactions),
  completeness: z.strictObject({
    complete: z.boolean(),
    omittedComponents: z.number().int().nonnegative(),
    omittedFacts: z.number().int().nonnegative(),
  }),
})
export type FrozenDisplayContext = z.infer<typeof FrozenDisplayContextSchema>

export const InspectDisplayInputSchema = z.strictObject({
  captureId: ref,
  displayHandle: ref,
  resultKey: ref,
  sourceVersion: ref.optional(),
  itemIds: z.array(ref).max(DISPLAY_LIMITS.inspectItems).optional(),
  cursor: z.string().max(512).optional(),
  limit: z.number().int().min(1).max(DISPLAY_LIMITS.inspectItems).default(DISPLAY_LIMITS.inspectItems),
})
export type InspectDisplayInput = z.input<typeof InspectDisplayInputSchema>

export const InspectDisplayItemSchema = z.strictObject({
  itemId: ref,
  rank: z.number().int().positive().optional(),
  label: text.optional(),
  fact: boundedFact.optional(),
  cell: DisplayCellSchema.optional(),
})
export type InspectDisplayItem = z.infer<typeof InspectDisplayItemSchema>

export const InspectDisplayOutputSchema = z.strictObject({
  captureId: ref,
  displayHandle: ref,
  resultKey: ref,
  componentRef: componentRefValue,
  inputHash: ref,
  resultFingerprint: ref,
  sourceVersion: ref,
  items: z.array(InspectDisplayItemSchema).max(DISPLAY_LIMITS.inspectItems),
  nextCursor: z.string().max(512).optional(),
  complete: z.boolean(),
})
export type InspectDisplayOutput = z.infer<typeof InspectDisplayOutputSchema>

export const InspectDisplayErrorSchema = z.strictObject({
  status: z.literal('error'),
  code: z.enum(['unknownCapture', 'unknownDisplay', 'resultMismatch', 'sourceMismatch', 'unknownItem', 'expiredCapture']),
  message: z.string().min(1).max(160),
})
export type InspectDisplayError = z.infer<typeof InspectDisplayErrorSchema>
