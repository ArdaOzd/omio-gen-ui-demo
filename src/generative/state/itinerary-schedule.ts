import type { ArtifactUIState, BoundedFareFact, Coverage, FareId } from '../contracts'

const DAY_MS = 86_400_000

export type LegThreshold = {
  date: string
  minutes: number
  source: 'trip-date' | 'selected-arrival'
  precedingFareId?: FareId
}

export type ScheduledLeg = {
  key: string
  originId: string
  destinationId: string
  threshold: LegThreshold
  selectedFare?: BoundedFareFact
  selectionValid: boolean
}

const instant = (date: string, minutes: number): number => Date.parse(`${date}T00:00:00.000Z`) + minutes * 60_000

export function fareDepartureInstant(fare: Pick<BoundedFareFact, 'serviceDate' | 'departureMinutes'>): number {
  return instant(fare.serviceDate, fare.departureMinutes)
}

export function fareArrivalInstant(fare: Pick<BoundedFareFact, 'serviceDate' | 'departureMinutes' | 'durationMinutes'>): number {
  return fareDepartureInstant(fare) + fare.durationMinutes * 60_000
}

export function stayDays(state: Pick<ArtifactUIState, 'stays'>, cityId: string): number {
  return state.stays.find(stay => stay.cityId === cityId)?.nights ?? 0
}

function utcParts(value: number): Pick<LegThreshold, 'date' | 'minutes'> {
  const date = new Date(value)
  return { date: date.toISOString().slice(0, 10), minutes: date.getUTCHours() * 60 + date.getUTCMinutes() }
}

export function fallbackLegDate(state: Pick<ArtifactUIState, 'dates' | 'stays' | 'citySequence'>, originId: string): string {
  const routeIndex = state.citySequence.findIndex(city => city === originId)
  if (routeIndex >= 0) {
    const days = state.citySequence.slice(1, routeIndex + 1).reduce((sum, city) => sum + stayDays(state, city), 0)
    return new Date(Date.parse(`${state.dates.start}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10)
  }
  const stop = state.stays.findIndex(stay => stay.cityId === originId)
  const days = stop < 0 ? 0 : state.stays.slice(0, stop + 1).reduce((sum, stay) => sum + stay.nights, 0)
  return new Date(Date.parse(`${state.dates.start}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

export function legThreshold(state: Pick<ArtifactUIState, 'dates' | 'stays' | 'citySequence'>, coverage: Pick<Coverage, 'originIds' | 'destinationIds'>, selectedFacts: readonly BoundedFareFact[]): LegThreshold {
  const originId = coverage.originIds[0] ?? ''
  const preceding = [...selectedFacts].reverse().find(fare => fare.destinationId === originId)
  if (!preceding) return { date: fallbackLegDate(state, originId), minutes: 0, source: 'trip-date' }
  return {
    ...utcParts(fareArrivalInstant(preceding) + stayDays(state, originId) * DAY_MS),
    source: 'selected-arrival',
    precedingFareId: preceding.id,
  }
}

export function fareMeetsThreshold(fare: Pick<BoundedFareFact, 'serviceDate' | 'departureMinutes'>, threshold: LegThreshold): boolean {
  return fareDepartureInstant(fare) >= instant(threshold.date, threshold.minutes)
}

export function thresholdDateTime(threshold: Pick<LegThreshold, 'date' | 'minutes'>): string {
  return new Date(instant(threshold.date, threshold.minutes)).toISOString()
}

export function scheduleLegs(state: Pick<ArtifactUIState, 'dates' | 'stays' | 'citySequence'>, coverages: readonly Pick<Coverage, 'originIds' | 'destinationIds'>[], selectedFacts: readonly BoundedFareFact[]): ScheduledLeg[] {
  const factsByLeg = new Map(selectedFacts.map(fare => [`${fare.originId}:${fare.destinationId}`, fare]))
  const accepted: BoundedFareFact[] = []
  let blocked = false
  return coverages.flatMap(coverage => {
    const originId = coverage.originIds[0]
    const destinationId = coverage.destinationIds[0]
    if (!originId || !destinationId) return []
    const key = `${originId}:${destinationId}`
    const threshold = legThreshold(state, coverage, accepted)
    const selectedFare = factsByLeg.get(key)
    const selectionValid = !!selectedFare && !blocked && fareMeetsThreshold(selectedFare, threshold)
    if (selectedFare && selectionValid) accepted.push(selectedFare)
    else if(selectedFare)blocked=true
    return [{ key, originId, destinationId, threshold, selectionValid, ...(selectedFare ? { selectedFare } : {}) }]
  })
}

export function staleDownstreamFareIds(state: Pick<ArtifactUIState, 'dates' | 'stays' | 'citySequence'>, coverages: readonly Pick<Coverage, 'originIds' | 'destinationIds'>[], selectedFacts: readonly BoundedFareFact[]): FareId[] {
  return scheduleLegs(state, coverages, selectedFacts)
    .filter(leg => leg.selectedFare && !leg.selectionValid)
    .map(leg => leg.selectedFare?.id)
    .filter((id): id is FareId => id !== undefined)
}
