import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ArtifactIdSchema, type ArtifactId, type BoundedFareFact, type FareId } from '../../contracts'
import { carrierLabel, cityLabel, departure, money, useTravelServices } from '../../catalog/context'

type PlannedFare = {
  fareId: FareId
  fact?: BoundedFareFact
  firstSelectionIndex: number
  owners: ArtifactId[]
}

type PlannedFareResult =
  | { identity: string; status: 'loading' }
  | { identity: string; status: 'ready'; fares: PlannedFare[] }

const artifactIds = (services: ReturnType<typeof useTravelServices>): ArtifactId[] => {
  const ids = services.artifactIds?.()
  if (ids) return ids
  const active = services.activeId()
  return active ? [ArtifactIdSchema.parse(active)] : []
}

function selectionIdentity(services: ReturnType<typeof useTravelServices>): string {
  return JSON.stringify(artifactIds(services).map(id => [id, services.state.get(id).revision, services.state.get(id).selectedFareIds]))
}

function selectedFares(services: ReturnType<typeof useTravelServices>): PlannedFare[] {
  const selected = new Map<FareId, PlannedFare>()
  let selectionIndex = 0
  for (const artifactId of artifactIds(services)) {
    for (const fareId of services.state.get(artifactId).selectedFareIds) {
      const existing = selected.get(fareId)
      if (existing) existing.owners.push(artifactId)
      else selected.set(fareId, { fareId, firstSelectionIndex: selectionIndex, owners: [artifactId] })
      selectionIndex += 1
    }
  }
  return [...selected.values()]
}

function comparePlannedFares(left: PlannedFare, right: PlannedFare): number {
  if (!left.fact && !right.fact) return left.firstSelectionIndex - right.firstSelectionIndex || left.fareId.localeCompare(right.fareId)
  if (!left.fact) return 1
  if (!right.fact) return -1
  return left.fact.serviceDate.localeCompare(right.fact.serviceDate)
    || left.fact.departureMinutes - right.fact.departureMinutes
    || left.firstSelectionIndex - right.firstSelectionIndex
    || left.fareId.localeCompare(right.fareId)
}

function usePlanningFares(): { fares: PlannedFare[]; loading: boolean } {
  const services = useTravelServices()
  const subscribe = useMemo(() => (listener: () => void) => {
    let stateSubscriptions: Array<() => void> = []
    const bindState = () => {
      stateSubscriptions.forEach(stop => stop())
      stateSubscriptions = artifactIds(services).map(id => services.state.subscribe(id, listener))
    }
    bindState()
    const stopRegistry = services.subscribeActive?.(() => {
      bindState()
      listener()
    })
    return () => {
      stopRegistry?.()
      stateSubscriptions.forEach(stop => stop())
    }
  }, [services])
  const read = () => selectionIdentity(services)
  const identity = useSyncExternalStore(subscribe, read, read)
  const selections = useMemo(() => selectedFares(services), [services, identity])
  const [result, setResult] = useState<PlannedFareResult>({ identity, status: 'loading' })

  useEffect(() => {
    let active = true
    setResult({ identity, status: 'loading' })
    Promise.allSettled(selections.map(item => services.bridge.lookupFare(item.fareId, []))).then(results => {
      if (!active || selectionIdentity(services) !== identity) return
      const fares = selections.map((item, index) => {
        const result = results[index]
        return result?.status === 'fulfilled' ? { ...item, fact: result.value } : item
      }).sort(comparePlannedFares)
      setResult({ identity, status: 'ready', fares })
    })
    return () => { active = false }
  }, [identity, selections, services])

  const current = result.identity === identity ? result : { identity, status: 'loading' as const }
  return { fares: current.status === 'ready' ? current.fares : selections, loading: current.status === 'loading' }
}

export function PlanningTracker() {
  const services = useTravelServices()
  const { fares, loading } = usePlanningFares()
  const [dialogOpen, setDialogOpen] = useState(false)
  const buyButton = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const dialogWasOpen = useRef(false)

  useEffect(() => {
    if (!dialogOpen) {
      if (dialogWasOpen.current) buyButton.current?.focus()
      dialogWasOpen.current = false
      return
    }
    dialogWasOpen.current = true
    closeButton.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialogOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [dialogOpen])

  if (!fares.length) return null

  const remove = (fare: PlannedFare) => {
    const active = services.activeId()
    const dispatch = services.dispatch ?? services.state.dispatch
    for (const owner of fare.owners) {
      const state = services.state.get(owner)
      dispatch({ kind: 'select', artifactId: owner, fareId: fare.fareId, selected: false, expectedRevision: state.revision })
    }
    if (active && services.activeId() !== active) services.activate(active)
  }
  const clear = () => {
    const active = services.activeId()
    const dispatch = services.dispatch ?? services.state.dispatch
    for (const fare of fares) {
      for (const owner of fare.owners) {
        const state = services.state.get(owner)
        dispatch({ kind: 'select', artifactId: owner, fareId: fare.fareId, selected: false, expectedRevision: state.revision })
      }
    }
    if (active && services.activeId() !== active) services.activate(active)
  }

  return <aside className="travel-planning-tracker" aria-label="Planning tracker">
    <div className="travel-planning-header">
      <div><span className="travel-planning-eyebrow">Your trip</span><h2>Planning tracker</h2></div>
      <button type="button" className="travel-planning-clear" onClick={clear}>Clear all</button>
    </div>
    {loading && <p className="travel-caption" role="status">Loading selected fares…</p>}
    <ol className="travel-planning-list">
      {fares.map(fare => <li key={fare.fareId} className="travel-planning-fare">
        {fare.fact ? <>
          <div className="travel-planning-route"><strong>{cityLabel(fare.fact.originId)} → {cityLabel(fare.fact.destinationId)}</strong><span>{fare.fact.serviceDate} · {departure(fare.fact.departureMinutes)}</span></div>
          <div className="travel-planning-detail"><span>{cityLabel(fare.fact.mode)} · {carrierLabel(fare.fact, services.bridge)}</span><strong>{money(fare.fact.priceCents)}</strong></div>
        </> : <div className="travel-planning-route"><strong>Selected fare</strong><span>Details are temporarily unavailable.</span></div>}
        <button type="button" className="travel-planning-cancel" aria-label={`Cancel ${fare.fact ? `${cityLabel(fare.fact.originId)} to ${cityLabel(fare.fact.destinationId)} on ${fare.fact.serviceDate}` : 'selected fare'}`} onClick={() => remove(fare)}>Cancel</button>
      </li>)}
    </ol>
    <button ref={buyButton} type="button" className="travel-planning-buy" onClick={() => setDialogOpen(true)}>Buy</button>
    {dialogOpen && <div className="travel-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDialogOpen(false) }}>
      <div className="travel-dialog" role="dialog" aria-modal="true" aria-labelledby="travel-confirmation-title">
        <h2 id="travel-confirmation-title">Congrats, you are set for the trip.</h2>
        <button ref={closeButton} type="button" onClick={() => setDialogOpen(false)}>Close</button>
      </div>
    </div>}
  </aside>
}
