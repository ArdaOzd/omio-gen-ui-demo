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
    const record = await readLatestThread(page).catch(() => undefined)
    const assistantMessages = (record?.messages ?? []).filter(message => message.role === 'assistant')
    const acceptedScene = assistantMessages.some(message => (message.parts ?? []).some(part => part.type === 'tool-present' && part.state === 'output-available'))
    const lastParts = assistantMessages.at(-1)?.parts ?? []
    const lastToolIndex = lastParts.findLastIndex(part => typeof part.type === 'string' && part.type.startsWith('tool-'))
    const lastTextIndex = lastParts.findLastIndex(part => part.type === 'text' && typeof part.text === 'string' && part.text.trim())
    const finalTextAfterTools = lastTextIndex > lastToolIndex
    const terminal = network.terminalResponses > 0
    if (terminal && network.inflight === 0 && Date.now() - network.lastActivity > 6_000 && stopped) {
      return { acceptedScene, finalTextAfterTools }
    }
  }
  throw new Error(`Agent turn did not finish within ${timeoutMs}ms`)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const summary = []
try {
  for (const testCase of selected) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const network = { requests: [], responses: [], inflight: 0, terminalResponses: 0, lastActivity: Date.now() }
    const consoleErrors = []
    const pageErrors = []
    const startedAt = Date.now()
    page.on('request', request => {
      if (!request.url().endsWith('/api/chat')) return
      network.requests.push({ at: new Date().toISOString() })
      network.inflight += 1
      network.lastActivity = Date.now()
    })
    page.on('response', async response => {
      if (!response.url().endsWith('/api/chat')) return
      network.responses.push({ status: response.status(), at: new Date().toISOString() })
      network.lastActivity = Date.now()
      await response.finished().catch(() => undefined)
      const body = await response.text().catch(() => '')
      if (/"finishReason"\s*:\s*"stop"|"finish_reason"\s*:\s*"stop"/.test(body)) network.terminalResponses += 1
    })
    page.on('requestfinished', request => {
      if (!request.url().endsWith('/api/chat')) return
      network.inflight = Math.max(0, network.inflight - 1)
      network.lastActivity = Date.now()
    })
    page.on('requestfailed', request => {
      if (!request.url().endsWith('/api/chat')) return
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
      const completion = await waitForTurn(page, network, startedAt)
      const record = await readLatestThread(page)
      const presentParts = (record?.messages ?? []).flatMap(message => message.parts ?? []).filter(part => part.type === 'tool-present')
      const accepted = presentParts.filter(part => part.state === 'output-available')
      const latestScene = accepted.at(-1)?.input
      const generatedComponents = [...new Set(walkTypes(latestScene))]
      const chatRequestsBeforeInteractions = network.requests.length
      const interactionEvidence = {}
      if (testCase.interactions?.includes('tabs')) {
        const tabs = page.getByRole('tab')
        interactionEvidence.tabs = []
        for (let index = 0; index < await tabs.count(); index += 1) {
          const tab = tabs.nth(index)
          await tab.click()
          interactionEvidence.tabs.push({ label: await tab.innerText(), selected: await tab.getAttribute('aria-selected') === 'true' })
        }
      }
      if (testCase.interactions?.includes('carousel')) {
        interactionEvidence.carousels = await page.locator('.travel-carousel').evaluateAll(elements => elements.map(element => {
          const before = element.scrollLeft
          element.scrollLeft = element.scrollWidth
          return { panels: element.children.length, scrollable: element.scrollWidth > element.clientWidth, before, after: element.scrollLeft }
        }))
      }
      if (testCase.interactions?.includes('add-first')) {
        const add = page.getByRole('button', { name: /^Add(?: cheapest fare)?/ }).first()
        if (await add.count() && await add.isEnabled()) {
          const label = await add.getAttribute('aria-label') ?? await add.innerText()
          await add.click()
          await page.waitForTimeout(500)
          interactionEvidence.add = { label, trackerVisible: await page.getByText('Planning tracker', { exact: true }).count() > 0 }
        }
      }
      interactionEvidence.chatRequestDelta = network.requests.length - chatRequestsBeforeInteractions
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
        terminalResponses: network.terminalResponses,
        completion,
        elapsedMs: Date.now() - startedAt,
        interactionEvidence,
        screenshots: { desktop: desktopPath, mobile: mobilePath },
        noHorizontalOverflowAt390: !overflow,
        consoleErrors,
        pageErrors,
        assistantText: (record?.messages ?? []).filter(message => message.role === 'assistant').flatMap(message => (message.parts ?? []).filter(part => part.type === 'text').map(part => part.text)).filter(Boolean),
        artifactStates: (record?.artifacts ?? []).map(artifact => artifact.state),
        visibleText: await page.locator('body').innerText(),
        latestScene,
        error: accepted.length ? undefined : 'Agent turn ended without an accepted generated UI scene'
      }
      await writeFile(path.join(output, `${testCase.id}.json`), `${JSON.stringify(result, null, 2)}\n`)
      console.log(JSON.stringify({ id: testCase.id, status: result.error ? 'fail' : 'pass', generatedComponents, elapsedMs: result.elapsedMs, error: result.error }))
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
