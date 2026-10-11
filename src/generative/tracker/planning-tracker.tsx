import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { carrierLabel, cityLabel, departure, money, useTravelServices } from '../catalog/context'
import type { BoundedFareFact } from '../contracts'
import type { PlannedFare, PlanningStore } from './planning-store'

function comparePlannedFares(left: PlannedFare, right: PlannedFare): number {
  return left.fact.serviceDate.localeCompare(right.fact.serviceDate)
    || left.fact.departureMinutes - right.fact.departureMinutes
    || left.fact.id.localeCompare(right.fact.id)
}

function arrival(fare: BoundedFareFact): string {
  const total = fare.departureMinutes + fare.durationMinutes
  const nextDay = Math.floor(total / 1440)
  return `${departure(total % 1440)}${nextDay ? ` +${nextDay}d` : ''}`
}

export function PlanningTracker({ store, disabled = false }: { store: PlanningStore; disabled?: boolean }) {
  const services = useTravelServices()
  const fares = useSyncExternalStore(store.subscribe, store.get, store.get)
  const ordered = useMemo(() => [...fares].sort(comparePlannedFares), [fares])
  const [dialogOpen, setDialogOpen] = useState(false)
  const tracker = useRef<HTMLDivElement>(null)
  const interactionsDisabled = () => disabled || services.interactionsLocked?.() === true

  if (!ordered.length) return null

  const remove = (fare: PlannedFare) => {
    if (interactionsDisabled()) return
    const active = services.activeId()
    const dispatch = services.dispatch ?? services.state.dispatch
    for (const owner of fare.owners) {
      const state = services.state.get(owner)
      if (state.selectedFareIds.includes(fare.fact.id)) {
        dispatch({ kind: 'select', artifactId: owner, fareId: fare.fact.id, selected: false, expectedRevision: state.revision })
      } else {
        store.deselect(owner, fare.fact.id)
      }
    }
    if (active && services.activeId() !== active) services.activate(active)
  }

  const clear = () => {
    if (interactionsDisabled()) return
    const active = services.activeId()
    const dispatch = services.dispatch ?? services.state.dispatch
    for (const fare of ordered) {
      for (const owner of fare.owners) {
        const state = services.state.get(owner)
        if (state.selectedFareIds.includes(fare.fact.id)) {
          dispatch({ kind: 'select', artifactId: owner, fareId: fare.fact.id, selected: false, expectedRevision: state.revision })
        }
      }
    }
    store.clear()
    if (active && services.activeId() !== active) services.activate(active)
  }

  return <Card ref={tracker} className="travel-planning-tracker" role="complementary" aria-label="Fare buying tracker" aria-disabled={disabled||undefined}>
    <div className="travel-planning-header">
      <div><span className="travel-planning-eyebrow">Your trip</span><h2>Fare buying tracker</h2></div>
      <Button type="button" variant="outline" className="travel-planning-clear" onClick={clear} disabled={disabled}>Clear all</Button>
    </div>
    <ol className="travel-planning-list">
      {ordered.map(({ fact, owners }) => <li key={fact.id} className="travel-planning-fare">
        <div className="travel-planning-route">
          <strong>{cityLabel(fact.originId)} → {cityLabel(fact.destinationId)}</strong>
          <span>{fact.serviceDate} · {departure(fact.departureMinutes)}–{arrival(fact)}</span>
        </div>
        <div className="travel-planning-detail"><span>{cityLabel(fact.mode)} · {carrierLabel(fact, services.bridge)}</span><strong>{money(fact.priceCents)}</strong></div>
        <Button type="button" variant="outline" className="travel-planning-cancel" aria-label={`Cancel ${cityLabel(fact.originId)} to ${cityLabel(fact.destinationId)} on ${fact.serviceDate}`} onClick={() => remove({ fact, owners })} disabled={disabled}>Cancel</Button>
      </li>)}
    </ol>
    <Dialog open={!disabled&&dialogOpen} onOpenChange={open=>{if(!disabled)setDialogOpen(open)}}>
      <DialogTrigger asChild><Button type="button" className="travel-planning-buy" disabled={disabled}>Buy</Button></DialogTrigger>
      <DialogContent container={tracker.current?.closest<HTMLElement>('.travel-app')} overlayClassName="travel-dialog-backdrop" className="travel-dialog" showCloseButton={false}>
        <DialogTitle id="travel-confirmation-title">Congrats, you are set for the trip.</DialogTitle><DialogDescription className="sr-only">Your selected itinerary is ready.</DialogDescription>
        <DialogClose asChild><Button type="button">Close</Button></DialogClose>
      </DialogContent>
    </Dialog>
  </Card>
}
