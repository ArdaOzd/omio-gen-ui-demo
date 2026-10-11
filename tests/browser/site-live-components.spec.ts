import { expect, test, type Locator, type Page } from '@playwright/test'

const scenarioKeys = [
  'price-versus-time',
  'manual-leg-editor',
  'multi-city-workspace',
  'date-strip-price-calendar',
  'mode-dashboard',
  'budget-shortlist',
  'fare-cards-controls',
  'story-layouts',
  'flexible-calendar',
  'weekly-fare-browser',
] as const

const requestedFirstFour = scenarioKeys.slice(0, 4)

function scenario(page: Page, key: (typeof scenarioKeys)[number]): Locator {
  return page.locator(`.composition-live[data-showcase-case="${key}"]`)
}

async function openScenario(page: Page, key: (typeof scenarioKeys)[number]): Promise<Locator> {
  const mount = scenario(page, key)
  const chapter = mount.locator('xpath=ancestor::details[1]')
  if (!(await chapter.evaluate((element: HTMLDetailsElement) => element.open))) {
    await chapter.locator(':scope > summary').click()
  }
  await expect(mount.locator('.composition-loading')).toHaveCount(0, { timeout: 45_000 })
  await expect(mount.locator('.composition-error')).toHaveCount(0)
  await expect(mount.locator(':scope > .showcase-runtime > .travel-travelsurface')).toHaveCount(1, { timeout: 45_000 })
  await expect(mount.locator('.travel-skeleton, .trip-calendar-skeleton')).toHaveCount(0, { timeout: 45_000 })
  return mount
}

async function toggleFirstFare(root: Locator): Promise<void> {
  const button = root
    .locator('button[aria-pressed]')
    .filter({ hasText: /^(Add|Added|Remove|Select|Selected|Choose)/ })
    .first()
  await expect(button).toBeVisible()
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'false')
}

async function assertNoHorizontalOverflow(page: Page, root: Locator): Promise<void> {
  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(pageOverflow).toBeLessThanOrEqual(1)

  const box = await root.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(-1)
  expect(box!.x + box!.width).toBeLessThanOrEqual((await page.evaluate(() => window.innerWidth)) + 1)
}

test('all ten audited compositions are live, interactive, bounded, and responsive', async ({ page }) => {
  test.setTimeout(240_000)

  const runtimeErrors: string[] = []
  const failedRequests: string[] = []
  const apiRequests: string[] = []
  const unexpectedLoopbackRequests: string[] = []
  page.on('pageerror', error => runtimeErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`))
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/')) apiRequests.push(request.url())
    if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && url.origin !== 'http://127.0.0.1:4174') {
      unexpectedLoopbackRequests.push(request.url())
    }
  })

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('./', { waitUntil: 'domcontentloaded' })

  const mounts = page.locator('.composition-live[data-showcase-case]')
  await expect(mounts).toHaveCount(10)
  expect(await mounts.evaluateAll(elements => elements.map(element => element.getAttribute('data-showcase-case')))).toEqual(scenarioKeys)
  expect((await mounts.evaluateAll(elements => elements.slice(0, 4).map(element => element.getAttribute('data-showcase-case'))))).toEqual(requestedFirstFour)
  await expect(mounts.locator('img')).toHaveCount(0)

  const roots = new Map<(typeof scenarioKeys)[number], Locator>()
  for (const key of scenarioKeys) roots.set(key, await openScenario(page, key))

  for (const key of scenarioKeys) {
    const root = roots.get(key)!
    await expect(root.locator(':scope > .showcase-runtime > .travel-travelsurface')).toHaveCount(1)
    await expect(root.locator('button, input, select, table').first()).toBeVisible()
    await assertNoHorizontalOverflow(page, root)
  }

  const price = roots.get('price-versus-time')!
  // Later SVG points are painted above earlier overlapping points and own the mouse hit target.
  const plotPoint = price.getByRole('button', { name: /^View / }).last()
  await plotPoint.hover()
  await expect(price.getByRole('status').filter({ hasText: /€.*\d+h|€.*\d+m/ })).toBeVisible()
  await plotPoint.click()
  const plotDialog = price.getByRole('dialog', { name: /fare details$/ })
  await expect(plotDialog).toBeVisible()
  const dotBox = await plotPoint.locator('circle.travel-dot').boundingBox()
  const stemBox = await price.locator('.travel-plot-stem').boundingBox()
  const dialogBox = await plotDialog.boundingBox()
  expect(dotBox).not.toBeNull()
  expect(stemBox).not.toBeNull()
  expect(dialogBox).not.toBeNull()
  expect(Math.abs((dotBox!.x + dotBox!.width / 2) - (stemBox!.x + stemBox!.width / 2))).toBeLessThanOrEqual(3)
  expect(stemBox!.x).toBeGreaterThanOrEqual(dialogBox!.x - 1)
  expect(stemBox!.x).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width + 1)
  const plotSelection = plotDialog.locator('button[aria-pressed]')
  await plotSelection.click()
  await expect(plotSelection).toHaveAttribute('aria-pressed', 'true')
  await plotSelection.click()
  await expect(plotSelection).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('Escape')
  const initialPriceRows = await price.getByRole('table', { name: 'Compare fares' }).locator('tbody tr').allTextContents()
  expect(initialPriceRows.length).toBeGreaterThan(0)
  expect(initialPriceRows.every(row => row.includes('2026-12-08'))).toBe(true)

  const manual = roots.get('manual-leg-editor')!
  const manualDate = manual.locator('input[type="date"]').first()
  await expect(manualDate).toHaveAttribute('min', '2026-12-01')
  await expect(manualDate).toHaveAttribute('max', '2026-12-08')
  // Moving the whole dated itinerary past 15 Dec is rejected; an in-range shift applies.
  await manualDate.fill('2026-12-09')
  await expect(manualDate).toHaveValue('2026-12-08')
  await manualDate.fill('2026-12-07')
  await expect(manualDate).toHaveValue('2026-12-07')
  const parisStay = manual.getByRole('slider', { name: 'Stay in Paris' }).first()
  const stayMaximum = Number(await parisStay.getAttribute('max'))
  expect(stayMaximum).toBeGreaterThanOrEqual(0)
  expect(stayMaximum).toBeLessThanOrEqual(6)
  await parisStay.fill(String(Math.min(3, stayMaximum)))
  await manual.getByRole('button', { name: 'Fastest', exact: true }).first().click()
  await expect(manual.getByRole('button', { name: 'Fastest', exact: true }).first()).toHaveAttribute('aria-pressed', 'true')

  const multiCity = roots.get('multi-city-workspace')!
  await expect(multiCity.getByRole('region', { name: 'Edit your trip' })).toBeVisible()
  await toggleFirstFare(multiCity)
  const multiStay = multiCity.getByRole('slider', { name: 'Stay in Paris' }).first()
  expect(Number(await multiStay.getAttribute('max'))).toBeLessThanOrEqual(7)
  await multiStay.fill('1')
  await expect(multiStay).toHaveValue('1')

  const dateCalendar = roots.get('date-strip-price-calendar')!
  const stripInput = dateCalendar.locator('input[type="date"]')
  await expect(stripInput).toHaveAttribute('min', '2026-12-01')
  await expect(stripInput).toHaveAttribute('max', '2026-12-15')
  await stripInput.fill('2026-12-07')
  await expect(stripInput).toHaveValue('2026-12-07')
  const previousDates = dateCalendar.getByRole('button', { name: 'Previous dates' })
  for (let index = 0; index < 3 && await previousDates.isEnabled(); index += 1) await previousDates.click()
  await expect(previousDates).toBeDisabled()
  const nextDates = dateCalendar.getByRole('button', { name: 'Next dates' })
  for (let index = 0; index < 4 && await nextDates.isEnabled(); index += 1) await nextDates.click()
  await expect(nextDates).toBeDisabled()
  const calendarDays = dateCalendar.locator('.travel-calendar-option > button:first-child')
  expect(await calendarDays.count()).toBeGreaterThan(0)
  const disabledDayCount = await calendarDays.locator(':disabled').count()
  expect(disabledDayCount).toBeGreaterThanOrEqual(0)
  const addCalendarFare = dateCalendar.getByRole('button', { name: /^(Add|Remove) cheapest fare on 2026-12-/ }).first()
  await addCalendarFare.click()
  await expect(addCalendarFare).toHaveAttribute('aria-pressed', 'true')
  await addCalendarFare.click()
  await expect(addCalendarFare).toHaveAttribute('aria-pressed', 'false')

  const modeDashboard = roots.get('mode-dashboard')!
  const modeRows = await modeDashboard.getByRole('table', { name: 'Compare fares' }).locator('tbody tr').allTextContents()
  expect(modeRows.length).toBeGreaterThan(0)
  expect(modeRows.every(row => row.includes('2026-12-08'))).toBe(true)
  await toggleFirstFare(modeDashboard)

  const budget = roots.get('budget-shortlist')!
  const budgetStart = budget.getByLabel('Window starts')
  const budgetEnd = budget.getByLabel('Window ends')
  await expect(budgetStart).toHaveAttribute('min', '2026-12-01')
  await expect(budgetStart).toHaveAttribute('max', '2026-12-15')
  await expect(budgetEnd).toHaveAttribute('max', '2026-12-15')
  await budgetEnd.fill('2026-12-15')
  await expect(budgetEnd).toHaveValue('2026-12-15')
  await budgetStart.fill('2026-12-16')
  await expect(budgetStart).toHaveValue('2026-12-08')
  await budgetEnd.fill('2026-12-14')
  await expect(budgetEnd).toHaveValue('2026-12-14')
  const directOnly = budget.getByLabel('Direct connections only')
  await directOnly.uncheck()
  await expect(directOnly).not.toBeChecked()
  await directOnly.check()
  await expect(directOnly).toBeChecked()
  const maximumFare = budget.getByLabel('Maximum fare')
  await maximumFare.fill('60')
  await expect(maximumFare).toHaveValue('60')
  const budgetTrain = budget.getByRole('button', { name: 'Train', exact: true })
  await budgetTrain.click()
  await expect(budgetTrain).toHaveAttribute('aria-pressed', 'true')
  await expect(budget.getByRole('table', { name: 'Compare fares' }).locator('tbody tr').first()).toContainText('Train')
  const budgetRows = await budget.getByRole('table', { name: 'Compare fares' }).locator('tbody tr').allTextContents()
  expect(budgetRows.length).toBeGreaterThan(0)
  expect(budgetRows.every(row => /2026-12-(0[89]|1[0-4])/.test(row))).toBe(true)
  await toggleFirstFare(budget)

  const cards = roots.get('fare-cards-controls')!
  const cardsDate = cards.locator('input[type="date"]')
  const initialCardRows = await cards.locator('.travel-fare').allTextContents()
  expect(initialCardRows.length).toBeGreaterThan(0)
  expect(initialCardRows.every(row => row.includes('2026-12-08'))).toBe(true)
  await cardsDate.fill('2026-12-11')
  await expect(cardsDate).toHaveValue('2026-12-11')
  await expect(cards.locator('.travel-fare').first()).toContainText('2026-12-11')
  const cardsCarrier = cards.getByRole('checkbox', { name: /FlixBus/ }).first()
  await cardsCarrier.check()
  await expect(cardsCarrier).toBeChecked()
  await expect(cards.locator('.travel-fare').first()).toContainText('FlixBus')
  await cardsCarrier.uncheck()
  await expect(cardsCarrier).not.toBeChecked()
  const farePager = cards.locator('.travel-pagination[aria-label="Fare result pages"]')
  const nextFarePage = farePager.getByRole('button', { name: 'Next' })
  await expect(nextFarePage).toBeEnabled()
  await nextFarePage.click()
  await expect(farePager).toContainText('Page 2')
  const previousFarePage = farePager.getByRole('button', { name: 'Previous' })
  await expect(previousFarePage).toBeEnabled()
  await previousFarePage.click()
  await expect(farePager).toContainText('Page 1')
  await toggleFirstFare(cards)

  const story = roots.get('story-layouts')!
  const storyTabs = story.getByRole('tab')
  await expect(storyTabs).toHaveCount(2)
  await storyTabs.nth(1).click()
  await expect(storyTabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  const storyRows = await story.getByRole('table', { name: 'Compare fares' }).locator('tbody tr').allTextContents()
  expect(storyRows.length).toBeGreaterThan(0)
  expect(storyRows.every(row => row.includes('2026-12-08'))).toBe(true)
  await storyTabs.nth(0).click()
  await expect(storyTabs.nth(0)).toHaveAttribute('aria-selected', 'true')
  await toggleFirstFare(story)

  const flexible = roots.get('flexible-calendar')!
  const flexibleDays = flexible.locator('.trip-calendar-day span')
  await expect(flexibleDays).toHaveCount(7)
  await expect(flexibleDays.first()).toContainText('8 Dec')
  await expect(flexibleDays.last()).toContainText('14 Dec')
  const cheapestCalendarPrices = await flexible.locator('.trip-calendar-day strong').allTextContents()
  const fastestObjective = flexible.getByRole('radio', { name: 'Fastest' })
  await fastestObjective.click()
  await expect(fastestObjective).toHaveAttribute('aria-checked', 'true')
  await expect.poll(async () => JSON.stringify(await flexible.locator('.trip-calendar-day strong').allTextContents()))
    .not.toBe(JSON.stringify(cheapestCalendarPrices))
  const flexibleDay = flexible.locator('.trip-calendar-day:not(:disabled)').nth(1)
  await flexibleDay.click()
  await expect(flexibleDay).toHaveAttribute('aria-pressed', 'true')
  await toggleFirstFare(flexible)

  const weekly = roots.get('weekly-fare-browser')!
  const weeklyDate = weekly.locator('input[type="date"]')
  await expect(weeklyDate).toHaveAttribute('min', '2026-12-01')
  await expect(weeklyDate).toHaveAttribute('max', '2026-12-09')
  const initialWeeklyRows = await weekly.locator('.travel-fare').allTextContents()
  expect(initialWeeklyRows.length).toBeGreaterThan(0)
  expect(initialWeeklyRows.every(row => row.includes('2026-12-08'))).toBe(true)
  await weeklyDate.fill('2026-12-09')
  await expect(weeklyDate).toHaveValue('2026-12-09')
  const shiftedWeekDays = weekly.locator('.travel-calendar-option > button:first-child span')
  await expect(shiftedWeekDays.first()).toContainText('9 Dec')
  await expect(shiftedWeekDays.last()).toContainText('15 Dec')
  await weekly.getByRole('button', { name: 'Fastest', exact: true }).click()
  await expect(weekly.getByRole('button', { name: 'Fastest', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const shiftedWeeklyRows = await weekly.locator('.travel-fare').allTextContents()
  expect(shiftedWeeklyRows.length).toBeGreaterThan(0)
  expect(shiftedWeeklyRows.every(row => /2026-12-(09|1[0-5])/.test(row))).toBe(true)
  await toggleFirstFare(weekly)

  // Rapid changes exercise stale-result rejection while the worker recomputes locally.
  await Promise.all([
    manualDate.fill('2026-12-06'),
    parisStay.fill('0'),
    stripInput.fill('2026-12-06'),
    cardsDate.fill('2026-12-12'),
    weeklyDate.fill('2026-12-08'),
  ])
  await Promise.all([
    manualDate.fill('2026-12-08'),
    parisStay.fill(String(Math.min(2, stayMaximum))),
    stripInput.fill('2026-12-08'),
    cardsDate.fill('2026-12-13'),
    weeklyDate.fill('2026-12-09'),
  ])
  const cardsReset = cards.locator('.showcase-reset')
  await cardsReset.click()
  await expect(cardsReset).toBeEnabled({ timeout: 45_000 })
  await expect(cardsReset).toHaveText('Reset composition')
  await expect(cardsDate).toHaveValue('2026-12-08')
  await expect(cards.locator('.travel-fare').first()).toContainText('2026-12-08')
  await toggleFirstFare(cards)
  await expect(page.locator('.travel-skeleton, .trip-calendar-skeleton')).toHaveCount(0, { timeout: 45_000 })

  const boundedInputs = page.locator('.composition-live input[type="date"]')
  const dateBounds = await boundedInputs.evaluateAll(inputs => inputs.map(input => ({
    min: (input as HTMLInputElement).min,
    max: (input as HTMLInputElement).max,
    value: (input as HTMLInputElement).value,
  })))
  expect(dateBounds.length).toBeGreaterThan(0)
  for (const bound of dateBounds) {
    expect(bound.min >= '2026-12-01').toBe(true)
    expect(bound.max <= '2026-12-15').toBe(true)
    expect(bound.value >= bound.min && bound.value <= bound.max).toBe(true)
  }

  for (const key of scenarioKeys) {
    await roots.get(key)!.getByRole('button', { name: 'Reset composition' }).click()
  }
  await expect(page.locator('.showcase-reset:disabled')).toHaveCount(0, { timeout: 45_000 })
  await expect(page.locator('.travel-skeleton, .trip-calendar-skeleton')).toHaveCount(0, { timeout: 45_000 })
  await expect(manualDate).toHaveValue('2026-12-08')
  await expect(parisStay).toHaveValue('2')
  await expect(stripInput).toHaveValue('2026-12-08')
  await expect(cardsDate).toHaveValue('2026-12-08')
  await expect(weeklyDate).toHaveValue('2026-12-08')
  await expect(maximumFare).toHaveValue('80')
  await expect(directOnly).toBeChecked()
  await expect(cards.locator('.travel-fare').first()).toContainText('2026-12-08')
  await toggleFirstFare(cards)
  await expect(page.locator('.composition-live button[aria-pressed="true"]').filter({ hasText: /Added|Selected/ })).toHaveCount(0)

  await page.setViewportSize({ width: 390, height: 844 })
  for (const key of scenarioKeys) await assertNoHorizontalOverflow(page, roots.get(key)!)
  await page.setViewportSize({ width: 320, height: 720 })
  for (const key of scenarioKeys) await assertNoHorizontalOverflow(page, roots.get(key)!)

  expect(apiRequests).toEqual([])
  expect(unexpectedLoopbackRequests).toEqual([])
  expect(failedRequests).toEqual([])
  expect(runtimeErrors).toEqual([])
})
