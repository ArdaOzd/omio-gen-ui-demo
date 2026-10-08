import { expect, test, type Page } from '@playwright/test'
import { CATALOG_VERSION, CONTRACT_VERSION, type CoverageRequest } from '../../src/generative/contracts'
import { coverageKey, stableRef } from '../../src/generative/data/resource-loader'

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

function requestFor(item: SessionFixture): CoverageRequest {
  return {
    originIds: [item.origin],
    destinationIds: [item.destination],
    dateWindow: { from: item.date, to: item.date },
    modes: ['train'],
    passengers: 1,
  }
}

function datasetIdFor(item: SessionFixture): string {
  return `dataset-${stableRef(coverageKey(requestFor(item)))}`
}

function threadRecord(item: SessionFixture) {
  const datasetId = datasetIdFor(item)
  const scene = {
    $type: 'TravelSurface',
    artifactRef: item.artifactId,
    title: `${item.title} generated itinerary`,
    children: [{
      $type: 'FareCards',
      artifactRef: item.artifactId,
      datasetRef: datasetId,
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
    descriptors: [{ datasetId, request: requestFor(item), sourceVersion, complete: true }],
  }
}

async function seedSessions(page: Page): Promise<void> {
  await page.goto('/')
  const now = '2026-10-07T12:00:00.000Z'
  const history = {
    version: 1,
    activeSessionId: alpha.id,
    collapsed: false,
    sessions: [
      { id: alpha.id, title: alpha.title, createdAt: now, updatedAt: now },
      { id: beta.id, title: beta.title, createdAt: now, updatedAt: '2026-10-07T12:01:00.000Z' },
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

async function mockFareSearch(page: Page, counts: { alpha?: number; beta?: number } = {}): Promise<void> {
  await page.route('**/api/search?**', async route => {
    const url = new URL(route.request().url())
    const origin = url.searchParams.get('origin')
    const item = origin === alpha.origin ? alpha : beta
    const count = item === alpha ? counts.alpha ?? 1 : counts.beta ?? 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        source_version: sourceVersion,
        outbound: {
          date: item.date,
          page: 1,
          pages: 1,
          total: count,
          results: Array.from({ length: count }, (_, index) => ({
            id: index === 0 ? item.fareId : `${item.fareId}-${index + 1}`,
            mode: 'train',
            company: index === 0 ? item.carrier : `${item.carrier} ${index + 1}`,
            departure_time: `${item.date}T${String(9 + index).padStart(2, '0')}:00:00`,
            duration_minutes: 150 + index,
            origin: { id: item.origin },
            destination: { id: item.destination },
            price_cents: (item === alpha ? 4900 : 5900) + index * 100,
            currency: 'EUR',
            available_seats: 8,
          })),
        },
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
    const artifactMatch = serialized.match(/"activeArtifactId":"([^"]+)"/)
    const artifactId = artifactMatch?.[1] ?? item.artifactId
    const datasetId = datasetIdFor(item)
    let events: unknown[]
    if (count === 1) {
      const input = { coverage: requestFor(item), artifactRef: artifactId }
      events = [
        { type: 'start', messageId: `assistant-${item.id}` },
        { type: 'start-step' },
        { type: 'tool-input-start', toolCallId: `load-${item.id}`, toolName: 'load_fares' },
        { type: 'tool-input-available', toolCallId: `load-${item.id}`, toolName: 'load_fares', input },
        { type: 'finish-step' },
        { type: 'finish', finishReason: 'tool-calls' },
      ]
    } else if (count === 2) {
      const input = {
        $type: 'TravelSurface',
        artifactRef: artifactId,
        title: `${item.title} live generated itinerary`,
        children: [
          { $type: 'ModeChips', artifactRef: artifactId, datasetRef: datasetId },
          { $type: 'FareCards', artifactRef: artifactId, datasetRef: datasetId },
          { $type: 'SyntheticTotal', artifactRef: artifactId, datasetRef: datasetId },
        ],
      }
      events = [
        { type: 'start', messageId: `assistant-${item.id}` },
        { type: 'start-step' },
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
  const tracker = page.getByRole('complementary', { name: 'Planning tracker' })
  await expect(tracker).toContainText(item.carrier)
  await expect(tracker).toContainText(new RegExp(item.origin, 'i'))
  await expect(tracker).toContainText(new RegExp(item.destination, 'i'))
}

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
  await mockFareSearch(page)
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

for (const width of [360, 1280]) test(`fare lists show seven complete rows before scrolling at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await mockFareSearch(page, { alpha: 8, beta: 7 })
  await seedSessions(page)
  await page.goto('/generative')

  const list = page.getByRole('region', { name: 'Fare options' })
  const rows = list.getByRole('article')
  await expect(rows).toHaveCount(8)
  await expect(list).toHaveAttribute('data-scrollable', 'true')
  const overflow = await list.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    const rowBounds = Array.from(element.children, child => child.getBoundingClientRect())
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      seventhBottom: rowBounds[6]?.bottom,
      eighthTop: rowBounds[7]?.top,
      viewportBottom: bounds.bottom,
    }
  })
  expect(overflow.scrollHeight).toBeGreaterThan(overflow.clientHeight)
  expect(Math.abs((overflow.seventhBottom ?? 0) - overflow.viewportBottom)).toBeLessThanOrEqual(1)
  expect(overflow.eighthTop).toBeGreaterThan(overflow.viewportBottom)

  const eighth = rows.nth(7)
  await eighth.getByRole('button').click()
  await expect(eighth.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('complementary', { name: 'Planning tracker' })).toContainText('Alpha Rail 8')

  await page.getByRole('button', { name: beta.title }).click()
  const shortList = page.getByRole('region', { name: 'Fare options' })
  await expect(shortList.getByRole('article')).toHaveCount(7)
  await expect(shortList).toHaveAttribute('data-scrollable', 'false')
  expect(await shortList.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true)
})

test('UI-created sessions save generated cards, filters, and selected fares before switching and reload', async ({ page }) => {
  await mockFareSearch(page)
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
  await expect(page.getByRole('complementary', { name: 'Planning tracker' })).toContainText(alpha.carrier)
  const alphaTrain = page.getByRole('button', { name: 'Train', exact: true })
  await alphaTrain.click()
  await expect(alphaTrain).toHaveAttribute('aria-pressed', 'false')
  await composer.fill('Alpha unsent draft')

  await page.getByRole('button', { name: 'Start new chat' }).click()
  await expect(page.getByRole('region', { name: 'Travel planning welcome' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Message' }).fill('Beta UI-created itinerary')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText(`${beta.title} is ready.`, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^Select / }).first().click()
  await expect(page.getByRole('complementary', { name: 'Planning tracker' })).toContainText(beta.carrier)

  await page.getByRole('button', { name: 'Alpha UI-created itinerary' }).click()
  await expect(page.getByText(`${alpha.title} is ready.`, { exact: true })).toBeVisible()
  await expect(page.getByText(`${alpha.title} live generated itinerary`, { exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Planning tracker' })).toContainText(alpha.carrier)
  await expect(page.getByRole('button', { name: 'Train', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('textbox', { name: 'Message' })).toHaveValue('Alpha unsent draft')
  await expect(page.getByText(`${beta.title} is ready.`, { exact: true })).toHaveCount(0)

  await page.reload()
  await expect(page.getByText(`${alpha.title} is ready.`, { exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Planning tracker' })).toContainText(alpha.carrier)
  await expect(page.getByRole('button', { name: 'Train', exact: true })).toHaveAttribute('aria-pressed', 'false')
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
  await page.route('**/api/search?**', async route => {
    searchStarted = true
    await heldSearch
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          source_version: sourceVersion,
          outbound: {
            date: alpha.date,
            page: 1,
            pages: 1,
            total: 1,
            results: [{
              id: alpha.fareId,
              mode: 'train',
              company: alpha.carrier,
              departure_time: `${alpha.date}T09:00:00`,
              duration_minutes: 150,
              origin: { id: alpha.origin },
              destination: { id: alpha.destination },
              price_cents: 4900,
              currency: 'EUR',
              available_seats: 8,
            }],
          },
        }),
      })
    } catch {
      // Canceling the owning session may abort the intercepted search first.
    }
  })
  await page.route('**/api/chat', async route => {
    const serialized = JSON.stringify(route.request().postDataJSON())
    const artifactId = serialized.match(/"activeArtifactId":"([^"]+)"/)?.[1] ?? alpha.artifactId
    const input = { coverage: requestFor(alpha), artifactRef: artifactId }
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'x-vercel-ai-ui-message-stream': 'v1' },
      body: dataStream([
        { type: 'start', messageId: 'held-search-assistant' },
        { type: 'start-step' },
        { type: 'tool-input-start', toolCallId: 'held-load', toolName: 'load_fares' },
        { type: 'tool-input-available', toolCallId: 'held-load', toolName: 'load_fares', input },
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
  await expect(page.getByRole('complementary', { name: 'Planning tracker' })).toHaveCount(0)
  await expect(page.locator('.travel-chat').getByText(prompt, { exact: true })).toHaveCount(0)
})

for (const width of [360, 1280]) test(`session sidebar stays usable when collapsed at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await mockFareSearch(page)
  await seedSessions(page)
  await page.goto('/generative')
  await expect(page.getByRole('complementary', { name: 'Planning tracker' })).toBeVisible()
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
  await expect(page.getByRole('complementary', { name: 'Planning tracker' })).toBeVisible()
  await newChat.focus()
  await expect(newChat).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
