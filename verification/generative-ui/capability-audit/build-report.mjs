import assert from 'node:assert/strict'
import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { catalogDescriptors, catalogHash, catalogVersion } from '../../../src/generative/catalog/generated/catalog.ts'

const root = process.cwd()
const auditRoot = path.join(root, 'verification/generative-ui/capability-audit')
const evidenceRoot = path.join(auditRoot, 'evidence')
const reportRoot = path.join(root, 'reports/generative-capabilities')
const manifest = JSON.parse(await readFile(path.join(auditRoot, 'cases.json'), 'utf8'))
const scoreFile = JSON.parse(await readFile(path.join(auditRoot, 'scores.json'), 'utf8'))
const componentScoreFile = JSON.parse(await readFile(path.join(auditRoot, 'component-scores.json'), 'utf8'))
const hostOwned = JSON.parse(await readFile(path.join(auditRoot, 'host-owned.json'), 'utf8')).items
assert.equal(manifest.catalogVersion, catalogVersion)
assert.equal(manifest.catalogHash, catalogHash)

const evidenceFiles = (await readdir(evidenceRoot).catch(() => [])).filter(file => file.endsWith('.json')).sort()
const evidence = await Promise.all(evidenceFiles.map(async file => JSON.parse(await readFile(path.join(evidenceRoot, file), 'utf8'))))
const evidenceById = new Map(evidence.map(item => [item.id, item]))
const scoresById = new Map(scoreFile.scores.map(score => [score.id, score]))
const componentScoresByName = new Map(componentScoreFile.scores.map(score => [score.name, score]))
const descriptorNames = new Set(catalogDescriptors.map(descriptor => descriptor.name))
for (const item of evidence) {
  assert.equal(item.catalogVersion, catalogVersion, `${item.id} catalog version drift`)
  assert.equal(item.catalogHash, catalogHash, `${item.id} catalog hash drift`)
  for (const name of item.modelGeneratedComponents) assert.ok(descriptorNames.has(name), `${item.id} contains unknown component ${name}`)
}

function weightedScore(score) {
  if (!score) return null
  const values = ['dailyUsefulness', 'completeness', 'correctness'].map(key => score[key])
  assert.ok(values.every(value => Number.isFinite(value) && value >= 0 && value <= 5), `${score.id} scores must be from 0 to 5`)
  return Number((score.dailyUsefulness * 0.4 + score.completeness * 0.3 + score.correctness * 0.3).toFixed(2))
}

const cases = manifest.cases.map(testCase => {
  const run = evidenceById.get(testCase.id)
  const score = scoresById.get(testCase.id)
  const total = weightedScore(score)
  const eligibleForDefault = Boolean(run && score && score.completeness >= 4 && score.correctness >= 4 && score.meaningfulActionTested === true && score.repeatability >= 1 && run.errors.length === 0)
  return { ...testCase, run: run ?? null, score: score ? { ...score, total } : null, eligibleForDefault }
})
cases.sort((left, right) => (right.score?.total ?? -1) - (left.score?.total ?? -1)
  || (right.score?.correctness ?? -1) - (left.score?.correctness ?? -1)
  || (right.score?.completeness ?? -1) - (left.score?.completeness ?? -1)
  || (right.score?.dailyUsefulness ?? -1) - (left.score?.dailyUsefulness ?? -1)
  || left.id.localeCompare(right.id))

const generatedBy = new Map()
const internalBy = new Map()
for (const item of evidence) {
  for (const component of item.modelGeneratedComponents) generatedBy.set(component, [...(generatedBy.get(component) ?? []), item.id])
  for (const component of item.internallyRenderedComponents) internalBy.set(component, [...(internalBy.get(component) ?? []), item.id])
}
const components = catalogDescriptors.map(descriptor => {
  const directCases = generatedBy.get(descriptor.name) ?? []
  const internalCases = internalBy.get(descriptor.name) ?? []
  const targetedBy = manifest.cases.filter(testCase => testCase.targets.includes(descriptor.name)).map(testCase => testCase.id)
  const componentFacts = evidence.flatMap(item => item.componentEvidence?.[descriptor.name] ? [{ caseId: item.id, ...item.componentEvidence[descriptor.name] }] : [])
  const score = componentScoresByName.get(descriptor.name)
  return {
    ...descriptor,
    directCases,
    internalCases,
    targetedBy,
    componentFacts,
    status: directCases.length ? 'model-generated' : internalCases.length ? 'internal-only' : targetedBy.length ? 'attempted-not-observed' : 'not-targeted',
    score: score ? { ...score, total: weightedScore(score) } : null
  }
})
const componentRanking = [...components].sort((left, right) => (right.score?.total ?? -1) - (left.score?.total ?? -1)
  || (right.score?.correctness ?? -1) - (left.score?.correctness ?? -1)
  || (right.score?.completeness ?? -1) - (left.score?.completeness ?? -1)
  || (right.score?.dailyUsefulness ?? -1) - (left.score?.dailyUsefulness ?? -1)
  || left.name.localeCompare(right.name))
const directCount = components.filter(component => component.status === 'model-generated').length
const topDefaults = []
for (const testCase of cases) {
  if (!testCase.eligibleForDefault || topDefaults.some(selected => selected.family === testCase.family)) continue
  topDefaults.push(testCase)
  if (topDefaults.length === 4) break
}

await mkdir(reportRoot, { recursive: true })
await mkdir(path.join(reportRoot, 'screenshots'), { recursive: true })
for (const item of evidence) {
  for (const screenshot of item.screenshots ?? []) {
    await copyFile(path.join(evidenceRoot, screenshot), path.join(reportRoot, 'screenshots', path.basename(screenshot)))
  }
}
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  catalogVersion,
  catalogHash,
  rubric: manifest.rubric,
  scope: {
    registeredAgentVisibleComponents: catalogDescriptors.length,
    modelGeneratedComponents: directCount,
    definition: 'Finite current registered catalog. Direct generation means the descriptor appeared in a persisted model-authored present tree.'
  },
  ranking: cases,
  topDefaults: topDefaults.map(testCase => ({ id: testCase.id, title: testCase.title, prompt: testCase.prompt, family: testCase.family, score: testCase.score })),
  components,
  componentRanking: componentRanking.map(component => ({ name: component.name, group: component.group, status: component.status, score: component.score })),
  hostOwned
}
await writeFile(path.join(reportRoot, 'capability-audit.json'), `${JSON.stringify(report, null, 2)}\n`)

const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const scorePills = score => score ? `<div class="scores"><span>Daily ${score.dailyUsefulness}/5</span><span>Complete ${score.completeness}/5</span><span>Correct ${score.correctness}/5</span><strong>${score.total}/5</strong></div>` : '<div class="scores"><span>Not scored</span></div>'
const screenshotMarkup = run => (run?.screenshots ?? []).map((screenshot, index) => `<a href="${escapeHtml(screenshot.replace(/^screenshots\//, 'screenshots/'))}"><img loading="lazy" src="${escapeHtml(screenshot.replace(/^screenshots\//, 'screenshots/'))}" alt="${index ? 'Mobile' : 'Desktop'} evidence screenshot"></a>`).join('')
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Generative travel UI capability audit</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#17233c;background:#f4f6fb}*{box-sizing:border-box}body{margin:0}header{padding:48px clamp(20px,5vw,72px);color:white;background:linear-gradient(135deg,#111b3f,#2954c8)}h1{max-width:880px;font-size:clamp(2rem,5vw,4.5rem);line-height:1;margin:.2em 0}header p{max-width:760px;font-size:1.08rem;line-height:1.6}.summary{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.summary span{padding:10px 14px;border-radius:999px;background:#ffffff1f;border:1px solid #ffffff38}main{max-width:1440px;margin:auto;padding:28px clamp(16px,4vw,56px) 80px}nav{position:sticky;top:0;z-index:2;display:flex;gap:8px;overflow:auto;padding:12px 0;background:#f4f6fbe8;backdrop-filter:blur(14px)}nav button{white-space:nowrap;border:1px solid #cbd3e7;background:white;border-radius:999px;padding:9px 14px;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:18px}.card{background:white;border:1px solid #dce2ef;border-radius:18px;padding:20px;box-shadow:0 12px 30px #1d31580d}.rank{font-weight:800;color:#2954c8}.family{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:#66718a}.prompt{padding:14px;border-radius:12px;background:#f2f5fb;line-height:1.55;white-space:pre-wrap}.scores{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0}.scores span,.scores strong{padding:6px 9px;border-radius:8px;background:#eaf0ff;font-size:.82rem}.scores strong{background:#17233c;color:white}.shots{display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-top:14px}.shots img{width:100%;max-height:420px;object-fit:cover;object-position:top;border:1px solid #dce2ef;border-radius:10px}.components{display:flex;flex-wrap:wrap;gap:6px}.components span{font-size:.76rem;padding:5px 8px;border-radius:999px;background:#eef1f7}.coverage{width:100%;border-collapse:collapse;background:white}.coverage th,.coverage td{text-align:left;padding:11px;border-bottom:1px solid #e1e6f0;vertical-align:top}.coverage th{position:sticky;top:57px;background:#17233c;color:white}.status{font-weight:700}.model-generated{color:#087443}.attempted-not-observed{color:#a25800}.internal-only{color:#6e49a8}.not-targeted{color:#7a8192}.host{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.host article{padding:16px;background:#fff4de;border-radius:12px}section{scroll-margin-top:70px}details{margin-top:10px}footer{padding:24px;color:#66718a}@media(max-width:620px){header{padding-top:32px}.shots{grid-template-columns:1fr}.coverage{display:block;overflow-x:auto}.coverage th{position:static}}
</style></head><body>
<header><p class="family">Real agent, real synthetic fare data</p><h1>Generative travel UI capability audit</h1><p>This report tests the finite registered catalog, not an open-ended set of component combinations. It separates model-authored nodes from fixed internal composites and host-owned UI.</p><div class="summary"><span>${catalogDescriptors.length} registered</span><span>${directCount} model-generated</span><span>${evidence.length} prompts run</span><span>${topDefaults.length} default candidates</span></div></header>
<main><nav><button onclick="document.querySelector('#ranking').scrollIntoView()">Ranking</button><button onclick="document.querySelector('#coverage').scrollIntoView()">49-component ledger</button><button onclick="document.querySelector('#host').scrollIntoView()">Host-owned UI</button></nav>
<section id="ranking"><h2>Prompt ranking</h2><p>Score = 40% daily usefulness + 30% completeness + 30% correctness. A default needs completeness ≥4, correctness ≥4, a meaningful action test, at least one successful repeat, no recorded error, and a distinct primary task family. Ties break on correctness, completeness, usefulness, repeatability, then id.</p><div class="grid">
${cases.map((testCase, index) => `<article class="card" data-family="${escapeHtml(testCase.family)}"><div class="rank">#${index + 1}</div><p class="family">${escapeHtml(testCase.family)}</p><h3>${escapeHtml(testCase.title)}</h3>${scorePills(testCase.score)}<div class="prompt">${escapeHtml(testCase.prompt)}</div><p>${escapeHtml(testCase.score?.rationale ?? testCase.run?.notes ?? 'Evidence or scoring is still pending.')}</p><div class="components">${(testCase.run?.modelGeneratedComponents ?? []).map(name => `<span>${escapeHtml(name)}</span>`).join('')}</div><div class="shots">${screenshotMarkup(testCase.run)}</div><details><summary>Run facts</summary><pre>${escapeHtml(JSON.stringify({statuses:testCase.run?.chatStatuses,elapsedMs:testCase.run?.elapsedMs,errors:testCase.run?.errors,interaction:testCase.run?.interactionEvidence},null,2))}</pre></details></article>`).join('')}
</div></section>
<section id="coverage"><h2>Registered component ledger</h2><p>A green row means the descriptor appeared in a persisted model-authored scene. Internal-only rows are visible through a fixed composite but were not selected directly by the model. Component scores judge the component itself, separately from the usefulness of any one prompt.</p><table class="coverage"><thead><tr><th>Component</th><th>Group</th><th>Status</th><th>Score</th><th>Evidence</th><th>Capability</th></tr></thead><tbody>${componentRanking.map(component => `<tr><td><strong>${escapeHtml(component.name)}</strong></td><td>${escapeHtml(component.group)}</td><td class="status ${component.status}">${escapeHtml(component.status)}</td><td>${component.score ? escapeHtml(component.score.total.toFixed(2)) : 'Pending'}</td><td>${escapeHtml(component.directCases.join(', ') || component.internalCases.join(', ') || component.targetedBy.join(', ') || 'None')}</td><td>${escapeHtml(component.description)}</td></tr>`).join('')}</tbody></table></section>
<section id="host"><h2>Host-owned and internal UI</h2><p>These are part of the product but are intentionally absent from the agent catalog.</p><div class="host">${hostOwned.map(item => `<article><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.reason)}</p></article>`).join('')}</div></section></main>
<footer>Catalog ${catalogVersion} · ${catalogHash}</footer></body></html>`
await writeFile(path.join(reportRoot, 'index.html'), html)
console.log(JSON.stringify({ report: path.relative(root, reportRoot), cases: cases.length, evidence: evidence.length, registered: components.length, modelGenerated: directCount, topDefaults: topDefaults.map(item => item.id) }))
