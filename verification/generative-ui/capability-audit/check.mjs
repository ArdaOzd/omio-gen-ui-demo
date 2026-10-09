import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { JSDOM } from 'jsdom'
import { catalogDescriptors, catalogHash, catalogVersion } from '../../../src/generative/catalog/generated/catalog.ts'
import { defaultSuggestions } from '../../../src/generative/chat/thread-shell.tsx'

const root = process.cwd()
const auditRoot = path.join(root, 'verification/generative-ui/capability-audit')
const reportRoot = path.join(root, 'reports/generative-capabilities')
const manifest = JSON.parse(await readFile(path.join(auditRoot, 'cases.json'), 'utf8'))
const report = JSON.parse(await readFile(path.join(reportRoot, 'capability-audit.json'), 'utf8'))
const html = await readFile(path.join(reportRoot, 'index.html'), 'utf8')
const final = process.argv.includes('--final')

function walkTypes(node, types = []) {
  if (!node || typeof node !== 'object') return types
  if (typeof node.$type === 'string') types.push(node.$type)
  const children = Array.isArray(node.children) ? node.children : node.children ? [node.children] : []
  for (const child of children) walkTypes(child, types)
  return types
}

assert.equal(manifest.catalogVersion, catalogVersion)
assert.equal(manifest.catalogHash, catalogHash)
assert.equal(report.catalogVersion, catalogVersion)
assert.equal(report.catalogHash, catalogHash)
assert.equal(catalogDescriptors.length, 49)
assert.equal(report.components.length, catalogDescriptors.length)
assert.deepEqual(report.components.map(component => component.name).sort(), catalogDescriptors.map(component => component.name).sort())

const targets = new Set(manifest.cases.flatMap(testCase => testCase.targets))
assert.deepEqual([...targets].sort(), catalogDescriptors.map(component => component.name).sort(), 'Every registered descriptor needs an audit target')
assert.ok(report.ranking.every(testCase => testCase.prompt === manifest.cases.find(candidate => candidate.id === testCase.id)?.prompt), 'The report must retain exact tested prompts')
assert.ok(html.includes('Registered component ledger'))
assert.ok(html.includes(`${catalogDescriptors.length} registered`))
assert.ok(html.includes('id="case-search"'))
assert.ok(html.includes('id="component-search"'))
assert.ok(html.includes('class="copy"'))
assert.ok(html.includes('id="vote-filter"'))
assert.ok(html.includes('id="order-by-votes"'))

const voteStorageKey = 'omio-generative-capability-audit-votes-v1'
const orderStorageKey = 'omio-generative-capability-audit-order-v1'
function createReportDom(storage = {}, storageThrows = false) {
  return new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://capability-report.test/',
    beforeParse(window) {
      if (storageThrows) {
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem() { throw new Error('storage unavailable') },
            setItem() { throw new Error('storage unavailable') }
          }
        })
        return
      }
      for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value)
    }
  })
}
const cardIds = document => [...document.querySelectorAll('.case-card')].map(card => card.dataset.caseId)
const visibleCards = document => [...document.querySelectorAll('.case-card')].filter(card => !card.hidden)
const clickVote = (card, vote) => card.querySelector(`[data-vote-action="${vote}"]`).click()
const analyticalOrder = report.ranking.map(testCase => testCase.id)

const interactionDom = createReportDom()
const interactionDocument = interactionDom.window.document
const interactionCards = [...interactionDocument.querySelectorAll('.case-card')]
assert.equal(interactionCards.length, report.ranking.length)
assert.deepEqual(cardIds(interactionDocument), analyticalOrder, 'Votes must start in analytical score order')
clickVote(interactionCards[0], 'up')
assert.equal(interactionCards[0].dataset.vote, 'up')
assert.equal(interactionCards[0].querySelector('[data-vote-action="up"]').getAttribute('aria-pressed'), 'true')
clickVote(interactionCards[0], 'up')
assert.equal(interactionCards[0].dataset.vote, '', 'Pressing an active vote must clear it')
clickVote(interactionCards[0], 'up')
clickVote(interactionCards[1], 'down')
clickVote(interactionCards[2], 'up')
assert.deepEqual(cardIds(interactionDocument), analyticalOrder, 'Voting must not reorder cards before the Order button is pressed')
assert.deepEqual(JSON.parse(interactionDom.window.localStorage.getItem(voteStorageKey)), {
  [analyticalOrder[0]]: 'up',
  [analyticalOrder[1]]: 'down',
  [analyticalOrder[2]]: 'up'
})

const voteFilter = interactionDocument.querySelector('#vote-filter')
voteFilter.value = 'up'
voteFilter.dispatchEvent(new interactionDom.window.Event('change', { bubbles: true }))
assert.deepEqual(visibleCards(interactionDocument).map(card => card.dataset.caseId), [analyticalOrder[0], analyticalOrder[2]])
assert.deepEqual(visibleCards(interactionDocument).map(card => card.querySelector('.rank').textContent), ['#1', '#2'], 'Filters must number only visible cards')
voteFilter.value = ''
voteFilter.dispatchEvent(new interactionDom.window.Event('change', { bubbles: true }))
assert.deepEqual([...interactionDocument.querySelectorAll('.case-card .rank')].map(rank => rank.textContent), analyticalOrder.map((_, index) => `#${index + 1}`), 'Clearing filters must restore full-list numbering')
interactionDocument.querySelector('#order-by-votes').click()
const expectedVoteOrder = [
  analyticalOrder[0],
  analyticalOrder[2],
  ...analyticalOrder.slice(3),
  analyticalOrder[1]
]
assert.deepEqual(cardIds(interactionDocument), expectedVoteOrder, 'Manual ordering must group upvotes, neutral cards, then downvotes')
assert.deepEqual(
  [...interactionDocument.querySelectorAll('.case-card .rank')].map(rank => rank.textContent),
  analyticalOrder.map((_, index) => `#${index + 1}`),
  'Manual ordering must renumber the full prompt list'
)
const storedOrder = interactionDom.window.localStorage.getItem(orderStorageKey)
assert.deepEqual(JSON.parse(storedOrder), expectedVoteOrder)
voteFilter.value = 'down'
voteFilter.dispatchEvent(new interactionDom.window.Event('change', { bubbles: true }))
assert.deepEqual(visibleCards(interactionDocument).map(card => [card.dataset.caseId, card.querySelector('.rank').textContent]), [[analyticalOrder[1], '#1']], 'Filtering must renumber only visible cards')
assert.deepEqual(cardIds(interactionDocument), expectedVoteOrder, 'Filtering must not reorder the list')
voteFilter.value = ''
voteFilter.dispatchEvent(new interactionDom.window.Event('change', { bubbles: true }))
assert.deepEqual([...interactionDocument.querySelectorAll('.case-card .rank')].map(rank => rank.textContent), analyticalOrder.map((_, index) => `#${index + 1}`), 'Clearing filters after manual ordering must restore full-list numbering')

const persistedDom = createReportDom({
  [voteStorageKey]: interactionDom.window.localStorage.getItem(voteStorageKey),
  [orderStorageKey]: storedOrder
})
const persistedDocument = persistedDom.window.document
assert.deepEqual(cardIds(persistedDocument), expectedVoteOrder, 'The last manually applied order must survive reloads')
const persistedFirstCard = persistedDocument.querySelector(`[data-case-id="${analyticalOrder[0]}"]`)
assert.equal(persistedFirstCard.querySelector('[data-vote-action="up"]').getAttribute('aria-pressed'), 'true')
const orderBeforeVoteChange = persistedDom.window.localStorage.getItem(orderStorageKey)
clickVote(persistedFirstCard, 'down')
assert.deepEqual(cardIds(persistedDocument), expectedVoteOrder, 'Changing a vote after reload must not silently reorder cards')
assert.equal(persistedDom.window.localStorage.getItem(orderStorageKey), orderBeforeVoteChange, 'Voting must not overwrite the last manually applied order')

const resilientDom = createReportDom({}, true)
const resilientDocument = resilientDom.window.document
const resilientFirstCard = resilientDocument.querySelector('.case-card')
clickVote(resilientFirstCard, 'up')
resilientDocument.querySelector('#order-by-votes').click()
assert.equal(resilientFirstCard.dataset.vote, 'up', 'Voting must still work when browser storage is unavailable')
assert.equal(resilientFirstCard.querySelector('[data-vote-action="up"]').getAttribute('aria-pressed'), 'true')
interactionDom.window.close()
persistedDom.window.close()
resilientDom.window.close()

const evidenceRoot = path.join(auditRoot, 'evidence')
for (const file of (await readdir(evidenceRoot).catch(() => [])).filter(name => name.endsWith('.json'))) {
  const evidence = JSON.parse(await readFile(path.join(evidenceRoot, file), 'utf8'))
  assert.equal(evidence.catalogVersion, catalogVersion)
  assert.equal(evidence.catalogHash, catalogHash)
  if (evidence.acceptedSceneCount > 0) {
    assert.ok(evidence.acceptedScene, `${file} needs a durable accepted scene`)
    assert.deepEqual(
      [...new Set(walkTypes(evidence.acceptedScene))].sort(),
      [...evidence.modelGeneratedComponents].sort(),
      `${file} component coverage must derive from its archived accepted scene`
    )
  }
  assert.ok(evidence.archiveProvenance?.rawSourceSha256 || evidence.archiveProvenance?.archivedRawSourceSha256, `${file} needs durable archive provenance`)
  const screenshotHashes = new Set()
  for (const screenshot of evidence.screenshots ?? []) {
    assert.equal(typeof screenshot, 'object', `${file} must use structured screenshot provenance`)
    assert.ok(['desktop', 'mobile', 'interaction', 'failure', 'detail'].includes(screenshot.role), `${file} has unknown screenshot role`)
    const localPath = path.join(evidenceRoot, screenshot.path)
    await access(localPath)
    await access(path.join(reportRoot, 'screenshots', path.basename(screenshot.path)))
    const bytes = await readFile(localPath)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), screenshot.sha256, `${file} screenshot hash drift`)
    assert.ok(screenshot.pixelDimensions?.width > 0 && screenshot.pixelDimensions?.height > 0, `${file} needs pixel dimensions`)
    assert.ok(!screenshotHashes.has(screenshot.sha256), `${file} must deduplicate byte-identical screenshots`)
    screenshotHashes.add(screenshot.sha256)
  }
}

if (final) {
  assert.equal(report.scope.modelGeneratedComponents, 49, 'Final report must contain accepted direct evidence for all 49 descriptors')
  assert.equal(report.scope.evidenceRecords, 33)
  assert.equal(report.scope.distinctAttempts, 30)
  assert.equal(report.scope.rankedCases, 19)
  assert.equal(report.scope.casesWithEvidence, 18)
  assert.equal(report.scope.acceptedCases, 17)
  assert.equal(report.scope.plannedWithoutRun, 1)
  assert.equal(report.scope.attemptedWithoutAcceptedScene, 1)
  assert.equal(report.topDefaults.length, 4, 'Final report must select four defaults')
  assert.deepEqual(defaultSuggestions.map(item => item.prompt), report.topDefaults.map(item => item.prompt), 'Chat defaults must match the ranked top four exact prompts')
  assert.equal(new Set(report.topDefaults.map(item => item.family)).size, 4, 'Final defaults must have distinct task families')
  assert.equal(report.components.filter(component => component.score?.rationale && component.componentFacts.length).length, 49, 'Every component needs a score, rationale, and evidence fact')
  for (const component of report.components) {
    assert.equal(new Set(component.directCases).size, component.directCases.length, `${component.name} direct case aliases must be deduplicated`)
    assert.equal(new Set(component.componentFacts.map(fact => `${fact.caseId}:${fact.sourceEvidenceSha256 ?? ''}:${fact.observation ?? ''}`)).size, component.componentFacts.length, `${component.name} component facts must be deduplicated`)
  }
  assert.equal(report.ranking.filter(testCase => testCase.score).length, manifest.cases.length, 'Every prompt case needs a score and rationale')
  for (const selected of report.ranking.filter(testCase => testCase.eligibleForDefault)) {
    assert.equal(selected.failedSibling, false, `${selected.id} has a failed sibling attempt`)
    assert.equal(selected.responsiveEvidence.complete, true, `${selected.id} lacks genuine desktop and 390 px evidence`)
    assert.equal(selected.meaningfulActionTested, true, `${selected.id} lacks a named successful action`)
  }
  for (const selected of report.topDefaults) {
    const ranked = report.ranking.find(item => item.id === selected.id)
    assert.equal(ranked?.eligibleForDefault, true, `${selected.id} did not pass the default gates`)
  }
  const weekly = report.ranking.find(testCase => testCase.id === 'weekly-fare-browser')
  assert.equal(weekly?.run, null, 'The planned weekly fare browser case was not run')
  assert.equal(weekly?.score?.completeness, 0)
  assert.equal(weekly?.score?.correctness, 0)
  assert.equal(report.defaultVerification.results.length, 8)
  assert.equal(report.defaultVerification.forwardedModelRequests, 0)
  const defaultVerificationSource = JSON.parse(await readFile(path.join(auditRoot, 'default-verification', 'verification.json'), 'utf8'))
  for (const result of report.defaultVerification.results) {
    assert.equal(result.requestCount, 1)
    assert.equal(result.exactPayloadParity, true)
    assert.equal(result.initialLayout.documentOverflow, false)
    assert.equal(result.initialLayout.suggestionOverflow, false)
    assert.equal(result.suggestionsAfterSend, 0)
    const sourceResult = defaultVerificationSource.results.find(candidate => candidate.id === result.id && candidate.viewport.name === result.viewport.name)
    assert.ok(sourceResult, `${result.id}/${result.viewport.name} needs durable source verification`)
    await access(path.join(auditRoot, 'default-verification', sourceResult.screenshotPath))
    await access(path.join(reportRoot, result.screenshotPath))
  }
  assert.ok(!JSON.stringify(report).includes('/private/tmp/'), 'Final report cannot depend on temporary evidence paths')
}

console.log(JSON.stringify({ status: 'pass', final, registered: catalogDescriptors.length, targeted: targets.size, evidence: report.ranking.filter(testCase => testCase.run).length }))
