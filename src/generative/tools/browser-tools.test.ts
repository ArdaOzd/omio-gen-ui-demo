import { describe, expect, it, vi } from 'vitest'
import { ArtifactIdSchema } from '../contracts'
import { QueryExecutionStateSchema } from '../contracts/query-groups'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createDisplayContextStore } from '../state/display-context'
import { createUIStateStore } from '../state/ui-state-store'
import { createBrowserTools } from './browser-tools'
import { parseToolOutput } from '../../../agent/request-schema'

const artifactId = ArtifactIdSchema.parse('artifact-test')
function setup() {
  const store = createUIStateStore({ now: () => '2026-10-08T00:00:00.000Z' })
  store.initializeMissing(artifactId, { dates: { start: '2026-10-08' } })
  return { store, bridge: createFareDataBridge() }
}

describe('bounded artifact browser tools', () => {
  it('exposes only composition, typed edits, and immutable display inspection', () => {
    const { store, bridge } = setup()
    expect(Object.keys(createBrowserTools({ store, bridge, activeArtifactId: () => artifactId })).sort()).toEqual(['create_artifact', 'edit_artifact', 'inspect_display'])
  })

  it('binds inspection to an exact immutable result', async () => {
    const { store, bridge } = setup(), displayStore = createDisplayContextStore(), ref = 'artifact-test:present-1:fares'
    displayStore.register({ componentRef: { value: ref, keySource: 'authored-key' }, componentType: 'FareCards', scope: { kind: 'artifact', artifactId }, authored: {} })
    const intent = { queryKey: 'list', groupKey: 'leg', projectionKey: 'ordered', desiredInputHash: 'input-1', desiredInputVersion: 1, uiRevision: 0 }
    const current = { resultKey: 'result-1', inputHash: 'input-1', inputVersion: 1, requestId: 'request-1', resourceKey: 'scope-1', datasetId: 'dataset-1', datasetRevision: 1, sourceVersion: 'source-1', resultFingerprint: 'fingerprint-1', total: 1, truncated: false }
    displayStore.setExecution(ref, QueryExecutionStateSchema.parse({ status: 'ready', intent, current }))
    displayStore.setDisplay(ref, { payload: { kind: 'fare-order', orderedFareRefs: [{ fareId: 'fare-1', rank: 1 }] }, totalDisplayed: 1, includedCount: 1, complete: true, omittedCount: 0 }, { ...current, items: [{ itemId: 'fare-1', rank: 1 }] })
    const capture = displayStore.capture({ captureId: 'capture-1', artifactIds: [artifactId] }), displayHandle = capture.components[0]?.display?.displayHandle
    const tools = createBrowserTools({ store, bridge, displayStore, activeArtifactId: () => artifactId })
    expect(await tools.inspect_display.execute({ captureId: 'capture-1', displayHandle, resultKey: 'result-1', limit: 5 })).toMatchObject({ sourceVersion: 'source-1', items: [{ itemId: 'fare-1' }] })
    expect(await tools.inspect_display.execute({ captureId: 'capture-1', displayHandle, resultKey: 'result-2', limit: 5 })).toMatchObject({ status: 'error', code: 'resultMismatch' })
  })

  it('waits for scope loading and records agent input provenance', async () => {
    const { store, bridge } = setup(), displayStore = createDisplayContextStore(), whenIdle = vi.fn(async () => {})
    const tools = createBrowserTools({ store, bridge, displayStore, activeArtifactId: () => artifactId, whenIdle })
    expect(await tools.edit_artifact.execute({ artifactRef: artifactId, expectedRevision: 0, commands: [{ kind: 'route', citySequence: ['london', 'paris'] }, { kind: 'dates', dates: { start: '2026-10-26' } }] })).toMatchObject({ status: 'applied', revision: 2 })
    expect(whenIdle).toHaveBeenCalledWith(artifactId)
    expect(displayStore.provenance(artifactId, ['originId', 'destinationId', 'dateWindow']).map(item => item.origin)).toEqual(['agent', 'agent', 'agent'])
  })

  it('accepts bounded scope metadata in the next tool continuation', () => {
    expect(parseToolOutput('edit_artifact', { artifactId, revision: 2, status: 'applied', scopes: [{ datasetRef: 'scope-1', resourceKey: 'scope-1', legIndex: 0, originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-26', to: '2026-10-27' }, sourceVersion: 'source-1', totalAvailable: 42, complete: true }] })).toMatchObject({ scopes: [{ datasetRef: 'scope-1', legIndex: 0 }] })
  })

  it('creates an empty host-owned artifact without inventing a dataset', async () => {
    const { store, bridge } = setup(), created = ArtifactIdSchema.parse('artifact-created')
    const tools = createBrowserTools({ store, bridge, activeArtifactId: () => artifactId, createArtifact: () => created })
    expect(await tools.create_artifact.execute({})).toEqual({ artifactId: created, revision: 0 })
    expect(store.get(created).datasetRefs).toEqual([])
  })
})
