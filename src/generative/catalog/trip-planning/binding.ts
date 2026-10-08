import { ArtifactIdSchema, DatasetIdSchema, type UIStateStore } from '../../contracts'
import type { ServerFareDataBridge } from '../../data/fare-data-bridge'
import { legKey, orderedLegResources } from '../../state/leg-bindings'

export const legBoundPlannerComponents = new Set([
  'CityField',
  'TravelDate',
  'StayDuration',
  'TransportSelect',
  'FareOrder',
  'FadeFares',
  'FareCalendar',
])

export const datasetBoundComponentNames = [
  ...legBoundPlannerComponents,
  'ModeChips',
  'CarrierFilter',
  'FarePicker',
  'FareCards',
  'ComparisonTable',
  'ComparisonMatrix',
  'PriceCalendar',
  'ModeBreakdown',
  'ItineraryTimeline',
  'DurationPricePlot',
  'CheapestFastest',
] as const
const datasetBoundComponents = new Set<string>(datasetBoundComponentNames)

export function isLegBoundPlannerComponent(name: string): boolean {
  return legBoundPlannerComponents.has(name)
}

export function isDatasetBoundComponent(name: string): boolean {
  return datasetBoundComponents.has(name)
}

export function resolvePlannerDatasetRef(input: { kind: string; artifactRef: string; datasetRef?: string; legIndex?: number }, state: UIStateStore, bridge: ServerFareDataBridge): string | undefined {
  const artifact = state.get(ArtifactIdSchema.parse(input.artifactRef))
  const datasetBound = isDatasetBoundComponent(input.kind)
  if (input.legIndex !== undefined && !datasetBound) throw new Error('Unsupported leg binding')
  const resources = orderedLegResources(artifact, bridge)
  if (input.legIndex !== undefined) {
    const resource = resources[input.legIndex]
    if (!resource) return undefined
    return resource.datasetId
  }
  if (!input.datasetRef) return undefined
  const requestedId = DatasetIdSchema.parse(input.datasetRef)
  const requested = bridge.findBinding(requestedId)
  if (requested) {
    const key = legKey(requested.manifest.coverage)
    return resources.find(resource => resource.key === key)?.datasetId ?? requested.datasetId
  }
  try {
    const key = artifact.datasetBindings[DatasetIdSchema.parse(input.datasetRef)]
    if (key) {
      const resource = resources.find(candidate => candidate.key === key)
      if (resource) return resource.datasetId
    }
    if (resources.length === 1) return resources[0]?.datasetId
    throw new Error('Missing leg binding')
  } catch { throw new Error('Missing leg binding') }
}
