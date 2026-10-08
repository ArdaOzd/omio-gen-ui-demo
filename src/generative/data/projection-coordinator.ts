import {
  ProjectionRequestSchema,
  ProjectionResultSnapshotSchema,
  QueryGroupScopeSchema,
  QueryGroupsRequestSchema,
  type FareScope,
  type ProjectionRequest,
  type ProjectionResult,
  type ProjectionResultSnapshot,
  type QueryExecutionState,
  type QueryGroupScope,
  type QueryIntentIdentity,
  type ResultKey,
} from '../contracts/query-groups'
import type { DatasetId, DatasetRevision, UIStateRevision } from '../contracts'
import { ServerQueryError, type ServerQueryClient } from './server-query-client'

export type ProjectionRequirement = {
  group: QueryGroupScope
  projectionKey: string
  scope: FareScope
  projection: ProjectionRequest
  datasetId: DatasetId
  datasetRevision: DatasetRevision
  sourceVersion?: string
  uiRevision: UIStateRevision
}

export interface ProjectionCoordinator {
  request(requirement: ProjectionRequirement): QueryExecutionState
  retry(queryKey: string): void
  getState(queryKey: string): QueryExecutionState | undefined
  subscribe(queryKey: string, listener: () => void): () => void
  release(queryKey: string): void
  captureProjectionResult(resultKey: ResultKey): ProjectionResultSnapshot | undefined
  dispose(): void
}

export type ProjectionCoordinatorOptions = {
  refreshAfterSourceChange?: (requirement: ProjectionRequirement, signal: AbortSignal) => Promise<ProjectionRequirement>
}

type ActiveRequirement = {
  requirement: ProjectionRequirement
  state: QueryExecutionState
  inputVersion: number
  queued: boolean
  sourceRefreshAttempts: number
  lastErrorCode?: 'sourceChanged'
}

type Batch = {
  controller: AbortController
  members: Map<string, { inputHash: string; inputVersion: number }>
}

type StoredSnapshot = { snapshot: ProjectionResultSnapshot; touchedAt: number }

const maxSnapshots = 256
const snapshotTtlMs = 30 * 60 * 1000

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`
}

export function stableFingerprint(value: unknown, prefix = 'hash'): string {
  const encoded = canonical(value)
  let hash = 2166136261
  for (const character of encoded) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`
}

function projectionInput(projection: ProjectionRequest): Omit<ProjectionRequest, 'projectionId'> {
  const { projectionId: _projectionId, ...input } = projection
  return input
}

function keys(requirement: ProjectionRequirement) {
  const group = QueryGroupScopeSchema.parse(requirement.group)
  const projection = ProjectionRequestSchema.parse(requirement.projection)
  const groupKey = stableFingerprint(group, 'group')
  const projectionKey = stableFingerprint({ key: requirement.projectionKey, input: projection.kind }, 'projection')
  const queryKey = stableFingerprint({ groupKey, projectionKey }, 'query')
  const inputHash = stableFingerprint({
    scope: requirement.scope,
    projection: projectionInput(projection),
    datasetRevision: requirement.datasetRevision,
    sourceVersion: requirement.sourceVersion ?? null,
  }, 'input')
  return { group, projection, groupKey, projectionKey, queryKey, inputHash }
}

function total(result: ProjectionResult): number {
  switch (result.kind) {
    case 'farePage': return result.pageInfo.total
    case 'calendarDays': return result.days.length
    case 'carrierFacets': return result.options.length
    case 'modeSummary': return result.modes.length
    case 'fareHighlights': return Number(result.cheapest !== null) + Number(result.fastest !== null)
    default: {
      const exhaustive: never = result
      return exhaustive
    }
  }
}

function truncated(result: ProjectionResult): boolean {
  return result.kind === 'farePage' && result.pageInfo.hasNextPage
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function createProjectionCoordinator(client: ServerQueryClient, options: ProjectionCoordinatorOptions = {}): ProjectionCoordinator {
  const active = new Map<string, ActiveRequirement>()
  const listeners = new Map<string, Set<() => void>>()
  const snapshots = new Map<ResultKey, StoredSnapshot>()
  const batches = new Set<Batch>()
  let flushQueued = false
  let disposed = false

  function notify(queryKey: string) {
    listeners.get(queryKey)?.forEach(listener => listener())
  }

  function remember(snapshot: ProjectionResultSnapshot) {
    const now = Date.now()
    const retained = new Set<ResultKey>([...active.values()].flatMap(item => {
      if (item.state.status === 'ready' || item.state.status === 'refreshing') return [item.state.current.resultKey]
      if (item.state.status === 'error' && item.state.previous) return [item.state.previous.resultKey]
      return []
    }))
    for (const [resultKey, stored] of snapshots) {
      if (!retained.has(resultKey) && now - stored.touchedAt > snapshotTtlMs) snapshots.delete(resultKey)
    }
    snapshots.set(snapshot.identity.resultKey, { snapshot: structuredClone(snapshot), touchedAt: now })
    if (snapshots.size <= maxSnapshots) return
    for (const [resultKey] of snapshots) {
      if (snapshots.size <= maxSnapshots) break
      if (!retained.has(resultKey)) snapshots.delete(resultKey)
    }
  }

  function cancelFullySupersededBatches() {
    for (const batch of batches) {
      const current = [...batch.members].some(([queryKey, identity]) => {
        const item = active.get(queryKey)
        return item?.state.intent.desiredInputHash === identity.inputHash
          && item.state.intent.desiredInputVersion === identity.inputVersion
      })
      if (!current) batch.controller.abort()
    }
  }

  function schedule() {
    if (flushQueued || disposed) return
    flushQueued = true
    queueMicrotask(() => {
      flushQueued = false
      void flush()
    })
  }

  function queuedRequirements(): Array<[string, ActiveRequirement]> {
    return [...active.entries()].filter(([, item]) => item.queued)
  }

  async function flush() {
    if (disposed) return
    const pending = queuedRequirements()
    pending.forEach(([, item]) => { item.queued = false })
    if (!pending.length) return

    const bySource = new Map<string, Array<[string, ActiveRequirement]>>()
    for (const entry of pending) {
      const source = entry[1].requirement.sourceVersion ?? ''
      const items = bySource.get(source) ?? []
      items.push(entry)
      bySource.set(source, items)
    }
    await Promise.all([...bySource.entries()].flatMap(([sourceVersion, entries]) => executeSourceBatches(sourceVersion || null, entries)))
  }

  function executeSourceBatches(expectedSourceVersion: string | null, entries: Array<[string, ActiveRequirement]>): Promise<void>[] {
    const grouped = new Map<string, Array<[string, ActiveRequirement]>>()
    for (const entry of entries) {
      const item = entry[1]
      const key = canonical({ group: item.requirement.group, scope: item.requirement.scope })
      const group = grouped.get(key) ?? []
      group.push(entry)
      grouped.set(key, group)
    }

    const groups = [...grouped.values()]
    const chunks: Array<Array<Array<[string, ActiveRequirement]>>> = []
    for (let start = 0; start < groups.length; start += 8) chunks.push(groups.slice(start, start + 8))
    return chunks.map(chunk => executeBatch(expectedSourceVersion, chunk))
  }

  async function executeBatch(expectedSourceVersion: string | null, groups: Array<Array<[string, ActiveRequirement]>>) {
    const requestId = `request-${crypto.randomUUID()}`
    const responseMembers = new Map<string, Array<[string, ActiveRequirement]>>()
    const requestGroups = groups.map(entries => {
      const first = entries[0]
      if (!first) throw new Error('Empty projection group')
      const groupId = first[1].state.intent.groupKey
      const deduplicated = new Map<string, { projectionId: string; projection: ProjectionRequest; members: Array<[string, ActiveRequirement]> }>()
      for (const entry of entries) {
        const projection = entry[1].requirement.projection
        const fingerprint = canonical(projectionInput(projection))
        const existing = deduplicated.get(fingerprint)
        if (existing) existing.members.push(entry)
        else {
          const projectionId = stableFingerprint({ groupId, fingerprint }, 'wire')
          deduplicated.set(fingerprint, { projectionId, projection: { ...projection, projectionId }, members: [entry] })
        }
      }
      const projections = [...deduplicated.values()].map(item => {
        responseMembers.set(`${groupId}\u0000${item.projectionId}`, item.members)
        return item.projection
      })
      if (projections.length > 8) throw new Error('Query group projection limit exceeded')
      return { groupId, scope: first[1].requirement.scope, projections }
    })
    const request = QueryGroupsRequestSchema.parse({ version: 1, requestId, expectedSourceVersion, groups: requestGroups })
    const controller = new AbortController()
    const batch: Batch = {
      controller,
      members: new Map(groups.flat().map(([queryKey, item]) => [queryKey, {
        inputHash: item.state.intent.desiredInputHash,
        inputVersion: item.state.intent.desiredInputVersion,
      }])),
    }
    batches.add(batch)
    try {
      const response = await client.queryGroups(request, controller.signal)
      for (const group of response.groups) {
        for (const projection of group.projections) {
          const members = responseMembers.get(`${group.groupId}\u0000${projection.projectionId}`) ?? []
          for (const [queryKey, requested] of members) {
            const item = active.get(queryKey)
            if (!item) continue
            const intent = item.state.intent
            if (intent.desiredInputHash !== requested.state.intent.desiredInputHash
              || intent.desiredInputVersion !== requested.state.intent.desiredInputVersion) continue
            const resultKey = `result-${crypto.randomUUID()}`
            const projectionForCaller = { ...projection, projectionId: requested.requirement.projection.projectionId }
            const identity = {
              resultKey,
              inputHash: intent.desiredInputHash,
              inputVersion: intent.desiredInputVersion,
              requestId: response.requestId,
              resourceKey: group.manifest.resourceKey,
              datasetId: requested.requirement.datasetId,
              datasetRevision: requested.requirement.datasetRevision,
              sourceVersion: response.sourceVersion,
              resultFingerprint: projection.resultFingerprint,
              total: total(projection),
              truncated: truncated(projection),
            }
            const snapshot = ProjectionResultSnapshotSchema.parse({ identity, projection: projectionForCaller })
            remember(snapshot)
            item.state = { status: 'ready', intent, current: snapshot.identity }
            item.requirement = { ...item.requirement, sourceVersion: response.sourceVersion }
            notify(queryKey)
          }
        }
      }
    } catch (error) {
      if (isAbort(error)) return
      const sourceChanged = error instanceof ServerQueryError && error.code === 'sourceChanged'
      const retrying = new Set<string>()
      const refreshAfterSourceChange = options.refreshAfterSourceChange
      if (sourceChanged && refreshAfterSourceChange) {
        await Promise.all(groups.flat().map(async ([queryKey, requested]) => {
          const item = active.get(queryKey)
          if (!item || item.sourceRefreshAttempts >= 1) return
          const intent = item.state.intent
          if (intent.desiredInputHash !== requested.state.intent.desiredInputHash
            || intent.desiredInputVersion !== requested.state.intent.desiredInputVersion) return
          try {
            const refreshed = await refreshAfterSourceChange(item.requirement, controller.signal)
            const current = active.get(queryKey)
            if (!current || current.state.intent.desiredInputHash !== intent.desiredInputHash
              || current.state.intent.desiredInputVersion !== intent.desiredInputVersion) return
            const next = keys(refreshed)
            if (next.queryKey !== queryKey) throw new Error('Source refresh changed the projection identity')
            const currentResult = current.state.status === 'ready' || current.state.status === 'refreshing'
              ? current.state.current
              : current.state.status === 'error' ? current.state.previous : undefined
            const nextIntent: QueryIntentIdentity = {
              queryKey: next.queryKey,
              groupKey: next.groupKey,
              projectionKey: next.projectionKey,
              desiredInputHash: next.inputHash,
              desiredInputVersion: current.inputVersion + 1,
              uiRevision: refreshed.uiRevision,
            }
            current.requirement = { ...refreshed, group: next.group, projection: next.projection }
            current.inputVersion += 1
            current.sourceRefreshAttempts = 1
            current.lastErrorCode = undefined
            current.queued = true
            current.state = currentResult
              ? { status: 'refreshing', intent: nextIntent, current: currentResult }
              : { status: 'loading', intent: nextIntent }
            retrying.add(queryKey)
            notify(queryKey)
          } catch {
            // The normal error transition below preserves the prior committed result.
          }
        }))
        if (retrying.size) schedule()
      }
      for (const [queryKey, requested] of groups.flat()) {
        if (retrying.has(queryKey)) continue
        const item = active.get(queryKey)
        if (!item) continue
        const intent = item.state.intent
        if (intent.desiredInputHash !== requested.state.intent.desiredInputHash
          || intent.desiredInputVersion !== requested.state.intent.desiredInputVersion) continue
        const previous = item.state.status === 'refreshing' ? item.state.current
          : item.state.status === 'ready' ? item.state.current
            : item.state.status === 'error' ? item.state.previous
              : undefined
        item.lastErrorCode = sourceChanged ? 'sourceChanged' : undefined
        item.state = { status: 'error', intent, ...(previous ? { previous } : {}) }
        notify(queryKey)
      }
    } finally {
      batches.delete(batch)
    }
  }

  return {
    request(raw) {
      if (disposed) throw new Error('Projection coordinator is disposed')
      const parsed = keys(raw)
      const requirement: ProjectionRequirement = { ...raw, group: parsed.group, projection: parsed.projection }
      const previous = active.get(parsed.queryKey)
      const sameInput = previous?.state.intent.desiredInputHash === parsed.inputHash
      const inputVersion = sameInput ? previous.inputVersion : (previous?.inputVersion ?? 0) + 1
      const intent: QueryIntentIdentity = {
        queryKey: parsed.queryKey,
        groupKey: parsed.groupKey,
        projectionKey: parsed.projectionKey,
        desiredInputHash: parsed.inputHash,
        desiredInputVersion: inputVersion,
        uiRevision: requirement.uiRevision,
      }
      if (sameInput && previous) {
        previous.requirement = requirement
        previous.state = previous.state.status === 'loading' ? { status: 'loading', intent }
          : previous.state.status === 'ready' ? { status: 'ready', intent, current: previous.state.current }
            : previous.state.status === 'refreshing' ? { status: 'refreshing', intent, current: previous.state.current }
              : { status: 'error', intent, ...(previous.state.previous ? { previous: previous.state.previous } : {}) }
        return previous.state
      }
      const current = previous?.state.status === 'ready' || previous?.state.status === 'refreshing'
        ? previous.state.current
        : previous?.state.status === 'error'
          ? previous.state.previous
          : undefined
      const state: QueryExecutionState = current
        ? { status: 'refreshing', intent, current }
        : { status: 'loading', intent }
      active.set(parsed.queryKey, { requirement, state, inputVersion, queued: true, sourceRefreshAttempts: 0 })
      notify(parsed.queryKey)
      cancelFullySupersededBatches()
      schedule()
      return state
    },

    retry(queryKey) {
      const item = active.get(queryKey)
      if (!item || item.state.status !== 'error') return
      if (item.lastErrorCode === 'sourceChanged') item.sourceRefreshAttempts = 0
      item.lastErrorCode = undefined
      item.state = item.state.previous
        ? { status: 'refreshing', intent: item.state.intent, current: item.state.previous }
        : { status: 'loading', intent: item.state.intent }
      item.queued = true
      notify(queryKey)
      schedule()
    },

    getState(queryKey) {
      return active.get(queryKey)?.state
    },

    subscribe(queryKey, listener) {
      const current = listeners.get(queryKey) ?? new Set<() => void>()
      current.add(listener)
      listeners.set(queryKey, current)
      return () => {
        current.delete(listener)
        if (!current.size) {
          listeners.delete(queryKey)
          queueMicrotask(() => {
            if (!listeners.has(queryKey)) {
              active.delete(queryKey)
              cancelFullySupersededBatches()
            }
          })
        }
      }
    },

    release(queryKey) {
      active.delete(queryKey)
      cancelFullySupersededBatches()
    },

    captureProjectionResult(resultKey) {
      const stored = snapshots.get(resultKey)
      if (!stored) return undefined
      stored.touchedAt = Date.now()
      return structuredClone(stored.snapshot)
    },

    dispose() {
      disposed = true
      batches.forEach(batch => batch.controller.abort())
      batches.clear()
      active.clear()
      listeners.clear()
      snapshots.clear()
    },
  }
}
