import {
  DatasetIdSchema,
  DatasetRevisionSchema,
  type DatasetId,
  type DatasetRevision,
} from '../contracts'
import {
  ResourceKeySchema,
  type FareItem,
  type FareProjectionBridge,
  type FareScope,
  type FareScopeBinding,
  type FareScopeManifest,
  type LookupPinsRequest,
  type LookupPinsResponse,
  type ProjectionResult,
  type QueryGroupRequest,
  type QueryGroupResult,
  type QueryGroupsResponse,
  type ResourceKey,
  type SelectedFarePin,
} from '../contracts/query-groups'
import { createProjectionCoordinator, stableFingerprint, type ProjectionCoordinator } from './projection-coordinator'
import { createServerQueryClient, type ServerQueryClient } from './server-query-client'

export interface ServerFareDataBridge extends FareProjectionBridge {
  readonly coordinator: ProjectionCoordinator
  getBinding(resourceKey: ResourceKey): FareScopeBinding
  findBinding(datasetId: DatasetId): FareScopeBinding | undefined
  findBindingForScope(scope: FareScope): FareScopeBinding | undefined
  findCachedFare(fareId: string, resourceKey?: ResourceKey): FareItem | undefined
  getCarrierLabel(carrierId: string, resourceKey?: ResourceKey): string | undefined
}

export type ServerFareDataBridgeOptions = {
  client?: ServerQueryClient
  fetch?: typeof globalThis.fetch
  baseUrl?: string
  maxProjectionItems?: number
  maxPinnedItems?: number
}

type StoredResource = FareScopeBinding & { references: number; signature: string }
type CachedItem = { item: FareItem; resourceKey: ResourceKey; touchedAt: number }
type PendingScope = {
  controller: AbortController
  promise: Promise<FareScopeManifest>
  subscribers: number
}

const requestId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const scopeIdentity = (scope: FareScope) => stableFingerprint(scope, 'scope')
const itemIdentity = (fareId: string, resourceKey: ResourceKey) => `${resourceKey}\u0000${fareId}`

function projectionItems(result: ProjectionResult): FareItem[] {
  switch (result.kind) {
    case 'farePage': return result.items
    case 'calendarDays': return result.days.flatMap(day => day.representative ? [day.representative] : [])
    case 'fareHighlights': return [result.cheapest, result.fastest].filter((item): item is FareItem => item !== null)
    case 'carrierFacets':
    case 'modeSummary': return []
    default: {
      const exhaustive: never = result
      return exhaustive
    }
  }
}

export function createFareDataBridge(options: ServerFareDataBridgeOptions = {}): ServerFareDataBridge {
  const rawClient = options.client ?? createServerQueryClient({ fetch: options.fetch, baseUrl: options.baseUrl })
  const resources = new Map<ResourceKey, StoredResource>()
  const resourcesByDataset = new Map<DatasetId, ResourceKey>()
  const resourcesByScope = new Map<string, ResourceKey>()
  const listeners = new Map<ResourceKey, Set<() => void>>()
  const projectionItemsByKey = new Map<string, CachedItem>()
  const pinnedItemsByKey = new Map<string, CachedItem>()
  const pendingScopes = new Map<string, PendingScope>()
  const maxProjectionItems = options.maxProjectionItems ?? 512
  const maxPinnedItems = options.maxPinnedItems ?? 320
  let disposed = false

  function assertActive() {
    if (disposed) throw new Error('Fare data bridge is disposed')
  }

  function trim(cache: Map<string, CachedItem>, maximum: number) {
    if (cache.size <= maximum) return
    const oldest = [...cache.entries()].sort((left, right) => left[1].touchedAt - right[1].touchedAt)
    for (const [key] of oldest.slice(0, cache.size - maximum)) cache.delete(key)
  }

  function rememberItems(resourceKey: ResourceKey, items: readonly FareItem[], pinned: boolean) {
    const cache = pinned ? pinnedItemsByKey : projectionItemsByKey
    const now = Date.now()
    for (const item of items) cache.set(itemIdentity(item.id, resourceKey), { item: structuredClone(item), resourceKey, touchedAt: now })
    trim(cache, pinned ? maxPinnedItems : maxProjectionItems)
  }

  function rememberManifest(manifest: FareScopeManifest, addReference = false): StoredResource {
    const resourceKey = manifest.resourceKey
    const existing = resources.get(resourceKey)
    const previousScopeKey = existing ? scopeIdentity(existing.manifest.coverage) : undefined
    const nextScopeKey = scopeIdentity(manifest.coverage)
    const signature = stableFingerprint(manifest, 'manifest')
    const datasetId = DatasetIdSchema.parse(resourceKey)
    const datasetRevision = DatasetRevisionSchema.parse(existing
      ? existing.signature === signature ? existing.datasetRevision : existing.datasetRevision + 1
      : 1)
    const stored: StoredResource = {
      resourceKey,
      datasetId,
      datasetRevision,
      manifest: structuredClone(manifest),
      references: (existing?.references ?? 0) + (addReference ? 1 : 0),
      signature,
    }
    resources.set(resourceKey, stored)
    resourcesByDataset.set(datasetId, resourceKey)
    if (previousScopeKey !== undefined
      && previousScopeKey !== nextScopeKey
      && resourcesByScope.get(previousScopeKey) === resourceKey) {
      resourcesByScope.delete(previousScopeKey)
    }
    resourcesByScope.set(nextScopeKey, resourceKey)
    if (!existing || existing.signature !== signature) listeners.get(resourceKey)?.forEach(listener => listener())
    return stored
  }

  function observe(response: QueryGroupsResponse) {
    for (const group of response.groups) {
      rememberManifest(group.manifest)
      for (const projection of group.projections) rememberItems(group.manifest.resourceKey, projectionItems(projection), false)
    }
  }

  const observedClient: ServerQueryClient = {
    async queryGroups(request, signal) {
      const response = await rawClient.queryGroups(request, signal)
      observe(response)
      return response
    },
    async lookupPins(input, signal) {
      const response = await rawClient.lookupPins(input, signal)
      for (const item of response.items) {
        const pins = input.pins.filter(pin => pin.fareId === item.id)
        for (const pin of pins) rememberItems(pin.resourceKey, [item], true)
      }
      return response
    },
  }
  function waitForScope(active: PendingScope, signal: AbortSignal): Promise<FareScopeManifest> {
    if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
    active.subscribers += 1
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = () => {
        if (settled) return false
        settled = true
        signal.removeEventListener('abort', cancel)
        active.subscribers -= 1
        return true
      }
      const cancel = () => {
        if (!finish()) return
        reject(new DOMException('Aborted', 'AbortError'))
        if (active.subscribers === 0) active.controller.abort()
      }
      signal.addEventListener('abort', cancel, { once: true })
      active.promise.then(
        manifest => { if (finish()) resolve(structuredClone(manifest)) },
        error => { if (finish()) reject(error) },
      )
    })
  }

  function fetchScope(scope: FareScope, signal: AbortSignal): Promise<FareScopeManifest> {
    const signature = scopeIdentity(scope)
    let active = pendingScopes.get(signature)
    if (!active) {
      const controller = new AbortController()
      const groupId = stableFingerprint({ scope, purpose: 'manifest' }, 'group')
      const promise = observedClient.queryGroups({
        version: 1,
        requestId: requestId('scope'),
        expectedSourceVersion: null,
        groups: [{ groupId, scope, projections: [] }],
      }, controller.signal).then(response => {
        const group = response.groups[0]
        if (!group) throw new Error('Scope response omitted its group')
        return group.manifest
      })
      active = { controller, promise, subscribers: 0 }
      pendingScopes.set(signature, active)
      promise.then(
        () => { if (pendingScopes.get(signature) === active) pendingScopes.delete(signature) },
        () => { if (pendingScopes.get(signature) === active) pendingScopes.delete(signature) },
      )
    }
    return waitForScope(active, signal)
  }

  async function loadScope(scope: FareScope, signal: AbortSignal): Promise<FareScopeManifest> {
    assertActive()
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const existingKey = resourcesByScope.get(scopeIdentity(scope))
    const existing = existingKey ? resources.get(existingKey) : undefined
    if (existing) {
      existing.references += 1
      return structuredClone(existing.manifest)
    }
    const manifest = await fetchScope(scope, signal)
    rememberManifest(manifest, true)
    return structuredClone(manifest)
  }

  async function refreshScope(scope: FareScope, signal: AbortSignal): Promise<FareScopeManifest> {
    assertActive()
    const manifest = await fetchScope(scope, signal)
    rememberManifest(manifest)
    return structuredClone(manifest)
  }

  const coordinator = createProjectionCoordinator(observedClient, {
    async refreshAfterSourceChange(requirement, signal) {
      const manifest = await refreshScope(requirement.scope, signal)
      const binding = getBinding(manifest.resourceKey)
      return {
        ...requirement,
        datasetId: binding.datasetId,
        datasetRevision: binding.datasetRevision,
        sourceVersion: manifest.source.sourceVersion,
      }
    },
  })

  async function executeGroup(group: QueryGroupRequest, signal: AbortSignal): Promise<QueryGroupResult> {
    assertActive()
    const resourceKey = resourcesByScope.get(scopeIdentity(group.scope))
    const sourceVersion = resourceKey ? resources.get(resourceKey)?.manifest.source.sourceVersion ?? null : null
    const response = await observedClient.queryGroups({
      version: 1,
      requestId: requestId('group'),
      expectedSourceVersion: sourceVersion,
      groups: [group],
    }, signal)
    const result = response.groups[0]
    if (!result) throw new Error('Query response omitted its group')
    return structuredClone(result)
  }

  async function lookupPins(input: LookupPinsRequest, signal: AbortSignal): Promise<LookupPinsResponse> {
    assertActive()
    return observedClient.lookupPins(input, signal)
  }

  function getBinding(resourceKey: ResourceKey): FareScopeBinding {
    assertActive()
    const stored = resources.get(resourceKey)
    if (!stored) throw new Error('Expired fare scope reference')
    const { references: _references, signature: _signature, ...binding } = stored
    return structuredClone(binding)
  }

  function findBinding(datasetId: DatasetId): FareScopeBinding | undefined {
    const resourceKey = resourcesByDataset.get(datasetId)
    return resourceKey ? getBinding(resourceKey) : undefined
  }

  function findBindingForScope(scope: FareScope): FareScopeBinding | undefined {
    const resourceKey = resourcesByScope.get(scopeIdentity(scope))
    return resourceKey ? getBinding(resourceKey) : undefined
  }

  function findCachedFare(fareId: string, resourceKey?: ResourceKey): FareItem | undefined {
    const candidates = resourceKey
      ? [itemIdentity(fareId, resourceKey)]
      : [...new Set([...pinnedItemsByKey.keys(), ...projectionItemsByKey.keys()])].filter(key => key.endsWith(`\u0000${fareId}`))
    for (const key of candidates) {
      const cached = pinnedItemsByKey.get(key) ?? projectionItemsByKey.get(key)
      if (!cached) continue
      cached.touchedAt = Date.now()
      return structuredClone(cached.item)
    }
    return undefined
  }

  function getCarrierLabel(carrierId: string, resourceKey?: ResourceKey): string | undefined {
    const labels = new Set([...pinnedItemsByKey.values(), ...projectionItemsByKey.values()]
      .filter(cached => (!resourceKey || cached.resourceKey === resourceKey) && cached.item.carrierId === carrierId && cached.item.carrierName)
      .map(cached => cached.item.carrierName as string))
    return labels.size === 1 ? [...labels][0] : undefined
  }

  return {
    coordinator,
    loadScope,
    refreshScope,
    executeGroup,
    lookupPins,
    getBinding,
    findBinding,
    findBindingForScope,
    findCachedFare,
    getCarrierLabel,
    getManifest(resourceKey) {
      return getBinding(ResourceKeySchema.parse(resourceKey)).manifest
    },
    subscribe(resourceKey, listener) {
      const parsed = ResourceKeySchema.parse(resourceKey)
      const set = listeners.get(parsed) ?? new Set<() => void>()
      set.add(listener)
      listeners.set(parsed, set)
      return () => {
        set.delete(listener)
        if (!set.size) listeners.delete(parsed)
      }
    },
    release(resourceKey) {
      const parsed = ResourceKeySchema.parse(resourceKey)
      const stored = resources.get(parsed)
      if (!stored || --stored.references > 0) return
      resources.delete(parsed)
      resourcesByDataset.delete(stored.datasetId)
      if (resourcesByScope.get(scopeIdentity(stored.manifest.coverage)) === parsed) resourcesByScope.delete(scopeIdentity(stored.manifest.coverage))
      listeners.delete(parsed)
      for (const [key, cached] of projectionItemsByKey) if (cached.resourceKey === parsed) projectionItemsByKey.delete(key)
    },
    dispose() {
      if (disposed) return
      disposed = true
      coordinator.dispose()
      pendingScopes.forEach(pending => pending.controller.abort())
      pendingScopes.clear()
      resources.clear()
      resourcesByDataset.clear()
      resourcesByScope.clear()
      listeners.clear()
      projectionItemsByKey.clear()
      pinnedItemsByKey.clear()
    },
  }
}

export function selectedPin(item: FareItem, resourceKey: ResourceKey, sourceVersion: string): SelectedFarePin {
  return { fareId: item.id, resourceKey, sourceVersion }
}
