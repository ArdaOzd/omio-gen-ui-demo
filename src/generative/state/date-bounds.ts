import { z } from 'zod'
import { ArtifactUIStateSchema, DateSchema, type ArtifactUIState, type BoundedFareFact, type UICommand } from '../contracts'
import type { ServerFareDataBridge } from '../data/fare-data-bridge'
import { orderedLegResources } from './leg-bindings'
import { fallbackLegDate, fareArrivalInstant, scheduleLegs } from './itinerary-schedule'
import { withCalendarDates, withStayAllocations, withTripDates } from './ui-state-store'

const DAY_MS = 86_400_000

export const TravelDateBoundsSchema = z.strictObject({ from: DateSchema, to: DateSchema })
  .refine(value => value.from <= value.to, 'Invalid date-bound order')

export type TravelDateBounds = z.infer<typeof TravelDateBoundsSchema>

export function dateIsWithinBounds(date: string, bounds: TravelDateBounds): boolean {
  return date >= bounds.from && date <= bounds.to
}

export function clampDateWindow(
  window: { from: string; to: string },
  bounds: TravelDateBounds,
): { from: string; to: string } | undefined {
  const from = window.from < bounds.from ? bounds.from : window.from
  const to = window.to > bounds.to ? bounds.to : window.to
  return from <= to ? { from, to } : undefined
}

function dayDelta(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS
}

export function latestTripStartDate(
  dates: Pick<ArtifactUIState['dates'], 'start' | 'end'>,
  bounds: TravelDateBounds,
): string {
  if (!dates.end) return bounds.to
  const durationDays = dayDelta(dates.start, dates.end)
  return new Date(Date.parse(`${bounds.to}T00:00:00.000Z`) - durationDays * DAY_MS).toISOString().slice(0, 10)
}

function selectedFacts(state: ArtifactUIState, bridge?: ServerFareDataBridge): BoundedFareFact[] {
  if (!bridge) return []
  return state.selectedFareIds.flatMap(fareId => bridge.findCachedFare(fareId) ?? [])
}

function routeCoverages(state: ArtifactUIState, bridge?: ServerFareDataBridge) {
  if (state.citySequence.length > 1) {
    return state.citySequence.slice(1).map((destinationId, index) => ({
      originIds: [state.citySequence[index]!],
      destinationIds: [destinationId],
    }))
  }
  return bridge
    ? orderedLegResources(state, bridge).map(resource => ({
      originIds: [resource.coverage.originId],
      destinationIds: [resource.coverage.destinationId],
    }))
    : []
}

export function maximumStayNights(
  state: Pick<ArtifactUIState, 'dates' | 'citySequence' | 'stays' | 'displayWindowByLeg'>,
  cityId: string,
  bounds: TravelDateBounds,
): number {
  const destinations = state.citySequence.slice(1)
  if (!destinations.includes(cityId)) return 0
  const available = Math.max(0, Math.floor(dayDelta(state.dates.start, bounds.to)))
  const allocatedElsewhere = destinations.reduce((sum, destination) => {
    if (destination === cityId) return sum
    return sum + (state.stays.find(stay => stay.cityId === destination)?.nights ?? 0)
  }, 0)
  const aggregateLimit = available - allocatedElsewhere
  const current = state.stays.find(stay => stay.cityId === cityId)?.nights ?? 0
  const cityIndex = state.citySequence.indexOf(cityId)
  const downstreamWindows = state.citySequence.slice(cityIndex, -1).flatMap((originId, offset) => {
    const destinationId = state.citySequence[cityIndex + offset + 1]
    const window = destinationId ? state.displayWindowByLeg[`${originId}:${destinationId}`] : undefined
    return window ? [window] : []
  })
  const windowLimit = downstreamWindows.length
    ? current + Math.min(...downstreamWindows.map(window => Math.floor(dayDelta(window.to, bounds.to))))
    : 30
  return Math.max(0, Math.min(30, aggregateLimit, windowLimit))
}

export function stateRespectsDateBounds(
  state: ArtifactUIState,
  boundsInput: TravelDateBounds,
  bridge?: ServerFareDataBridge,
): boolean {
  const bounds = TravelDateBoundsSchema.parse(boundsInput)
  if (!dateIsWithinBounds(state.dates.start, bounds)) return false
  if (state.dates.end && !dateIsWithinBounds(state.dates.end, bounds)) return false
  if (state.dates.end && state.dates.end < state.dates.start) return false
  if (Object.values(state.displayWindowByLeg).some(window => (
    !dateIsWithinBounds(window.from, bounds)
    || !dateIsWithinBounds(window.to, bounds)
    || window.to < window.from
  ))) return false
  if (Object.values(state.calendarDateByLeg).some(date => !dateIsWithinBounds(date, bounds))) return false

  const destinations = state.citySequence.slice(1)
  const allocatedNights = destinations.reduce(
    (sum, cityId) => sum + (state.stays.find(stay => stay.cityId === cityId)?.nights ?? 0),
    0,
  )
  if (allocatedNights > dayDelta(state.dates.start, bounds.to)) return false
  const origins = state.citySequence.slice(0, -1)
  if (origins.some(originId => !dateIsWithinBounds(fallbackLegDate(state, originId), bounds))) return false

  const facts = selectedFacts(state, bridge)
  if (facts.some(fare => !dateIsWithinBounds(fare.serviceDate, bounds))) return false
  const latestArrival = Date.parse(`${bounds.to}T23:59:59.999Z`)
  if (facts.some(fare => fareArrivalInstant(fare) > latestArrival)) return false
  const scheduled = scheduleLegs(state, routeCoverages(state, bridge), facts)
  return scheduled.every(leg => dateIsWithinBounds(leg.threshold.date, bounds))
}

function projectedState(current: ArtifactUIState, command: UICommand): ArtifactUIState {
  if (command.kind === 'dates') return withTripDates(current, command.dates)
  if (command.kind === 'calendarDates') return withCalendarDates(current, command.dates)
  if (command.kind === 'calendarSelection') return { ...current, dates: command.dates, calendarDateByLeg: command.calendarDateByLeg }
  if (command.kind === 'stays') return withStayAllocations(current, command.stays)
  if (command.kind === 'route') {
    const legKeys = new Set(command.citySequence.slice(1).map((destination, index) => `${command.citySequence[index]}:${destination}`))
    const destinations = new Set(command.citySequence.slice(1))
    const active = <T>(record: Record<string, T>): Record<string, T> => Object.fromEntries(
      Object.entries(record).filter(([key]) => legKeys.has(key)),
    )
    return {
      ...current,
      citySequence: command.citySequence,
      stays: current.stays.filter(stay => destinations.has(stay.cityId)),
      displayWindowByLeg: active(current.displayWindowByLeg),
      calendarDateByLeg: active(current.calendarDateByLeg),
    }
  }
  if (command.kind === 'displayWindowByLeg') return { ...current, displayWindowByLeg: command.displayWindowByLeg }
  if (command.kind === 'calendarDateByLeg') return { ...current, calendarDateByLeg: command.calendarDateByLeg }
  if (command.kind === 'select') {
    return {
      ...current,
      selectedFareIds: command.selected
        ? [...new Set([...current.selectedFareIds, command.fareId])]
        : current.selectedFareIds.filter(fareId => fareId !== command.fareId),
    }
  }
  return current
}

export function commandRespectsDateBounds(
  current: ArtifactUIState,
  command: UICommand,
  bounds: TravelDateBounds,
  bridge?: ServerFareDataBridge,
): boolean {
  const projected = ArtifactUIStateSchema.safeParse(projectedState(current, command))
  return projected.success && stateRespectsDateBounds(projected.data, bounds, bridge)
}
