import type { DatasetId, FareDataBridge, FareRow } from '../contracts'
import { cityLabel, duration } from './context'

export function FareRouteDetails({ row, bridge, datasetId, compact = false }: {
  row: FareRow
  bridge: FareDataBridge
  datasetId: DatasetId
  compact?: boolean
}) {
  const itinerary = bridge.getFareItinerary?.(row.id, datasetId) ?? {
    transfers: row.legs?.length ? row.legs.length - 1 : row.direct ? 0 : 1,
    legs: row.legs ?? [],
  }
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
