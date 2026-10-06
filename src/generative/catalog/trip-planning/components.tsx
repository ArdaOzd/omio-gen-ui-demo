import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, BusFront, CalendarDays, ChevronDown, Clock3, MapPin, Plane, Ship, TrainFront } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { DateSchema, DatasetIdSchema, type FareRow, type TransportMode } from '../../contracts'
import { fareMeetsThreshold, thresholdDateTime } from '../../state/itinerary-schedule'
import { availableModes as actualModes, legDate, tripDatesForLegDeparture } from '../../state/leg-bindings'
import {
  carrierLabel,
  cityLabel,
  departure,
  duration,
  legKey,
  money,
  useFareDayRepresentatives,
  useLegFareRows,
  useFareRowsForDate,
  useItineraryPlan,
  useTravelAction,
} from '../context'
import type { WidgetProps } from '../layout'

type Plan = ReturnType<typeof useItineraryPlan>
type PlanLeg = Plan['legs'][number]
type LocationOption = { id: string; label: string }
export type FareOrderKind = 'none' | 'cheapest' | 'fastest'

const modeOrder: readonly TransportMode[] = ['train', 'bus', 'flight', 'ferry']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseLocations(value: unknown): LocationOption[] {
  if (!isRecord(value) || !Array.isArray(value.locations)) return []
  const locations: LocationOption[] = []
  for (const candidate of value.locations) {
    if (!isRecord(candidate)) continue
    const id = typeof candidate.slug === 'string'
      ? candidate.slug
      : typeof candidate.id === 'string'
        ? candidate.id
        : undefined
    const display = typeof candidate.display_name === 'string'
      ? candidate.display_name
      : typeof candidate.city === 'string'
        ? candidate.city
        : undefined
    if (id && display) locations.push({ id, label: display })
  }
  return locations
}

function useLocationCatalog(): { status: 'loading' | 'ready' | 'error'; locations: LocationOption[] } {
  const [result, setResult] = useState<{ status: 'loading' | 'ready' | 'error'; locations: LocationOption[] }>({ status: 'loading', locations: [] })
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/locations', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Location catalog request failed')
        return response.json()
      })
      .then((value: unknown) => {
        if (controller.signal.aborted) return
        const locations = parseLocations(value)
        setResult(locations.length ? { status: 'ready', locations } : { status: 'error', locations: [] })
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ status: 'error', locations: [] })
      })
    return () => controller.abort()
  }, [])
  return result
}

function routeCities(plan: Plan): string[] {
  if (plan.state.citySequence.length > 1) return plan.state.citySequence
  const first = plan.legs[0]
  return first ? [first.originId, ...plan.legs.map(leg => leg.destinationId)] : []
}

function resolveLeg(plan: Plan, datasetRef?: string): { leg: PlanLeg; index: number } | undefined {
  if (!datasetRef) {
    const leg = plan.legs[0]
    return leg ? { leg, index: 0 } : undefined
  }
  const requested = plan.services.bridge.getManifest(DatasetIdSchema.parse(datasetRef))
  const requestedKey = legKey(requested.coverage)
  const index = plan.legs.findIndex(leg => leg.key === requestedKey)
  const leg = plan.legs[index]
  return leg && index >= 0 ? { leg, index } : undefined
}

function updateRoute(plan: Plan, dispatch: ReturnType<typeof useTravelAction>, cityIndex: number, cityId: string): void {
  const sequence = routeCities(plan)
  if (!sequence[cityIndex] || sequence[cityIndex] === cityId) return
  const citySequence = sequence.map((value, index) => index === cityIndex ? cityId : value)
  const visits = citySequence.at(-1) === citySequence[0] ? citySequence.slice(0, -1) : citySequence
  if (new Set(visits).size !== visits.length) return
  const destinations = citySequence.slice(1)
  const stays = destinations.map(destination => plan.state.stays.find(stay => stay.cityId === destination) ?? { cityId: destination, nights: 0 })
  dispatch({ kind: 'route', artifactId: plan.state.artifactId, citySequence })
  dispatch({ kind: 'stays', artifactId: plan.state.artifactId, stays })
}

function cityOptions(plan: Plan, cityIndex: number, locations: LocationOption[]): LocationOption[] {
  const sequence = routeCities(plan)
  const current = sequence[cityIndex]
  const returnOrigin = cityIndex === sequence.length - 1 ? sequence[0] : undefined
  return locations.filter(location => location.id === current || location.id === returnOrigin || !sequence.some((city, index) => index !== cityIndex && city === location.id))
}

function LocationInput({ label, value, locations, readOnly = false, onSelect }: {
  label: string
  value: string
  locations: LocationOption[]
  readOnly?: boolean
  onSelect: (id: string) => void
}) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const id = useId()
  const current = locations.find(location => location.id === value)
  useEffect(() => setInput(current?.label ?? cityLabel(value)), [current?.label, value])
  const suggestions = useMemo(() => {
    const query = input.trim().toLocaleLowerCase()
    if (!query) return locations.slice(0, 7)
    return locations
      .filter(location => location.label.toLocaleLowerCase().includes(query) || location.id.toLocaleLowerCase().includes(query))
      .sort((left, right) => {
        const leftStarts = left.label.toLocaleLowerCase().startsWith(query) ? 0 : 1
        const rightStarts = right.label.toLocaleLowerCase().startsWith(query) ? 0 : 1
        return leftStarts - rightStarts || left.label.localeCompare(right.label)
      })
      .slice(0, 7)
  }, [input, locations])
  const choose = (location: LocationOption) => {
    setInput(location.label)
    setOpen(false)
    onSelect(location.id)
  }
  return <div className="trip-city-field" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false)
      setInput(current?.label ?? cityLabel(value))
    }
  }}>
    <Label htmlFor={`${id}-input`}>{label}</Label>
    <div className="trip-city-input-wrap">
      <MapPin aria-hidden="true" />
      <Input
        id={`${id}-input`}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={!readOnly && open}
        aria-controls={!readOnly && open ? `${id}-suggestions` : undefined}
        value={input}
        readOnly={readOnly}
        autoComplete="off"
        onFocus={() => { if (!readOnly) setOpen(true) }}
        onChange={event => { setInput(event.target.value); setOpen(true) }}
        onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false)
          if (event.key === 'Enter' && open && suggestions[0]) {
            event.preventDefault()
            choose(suggestions[0])
          }
        }}
      />
    </div>
    {!readOnly && open && suggestions.length > 0 && <Card id={`${id}-suggestions`} className="trip-city-suggestions" role="listbox" aria-label={`${label} suggestions`}>
      {suggestions.map(location => <Button
        key={location.id}
        type="button"
        variant="ghost"
        role="option"
        aria-selected={location.id === value}
        onMouseDown={event => event.preventDefault()}
        onClick={() => choose(location)}
      ><MapPin aria-hidden="true" />{location.label}</Button>)}
    </Card>}
  </div>
}

function CityFields({ plan, leg, legIndex, locations, onlyDestination = false }: {
  plan: Plan
  leg: PlanLeg
  legIndex: number
  locations: LocationOption[]
  onlyDestination?: boolean
}) {
  const dispatch = useTravelAction(plan.state.artifactId)
  return <div className="trip-city-pair">
    {!onlyDestination && <LocationInput label="From" value={leg.originId} locations={cityOptions(plan, legIndex, locations)} onSelect={city => updateRoute(plan, dispatch, legIndex, city)} />}
    {!onlyDestination && <ArrowRight className="trip-route-arrow" aria-hidden="true" />}
    <LocationInput label="To" value={leg.destinationId} locations={cityOptions(plan, legIndex + 1, locations)} onSelect={city => updateRoute(plan, dispatch, legIndex + 1, city)} />
  </div>
}

export function CityField(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const catalog = useLocationCatalog()
  const resolved = resolveLeg(plan, props.datasetRef)
  if (!resolved) return <EmptyPlanningState />
  return <Card className="trip-planning-control trip-city-card">
    <h3>{props.title ?? 'Cities'}</h3>
    <CityFields plan={plan} leg={resolved.leg} legIndex={resolved.index} locations={catalog.locations} />
    {catalog.status === 'loading' && <small role="status">Loading city suggestions…</small>}
    {catalog.status === 'error' && <small>City suggestions are temporarily unavailable.</small>}
  </Card>
}

function TravelDateControl({ plan, leg, label }: { plan: Plan; leg: PlanLeg; label?: string }) {
  const dispatch = useTravelAction(plan.state.artifactId)
  const [error, setError] = useState('')
  const legIndex = plan.legs.findIndex(candidate => candidate.key === leg.key)
  const stayIndex = plan.state.stays.findIndex(stay => stay.cityId === leg.originId)
  const currentNights = stayIndex >= 0 ? plan.state.stays[stayIndex]?.nights ?? 0 : 0
  const minimumDate = legIndex > 0 ? new Date(Date.parse(`${leg.threshold.date}T00:00:00.000Z`) - currentNights * 86_400_000).toISOString().slice(0, 10) : undefined
  const change = (date: string) => {
    try {
      const valid = DateSchema.parse(date)
      if (legIndex <= 0) {
        const dates = tripDatesForLegDeparture(plan.state, leg.originId, valid)
        dispatch({ kind: 'dates', artifactId: plan.state.artifactId, dates })
      } else {
        if (!minimumDate || valid < minimumDate) throw new Error('Departure is before the preceding arrival')
        const nights = (Date.parse(`${valid}T00:00:00.000Z`) - Date.parse(`${minimumDate}T00:00:00.000Z`)) / 86_400_000
        if (!Number.isInteger(nights) || nights < 0 || nights > 30) throw new Error('Unsupported stay duration')
        const stays = stayIndex >= 0
          ? plan.state.stays.map((stay, index) => index === stayIndex ? { ...stay, nights } : stay)
          : [...plan.state.stays, { cityId: leg.originId, nights }]
        dispatch({ kind: 'stays', artifactId: plan.state.artifactId, stays })
      }
      setError('')
    } catch {
      setError('Choose a valid date for this leg.')
    }
  }
  return <div className="trip-date-control">
    <Label><CalendarDays aria-hidden="true" />{label ?? 'Departure'}
      <Input type="date" value={leg.threshold.date} min={minimumDate} onChange={event => change(event.target.value)} />
    </Label>
    {leg.threshold.minutes > 0 && <small>After {departure(leg.threshold.minutes)} following your previous arrival</small>}
    {error && <Alert>{error}</Alert>}
  </div>
}

export function TravelDate(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const resolved = resolveLeg(plan, props.datasetRef)
  if (!resolved) return <EmptyPlanningState />
  return <Card className="trip-planning-control"><TravelDateControl plan={plan} leg={resolved.leg} label={props.title} /></Card>
}

function StayDurationControl({ plan, leg, nextLeg, title }: { plan: Plan; leg: PlanLeg; nextLeg?: PlanLeg; title?: string }) {
  const dispatch = useTravelAction(plan.state.artifactId)
  const stay = plan.state.stays.find(item => item.cityId === leg.destinationId)
  const nights = stay?.nights ?? 0
  const setNights = (value: number) => {
    if (!Number.isInteger(value) || value < 0 || value > 30) return
    const existing = plan.state.stays.findIndex(item => item.cityId === leg.destinationId)
    const stays = existing >= 0
      ? plan.state.stays.map((item, index) => index === existing ? { ...item, nights: value } : item)
      : [...plan.state.stays, { cityId: leg.destinationId, nights: value }]
    dispatch({ kind: 'stays', artifactId: plan.state.artifactId, stays })
  }
  return <div className="trip-stay-control">
    <div><strong>{title ?? `Stay in ${cityLabel(leg.destinationId)}`}</strong><span>{nights} night{nights === 1 ? '' : 's'}</span></div>
    <Input type="range" min="0" max="30" step="1" value={nights} aria-label={`Stay in ${cityLabel(leg.destinationId)}`} onChange={event => setNights(Number(event.target.value))} />
    {nextLeg && <small>Next departure: {new Date(thresholdDateTime(nextLeg.threshold)).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</small>}
  </div>
}

export function StayDuration(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const resolved = resolveLeg(plan, props.datasetRef)
  if (!resolved) return <EmptyPlanningState />
  return <Card className="trip-planning-control"><StayDurationControl plan={plan} leg={resolved.leg} nextLeg={plan.legs[resolved.index + 1]} title={props.title} /></Card>
}

function modeIcon(mode: TransportMode): ReactNode {
  if (mode === 'train') return <TrainFront aria-hidden="true" />
  if (mode === 'bus') return <BusFront aria-hidden="true" />
  if (mode === 'flight') return <Plane aria-hidden="true" />
  return <Ship aria-hidden="true" />
}

function TransportSelectControl({ plan, leg, title, presentation = 'inline' }: { plan: Plan; leg: PlanLeg; title?: string; presentation?: 'inline' | 'dropdown' }) {
  const dispatch = useTravelAction(plan.state.artifactId)
  const explicit = plan.state.modesByLeg[leg.key] ?? []
  const advertised = plan.state.availableModesByLeg[leg.key] ?? actualModes(plan.services.bridge.getManifest(leg.datasetId))
  const available = modeOrder.filter(mode => advertised.includes(mode))
  const selected = explicit.length ? explicit.filter(mode => available.includes(mode)) : available
  const toggle = (mode: TransportMode) => {
    const next = explicit.length === 0
      ? available.filter(candidate => candidate !== mode)
      : explicit.includes(mode)
        ? explicit.filter(candidate => candidate !== mode)
        : [...explicit, mode]
    const canonical = next.length === available.length ? [] : modeOrder.filter(candidate => next.includes(candidate))
    dispatch({ kind: 'modesByLeg', artifactId: plan.state.artifactId, modesByLeg: { ...plan.state.modesByLeg, [leg.key]: canonical } })
  }
  const selectedLabel = selected.length === available.length ? 'All available' : selected.map(cityLabel).join(', ')
  return <FieldSet className={`trip-mode-control is-${presentation}`}>
    <FieldLegend>{title ?? 'Transport'}</FieldLegend>
    {presentation === 'dropdown' ? <DropdownMenu>
      <DropdownMenuTrigger asChild><Button type="button" variant="outline" className="trip-mode-trigger" aria-label={`Transport: ${selectedLabel || 'No available modes'}`} disabled={!available.length}><span className="trip-mode-trigger-icons">{selected.map(mode => <span key={mode}>{modeIcon(mode)}</span>)}</span><span>{selectedLabel || 'No modes'}</span><ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="trip-mode-menu">{available.map(mode => <DropdownMenuCheckboxItem key={mode} checked={selected.includes(mode)} onCheckedChange={() => toggle(mode)} onSelect={event => event.preventDefault()}>{modeIcon(mode)}<span>{cityLabel(mode)}</span></DropdownMenuCheckboxItem>)}</DropdownMenuContent>
    </DropdownMenu> : <div className="trip-mode-options">{available.map(mode => <Button key={mode} type="button" variant="outline" aria-pressed={selected.includes(mode)} onClick={() => toggle(mode)}>{modeIcon(mode)}<span>{cityLabel(mode)}</span></Button>)}</div>}
  </FieldSet>
}

export function TransportSelect(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const resolved = resolveLeg(plan, props.datasetRef)
  if (!resolved) return <EmptyPlanningState />
  return <Card className="trip-planning-control"><TransportSelectControl plan={plan} leg={resolved.leg} title={props.title} /></Card>
}

export function fareOrderFromState(field: Plan['state']['sort']['field'], direction: Plan['state']['sort']['direction']): FareOrderKind {
  if (direction === 'asc' && field === 'priceCents') return 'cheapest'
  if (direction === 'asc' && field === 'durationMinutes') return 'fastest'
  return 'none'
}

const defaultLegSort: Plan['state']['sort'] = { field: 'departureMinutes', direction: 'asc' }

export function sortFares(rows: readonly FareRow[], order: FareOrderKind): FareRow[] {
  return [...rows].sort((left, right) => {
    if (order === 'cheapest') {
      const price = left.priceCents - right.priceCents
      if (price) return price
    }
    if (order === 'fastest') {
      const journey = left.durationMinutes - right.durationMinutes
      if (journey) return journey
    }
    return left.serviceDate.localeCompare(right.serviceDate)
      || left.departureMinutes - right.departureMinutes
      || left.durationMinutes - right.durationMinutes
      || left.priceCents - right.priceCents
      || left.id.localeCompare(right.id)
  })
}

function FareOrderControl({ plan, leg, title }: { plan: Plan; leg: PlanLeg; title?: string }) {
  const dispatch = useTravelAction(plan.state.artifactId)
  const current = plan.state.sortByLeg[leg.key] ?? defaultLegSort
  const selected = fareOrderFromState(current.field, current.direction)
  const choose = (order: FareOrderKind) => {
    const sort: Plan['state']['sort'] = order === 'cheapest'
      ? { field: 'priceCents', direction: 'asc' }
      : order === 'fastest'
        ? { field: 'durationMinutes', direction: 'asc' }
        : { field: 'departureMinutes', direction: 'asc' }
    dispatch({ kind: 'sortByLeg', artifactId: plan.state.artifactId, sortByLeg: { ...plan.state.sortByLeg, [leg.key]: sort } })
  }
  return <FieldSet className="trip-order-control">
    <FieldLegend>{title ?? 'Order fares'}</FieldLegend>
    <div>{([['none', 'Departure'], ['cheapest', 'Cheapest'], ['fastest', 'Fastest']] satisfies ReadonlyArray<readonly [FareOrderKind, string]>).map(([value, label]) => <Button key={value} type="button" variant="outline" aria-pressed={selected === value} onClick={() => choose(value)}>{label}</Button>)}</div>
  </FieldSet>
}

export function FareOrder(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const resolved = resolveLeg(plan, props.datasetRef)
  if (!resolved) return <EmptyPlanningState />
  return <Card className="trip-planning-control"><FareOrderControl plan={plan} leg={resolved.leg} title={props.title} /></Card>
}

function FareStrip({ artifactRef, datasetRef, compact = false }: { artifactRef: string; datasetRef: string; compact?: boolean }) {
  const plan = useItineraryPlan(artifactRef)
  const dispatch = useTravelAction(artifactRef)
  const result = useLegFareRows(artifactRef, datasetRef)
  const resolved = resolveLeg(plan, datasetRef)
  if (!resolved) return <EmptyPlanningState />
  if (result.status === 'loading') return <Skeleton className="trip-fare-skeleton" role="status">Finding synthetic fares…</Skeleton>
  if (result.status === 'error') return <Alert>These synthetic fares could not load. Try the date again.</Alert>
  const currentSort = result.state.sortByLeg[resolved.leg.key] ?? defaultLegSort
  const rows = sortFares(result.rows.filter(row => row.originId === resolved.leg.originId && row.destinationId === resolved.leg.destinationId && fareMeetsThreshold(row, resolved.leg.threshold)), fareOrderFromState(currentSort.field, currentSort.direction))
  return <div className={`trip-fare-strip${compact ? ' is-compact' : ''}`}>
    <p className="trip-fare-caption">Synthetic fares per passenger</p>
    {rows.length > 0 ? <div className="trip-fare-scroll">{rows.slice(0, compact ? 8 : 16).map(row => {
      const selected = result.state.selectedFareIds.includes(row.id)
      return <Card key={row.id} className={`trip-fare-option${selected ? ' is-selected' : ''}`} role="article">
        <div className="trip-fare-option-top"><span>{modeIcon(row.mode)}{cityLabel(row.mode)}</span><strong>{money(row.priceCents)}</strong></div>
        <p>{departure(row.departureMinutes)} · {duration(row.durationMinutes)}</p>
        <small>{carrierLabel(row, result.services.bridge, result.datasetId)} · {row.serviceDate}</small>
        <Button type="button" variant={selected ? 'default' : 'outline'} aria-pressed={selected} onClick={() => dispatch({ kind: 'select', artifactId: result.state.artifactId, fareId: row.id, selected: !selected })}>{selected ? 'Selected' : 'Choose fare'}</Button>
      </Card>
    })}</div> : <p role="status">No departures meet the current date, arrival time, and transport choices.</p>}
  </div>
}

export function FadeFares(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const resolved = resolveLeg(plan, props.datasetRef)
  if (!resolved) return <EmptyPlanningState />
  return <Card className="trip-planning-control trip-fade-fares"><h3>{props.title ?? 'Choose a fare'}</h3><FareStrip artifactRef={props.artifactRef} datasetRef={resolved.leg.datasetId} /></Card>
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  let cursor = Date.parse(`${start}T00:00:00.000Z`)
  const last = Date.parse(`${end}T00:00:00.000Z`)
  while (cursor <= last && dates.length < 62) {
    dates.push(new Date(cursor).toISOString().slice(0, 10))
    cursor += 86_400_000
  }
  return dates
}

function FareCalendarView({ artifactRef, datasetRef, title }: { artifactRef: string; datasetRef: string; title?: string }) {
  const plan = useItineraryPlan(artifactRef)
  const dispatch = useTravelAction(artifactRef)
  const resolved = resolveLeg(plan, datasetRef)
  const displayWindow = resolved ? plan.state.displayWindowByLeg[resolved.leg.key] : undefined
  const legacyFrom = resolved ? legDate(plan.state, resolved.leg.originId, plan.state.dates.start) : plan.state.dates.start
  const legacyTo = resolved ? legDate(plan.state, resolved.leg.originId, plan.state.dates.end ?? plan.state.dates.start) : legacyFrom
  const requestedFrom = displayWindow?.from ?? legacyFrom
  const requestedTo = displayWindow?.to ?? legacyTo
  const thresholdDate = resolved?.leg.threshold.date ?? requestedFrom
  const visibleStart = thresholdDate > requestedFrom ? thresholdDate : requestedFrom
  const outsideWindow = visibleStart > requestedTo
  const dates = useMemo(() => outsideWindow ? [] : dateRange(visibleStart, requestedTo), [outsideWindow, visibleStart, requestedTo])
  const calendarKey = resolved?.leg.key
  const persistedDate = calendarKey ? plan.state.calendarDateByLeg[calendarKey] : undefined
  const selectedDate = persistedDate && dates.includes(persistedDate) ? persistedDate : dates[0] ?? visibleStart
  const representatives = useFareDayRepresentatives(artifactRef, datasetRef)
  const selectedResult = useFareRowsForDate(artifactRef, datasetRef, selectedDate)
  const chooseDate = (date: string) => {
    if (calendarKey) dispatch({ kind: 'calendarDateByLeg', artifactId: plan.state.artifactId, calendarDateByLeg: { ...plan.state.calendarDateByLeg, [calendarKey]: date } })
  }
  useEffect(() => {
    if (!calendarKey) return
    if (dates.length > 0) {
      if (persistedDate !== selectedDate) chooseDate(selectedDate)
      return
    }
    if (persistedDate) {
      const { [calendarKey]: _removed, ...calendarDateByLeg } = plan.state.calendarDateByLeg
      dispatch({ kind: 'calendarDateByLeg', artifactId: plan.state.artifactId, calendarDateByLeg })
    }
  }, [calendarKey, dates.length, persistedDate, selectedDate])
  if (!resolved) return <EmptyPlanningState />
  if (outsideWindow) return <Card className="trip-planning-control trip-fare-calendar"><div className="trip-calendar-header"><div><span className="trip-kicker">Flexible dates</span><h3>{title ?? 'Fare calendar'}</h3></div></div><Alert role="status">No departures fit this trip window; adjust the previous fare or stay.</Alert></Card>
  if (representatives.status === 'loading' || selectedResult.status === 'loading') return <Skeleton className="trip-calendar-skeleton" role="status">Comparing days…</Skeleton>
  if (representatives.status === 'error' || selectedResult.status === 'error') return <Alert>Calendar fares could not load. Try the date again.</Alert>
  const byDate = new Map(representatives.rows.map(row => [row.serviceDate, row]))
  const selectedRows = selectedResult.rows
  return <Card className="trip-planning-control trip-fare-calendar">
    <div className="trip-calendar-header"><div><span className="trip-kicker">Flexible dates</span><h3>{title ?? 'Fare calendar'}</h3></div><p>{cityLabel(resolved.leg.originId)} <ArrowRight aria-hidden="true" /> {cityLabel(resolved.leg.destinationId)}</p></div>
    <div className="trip-calendar-grid">{dates.map(date => {
      const representative = byDate.get(date)
      return <Button key={date} type="button" variant="outline" className="trip-calendar-day" aria-pressed={selectedDate === date} onClick={() => chooseDate(date)}>
        <span>{new Date(`${date}T12:00:00.000Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</span>
        <strong>{representative ? money(representative.priceCents) : 'No fares'}</strong>
        <small>{representative ? `${cityLabel(representative.mode)} · ${duration(representative.durationMinutes)}` : 'Try another day'}</small>
        {representative && <i aria-label={cityLabel(representative.mode)}>{modeIcon(representative.mode)}</i>}
      </Button>
    })}</div>
    <div className="trip-calendar-results" aria-live="polite">
      <h4>{new Date(`${selectedDate}T12:00:00.000Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</h4>
      <p className="trip-fare-caption">Synthetic fares per passenger</p>
      {selectedRows.length > 0 ? <div>{selectedRows.slice(0, 8).map(row => {
        const selected = selectedResult.state.selectedFareIds.includes(row.id)
        return <div key={row.id} className={`trip-calendar-result${selected ? ' is-selected' : ''}`}><span>{modeIcon(row.mode)}{departure(row.departureMinutes)} · {cityLabel(row.mode)}</span><strong>{money(row.priceCents)}</strong><small>{duration(row.durationMinutes)} · {carrierLabel(row, selectedResult.services.bridge, selectedResult.datasetId)}</small><Button type="button" size="sm" variant={selected ? 'default' : 'outline'} aria-pressed={selected} onClick={() => dispatch({ kind: 'select', artifactId: selectedResult.state.artifactId, fareId: row.id, selected: !selected })}>{selected ? 'Selected' : 'Choose'}</Button></div>
      })}</div> : <p role="status">No synthetic fares match this day and transport selection.</p>}
    </div>
  </Card>
}

export function FareCalendar(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const resolved = resolveLeg(plan, props.datasetRef)
  if (!resolved) return <EmptyPlanningState />
  return <FareCalendarView artifactRef={props.artifactRef} datasetRef={resolved.leg.datasetId} title={props.title} />
}

function LegRow({ plan, leg, index, locations }: { plan: Plan; leg: PlanLeg; index: number; locations: LocationOption[] }) {
  return <Card className="trip-plan-leg" aria-label={`Leg ${index + 1}: ${cityLabel(leg.originId)} to ${cityLabel(leg.destinationId)}`}>
    <div className="trip-leg-number"><span>{index + 1}</span><div><small>LEG</small><strong>{cityLabel(leg.originId)} to {cityLabel(leg.destinationId)}</strong></div></div>
    <CityFields plan={plan} leg={leg} legIndex={index} locations={locations} />
    <TravelDateControl plan={plan} leg={leg} />
    <TransportSelectControl plan={plan} leg={leg} presentation="dropdown" />
    <FareOrderControl plan={plan} leg={leg} />
    <FareStrip artifactRef={plan.state.artifactId} datasetRef={leg.datasetId} compact />
  </Card>
}

function EmptyPlanningState() {
  return <Card className="trip-planning-empty" role="status"><MapPin aria-hidden="true" /><div><strong>No route is ready yet</strong><p>Ask the assistant to add at least two cities and load synthetic fares.</p></div></Card>
}

export function MultiCityPlanGrid(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const catalog = useLocationCatalog()
  if (!plan.legs.length) return <EmptyPlanningState />
  return <Card className="trip-multicity-plan" role="region" aria-label={props.title ?? 'Multi-city trip planner'}>
    <header className="trip-plan-header"><div><span className="trip-kicker">Build your route</span><h2>{props.title ?? 'Multi-city plan'}</h2><p>Adjust each leg locally. Dates, stays, transport, and selected fares remain attached to this plan.</p></div><div className="trip-plan-summary"><Clock3 aria-hidden="true" /><span>{plan.legs.length} leg{plan.legs.length === 1 ? '' : 's'}</span></div></header>
    {plan.status === 'loading' && <p className="trip-plan-status" role="status">Checking selected fare times…</p>}
    {catalog.status === 'error' && <Alert>City suggestions are unavailable. Your current route remains visible.</Alert>}
    <div className="trip-plan-grid">{plan.legs.map((leg, index) => <div className="trip-plan-step" key={leg.key}>
      <LegRow plan={plan} leg={leg} index={index} locations={catalog.locations} />
      {index < plan.legs.length - 1 && <div className="trip-stay-bridge"><span aria-hidden="true" /><Card><StayDurationControl plan={plan} leg={leg} nextLeg={plan.legs[index + 1]} /></Card></div>}
    </div>)}</div>
    <p className="trip-synthetic-note">All fares and totals are synthetic demo data. Prices are per passenger and include demo fees.</p>
  </Card>
}

export const tripPlanningComponents = {
  CityField,
  TravelDate,
  StayDuration,
  TransportSelect,
  FareOrder,
  FadeFares,
  FareCalendar,
  MultiCityPlanGrid,
}
