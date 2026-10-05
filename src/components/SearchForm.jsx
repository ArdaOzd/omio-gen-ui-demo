import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { displayLocation } from '../api.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import Icon from './Icons.jsx'

function LocationField({ label, value, locations, onChange }) {
  const [input, setInput] = useState(displayLocation(value))
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef(null)
  const listboxId = useId()
  const inputId = `${listboxId}-input`

  useEffect(() => setInput(displayLocation(value)), [value])

  const suggestions = useMemo(() => {
    const query = normalizeText(input)
    const scored = locations
      .map((location) => {
        const display = normalizeText(displayLocation(location))
        const city = normalizeText(location.city || '')
        let score = 9
        if (!query) score = 4
        else if (display === query || city === query) score = 0
        else if (display.startsWith(query) || city.startsWith(query)) score = 1
        else if (display.split(/[,\s-]+/).some((word) => word.startsWith(query))) score = 2
        else if (display.includes(query)) score = 3
        else if (
          [city, ...display.split(/[,\s-]+/)].some(
            (word) =>
              word &&
              Math.abs(word.length - query.length) <= 2 &&
              editDistance(query, word) <= 1,
          )
        )
          score = 4
        else if (isSubsequence(query, display)) score = 5
        return { location, score }
      })
      .filter((item) => item.score < 9)
      .sort((a, b) => a.score - b.score || displayLocation(a.location).localeCompare(displayLocation(b.location)))
    return scored.slice(0, 7).map((item) => item.location)
  }, [input, locations])

  useEffect(() => {
    function handleOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    if (!open || suggestions.length === 0) setActiveIndex(-1)
    else setActiveIndex((current) => (current >= suggestions.length ? 0 : current))
  }, [open, suggestions.length])

  function selectLocation(location) {
    onChange(location)
    setInput(displayLocation(location))
    setOpen(false)
    setActiveIndex(-1)
  }

  function updateInput(nextValue) {
    setInput(nextValue)
    onChange(nextValue)
    setOpen(true)
    setActiveIndex(0)
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      if (suggestions.length === 0) return
      setActiveIndex((current) => (current + 1 + suggestions.length) % suggestions.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      if (suggestions.length === 0) return
      setActiveIndex((current) =>
        current <= 0 ? Math.max(0, suggestions.length - 1) : current - 1,
      )
      return
    }
    if (event.key === 'Enter' && open && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault()
      selectLocation(suggestions[activeIndex])
    }
  }

  return (
    <div className="location-field" ref={rootRef}>
      <Label htmlFor={inputId}>
        <span className="sr-only">{label}</span>
        <Input
          id={inputId}
          value={input}
          placeholder={`${label}: City, station, airport or port`}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => updateInput(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
        />
      </Label>
      {open && suggestions.length > 0 && (
        <Card
          id={listboxId}
          className="location-menu"
          role="listbox"
          aria-label={`${label} suggestions`}
        >
          {suggestions.map((location, index) => (
            <Button
              key={location.id}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className={activeIndex === index ? 'is-active' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectLocation(location)}
            >
              <Icon name="mapPin" size={18} />
              <span>{displayLocation(location)}</span>
            </Button>
          ))}
        </Card>
      )}
    </div>
  )
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isSubsequence(query, text) {
  if (!query) return true
  let index = 0
  for (const character of text) {
    if (character === query[index]) index += 1
    if (index === query.length) return true
  }
  return false
}

function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let row = 1; row <= a.length; row += 1) {
    const next = [row]
    for (let column = 1; column <= b.length; column += 1) {
      next[column] = Math.min(
        next[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      )
    }
    previous = next
  }
  return previous[b.length]
}

function resolveLocation(value, locations) {
  if (typeof value === 'object' && value?.id) return value
  const query = normalizeText(displayLocation(value))
  const exact = locations.find((location) => {
    const candidates = [location.id, location.city, displayLocation(location)]
    return candidates.some((candidate) => normalizeText(candidate) === query)
  })
  if (exact) return exact
  const prefixMatches = locations.filter((location) => {
    const candidates = [location.city, displayLocation(location)]
    return candidates.some((candidate) => normalizeText(candidate).startsWith(query))
  })
  return prefixMatches.length === 1 ? prefixMatches[0] : null
}

export default function SearchForm({
  search,
  locations,
  dateBounds,
  onChange,
  onSubmit,
  onPlan,
  compact = false,
}) {
  const [message, setMessage] = useState('')
  const [planningMode, setPlanningMode] = useState('travel')
  const [plannerPrompt, setPlannerPrompt] = useState('')
  const plannerSubmitted = useRef(false)

  function update(patch) {
    onChange({ ...search, ...patch })
  }

  function submit(event) {
    event.preventDefault()
    const origin = resolveLocation(search.origin, locations)
    const destination = resolveLocation(search.destination, locations)
    if (!origin || !destination) {
      setMessage('Choose both places from the location suggestions.')
      return
    }
    if (origin.id === destination.id) {
      setMessage('Your destination needs to be different from your starting point.')
      return
    }
    setMessage('')
    onChange({ ...search, origin, destination })
    onSubmit({ ...search, origin, destination, page: 1 })
  }

  function submitPlan(event) {
    event.preventDefault()
    if (plannerSubmitted.current) return
    if (!plannerPrompt.trim()) {
      setMessage('Tell the planner what kind of trip you want.')
      return
    }
    plannerSubmitted.current = true
    setMessage('')
    onPlan(plannerPrompt)
  }

  const smartPlanner = !compact && planningMode === 'planner'

  const plannerPanel = (
    <div className="search-form__planner">
      <Label>
        <span className="sr-only">Describe your trip</span>
        <Textarea
          aria-label="Describe your trip"
          value={plannerPrompt}
          maxLength={5000}
          rows={2}
          autoFocus
          placeholder="Plan a five-day train trip from Prague to the Italian coast in June…"
          onChange={(event) => setPlannerPrompt(event.target.value)}
        />
      </Label>
      <Button className="search-button" type="submit">Plan my trip</Button>
    </div>
  )

  const travelPanel = (
    <div className="search-form__row">
      <div className="search-form__locations">
        <LocationField
          label="From"
          value={search.origin}
          locations={locations}
          onChange={(origin) => update({ origin })}
        />
        <Button
          className="swap-button"
          type="button"
          aria-label="Swap origin and destination"
          onClick={() => update({ origin: search.destination, destination: search.origin })}
        >
          <Icon name="swap" size={22} />
        </Button>
        <LocationField
          label="To"
          value={search.destination}
          locations={locations}
          onChange={(destination) => update({ destination })}
        />
      </div>

      <Label className="search-control search-control--date">
        <span>{compact ? 'Depart' : 'Departure'}</span>
        <Input
          type="date"
          value={search.departureDate}
          min={dateBounds.min}
          max={dateBounds.max}
          onChange={(event) =>
            update({
              departureDate: event.target.value,
              returnDate:
                search.returnDate && search.returnDate < event.target.value
                  ? event.target.value
                  : search.returnDate,
            })
          }
          required
        />
      </Label>

      {search.returnDate ? (
        <Label className="search-control search-control--date search-control--return">
          <span>Return</span>
          <Input
            type="date"
            value={search.returnDate}
            min={search.departureDate || dateBounds.min}
            max={dateBounds.max}
            onChange={(event) => update({ returnDate: event.target.value })}
            required
          />
          <Button
            className="clear-return"
            type="button"
            aria-label="Remove return journey"
            onClick={() => update({ returnDate: '' })}
          >
            ×
          </Button>
        </Label>
      ) : (
        <Button
          className="add-return"
          type="button"
          onClick={() => update({ returnDate: search.departureDate })}
        >
          + Add return
        </Button>
      )}

      <Label className="search-control search-control--passengers">
        <Icon name="user" size={20} />
        <span className="sr-only">Passengers</span>
        <NativeSelect
          value={search.passengers}
          onChange={(event) => update({ passengers: Number(event.target.value) })}
        >
          {[1, 2, 3, 4, 5, 6].map((count) => (
            <NativeSelectOption key={count} value={count}>
              {count} {count === 1 ? 'traveller' : 'travellers'}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Label>

      <Button className="search-button" type="submit">
        Search
      </Button>
    </div>
  )

  return (
    <form className={`search-form ${compact ? 'search-form--compact' : ''}`} onSubmit={smartPlanner ? submitPlan : submit}>
      {compact ? travelPanel : (
        <Tabs value={planningMode} onValueChange={(value) => { setPlanningMode(value); setMessage('') }}>
          <TabsList className="search-form__tabs" variant="line" aria-label="Planning mode">
          <TabsTrigger type="button" value="travel" className={`search-form__tab ${!smartPlanner ? 'search-form__tab--active' : ''}`}>
            <Icon name="spark" size={17} /> Travel
          </TabsTrigger>
          <TabsTrigger type="button" value="planner" className={`search-form__tab ${smartPlanner ? 'search-form__tab--active' : ''}`}>
            <Icon name="spark" size={17} /> Smart planner
          </TabsTrigger>
          </TabsList>
          <TabsContent value="travel" className="search-form__tab-panel">{travelPanel}</TabsContent>
          <TabsContent value="planner" className="search-form__tab-panel">{plannerPanel}</TabsContent>
        </Tabs>
      )}
      {message && <p className="form-message">{message}</p>}
    </form>
  )
}
