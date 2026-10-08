import type { FareItem } from '../contracts/query-groups'
import { cityLabel, duration } from './context'

export function FareRouteDetails({ row, compact = false }: {
  row: FareItem
  compact?: boolean
}) {
  const itinerary = { transfers: row.legs.length - 1, legs: row.legs }
  if (itinerary.transfers === 0) return <small className="fare-route-summary">Direct</small>
  return <div className={`fare-route-details${compact ? ' is-compact' : ''}`}>
    <strong>{itinerary.transfers} {itinerary.transfers === 1 ? 'transfer' : 'transfers'}</strong>
    <ol aria-label="Journey legs">
      {itinerary.legs.map(leg => <li key={`${row.id}-${leg.legIndex}`}>
        <span>{cityLabel(leg.mode)} · {leg.carrierName}</span>
        <small>{leg.originLabel} → {leg.destinationLabel} · {duration(leg.durationMinutes)}</small>
      </li>)}
    </ol>
  </div>
}
