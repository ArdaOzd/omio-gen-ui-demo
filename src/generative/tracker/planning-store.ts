import { z } from 'zod'
import { ArtifactIdSchema, BoundedFareFactSchema, LIMITS, type ArtifactId, type BoundedFareFact, type FareId } from '../contracts'

export const PlannedFareSchema = z.strictObject({
  fact: BoundedFareFactSchema,
  owners: z.array(ArtifactIdSchema).min(1).max(LIMITS.storedArtifacts),
})

export type PlannedFare = z.infer<typeof PlannedFareSchema>

export type PlanningStore = {
  get: () => readonly PlannedFare[]
  select: (owner: ArtifactId, fact: BoundedFareFact) => void
  deselect: (owner: ArtifactId, fareId: FareId) => void
  clear: () => void
  restore: (fares: readonly PlannedFare[]) => void
  subscribe: (listener: () => void) => () => void
}

export function createPlanningStore(initial: readonly PlannedFare[] = []): PlanningStore {
  let fares = z.array(PlannedFareSchema).max(LIMITS.plannedFares).parse(initial)
  const listeners = new Set<() => void>()
  const publish = () => listeners.forEach(listener => listener())

  return {
    get: () => fares,
    select(owner, fact) {
      const current = fares.find(entry => entry.fact.id === fact.id)
      if (!current) {
        fares = z.array(PlannedFareSchema).max(LIMITS.plannedFares).parse([...fares, { fact, owners: [owner] }])
      } else {
        const owners = current.owners.includes(owner) ? current.owners : [...current.owners, owner]
        fares = fares.map(entry => entry.fact.id === fact.id ? PlannedFareSchema.parse({ fact, owners }) : entry)
      }
      publish()
    },
    deselect(owner, fareId) {
      const next = fares.flatMap(entry => {
        if (entry.fact.id !== fareId) return [entry]
        const owners = entry.owners.filter(candidate => candidate !== owner)
        return owners.length ? [PlannedFareSchema.parse({ ...entry, owners })] : []
      })
      if (next.length === fares.length && next.every((entry, index) => entry === fares[index])) return
      fares = next
      publish()
    },
    clear() {
      if (!fares.length) return
      fares = []
      publish()
    },
    restore(next) {
      fares = z.array(PlannedFareSchema).max(LIMITS.plannedFares).parse(next)
      publish()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
