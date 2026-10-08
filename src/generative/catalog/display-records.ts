import type { DisplayRepresentation, EffectiveInputs, InputField, InspectDisplayItem } from '../contracts/display-context'
import type { FareItem, ProjectionResult, QueryExecutionState } from '../contracts/query-groups'
import type { ProjectionRequirement } from '../data/projection-coordinator'
import { useDisplayNode, usePublishDisplay } from './display-context-provider'

type QueryDisplaySource = {
  requirement: Readonly<ProjectionRequirement>
  queryState: QueryExecutionState
  data: ProjectionResult | undefined
}

export function effectiveInputs(requirement: Readonly<ProjectionRequirement>): EffectiveInputs {
  const { scope, projection } = requirement
  const filters = 'filters' in projection ? projection.filters : undefined
  return {
    originId: scope.originId,
    destinationId: scope.destinationId,
    dateWindow: scope.dateWindow,
    passengers: scope.passengers,
    earliestDeparture: { serviceDate: scope.earliestDeparture.date, departureMinutes: scope.earliestDeparture.minutes },
    ...(filters ? {
      modes: filters.modes,
      carrierIds: filters.carrierIds,
      minPriceCents: filters.minPriceCents,
      maxPriceCents: filters.maxPriceCents,
      maxDurationMinutes: filters.maxDurationMinutes,
      directOnly: filters.directOnly,
    } : {}),
    ...(projection.kind === 'farePage' ? {
      serviceDate: projection.serviceDate,
      selectedDate: projection.serviceDate ?? undefined,
      sort: projection.sort,
      cursor: projection.after,
      limit: projection.limit,
    } : {}),
  }
}

export function effectiveInputFields(input: EffectiveInputs): InputField[] {
  return (Object.keys(input) as InputField[]).filter(field => input[field as keyof EffectiveInputs] !== undefined)
}

export function boundedFareFact(item: FareItem) {
  const { availableSeats: _availableSeats, ...fact } = item
  return fact
}

export function fareInspectionItems(items: readonly FareItem[], labels: ReadonlyMap<string, string> = new Map(), rankOffset = 0): InspectDisplayItem[] {
  return items.map((item, index) => ({
    itemId: item.id,
    rank: rankOffset + index + 1,
    ...(labels.get(item.id) ? { label: labels.get(item.id) } : {}),
    fact: boundedFareFact(item),
  }))
}

export function useProjectionDisplay(source: QueryDisplaySource, display: DisplayRepresentation | undefined, inspectionItems?: readonly InspectDisplayItem[]): void {
  const node = useDisplayNode()
  const inputs = effectiveInputs(source.requirement)
  const fields = effectiveInputFields(inputs)
  usePublishDisplay({
    group: source.requirement.group,
    inputs,
    provenance: node.store?.provenance(source.requirement.group.artifactId, fields),
    execution: source.queryState,
    display,
    inspectionItems,
  })
}
