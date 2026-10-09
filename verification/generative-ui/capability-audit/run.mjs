import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const root = process.cwd()
const manifestPath = path.join(root, 'verification/generative-ui/capability-audit/cases.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const { catalogHash, catalogVersion } = await import('../../../src/generative/catalog/generated/catalog.ts')
assert.equal(manifest.catalogVersion, catalogVersion, 'Capability cases must pin the current catalog version')
assert.equal(manifest.catalogHash, catalogHash, 'Capability cases must pin the current catalog hash')

const args = process.argv.slice(2)
const valueAfter = flag => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const requested = new Set((valueAfter('--cases') ?? '').split(',').filter(Boolean))
const selected = requested.size ? manifest.cases.filter(testCase => requested.has(testCase.id)) : manifest.cases
assert.equal(selected.length, requested.size || manifest.cases.length, 'Every requested case id must exist')

const baseUrl = process.env.OMIO_DEMO_URL ?? 'http://127.0.0.1:5176'
const output = path.resolve(valueAfter('--output') ?? '/private/tmp/omio-generative-capability-audit')
const timeoutMs = Number(process.env.CAPABILITY_CASE_TIMEOUT_MS ?? 600_000)
await mkdir(output, { recursive: true })

function walkTypes(node, outputTypes = []) {
  if (!node || typeof node !== 'object') return outputTypes
  if (typeof node.$type === 'string') outputTypes.push(node.$type)
  const children = Array.isArray(node.children) ? node.children : node.children ? [node.children] : []
  for (const child of children) walkTypes(child, outputTypes)
  return outputTypes
}

async function readLatestThread(page) {
  return page.evaluate(async () => new Promise((resolve, reject) => {
    const request = indexedDB.open('omio-generative-state', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const transaction = request.result.transaction('threads')
      const read = transaction.objectStore('threads').getAll()
      read.onerror = () => reject(read.error)
      read.onsuccess = () => resolve(read.result.sort((left, right) => (right.messages?.length ?? 0) - (left.messages?.length ?? 0))[0])
    }
  }))
}

async function waitForTurn(page, network, startedAt) {
  const deadline = startedAt + timeoutMs
  while (Date.now() < deadline) {
    await page.waitForTimeout(500)
    const stop = page.getByRole('button', { name: 'Stop response' })
    const stopped = await stop.count() === 0 || await stop.isDisabled().catch(() => true)
    if (network.requests.length > 0 && network.inflight === 0 && Date.now() - network.lastActivity > 6_000 && stopped) return
  }
  throw new Error(`Agent turn did not finish within ${timeoutMs}ms`)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const summary = []
try {
  for (const testCase of selected) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const network = { requests: [], responses: [], inflight: 0, lastActivity: Date.now() }
    const consoleErrors = []
    const pageErrors = []
    const startedAt = Date.now()
    page.on('request', request => {
      if (!request.url().endsWith('/api/chat')) return
      network.requests.push({ at: new Date().toISOString() })
      network.inflight += 1
      network.lastActivity = Date.now()
    })
    page.on('response', response => {
      if (!response.url().endsWith('/api/chat')) return
      network.responses.push({ status: response.status(), at: new Date().toISOString() })
      network.inflight = Math.max(0, network.inflight - 1)
      network.lastActivity = Date.now()
    })
    page.on('console', message => {
      if (message.type() === 'error' && !message.text().includes('favicon')) consoleErrors.push(message.text())
    })
    page.on('pageerror', error => pageErrors.push(error.message))
    let result
    try {
      await page.goto(`${baseUrl}/generative`)
      await page.getByRole('textbox', { name: 'Message' }).fill(testCase.prompt)
      await page.getByRole('button', { name: 'Send message' }).click()
      await waitForTurn(page, network, startedAt)
      const record = await readLatestThread(page)
      const presentParts = (record?.messages ?? []).flatMap(message => message.parts ?? []).filter(part => part.type === 'tool-present')
      const accepted = presentParts.filter(part => part.state === 'output-available')
      const latestScene = accepted.at(-1)?.input
      const generatedComponents = [...new Set(walkTypes(latestScene))]
      const desktopPath = path.join(output, `${testCase.id}-1280.png`)
      const mobilePath = path.join(output, `${testCase.id}-390.png`)
      await page.screenshot({ path: desktopPath, fullPage: true })
      await page.setViewportSize({ width: 390, height: 844 })
      await page.screenshot({ path: mobilePath, fullPage: true })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      result = {
        schemaVersion: 1,
        id: testCase.id,
        title: testCase.title,
        family: testCase.family,
        prompt: testCase.prompt,
        runAt: new Date().toISOString(),
        appUrl: baseUrl,
        catalogVersion,
        catalogHash,
        modelGeneratedComponents: generatedComponents,
        targetComponents: testCase.targets,
        acceptedSceneCount: accepted.length,
        rejectedSceneCount: presentParts.length - accepted.length,
        chatStatuses: network.responses.map(response => response.status),
        elapsedMs: Date.now() - startedAt,
        screenshots: { desktop: desktopPath, mobile: mobilePath },
        noHorizontalOverflowAt390: !overflow,
        consoleErrors,
        pageErrors,
        latestScene
      }
      await writeFile(path.join(output, `${testCase.id}.json`), `${JSON.stringify(result, null, 2)}\n`)
      console.log(JSON.stringify({ id: testCase.id, status: 'pass', generatedComponents, elapsedMs: result.elapsedMs }))
    } catch (error) {
      result = {
        schemaVersion: 1,
        id: testCase.id,
        title: testCase.title,
        family: testCase.family,
        prompt: testCase.prompt,
        runAt: new Date().toISOString(),
        appUrl: baseUrl,
        catalogVersion,
        catalogHash,
        targetComponents: testCase.targets,
        chatStatuses: network.responses.map(response => response.status),
        elapsedMs: Date.now() - startedAt,
        consoleErrors,
        pageErrors,
        error: error instanceof Error ? error.message : String(error)
      }
      await writeFile(path.join(output, `${testCase.id}.json`), `${JSON.stringify(result, null, 2)}\n`)
      await page.screenshot({ path: path.join(output, `${testCase.id}-failure.png`), fullPage: true }).catch(() => undefined)
      console.error(JSON.stringify({ id: testCase.id, status: 'fail', error: result.error }))
    } finally {
      summary.push(result)
      await context.close()
    }
  }
} finally {
  await browser.close()
}
await writeFile(path.join(output, 'results.json'), `${JSON.stringify({ schemaVersion: 1, catalogVersion, catalogHash, cases: summary }, null, 2)}\n`)
if (summary.some(result => result.error)) process.exitCode = 1
