import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSearchUrl, getJson, modes, normalizeLocations, normalizeSearch } from './api.js'
import LandingPage from './components/LandingPage.jsx'
import ResultsPage from './components/ResultsPage.jsx'
import {
  storeEmptyChatHandoff,
  storeSmartPlannerHandoff,
} from './generative/smart-planner-handoff.ts'

const DATASET_START_DATE = '2026-10-08'
const DATASET_END_DATE = '2027-12-31'

const DEFAULT_SEARCH = {
  origin: { id: 'london', display_name: 'London, United Kingdom' },
  destination: { id: 'paris', display_name: 'Paris, France' },
  departureDate: DATASET_START_DATE,
  returnDate: '',
  passengers: 1,
  mode: 'all',
  sort: 'price_asc',
  page: 1,
  limit: 20,
}

export default function App() {
  const [view, setView] = useState('landing')
  const [locations, setLocations] = useState([])
  const [metadata, setMetadata] = useState(null)
  const [search, setSearch] = useState(DEFAULT_SEARCH)
  const [results, setResults] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const requestRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.allSettled([
      getJson('/api/locations', controller.signal),
      getJson('/api/metadata', controller.signal),
    ]).then(([locationResult, metadataResult]) => {
      if (locationResult.status === 'fulfilled') {
        const nextLocations = normalizeLocations(locationResult.value)
        setLocations(nextLocations)
        const findCity = (query) =>
          nextLocations.find((location) =>
            location.display_name.toLowerCase().startsWith(query),
          )
        setSearch((current) => ({
          ...current,
          origin: findCity('london') || current.origin,
          destination: findCity('paris') || current.destination,
        }))
      }
      if (metadataResult.status === 'fulfilled') {
        setMetadata(metadataResult.value)
      }
    })
    return () => controller.abort()
  }, [])

  const dateBounds = useMemo(() => {
    const min =
      metadata?.timetable?.start_date ||
      metadata?.date_min ||
      metadata?.min_date ||
      metadata?.date_range?.start
    const max =
      metadata?.timetable?.end_date ||
      metadata?.date_max ||
      metadata?.max_date ||
      metadata?.date_range?.end
    return { min: min || DATASET_START_DATE, max: max || DATASET_END_DATE }
  }, [metadata])

  async function runSearch(nextSearch, options = {}) {
    const query = { ...nextSearch, page: options.page || nextSearch.page || 1 }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setSearch(query)
    setView('results')
    setStatus('loading')
    setError('')
    window.scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' })

    try {
      let resolvedQuery = query
      let normalized = normalizeSearch(await getJson(buildSearchUrl(query), controller.signal))
      if (query.mode === 'all') {
        const mode = modes.find((candidate) => normalized.mode_summary[candidate].count > 0)
        if (mode) {
          resolvedQuery = { ...query, mode }
          normalized = normalizeSearch(await getJson(buildSearchUrl(resolvedQuery), controller.signal))
        }
      }
      if (controller.signal.aborted || requestRef.current !== controller) return
      setSearch(resolvedQuery)
      setResults(normalized)
      setStatus('success')
    } catch (requestError) {
      if (requestError.name === 'AbortError') return
      setResults(null)
      setStatus('error')
      setError(requestError.message || 'We could not load connections for this search.')
    }
  }

  function goHome() {
    requestRef.current?.abort()
    setView('landing')
    setStatus('idle')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openSmartPlanner(prompt) {
    const { id } = typeof prompt === 'string'
      ? storeSmartPlannerHandoff(prompt)
      : storeEmptyChatHandoff()
    window.location.assign(`/generative?handoff=${encodeURIComponent(id)}`)
  }

  if (view === 'results') {
    return (
      <ResultsPage
        search={search}
        locations={locations}
        dateBounds={dateBounds}
        results={results}
        status={status}
        error={error}
        onHome={goHome}
        onSearch={runSearch}
      />
    )
  }

  return (
    <LandingPage
      search={search}
      locations={locations}
      dateBounds={dateBounds}
      onSearch={runSearch}
      onSearchChange={setSearch}
      onPlan={openSmartPlanner}
    />
  )
}
