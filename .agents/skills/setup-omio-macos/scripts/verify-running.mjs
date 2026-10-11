import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const webPort = Number(process.env.WEB_PORT ?? 5173)
const apiPort = Number(process.env.API_PORT ?? 8000)
const agentPort = Number(process.env.AGENT_PORT ?? 8010)
const webBase = `http://127.0.0.1:${webPort}`
const apiBase = `http://127.0.0.1:${apiPort}`
const agentBase = `http://127.0.0.1:${agentPort}`
const evidence = 'artifacts/setup-verification'
await mkdir(evidence, { recursive: true })

async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  assert.equal(response.ok, true, `${url} returned ${response.status}`)
  return response.json()
}

const apiHealth = await json(`${apiBase}/api/health`)
assert.equal(apiHealth.service, 'omio-fare-api')
assert.equal(apiHealth.fare_count, 50_000_000)
const agentHealth = await json(`${agentBase}/api/agent/health`)
assert.equal(agentHealth.service, 'omio-generative-agent')
assert.equal(agentHealth.provider, 'signed-in-codex')
assert.equal(agentHealth.model, 'gpt-6.1-sol')
assert.equal(agentHealth.reasoningEffort, 'high')

const search = await json(`${apiBase}/api/search?origin=london&destination=paris&departure_date=2026-11-08&passengers=1&mode=all&sort=price_asc&page=1&limit=5`)
const fares = search?.outbound?.results
assert.ok(Array.isArray(fares) && fares.length > 0, 'Generated London to Paris fares were missing')
assert.ok(fares.every(fare => fare.origin?.id === 'london' && fare.destination?.id === 'paris'), 'Search returned an unexpected route')

const pageErrors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let page
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  page = await context.newPage()
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(webBase, { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'From' }).fill('London')
  await page.getByRole('option', { name: /London/ }).first().click()
  await page.getByRole('textbox', { name: 'To' }).fill('Paris')
  await page.getByRole('option', { name: /Paris/ }).first().click()
  await page.locator('input[type="date"]').first().fill('2026-11-08')
  await page.getByRole('button', { name: /^Search$/ }).click()
  await page.getByRole('region', { name: 'Travel connections' }).getByRole('article').first().waitFor({ state: 'visible' })
  await page.screenshot({ path: `${evidence}/classic-search.png`, fullPage: true })
  await page.goto(`${webBase}/generative`, { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Message' }).fill('Compare train, bus, and flight fares from London to Paris on 8 November 2026. Present an interactive fare comparison with options I can add to my trip.')
  await page.getByRole('button', { name: 'Send message' }).click()
  const surface = page.locator('.travel-travelsurface[data-artifact]').last()
  await surface.waitFor({ state: 'visible', timeout: 180_000 })
  const action = surface.getByRole('button', { name: /^(Add|Select|Choose)\b/i }).first()
  await action.waitFor({ state: 'visible', timeout: 30_000 })
  await action.click()
  const clearAll = page.getByRole('button', { name: 'Clear all' })
  await clearAll.waitFor({ state: 'visible' })
  assert.equal(await clearAll.isEnabled(), true, 'Displayed fare was not added to the shared tracker')
  await page.screenshot({ path: `${evidence}/planner-desktop.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert.ok(overflow <= 1, `Narrow planner overflows horizontally by ${overflow}px`)
  await page.screenshot({ path: `${evidence}/planner-mobile.png`, fullPage: true })
  assert.deepEqual(pageErrors, [], `Browser errors: ${pageErrors.join('; ')}`)
  const receipt = {
    verifiedAt: new Date().toISOString(),
    webBase,
    apiHealth,
    agentHealth,
    searchedFareId: fares[0].id,
    classicSearchVisible: true,
    renderedArtifact: await surface.getAttribute('data-artifact'),
    trackerVisible: true,
    narrowOverflowPixels: overflow,
  }
  await writeFile(`${evidence}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(JSON.stringify(receipt, null, 2))
} catch (error) {
  if (page) await page.screenshot({ path: `${evidence}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${evidence}/failure.txt`, `${error instanceof Error ? error.stack : String(error)}\n`)
  throw error
} finally {
  await browser.close()
}
