import assert from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, type APIRequestContext, type Page } from '@playwright/test'
import {
  ArtifactUIStateSchema,
  CATALOG_VERSION,
  CONTRACT_VERSION,
  CoverageRequestSchema,
} from '../../src/generative/contracts'
import { PersistedThreadSchema } from '../../src/generative/state/persistence'
import { coverageKey, stableRef } from '../../src/generative/data/resource-loader'

type ApiFare = {
  id: string
  mode: 'train' | 'bus' | 'flight' | 'ferry'
  company: string
  departure_time: string
  duration_minutes: number
  price_cents: number
}

type CanonicalFare = ApiFare & {
  serviceDate: string
  departureMinutes: number
}

const base = process.env.OMIO_DEMO_URL ?? 'http://127.0.0.1:5173'
const outputDir = resolve('verification/generative-ui/fare-selection-proof')
const artifactId = 'artifact-fare-selection-proof'
const request = CoverageRequestSchema.parse({
  originIds: ['london'],
  destinationIds: ['paris'],
  dateWindow: { from: '2026-10-12', to: '2026-10-12' },
  modes: ['train', 'bus', 'flight', 'ferry'],
  passengers: 1,
})
const datasetId = `dataset-${stableRef(coverageKey(request))}`

const money = (cents: number) => new Intl.NumberFormat('en-GB', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
}).format(cents / 100)

const modeLabel = (mode: string) => mode.replace(/[-_]/g, ' ').replace(/\b\w/g, value => value.toUpperCase())

const fareDateTime = (fare: CanonicalFare, offset = 0) => {
  const minutes = fare.departureMinutes + offset
  const day = Math.floor(minutes / 1440)
  const date = new Date(Date.parse(`${fare.serviceDate}T00:00:00.000Z`) + day * 86_400_000)
  const clock = `${String(Math.floor((minutes % 1440) / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })} · ${clock}`
}

async function canonicalFares(api: APIRequestContext) {
  const byId = new Map<string, CanonicalFare>()
  let sourceVersion = ''
  let pagesRead = 0
  dates: for (let timestamp = Date.parse(`${request.dateWindow.from}T00:00:00.000Z`); timestamp <= Date.parse(`${request.dateWindow.to}T00:00:00.000Z`); timestamp += 86_400_000) {
    const serviceDate = new Date(timestamp).toISOString().slice(0, 10)
    let page = 1
    let pages = 1
    do {
      if (pagesRead >= 256 || byId.size >= 50_000) break dates
      const params = new URLSearchParams({
        origin: 'london', destination: 'paris', departure_date: serviceDate,
        passengers: '1', mode: 'all', sort: 'price_asc', page: String(page), limit: '100',
      })
      const response = await api.get(`${base}/api/search?${params}`)
      assert.equal(response.ok(), true, `fare API failed for ${serviceDate} page ${page}: ${response.status()}`)
      const payload = await response.json() as { source_version: string; outbound: { pages: number; results: ApiFare[] } }
      if (sourceVersion) assert.equal(payload.source_version, sourceVersion, 'fare source changed during proof setup')
      sourceVersion = payload.source_version
      pages = payload.outbound.pages
      pagesRead += 1
      for (const row of payload.outbound.results) {
        if (!request.modes.includes(row.mode)) continue
        const time = row.departure_time.includes('T') ? row.departure_time.split('T')[1] : row.departure_time
        const [hours, minutes] = (time ?? '').split(':').map(Number)
        byId.set(row.id, { ...row, serviceDate, departureMinutes: (hours ?? 0) * 60 + (minutes ?? 0) })
        if (byId.size >= 50_000) break dates
      }
      page += 1
    } while (page <= pages)
  }
  const rows = [...byId.values()]
  assert.ok(rows.length > 1, 'canonical route needs at least two fares')
  assert.ok(sourceVersion, 'canonical source version is missing')
  return { rows, sourceVersion }
}

function minimumCandidates(rows: CanonicalFare[], field: 'price_cents' | 'duration_minutes') {
  const minimum = Math.min(...rows.map(row => row[field]))
  return rows.filter(row => row[field] === minimum)
}

function matchDisplayedFare(text: string, candidates: CanonicalFare[]) {
  const matches = candidates.filter(fare => text.includes(fare.company)
    && text.includes(money(fare.price_cents))
    && text.includes(fareDateTime(fare))
    && text.includes(fareDateTime(fare, fare.duration_minutes)))
  assert.equal(matches.length, 1, `displayed fare did not match exactly one canonical candidate: ${JSON.stringify({ text, candidates })}`)
  return matches[0]!
}

function scene() {
  const node = (type: string, key: string, extra: Record<string, unknown> = {}) => ({
    $type: type, $key: key, artifactRef: artifactId, ...extra,
  })
  return node('TravelSurface', 'root', {
    title: 'Canonical London–Paris fare proof',
    children: [node('CheapestFastest', 'summary', { datasetRef: datasetId, title: 'Cheapest versus fastest' })],
  })
}

function persistedRecord(sourceVersion: string) {
  const tree = scene()
  const state = ArtifactUIStateSchema.parse({
    artifactId,
    revision: 0,
    datasetRefs: [datasetId],
    filters: { modes: [], carrierIds: [], directOnly: false },
    dates: { start: request.dateWindow.from, end: request.dateWindow.to },
    stays: [],
    modesByLeg: {},
    sort: { field: 'priceCents', direction: 'asc' },
    selectedFareIds: [],
    pending: [],
    lastInteractionAt: '2026-10-07T12:00:00.000Z',
  })
  return PersistedThreadSchema.parse({
    schemaVersion: CONTRACT_VERSION,
    catalogVersion: CATALOG_VERSION,
    parserVersion: 'native-present-1',
    queryVersion: '1',
    activeArtifactId: artifactId,
    artifacts: [{ source: JSON.stringify(tree), state }],
    descriptors: [{ datasetId, request, sourceVersion, complete: true }],
    messages: [
      { id: 'proof-user', role: 'user', parts: [{ type: 'text', text: 'Show the cheapest and fastest London to Paris options next week.' }] },
      { id: 'proof-assistant', role: 'assistant', parts: [
        { type: 'step-start' },
        { type: 'text', text: 'Earlier planning prose.' },
        { type: 'tool-load_fares', toolCallId: 'proof-load', state: 'output-available', input: { coverage: request }, output: { datasetId, status: 'ready' } },
        { type: 'tool-present', toolCallId: 'proof-present', state: 'output-available', input: tree, output: {} },
        { type: 'step-start' },
        { type: 'text', text: 'The bus saves money, while the flight saves time. Choose the tradeoff that fits your day.' },
      ] },
    ],
  })
}

async function seed(page: Page, record: ReturnType<typeof persistedRecord>) {
  await page.goto(`${base}/`)
  await page.evaluate(async value => {
    await new Promise<void>((resolveSeed, reject) => {
      const request = indexedDB.open('omio-generative-state', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('threads')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const tx = request.result.transaction('threads', 'readwrite')
        tx.objectStore('threads').put(value, 'travel-proof')
        tx.oncomplete = () => resolveSeed()
        tx.onerror = () => reject(tx.error)
      }
    })
  }, record)
  await page.goto(`${base}/generative`)
}

await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 920 } })
const { rows, sourceVersion } = await canonicalFares(context.request)
const cheapestCandidates = minimumCandidates(rows, 'price_cents')
const fastestCandidates = minimumCandidates(rows, 'duration_minutes')
const page = await context.newPage()
const pageErrors: string[] = []
let chatRequests = 0
page.on('pageerror', error => pageErrors.push(error.message))
await page.route('**/api/chat', route => { chatRequests += 1; return route.abort() })

const screenshotDiskPaths = {
  desktop: resolve(outputDir, 'desktop.png'),
  buy: resolve(outputDir, 'desktop-buy.png'),
  mobile: resolve(outputDir, 'mobile.png'),
}
const screenshotPaths = {
  desktop: 'verification/generative-ui/fare-selection-proof/desktop.png',
  buy: 'verification/generative-ui/fare-selection-proof/desktop-buy.png',
  mobile: 'verification/generative-ui/fare-selection-proof/mobile.png',
}

try {
  await seed(page, persistedRecord(sourceVersion))
  const summary = page.getByRole('heading', { name: 'Cheapest versus fastest', exact: true })
  await summary.waitFor({ timeout: 60_000 })

  const viewportText = await page.locator('.travel-viewport').innerText()
  const chatText = await page.locator('.travel-chat').innerText()
  const composerText = await page.locator('.travel-composer-wrap').innerText()
  const beforeIndex = viewportText.indexOf('Earlier planning prose.')
  const sceneIndex = viewportText.indexOf('Canonical London–Paris fare proof')
  const afterIndex = viewportText.indexOf('The bus saves money, while the flight saves time.')
  assert.ok(beforeIndex >= 0 && beforeIndex < sceneIndex && sceneIndex < afterIndex, 'narrative and generated view are not in chronological order')
  for (const unwanted of ['Completed steps', 'Travel data updated locally.', 'Active travel view · artifact-']) {
    assert.equal(chatText.includes(unwanted), false, `unexpected transcript chrome: ${unwanted}`)
  }
  assert.equal(composerText.includes('Synthetic fares'), false, 'unexpected synthetic-fares composer footer')

  const lowestCard = page.locator('.travel-insight').filter({ has: page.getByText('Lowest fare', { exact: true }) })
  const fastestCard = page.locator('.travel-insight').filter({ has: page.getByText('Fastest journey', { exact: true }) })
  await lowestCard.getByRole('button').waitFor()
  await fastestCard.getByRole('button').waitFor()
  const cheapest = matchDisplayedFare(await lowestCard.innerText(), cheapestCandidates)
  const fastest = matchDisplayedFare(await fastestCard.innerText(), fastestCandidates)
  assert.notEqual(cheapest.id, fastest.id, 'canonical cheapest and fastest fares must be distinct for this proof')
  for (const [card, fare] of [[lowestCard, cheapest], [fastestCard, fastest]] as const) {
    const text = await card.innerText()
    assert.ok(text.includes(money(fare.price_cents)))
    assert.ok(text.includes(fareDateTime(fare)))
    assert.ok(text.includes(fareDateTime(fare, fare.duration_minutes)))
  }

  await page.getByRole('button', { name: `Add lowest fare ${modeLabel(cheapest.mode)} ${money(cheapest.price_cents)} to trip` }).click()
  await page.getByRole('button', { name: `Remove lowest fare ${modeLabel(cheapest.mode)} ${money(cheapest.price_cents)} from trip` }).waitFor()
  let tracker = page.getByRole('complementary', { name: 'Planning tracker' })
  await tracker.waitFor()
  await tracker.getByRole('listitem').filter({ hasText: cheapest.company }).waitFor()
  assert.equal(await tracker.getByRole('listitem').count(), 1)
  assert.ok((await tracker.innerText()).includes(cheapest.company))

  await page.getByRole('button', { name: `Add fastest journey ${modeLabel(fastest.mode)} ${money(fastest.price_cents)} to trip` }).click()
  await page.getByRole('button', { name: `Remove fastest journey ${modeLabel(fastest.mode)} ${money(fastest.price_cents)} from trip` }).waitFor()
  await page.getByRole('button', { name: `Add lowest fare ${modeLabel(cheapest.mode)} ${money(cheapest.price_cents)} to trip` }).waitFor()
  await tracker.getByRole('listitem').filter({ hasText: fastest.company }).waitFor()
  assert.equal(await tracker.getByRole('listitem').count(), 1)
  assert.ok((await tracker.innerText()).includes(fastest.company))

  const chatBox = await page.locator('.travel-chat').boundingBox()
  const trackerBox = await tracker.boundingBox()
  assert.ok(chatBox && trackerBox && trackerBox.x > chatBox.x, 'desktop tracker is not in the right rail')
  assert.ok(trackerBox.width >= 280 && trackerBox.width <= 320, `unexpected desktop tracker width: ${trackerBox.width}`)
  await page.screenshot({ path: screenshotDiskPaths.desktop, fullPage: true })

  await page.waitForFunction(() => new Promise<boolean>(resolveWait => {
    const request = indexedDB.open('omio-generative-state', 1)
    request.onsuccess = () => {
      const read = request.result.transaction('threads').objectStore('threads').get('travel-proof')
      read.onsuccess = () => resolveWait(read.result?.artifacts?.[0]?.state?.selectedFareIds?.length === 1)
      read.onerror = () => resolveWait(false)
    }
    request.onerror = () => resolveWait(false)
  }))
  await page.reload()
  tracker = page.getByRole('complementary', { name: 'Planning tracker' })
  await tracker.waitFor({ timeout: 60_000 })
  await tracker.getByRole('listitem').filter({ hasText: fastest.company }).waitFor()
  assert.equal(await tracker.getByRole('listitem').count(), 1)
  await page.getByRole('button', { name: `Remove fastest journey ${modeLabel(fastest.mode)} ${money(fastest.price_cents)} from trip` }).waitFor()

  await tracker.getByRole('button', { name: 'Buy', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByText('Congrats, you are set for the trip.', { exact: true }).waitFor()
  await page.screenshot({ path: screenshotDiskPaths.buy, fullPage: false })
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()

  await page.setViewportSize({ width: 390, height: 844 })
  tracker = page.getByRole('complementary', { name: 'Planning tracker' })
  const mobileChat = await page.locator('.travel-chat').boundingBox()
  const mobileTracker = await tracker.boundingBox()
  assert.ok(mobileChat && mobileTracker && mobileTracker.y <= mobileChat.y, 'mobile tracker does not precede the chat')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(overflow <= 1, `mobile layout overflows by ${overflow}px`)
  await page.screenshot({ path: screenshotDiskPaths.mobile, fullPage: true })

  await tracker.getByRole('button', { name: 'Clear all', exact: true }).click()
  await tracker.waitFor({ state: 'detached' })
  assert.equal(chatRequests, 0, 'isolated local proof contacted the chat model')
  assert.deepEqual(pageErrors, [])

  const result = {
    timestamp: new Date().toISOString(),
    status: 'pass',
    sourceVersion,
    route: request,
    cheapest: { id: cheapest.id, company: cheapest.company, mode: cheapest.mode, priceCents: cheapest.price_cents, departure: fareDateTime(cheapest), arrival: fareDateTime(cheapest, cheapest.duration_minutes) },
    fastest: { id: fastest.id, company: fastest.company, mode: fastest.mode, priceCents: fastest.price_cents, departure: fareDateTime(fastest), arrival: fareDateTime(fastest, fastest.duration_minutes) },
    assertions: { chronologicalTranscript: true, internalChromeAbsent: true, rightRail: true, persistedAfterReload: true, demoBuy: true, mobileNoOverflow: true, clearAll: true, modelRequests: chatRequests },
    screenshots: screenshotPaths,
  }
  await writeFile(resolve(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result, null, 2))
} finally {
  await context.close()
  await browser.close()
}
