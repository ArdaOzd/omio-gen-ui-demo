import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSearchUrl, getJson, normalizeLocations, normalizeSearch } from './api.js'
import LandingPage from './components/LandingPage.jsx'
import ResultsPage from './components/ResultsPage.jsx'

function localDate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

const DEFAULT_SEARCH = {
  origin: { id: 'london', display_name: 'London, United Kingdom' },
  destination: { id: 'paris', display_name: 'Paris, France' },
  departureDate: localDate(),
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
    return { min: min || localDate(), max: max || '2027-12-31' }
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
      const payload = await getJson(buildSearchUrl(query), controller.signal)
      setResults(normalizeSearch(payload))
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
    />
  )
}
