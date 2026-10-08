import { describe, expect, it, vi } from 'vitest'
import { ArtifactIdSchema, FareIdSchema, UIStateRevisionSchema, type DispatchResult, type UICommand } from '../contracts'
import { QueryExecutionStateSchema } from '../contracts/query-groups'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createDisplayContextStore } from '../state/display-context'
import type { QueryFareSelectionScope } from '../state/action-router'
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

  it('binds agent fare selection to the captured artifact and query result', async () => {
    const { store, bridge } = setup(), displayStore = createDisplayContextStore(), ref = 'artifact-test:present-1:fares'
    displayStore.register({ componentRef: { value: ref, keySource: 'authored-key' }, componentType: 'FareCards', scope: { kind: 'leg', artifactId, legIndex: 0, legKey: 'london:paris', resourceKey: 'scope-1' }, authored: {} })
    const intent = { queryKey: 'list', groupKey: 'leg', projectionKey: 'ordered', desiredInputHash: 'input-1', desiredInputVersion: 1, uiRevision: 0 }
    const current = { resultKey: 'result-1', inputHash: 'input-1', inputVersion: 1, requestId: 'request-1', resourceKey: 'scope-1', datasetId: 'dataset-1', datasetRevision: 1, sourceVersion: 'source-1', resultFingerprint: 'fingerprint-1', total: 2, truncated: false }
    displayStore.setExecution(ref, QueryExecutionStateSchema.parse({ status: 'ready', intent, current }))
    displayStore.setDisplay(ref, { payload: { kind: 'fare-order', orderedFareRefs: [{ fareId: 'fare-1', rank: 1 }, { fareId: 'fare-2', rank: 2 }] }, totalDisplayed: 2, includedCount: 2, complete: true, omittedCount: 0 }, { ...current, items: [{ itemId: 'fare-1', rank: 1 }, { itemId: 'fare-2', rank: 2 }] })
    const capture = displayStore.capture({ captureId: 'capture-select', artifactIds: [artifactId] }), displayHandle = capture.components[0]?.display?.displayHandle
    if (!displayHandle) throw new Error('Missing captured display handle')
    const applied: DispatchResult = { status: 'applied', revision: UIStateRevisionSchema.parse(1) }
    const selectFromQuery = vi.fn<(command: Extract<UICommand, { kind: 'select' }>, scope: QueryFareSelectionScope) => DispatchResult>(() => applied)
    const dispatch = Object.assign(vi.fn<(command: UICommand) => DispatchResult>(() => applied), { selectFromQuery })
    const tools = createBrowserTools({ store, bridge, displayStore, activeArtifactId: () => artifactId, dispatch })
    const input = { artifactRef: artifactId, expectedRevision: 0, commands: [{ kind: 'select' as const, fareId: 'fare-2', selected: true as const, captureId: 'capture-select', displayHandle, resultKey: 'result-1', sourceVersion: 'source-1' }] }
    expect(await tools.edit_artifact.execute(input)).toMatchObject({ status: 'applied' })
    expect(dispatch).not.toHaveBeenCalled()
    expect(selectFromQuery).toHaveBeenCalledOnce()
    const call=selectFromQuery.mock.calls[0]
    if (!call) throw new Error('Missing scoped selection call')
    const [command, scope] = call
    expect(command).toMatchObject({ artifactId, fareId: 'fare-2', selected: true })
    expect(scope).toMatchObject({ kind: 'query-result', fareIds: ['fare-1', 'fare-2'], resultKey: 'result-1', resourceKey: 'scope-1', datasetId: 'dataset-1', datasetRevision: 1, sourceVersion: 'source-1' })
    expect(scope.currentResultKey()).toBe('result-1')
    displayStore.setExecution(ref, QueryExecutionStateSchema.parse({ status: 'ready', intent: { ...intent, desiredInputHash: 'input-2', desiredInputVersion: 2 }, current: { ...current, resultKey: 'result-2', inputHash: 'input-2', inputVersion: 2 } }))
    expect(scope.currentResultKey()).toBe('result-2')
  })

  it('rejects selections outside the captured fare set or artifact', async () => {
    const { store, bridge } = setup(), displayStore = createDisplayContextStore(), foreignArtifact = ArtifactIdSchema.parse('artifact-foreign'), ref = 'artifact-foreign:present-1:fares'
    store.initializeMissing(foreignArtifact, { dates: { start: '2026-10-08' } })
    displayStore.register({ componentRef: { value: ref, keySource: 'authored-key' }, componentType: 'FareCards', scope: { kind: 'artifact', artifactId: foreignArtifact }, authored: {} })
    const intent = { queryKey: 'list', groupKey: 'leg', projectionKey: 'ordered', desiredInputHash: 'input-1', desiredInputVersion: 1, uiRevision: 0 }
    const current = { resultKey: 'result-1', inputHash: 'input-1', inputVersion: 1, requestId: 'request-1', resourceKey: 'scope-1', datasetId: 'dataset-1', datasetRevision: 1, sourceVersion: 'source-1', resultFingerprint: 'fingerprint-1', total: 1, truncated: false }
    displayStore.setExecution(ref, QueryExecutionStateSchema.parse({ status: 'ready', intent, current }))
    displayStore.setDisplay(ref, { payload: { kind: 'fare-order', orderedFareRefs: [{ fareId: 'fare-1', rank: 1 }] }, totalDisplayed: 1, includedCount: 1, complete: true, omittedCount: 0 }, { ...current, items: [{ itemId: 'fare-1', rank: 1 }] })
    const capture = displayStore.capture({ captureId: 'capture-foreign', artifactIds: [foreignArtifact] }), displayHandle = capture.components[0]?.display?.displayHandle
    if (!displayHandle) throw new Error('Missing captured display handle')
    const applied: DispatchResult = { status: 'applied', revision: UIStateRevisionSchema.parse(1) }
    const selectFromQuery = vi.fn<(command: Extract<UICommand, { kind: 'select' }>, scope: QueryFareSelectionScope) => DispatchResult>(() => applied)
    const dispatch = Object.assign(vi.fn<(command: UICommand) => DispatchResult>(() => applied), { selectFromQuery })
    const tools = createBrowserTools({ store, bridge, displayStore, activeArtifactId: () => artifactId, dispatch })
    const base = { artifactRef: artifactId, expectedRevision: 0, commands: [{ kind: 'select' as const, fareId: 'fare-1', selected: true as const, captureId: 'capture-foreign', displayHandle, resultKey: 'result-1' }] }
    expect(await tools.edit_artifact.execute(base)).toMatchObject({ status: 'error', code: 'unknownDisplay' })
    expect(await tools.edit_artifact.execute({ ...base, artifactRef: foreignArtifact, commands: [{ ...base.commands[0], fareId: 'fare-else' }] })).toMatchObject({ status: 'error', code: 'unknownItem' })
    expect(selectFromQuery).not.toHaveBeenCalled()
  })

  it('keeps deselection independent from display capture metadata', async () => {
    const { store, bridge } = setup(), selected = store.dispatch({ kind: 'select', artifactId, fareId: FareIdSchema.parse('fare-1'), selected: true, expectedRevision: UIStateRevisionSchema.parse(0) })
    expect(selected.status).toBe('applied')
    const tools = createBrowserTools({ store, bridge, activeArtifactId: () => artifactId })
    expect(await tools.edit_artifact.execute({ artifactRef: artifactId, expectedRevision: 1, commands: [{ kind: 'select', fareId: 'fare-1', selected: false }] })).toMatchObject({ status: 'applied', revision: 2 })
    expect(store.get(artifactId).selectedFareIds).toEqual([])
  })

  it('rejects mixed positive-selection batches before applying any command', async () => {
    const { store, bridge } = setup()
    const dispatch = vi.fn<(command: UICommand) => DispatchResult>(command => store.dispatch(command))
    const tools = createBrowserTools({ store, bridge, activeArtifactId: () => artifactId, dispatch })

    expect(await tools.edit_artifact.execute({
      artifactRef: artifactId,
      expectedRevision: 0,
      commands: [
        { kind: 'dates', dates: { start: '2026-10-26' } },
        { kind: 'select', fareId: 'fare-1', selected: true, captureId: 'capture-old', displayHandle: 'display-old', resultKey: 'result-old' },
      ],
    })).toMatchObject({ status: 'error', code: 'LOCAL_TOOL_FAILED' })
    expect(dispatch).not.toHaveBeenCalled()
    expect(store.get(artifactId)).toMatchObject({ revision: 0, dates: { start: '2026-10-08' }, selectedFareIds: [] })
  })

  it('allows nonpositive batches that include deselection', async () => {
    const { store, bridge } = setup()
    expect(store.dispatch({ kind: 'select', artifactId, fareId: FareIdSchema.parse('fare-1'), selected: true, expectedRevision: UIStateRevisionSchema.parse(0) }).status).toBe('applied')
    const tools = createBrowserTools({ store, bridge, activeArtifactId: () => artifactId })

    expect(await tools.edit_artifact.execute({
      artifactRef: artifactId,
      expectedRevision: 1,
      commands: [
        { kind: 'filters', filters: { modes: ['train'], carrierIds: [], directOnly: false } },
        { kind: 'select', fareId: 'fare-1', selected: false },
      ],
    })).toMatchObject({ status: 'applied', revision: 3 })
    expect(store.get(artifactId)).toMatchObject({ revision: 3, filters: { modes: ['train'] }, selectedFareIds: [] })
  })

  it('requires captured display metadata for agent selections', async () => {
    const { store, bridge } = setup()
    const tools = createBrowserTools({ store, bridge, activeArtifactId: () => artifactId })
    expect(await tools.edit_artifact.execute({ artifactRef: artifactId, expectedRevision: 0, commands: [{ kind: 'select', fareId: 'fare-1', selected: true }] })).toMatchObject({ status: 'error', code: 'LOCAL_TOOL_FAILED' })
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
