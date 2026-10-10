import { expect, test, type Page } from '@playwright/test'
import { CATALOG_VERSION, CONTRACT_VERSION } from '../../src/generative/contracts'
import {
  FareItemSchema,
  LookupPinsRequestSchema,
  QueryGroupsRequestSchema,
  type FareItem,
  type FareScope,
  type ProjectionRequest,
  type QueryGroupsRequest,
} from '../../src/generative/contracts/query-groups'

const sourceVersion = 'chat-session-browser-v1'

type SessionFixture = {
  id: string
  title: string
  artifactId: string
  fareId: string
  carrier: string
  origin: string
  destination: string
  date: string
  prompt: string
}

const alpha: SessionFixture = {
  id: 'travel-session-alpha',
  title: 'Alpha rail plan',
  artifactId: 'artifact-alpha',
  fareId: 'fare-alpha',
  carrier: 'Alpha Rail',
  origin: 'london',
  destination: 'paris',
  date: '2026-11-08',
  prompt: 'Keep the Alpha rail itinerary.',
}

const beta: SessionFixture = {
  id: 'travel-session-beta',
  title: 'Beta night plan',
  artifactId: 'artifact-beta',
  fareId: 'fare-beta',
  carrier: 'Beta Night Train',
  origin: 'prague',
  destination: 'vienna',
  date: '2026-11-12',
  prompt: 'Keep the Beta night itinerary.',
}

function scopeFor(item: SessionFixture): FareScope {
  return {
    kind: 'fareScope',
    originId: item.origin,
    destinationId: item.destination,
    dateWindow: { from: item.date, to: item.date },
    passengers: 1,
    earliestDeparture: { date: item.date, minutes: 0 },
  }
}

function resourceKeyForScope(scope: FareScope): string {
  return `scope-${scope.originId}-${scope.destinationId}-${scope.dateWindow.from}-${scope.earliestDeparture.minutes}`
}

function resourceKeyFor(item: SessionFixture): string {
  return resourceKeyForScope(scopeFor(item))
}

function fixtureForScope(scope: FareScope): SessionFixture {
  return scope.originId === alpha.origin ? alpha : beta
}

function label(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function fareRows(item: SessionFixture, count: number, scope: FareScope = scopeFor(item)): FareItem[] {
  return Array.from({ length: count }, (_, index) => {
    const carrierName = index === 0 ? item.carrier : `${item.carrier} ${index + 1}`
    const durationMinutes = 150 + index
    const mode = 'train' as const
    return FareItemSchema.parse({
      id: index === 0 ? item.fareId : `${item.fareId}-${index + 1}`,
      originId: scope.originId,
      destinationId: scope.destinationId,
      serviceDate: scope.dateWindow.from,
      mode,
      carrierId: `${item.id}-rail`,
      carrierName,
      priceCents: (item === alpha ? 4900 : 5900) + index * 100,
      durationMinutes,
      departureMinutes: Math.min(1439, Math.max(540, scope.earliestDeparture.minutes) + index * 60),
      availableSeats: 8,
      currency: 'EUR',
      synthetic: true,
      priceBasis: 'per-passenger-including-demo-fees',
      direct: true,
      legs: [{
        legIndex: 0,
        mode,
        carrierName,
        durationMinutes,
        originId: scope.originId,
        destinationId: scope.destinationId,
        originLabel: label(scope.originId),
        destinationLabel: label(scope.destinationId),
      }],
    })
  })
}

function matchingRows(rows: FareItem[], projection: ProjectionRequest): FareItem[] {
  let matching = rows.filter(row => {
    const { filters } = projection
    const modes = projection.kind === 'modeSummary' && projection.baseline === 'withoutModeFilter' ? [] : filters.modes
    return (!modes.length || modes.includes(row.mode))
      && (!filters.carrierIds.length || filters.carrierIds.includes(row.carrierId))
      && (filters.minPriceCents === undefined || row.priceCents >= filters.minPriceCents)
      && (filters.maxPriceCents === undefined || row.priceCents <= filters.maxPriceCents)
      && (filters.maxDurationMinutes === undefined || row.durationMinutes <= filters.maxDurationMinutes)
      && (!filters.directOnly || row.direct)
  })
  if (projection.kind === 'farePage') {
    if (projection.serviceDate) matching = matching.filter(row => row.serviceDate === projection.serviceDate)
    matching.sort((left, right) => {
      const value = left[projection.sort.field] - right[projection.sort.field]
      return projection.sort.direction === 'asc' ? value : -value
    })
  }
  return matching
}

function projectionResult(projection: ProjectionRequest, rows: FareItem[]) {
  const matching = matchingRows(rows, projection)
  const identity = {
    projectionId: projection.projectionId,
    inputHash: `${projection.projectionId}-input`,
    resultFingerprint: `${projection.projectionId}-result`,
  }
  switch (projection.kind) {
    case 'farePage': {
      const offset = projection.after ? Number.parseInt(projection.after.replace('cursor-', ''), 10) : 0
      const items = matching.slice(offset, offset + projection.limit)
      const hasNextPage = offset + items.length < matching.length
      return {
        ...identity,
        kind: projection.kind,
        items,
        pageInfo: {
          total: matching.length,
          returned: items.length,
          hasNextPage,
          nextCursor: hasNextPage ? `cursor-${offset + items.length}` : null,
        },
      }
    }
    case 'calendarDays':
      return { ...identity, kind: projection.kind, days: [{ date: rows[0]?.serviceDate ?? alpha.date, count: matching.length, representative: matching[0] ?? null }] }
    case 'carrierFacets': {
      const carriers = new Map<string, { carrierName: string | null; count: number }>()
      for (const row of matching) {
        const current = carriers.get(row.carrierId)
        carriers.set(row.carrierId, { carrierName: row.carrierName, count: (current?.count ?? 0) + 1 })
      }
      return { ...identity, kind: projection.kind, options: [...carriers].map(([carrierId, option]) => ({ carrierId, ...option })) }
    }
    case 'modeSummary':
      return {
        ...identity,
        kind: projection.kind,
        baseline: projection.baseline,
        modes: [...new Set(matching.map(row => row.mode))].map(mode => {
          const modeRows = matching.filter(row => row.mode === mode)
          return {
            mode,
            count: modeRows.length,
            minPriceCents: Math.min(...modeRows.map(row => row.priceCents)),
            minDurationMinutes: Math.min(...modeRows.map(row => row.durationMinutes)),
          }
        }),
      }
    case 'fareHighlights':
      return {
        ...identity,
        kind: projection.kind,
        cheapest: [...matching].sort((left, right) => left.priceCents - right.priceCents)[0] ?? null,
        fastest: [...matching].sort((left, right) => left.durationMinutes - right.durationMinutes)[0] ?? null,
      }
  }
}

function queryGroupsResponse(request: QueryGroupsRequest, counts: { alpha?: number; beta?: number } = {}) {
  return {
    version: 1,
    requestId: request.requestId,
    sourceVersion,
    groups: request.groups.map(group => {
      const item = fixtureForScope(group.scope)
      const rows = fareRows(item, item === alpha ? counts.alpha ?? 1 : counts.beta ?? 1, group.scope)
      const resourceKey = resourceKeyForScope(group.scope)
      return {
        groupId: group.groupId,
        manifest: {
          kind: 'fareScopeManifest',
          resourceKey,
          source: { kind: 'search', descriptorId: resourceKey, sourceVersion },
          coverage: group.scope,
          totalAvailable: rows.length,
          availableModes: [...new Set(rows.map(row => row.mode))],
          availableDateWindow: group.scope.dateWindow,
          complete: true,
        },
        projections: group.projections.map(projection => projectionResult(projection, rows)),
      }
    }),
  }
}

function threadRecord(item: SessionFixture) {
  const datasetId = resourceKeyFor(item)
  const scene = {
    $type: 'TravelSurface',
    $key: 'root',
    artifactRef: item.artifactId,
    title: `${item.title} generated itinerary`,
    children: [{
      $type: 'FareCards',
      $key: 'fares',
      artifactRef: item.artifactId,
      datasetRef: datasetId,
      legIndex: 0,
    }],
  }
  return {
    recordRevision: 1,
    schemaVersion: CONTRACT_VERSION,
    catalogVersion: CATALOG_VERSION,
    parserVersion: 'native-present-1',
    queryVersion: '1',
    activeArtifactId: item.artifactId,
    messages: [
      { id: `user-${item.id}`, role: 'user', parts: [{ type: 'text', text: item.prompt }] },
      {
        id: `assistant-${item.id}`,
        role: 'assistant',
        parts: [
          { type: 'text', text: `${item.title} assistant narrative.` },
          { type: 'tool-present', toolCallId: `present-${item.id}`, state: 'output-available', input: scene, output: {} },
        ],
      },
    ],
    artifacts: [{
      source: JSON.stringify(scene),
      state: {
        artifactId: item.artifactId,
        revision: 4,
        runtimeVariables: {},
        datasetRefs: [datasetId],
        filters: { modes: ['train'], carrierIds: [], directOnly: false },
        dates: { start: item.date },
        citySequence: [item.origin, item.destination],
        stays: [],
        modesByLeg: { [`${item.origin}:${item.destination}`]: ['train'] },
        availableModesByLeg: { [`${item.origin}:${item.destination}`]: ['train'] },
        requestedModesByLeg: { [`${item.origin}:${item.destination}`]: ['train'] },
        displayWindowByLeg: { [`${item.origin}:${item.destination}`]: { from: item.date, to: item.date } },
        sort: { field: 'priceCents', direction: 'asc' },
        sortByLeg: {},
        calendarDateByLeg: {},
        selectedFareIds: [item.fareId],
        pending: [],
        lastInteractionAt: '2026-10-07T12:00:00.000Z',
      },
    }],
    descriptors: [{ datasetId, resourceKey: datasetId, scope: scopeFor(item), sourceVersion, complete: true }],
  }
}

async function seedSessions(page: Page, sessionCount = 2): Promise<void> {
  await page.goto('/')
  const now = '2026-10-07T12:00:00.000Z'
  const extraSessions = Array.from({ length: Math.max(0, sessionCount - 2) }, (_, index) => ({
    id: `travel-session-extra-${index}`,
    title: `Archived trip ${index + 1}`,
    createdAt: now,
    updatedAt: `2026-10-07T11:${String(index).padStart(2, '0')}:00.000Z`,
  }))
  const history = {
    version: 1,
    activeSessionId: alpha.id,
    collapsed: false,
    sessions: [
      { id: alpha.id, title: alpha.title, createdAt: now, updatedAt: now },
      { id: beta.id, title: beta.title, createdAt: now, updatedAt: '2026-10-07T12:01:00.000Z' },
      ...extraSessions,
    ],
  }
  const threads: Array<[string, ReturnType<typeof threadRecord>]> = [
    [alpha.id, threadRecord(alpha)],
    [beta.id, threadRecord(beta)],
  ]
  await page.evaluate(async ({ history: seededHistory, threads: seededThreads }) => {
    localStorage.setItem('omio-chat-session-history', JSON.stringify(seededHistory))
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('omio-generative-state', 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('threads')) request.result.createObjectStore('threads')
      }
      request.onerror = () => reject(new Error('Could not open browser session storage'))
      request.onsuccess = () => {
        const transaction = request.result.transaction('threads', 'readwrite')
        const store = transaction.objectStore('threads')
        for (const [key, value] of seededThreads) store.put(value, key)
        transaction.oncomplete = () => {
          request.result.close()
          resolve()
        }
        transaction.onerror = () => reject(new Error('Could not seed browser sessions'))
      }
    })
  }, { history, threads })
}

async function mockFareApi(page: Page, counts: { alpha?: number; beta?: number } = {}): Promise<void> {
  await page.route('**/api/query-groups', async route => {
    const request = QueryGroupsRequestSchema.parse(route.request().postDataJSON())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(queryGroupsResponse(request, counts)),
    })
  })
  await page.route('**/api/lookup', async route => {
    const request = LookupPinsRequestSchema.parse(route.request().postDataJSON())
    const resources = new Map(request.resources.map(resource => [resource.resourceKey, resource.scope]))
    const items = request.pins.flatMap(pin => {
      const scope = resources.get(pin.resourceKey)
      if (!scope || resourceKeyForScope(scope) !== pin.resourceKey) return []
      const item = fixtureForScope(scope)
      const count = item === alpha ? counts.alpha ?? 1 : counts.beta ?? 1
      return fareRows(item, count).filter(row => row.id === pin.fareId)
    })
    const found = new Set(items.map(item => item.id))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: 1,
        requestId: request.requestId,
        sourceVersion: request.sourceVersion,
        items,
        missingPins: request.pins.filter(pin => !found.has(pin.fareId)),
      }),
    })
  })
}

function dataStream(events: unknown[]): string {
  return `${events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('')}data: [DONE]\n\n`
}

async function mockGeneratedPlanner(page: Page): Promise<void> {
  const requestCounts = new Map<string, number>()
  await page.route('**/api/chat', async route => {
    const body: unknown = route.request().postDataJSON()
    const serialized = JSON.stringify(body)
    const item = serialized.includes('Beta UI-created itinerary') ? beta : alpha
    const count = (requestCounts.get(item.id) ?? 0) + 1
    requestCounts.set(item.id, count)
    const artifactId = serialized.match(/"artifactId":"([^"]+)"/)?.[1]
    const datasetId = resourceKeyFor(item)
    let events: unknown[]
    if (count === 1) {
      events = [
        { type: 'start', messageId: `assistant-${item.id}` },
        { type: 'start-step' },
        { type: 'tool-input-start', toolCallId: `create-${item.id}`, toolName: 'create_artifact' },
        { type: 'tool-input-available', toolCallId: `create-${item.id}`, toolName: 'create_artifact', input: {} },
        { type: 'finish-step' },
        { type: 'finish', finishReason: 'tool-calls' },
      ]
    } else if (count === 2) {
      if (!artifactId) throw new Error('Expected the host-created artifact in the continued chat request')
      const input = {
        artifactRef: artifactId,
        expectedRevision: 0,
        commands: [
          { kind: 'route', citySequence: [item.origin, item.destination] },
          { kind: 'dates', dates: { start: item.date } },
        ],
      }
      events = [
        { type: 'start', messageId: `assistant-${item.id}` },
        { type: 'start-step' },
        { type: 'tool-input-start', toolCallId: `edit-${item.id}`, toolName: 'edit_artifact' },
        { type: 'tool-input-available', toolCallId: `edit-${item.id}`, toolName: 'edit_artifact', input },
        { type: 'finish-step' },
        { type: 'finish', finishReason: 'tool-calls' },
      ]
    } else if (count === 3) {
      if (!artifactId) throw new Error('Expected the edited artifact in the continued chat request')
      const input = {
        $type: 'TravelSurface',
        $key: 'root',
        artifactRef: artifactId,
        title: `${item.title} live generated itinerary`,
        children: [
          { $type: 'ModeChips', $key: 'modes', artifactRef: artifactId, datasetRef: datasetId, legIndex: 0 },
          { $type: 'DirectToggle', $key: 'direct', artifactRef: artifactId },
          { $type: 'FareCards', $key: 'fares', artifactRef: artifactId, datasetRef: datasetId, legIndex: 0 },
          { $type: 'CheapestFastest', $key: 'compare', artifactRef: artifactId, datasetRef: datasetId, legIndex: 0 },
          { $type: 'SyntheticTotal', $key: 'total', artifactRef: artifactId },
        ],
      }
      events = [
        { type: 'start', messageId: `assistant-${item.id}` },
        { type: 'start-step' },
        { type: 'text-start', id: `orientation-${item.id}` },
        { type: 'text-delta', id: `orientation-${item.id}`, delta: `Here is a focused comparison for ${item.title}.` },
        { type: 'text-end', id: `orientation-${item.id}` },
        { type: 'tool-input-start', toolCallId: `present-${item.id}`, toolName: 'present' },
        { type: 'tool-input-available', toolCallId: `present-${item.id}`, toolName: 'present', input },
        { type: 'finish-step' },
        { type: 'finish', finishReason: 'tool-calls' },
      ]
    } else {
      events = [
        { type: 'start', messageId: `assistant-${item.id}` },
        { type: 'start-step' },
        { type: 'text-start', id: `final-${item.id}` },
        { type: 'text-delta', id: `final-${item.id}`, delta: `${item.title} is ready.` },
        { type: 'text-end', id: `final-${item.id}` },
        { type: 'finish-step' },
        { type: 'finish', finishReason: 'stop' },
      ]
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'x-vercel-ai-ui-message-stream': 'v1' },
      body: dataStream(events),
    })
  })
}

async function expectSession(page: Page, item: SessionFixture): Promise<void> {
  const chat = page.locator('.travel-chat')
  await expect(chat.getByText(item.prompt, { exact: true })).toBeVisible()
  await expect(chat.getByText(`${item.title} assistant narrative.`, { exact: true })).toBeVisible()
  await expect(chat.getByText(`${item.title} generated itinerary`, { exact: true })).toBeVisible()
  const tracker = page.getByRole('complementary', { name: 'Fare buying tracker' })
  await expect(tracker).toContainText(item.carrier)
  await expect(tracker).toContainText(new RegExp(item.origin, 'i'))
  await expect(tracker).toContainText(new RegExp(item.destination, 'i'))
}

type ShellGeometryExpectation = {
  desktop: boolean
  trackerVisible: boolean
  longHistory?: boolean
  collapsed?: boolean
}

async function expectShellGeometry(page: Page, expectation: ShellGeometryExpectation): Promise<void> {
  const composer = page.locator('.travel-composer')
  if (!expectation.desktop) await composer.scrollIntoViewIfNeeded()
  const metrics = await page.evaluate(shouldScrollHistory => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector)
      if (!(element instanceof HTMLElement)) return null
      const box = element.getBoundingClientRect()
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        documentTop: box.top + scrollY,
        documentBottom: box.bottom + scrollY,
        width: box.width,
        height: box.height,
      }
    }
    const sessionList = document.querySelector('.travel-session-list')
    if (shouldScrollHistory && sessionList instanceof HTMLElement) sessionList.scrollTop = sessionList.scrollHeight
    const sessionListBox = sessionList instanceof HTMLElement ? sessionList.getBoundingClientRect() : null
    const lastSessionBox = sessionList?.lastElementChild instanceof HTMLElement
      ? sessionList.lastElementChild.getBoundingClientRect()
      : null
    return {
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      sidebar: rect('.travel-session-sidebar'),
      tracker: rect('.travel-planning-tracker'),
      chat: rect('.travel-chat'),
      composer: rect('.travel-composer'),
      collapse: rect('.travel-session-collapse'),
      newChat: rect('.travel-session-new'),
      sessionList: sessionList instanceof HTMLElement && sessionListBox ? {
        bottom: sessionListBox.bottom,
        clientHeight: sessionList.clientHeight,
        display: getComputedStyle(sessionList).display,
        lastSessionBottom: lastSessionBox?.bottom ?? null,
        lastSessionTop: lastSessionBox?.top ?? null,
        overflowY: getComputedStyle(sessionList).overflowY,
        scrollTop: sessionList.scrollTop,
        scrollHeight: sessionList.scrollHeight,
        top: sessionListBox.top,
      } : null,
    }
  }, expectation.longHistory ?? false)
  expect(metrics.sidebar).not.toBeNull()
  expect(metrics.chat).not.toBeNull()
  expect(metrics.composer).not.toBeNull()
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport.width)
  expect(metrics.sidebar!.left).toBe(0)
  expect(metrics.sidebar!.right).toBeLessThanOrEqual(metrics.viewport.width)
  expect(metrics.tracker === null).toBe(!expectation.trackerVisible)
  expect(metrics.collapse).not.toBeNull()
  expect(metrics.newChat).not.toBeNull()
  expect(metrics.collapse!.documentBottom).toBeLessThanOrEqual(metrics.newChat!.documentTop)
  if (expectation.desktop) {
    expect(metrics.sidebar!.bottom).toBeLessThanOrEqual(metrics.viewport.height)
    if (expectation.trackerVisible) {
      expect(metrics.sidebar!.right).toBeLessThanOrEqual(metrics.tracker!.left)
      expect(metrics.tracker!.right).toBeLessThanOrEqual(metrics.chat!.left)
      expect(metrics.tracker!.bottom).toBeLessThanOrEqual(metrics.viewport.height)
    } else {
      expect(metrics.sidebar!.right).toBeLessThanOrEqual(metrics.chat!.left)
    }
  } else {
    const afterSidebar = expectation.trackerVisible ? metrics.tracker : metrics.chat
    expect(afterSidebar).not.toBeNull()
    expect(metrics.sidebar!.documentBottom).toBeLessThanOrEqual(afterSidebar!.documentTop)
    if (expectation.trackerVisible) {
      expect(metrics.tracker!.documentBottom).toBeLessThanOrEqual(metrics.chat!.documentTop)
      expect(metrics.tracker!.left).toBeGreaterThanOrEqual(0)
      expect(metrics.tracker!.right).toBeLessThanOrEqual(metrics.viewport.width)
    }
  }
  expect(metrics.chat!.left).toBeGreaterThanOrEqual(0)
  expect(metrics.chat!.right).toBeLessThanOrEqual(metrics.viewport.width)
  expect(metrics.chat!.width).toBeGreaterThan(250)
  expect(metrics.composer!.left).toBeGreaterThanOrEqual(metrics.chat!.left)
  expect(metrics.composer!.right).toBeLessThanOrEqual(metrics.chat!.right)
  expect(metrics.composer!.bottom).toBeLessThanOrEqual(metrics.viewport.height)
  expect(metrics.sessionList).not.toBeNull()
  if (!expectation.desktop && expectation.collapsed) {
    expect(metrics.sessionList!.display).toBe('none')
  } else {
    expect(metrics.sessionList!.bottom).toBeLessThanOrEqual(metrics.sidebar!.bottom)
  }
  if (expectation.longHistory) {
    expect(metrics.sessionList!.clientHeight).toBeLessThan(metrics.sessionList!.scrollHeight)
    expect(metrics.sessionList!.overflowY).toMatch(/auto|scroll/)
    expect(metrics.sessionList!.scrollTop).toBeGreaterThan(0)
    expect(metrics.sessionList!.lastSessionTop).toBeGreaterThanOrEqual(metrics.sessionList!.top)
    expect(metrics.sessionList!.lastSessionBottom).toBeLessThanOrEqual(metrics.sessionList!.bottom)
  }
}

const responsiveShellViewports = [
  { label: 'narrow phone portrait', width: 320, height: 568 },
  { label: 'phone portrait', width: 360, height: 800 },
  { label: 'short high-density phone portrait', width: 390, height: 568 },
  { label: 'high-density phone portrait', width: 390, height: 844 },
  { label: 'large phone portrait', width: 430, height: 932 },
  { label: 'last compact-nav width', width: 480, height: 720 },
  { label: 'first regular-nav width', width: 481, height: 720 },
  { label: 'short phone landscape', width: 667, height: 375 },
  { label: 'tablet portrait', width: 768, height: 1024 },
  { label: 'tablet below desktop breakpoint', width: 899, height: 720 },
  { label: 'tablet at desktop breakpoint', width: 900, height: 480 },
  { label: 'narrow desktop above breakpoint', width: 901, height: 720 },
  { label: 'compact desktop', width: 960, height: 540 },
  { label: 'short small desktop', width: 1024, height: 600 },
  { label: 'small desktop', width: 1024, height: 720 },
  { label: 'very short desktop', width: 1280, height: 480 },
  { label: 'short desktop', width: 1280, height: 720 },
  { label: 'standard desktop', width: 1440, height: 900 },
  { label: 'full HD desktop', width: 1920, height: 1080 },
  { label: 'wide desktop', width: 2544, height: 1395 },
] as const

for (const viewport of responsiveShellViewports) test(`responsive shell stays usable at ${viewport.label} (${viewport.width}x${viewport.height})`, async ({ page }) => {
  const desktop = viewport.width >= 901
  await page.setViewportSize(viewport)
  await page.goto('/generative')
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toHaveCount(0)
  await expectShellGeometry(page, { desktop, trackerVisible: false })
  await page.getByRole('button', { name: 'Collapse session sidebar' }).click()
  await expectShellGeometry(page, { desktop, trackerVisible: false, collapsed: true })

  await mockFareApi(page)
  await seedSessions(page, 40)
  await page.goto('/generative')
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText(alpha.carrier)
  await expectShellGeometry(page, { desktop, trackerVisible: true, longHistory: true })
  await page.getByRole('button', { name: 'Collapse session sidebar' }).click()
  await expectShellGeometry(page, { desktop, trackerVisible: true, longHistory: desktop, collapsed: true })
})

test('a selected chat survives a desktop-mobile-desktop resize round trip', async ({ page }) => {
  await mockFareApi(page)
  await seedSessions(page, 40)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/generative')
  const composer = page.getByRole('textbox', { name: 'Message' })
  const draft = 'Keep this draft while the viewport changes.'
  await composer.fill(draft)
  await expect(page.getByText(`${alpha.title} generated itinerary`, { exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText(alpha.carrier)
  await expectShellGeometry(page, { desktop: true, trackerVisible: true, longHistory: true })

  await page.setViewportSize({ width: 667, height: 375 })
  await expectShellGeometry(page, { desktop: false, trackerVisible: true, longHistory: true })
  await expect(composer).toHaveValue(draft)
  await expect(page.getByText(`${alpha.title} generated itinerary`, { exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText(alpha.carrier)

  await page.setViewportSize({ width: 1440, height: 900 })
  await expectShellGeometry(page, { desktop: true, trackerVisible: true, longHistory: true })
  await expect(composer).toHaveValue(draft)
  await expect(page.getByText(`${alpha.title} generated itinerary`, { exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText(alpha.carrier)
})

test.describe('mobile touch shell', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true })

  for (const viewport of [
    { label: 'portrait', width: 390, height: 844 },
    { label: 'short landscape', width: 667, height: 375 },
  ]) test(`keeps sessions, composer, fare controls, and checkout reachable in ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await mockFareApi(page)
    await seedSessions(page, 40)
    await page.goto('/generative')

    await page.getByRole('button', { name: beta.title }).tap()
    await expect(page.getByText(`${beta.title} generated itinerary`, { exact: true })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText(beta.carrier)
    await page.getByRole('button', { name: alpha.prompt }).tap()
    await expect(page.getByText(`${alpha.title} generated itinerary`, { exact: true })).toBeVisible()

    const composer = page.getByRole('textbox', { name: 'Message' })
    await composer.scrollIntoViewIfNeeded()
    await composer.tap()
    await composer.fill('Mobile touch draft')
    await expect(composer).toHaveValue('Mobile touch draft')

    const tracker = page.getByRole('complementary', { name: 'Fare buying tracker' })
    await tracker.scrollIntoViewIfNeeded()
    await tracker.getByRole('button', { name: 'Buy' }).tap()
    await expect(page.getByRole('dialog')).toContainText('Congrats, you are set for the trip.')
    await page.getByRole('button', { name: 'Close' }).tap()

    const selectFare = page.getByRole('button', { name: /^Select train Alpha Rail /i }).first()
    await tracker.getByRole('button', { name: /^Cancel / }).tap()
    await expect(tracker).toHaveCount(0)
    await selectFare.scrollIntoViewIfNeeded()
    await selectFare.tap()
    await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText(alpha.carrier)
    await page.getByRole('button', { name: 'Clear all' }).tap()
    await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toHaveCount(0)
    await selectFare.tap()
    await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText(alpha.carrier)

    await page.getByRole('button', { name: 'Collapse session sidebar' }).tap()
    await expect(page.getByRole('navigation', { name: 'Previous chats' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Start new chat' })).toBeVisible()
    await page.getByRole('button', { name: 'Expand session sidebar' }).tap()
    await expect(page.getByRole('button', { name: beta.prompt })).toBeVisible()
    await expectShellGeometry(page, { desktop: false, trackerVisible: true, longHistory: true })
  })
})

test('landing keyboard controls submit or open a fresh empty chat deliberately', async ({ page }) => {
  const requests: unknown[] = []
  await page.route('**/api/chat', async route => {
    requests.push(route.request().postDataJSON())
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: [DONE]\n\n' })
  })
  await page.setViewportSize({ width: 360, height: 900 })
  await page.goto('/')
  await page.getByRole('tab', { name: 'Smart planner' }).click()
  const prompt = page.getByRole('textbox', { name: 'Describe your trip' })
  const box = await prompt.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(100)
  const plan = page.getByRole('button', { name: 'Plan my trip' })
  const empty = page.getByRole('button', { name: 'Go to chat' })
  expect((await plan.boundingBox())?.y).toBeLessThan((await empty.boundingBox())?.y ?? 0)
  await prompt.fill('First line')
  await prompt.press('Enter')
  await prompt.type('Second line')
  await expect(prompt).toHaveValue('First line\nSecond line')
  expect(requests).toHaveLength(0)
  await prompt.press('Shift+Enter')
  await expect(page.locator('.travel-chat').getByText('First line\nSecond line', { exact: true })).toBeVisible()
  await expect.poll(() => requests.length).toBe(1)

  await page.goto('/')
  await page.getByRole('tab', { name: 'Smart planner' }).click()
  await page.getByRole('button', { name: 'Go to chat' }).click()
  await expect(page.getByRole('region', { name: 'Travel planning welcome' })).toBeVisible()
  await expect(page.locator('.travel-chat').getByText('First line\nSecond line', { exact: true })).toHaveCount(0)
  expect(requests).toHaveLength(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('two sessions restore their own generated layout and selected fare across switching and reload', async ({ page }) => {
  await mockFareApi(page)
  await seedSessions(page)
  await page.goto('/generative')
  await expect(page.getByRole('complementary', { name: 'Chat sessions' })).toBeVisible()
  await expectSession(page, alpha)

  await page.getByRole('button', { name: beta.title }).click()
  await expectSession(page, beta)
  await expect(page.locator('.travel-chat').getByText(alpha.prompt, { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: beta.title })).toHaveAttribute('aria-current', 'page')

  await page.reload()
  await expectSession(page, beta)
  await page.getByRole('button', { name: alpha.prompt }).click()
  await expectSession(page, alpha)
  await expect(page.locator('.travel-chat').getByText(beta.prompt, { exact: true })).toHaveCount(0)
})

for (const width of [360, 1280]) test(`fare lists show seven complete rows without overflow at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await mockFareApi(page, { alpha: 8, beta: 7 })
  await seedSessions(page)
  await page.goto('/generative')

  const list = page.getByRole('region', { name: 'Fare options' })
  const rows = list.getByRole('article')
  await expect(rows).toHaveCount(7)
  await expect(list).toHaveAttribute('data-scrollable', 'false')
  expect(await list.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  await page.getByLabel('Fare result pages').getByRole('button', { name: 'Next' }).click()
  await expect(rows).toHaveCount(1)
  const eighth = rows.first()
  await expect(eighth).toContainText('Alpha Rail 8')
  await eighth.getByRole('button').click()
  await expect(eighth.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText('Alpha Rail 8')

  await page.getByRole('button', { name: beta.title }).click()
  const shortList = page.getByRole('region', { name: 'Fare options' })
  await expect(shortList.getByRole('article')).toHaveCount(7)
  await expect(shortList).toHaveAttribute('data-scrollable', 'false')
  expect(await shortList.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true)
})

test('UI-created sessions save generated cards, filters, and selected fares before switching and reload', async ({ page }) => {
  await mockFareApi(page)
  await mockGeneratedPlanner(page)
  await page.goto('/')
  await page.getByRole('tab', { name: 'Smart planner' }).click()
  await page.getByRole('button', { name: 'Go to chat' }).click()

  const composer = page.getByRole('textbox', { name: 'Message' })
  await composer.fill('Alpha UI-created itinerary')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText(`${alpha.title} is ready.`, { exact: true })).toBeVisible()
  await expect(page.getByText(`${alpha.title} live generated itinerary`, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^Select / }).first().click()
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText(alpha.carrier)
  const alphaDirectOnly = page.getByRole('checkbox', { name: 'Direct connections only' })
  await alphaDirectOnly.check()
  await expect(alphaDirectOnly).toBeChecked()
  await composer.fill('Alpha unsent draft')

  await page.getByRole('button', { name: 'Start new chat' }).click()
  await expect(page.getByRole('region', { name: 'Travel planning welcome' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Message' }).fill('Beta UI-created itinerary')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText(`${beta.title} is ready.`, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^Select / }).first().click()
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText(beta.carrier)

  await page.getByRole('button', { name: 'Alpha UI-created itinerary' }).click()
  await expect(page.getByText(`${alpha.title} is ready.`, { exact: true })).toBeVisible()
  await expect(page.getByText(`${alpha.title} live generated itinerary`, { exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText(alpha.carrier)
  await expect(page.getByRole('checkbox', { name: 'Direct connections only' })).toBeChecked()
  await expect(page.getByRole('textbox', { name: 'Message' })).toHaveValue('Alpha unsent draft')
  await expect(page.getByText(`${beta.title} is ready.`, { exact: true })).toHaveCount(0)

  await page.reload()
  await expect(page.getByText(`${alpha.title} is ready.`, { exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toContainText(alpha.carrier)
  await expect(page.getByRole('checkbox', { name: 'Direct connections only' })).toBeChecked()
  await expect(page.getByRole('textbox', { name: 'Message' })).toHaveValue('Alpha unsent draft')
})

test('New chat snapshots an in-flight user turn and isolates a late response', async ({ page }) => {
  let intercepted = false
  let releaseRequest: (() => void) | undefined
  const held = new Promise<void>(resolve => { releaseRequest = resolve })
  await page.route('**/api/chat', async route => {
    intercepted = true
    await held
    try {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'x-vercel-ai-ui-message-stream': 'v1' },
        body: dataStream([
          { type: 'start', messageId: 'late-assistant' },
          { type: 'start-step' },
          { type: 'text-start', id: 'late-text' },
          { type: 'text-delta', id: 'late-text', delta: 'LATE RESPONSE MUST STAY OLD' },
          { type: 'text-end', id: 'late-text' },
          { type: 'finish-step' },
          { type: 'finish', finishReason: 'stop' },
        ]),
      })
    } catch {
      // The session switch is expected to abort the route before it can fulfill.
    }
  })
  await page.goto('/')
  await page.getByRole('tab', { name: 'Smart planner' }).click()
  await page.getByRole('button', { name: 'Go to chat' }).click()
  const inflightPrompt = 'Keep this in-flight request in its original session.'
  await page.getByRole('textbox', { name: 'Message' }).fill(inflightPrompt)
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect.poll(() => intercepted).toBe(true)

  await page.reload()
  await expect(page.locator('.travel-chat').getByText(inflightPrompt, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stop response' })).toBeDisabled()

  await page.getByRole('button', { name: 'Start new chat' }).click()
  await expect(page.getByRole('region', { name: 'Travel planning welcome' })).toBeVisible()
  await expect(page.locator('.travel-chat').getByText(inflightPrompt, { exact: true })).toHaveCount(0)
  releaseRequest?.()
  await page.waitForTimeout(100)
  await expect(page.getByText('LATE RESPONSE MUST STAY OLD', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: inflightPrompt }).click()
  await expect(page.locator('.travel-chat').getByText(inflightPrompt, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stop response' })).toBeDisabled()
  await page.reload()
  await expect(page.locator('.travel-chat').getByText(inflightPrompt, { exact: true })).toBeVisible()
  await expect(page.locator('.travel-chat').getByText('LATE RESPONSE MUST STAY OLD', { exact: true })).toHaveCount(0)
})

test('an unsent composer draft survives direct reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Smart planner' }).click()
  await page.getByRole('button', { name: 'Go to chat' }).click()
  const draft = 'Keep this unsent draft through reload.'
  await page.getByRole('textbox', { name: 'Message' }).fill(draft)
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Message' })).toHaveValue(draft)
})

test('a sent draft stays in chat and does not reappear in the composer after reload', async ({ page }) => {
  await page.route('**/api/chat', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'x-vercel-ai-ui-message-stream': 'v1' },
      body: dataStream([
        { type: 'start', messageId: 'draft-finished-assistant' },
        { type: 'start-step' },
        { type: 'text-start', id: 'draft-finished-text' },
        { type: 'text-delta', id: 'draft-finished-text', delta: 'Draft request finished.' },
        { type: 'text-end', id: 'draft-finished-text' },
        { type: 'finish-step' },
        { type: 'finish', finishReason: 'stop' },
      ]),
    })
  })
  await page.goto('/')
  await page.getByRole('tab', { name: 'Smart planner' }).click()
  await page.getByRole('button', { name: 'Go to chat' }).click()
  const prompt = 'Send this draft exactly once.'
  await page.getByRole('textbox', { name: 'Message' }).fill(prompt)
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Draft request finished.', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Message' })).toHaveValue('')
  await page.reload()
  await expect(page.locator('.travel-chat').getByText(prompt, { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Message' })).toHaveValue('')
})

test('New chat cancels a held local fare load before waiting for session actions', async ({ page }) => {
  let searchStarted = false
  let releaseSearch: (() => void) | undefined
  const heldSearch = new Promise<void>(resolve => { releaseSearch = resolve })
  await page.route('**/api/query-groups', async route => {
    searchStarted = true
    await heldSearch
    try {
      const request = QueryGroupsRequestSchema.parse(route.request().postDataJSON())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(queryGroupsResponse(request)),
      })
    } catch {
      // Canceling the owning session may abort the intercepted search first.
    }
  })
  let chatRequestCount = 0
  await page.route('**/api/chat', async route => {
    const serialized = JSON.stringify(route.request().postDataJSON())
    chatRequestCount += 1
    if (chatRequestCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'x-vercel-ai-ui-message-stream': 'v1' },
        body: dataStream([
          { type: 'start', messageId: 'held-create-assistant' },
          { type: 'start-step' },
          { type: 'tool-input-start', toolCallId: 'held-create', toolName: 'create_artifact' },
          { type: 'tool-input-available', toolCallId: 'held-create', toolName: 'create_artifact', input: {} },
          { type: 'finish-step' },
          { type: 'finish', finishReason: 'tool-calls' },
        ]),
      })
      return
    }
    const artifactId = serialized.match(/"artifactId":"([^"]+)"/)?.[1]
    if (!artifactId) throw new Error('Expected the host-created artifact in the continued chat request')
    const input = {
      artifactRef: artifactId,
      expectedRevision: 0,
      commands: [
        { kind: 'route', citySequence: [alpha.origin, alpha.destination] },
        { kind: 'dates', dates: { start: alpha.date } },
      ],
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'x-vercel-ai-ui-message-stream': 'v1' },
      body: dataStream([
        { type: 'start', messageId: 'held-search-assistant' },
        { type: 'start-step' },
        { type: 'tool-input-start', toolCallId: 'held-edit', toolName: 'edit_artifact' },
        { type: 'tool-input-available', toolCallId: 'held-edit', toolName: 'edit_artifact', input },
        { type: 'finish-step' },
        { type: 'finish', finishReason: 'tool-calls' },
      ]),
    })
  })
  await page.goto('/')
  await page.getByRole('tab', { name: 'Smart planner' }).click()
  await page.getByRole('button', { name: 'Go to chat' }).click()
  const prompt = 'Start a fare load that this session owns.'
  await page.getByRole('textbox', { name: 'Message' }).fill(prompt)
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect.poll(() => searchStarted).toBe(true)

  await page.getByRole('button', { name: 'Start new chat' }).click()
  await expect(page.getByRole('region', { name: 'Travel planning welcome' })).toBeVisible({ timeout: 3_000 })
  releaseSearch?.()
  await page.waitForTimeout(100)
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toHaveCount(0)
  await expect(page.locator('.travel-chat').getByText(prompt, { exact: true })).toHaveCount(0)
})

for (const width of [360, 1280]) test(`session sidebar stays usable when collapsed at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await mockFareApi(page)
  await seedSessions(page)
  await page.goto('/generative')
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toBeVisible()
  const collapse = page.getByRole('button', { name: 'Collapse session sidebar' })
  const newChat = page.getByRole('button', { name: 'Start new chat' })
  const expectCollapseAboveNewChat = async (collapseButton: typeof collapse) => {
    const [collapseBox, newChatBox] = await Promise.all([collapseButton.boundingBox(), newChat.boundingBox()])
    if (!collapseBox || !newChatBox) throw new Error('Sidebar controls must have measurable layout boxes')
    expect(collapseBox.y + collapseBox.height).toBeLessThanOrEqual(newChatBox.y)
  }
  await expect(collapse).toHaveAttribute('aria-expanded', 'true')
  await expectCollapseAboveNewChat(collapse)
  await collapse.click()
  const expand = page.getByRole('button', { name: 'Expand session sidebar' })
  await expect(expand).toHaveAttribute('aria-expanded', 'false')
  await expect(newChat).toBeVisible()
  await expectCollapseAboveNewChat(expand)
  await expect(page.getByRole('complementary', { name: 'Fare buying tracker' })).toBeVisible()
  await newChat.focus()
  await expect(newChat).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
