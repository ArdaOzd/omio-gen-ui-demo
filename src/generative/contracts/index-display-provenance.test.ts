import { describe, expect, it } from 'vitest'
import { createUIStateStore } from '../state/ui-state-store'
import {
  ArtifactIdSchema,
  DatasetIdSchema,
  FareItemSchema,
  ResourceKeySchema,
  parseAgentContext,
} from './index'

const artifactId = ArtifactIdSchema.parse('artifact-1')
const datasetId = DatasetIdSchema.parse('scope-1')
const resourceKey = ResourceKeySchema.parse('scope-1')
const scope = {
  kind: 'fareScope' as const,
  originId: 'london',
  destinationId: 'paris',
  dateWindow: { from: '2026-10-26', to: '2026-10-26' },
  passengers: 1,
  earliestDeparture: { date: '2026-10-26', minutes: 0 },
}
const fare = FareItemSchema.parse({
  id: 'fare-1', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-26', mode: 'train',
  carrierId: 'rail', carrierName: 'Rail', priceCents: 2500, durationMinutes: 160, departureMinutes: 600,
  availableSeats: 4, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true,
  legs: [{ legIndex: 0, mode: 'train', carrierName: 'Rail', durationMinutes: 160, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
})
const { availableSeats: _availableSeats, ...fact } = fare

function envelope(visibility: 'visible' | 'hidden-tab' = 'visible', sourceVersion = 'source-1') {
  const store = createUIStateStore({ now: () => '2026-10-26T00:00:00.000Z' })
  store.initializeMissing(artifactId, {
    datasetRefs: [datasetId],
    dates: { start: '2026-10-26' },
    citySequence: ['london', 'paris'],
  })
  const snapshot = store.exportSnapshot(artifactId)
  const componentRef = 'fare-list-1'
  const execution = {
    status: 'ready' as const,
    intent: { queryKey: 'query-1', groupKey: 'group-1', projectionKey: 'projection-1', desiredInputHash: 'input-1', desiredInputVersion: 1, uiRevision: 0 },
    current: { resultKey: 'result-1', inputHash: 'input-1', inputVersion: 1, requestId: 'request-1', resourceKey, datasetId, datasetRevision: 1, sourceVersion: 'source-1', resultFingerprint: 'fingerprint-1', total: 1, truncated: false },
  }
  return {
    schemaVersion: '2.0.0',
    turnId: 'turn-1',
    activeArtifactId: artifactId,
    artifacts: [snapshot],
    datasets: [{
      resourceKey,
      datasetId,
      datasetRevision: 1,
      manifest: { kind: 'fareScopeManifest', resourceKey, source: { kind: 'search', descriptorId: resourceKey, sourceVersion: 'source-1' }, coverage: scope, totalAvailable: 1, availableModes: ['train'], availableDateWindow: scope.dateWindow, complete: true },
    }],
    selectedFareFacts: [],
    displayContext: {
      version: 1,
      captureId: 'capture-1',
      components: [{
        identity: { componentRef: { value: componentRef, keySource: 'authored-key' }, componentType: 'FareList', scope: { kind: 'leg', artifactId, legIndex: 0, legKey: 'london:paris', resourceKey }, authored: {} },
        group: { artifactId, legKey: 'london:paris', purpose: 'results' },
        inputs: {},
        provenance: [],
        execution,
        display: { payload: { kind: 'fare-order', orderedFareRefs: [{ fareId: fare.id, rank: 1 }], renderedRange: { fromRank: 1, toRank: 1 } }, totalDisplayed: 1, includedCount: 1, complete: true, omittedCount: 0, displayHandle: 'display-1' },
        visibility,
        renderOrder: 0,
      }],
      activeViews: visibility === 'visible' ? [componentRef] : [],
      exposedOrderedIds: visibility === 'visible' ? [fare.id] : [],
      shownFareFacts: [{ sourceVersion, fact, displayedBy: [{ componentRef, rank: 1 }] }],
      recentInteractions: [],
      completeness: { complete: true, omittedComponents: 0, omittedFacts: 0 },
    },
  }
}

describe('agent display provenance', () => {
  it('accepts a visible fact tied to its committed source', () => {
    expect(parseAgentContext(envelope())).toMatchObject({ displayContext: { shownFareFacts: [{ fact: { id: 'fare-1' } }] } })
  })

  it('rejects hidden or source-mismatched facts labeled as shown', () => {
    expect(() => parseAgentContext(envelope('hidden-tab'))).toThrow('visible committed source')
    expect(() => parseAgentContext(envelope('visible', 'source-2'))).toThrow('visible committed source')
  })
})
