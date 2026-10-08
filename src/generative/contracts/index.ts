import { z } from 'zod';
import { FrozenDisplayContextSchema } from './display-context';
import { FareLegSchema, FareScopeBindingSchema } from './query-groups';

export const CONTRACT_VERSION = '2.0.0';
export const CATALOG_VERSION = '1.1.0';
export const LIMITS = Object.freeze({ snapshotBytes: 24_000, artifacts: 8, storedArtifacts: 20, artifactDatasets: 8, datasetBindings: 64, snapshotDatasets: 8 * 8, passengers: 8, plannedFares: 20 * 8, selectedFacts: 20 * 8, queryRows: 100, queryGroups: 30, treeNodes: 80, treeDepth: 8, toolCalls: 12, factBudget: 12 });
const ref = z.string().min(1).max(96).regex(/^[a-zA-Z0-9_.:-]+$/);
const revision = z.number().int().nonnegative();
export const DatasetIdSchema = ref.brand<'DatasetId'>();
export const DatasetRevisionSchema = revision.brand<'DatasetRevision'>();
export const ArtifactIdSchema = ref.brand<'ArtifactId'>();
export const UIStateRevisionSchema = revision.brand<'UIStateRevision'>();
export const FareIdSchema = ref.brand<'FareId'>();
export type DatasetId = z.infer<typeof DatasetIdSchema>;
export type DatasetRevision = z.infer<typeof DatasetRevisionSchema>;
export type ArtifactId = z.infer<typeof ArtifactIdSchema>;
export type UIStateRevision = z.infer<typeof UIStateRevisionSchema>;
export type FareId = z.infer<typeof FareIdSchema>;
export const TransportModeSchema = z.enum(['train', 'bus', 'flight', 'ferry']);
export type TransportMode = z.infer<typeof TransportModeSchema>;
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value), 'Invalid calendar date');
const dateWindow = z.strictObject({ from: DateSchema, to: DateSchema }).refine(value => value.to >= value.from, 'Invalid date order');
export const CoverageRequestSchema = z.strictObject({
  originIds: z.array(ref).min(1).max(8), destinationIds: z.array(ref).min(1).max(8), dateWindow,
  modes: z.array(TransportModeSchema).min(1).max(4), passengers: z.number().int().min(1).max(LIMITS.passengers),
});
export type CoverageRequest = z.infer<typeof CoverageRequestSchema>;
export const CoverageSchema = CoverageRequestSchema.extend({ complete: z.boolean(), truncated: z.boolean() }).refine(value => !(value.complete && value.truncated), 'Truncated coverage cannot be complete');
export type Coverage = z.infer<typeof CoverageSchema>;
const FareRowBaseSchema = z.strictObject({
  id: FareIdSchema, originId: ref, destinationId: ref, serviceDate: DateSchema, mode: TransportModeSchema,
  carrierId: ref, carrierName: z.string().trim().min(1).max(120).nullish(), priceCents: z.number().int().nonnegative(), durationMinutes: z.number().int().positive(),
  departureMinutes: z.number().int().min(0).max(1439), availableSeats: z.number().int().nonnegative(),
  currency: z.literal('EUR'), synthetic: z.literal(true), priceBasis: z.literal('per-passenger-including-demo-fees'),
  direct: z.boolean(),
  legs: z.array(FareLegSchema).max(8),
});
export const FareRowSchema = FareRowBaseSchema.superRefine((fare, context) => {
  if (fare.legs.some((leg, index) => leg.legIndex !== index)) context.addIssue({code:'custom',path:['legs'],message:'Fare legs must use consecutive ordered indices'});
  if (fare.direct !== (fare.legs.length <= 1)) context.addIssue({code:'custom',path:['direct'],message:'Direct flag must match the ordered fare legs'});
});
export type FareRow = z.infer<typeof FareRowSchema>;
export const FareFieldSchema = FareRowBaseSchema.omit({legs:true}).keyof();
export type AllowedFareField = z.infer<typeof FareFieldSchema>;
export const DatasetFieldManifestSchema = z.strictObject({
  name: FareFieldSchema, type: z.enum(['string', 'number', 'boolean']), nullable: z.boolean(),
  filterable: z.boolean(), groupable: z.boolean(), joinKey: z.boolean(),
}).refine(field=>field.name==='carrierName'||!field.nullable,'Only carrierName can be nullable');
export type DatasetFieldManifest = z.infer<typeof DatasetFieldManifestSchema>;
export const CompactSummarySchema = z.strictObject({
  minPriceCents: z.number().int().nonnegative().optional(), maxPriceCents: z.number().int().nonnegative().optional(),
  minDurationMinutes: z.number().int().nonnegative().optional(), maxDurationMinutes: z.number().int().nonnegative().optional(),
  modeCounts: z.partialRecord(TransportModeSchema, z.number().int().nonnegative()),
});
export const DatasetManifestSchema = z.strictObject({
  datasetId: DatasetIdSchema, revision: DatasetRevisionSchema, schemaVersion: z.literal(CONTRACT_VERSION),
  coverage: CoverageSchema, rowCount: z.number().int().nonnegative().max(1_000_000),
  fields: z.array(DatasetFieldManifestSchema).min(1).max(20), compactSummary: CompactSummarySchema,
  source: z.strictObject({ kind: z.enum(['search', 'synthetic-fixture']), descriptorId: ref, sourceVersion: ref }),
});
export type DatasetManifest = z.infer<typeof DatasetManifestSchema>;
export const TravelFiltersSchema = z.strictObject({
  modes: z.array(TransportModeSchema).max(4), carrierIds: z.array(ref).max(20),
  minPriceCents: z.number().int().nonnegative().optional(), maxPriceCents: z.number().int().nonnegative().optional(),
  maxDurationMinutes: z.number().int().positive().optional(), directOnly: z.boolean(),
});
export type TravelFilters = z.infer<typeof TravelFiltersSchema>;
export const SortSpecSchema = z.strictObject({ field: z.enum(['priceCents', 'durationMinutes', 'departureMinutes']), direction: z.enum(['asc', 'desc']) });
export type SortSpec = z.infer<typeof SortSpecSchema>;
export const StayAllocationSchema = z.strictObject({ cityId: ref, nights: z.number().int().min(0).max(30) });
export type StayAllocation = z.infer<typeof StayAllocationSchema>;
export const CitySequenceSchema = z.array(ref).max(9).refine(sequence => {
  const visits = sequence.at(-1) === sequence[0] ? sequence.slice(0, -1) : sequence
  return new Set(visits).size === visits.length
}, 'A route may visit each city once, with an optional final return to the origin');
export const LegThresholdSchema = z.strictObject({
  legKey: ref, originId: ref, destinationId: ref, earliestDeparture: z.string().datetime(),
  source: z.enum(['trip-date','selected-arrival']), precedingFareId: FareIdSchema.optional(), selectedFareId: FareIdSchema.optional(),
});
export type LegThresholdSummary = z.infer<typeof LegThresholdSchema>;
export const ComponentBindingSchema=z.strictObject({key:ref.optional(),type:ref,legIndex:z.number().int().min(0).max(7).optional(),legKey:ref.optional(),datasetRef:DatasetIdSchema.optional(),actionRef:ref.optional(),selectorRef:ref.optional()});
export type ComponentBinding=z.infer<typeof ComponentBindingSchema>;
export const RuntimeVariablesSchema=z.record(z.string().regex(/^\$[A-Za-z][A-Za-z0-9_]{0,39}$/),z.union([z.string().max(160),z.number().finite(),z.boolean(),z.null()])).refine(value=>Object.keys(value).length<=16,'Runtime variable count exceeded');
export const ArtifactUIStateSchema = z.strictObject({
  artifactId: ArtifactIdSchema, revision: UIStateRevisionSchema, runtimeVariables: RuntimeVariablesSchema.default({}), datasetRefs: z.array(DatasetIdSchema).max(LIMITS.artifactDatasets),
  datasetBindings: z.record(DatasetIdSchema, ref).refine(value=>Object.keys(value).length<=LIMITS.datasetBindings,'Dataset binding count exceeded').default({}),
  filters: TravelFiltersSchema, dates: z.strictObject({ start: DateSchema, end: DateSchema.optional() }),
  citySequence: CitySequenceSchema.default([]), stays: z.array(StayAllocationSchema).max(8), modesByLeg: z.record(ref, z.array(TransportModeSchema).max(4)),
  availableModesByLeg:z.record(ref,z.array(TransportModeSchema).max(4)).default({}),requestedModesByLeg:z.record(ref,z.array(TransportModeSchema).max(4)).default({}),displayWindowByLeg:z.record(ref,dateWindow).default({}),
  sortByLeg:z.record(ref,SortSpecSchema).default({}),calendarDateByLeg:z.record(ref,DateSchema).default({}),
  sort: SortSpecSchema, selectedFareIds: z.array(FareIdSchema).max(8),
  pending: z.array(z.strictObject({ requestId: ref, kind: z.enum(['load', 'query']) })).max(8), lastInteractionAt: z.string().datetime(),
});
export type ArtifactUIState = z.infer<typeof ArtifactUIStateSchema>;
export const ExecutionGuardSchema = z.strictObject({ turnId: ref, artifactId: ArtifactIdSchema, uiStateRevision: UIStateRevisionSchema,
  requestId: ref, datasetId: DatasetIdSchema.optional(), datasetRevision: DatasetRevisionSchema.optional() });
export type ExecutionGuard = z.infer<typeof ExecutionGuardSchema>;
export const BoundedFareFactSchema = z.strictObject({ id: FareIdSchema, mode: TransportModeSchema, carrierId: ref, carrierName: z.string().trim().min(1).max(120).nullish(),
  priceCents: z.number().int().nonnegative(), durationMinutes: z.number().int().positive(), serviceDate: DateSchema,
  departureMinutes: z.number().int().min(0).max(1439), originId: ref, destinationId: ref, currency: z.literal('EUR'),
  synthetic: z.literal(true), priceBasis: z.literal('per-passenger-including-demo-fees'), direct:z.boolean(), legs:z.array(FareLegSchema).max(8) })
  .refine(fare=>fare.direct===(fare.legs.length<=1),{path:['direct'],message:'Direct flag must match the ordered fare legs'});
export type BoundedFareFact = z.infer<typeof BoundedFareFactSchema>;
export const CompactArtifactSnapshotSchema = z.strictObject({ artifactId: ArtifactIdSchema, revision: UIStateRevisionSchema,
  runtimeVariables: RuntimeVariablesSchema.default({}), datasetRefs: z.array(DatasetIdSchema).max(LIMITS.artifactDatasets), selectedFareIds: z.array(FareIdSchema).max(8), filters: TravelFiltersSchema,
  dates: ArtifactUIStateSchema.shape.dates, citySequence: ArtifactUIStateSchema.shape.citySequence, stays: z.array(StayAllocationSchema).max(8), sort: SortSpecSchema,
  sortByLeg:ArtifactUIStateSchema.shape.sortByLeg,calendarDateByLeg:ArtifactUIStateSchema.shape.calendarDateByLeg,
  availableModesByLeg:ArtifactUIStateSchema.shape.availableModesByLeg,requestedModesByLeg:ArtifactUIStateSchema.shape.requestedModesByLeg,displayWindowByLeg:ArtifactUIStateSchema.shape.displayWindowByLeg,
  modesByLeg: ArtifactUIStateSchema.shape.modesByLeg, pending: ArtifactUIStateSchema.shape.pending,
  legThresholds: z.array(LegThresholdSchema).max(8).default([]), componentBindings:z.array(ComponentBindingSchema).max(LIMITS.treeNodes).default([]), layoutSummary: z.string().max(600), catalogVersion: z.literal(CATALOG_VERSION) });
export type CompactArtifactSnapshot = z.infer<typeof CompactArtifactSnapshotSchema>;
export const OlderArtifactSummarySchema=z.strictObject({artifactId:ArtifactIdSchema,variant:z.literal('a'),label:z.string().max(160),revision:UIStateRevisionSchema,lastInteractionAt:z.string().datetime()});
export type OlderArtifactSummary=z.infer<typeof OlderArtifactSummarySchema>;
export const AgentContextEnvelopeSchema = z.strictObject({ schemaVersion: z.literal(CONTRACT_VERSION), turnId: ref,
  activeArtifactId: ArtifactIdSchema.optional(), artifacts: z.array(CompactArtifactSnapshotSchema).max(LIMITS.artifacts),
  olderArtifactSummaries:z.array(OlderArtifactSummarySchema).max(LIMITS.storedArtifacts).default([]),
  datasets: z.array(FareScopeBindingSchema).max(LIMITS.snapshotDatasets), plannedFareIds:z.array(FareIdSchema).max(LIMITS.plannedFares).optional(), selectedFareFacts: z.array(BoundedFareFactSchema).max(LIMITS.selectedFacts),
  displayContext: FrozenDisplayContextSchema });
export type AgentContextEnvelope = z.infer<typeof AgentContextEnvelopeSchema>;
export function parseAgentContext(input: unknown): AgentContextEnvelope {
  const result = AgentContextEnvelopeSchema.parse(input);
  if (new TextEncoder().encode(JSON.stringify(result)).length > LIMITS.snapshotBytes) throw new Error('Snapshot exceeds byte limit');
  if (result.activeArtifactId && !result.artifacts.some(a => a.artifactId === result.activeArtifactId)) throw new Error('Unknown active artifact');
  const fullIds=new Set(result.artifacts.map(artifact=>artifact.artifactId)),summaryIds=result.olderArtifactSummaries.map(artifact=>artifact.artifactId);
  if(new Set(summaryIds).size!==summaryIds.length||summaryIds.some(id=>fullIds.has(id)))throw new Error('Duplicate older artifact summary');
  const datasets = new Set(result.datasets.map(d => d.datasetId));
  if (datasets.size !== result.datasets.length) throw new Error('Duplicate dataset binding');
  if (result.artifacts.some(a => a.datasetRefs.some(id => !datasets.has(id)))) throw new Error('Unknown dataset reference');
  if(result.plannedFareIds&&new Set(result.plannedFareIds).size!==result.plannedFareIds.length)throw new Error('Duplicate planned fare');
  const artifactSelections=result.artifacts.flatMap(a=>a.selectedFareIds)
  if(result.plannedFareIds&&artifactSelections.some(id=>!result.plannedFareIds?.includes(id)))throw new Error('Missing planned fare');
  const selected = new Set(result.plannedFareIds??artifactSelections);
  if (result.selectedFareFacts.some(f => !selected.has(f.id))) throw new Error('Unselected fare fact');
  const componentRefs = result.displayContext.components.map(component => component.identity.componentRef.value);
  if (new Set(componentRefs).size !== componentRefs.length) throw new Error('Duplicate display component reference');
  if (new Set(result.displayContext.activeViews).size !== result.displayContext.activeViews.length) throw new Error('Duplicate active display reference');
  const displayComponents = new Map(result.displayContext.components.map(component => [component.identity.componentRef.value, component]));
  if (result.displayContext.components.some(component => !fullIds.has(ArtifactIdSchema.parse(component.identity.scope.artifactId)))) throw new Error('Display component belongs to an omitted artifact');
  const bindingsByResource=new Map<string,(typeof result.datasets)[number]>(result.datasets.map(binding=>[binding.resourceKey,binding]));
  for(const component of result.displayContext.components){
    if(component.identity.scope.kind!=='leg')continue;
    const artifact=result.artifacts.find(item=>item.artifactId===component.identity.scope.artifactId),binding=bindingsByResource.get(component.identity.scope.resourceKey);
    if(!artifact||!binding||!artifact.datasetRefs.includes(binding.datasetId))throw new Error('Display component uses a resource outside its artifact');
    const execution=component.execution,current=execution?.status==='ready'||execution?.status==='refreshing'?execution.current:execution?.status==='error'?execution.previous:undefined;
    if(current&&current.resourceKey!==component.identity.scope.resourceKey)throw new Error('Displayed result uses a different resource scope');
  }
  if (result.displayContext.activeViews.some(componentRef => !displayComponents.has(componentRef))) throw new Error('Active display reference is missing its component');
  if (result.displayContext.shownFareFacts.some(fact => fact.displayedBy.some(display => !displayComponents.has(display.componentRef)))) throw new Error('Shown fare fact references an omitted component');
  for(const fact of result.displayContext.shownFareFacts){
    const hasVisibleSource=fact.displayedBy.some(owner=>{
      const component=displayComponents.get(owner.componentRef);
      if(!component||component.visibility!=='visible')return false;
      const execution=component.execution,current=execution?.status==='ready'||execution?.status==='refreshing'?execution.current:execution?.status==='error'?execution.previous:undefined;
      if(!current||current.sourceVersion!==fact.sourceVersion)return false;
      const payload=component.display?.payload;
      if(!payload)return false;
      if(payload.kind==='fare-order'){
        const reference=payload.orderedFareRefs.find(item=>item.fareId===fact.fact.id);
        return !!reference&&(!payload.renderedRange||(reference.rank>=payload.renderedRange.fromRank&&reference.rank<=payload.renderedRange.toRank));
      }
      if(payload.kind==='plot'||payload.kind==='selection')return payload.orderedFareRefs.some(item=>item.fareId===fact.fact.id);
      if(payload.kind==='fare-highlights')return payload.items.some(item=>item.fareId===fact.fact.id);
      if(payload.kind==='calendar'||payload.kind==='aggregate')return payload.cells.some(item=>item.fareId===fact.fact.id);
      return false;
    });
    if(!hasVisibleSource)throw new Error('Shown fare fact lacks a visible committed source');
  }
  return result;
}

const scalar = z.union([z.string().max(160), z.number().finite(), z.boolean()]);
export type JsonScalar = z.infer<typeof scalar> | null;
const queryScalar=scalar.nullable();
type QueryValue=z.infer<typeof queryScalar>;
export type PredicateTree = { all: PredicateTree[] } | { any: PredicateTree[] } | { field: AllowedFareField; op: 'eq'|'neq'|'in'|'gte'|'lte'|'between'|'contains'; value: QueryValue | QueryValue[] };
export const PredicateTreeSchema: z.ZodType<PredicateTree> = z.lazy(() => z.union([
  z.strictObject({ all: z.array(PredicateTreeSchema).min(1).max(16) }),
  z.strictObject({ any: z.array(PredicateTreeSchema).min(1).max(16) }),
  z.strictObject({ field: FareFieldSchema, op: z.enum(['eq','neq','in','gte','lte','between','contains']), value: z.union([queryScalar, z.array(queryScalar).min(1).max(20)]) }),
]));
export const QueryIRSchema = z.strictObject({ version: z.literal(1), sources: z.array(z.strictObject({ datasetRef: DatasetIdSchema, alias: ref })).min(1).max(3),
  where: PredicateTreeSchema.optional(), project: z.array(FareFieldSchema).max(16).optional(), groupBy: z.array(FareFieldSchema).max(3).optional(),
  metrics: z.array(z.strictObject({ as: ref, op: z.enum(['count','sum','min','max','avg']), field: FareFieldSchema.optional() })).max(8).optional(),
  groupTop: z.strictObject({ by: FareFieldSchema, direction: z.enum(['asc','desc']) }).optional(),
  orderBy: z.array(z.strictObject({ field: ref, direction: z.enum(['asc','desc']) })).max(3).optional(),
  topK: z.strictObject({ k: z.number().int().min(1).max(5), by: ref, direction: z.enum(['asc','desc']) }).optional(),
  joins: z.array(z.strictObject({ rightAlias: ref, leftKey: FareFieldSchema, rightKey: FareFieldSchema, kind: z.enum(['inner','left']) })).max(2).optional(),
  limit: z.number().int().min(1).max(LIMITS.queryRows),
});
export type QueryIR = z.infer<typeof QueryIRSchema>;
export type ValidatedQueryIR = QueryIR;
export type BoundedQueryResult = { rows: Array<Record<string, JsonScalar>>; total: number; truncated: boolean; datasetRevision: DatasetRevision; requestId: string };
export type UICommand = { artifactId: ArtifactId; expectedRevision?: UIStateRevision } & (
  { kind: 'filters'; filters: TravelFilters } | { kind: 'dates'|'calendarDates'; dates: ArtifactUIState['dates'] } |
  { kind: 'sort'; sort: SortSpec } | {kind:'sortByLeg';sortByLeg:ArtifactUIState['sortByLeg']} | {kind:'calendarDateByLeg';calendarDateByLeg:ArtifactUIState['calendarDateByLeg']} | { kind: 'select'; fareId: FareId; selected: boolean } |
  { kind: 'runtimeVariables'; runtimeVariables: ArtifactUIState['runtimeVariables'] } | { kind: 'modesByLeg'; modesByLeg: ArtifactUIState['modesByLeg'] } | {kind:'availableModesByLeg';availableModesByLeg:ArtifactUIState['availableModesByLeg']} | {kind:'requestedModesByLeg';requestedModesByLeg:ArtifactUIState['requestedModesByLeg']} | {kind:'displayWindowByLeg';displayWindowByLeg:ArtifactUIState['displayWindowByLeg']} | { kind: 'route'; citySequence: ArtifactUIState['citySequence'] } | { kind: 'stays'; stays: StayAllocation[] } | { kind: 'datasets'; datasetRefs: DatasetId[]; datasetBindings?: ArtifactUIState['datasetBindings'] });
export type DispatchResult = { status: 'applied'; revision: UIStateRevision } | { status: 'stale'; revision: UIStateRevision };
export interface FareDataBridge {
  load(request: CoverageRequest, signal: AbortSignal): Promise<DatasetManifest>;
  getManifest(datasetId: DatasetId): DatasetManifest;
  query(input: ValidatedQueryIR, signal: AbortSignal): Promise<BoundedQueryResult>;
  lookupFare(id: FareId, fields: AllowedFareField[]): Promise<BoundedFareFact>;
  subscribe(datasetId: DatasetId, listener: () => void): () => void;
  release(datasetId: DatasetId): void;
  dispose?(): void;
  getCarrierLabel?(carrierId:string,datasetId?:DatasetId):string|undefined;
}
export interface UIStateStore {
  get(artifactId: ArtifactId): ArtifactUIState;
  initializeMissing(artifactId: ArtifactId, defaults: Partial<ArtifactUIState>): void;
  dispatch(command: UICommand): DispatchResult;
  subscribe(artifactId: ArtifactId, listener: () => void): () => void;
  exportSnapshot(artifactId: ArtifactId): CompactArtifactSnapshot;
  getIds?(): ArtifactId[];
  setDatasetBindings?(artifactId:ArtifactId,bindings:ArtifactUIState['datasetBindings']):void;
}
export type ComponentDescriptor = { name: string; description: string; group: 'layout'|'status'|'control'|'view'; props: ReadonlyArray<{ name: string; kind: 'ref'|'text'|'variant'|'number'; required: boolean }>; children: boolean };

export * from './query-groups';
export * from './display-context';

export function parseQuery(input: unknown, manifests: DatasetManifest[]): ValidatedQueryIR {
  const query = QueryIRSchema.parse(input);
  const fields = new Map<AllowedFareField, DatasetFieldManifest>();
  const aliases = new Set<string>();
  for (const source of query.sources) {
    const manifest = manifests.find(m => m.datasetId === source.datasetRef);
    if (!manifest || aliases.has(source.alias)) throw new Error('Unknown dataset or duplicate alias');
    aliases.add(source.alias); manifest.fields.forEach(field => fields.set(field.name, {...field,nullable:field.nullable&&(fields.get(field.name)?.nullable??true)}));
  }
  let leaves = 0;
  const visit = (predicate: PredicateTree, depth: number): void => {
    if (depth > 4) throw new Error('Predicate depth exceeded');
    if ('all' in predicate) { predicate.all.forEach(child => visit(child, depth + 1)); return; }
    if ('any' in predicate) { predicate.any.forEach(child => visit(child, depth + 1)); return; }
    if (++leaves > 16) throw new Error('Predicate leaf budget exceeded');
    const field = fields.get(predicate.field);
    if (!field?.filterable) throw new Error('Undeclared filter field');
    const values = Array.isArray(predicate.value) ? predicate.value : [predicate.value];
    if (values.some(value => value===null ? !field.nullable : typeof value !== field.type)) throw new Error('Predicate type mismatch or undeclared null');
    if (values.includes(null) && !['eq','neq','in'].includes(predicate.op)) throw new Error('Null requires equality or membership');
    if (predicate.op === 'contains' && field.type !== 'string') throw new Error('Contains requires text');
    if (['gte','lte','between'].includes(predicate.op) && field.type !== 'number' && predicate.field !== 'serviceDate') throw new Error('Comparison requires number or serviceDate');
    if (predicate.op === 'between' && (values.length !== 2 || values[0] == null || values[1] == null || values[0] > values[1])) throw new Error('Between requires ordered pair');
    if (predicate.op === 'in' && !Array.isArray(predicate.value)) throw new Error('In requires list');
    if (!['in','between'].includes(predicate.op) && Array.isArray(predicate.value)) throw new Error('Operator requires scalar');
  };
  if (query.where) visit(query.where, 1);
  query.project?.forEach(field => { if (!fields.has(field)) throw new Error('Undeclared projection'); });
  query.groupBy?.forEach(field => { if (!fields.get(field)?.groupable) throw new Error('Undeclared grouping'); });
  if (query.groupTop && (!query.groupBy?.length || !query.project?.length)) throw new Error('Grouped representative requires grouping and projection');
  if (query.groupTop && !fields.has(query.groupTop.by)) throw new Error('Unknown grouped representative field');
  const outputNames = new Set<string>(query.groupBy ? [...query.groupBy, ...(query.groupTop ? query.project ?? [] : [])] : query.project ?? [...fields.keys()]);
  query.metrics?.forEach(metric => {
    if (outputNames.has(metric.as) || ['__proto__','constructor','prototype','rows','fares'].includes(metric.as)) throw new Error('Reserved metric alias');
    if (metric.op !== 'count' && (!metric.field || fields.get(metric.field)?.type !== 'number')) throw new Error('Metric requires numeric field');
    outputNames.add(metric.as);
  });
  query.orderBy?.forEach(order => { if (!outputNames.has(order.field)) throw new Error('Unknown ordering'); });
  if (query.topK && !outputNames.has(query.topK.by)) throw new Error('Unknown topK field');
  const remainingAliases=query.sources.slice(1).map(source=>source.alias);
  const joinedAliases=(query.joins??[]).map(join=>join.rightAlias);
  if(joinedAliases.length!==remainingAliases.length||new Set(joinedAliases).size!==joinedAliases.length||remainingAliases.some(alias=>!joinedAliases.includes(alias)))throw new Error('Every additional source requires exactly one right-side join');
  query.joins?.forEach(join => {
    if (!aliases.has(join.rightAlias) || !fields.get(join.leftKey)?.joinKey || !fields.get(join.rightKey)?.joinKey) throw new Error('Unsupported join');
  });
  return query;
}

export const UICommandPatchSchema = z.discriminatedUnion('kind', [
 z.strictObject({kind:z.literal('filters'),filters:TravelFiltersSchema}),
 z.strictObject({kind:z.literal('dates'),dates:ArtifactUIStateSchema.shape.dates}),
 z.strictObject({kind:z.literal('route'),citySequence:ArtifactUIStateSchema.shape.citySequence}),
 z.strictObject({kind:z.literal('sort'),sort:SortSpecSchema}),
 z.strictObject({kind:z.literal('sortByLeg'),sortByLeg:ArtifactUIStateSchema.shape.sortByLeg}),
 z.strictObject({kind:z.literal('stays'),stays:ArtifactUIStateSchema.shape.stays}),
 z.strictObject({kind:z.literal('runtimeVariables'),runtimeVariables:RuntimeVariablesSchema}),
 z.strictObject({kind:z.literal('modesByLeg'),modesByLeg:ArtifactUIStateSchema.shape.modesByLeg}),
 z.strictObject({kind:z.literal('availableModesByLeg'),availableModesByLeg:ArtifactUIStateSchema.shape.availableModesByLeg}),
 z.strictObject({kind:z.literal('requestedModesByLeg'),requestedModesByLeg:ArtifactUIStateSchema.shape.requestedModesByLeg}),
 z.strictObject({kind:z.literal('displayWindowByLeg'),displayWindowByLeg:ArtifactUIStateSchema.shape.displayWindowByLeg}),
 z.strictObject({kind:z.literal('select'),fareId:FareIdSchema,selected:z.boolean()}),
]);
export const EditArtifactInputSchema=z.strictObject({artifactRef:ArtifactIdSchema,expectedRevision:UIStateRevisionSchema,commands:z.array(UICommandPatchSchema).min(1).max(8)});
