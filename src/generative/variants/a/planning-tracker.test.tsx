import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TravelProvider, type TravelServices } from '../../catalog/context'
import { FareCards } from '../../catalog/views'
import {
  ArtifactIdSchema,
  BoundedFareFactSchema,
  DatasetIdSchema,
  DatasetManifestSchema,
  DatasetRevisionSchema,
  FareFieldSchema,
  FareRowSchema,
  type FareDataBridge,
  type FareRow,
} from '../../contracts'
import { createUIStateStore } from '../../state/ui-state-store'
import { createActionRouter } from '../../state/action-router'
import { createFareDataBridge } from '../../data/fare-data-bridge'
import { PlanningTracker } from './planning-tracker'

const rows = [
  FareRowSchema.parse({ id: 'fare-late', originId: 'prague', destinationId: 'vienna', serviceDate: '2026-10-08', mode: 'train', carrierId: 'night-rail', carrierName: 'Night Rail', priceCents: 9000, durationMinutes: 240, departureMinutes: 1080, availableSeats: 4, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true }),
  FareRowSchema.parse({ id: 'fare-early', originId: 'berlin', destinationId: 'prague', serviceDate: '2026-10-06', mode: 'bus', carrierId: 'central-bus', carrierName: 'Central Bus', priceCents: 4500, durationMinutes: 300, departureMinutes: 480, availableSeats: 6, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true }),
]

const datasetId = DatasetIdSchema.parse('tracker-dataset')
const numericFields = new Set(['priceCents', 'durationMinutes', 'departureMinutes', 'availableSeats'])
const booleanFields = new Set(['synthetic', 'direct'])
const manifest = DatasetManifestSchema.parse({
  datasetId,
  revision: DatasetRevisionSchema.parse(1),
  schemaVersion: '1.0.0',
  coverage: { originIds: ['prague', 'berlin'], destinationIds: ['vienna', 'prague'], dateWindow: { from: '2026-10-01', to: '2026-10-10' }, modes: ['train', 'bus'], passengers: 1, complete: true, truncated: false },
  rowCount: rows.length,
  fields: FareFieldSchema.options.map(name => ({ name, type: numericFields.has(name) ? 'number' : booleanFields.has(name) ? 'boolean' : 'string', nullable: name === 'carrierName', filterable: true, groupable: true, joinKey: name === 'id' })),
  compactSummary: { minPriceCents: 4500, maxPriceCents: 9000, minDurationMinutes: 240, maxDurationMinutes: 300, modeCounts: { train: 1, bus: 1 } },
  source: { kind: 'synthetic-fixture', descriptorId: 'tracker-fixture', sourceVersion: 'v1' },
})

function fact(row: FareRow) {
  return BoundedFareFactSchema.parse({ id: row.id, mode: row.mode, carrierId: row.carrierId, carrierName: row.carrierName, priceCents: row.priceCents, durationMinutes: row.durationMinutes, serviceDate: row.serviceDate, departureMinutes: row.departureMinutes, originId: row.originId, destinationId: row.destinationId, currency: row.currency, synthetic: row.synthetic, priceBasis: row.priceBasis })
}

function fixture(selected = true) {
  const first = ArtifactIdSchema.parse('artifact-first')
  const second = ArtifactIdSchema.parse('artifact-second')
  const state = createUIStateStore()
  state.initializeMissing(first, { datasetRefs: [datasetId], selectedFareIds: selected ? [rows[0]!.id] : [] })
  state.initializeMissing(second, { datasetRefs: [datasetId], selectedFareIds: selected ? [rows[1]!.id, rows[0]!.id] : [] })
  const facts = new Map(rows.map(row => [row.id, fact(row)]))
  const bridge: FareDataBridge = {
    async load() { return manifest },
    getManifest() { return manifest },
    async query() { return { rows, total: rows.length, truncated: false, datasetRevision: manifest.revision, requestId: 'tracker-query' } },
    async lookupFare(id) { const value = facts.get(id); if (!value) throw new Error('Missing fare'); return value },
    subscribe() { return () => {} },
    release() {},
  }
  let active = first
  const services = { bridge, state, activeId: () => active, artifactIds: () => [first, second], activate: id => { active = ArtifactIdSchema.parse(id) } } satisfies TravelServices
  return { first, second, services, state }
}

describe('Version A planning tracker', () => {
  it('stays hidden until a fare is selected', () => {
    const { services } = fixture(false)
    render(<TravelProvider services={services}><PlanningTracker /></TravelProvider>)
    expect(screen.queryByRole('complementary', { name: 'Planning tracker' })).toBeNull()
  })

  it('sorts all artifacts chronologically, deduplicates fares, and keeps source cards in sync', async () => {
    const user = userEvent.setup()
    const { first, second, services, state } = fixture()
    render(<TravelProvider services={services}><FareCards artifactRef={first} /><PlanningTracker /></TravelProvider>)
    const tracker = await screen.findByRole('complementary', { name: 'Planning tracker' })
    await waitFor(() => expect(within(tracker).queryByText('Loading selected fares…')).toBeNull())
    const items = within(tracker).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Berlin → Prague')
    expect(items[1]).toHaveTextContent('Prague → Vienna')

    await user.click(within(tracker).getByRole('button', { name: 'Cancel Prague to Vienna on 2026-10-08' }))
    expect(state.get(first).selectedFareIds).toEqual([])
    expect(state.get(second).selectedFareIds).toEqual([rows[1]!.id])
    await waitFor(() => expect(screen.getByRole('button', { name: /Night Rail.*18:00/ })).toHaveTextContent('Select'))

    await user.click(within(tracker).getByRole('button', { name: 'Clear all' }))
    expect(state.get(second).selectedFareIds).toEqual([])
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Planning tracker' })).toBeNull())
  })

  it('opens an accessible confirmation and restores focus after Escape', async () => {
    const user = userEvent.setup()
    const { services } = fixture()
    render(<TravelProvider services={services}><PlanningTracker /></TravelProvider>)
    const buy = await screen.findByRole('button', { name: 'Buy' })
    await user.click(buy)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Congrats, you are set for the trip.')
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(buy).toHaveFocus()
  })

  it('removes a selected fare from the tracker after its route leg is replaced', async () => {
    const selected = FareRowSchema.parse({ id: 'london-paris', originId: 'london', destinationId: 'paris', serviceDate: '2026-10-08', mode: 'train', carrierId: 'rail', carrierName: 'Test Rail', priceCents: 4000, durationMinutes: 160, departureMinutes: 540, availableSeats: 4, currency: 'EUR', synthetic: true, priceBasis: 'per-passenger-including-demo-fees', direct: true })
    const bridge = createFareDataBridge({ pageSource: async input => ({ rows: [FareRowSchema.parse({ ...selected, id: `${input.originId}-${input.destinationId}`, originId: input.originId, destinationId: input.destinationId, serviceDate: input.date })], total: 1, pages: 1, page: input.page, sourceVersion: 'route-tracker-v1' }) })
    const seeded = await bridge.load({ originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-08', to: '2026-10-08' }, modes: ['train'], passengers: 1 }, new AbortController().signal)
    const artifactId = ArtifactIdSchema.parse('route-tracker')
    const state = createUIStateStore()
    state.initializeMissing(artifactId, { datasetRefs: [seeded.datasetId], citySequence: ['london', 'paris'], dates: { start: '2026-10-08' }, selectedFareIds: [selected.id] })
    const router = createActionRouter(state, { bridge })
    const services = { bridge, state, dispatch: router, whenIdle: router.whenIdle, activeId: () => artifactId, artifactIds: () => [artifactId], activate: () => {} } satisfies TravelServices
    render(<TravelProvider services={services}><PlanningTracker /></TravelProvider>)
    await screen.findByRole('complementary', { name: 'Planning tracker' })

    router({ kind: 'route', artifactId, citySequence: ['london', 'rome'] })
    await router.whenIdle(artifactId)

    expect(state.exportSnapshot(artifactId).selectedFareIds).toEqual([])
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Planning tracker' })).toBeNull())
    router.dispose()
  })
})
