import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { catalogDescriptors, catalogHash, catalogVersion } from '../../../src/generative/catalog/generated/catalog.ts'

const root = process.cwd()
const auditRoot = path.join(root, 'verification/generative-ui/capability-audit')
const reportRoot = path.join(root, 'reports/generative-capabilities')
const manifest = JSON.parse(await readFile(path.join(auditRoot, 'cases.json'), 'utf8'))
const report = JSON.parse(await readFile(path.join(reportRoot, 'capability-audit.json'), 'utf8'))
const html = await readFile(path.join(reportRoot, 'index.html'), 'utf8')

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

const evidenceRoot = path.join(auditRoot, 'evidence')
for (const file of (await readdir(evidenceRoot).catch(() => [])).filter(name => name.endsWith('.json'))) {
  const evidence = JSON.parse(await readFile(path.join(evidenceRoot, file), 'utf8'))
  assert.equal(evidence.catalogVersion, catalogVersion)
  assert.equal(evidence.catalogHash, catalogHash)
  for (const screenshot of evidence.screenshots ?? []) {
    await access(path.join(evidenceRoot, screenshot))
    await access(path.join(reportRoot, 'screenshots', path.basename(screenshot)))
  }
}

console.log(JSON.stringify({ status: 'pass', registered: catalogDescriptors.length, targeted: targets.size, evidence: report.ranking.filter(testCase => testCase.run).length }))
