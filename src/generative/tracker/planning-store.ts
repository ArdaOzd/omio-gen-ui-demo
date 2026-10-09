import { z } from 'zod'
import { ArtifactIdSchema, BoundedFareFactSchema, LIMITS, type ArtifactId, type BoundedFareFact, type FareId } from '../contracts'
import { FareScopeSchema, FareSourceSchema, type FareScopeBinding } from '../contracts/query-groups'

export const PlannedFareSourceSchema = z.strictObject({
  owner: ArtifactIdSchema,
  source: FareSourceSchema,
  scope: FareScopeSchema,
})

export type PlannedFareSource = z.infer<typeof PlannedFareSourceSchema>

export const PlannedFareSchema = z.strictObject({
  fact: BoundedFareFactSchema,
  owners: z.array(ArtifactIdSchema).min(1).max(LIMITS.storedArtifacts),
  sources: z.array(PlannedFareSourceSchema).max(LIMITS.storedArtifacts).optional(),
}).superRefine((fare, context) => {
  const sourceOwners = fare.sources?.map(source => source.owner) ?? []
  if (new Set(sourceOwners).size !== sourceOwners.length) context.addIssue({ code: 'custom', path: ['sources'], message: 'Duplicate planned fare source owner' })
  fare.sources?.forEach((source, index) => {
    if (!fare.owners.includes(source.owner)) context.addIssue({ code: 'custom', path: ['sources', index, 'owner'], message: 'Planned fare source owner is missing' })
  })
})

export type PlannedFare = z.infer<typeof PlannedFareSchema>

export type PlanningStore = {
  get: () => readonly PlannedFare[]
  select: (owner: ArtifactId, fact: BoundedFareFact, binding?: FareScopeBinding) => void
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
    select(owner, fact, binding) {
      const current = fares.find(entry => entry.fact.id === fact.id)
      const source = binding ? PlannedFareSourceSchema.parse({ owner, source: binding.manifest.source, scope: binding.manifest.coverage }) : undefined
      if (!current) {
        fares = z.array(PlannedFareSchema).max(LIMITS.plannedFares).parse([...fares, { fact, owners: [owner], ...(source ? { sources: [source] } : {}) }])
      } else {
        const owners = current.owners.includes(owner) ? current.owners : [...current.owners, owner]
        const sources = source ? [...(current.sources ?? []).filter(candidate => candidate.owner !== owner), source] : current.sources
        fares = fares.map(entry => entry.fact.id === fact.id ? PlannedFareSchema.parse({ fact, owners, ...(sources?.length ? { sources } : {}) }) : entry)
      }
      publish()
    },
    deselect(owner, fareId) {
      const next = fares.flatMap(entry => {
        if (entry.fact.id !== fareId) return [entry]
        const owners = entry.owners.filter(candidate => candidate !== owner)
        const sources = entry.sources?.filter(source => source.owner !== owner)
        return owners.length ? [PlannedFareSchema.parse({ fact: entry.fact, owners, ...(sources?.length ? { sources } : {}) })] : []
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
