import { describe, expect, it } from 'vitest'
import { ArtifactIdSchema, DatasetIdSchema, QueryGroupsResponseSchema } from '../contracts'
import { QueryExecutionStateSchema, type FareScope } from '../contracts/query-groups'
import { createFareDataBridge } from '../data/fare-data-bridge'
import type { ServerQueryClient } from '../data/server-query-client'
import { createDisplayContextStore } from './display-context'
import { captureAgentContext } from './snapshot-exporter'
import { createUIStateStore } from './ui-state-store'

describe('next-turn display snapshot', () => {
  it('keeps desired inputs separate from the old committed result while refresh is pending', async () => {
    const scope: FareScope = { kind: 'fareScope', originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-26', to: '2026-10-27' }, passengers: 2, earliestDeparture: { date: '2026-10-26', minutes: 0 } }
    const client: ServerQueryClient = {
      queryGroups: async request => QueryGroupsResponseSchema.parse({
        version: 1,
        requestId: request.requestId,
        sourceVersion: 'source-1',
        groups: request.groups.map(group => ({
          groupId: group.groupId,
          manifest: { kind: 'fareScopeManifest', resourceKey: 'scope-1', source: { kind: 'search', descriptorId: 'scope-1', sourceVersion: 'source-1' }, coverage: group.scope, totalAvailable: 0, availableModes: [], availableDateWindow: null, complete: false },
          projections: [],
        })),
      }),
      lookupPins: async () => { throw new Error('unused') },
    }
    const bridge = createFareDataBridge({ client })
    await bridge.loadScope(scope, new AbortController().signal)
    const binding = bridge.findBinding(DatasetIdSchema.parse('scope-1'))
    if (!binding) throw new Error('Missing fixture binding')
    const artifactId = ArtifactIdSchema.parse('artifact-context')
    const state = createUIStateStore({ now: () => '2026-10-26T00:00:00.000Z' })
    state.initializeMissing(artifactId, { datasetRefs: [binding.datasetId], citySequence: ['london', 'paris'], dates: { start: scope.dateWindow.from, end: scope.dateWindow.to } })
    const displayStore = createDisplayContextStore()
    displayStore.register({ componentRef: { value: 'artifact-context:present-1:fares', keySource: 'authored-key' }, componentType: 'FareCards', scope: { kind: 'leg', artifactId, legIndex: 0, legKey: 'london:paris', resourceKey: binding.resourceKey }, authored: {} })
    displayStore.setInputs('artifact-context:present-1:fares', {
      values: { originId: 'london', destinationId: 'paris', dateWindow: scope.dateWindow, passengers: 3, modes: ['train'] },
      provenance: [{ field: 'passengers', origin: 'user', eventSequence: 2, componentRef: 'artifact-context:present-1:passengers' }],
    })
    displayStore.setExecution('artifact-context:present-1:fares', QueryExecutionStateSchema.parse({
      status: 'refreshing',
      intent: { queryKey: 'fares', groupKey: 'leg', projectionKey: 'page', desiredInputHash: 'input-new', desiredInputVersion: 2, uiRevision: 4 },
      current: { resultKey: 'result-old', inputHash: 'input-old', inputVersion: 1, requestId: 'request-old', resourceKey: binding.resourceKey, datasetId: binding.datasetId, datasetRevision: binding.datasetRevision, sourceVersion: 'source-1', resultFingerprint: 'fingerprint-old', total: 0, truncated: false },
    }))
    displayStore.setDisplay('artifact-context:present-1:fares', { payload: { kind: 'fare-order', orderedFareRefs: [] }, totalDisplayed: 0, includedCount: 0, complete: true, omittedCount: 0 })

    const context = captureAgentContext({ turnId: 'turn-1', activeArtifactId: artifactId, artifactIds: [artifactId], store: state, bridge, displayStore })
    expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(24 * 1024)
    expect(context.displayContext.components[0]).toMatchObject({
      inputs: { passengers: 3, modes: ['train'] },
      provenance: [{ field: 'passengers', origin: 'user' }],
      execution: { status: 'refreshing', intent: { desiredInputHash: 'input-new', desiredInputVersion: 2 }, current: { inputHash: 'input-old', inputVersion: 1, resultKey: 'result-old' } },
    })
  })
})
