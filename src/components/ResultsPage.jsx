import { useEffect, useMemo, useState } from 'react'
import { displayLocation, modes, sortTrips } from '../api.js'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import Icon from './Icons.jsx'
import Logo from './Logo.jsx'
import SearchForm from './SearchForm.jsx'

const modeLabels = {
  train: 'Trains',
  bus: 'Buses',
  flight: 'Flights',
  ferry: 'Ferries',
}

const companyColors = {
  FlixBus: '#73d700',
  easyJet: '#f76b00',
  Ryanair: '#153f91',
  Eurostar: '#16377b',
  Trenitalia: '#c01936',
  Italo: '#9d1826',
  'Deutsche Bahn': '#e20015',
  Vueling: '#fcc900',
  Seajets: '#008bd2',
}

function formatPrice(value) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value || 0)
}

function formatDuration(minutes) {
  const value = Number(minutes || 0)
  const hours = Math.floor(value / 60)
  const rest = value % 60
  if (!hours) return `${rest}m`
  return `${hours}h${String(rest).padStart(2, '0')}m`
}

function formatTime(value) {
  if (!value) return '--:--'
  if (/^\d{1,2}:\d{2}/.test(value)) return value.slice(0, 5)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(value, options = {}) {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  return date.toLocaleDateString('en-GB', options)
}

function dateSequence(selected, min, max) {
  const base = new Date(`${selected}T12:00:00`)
  return [-1, 0, 1, 2, 3, 4]
    .map((offset) => {
      const date = new Date(base)
      date.setDate(date.getDate() + offset)
      return date.toISOString().slice(0, 10)
    })
    .filter((date) => date >= min && date <= max)
}

function ResultCard({ trip, selected, onSelect }) {
  const color = companyColors[trip.company] || '#132968'
  return (
    <Card className={`result-card ${selected ? 'result-card--selected' : ''}`} role="article">
      <Collapsible open={selected} onOpenChange={onSelect}>
      <CollapsibleTrigger asChild>
      <Button className="result-card__main" variant="ghost" type="button">
        <span className="result-card__company" style={{ color }}>
          {trip.company}
        </span>
        <span className="result-card__timeline">
          <span className="result-card__endpoint">
            <strong>{formatTime(trip.departure_time)}</strong>
            <span>{trip.origin}</span>
          </span>
          <span className="result-card__journey">
            <span>{formatDuration(trip.duration_minutes)}</span>
            <i aria-hidden="true" />
            <small>
              {trip.transfers === 0
                ? 'Direct'
                : `${trip.transfers} ${trip.transfers === 1 ? 'transfer' : 'transfers'}`}
            </small>
          </span>
          <span className="result-card__endpoint result-card__endpoint--arrival">
            <strong>{formatTime(trip.arrival_time)}</strong>
            <span>{trip.destination}</span>
          </span>
        </span>
        <span className="result-card__fare">
          <strong>{formatPrice(trip.price)}</strong>
          <span>{trip.available_seats > 0 ? `${trip.available_seats} seats left` : 'Available'}</span>
        </span>
        <Icon name="chevron" className="result-card__chevron" size={22} />
      </Button>
      </CollapsibleTrigger>
        <CollapsibleContent className="result-card__details">
          <span>
            <Icon name={trip.mode} size={19} /> {modeLabels[trip.mode] || trip.mode}
          </span>
          <span>
            <Icon name="seat" size={19} /> {trip.available_seats} empty seats
          </span>
          <span>Fare generated for this travel demo</span>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function RouteMap({ trip, search }) {
  const origin = trip?.origin || displayLocation(search.origin)
  const destination = trip?.destination || displayLocation(search.destination)
  return (
    <aside className="route-rail" aria-label="Selected journey route">
      <Card className="map-app-card">
        <img
          src="/assets/omio/app-qr.svg"
          alt="QR code for the Omio app"
        />
        <div>
          <h2>Scan to discover more features and savings in our app</h2>
          <p>✓ Special in-app offers</p>
          <p>✓ Tickets available offline</p>
          <p>✓ Live trip updates</p>
        </div>
      </Card>
      <div className="route-map">
        <span className="map-label map-label--paris">Paris</span>
        <span className="map-label map-label--berlin">Berlin</span>
        <span className="map-label map-label--milan">Milan</span>
        <span className="map-label map-label--madrid">Madrid</span>
        <svg viewBox="0 0 620 660" role="img" aria-label={`Route from ${origin} to ${destination}`}>
          <path
            className="map-land"
            d="M5 125 70 55l90 16 62-42 106 34 58-24 83 55 96 29 49 78-26 48 24 82-63 42 8 72-71 36-57 116-76-4-24-95-95 7-42-88-81-18-41-92-65-59Z"
          />
          <path className="map-route-line" d="M128 456 Q310 250 493 396" />
          <circle className="map-origin" cx="128" cy="456" r="12" />
          <circle className="map-destination" cx="493" cy="396" r="14" />
          <circle className="map-destination-ring" cx="493" cy="396" r="23" />
        </svg>
        <div className="route-point route-point--origin">
          <strong>{origin}</strong>
        </div>
        <div className="route-point route-point--destination">
          <strong>{destination}</strong>
        </div>
      </div>
    </aside>
  )
}

export default function ResultsPage({
  search,
  locations,
  dateBounds,
  results,
  status,
  error,
  onHome,
  onSearch,
}) {
  const [draft, setDraft] = useState(search)
  const [activeMode, setActiveMode] = useState(search.mode === 'all' ? 'train' : search.mode)
  const [activeLeg, setActiveLeg] = useState('outbound')
  const [directOnly, setDirectOnly] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => setDraft(search), [search])
  useEffect(() => {
    setActiveLeg('outbound')
    setSelectedId(null)
  }, [
    search.departureDate,
    search.returnDate,
    displayLocation(search.origin),
    displayLocation(search.destination),
  ])
  useEffect(() => {
    if (search.mode !== 'all') setActiveMode(search.mode)
  }, [search.mode])

  useEffect(() => {
    if (!results || search.mode !== 'all') return
    const firstAvailable = modes.find((mode) => results.mode_summary?.[mode]?.count > 0)
    if (firstAvailable) setActiveMode(firstAvailable)
  }, [results, search.mode])

  const rows = useMemo(() => {
    const legRows = results?.[activeLeg] || []
    const modeRows = legRows.filter((trip) => trip.mode === activeMode)
    const source = modeRows.length || search.mode === 'all' ? modeRows : legRows
    const filtered = directOnly ? source.filter((trip) => trip.transfers === 0) : source
    return sortTrips(filtered, draft.sort)
  }, [results, activeLeg, activeMode, directOnly, draft.sort, search.mode])

  useEffect(() => {
    if (rows.length && !rows.some((trip) => trip.id === selectedId)) {
      setSelectedId(rows[0].id)
    }
  }, [rows, selectedId])

  const selectedTrip = rows.find((trip) => trip.id === selectedId) || rows[0]
  const dates = dateSequence(search.departureDate, dateBounds.min, dateBounds.max)
  const legModeSummary =
    activeLeg === 'return' ? results?.return_mode_summary : results?.mode_summary
  const currentSummary = legModeSummary?.[activeMode] || {}
  const total = activeLeg === 'return' ? results?.return_total || rows.length : results?.total || rows.length
  const displayedTotal = search.mode === 'all' ? currentSummary.count || rows.length : total
  const page = results?.page || search.page || 1
  const limit = results?.limit || search.limit || 20
  const pageCount = Math.max(1, Math.ceil(total / limit))

  function chooseMode(mode) {
    setActiveMode(mode)
    setSelectedId(null)
    setDraft((current) => ({ ...current, mode, page: 1 }))
    onSearch({ ...search, mode, sort: draft.sort, page: 1 }, { instant: true })
  }

  function chooseDate(departureDate) {
    const next = {
      ...search,
      departureDate,
      returnDate:
        search.returnDate && search.returnDate < departureDate ? departureDate : search.returnDate,
      mode: activeMode,
      page: 1,
    }
    setDraft(next)
    onSearch(next, { instant: true })
  }

  function updateSort(sort) {
    const next = { ...draft, sort, mode: activeMode, page: 1 }
    setDraft(next)
    onSearch(next, { instant: true })
  }

  return (
    <main className="results-page">
      <header className="results-header page-shell">
        <Logo onClick={onHome} />
        <div className="results-header__actions">
          <span>€</span>
          <span>EN</span>
          <Badge className="demo-label">Synthetic schedule demo</Badge>
        </div>
      </header>

      <div className="results-search page-shell">
        <SearchForm
          compact
          search={draft}
          locations={locations}
          dateBounds={dateBounds}
          onChange={setDraft}
          onSubmit={(next) => onSearch({ ...next, mode: activeMode }, { instant: true })}
        />
      </div>

      <div className="results-layout">
        <section className="results-list" aria-label="Travel connections">
          <div className="results-toolbar">
            <ToggleGroup
              type="single"
              value={activeMode}
              onValueChange={(value) => value && chooseMode(value)}
              className="mode-tabs"
              aria-label="Transport mode"
            >
              {modes.map((mode) => {
                const summary = legModeSummary?.[mode] || {}
                return (
                  <ToggleGroupItem
                    key={mode}
                    value={mode}
                    type="button"
                    className={activeMode === mode ? 'is-active' : ''}
                  >
                    <Icon name={mode} size={27} />
                    <span>
                      <strong>{modeLabels[mode]}</strong>
                      <small>
                        {summary.count > 0
                          ? `${summary.count} · from ${formatPrice(summary.min_price)}`
                          : 'No fares yet'}
                      </small>
                    </span>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>

            <div className="date-strip" aria-label="Travel date">
              {dates.map((date) => (
                <Button
                  type="button"
                  variant="ghost"
                  key={date}
                  className={date === search.departureDate ? 'is-active' : ''}
                  onClick={() => chooseDate(date)}
                >
                  <strong>{formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                  <span>
                    {date === search.departureDate && currentSummary.min_price > 0
                      ? `from ${formatPrice(currentSummary.min_price)}`
                      : 'Check fare'}
                  </span>
                </Button>
              ))}
            </div>

            <div className="filter-row">
              <Label className="sort-control">
                <span>Sort</span>
                <NativeSelect value={draft.sort} onChange={(event) => updateSort(event.target.value)}>
                  <NativeSelectOption value="price_asc">Price: low to high</NativeSelectOption>
                  <NativeSelectOption value="price_desc">Price: high to low</NativeSelectOption>
                  <NativeSelectOption value="duration_asc">Travel time: shortest</NativeSelectOption>
                  <NativeSelectOption value="duration_desc">Travel time: longest</NativeSelectOption>
                </NativeSelect>
              </Label>
              <Button
                className={`filter-pill ${directOnly ? 'is-active' : ''}`}
                variant={directOnly ? 'default' : 'outline'}
                type="button"
                aria-pressed={directOnly}
                onClick={() => setDirectOnly((current) => !current)}
              >
                Direct only
              </Button>
              <Badge className="filter-summary" variant="outline">
                {status === 'success'
                  ? `${displayedTotal.toLocaleString()} options`
                  : 'Finding options'}
              </Badge>
            </div>

            {search.returnDate && status === 'success' && (
              <ToggleGroup
                type="single"
                value={activeLeg}
                onValueChange={(value) => {
                  if (!value) return
                  setActiveLeg(value)
                  setSelectedId(null)
                }}
                className="leg-switch"
                aria-label="Journey leg"
              >
                <ToggleGroupItem
                  type="button"
                  value="outbound"
                  className={activeLeg === 'outbound' ? 'is-active' : ''}
                >
                  Outbound · {formatDate(search.departureDate, { month: 'short', day: 'numeric' })}
                </ToggleGroupItem>
                <ToggleGroupItem
                  type="button"
                  value="return"
                  className={activeLeg === 'return' ? 'is-active' : ''}
                >
                  Return · {formatDate(search.returnDate, { month: 'short', day: 'numeric' })}
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>

          <div className="result-content" aria-live="polite">
            {status === 'loading' && (
              <Card className="loading-state" role="status">
                <Spinner className="loading-spinner" />
                <h2>Comparing every available fare</h2>
                <p>Checking generated schedules and empty seats.</p>
              </Card>
            )}

            {status === 'error' && (
              <Alert className="message-state" variant="destructive">
                <AlertTitle><h2>We could not load these connections</h2></AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <Button type="button" variant="outline" onClick={() => onSearch(search, { instant: true })}>
                  Try again
                </Button>
              </Alert>
            )}

            {status === 'success' && rows.length === 0 && (
              <Card className="message-state" role="status">
                <Icon name={activeMode} size={42} />
                <h2>No {modeLabels[activeMode].toLowerCase()} match this search</h2>
                <p>Try another date, turn off “Direct only”, or choose a different transport tab.</p>
                {directOnly && (
                  <Button type="button" variant="outline" onClick={() => setDirectOnly(false)}>
                    Show connections with transfers
                  </Button>
                )}
              </Card>
            )}

            {status === 'success' && rows.length > 0 && (
              <>
                <div className="result-heading">
                  <div>
                    <span>{activeLeg === 'outbound' ? 'Outbound journey' : 'Return journey'}</span>
                    <h1>
                      {activeLeg === 'return'
                        ? `${displayLocation(search.destination)} to ${displayLocation(search.origin)}`
                        : `${displayLocation(search.origin)} to ${displayLocation(search.destination)}`}
                    </h1>
                  </div>
                  <small>Only fares with empty seats are shown</small>
                </div>
                <div className="result-cards">
                  {rows.map((trip) => (
                    <ResultCard
                      key={trip.id}
                      trip={trip}
                      selected={selectedId === trip.id}
                      onSelect={() => setSelectedId(selectedId === trip.id ? null : trip.id)}
                    />
                  ))}
                </div>
                <div className="pagination" aria-label="Result pages">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => onSearch({ ...search, mode: activeMode, page: page - 1 }, { instant: true })}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {page} of {pageCount}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page >= pageCount}
                    onClick={() => onSearch({ ...search, mode: activeMode, page: page + 1 }, { instant: true })}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        <RouteMap trip={selectedTrip} search={search} />
      </div>
    </main>
  )
}
