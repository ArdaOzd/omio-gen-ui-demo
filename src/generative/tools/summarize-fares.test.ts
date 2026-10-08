import { describe, expect, it } from 'vitest'
import { ArtifactIdSchema } from '../contracts'
import { createUIStateStore } from '../state/ui-state-store'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { createBrowserTools } from './browser-tools'
import { parseToolInput } from '../../../agent/request-schema'

describe('fixed browser tool surface', () => {
  it('does not expose the retired arbitrary fare summarizer', () => {
    const bridge = createFixedProjectionFixture({ rows: [] }).bridge
    const store = createUIStateStore()
    const artifactId = ArtifactIdSchema.parse('tool-surface')
    store.initializeMissing(artifactId, {})
    const tools = createBrowserTools({ bridge, store, activeArtifactId: () => artifactId })
    expect(Object.keys(tools).sort()).toEqual(['create_artifact', 'edit_artifact', 'inspect_display'])
    expect(tools).not.toHaveProperty('summarize_fares')
  })

  it('rejects arbitrary query, filter, SQL, and row payloads at the strict tool boundary', () => {
    for (const input of [
      { datasetRef: 'scope', groupBy: 'mode' },
      { where: { field: 'mode', op: 'eq', value: 'bus' } },
      { filters: { rows: [{ id: 'private' }] } },
      { sql: 'SELECT * FROM fares' },
    ]) expect(() => parseToolInput('summarize_fares', input)).toThrow()
  })
})
