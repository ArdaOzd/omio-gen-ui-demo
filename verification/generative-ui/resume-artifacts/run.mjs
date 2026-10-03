import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { restoreRecordedThread } from './replay-artifact.mjs'

const base = process.env.OMIO_DEMO_URL ?? 'http://127.0.0.1:5194'
const selectedVariants = (process.env.OMIO_ARTIFACT_VARIANTS ?? 'a,b').split(',')
const output = process.env.OMIO_ARTIFACT_OUTPUT ?? 'verification/generative-ui/resume-artifacts'
await mkdir(output, { recursive: true })
const api = await fetch(`${base}/api/health`).then(r => r.json())
const agent = await fetch(`${base}/api/agent/health`).then(r => r.json())
assert.equal(api.status, 'ok')
assert.equal(agent.provider, 'signed-in-codex')
assert.equal(agent.model, 'gpt-6.1-sol')
assert.equal(agent.reasoningEffort, 'high')
assert.notEqual(agent.appRevision, 'unknown')
const cases = []
for (const variant of selectedVariants) for (let index = 0; index < (variant === 'a' ? 3 : 2); index++) {
  const capturePath = `verification/generative-ui/${variant}/live/case-${index}.json`
  const capture = JSON.parse(await readFile(capturePath, 'utf8'))
  assert.equal(capture.liveModelAuthorship, true)
  const tree = variant === 'a' ? capture.tree : undefined
  const rawProgram = variant === 'b' ? capture.programs[0].program : undefined
  const program = rawProgram
  cases.push({ variant, index, capturePath, capture, tree, program, sourceHash: createHash('sha256').update(JSON.stringify(tree ?? program)).digest('hex') })
}
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
try {
  for (const fixture of cases.filter(item => !process.env.OMIO_ARTIFACT_INDEX || item.index === Number(process.env.OMIO_ARTIFACT_INDEX))) for (const width of (process.env.OMIO_ARTIFACT_WIDTHS ?? '360,800,1280').split(',').map(Number)) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const errors = [], requests = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/chat', async route => {
      requests.push(route.request().postDataJSON())
      const body = [
        { type: 'start', messageId: 'snapshot-probe-answer' },
        { type: 'text-start', id: 'probe' },
        { type: 'text-delta', id: 'probe', delta: 'Snapshot inspected locally.' },
        { type: 'text-end', id: 'probe' },
        { type: 'finish', finishReason: 'stop' },
      ].map(part => `data: ${JSON.stringify(part)}\n\n`).join('') + 'data: [DONE]\n\n'
      await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' }, body })
    })
    try {
      await page.goto(`${base}/${fixture.variant}`)
      await page.getByRole('textbox', { name: 'Message' }).waitFor()
      const seeded = await page.evaluate(async ({ variant, tree, program, originalArtifact }) => {
        const { createFareDataBridge } = await import('/src/generative/data/fare-data-bridge.ts')
        const { createUIStateStore } = await import('/src/generative/state/ui-state-store.ts')
        const { createThreadPersistence } = await import('/src/generative/state/persistence.ts')
        const { CATALOG_VERSION } = await import('/src/generative/contracts/index.ts')
        const bridge = createFareDataBridge()
        const request = { originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-09', to: '2026-10-15' }, modes: ['train', 'bus', 'flight'], passengers: 1 }
        const manifest = await bridge.load(request, new AbortController().signal)
        const artifact = 'artifact-acceptance-replay'
        const store = createUIStateStore()
        store.initializeMissing(artifact, { dates: { start: '2026-10-09' }, datasetRefs: [manifest.datasetId] })
        let source, input
        if (variant === 'a') {
          const bind = node => {
            node.artifactRef = artifact
            if (node.datasetRef) node.datasetRef = manifest.datasetId
            const children = Array.isArray(node.children) ? node.children : node.children && typeof node.children === 'object' ? [node.children] : []
            children.forEach(bind)
          }
          bind(tree)
          source = JSON.stringify(tree)
          input = tree
        } else {
          source = program.replaceAll(originalArtifact, artifact).replaceAll('dataset-1hq3nnw', manifest.datasetId)
          input = { artifactRef: artifact, programRevision: 0, program: source }
        }
        const type = variant === 'a' ? 'tool-present' : 'tool-compose_reactive_scene'
        const output = variant === 'a' ? {} : { artifactId: artifact, programRevision: 0, status: 'accepted' }
        const record = {
          schemaVersion: '1.0.0', catalogVersion: CATALOG_VERSION, parserVersion: 'openui-0.3.0', queryVersion: '1', activeArtifactId: artifact,
          messages: [{ id: 'replay-user', role: 'user', parts: [{ type: 'text', text: 'Replay the recorded London to Paris artifact.' }] }, { id: 'replay-assistant', role: 'assistant', parts: [{ type, toolCallId: 'replay-scene', state: 'output-available', input, output }] }],
          artifacts: [{ variant, source, state: store.get(artifact) }],
          descriptors: [{ datasetId: manifest.datasetId, request, sourceVersion: manifest.source.sourceVersion, complete: manifest.coverage.complete }],
        }
        await createThreadPersistence().save(`travel-${variant}`, record)
        bridge.dispose?.()
        return { artifact, datasetId: manifest.datasetId, sourceVersion: manifest.source.sourceVersion, rowCount: manifest.rowCount, record }
      }, { variant: fixture.variant, tree: structuredClone(fixture.tree), program: fixture.program, originalArtifact: fixture.capture.programs?.[0].artifactRef })
      assert.equal(seeded.sourceVersion, api.source_version)
      await restoreRecordedThread(page, { variant: fixture.variant, record: seeded.record, expectedSourceVersion: api.source_version })
      const surface = page.locator('.travel-travelsurface').first()
      await expect(surface).toBeVisible()
      const selection = fixture.variant === 'a' ? surface.getByRole('button', { name: /^Select / }).first() : surface.getByRole('combobox', { name: 'Choose a synthetic fare' }).first()
      await expect(selection).toBeVisible({ timeout: 30000 })
      await expect(page.getByText(/could not load|could not be applied/i)).toHaveCount(0)
      const before = requests.length
      const bus = surface.getByRole('button', { name: 'Bus', exact: true }).first()
      let busAction = false, dependencyAction = false
      if (await bus.count()) {
        await bus.focus()
        await page.keyboard.press('Enter')
        await expect(bus).toHaveAttribute('aria-pressed', 'true')
        await expect(bus).toBeFocused()
        busAction = true
      }
      if (fixture.variant === 'b') {
        const toggle = surface.getByRole('button', { name: fixture.index === 0 ? 'Show details' : 'Show journey timeline', exact: true })
        const toggleHandle = await toggle.elementHandle()
        await toggle.focus()
        await page.keyboard.press('Space')
        await expect(surface.getByText(fixture.index === 0 ? 'Loaded coverage' : 'Journey timeline', { exact: true }).first()).toBeVisible()
        assert.equal(await toggleHandle.evaluate(button => button === document.activeElement), true)
        dependencyAction = true
      }
      const fare = selection
      await fare.focus()
      if (fixture.variant === 'a') {
        await page.keyboard.press('Enter')
        await expect(fare).toHaveAttribute('aria-pressed', 'true')
      } else {
        await expect.poll(() => fare.locator('option').count()).toBeGreaterThan(1)
        await fare.focus()
        const optionText = await fare.locator('option').nth(1).innerText()
        await page.keyboard.press(optionText.trim()[0].toLowerCase())
        await expect(fare).not.toHaveValue('')
      }
      await expect(fare).toBeFocused()
      const totalView = surface.locator('.travel-total').first()
      let total = null
      if (await totalView.count()) {
        await expect.poll(async () => (await totalView.locator('strong').first().innerText()) !== '€0.00').toBe(true)
        total = await totalView.innerText()
      }
      assert.equal(requests.length - before, 0, 'local actions must not request chat')
      const scan = await page.evaluate(() => {
        const visible = element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden'
        const controls = [...document.querySelectorAll('.travel-app button,.travel-app input,.travel-app select,.travel-app textarea,.travel-app [role="button"]')].filter(visible)
        const unnamed = controls.filter(element => !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby') && !element.textContent?.trim() && !element.labels?.length).map(element => element.outerHTML.slice(0,200))
        const motion = [...document.querySelectorAll('.travel-app *')].filter(visible).filter(element => getComputedStyle(element).animationName !== 'none' || getComputedStyle(element).transitionDuration.split(',').some(value => parseFloat(value) > 0)).map(element => element.className)
        return { overflow: document.documentElement.scrollWidth > innerWidth, unnamed, motion, controls: controls.length, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, focusedName: document.activeElement?.getAttribute('aria-label') }
      })
      assert.equal(scan.overflow, false, 'artifact must fit viewport')
      assert.deepEqual(scan.unnamed, [], 'visible controls require an accessible name')
      assert.deepEqual(scan.motion, [], 'reduced motion must stop animations and transitions')
      assert.equal(scan.reducedMotion, true)
      await page.screenshot({ path: `${output}/${fixture.variant}-${fixture.index}-${width}.png`, fullPage: true })
      await page.getByRole('textbox', { name: 'Message' }).fill('Report the current state only.')
      await page.getByRole('button', { name: 'Send message' }).click()
      await expect.poll(() => requests.length).toBe(before + 1)
      const snapshot = requests.at(-1).currentContext
      const checks = await page.evaluate(async ({ snapshot, request }) => {
        const { parseAgentContext } = await import('/src/generative/contracts/index.ts')
        const { assertNoBulkData } = await import('/src/generative/contracts/privacy.ts')
        const { createIndexedDBStorage, parsePersistedThread } = await import('/src/generative/state/persistence.ts')
        parseAgentContext(snapshot)
        assertNoBulkData(request)
        const record = await createIndexedDBStorage().read(request.variant === 'a' ? 'travel-a' : 'travel-b')
        if (record) parsePersistedThread(record)
        return { valid: true, record }
      }, { snapshot, request: requests.at(-1) })
      assert.equal(checks.valid, true)
      assert.equal(snapshot.activeArtifactId, seeded.artifact)
      assert.equal(snapshot.artifacts[0].selectedFareIds.length, 1)
      if (busAction) assert.ok(snapshot.artifacts[0].filters.modes.includes('bus') || Object.values(snapshot.artifacts[0].modesByLeg).some(modes => modes.includes('bus')))
      if (dependencyAction) assert.equal(snapshot.artifacts[0].runtimeVariables[fixture.index === 0 ? '$show' : '$showTimeline'], true)
      assert.equal(errors.length, 0)
      const result = { variant: fixture.variant, index: fixture.index, width, sourcePath: fixture.capturePath, sourceHash: fixture.sourceHash, seeded, scan, keyboardFareSelection: true, keyboardBusAction: busAction, keyboardDependencyAction: dependencyAction, focusRetained: true, total, localActionChatDelta: 0, nextSnapshot: snapshot, persisted: checks.record, requestBytes: Buffer.byteLength(JSON.stringify(requests.at(-1))), pageErrors: errors, passed: true }
      results.push(result)
      console.log(JSON.stringify({ variant: fixture.variant, index: fixture.index, width, passed: true }))
    } catch (error) {
      const result = { variant: fixture.variant, index: fixture.index, width, passed: false, error: String(error), pageErrors: errors }
      results.push(result)
      await page.screenshot({ path: `${output}/${fixture.variant}-${fixture.index}-${width}-failed.png`, fullPage: true }).catch(() => {})
      console.error(JSON.stringify(result))
    } finally { await context.close() }
    await writeFile(`${output}/results.json`, JSON.stringify({ recordedAt: new Date().toISOString(), appRevision: agent.appRevision, sourceVersion: api.source_version, fixtureRows: api.fare_count, browser: browser.version(), liveModelCalls: 0, classification: 'Exact authored structure replay via native assistant-ui/OpenUI adapters, current real fare API and browser worker; DOM accessible-name/role checks, keyboard/focus/responsive/reduced-motion checks; no axe package installed and no hands-on screen-reader claim.', results }, null, 2) + '\n')
  }
} finally { await browser.close() }
assert.equal(results.filter(result => !result.passed).length, 0)
