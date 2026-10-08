const MODE_ORDER = ['train', 'bus', 'flight', 'ferry']

export const modes = MODE_ORDER

export function displayLocation(location) {
  if (typeof location === 'string') return location
  return (
    location?.display_name ||
    location?.name ||
    location?.city ||
    location?.label ||
    ''
  )
}

export function locationValue(location) {
  if (typeof location === 'string') return location
  return location?.slug || location?.id || location?.code || displayLocation(location)
}

export function normalizeLocations(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : payload?.locations || payload?.items || payload?.data || []

  return rows
    .map((row, index) => {
      if (typeof row === 'string') {
        return { id: row, name: row, display_name: row }
      }
      const name = displayLocation(row)
      return {
        ...row,
        id: row.id ?? row.slug ?? row.code ?? `${name}-${index}`,
        name,
        display_name: name,
      }
    })
    .filter((row) => row.display_name)
}

function minutesFromDuration(value) {
  if (Number.isFinite(Number(value))) return Number(value)
  if (typeof value !== 'string') return 0
  const hours = Number(value.match(/(\d+)\s*h/i)?.[1] || 0)
  const minutes = Number(value.match(/(\d+)\s*m/i)?.[1] || 0)
  return hours * 60 + minutes
}

function normalizeTrip(row, leg = 'outbound') {
  const departure =
    row.departure_time || row.departure_at || row.start_time || row.departure || ''
  const arrival = row.arrival_time || row.arrival_at || row.end_time || row.arrival || ''
  const price = Number(
    row.price ??
      row.price_eur ??
      row.amount ??
      (row.price_cents !== undefined ? row.price_cents / 100 : 0),
  )
  const routeLegs = Array.isArray(row.legs)
    ? row.legs.map((routeLeg, index) => ({
        ...routeLeg,
        leg_index: Number(routeLeg.leg_index ?? index),
        mode: String(routeLeg.mode || 'train').toLowerCase(),
        company: routeLeg.company || 'Travel partner',
        duration_minutes: minutesFromDuration(routeLeg.duration_minutes),
        origin: displayLocation(routeLeg.origin),
        destination: displayLocation(routeLeg.destination),
      }))
    : []

  return {
    ...row,
    id: row.id ?? `${leg}-${row.company}-${departure}-${arrival}`,
    leg,
    mode: String(row.mode || row.transport_mode || 'train').toLowerCase(),
    company: row.company || row.operator || row.provider || 'Travel partner',
    departure_time: departure,
    arrival_time: arrival,
    duration_minutes: minutesFromDuration(
      row.duration_minutes ?? row.duration ?? row.travel_time_minutes,
    ),
    origin: displayLocation(
      row.origin || row.start_point || row.departure_point || row.origin_name || '',
    ),
    destination: displayLocation(
      row.destination || row.end_point || row.arrival_point || row.destination_name || '',
    ),
    price,
    available_seats: Number(
      row.available_seats ?? row.empty_seat_count ?? row.empty_seats ?? row.seats ?? 0,
    ),
    transfers: Number(row.transfers ?? row.stops ?? 0),
    legs: routeLegs,
  }
}

function unwrapRows(payload, keys) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key]
    if (Array.isArray(payload?.[key]?.results)) return payload[key].results
    if (Array.isArray(payload?.[key]?.items)) return payload[key].items
  }
  return []
}

export function normalizeSearch(payload) {
  let outbound = unwrapRows(payload, ['outbound', 'results', 'items', 'connections'])
  let inbound = unwrapRows(payload, ['return', 'inbound', 'return_results'])

  if (!outbound.length && Array.isArray(payload)) outbound = payload

  const allTrips = outbound.map((row) => normalizeTrip(row, 'outbound'))
  const returnTrips = inbound.map((row) => normalizeTrip(row, 'return'))
  const summarySource =
    payload?.mode_summary ||
    payload?.mode_summaries ||
    payload?.outbound?.mode_summaries ||
    payload?.outbound?.mode_summary ||
    payload?.modes ||
    {}
  const returnSummarySource =
    payload?.return_mode_summary ||
    payload?.return_mode_summaries ||
    payload?.return?.mode_summaries ||
    payload?.return?.mode_summary ||
    {}

  function buildModeSummary(sourceRows, trips) {
    return Object.fromEntries(
    MODE_ORDER.map((mode) => {
      const source = Array.isArray(sourceRows)
        ? sourceRows.find((item) => item.mode === mode) || {}
        : sourceRows[mode] || {}
      const matching = trips.filter((trip) => trip.mode === mode)
      const prices = matching.map((trip) => trip.price).filter(Number.isFinite)
      return [
        mode,
        {
          count: Number(source.count ?? source.total ?? matching.length),
          min_price: Number(
            source.min_price ??
              source.minimum_price ??
              (source.minimum_price_cents !== undefined
                ? source.minimum_price_cents / 100
                : prices.length
                  ? Math.min(...prices)
                  : 0),
          ),
          min_duration: Number(
            source.min_duration ??
              source.minimum_duration ??
              source.minimum_duration_minutes ??
              (matching.length
                ? Math.min(...matching.map((trip) => trip.duration_minutes || Infinity))
                : 0),
          ),
        },
      ]
    }),
  )
  }

  const modeSummary = buildModeSummary(summarySource, allTrips)
  const returnModeSummary = buildModeSummary(returnSummarySource, returnTrips)

  return {
    outbound: allTrips,
    return: returnTrips,
    mode_summary: modeSummary,
    return_mode_summary: returnModeSummary,
    total: Number(payload?.total ?? payload?.outbound?.total ?? allTrips.length),
    return_total: Number(payload?.return_total ?? payload?.return?.total ?? returnTrips.length),
    page: Number(payload?.page ?? payload?.outbound?.page ?? 1),
    limit: Number(payload?.limit ?? payload?.outbound?.limit ?? 20),
  }
}

export async function getJson(url, signal) {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    const bodyText = await response.text()
    let detail = bodyText
    try {
      const errorBody = JSON.parse(bodyText)
      detail =
        errorBody.error?.message ||
        errorBody.error ||
        errorBody.detail ||
        errorBody.message ||
        bodyText
    } catch {}
    throw new Error(detail || `Request failed with status ${response.status}`)
  }
  return response.json()
}

export function buildSearchUrl(search) {
  const params = new URLSearchParams({
    origin: locationValue(search.origin),
    destination: locationValue(search.destination),
    departure_date: search.departureDate,
    passengers: String(search.passengers),
    mode: search.mode || 'all',
    sort: search.sort || 'price_asc',
    page: String(search.page || 1),
    limit: String(search.limit || 20),
  })
  if (search.returnDate) params.set('return_date', search.returnDate)
  return `/api/search?${params.toString()}`
}

export function sortTrips(trips, sort) {
  const next = [...trips]
  const direction = sort.endsWith('_desc') ? -1 : 1
  const key = sort.startsWith('duration') ? 'duration_minutes' : 'price'
  return next.sort((a, b) => (Number(a[key]) - Number(b[key])) * direction)
}
