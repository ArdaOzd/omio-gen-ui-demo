import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode, type UIEvent } from 'react'
import { ArrowRight, BusFront, CalendarDays, ChevronDown, Clock3, MapPin, Plane, Ship, TrainFront } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { DatasetIdSchema, DateSchema, type FareRow, type TransportMode } from '../../contracts'
import { fareMeetsThreshold, thresholdDateTime } from '../../state/itinerary-schedule'
import { legDate, tripDatesForLegDeparture } from '../../state/leg-bindings'
import {
  carrierLabel,
  cityLabel,
  departure,
  duration,
  legKey,
  money,
  useCalendarDays,
  useDayFares,
  useItineraryPlan,
  useOrderedFares,
  useTravelAction,
} from '../context'
import type { WidgetProps } from '../layout'
import { DisplayNodeProvider, recordDisplayInteraction, useDisplayNode, usePublishDisplay } from '../display-context-provider'
import { fareInspectionItems, useProjectionDisplay } from '../display-records'
import { DISPLAY_LIMITS, type ComponentIdentity } from '../../contracts/display-context'

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

function resolveLeg(plan: Plan, datasetRef?: string, legIndex?: number): { leg: PlanLeg; index: number } | undefined {
  if (legIndex !== undefined) {
    const leg = plan.legs[legIndex]
    return leg ? { leg, index: legIndex } : undefined
  }
  if (!datasetRef) {
    const leg = plan.legs[0]
    return leg ? { leg, index: 0 } : undefined
  }
  const parsed = DatasetIdSchema.safeParse(datasetRef)
  if (!parsed.success) return undefined
  const requested = plan.services.bridge.findBinding(parsed.data)
  if(!requested)return undefined
  const requestedKey = legKey(requested.manifest.coverage)
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
  const node = useDisplayNode()
  const fields = ['originId', 'destinationId'] as const
  const cities = routeCities(plan)
  usePublishDisplay({
    inputs: { originId: leg.originId, destinationId: leg.destinationId },
    provenance: node.store?.provenance(plan.state.artifactId, fields),
    display: { payload: { kind: 'route', cityIds: cities }, totalDisplayed: cities.length, includedCount: cities.length, complete: true, omittedCount: 0 },
  })
  const update = (cityIndex: number, cityId: string) => {
    recordDisplayInteraction(node.store, { artifactId: plan.state.artifactId, componentRef: node.componentRef, action: 'input', inputFields: fields })
    updateRoute(plan, dispatch, cityIndex, cityId)
  }
  return <div className="trip-city-pair">
    {!onlyDestination && <LocationInput label="From" value={leg.originId} locations={cityOptions(plan, legIndex, locations)} onSelect={city => update(legIndex, city)} />}
    {!onlyDestination && <ArrowRight className="trip-route-arrow" aria-hidden="true" />}
    <LocationInput label="To" value={leg.destinationId} locations={cityOptions(plan, legIndex + 1, locations)} onSelect={city => update(legIndex + 1, city)} />
  </div>
}

export function CityField(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const catalog = useLocationCatalog()
  const resolved = resolveLeg(plan, props.datasetRef, props.legIndex)
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
  const node = useDisplayNode()
  const [error, setError] = useState('')
  const legIndex = plan.legs.findIndex(candidate => candidate.key === leg.key)
  const stayIndex = plan.state.stays.findIndex(stay => stay.cityId === leg.originId)
  const currentNights = stayIndex >= 0 ? plan.state.stays[stayIndex]?.nights ?? 0 : 0
  const minimumDate = legIndex > 0 ? new Date(Date.parse(`${leg.threshold.date}T00:00:00.000Z`) - currentNights * 86_400_000).toISOString().slice(0, 10) : undefined
  const change = (date: string) => {
    try {
      const valid = DateSchema.parse(date)
      recordDisplayInteraction(node.store, { artifactId: plan.state.artifactId, componentRef: node.componentRef, action: 'input', inputFields: ['serviceDate'] })
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
  usePublishDisplay({ inputs: { serviceDate: leg.threshold.date }, provenance: node.store?.provenance(plan.state.artifactId, ['serviceDate']) })
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
  const resolved = resolveLeg(plan, props.datasetRef, props.legIndex)
  if (!resolved) return <EmptyPlanningState />
  return <Card className="trip-planning-control"><TravelDateControl plan={plan} leg={resolved.leg} label={props.title} /></Card>
}

function StayDurationControl({ plan, leg, nextLeg, title }: { plan: Plan; leg: PlanLeg; nextLeg?: PlanLeg; title?: string }) {
  const dispatch = useTravelAction(plan.state.artifactId)
  const node = useDisplayNode()
  const stay = plan.state.stays.find(item => item.cityId === leg.destinationId)
  const nights = stay?.nights ?? 0
  const setNights = (value: number) => {
    if (!Number.isInteger(value) || value < 0 || value > 30) return
    const existing = plan.state.stays.findIndex(item => item.cityId === leg.destinationId)
    const stays = existing >= 0
      ? plan.state.stays.map((item, index) => index === existing ? { ...item, nights: value } : item)
      : [...plan.state.stays, { cityId: leg.destinationId, nights: value }]
    recordDisplayInteraction(node.store, { artifactId: plan.state.artifactId, componentRef: node.componentRef, action: 'input', inputFields: ['stayNights'] })
    dispatch({ kind: 'stays', artifactId: plan.state.artifactId, stays })
  }
  usePublishDisplay({ inputs: { stayNights: nights }, provenance: node.store?.provenance(plan.state.artifactId, ['stayNights']) })
  return <div className="trip-stay-control">
    <div><strong>{title ?? `Stay in ${cityLabel(leg.destinationId)}`}</strong><span>{nights} night{nights === 1 ? '' : 's'}</span></div>
    <Input type="range" min="0" max="30" step="1" value={nights} aria-label={`Stay in ${cityLabel(leg.destinationId)}`} onChange={event => setNights(Number(event.target.value))} />
    {nextLeg && <small>Next departure: {new Date(thresholdDateTime(nextLeg.threshold)).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</small>}
  </div>
}

export function StayDuration(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const resolved = resolveLeg(plan, props.datasetRef, props.legIndex)
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
  const node = useDisplayNode()
  const explicit = plan.state.modesByLeg[leg.key] ?? []
  const advertised = plan.state.availableModesByLeg[leg.key] ?? leg.availableModes
  const available = modeOrder.filter(mode => advertised.includes(mode))
  const selected = explicit.length ? explicit.filter(mode => available.includes(mode)) : available
  const toggle = (mode: TransportMode) => {
    const next = explicit.length === 0
      ? available.filter(candidate => candidate !== mode)
      : explicit.includes(mode)
        ? explicit.filter(candidate => candidate !== mode)
        : [...explicit, mode]
    const canonical = next.length === available.length ? [] : modeOrder.filter(candidate => next.includes(candidate))
    recordDisplayInteraction(node.store, { artifactId: plan.state.artifactId, componentRef: node.componentRef, action: 'input', inputFields: ['modes'] })
    dispatch({ kind: 'modesByLeg', artifactId: plan.state.artifactId, modesByLeg: { ...plan.state.modesByLeg, [leg.key]: canonical } })
  }
  const selectedLabel = selected.length === available.length ? 'All available' : selected.map(cityLabel).join(', ')
  usePublishDisplay({ inputs: { modes: selected }, provenance: node.store?.provenance(plan.state.artifactId, ['modes']) })
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
  const resolved = resolveLeg(plan, props.datasetRef, props.legIndex)
  if (!resolved) return <EmptyPlanningState />
  return <Card className="trip-planning-control"><TransportSelectControl plan={plan} leg={resolved.leg} title={props.title} /></Card>
}

export function fareOrderFromState(field: Plan['state']['sort']['field'], direction: Plan['state']['sort']['direction']): FareOrderKind {
  if (direction === 'asc' && field === 'priceCents') return 'cheapest'
  if (direction === 'asc' && field === 'durationMinutes') return 'fastest'
  return 'none'
}

const defaultLegSort: Plan['state']['sort'] = { field: 'departureMinutes', direction: 'asc' }

export function sortFares<T extends FareRow>(rows: readonly T[], order: FareOrderKind): T[] {
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
  const node = useDisplayNode()
  const current = plan.state.sortByLeg[leg.key] ?? defaultLegSort
  const selected = fareOrderFromState(current.field, current.direction)
  const choose = (order: FareOrderKind) => {
    const sort: Plan['state']['sort'] = order === 'cheapest'
      ? { field: 'priceCents', direction: 'asc' }
      : order === 'fastest'
        ? { field: 'durationMinutes', direction: 'asc' }
        : { field: 'departureMinutes', direction: 'asc' }
    recordDisplayInteraction(node.store, { artifactId: plan.state.artifactId, componentRef: node.componentRef, action: 'input', inputFields: ['sort'] })
    dispatch({ kind: 'sortByLeg', artifactId: plan.state.artifactId, sortByLeg: { ...plan.state.sortByLeg, [leg.key]: sort } })
  }
  usePublishDisplay({ inputs: { sort: current }, provenance: node.store?.provenance(plan.state.artifactId, ['sort']) })
  return <FieldSet className="trip-order-control">
    <FieldLegend>{title ?? 'Order fares'}</FieldLegend>
    <div>{([['none', 'Departure'], ['cheapest', 'Cheapest'], ['fastest', 'Fastest']] satisfies ReadonlyArray<readonly [FareOrderKind, string]>).map(([value, label]) => <Button key={value} type="button" variant="outline" aria-pressed={selected === value} onClick={() => choose(value)}>{label}</Button>)}</div>
  </FieldSet>
}

export function FareOrder(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const resolved = resolveLeg(plan, props.datasetRef, props.legIndex)
  if (!resolved) return <EmptyPlanningState />
  return <Card className="trip-planning-control"><FareOrderControl plan={plan} leg={resolved.leg} title={props.title} /></Card>
}

type OrderedFaresQuery = ReturnType<typeof useOrderedFares>
type OrderedFaresData = NonNullable<OrderedFaresQuery['data']>
type FareStripPage = {
  cursor: string | null
  resultKey: string
  rankOffset: number
  rows: OrderedFaresData['items']
  source: {
    requirement: OrderedFaresQuery['requirement']
    queryState: OrderedFaresQuery['queryState']
    data: OrderedFaresData
  }
}

function FareStripPageDisplay({ page }: { page: FareStripPage }) {
  const shown = page.rows
  const total = page.source.data.pageInfo.total
  const omitted = Math.max(0, total - shown.length)
  useProjectionDisplay(page.source, {
    payload: {
      kind: 'fare-order',
      orderedFareRefs: shown.map((row, index) => ({ fareId: row.id, rank: page.rankOffset + index + 1 })),
      ...(shown.length ? { renderedRange: { fromRank: page.rankOffset + 1, toRank: page.rankOffset + shown.length }, viewport: { offset: page.rankOffset, limit: shown.length, ...(page.cursor ? { cursor: page.cursor } : {}) } } : {}),
    },
    totalDisplayed: total,
    includedCount: shown.length,
    complete: omitted === 0,
    omittedCount: omitted,
  }, fareInspectionItems(shown, new Map(), page.rankOffset))
  return null
}

function FareStripPagePublisher({ artifactRef, baseRef, legIndex, legKey: resolvedLegKey, resourceKey, page, pageIndex }: { artifactRef: string; baseRef: string; legIndex: number; legKey: string; resourceKey: string; page: FareStripPage; pageIndex: number }) {
  const identity: ComponentIdentity = {
    componentRef: { value: `${baseRef}.page-${pageIndex + 1}`, keySource: 'tree-path' },
    componentType: 'FareStripPage',
    scope: { kind: 'leg', artifactId: artifactRef, legIndex, legKey: resolvedLegKey, resourceKey },
    authored: { title: `Loaded fare results ${pageIndex + 1}` },
  }
  return <DisplayNodeProvider identity={identity}><FareStripPageDisplay page={page} /></DisplayNodeProvider>
}

function FareStrip({ artifactRef, datasetRef, legIndex, componentRef, compact = false }: { artifactRef: string; datasetRef: string; legIndex?: number; componentRef?: string; compact?: boolean }) {
  const plan = useItineraryPlan(artifactRef)
  const dispatch = useTravelAction(artifactRef)
  const resolved = resolveLeg(plan, datasetRef, legIndex)
  const displayNode=useDisplayNode()
  const loadSentinelRef=useRef<HTMLDivElement>(null)
  const pageSize=compact?8:16
  const baseRef=componentRef??displayNode.componentRef??`${artifactRef}:leg-${legIndex??0}.fares`
  const [cursor,setCursor]=useState<string|null>(null)
  const [accumulated,setAccumulated]=useState<{identity:string;pages:FareStripPage[]}>({identity:'',pages:[]})
  const result = useOrderedFares(artifactRef,{componentRef:baseRef,purpose:'trip-fare-strip',legKey:resolved?.leg.key,datasetRef,cursor,limit:pageSize})
  const pagingIdentity=JSON.stringify({
    datasetId:result.requirement.datasetId,
    datasetRevision:result.requirement.datasetRevision,
    sourceVersion:result.requirement.sourceVersion,
    scope:result.requirement.scope,
    projection:{...result.requirement.projection,after:null},
  })
  const committedResult=result.queryState.status==='ready'?result.queryState.current:undefined
  const committedDesiredResult=!!committedResult
    &&committedResult.inputHash===result.queryState.intent.desiredInputHash
    &&result.data?.resultFingerprint===committedResult.resultFingerprint
  const readyResultKey=committedDesiredResult?committedResult.resultKey:undefined
  useEffect(()=>{
    setCursor(null)
    setAccumulated(current=>current.identity===pagingIdentity&&current.pages.length===0?current:{identity:pagingIdentity,pages:[]})
  },[pagingIdentity])
  useEffect(()=>{
    if(!resolved||!result.data||!committedDesiredResult||result.queryState.status!=='ready'||result.requirement.projection.kind!=='farePage'||result.requirement.projection.after!==cursor)return
    const rows=sortFares(result.data.items.filter(row=>row.originId===resolved.leg.originId&&row.destinationId===resolved.leg.destinationId&&fareMeetsThreshold(row,resolved.leg.threshold)),fareOrderFromState((plan.state.sortByLeg[resolved.leg.key]??defaultLegSort).field,(plan.state.sortByLeg[resolved.leg.key]??defaultLegSort).direction))
    const page:FareStripPage={cursor,resultKey:result.queryState.current.resultKey,rankOffset:0,rows,source:{requirement:result.requirement,queryState:result.queryState,data:result.data}}
    setAccumulated(current=>{
      const pages=current.identity===pagingIdentity?current.pages:[]
      if(pages.some(candidate=>candidate.cursor===cursor))return current.identity===pagingIdentity?current:{identity:pagingIdentity,pages}
      const expectedCursor=pages.length?pages.at(-1)!.source.data.pageInfo.nextCursor:null
      if(expectedCursor!==cursor)return current.identity===pagingIdentity?current:{identity:pagingIdentity,pages}
      const seen=new Set(pages.flatMap(candidate=>candidate.rows.map(row=>row.id)))
      const distinctRows=page.rows.filter(row=>!seen.has(row.id))
      const rankOffset=pages.reduce((total,candidate)=>total+candidate.rows.length,0)
      return{identity:pagingIdentity,pages:[...pages,{...page,rankOffset,rows:distinctRows}]}
    })
  },[cursor,pagingIdentity,readyResultKey,resolved?.leg.key,resolved?.leg.originId,resolved?.leg.destinationId,resolved?.leg.threshold.date,resolved?.leg.threshold.minutes])
  const pages=accumulated.identity===pagingIdentity?accumulated.pages:[]
  const shown=pages.flatMap(page=>page.rows)
  const total=pages.at(-1)?.source.data.pageInfo.total??0
  const serialized=shown.slice(0,DISPLAY_LIMITS.orderedFareRefs)
  const omitted=Math.max(0,total-serialized.length)
  usePublishDisplay({display:{payload:{kind:'fare-order',orderedFareRefs:serialized.map((row,index)=>({fareId:row.id,rank:index+1})),...(serialized.length?{renderedRange:{fromRank:1,toRank:serialized.length},viewport:{offset:0,limit:serialized.length}}:{})},totalDisplayed:total,includedCount:serialized.length,complete:omitted===0,omittedCount:omitted}})
  const lastPage=pages.at(-1)
  const nextCursor=lastPage?.source.data.pageInfo.nextCursor
  const canLoadMore=!!nextCursor&&!pages.some(page=>page.cursor===nextCursor)
  const loadingMore=!!lastPage&&cursor!==lastPage.cursor&&result.queryState.status==='loading'
  const appendFailed=!!lastPage&&cursor!==lastPage.cursor&&result.queryState.status==='error'
  const requestNext=useCallback(()=>{
    if(!lastPage)return
    if(appendFailed){
      recordDisplayInteraction(displayNode.store,{artifactId:plan.state.artifactId,componentRef:displayNode.componentRef,action:'retry',inputFields:['cursor']})
      result.refresh()
      return
    }
    if(!canLoadMore||!nextCursor||cursor!==lastPage.cursor)return
    recordDisplayInteraction(displayNode.store,{artifactId:plan.state.artifactId,componentRef:displayNode.componentRef,action:'scroll',inputFields:['cursor']})
    setCursor(nextCursor)
  },[appendFailed,canLoadMore,cursor,displayNode.componentRef,displayNode.store,lastPage,nextCursor,plan.state.artifactId,result.refresh])
  const loadMore=(event:UIEvent<HTMLDivElement>)=>{
    const region=event.currentTarget
    if(region.scrollHeight-region.scrollTop-region.clientHeight>48)return
    requestNext()
  }
  useEffect(()=>{
    const sentinel=loadSentinelRef.current
    if(!sentinel||typeof IntersectionObserver==='undefined'||!canLoadMore||appendFailed)return
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))requestNext()
    },{root:sentinel.parentElement,rootMargin:'48px'})
    observer.observe(sentinel)
    return()=>observer.disconnect()
  },[appendFailed,canLoadMore,requestNext])
  const loadStatus=loadingMore?'Loading more fares…':appendFailed?'More fares could not load.':canLoadMore?'Scroll down to load more fares.':`All ${shown.length} matching fares loaded.`
  if (!resolved) return <EmptyPlanningState />
  if (!pages.length&&result.queryState.status !== 'error') return <Skeleton className="trip-fare-skeleton" role="status">Finding synthetic fares…</Skeleton>
  if (!pages.length&&result.queryState.status === 'error') return <Alert>These synthetic fares could not load. Try the date again.</Alert>
  return <div className={`trip-fare-strip${compact ? ' is-compact' : ''}`}>
    <p className="trip-fare-caption">Synthetic fares per passenger</p>
    {pages.map((page,pageIndex)=><FareStripPagePublisher key={page.resultKey} artifactRef={artifactRef} baseRef={baseRef} legIndex={resolved.index} legKey={resolved.leg.key} resourceKey={resolved.leg.resourceKey} page={page} pageIndex={pageIndex}/>)}
    <div key={pagingIdentity} className="trip-fare-results-scroll" role="region" aria-label={`Scrollable fares from ${cityLabel(resolved.leg.originId)} to ${cityLabel(resolved.leg.destinationId)}`} tabIndex={0} onScroll={loadMore}>
    {shown.length > 0 ? <div className="trip-fare-results-grid">{shown.map(row => {
      const selected = plan.state.selectedFareIds.includes(row.id)
      return <Card key={row.id} className={`trip-fare-option${selected ? ' is-selected' : ''}`} role="article">
        <div className="trip-fare-option-top"><span>{modeIcon(row.mode)}{cityLabel(row.mode)}</span><strong>{money(row.priceCents)}</strong></div>
        <p>{departure(row.departureMinutes)} · {duration(row.durationMinutes)}</p>
        <small>{carrierLabel(row, plan.services.bridge, resolved.leg.resourceKey)} · {row.serviceDate} · {row.direct?'Direct':`${Math.max(1,row.legs.length-1)} change${row.legs.length===2?'':'s'}`}</small>
        <Button type="button" variant={selected ? 'default' : 'outline'} aria-pressed={selected} onClick={() => {recordDisplayInteraction(displayNode.store,{artifactId:artifactRef,componentRef:displayNode.componentRef,action:selected?'deselect':'select'});dispatch({ kind: 'select', artifactId: plan.state.artifactId, fareId: row.id, selected: !selected })}}>{selected ? 'Selected' : 'Choose fare'}</Button>
      </Card>
    })}</div> : <p role="status">No departures meet the current date, arrival time, and transport choices.</p>}
      <div ref={loadSentinelRef} className="trip-fare-load-sentinel"><span className="trip-fare-load-status" role="status">{loadStatus}</span>{appendFailed?<Button type="button" variant="outline" onClick={requestNext}>Retry loading fares</Button>:null}</div>
    </div>
  </div>
}

export function FadeFares(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const resolved = resolveLeg(plan, props.datasetRef, props.legIndex)
  if (!resolved) return <EmptyPlanningState />
  return <Card className="trip-planning-control trip-fade-fares"><h3>{props.title ?? 'Choose a fare'}</h3><FareStrip artifactRef={props.artifactRef} datasetRef={resolved.leg.datasetId} legIndex={resolved.index} /></Card>
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

function ActiveDayDisplayRecord({identity,result,rows,rankOffset,cursor}:{identity:ComponentIdentity;result:ReturnType<typeof useDayFares>;rows:NonNullable<ReturnType<typeof useDayFares>['data']>['items'];rankOffset:number;cursor:string|null}){
 const total=result.data?.pageInfo.total??0,omitted=Math.max(0,total-rows.length)
 return <DisplayNodeProvider identity={identity}><ActiveDayPublisher result={result} rows={rows} total={total} omitted={omitted} rankOffset={rankOffset} cursor={cursor}/></DisplayNodeProvider>
}
function ActiveDayPublisher({result,rows,total,omitted,rankOffset,cursor}:{result:ReturnType<typeof useDayFares>;rows:NonNullable<ReturnType<typeof useDayFares>['data']>['items'];total:number;omitted:number;rankOffset:number;cursor:string|null}){
 useProjectionDisplay(result,{payload:{kind:'fare-order',orderedFareRefs:rows.map((row,index)=>({fareId:row.id,rank:rankOffset+index+1})),...(rows.length?{renderedRange:{fromRank:rankOffset+1,toRank:rankOffset+rows.length},viewport:{offset:rankOffset,limit:rows.length,...(cursor?{cursor}:{})}}:{})},totalDisplayed:total,includedCount:rows.length,complete:omitted===0,omittedCount:omitted},fareInspectionItems(rows,new Map(),rankOffset))
 return null
}

function FareCalendarView({ artifactRef, datasetRef, legIndex, title }: { artifactRef: string; datasetRef: string; legIndex: number; title?: string }) {
  const plan = useItineraryPlan(artifactRef)
  const dispatch = useTravelAction(artifactRef)
  const displayNode=useDisplayNode()
  const resolved = resolveLeg(plan, datasetRef, legIndex)
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
  const calendarOrder: Extract<FareOrderKind, 'cheapest' | 'fastest'> = calendarKey && plan.state.sortByLeg[calendarKey]?.field === 'durationMinutes' ? 'fastest' : 'cheapest'
  const representatives = useCalendarDays(artifactRef,{componentRef:displayNode.componentRef??`${artifactRef}:leg-${legIndex}.calendar`,purpose:'trip-fare-calendar',legKey:calendarKey,datasetRef,objective:calendarOrder})
  const days=representatives.data?.days??[]
  const availableDates = new Set(days.filter(day=>day.count>0).map(day => day.date))
  const selectedDate = persistedDate && dates.includes(persistedDate) && availableDates.has(persistedDate) ? persistedDate : dates.find(date => availableDates.has(date)) ?? visibleStart
  const activeRef=`${displayNode.componentRef??`${artifactRef}:leg-${legIndex}.calendar`}.active-day`
  const activePageSize=8
  const [activeCursor,setActiveCursor]=useState<string|null>(null)
  const [activeCursorHistory,setActiveCursorHistory]=useState<Array<string|null>>([])
  const selectedResult = useDayFares(artifactRef,{componentRef:activeRef,purpose:'trip-calendar-active-day',legKey:calendarKey,datasetRef,serviceDate:selectedDate,cursor:activeCursor,limit:activePageSize})
  const activePagingIdentity=JSON.stringify({selectedDate,datasetRevision:selectedResult.requirement.datasetRevision,sourceVersion:selectedResult.requirement.sourceVersion,filters:plan.state.filters,sort:calendarKey?plan.state.sortByLeg[calendarKey]:undefined,threshold:resolved?.leg.threshold})
  useEffect(()=>{setActiveCursor(null);setActiveCursorHistory([])},[activePagingIdentity])
  const cells=dates.map(date=>{const day=days.find(candidate=>candidate.date===date),representative=day?.representative;return{key:date,label:date,value:representative?.priceCents,unit:(representative?'priceCents':'count') as 'priceCents'|'count',fareId:representative?.id,available:(day?.count??0)>0}})
  useProjectionDisplay(representatives,{payload:{kind:'calendar',selectedDate,cells},totalDisplayed:cells.length,includedCount:cells.length,complete:true,omittedCount:0},fareInspectionItems(days.flatMap(day=>day.representative?[day.representative]:[])))
  const setCalendarDate = (date: string | undefined) => {
    if (!calendarKey) return
    const current=representatives.queryState.status==='ready'||representatives.queryState.status==='refreshing'?representatives.queryState.current:representatives.queryState.status==='error'?representatives.queryState.previous:undefined
    if(!current)return
    const calendarDateByLeg={...plan.state.calendarDateByLeg}
    if(date)calendarDateByLeg[calendarKey]=date;else delete calendarDateByLeg[calendarKey]
    const command={kind:'calendarDateByLeg' as const,artifactId:plan.state.artifactId,calendarDateByLeg,expectedRevision:plan.state.revision}
    const scope={legKey:calendarKey,date,availableDates:[...availableDates],resourceKey:current.resourceKey,datasetId:current.datasetId,datasetRevision:current.datasetRevision,sourceVersion:current.sourceVersion,resultKey:current.resultKey,currentResultKey:()=>representatives.captureResult()?.identity.resultKey,selectionKey:JSON.stringify(plan.state.selectedFareIds)}
    return plan.services.dispatch?.calendarDateFromQuery?.(command,scope)??plan.services.state.dispatch(command)
  }
  const chooseDate = (date: string) => {
    if (availableDates.has(date)) setCalendarDate(date)
  }
  const chooseCalendarOrder = (order: typeof calendarOrder) => {
    if (!calendarKey) return
    const sort: Plan['state']['sort'] = order === 'fastest' ? { field: 'durationMinutes', direction: 'asc' } : { field: 'priceCents', direction: 'asc' }
    dispatch({ kind: 'sortByLeg', artifactId: plan.state.artifactId, sortByLeg: { ...plan.state.sortByLeg, [calendarKey]: sort } })
  }
  useEffect(() => {
    if (!calendarKey || !representatives.data) return
    if (availableDates.size > 0) {
      if (persistedDate !== selectedDate) {
        plan.services.state.dispatch({
          kind: 'calendarDateByLeg',
          artifactId: plan.state.artifactId,
          calendarDateByLeg: { ...plan.state.calendarDateByLeg, [calendarKey]: selectedDate },
          expectedRevision: plan.state.revision,
        })
      }
      return
    }
    if (persistedDate) {
      const { [calendarKey]: _removed, ...calendarDateByLeg } = plan.state.calendarDateByLeg
      plan.services.state.dispatch({ kind: 'calendarDateByLeg', artifactId: plan.state.artifactId, calendarDateByLeg, expectedRevision: plan.state.revision })
    }
  }, [availableDates.size, calendarKey, persistedDate, representatives.data, selectedDate])
  if (!resolved) return <EmptyPlanningState />
  if (outsideWindow) return <Card className="trip-planning-control trip-fare-calendar"><div className="trip-calendar-header"><div><span className="trip-kicker">Flexible dates</span><h3>{title ?? 'Fare calendar'}</h3></div></div><Alert role="status">No departures fit this trip window; adjust the previous fare or stay.</Alert></Card>
  if (!representatives.data || !selectedResult.data) return representatives.queryState.status==='error'||selectedResult.queryState.status==='error'?<Alert>Calendar fares could not load. Try the date again.</Alert>:<Skeleton className="trip-calendar-skeleton" role="status">Comparing days…</Skeleton>
  const byDate = new Map(days.flatMap(day=>day.representative?[[day.date,day.representative] as const]:[]))
  const selectedRows = selectedResult.data.items
  const activePageIndex=activeCursorHistory.length,activeRankOffset=activePageIndex*activePageSize
  const activeIdentity:ComponentIdentity={componentRef:{value:activeRef,keySource:'tree-path'},componentType:'FareCalendarActiveDay',scope:{kind:'leg',artifactId:artifactRef,legIndex,legKey:resolved.leg.key,resourceKey:resolved.leg.resourceKey},authored:{title:'Active calendar day'}}
  return <Card className="trip-planning-control trip-fare-calendar">
    <ActiveDayDisplayRecord identity={activeIdentity} result={selectedResult} rows={selectedRows} rankOffset={activeRankOffset} cursor={activeCursor}/>
    <div className="trip-calendar-header"><div><span className="trip-kicker">Flexible dates</span><h3>{title ?? 'Fare calendar'}</h3></div><p>{cityLabel(resolved.leg.originId)} <ArrowRight aria-hidden="true" /> {cityLabel(resolved.leg.destinationId)}</p></div>
    <FieldSet className="trip-order-control">
      <FieldLegend>Compare each day by</FieldLegend>
      <div role="radiogroup" aria-label="Calendar fare objective">{(['cheapest', 'fastest'] satisfies ReadonlyArray<typeof calendarOrder>).map(order => <Button key={order} type="button" role="radio" variant="outline" aria-checked={calendarOrder === order} onClick={() => chooseCalendarOrder(order)}>{order === 'cheapest' ? 'Cheapest' : 'Fastest'}</Button>)}</div>
    </FieldSet>
    <div className="trip-calendar-grid">{dates.map(date => {
      const representative = byDate.get(date)
      return <Button key={date} type="button" variant="outline" className="trip-calendar-day" disabled={!representative} aria-pressed={selectedDate === date} onClick={() => { if (representative) chooseDate(date) }}>
        <span>{new Date(`${date}T12:00:00.000Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</span>
        <strong>{representative ? money(representative.priceCents) : 'No fares'}</strong>
        <small>{representative ? `${cityLabel(representative.mode)} · ${duration(representative.durationMinutes)}` : 'Not downloaded'}</small>
        {representative && <i aria-label={cityLabel(representative.mode)}>{modeIcon(representative.mode)}</i>}
      </Button>
    })}</div>
    <div className="trip-calendar-results" aria-live="polite">
      <h4>{new Date(`${selectedDate}T12:00:00.000Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</h4>
      <p className="trip-fare-caption">Synthetic fares per passenger</p>
      {selectedRows.length > 0 ? <div>{selectedRows.map(row => {
        const selected = plan.state.selectedFareIds.includes(row.id)
        return <div key={row.id} className={`trip-calendar-result${selected ? ' is-selected' : ''}`}><span>{modeIcon(row.mode)}{departure(row.departureMinutes)} · {cityLabel(row.mode)}</span><strong>{money(row.priceCents)}</strong><small>{duration(row.durationMinutes)} · {carrierLabel(row, plan.services.bridge, resolved.leg.resourceKey)} · {row.direct?'Direct':`${Math.max(1,row.legs.length-1)} change${row.legs.length===2?'':'s'}`}</small><Button type="button" size="sm" variant={selected ? 'default' : 'outline'} aria-pressed={selected} onClick={() => dispatch({ kind: 'select', artifactId: plan.state.artifactId, fareId: row.id, selected: !selected })}>{selected ? 'Selected' : 'Choose'}</Button></div>
      })}</div> : <p role="status">No synthetic fares match this day and transport selection.</p>}
      <div className="travel-pagination" aria-label={`Calendar fare pages for ${selectedDate}`}><Button type="button" variant="outline" disabled={!activeCursorHistory.length} onClick={()=>{recordDisplayInteraction(displayNode.store,{artifactId:artifactRef,componentRef:activeRef,action:'input',inputFields:['cursor']});const previous=activeCursorHistory.at(-1)??null;setActiveCursorHistory(history=>history.slice(0,-1));setActiveCursor(previous)}}>Previous</Button><span>Page {activePageIndex+1}</span><Button type="button" variant="outline" disabled={!selectedResult.data.pageInfo.hasNextPage||!selectedResult.data.pageInfo.nextCursor} onClick={()=>{const next=selectedResult.data?.pageInfo.nextCursor;if(next){recordDisplayInteraction(displayNode.store,{artifactId:artifactRef,componentRef:activeRef,action:'input',inputFields:['cursor']});setActiveCursorHistory(history=>[...history,activeCursor]);setActiveCursor(next)}}}>Next</Button></div>
    </div>
  </Card>
}

export function FareCalendar(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const resolved = resolveLeg(plan, props.datasetRef, props.legIndex)
  if (!resolved) return <EmptyPlanningState />
  return <FareCalendarView artifactRef={props.artifactRef} datasetRef={resolved.leg.datasetId} legIndex={resolved.index} title={props.title} />
}

function InternalLegNode({ plan, leg, index, parentRef, suffix, componentType, children }: { plan: Plan; leg: PlanLeg; index: number; parentRef: string; suffix: string; componentType: string; children: ReactNode }) {
  const componentRef = `${parentRef}.leg-${index}.${suffix}`
  const identity: ComponentIdentity = {
    componentRef: { value: componentRef, keySource: 'tree-path' },
    componentType,
    scope: { kind: 'leg', artifactId: plan.state.artifactId, legIndex: index, legKey: leg.key, resourceKey: leg.resourceKey },
    authored: {},
  }
  return <DisplayNodeProvider identity={identity}>{children}</DisplayNodeProvider>
}

function LegRow({ plan, leg, index, locations, parentRef }: { plan: Plan; leg: PlanLeg; index: number; locations: LocationOption[]; parentRef: string }) {
  return <Card className="trip-plan-leg" aria-label={`Leg ${index + 1}: ${cityLabel(leg.originId)} to ${cityLabel(leg.destinationId)}`}>
    <div className="trip-leg-number"><span>{index + 1}</span><div><small>LEG</small><strong>{cityLabel(leg.originId)} to {cityLabel(leg.destinationId)}</strong></div></div>
    <InternalLegNode plan={plan} leg={leg} index={index} parentRef={parentRef} suffix="cities" componentType="CityFieldInternal"><CityFields plan={plan} leg={leg} legIndex={index} locations={locations} /></InternalLegNode>
    <InternalLegNode plan={plan} leg={leg} index={index} parentRef={parentRef} suffix="date" componentType="TravelDateInternal"><TravelDateControl plan={plan} leg={leg} /></InternalLegNode>
    <InternalLegNode plan={plan} leg={leg} index={index} parentRef={parentRef} suffix="modes" componentType="TransportSelectInternal"><TransportSelectControl plan={plan} leg={leg} presentation="dropdown" /></InternalLegNode>
    <InternalLegNode plan={plan} leg={leg} index={index} parentRef={parentRef} suffix="sort" componentType="FareOrderInternal"><FareOrderControl plan={plan} leg={leg} /></InternalLegNode>
    <InternalLegNode plan={plan} leg={leg} index={index} parentRef={parentRef} suffix="fares" componentType="FadeFaresInternal"><FareStrip artifactRef={plan.state.artifactId} datasetRef={leg.datasetId} compact /></InternalLegNode>
  </Card>
}

function EmptyPlanningState() {
  return <Card className="trip-planning-empty" role="status"><MapPin aria-hidden="true" /><div><strong>No route is ready yet</strong><p>Ask the assistant to add at least two cities and load synthetic fares.</p></div></Card>
}

export function MultiCityPlanGrid(props: WidgetProps) {
  const plan = useItineraryPlan(props.artifactRef)
  const catalog = useLocationCatalog()
  const node = useDisplayNode()
  const cities = routeCities(plan)
  usePublishDisplay({
    inputs: { ...(cities[0] ? { originId: cities[0] } : {}), ...(cities.at(-1) ? { destinationId: cities.at(-1) } : {}), dateWindow: { from: plan.state.dates.start, to: plan.state.dates.end ?? plan.state.dates.start } },
    provenance: node.store?.provenance(plan.state.artifactId, ['originId', 'destinationId', 'dateWindow']),
    display: { payload: { kind: 'route', cityIds: cities }, totalDisplayed: cities.length, includedCount: cities.length, complete: true, omittedCount: 0 },
  })
  if (!plan.legs.length) return <EmptyPlanningState />
  const parentRef = node.componentRef ?? `${props.artifactRef}:multi-city-plan`
  return <Card className="trip-multicity-plan" role="region" aria-label={props.title ?? 'Multi-city trip planner'}>
    <header className="trip-plan-header"><div><span className="trip-kicker">Build your route</span><h2>{props.title ?? 'Multi-city plan'}</h2><p>Adjust each leg locally. Dates, stays, transport, and selected fares remain attached to this plan.</p></div><div className="trip-plan-summary"><Clock3 aria-hidden="true" /><span>{plan.legs.length} leg{plan.legs.length === 1 ? '' : 's'}</span></div></header>
    {plan.status === 'loading' && <p className="trip-plan-status" role="status">Checking selected fare times…</p>}
    {catalog.status === 'error' && <Alert>City suggestions are unavailable. Your current route remains visible.</Alert>}
    <div className="trip-plan-grid">{plan.legs.map((leg, index) => <div className="trip-plan-step" key={leg.key}>
      <LegRow plan={plan} leg={leg} index={index} locations={catalog.locations} parentRef={parentRef} />
      {index < plan.legs.length - 1 && <div className="trip-stay-bridge"><span aria-hidden="true" /><Card><InternalLegNode plan={plan} leg={leg} index={index} parentRef={parentRef} suffix="stay" componentType="StayDurationInternal"><StayDurationControl plan={plan} leg={leg} nextLeg={plan.legs[index + 1]} /></InternalLegNode></Card></div>}
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
