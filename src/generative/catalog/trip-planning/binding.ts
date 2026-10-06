export const legBoundPlannerComponents = new Set([
  'CityField',
  'TravelDate',
  'StayDuration',
  'TransportSelect',
  'FareOrder',
  'FadeFares',
  'FareCalendar',
])

export function isLegBoundPlannerComponent(name: string): boolean {
  return legBoundPlannerComponents.has(name)
}

export function resolvePlannerDatasetRef(input: { kind: string; artifactRef: string; datasetRef?: string; legIndex?: number }, state: UIStateStore, bridge: FareDataBridge): string | undefined {
  const artifact = state.get(ArtifactIdSchema.parse(input.artifactRef))
  const legBound = isLegBoundPlannerComponent(input.kind)
  if (input.legIndex !== undefined && !legBound) throw new Error('Unsupported leg binding')
  if (!input.datasetRef) return undefined
  if (!legBound) return bridge.getManifest(DatasetIdSchema.parse(input.datasetRef)).datasetId
  if (input.legIndex === undefined) throw new Error('Missing leg binding')
  const resource = orderedLegResources(artifact, bridge)[input.legIndex]
  if (!resource) throw new Error('Unavailable leg binding')
  return resource.datasetId
}
import { ArtifactIdSchema, DatasetIdSchema, type FareDataBridge, type UIStateStore } from '../../contracts'
import { orderedLegResources } from '../../state/leg-bindings'
