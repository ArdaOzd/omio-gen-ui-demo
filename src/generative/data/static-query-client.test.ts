import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LookupPinsRequestSchema, QueryGroupsRequestSchema, type QueryGroupsResponse } from '../contracts/query-groups'
import { createStaticQueryClient, type StaticQueryWorker } from './static-query-client'
import { createStaticQueryEngine } from './static-query-engine'
import type { StaticWorkerRequest, StaticWorkerResponse } from './static-query-protocol'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const assetRoot = resolve(root, 'site/data/fares-v1')
const baseUrl = pathToFileURL(`${assetRoot}${sep}`)

async function fileFetch(input: string | URL | Request): Promise<Response> {
  const url = input instanceof Request ? new URL(input.url) : new URL(input.toString())
  try {
    return new Response(new Uint8Array(await readFile(fileURLToPath(url))), { status: 200 })
  } catch {
    return new Response('missing', { status: 404 })
  }
}

async function transparentlyDecodedFetch(input: string | URL | Request): Promise<Response> {
  const url = input instanceof Request ? new URL(input.url) : new URL(input.toString())
  try {
    const payload = await readFile(fileURLToPath(url))
    const body = url.pathname.endsWith('.gz') ? gunzipSync(payload) : payload
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: url.pathname.endsWith('.gz') ? { 'content-encoding': 'gzip' } : undefined,
    })
  } catch {
    return new Response('missing', { status: 404 })
  }
}

function queryRequest(from = '2026-12-08', to = '2026-12-08') {
  const filters = { modes: [], carrierIds: [], directOnly: false }
  return QueryGroupsRequestSchema.parse({
    version: 1,
    requestId: 'static-parity',
    expectedSourceVersion: null,
    groups: [{
      groupId: 'london-paris',
      scope: {
        kind: 'fareScope', originId: 'london', destinationId: 'paris',
        dateWindow: { from, to }, passengers: 1,
        earliestDeparture: { date: from, minutes: 0 },
      },
      projections: [
        { projectionId: 'page', kind: 'farePage', filters, serviceDate: null, sort: { field: 'departureMinutes', direction: 'asc' }, after: null, limit: 7 },
        { projectionId: 'calendar', kind: 'calendarDays', filters, objective: 'cheapest' },
        { projectionId: 'carriers', kind: 'carrierFacets', filters },
        { projectionId: 'modes', kind: 'modeSummary', filters, baseline: 'withoutModeFilter' },
        { projectionId: 'highlights', kind: 'fareHighlights', filters },
      ],
    }],
  })
}

function semanticResponse(response: QueryGroupsResponse): unknown {
  return response.groups.map(group => ({
    manifest: {
      coverage: group.manifest.coverage,
      totalAvailable: group.manifest.totalAvailable,
      availableModes: group.manifest.availableModes,
      availableDateWindow: group.manifest.availableDateWindow,
      complete: group.manifest.complete,
    },
    projections: group.projections.map(projection => {
      if (projection.kind === 'farePage') {
        return { kind: projection.kind, items: projection.items, pageInfo: { ...projection.pageInfo, nextCursor: projection.pageInfo.nextCursor === null ? null : '<cursor>' } }
      }
      const { projectionId: _projectionId, inputHash: _inputHash, resultFingerprint: _fingerprint, ...semantic } = projection
      return semantic
    }),
  }))
}

describe('static fare query client', () => {
  it('matches every backend projection over the exported source range', async () => {
    const database = resolve(root, 'data/omio.sqlite3')
    if (!existsSync(database)) return
    const request = queryRequest()
    const engine = createStaticQueryEngine({ baseUrl, fetch: fileFetch })
    const actual = await engine.queryGroups(request, new AbortController().signal)
    const transportDecoded = await createStaticQueryEngine({ baseUrl, fetch: transparentlyDecodedFetch })
      .queryGroups(request, new AbortController().signal)
    const python = spawnSync('python3', ['-c', [
      'import json, sqlite3, sys',
      'from backend.query_groups import execute_query_groups',
      `c=sqlite3.connect('file:${database}?mode=ro', uri=True)`,
      'c.row_factory=sqlite3.Row',
      "c.execute('PRAGMA query_only=ON')",
      "print(json.dumps(execute_query_groups(c,json.load(sys.stdin),'backend-parity'),separators=(',',':')))" ,
    ].join(';')], { cwd: root, input: JSON.stringify(request), encoding: 'utf8' })
    expect(python.status, python.stderr).toBe(0)
    const expected = JSON.parse(python.stdout) as QueryGroupsResponse
    expect(semanticResponse(actual)).toEqual(semanticResponse(expected))
    expect(transportDecoded).toEqual(actual)
  }, 30_000)

  it('keeps overnight fares in the corpus while a page cutoff excludes query and lookup visibility', async () => {
    const request = queryRequest('2026-12-15', '2026-12-15')
    const unrestricted = createStaticQueryEngine({ baseUrl, fetch: fileFetch })
    const bounded = createStaticQueryEngine({ baseUrl, fetch: fileFetch, arrivalCutoff: '2026-12-15' })
    const [all, visible] = await Promise.all([
      unrestricted.queryGroups(request, new AbortController().signal),
      bounded.queryGroups(request, new AbortController().signal),
    ])
    const allPage = all.groups[0]?.projections.find(projection => projection.kind === 'farePage')
    const visiblePage = visible.groups[0]?.projections.find(projection => projection.kind === 'farePage')
    if (allPage?.kind !== 'farePage' || visiblePage?.kind !== 'farePage') throw new Error('Missing fare page')
    expect(allPage.pageInfo.total - visiblePage.pageInfo.total).toBe(4)

    const lateFareId = 'fare_007418483'
    const resourceKey = all.groups[0]?.manifest.resourceKey
    const scope = all.groups[0]?.manifest.coverage
    if (!resourceKey || !scope) throw new Error('Missing fare resource')
    const lookup = LookupPinsRequestSchema.parse({
      version: 1,
      requestId: 'late-fare-lookup',
      sourceVersion: all.sourceVersion,
      resources: [{ resourceKey, scope }],
      pins: [{ resourceKey, fareId: lateFareId }],
    })
    expect((await unrestricted.lookupPins(lookup, new AbortController().signal)).items.map(item => item.id)).toEqual([lateFareId])
    expect((await bounded.lookupPins(lookup, new AbortController().signal)).missingPins).toEqual([{ resourceKey, fareId: lateFareId }])

    const manifest = JSON.parse(await readFile(resolve(assetRoot, 'manifest.json'), 'utf8')) as {
      rowCount: number
      arrivalsAfterDateWindowCount: number
      originShards: Record<string, { path: string }>
    }
    const londonShard = JSON.parse(gunzipSync(await readFile(resolve(assetRoot, manifest.originShards.london.path))).toString('utf8')) as { rows: number[][] }
    expect(manifest.rowCount).toBe(1_616_587)
    expect(manifest.arrivalsAfterDateWindowCount).toBe(70_466)
    expect(londonShard.rows.some(row => row[0] === 7_418_483)).toBe(true)
  }, 30_000)

  it('rejects tampering in both raw-gzip and transport-decoded assets', async () => {
    function tampered(fetcher: typeof fileFetch): typeof fileFetch {
      return async input => {
        const url = input instanceof Request ? new URL(input.url) : new URL(input.toString())
        const response = await fetcher(input)
        if (!url.pathname.endsWith('/routes.json.gz')) return response
        const payload = new Uint8Array(await response.arrayBuffer())
        payload[Math.floor(payload.length / 2)] ^= 1
        return new Response(payload, { status: 200 })
      }
    }
    for (const fetcher of [tampered(fileFetch), tampered(transparentlyDecodedFetch)]) {
      const engine = createStaticQueryEngine({ baseUrl, fetch: fetcher })
      await expect(engine.queryGroups(queryRequest(), new AbortController().signal))
        .rejects.toThrow('failed integrity verification')
    }
  })

  it('round-trips stable fare identities through paging, cursors, and lookup', async () => {
    const engine = createStaticQueryEngine({ baseUrl, fetch: fileFetch })
    const base = queryRequest()
    const farePage = base.groups[0]?.projections.find(projection => projection.kind === 'farePage')
    if (farePage?.kind !== 'farePage') throw new Error('Missing fare page request')
    const firstRequest = QueryGroupsRequestSchema.parse({
      ...base,
      requestId: 'page-one',
      groups: [{ ...base.groups[0], projections: [{ ...farePage, limit: 2 }] }],
    })
    const first = await engine.queryGroups(firstRequest, new AbortController().signal)
    const firstPage = first.groups[0]?.projections[0]
    if (firstPage?.kind !== 'farePage' || !firstPage.pageInfo.nextCursor) throw new Error('Missing next cursor')
    const secondRequest = QueryGroupsRequestSchema.parse({
      ...firstRequest,
      requestId: 'page-two',
      expectedSourceVersion: first.sourceVersion,
      groups: [{ ...firstRequest.groups[0], projections: [{ ...firstRequest.groups[0]?.projections[0], after: firstPage.pageInfo.nextCursor }] }],
    })
    const second = await engine.queryGroups(secondRequest, new AbortController().signal)
    const secondPage = second.groups[0]?.projections[0]
    if (secondPage?.kind !== 'farePage') throw new Error('Missing second page')
    expect(secondPage.pageInfo.total).toBe(firstPage.pageInfo.total)
    expect(secondPage.items.map(item => item.id)).not.toEqual(firstPage.items.map(item => item.id))

    const resourceKey = second.groups[0]?.manifest.resourceKey
    const scope = second.groups[0]?.manifest.coverage
    const fareId = secondPage.items[0]?.id
    if (!resourceKey || !scope || !fareId) throw new Error('Missing lookup identity')
    const lookup = LookupPinsRequestSchema.parse({
      version: 1,
      requestId: 'page-two-lookup',
      sourceVersion: second.sourceVersion,
      resources: [{ resourceKey, scope }],
      pins: [{ resourceKey, fareId }],
    })
    expect((await engine.lookupPins(lookup, new AbortController().signal)).items[0]?.id).toBe(fareId)

    const stale = QueryGroupsRequestSchema.parse({
      ...secondRequest,
      requestId: 'stale-cursor',
      groups: [{
        ...secondRequest.groups[0],
        projections: [{ ...secondRequest.groups[0]?.projections[0], sort: { field: 'priceCents', direction: 'asc' } }],
      }],
    })
    await expect(engine.queryGroups(stale, new AbortController().signal)).rejects.toMatchObject({ code: 'staleCursor' })
  })

  it('cancels only the matching worker request', async () => {
    const sent: StaticWorkerRequest[] = []
    const listeners = new Set<(event: MessageEvent<unknown>) => void>()
    const worker: StaticQueryWorker = {
      postMessage(message) { sent.push(message) },
      addEventListener(_type, listener) { listeners.add(listener) },
      removeEventListener(_type, listener) { listeners.delete(listener) },
      terminate() { listeners.clear() },
    }
    const reply = (response: StaticWorkerResponse) => listeners.forEach(listener => listener(new MessageEvent('message', { data: response })))
    const client = createStaticQueryClient({ baseUrl, workerFactory: () => worker })
    const init = sent[0]
    if (!init || init.kind !== 'init') throw new Error('Missing worker initialization')
    reply({ kind: 'ready', id: init.id })
    const controller = new AbortController()
    const result = client.queryGroups(queryRequest(), controller.signal)
    await Promise.resolve()
    const active = [...sent].reverse().find(message => message.kind === 'queryGroups')
    if (!active || active.kind !== 'queryGroups') throw new Error('Missing worker query')
    controller.abort()
    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
    expect(sent.at(-1)).toEqual({ kind: 'cancel', id: active.id })
    client.dispose()
  })
})
