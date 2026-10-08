import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ArtifactIdSchema, DatasetIdSchema, QueryGroupsResponseSchema } from '../contracts'
import { FareItemSchema, type FareScope } from '../contracts/query-groups'
import { createFareDataBridge } from '../data/fare-data-bridge'
import type { ServerQueryClient } from '../data/server-query-client'
import { createDisplayContextStore } from '../state/display-context'
import { createUIStateStore } from '../state/ui-state-store'
import { DisplayContextProvider, DisplayNodeProvider } from './display-context-provider'
import { TravelProvider, type TravelServices } from './context'
import { FareCards } from './views'

const scope: FareScope = { kind: 'fareScope', originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-26', to: '2026-10-26' }, passengers: 1, earliestDeparture: { date: '2026-10-26', minutes: 0 } }
const items = Array.from({ length: 9 }, (_, index) => FareItemSchema.parse({
  id: `fare-${index + 1}`, originId: 'london', destinationId: 'paris', serviceDate: '2026-10-26', mode: 'train', carrierId: 'rail', carrierName: `Rail ${index + 1}`,
  priceCents: 2000 + index * 100, durationMinutes: 120, departureMinutes: 480 + index * 20, availableSeats: 4, currency: 'EUR', synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees', direct: true,
  legs: [{ legIndex: 0, mode: 'train', carrierName: `Rail ${index + 1}`, durationMinutes: 120, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
}))

describe('FareCards keyset pagination', () => {
  it('requests exactly the seven rendered rows and preserves a prior-page selection', async () => {
    const requests: Array<{ after: string | null; limit: number }> = []
    const client: ServerQueryClient = {
      queryGroups: async request => QueryGroupsResponseSchema.parse({
        version: 1,
        requestId: request.requestId,
        sourceVersion: 'source-1',
        groups: request.groups.map(group => ({
          groupId: group.groupId,
          manifest: { kind: 'fareScopeManifest', resourceKey: 'scope-1', source: { kind: 'search', descriptorId: 'scope-1', sourceVersion: 'source-1' }, coverage: group.scope, totalAvailable: items.length, availableModes: ['train'], availableDateWindow: group.scope.dateWindow, complete: true },
          projections: group.projections.map(projection => {
            if (projection.kind !== 'farePage') throw new Error('Unexpected projection')
            requests.push({ after: projection.after, limit: projection.limit })
            const offset = projection.after === 'cursor-7' ? 7 : 0
            const page = items.slice(offset, offset + projection.limit)
            return { projectionId: projection.projectionId, kind: 'farePage', inputHash: `input-${offset}`, resultFingerprint: `result-${offset}`, items: page, pageInfo: { total: items.length, returned: page.length, hasNextPage: offset + page.length < items.length, nextCursor: offset + page.length < items.length ? 'cursor-7' : null } }
          }),
        })),
      }),
      lookupPins: async () => { throw new Error('unused') },
    }
    const bridge = createFareDataBridge({ client })
    await bridge.loadScope(scope, new AbortController().signal)
    const artifactId = ArtifactIdSchema.parse('artifact-pages'), datasetId = DatasetIdSchema.parse('scope-1')
    const state = createUIStateStore({ now: () => '2026-10-26T00:00:00.000Z' })
    state.initializeMissing(artifactId, { datasetRefs: [datasetId], citySequence: ['london', 'paris'], dates: { start: '2026-10-26' } })
    const services = { bridge, state, activeId: () => artifactId, activate: () => {} } satisfies TravelServices
    const displayStore = createDisplayContextStore()
    render(<DisplayContextProvider store={displayStore}><TravelProvider services={services}><DisplayNodeProvider identity={{ componentRef: { value: 'artifact-pages:present:fares', keySource: 'authored-key' }, componentType: 'FareCards', scope: { kind: 'leg', artifactId, legIndex: 0, legKey: 'london:paris', resourceKey: 'scope-1' }, authored: {} }}><FareCards artifactRef={artifactId} datasetRef={datasetId} /></DisplayNodeProvider></TravelProvider></DisplayContextProvider>)

    await screen.findByText('Rail 1')
    expect(requests.at(-1)).toEqual({ after: null, limit: 7 })
    fireEvent.click(screen.getByRole('button', { name: /Select Train Rail 1/i }))
    expect(state.get(artifactId).selectedFareIds).toEqual([items[0]!.id])
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Rail 8')
    await waitFor(() => expect(requests.at(-1)).toEqual({ after: 'cursor-7', limit: 7 }))
    expect(state.get(artifactId).selectedFareIds).toEqual([items[0]!.id])
    expect(screen.getByText('Page 2')).toBeVisible()

    const capture = displayStore.capture({ captureId: 'page-2', artifactIds: [artifactId] })
    expect(capture.exposedOrderedIds).toEqual([items[7]!.id, items[8]!.id])
    expect(capture.components[0]?.display?.payload).toMatchObject({ kind: 'fare-order', renderedRange: { fromRank: 8, toRank: 9 }, viewport: { offset: 7, limit: 2, cursor: 'cursor-7' } })
  })
})
