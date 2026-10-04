import type {ArtifactUIState,PredicateTree} from '../contracts'

export function filterPredicate(state: ArtifactUIState, includeDate = true): PredicateTree | undefined {
  const all: PredicateTree[] = []
  if (state.filters.modes.length) all.push({ field: 'mode', op: 'in', value: state.filters.modes })
  if (state.filters.carrierIds.length) all.push({ field: 'carrierId', op: 'in', value: state.filters.carrierIds })
  if (state.filters.minPriceCents !== undefined) all.push({ field: 'priceCents', op: 'gte', value: state.filters.minPriceCents })
  if (state.filters.maxPriceCents !== undefined) all.push({ field: 'priceCents', op: 'lte', value: state.filters.maxPriceCents })
  if (state.filters.maxDurationMinutes !== undefined) all.push({ field: 'durationMinutes', op: 'lte', value: state.filters.maxDurationMinutes })
  if (state.filters.directOnly) all.push({ field: 'direct', op: 'eq', value: true })
  if (includeDate) all.push(state.dates.end ? { field: 'serviceDate', op: 'between', value: [state.dates.start,state.dates.end] } : { field: 'serviceDate', op: 'eq', value: state.dates.start })
  return all.length ? { all } : undefined
}
