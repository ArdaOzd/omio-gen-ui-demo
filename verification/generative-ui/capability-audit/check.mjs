import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { catalogDescriptors, catalogHash, catalogVersion } from '../../../src/generative/catalog/generated/catalog.ts'
import { defaultSuggestions } from '../../../src/generative/chat/thread-shell.tsx'

const root = process.cwd()
const auditRoot = path.join(root, 'verification/generative-ui/capability-audit')
const reportRoot = path.join(root, 'reports/generative-capabilities')
const manifest = JSON.parse(await readFile(path.join(auditRoot, 'cases.json'), 'utf8'))
const report = JSON.parse(await readFile(path.join(reportRoot, 'capability-audit.json'), 'utf8'))
const html = await readFile(path.join(reportRoot, 'index.html'), 'utf8')
const final = process.argv.includes('--final')

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

const evidenceRoot = path.join(auditRoot, 'evidence')
for (const file of (await readdir(evidenceRoot).catch(() => [])).filter(name => name.endsWith('.json'))) {
  const evidence = JSON.parse(await readFile(path.join(evidenceRoot, file), 'utf8'))
  assert.equal(evidence.catalogVersion, catalogVersion)
  assert.equal(evidence.catalogHash, catalogHash)
  for (const screenshot of evidence.screenshots ?? []) {
    assert.equal(typeof screenshot, 'object', `${file} must use structured screenshot provenance`)
    assert.ok(['desktop', 'mobile', 'interaction', 'failure', 'detail'].includes(screenshot.role), `${file} has unknown screenshot role`)
    const localPath = path.join(evidenceRoot, screenshot.path)
    await access(localPath)
    await access(path.join(reportRoot, 'screenshots', path.basename(screenshot.path)))
    const bytes = await readFile(localPath)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), screenshot.sha256, `${file} screenshot hash drift`)
    assert.ok(screenshot.pixelDimensions?.width > 0 && screenshot.pixelDimensions?.height > 0, `${file} needs pixel dimensions`)
  }
}

if (final) {
  assert.equal(report.scope.modelGeneratedComponents, 49, 'Final report must contain accepted direct evidence for all 49 descriptors')
  assert.equal(report.topDefaults.length, 4, 'Final report must select four defaults')
  assert.deepEqual(defaultSuggestions.map(item => item.prompt), report.topDefaults.map(item => item.prompt), 'Chat defaults must match the ranked top four exact prompts')
  assert.equal(new Set(report.topDefaults.map(item => item.family)).size, 4, 'Final defaults must have distinct task families')
  assert.equal(report.components.filter(component => component.score).length, 49, 'Every component needs a score and rationale')
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
}

console.log(JSON.stringify({ status: 'pass', final, registered: catalogDescriptors.length, targeted: targets.size, evidence: report.ranking.filter(testCase => testCase.run).length }))
