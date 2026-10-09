import assert from 'node:assert/strict'
import { mkdir, readFile, readdir, writeFile, copyFile, rm } from 'node:fs/promises'
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
const incidents = JSON.parse(await readFile(path.join(auditRoot, 'incidents.json'), 'utf8')).items
const findings = JSON.parse(await readFile(path.join(auditRoot, 'findings.json'), 'utf8')).items
const defaultVerificationSource = JSON.parse(await readFile(path.join(auditRoot, 'default-verification', 'verification.json'), 'utf8'))
const defaultVerification = {
  ...defaultVerificationSource,
  results: defaultVerificationSource.results.map(result => ({
    ...result,
    screenshotPath: `screenshots/defaults/${path.basename(result.screenshotPath)}`
  }))
}
assert.equal(manifest.catalogVersion, catalogVersion)
assert.equal(manifest.catalogHash, catalogHash)

const evidenceFiles = (await readdir(evidenceRoot).catch(() => [])).filter(file => file.endsWith('.json')).sort()
const evidence = await Promise.all(evidenceFiles.map(async file => ({ ...JSON.parse(await readFile(path.join(evidenceRoot, file), 'utf8')), evidenceFile: file })))
const evidenceById = new Map()
for (const item of evidence) evidenceById.set(item.id, [...(evidenceById.get(item.id) ?? []), item])
const scoresById = new Map(scoreFile.scores.map(score => [score.id, score]))
const componentScoresByName = new Map(componentScoreFile.scores.map(score => [score.name, score]))
const descriptorNames = new Set(catalogDescriptors.map(descriptor => descriptor.name))
for (const item of evidence) {
  assert.equal(item.catalogVersion, catalogVersion, `${item.id} catalog version drift`)
  assert.equal(item.catalogHash, catalogHash, `${item.id} catalog hash drift`)
  for (const name of item.modelGeneratedComponents) assert.ok(descriptorNames.has(name), `${item.id} contains unknown component ${name}`)
}

function cleanRun(run) {
  return run.acceptedSceneCount > 0
    && run.errors.length === 0
    && run.chatStatuses.every(status => status === 200)
    && !['failure', 'resolved-failure'].includes(run.outcome?.status)
}

function blockingFailure(run) {
  return !cleanRun(run) && run.outcome?.status !== 'resolved-failure'
}

function weightedScore(score) {
  if (!score) return null
  const values = ['dailyUsefulness', 'completeness', 'correctness'].map(key => score[key])
  assert.ok(values.every(value => Number.isFinite(value) && value >= 0 && value <= 5), `${score.id} scores must be from 0 to 5`)
  return Number((score.dailyUsefulness * 0.4 + score.completeness * 0.3 + score.correctness * 0.3).toFixed(2))
}

const screenshotsOf = run => (run?.screenshots ?? []).map(screenshot => typeof screenshot === 'string'
  ? { path: screenshot, role: 'unclassified', cssViewport: null, pixelDimensions: null, sha256: null }
  : screenshot)

function namedSuccessfulAction(run) {
  const interaction = run?.interactionEvidence
  if (!interaction || typeof interaction !== 'object') return false
  if (interaction.success === false) return false
  const meaningfulKeys = Object.keys(interaction).filter(key => !['chatRequestDelta', 'noHorizontalOverflow', 'noHorizontalOverflowAt390'].includes(key))
  return meaningfulKeys.length > 0
}

function responsiveEvidence(runs) {
  const screenshots = runs.flatMap(screenshotsOf)
  const desktop = screenshots.some(screenshot => screenshot.role === 'desktop' && screenshot.cssViewport?.width >= 1024)
  const mobile = screenshots.some(screenshot => screenshot.role === 'mobile' && screenshot.cssViewport?.width === 390)
  return { desktop, mobile, complete: desktop && mobile }
}

function distinctRuns(runs) {
  const seen = new Set()
  return runs.filter(run => {
    const key = `${run.runAt ?? 'unknown'}:${run.sourceEvidenceSha256 ?? run.sourceEvidence ?? run.evidenceFile}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const cases = manifest.cases.map(testCase => {
  const runs = distinctRuns(evidenceById.get(testCase.id) ?? [])
  const validRuns = runs.filter(cleanRun)
  const run = [...runs].sort((left, right) => Number(responsiveEvidence([right]).complete) - Number(responsiveEvidence([left]).complete)
    || Number(right.acceptedSceneCount > 0 && right.errors.length === 0) - Number(left.acceptedSceneCount > 0 && left.errors.length === 0)
    || Number(namedSuccessfulAction(right)) - Number(namedSuccessfulAction(left))
    || String(right.runAt ?? '').localeCompare(String(left.runAt ?? '')))[0]
  const score = scoresById.get(testCase.id)
  const total = weightedScore(score)
  const meaningfulActionTested = validRuns.some(namedSuccessfulAction)
  const caseFindings = findings.filter(finding => finding.caseId === testCase.id)
  const responsive = responsiveEvidence(validRuns)
  const failedSibling = runs.some(blockingFailure)
  const openError = caseFindings.some(finding => finding.severity === 'error' && finding.status === 'open')
  const eligibleForDefault = Boolean(run && score && score.completeness >= 4 && score.correctness >= 4 && meaningfulActionTested && validRuns.length >= 2 && responsive.complete && !failedSibling && !openError)
  return { ...testCase, run: run ?? null, runs, validRuns: validRuns.length, repeatability: validRuns.length, responsiveEvidence: responsive, failedSibling, meaningfulActionTested, findings: caseFindings, score: score ? { ...score, total } : null, eligibleForDefault }
})
cases.sort((left, right) => (right.score?.total ?? -1) - (left.score?.total ?? -1)
  || (right.score?.correctness ?? -1) - (left.score?.correctness ?? -1)
  || (right.score?.completeness ?? -1) - (left.score?.completeness ?? -1)
  || (right.score?.dailyUsefulness ?? -1) - (left.score?.dailyUsefulness ?? -1)
  || right.repeatability - left.repeatability
  || left.id.localeCompare(right.id))

const generatedBy = new Map()
const internalBy = new Map()
const generatedFactsBy = new Map()
const internalFactsBy = new Map()
for (const item of evidence) {
  if (item.acceptedSceneCount <= 0) continue
  for (const component of item.modelGeneratedComponents) {
    generatedBy.set(component, [...(generatedBy.get(component) ?? []), item.id])
    generatedFactsBy.set(component, [...(generatedFactsBy.get(component) ?? []), {
      caseId: item.id,
      evidenceFile: item.evidenceFile,
      sourceEvidenceSha256: item.sourceEvidenceSha256,
      observation: 'Appeared in this archived accepted model-authored scene.'
    }])
  }
  for (const component of item.internallyRenderedComponents) {
    internalBy.set(component, [...(internalBy.get(component) ?? []), item.id])
    internalFactsBy.set(component, [...(internalFactsBy.get(component) ?? []), {
      caseId: item.id,
      evidenceFile: item.evidenceFile,
      sourceEvidenceSha256: item.sourceEvidenceSha256,
      observation: 'Rendered as a fixed child of this accepted composite; not selected directly by the model.'
    }])
  }
}
const components = catalogDescriptors.map(descriptor => {
  const directCases = generatedBy.get(descriptor.name) ?? []
  const internalCases = internalBy.get(descriptor.name) ?? []
  const targetedBy = manifest.cases.filter(testCase => testCase.targets.includes(descriptor.name)).map(testCase => testCase.id)
  const explicitFacts = evidence.flatMap(item => item.componentEvidence?.[descriptor.name] ? [{ caseId: item.id, evidenceFile: item.evidenceFile, ...item.componentEvidence[descriptor.name] }] : [])
  const componentFacts = explicitFacts.length ? explicitFacts : [...(generatedFactsBy.get(descriptor.name) ?? []), ...(internalFactsBy.get(descriptor.name) ?? [])]
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
await rm(path.join(reportRoot, 'screenshots'), { recursive: true, force: true })
await mkdir(path.join(reportRoot, 'screenshots'), { recursive: true })
for (const item of evidence) {
  for (const screenshot of item.screenshots ?? []) {
    const screenshotPath = typeof screenshot === 'string' ? screenshot : screenshot.path
    await copyFile(path.join(evidenceRoot, screenshotPath), path.join(reportRoot, 'screenshots', path.basename(screenshotPath)))
  }
}
await mkdir(path.join(reportRoot, 'screenshots', 'defaults'), { recursive: true })
for (const result of defaultVerificationSource.results) {
  await copyFile(
    path.join(auditRoot, 'default-verification', result.screenshotPath),
    path.join(reportRoot, 'screenshots', 'defaults', path.basename(result.screenshotPath))
  )
}
await rm(path.join(reportRoot, 'diagnostics'), { recursive: true, force: true })
await mkdir(path.join(reportRoot, 'diagnostics'), { recursive: true })
for (const file of await readdir(path.join(auditRoot, 'diagnostics'))) {
  await copyFile(path.join(auditRoot, 'diagnostics', file), path.join(reportRoot, 'diagnostics', file))
}
const casesWithEvidence = cases.filter(testCase => testCase.runs.length > 0).length
const acceptedCases = cases.filter(testCase => testCase.runs.some(run => run.acceptedSceneCount > 0)).length
const plannedWithoutRun = cases.filter(testCase => testCase.runs.length === 0).length
const attemptedWithoutAcceptedScene = cases.filter(testCase => testCase.runs.length > 0 && !testCase.runs.some(run => run.acceptedSceneCount > 0)).length
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  catalogVersion,
  catalogHash,
  rubric: manifest.rubric,
  scope: {
    registeredAgentVisibleComponents: catalogDescriptors.length,
    modelGeneratedComponents: directCount,
    rankedCases: cases.length,
    evidenceAttempts: evidence.length,
    casesWithEvidence,
    acceptedCases,
    plannedWithoutRun,
    attemptedWithoutAcceptedScene,
    definition: 'Finite current registered catalog. Direct generation means the descriptor appeared in a persisted model-authored present tree.'
  },
  ranking: cases,
  topDefaults: topDefaults.map(testCase => ({ id: testCase.id, title: testCase.title, prompt: testCase.prompt, family: testCase.family, score: testCase.score })),
  components,
  componentRanking: componentRanking.map(component => ({ name: component.name, group: component.group, status: component.status, score: component.score })),
  hostOwned,
  incidents,
  findings,
  defaultVerification
}
await writeFile(path.join(reportRoot, 'capability-audit.json'), `${JSON.stringify(report, null, 2)}\n`)

const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const scorePills = score => score ? `<div class="scores"><span>Daily ${score.dailyUsefulness}/5</span><span>Complete ${score.completeness}/5</span><span>Correct ${score.correctness}/5</span><strong>${score.total}/5</strong></div>` : '<div class="scores"><span>Not scored</span></div>'
const screenshotMarkup = run => screenshotsOf(run).map(screenshot => {
  const dimensions = screenshot.cssViewport ? `${screenshot.cssViewport.width}×${screenshot.cssViewport.height} CSS px` : 'CSS viewport not recorded'
  const source = screenshot.path.replace(/^screenshots\//, 'screenshots/')
  return `<figure><a href="${escapeHtml(source)}"><img loading="lazy" src="${escapeHtml(source)}" alt="${escapeHtml(screenshot.role)} evidence screenshot"></a><figcaption>${escapeHtml(screenshot.role)} · ${escapeHtml(dimensions)}</figcaption></figure>`
}).join('')
const attemptLabel = run => run.outcome?.label ?? (cleanRun(run) ? 'clean accepted run' : run.acceptedSceneCount > 0 ? 'accepted scene with finding' : 'no accepted scene')
const attemptsMarkup = testCase => testCase.runs.map((run, index) => `<details class="attempt"><summary>Attempt ${index + 1} · ${escapeHtml(attemptLabel(run))}</summary><div class="shots">${screenshotMarkup(run)}</div><pre>${escapeHtml(JSON.stringify({evidenceFile:run.evidenceFile,sourceEvidenceSha256:run.sourceEvidenceSha256,outcome:run.outcome,statuses:run.chatStatuses,elapsedMs:run.elapsedMs,errors:run.errors,warnings:run.warnings,interaction:run.interactionEvidence},null,2))}</pre></details>`).join('')
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Generative travel UI capability audit</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#17233c;background:#f4f6fb}*{box-sizing:border-box}html,body{max-width:100%;overflow-x:hidden}body{margin:0}header{padding:48px clamp(20px,5vw,72px);color:white;background:linear-gradient(135deg,#111b3f,#2954c8)}h1{max-width:880px;font-size:clamp(2rem,5vw,4.5rem);line-height:1;margin:.2em 0}header p{max-width:760px;font-size:1.08rem;line-height:1.6}.summary{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.summary span{padding:10px 14px;border-radius:999px;background:#ffffff1f;border:1px solid #ffffff38}main{max-width:1440px;min-width:0;margin:auto;padding:28px clamp(16px,4vw,56px) 80px}nav{position:sticky;top:0;z-index:2;display:flex;gap:8px;overflow:auto;padding:12px 0;background:#f4f6fbe8;backdrop-filter:blur(14px)}button,input,select{font:inherit}nav button,.copy{white-space:nowrap;border:1px solid #cbd3e7;background:white;border-radius:999px;padding:9px 14px;cursor:pointer}.filters{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.filters input,.filters select{min-width:min(260px,100%);padding:10px 12px;border:1px solid #cbd3e7;border-radius:10px;background:white}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:18px}.card{min-width:0;background:white;border:1px solid #dce2ef;border-radius:18px;padding:20px;box-shadow:0 12px 30px #1d31580d}.rank{font-weight:800;color:#2954c8}.family{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:#66718a}.prompt{padding:14px;border-radius:12px;background:#f2f5fb;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.travel-finding{padding:12px;border-left:4px solid #b13b2e;background:#fff2ef;color:#70261e}.scores{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0}.scores span,.scores strong{padding:6px 9px;border-radius:8px;background:#eaf0ff;font-size:.82rem}.scores strong{background:#17233c;color:white}.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:8px;margin-top:14px}.shots figure{min-width:0;margin:0}.shots img{width:100%;max-height:420px;object-fit:cover;object-position:top;border:1px solid #dce2ef;border-radius:10px}.shots figcaption{font-size:.74rem;color:#66718a}.components{display:flex;flex-wrap:wrap;gap:6px}.components span{font-size:.76rem;padding:5px 8px;border-radius:999px;background:#eef1f7}.coverage-wrap{max-width:100%;overflow:auto;border-radius:12px}.coverage{width:100%;min-width:820px;border-collapse:collapse;background:white}.coverage th,.coverage td{text-align:left;padding:11px;border-bottom:1px solid #e1e6f0;vertical-align:top}.coverage th{position:sticky;top:57px;background:#17233c;color:white}.status{font-weight:700}.model-generated{color:#087443}.attempted-not-observed{color:#a25800}.internal-only{color:#6e49a8}.not-targeted{color:#7a8192}.host{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:12px}.host article{padding:16px;background:#fff4de;border-radius:12px}section{min-width:0;scroll-margin-top:70px}details{max-width:100%;margin-top:10px}pre{max-width:100%;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}footer{padding:24px;color:#66718a}@media(max-width:620px){header{padding-top:32px}.coverage th{position:static}}
</style></head><body>
<header><p class="family">Real agent, real synthetic fare data</p><h1>Generative travel UI capability audit</h1><p>This report tests the finite registered catalog, not an open-ended set of component combinations. It separates model-authored nodes from fixed internal composites and host-owned UI.</p><div class="summary"><span>${catalogDescriptors.length} registered</span><span>${directCount} model-generated</span><span>${evidence.length} evidence attempts</span><span>${acceptedCases} accepted cases</span><span>${plannedWithoutRun} planned/unrun</span><span>${attemptedWithoutAcceptedScene} attempted without accepted scene</span><span>${topDefaults.length} default candidates</span></div></header>
<main><nav><button onclick="document.querySelector('#defaults').scrollIntoView()">Top defaults</button><button onclick="document.querySelector('#ranking').scrollIntoView()">Ranking</button><button onclick="document.querySelector('#coverage').scrollIntoView()">49-component ledger</button><button onclick="document.querySelector('#host').scrollIntoView()">Host-owned UI</button></nav>
<section id="defaults"><h2>Top four verified defaults</h2><p>${defaultVerification.results.length}/8 isolated desktop and 390 px clicks sent the exact ranked prompt once, with zero forwarded model calls during interception and no layout overflow.</p><div class="grid">${topDefaults.map((testCase,index)=>`<article class="card"><div class="rank">#${index+1}</div><h3>${escapeHtml(testCase.title)}</h3><div class="prompt">${escapeHtml(testCase.prompt)}</div><button class="copy" data-prompt="${escapeHtml(testCase.prompt)}">Copy prompt</button></article>`).join('') || '<p>Four candidates have not passed every eligibility gate yet.</p>'}</div></section>
<section id="ranking"><h2>Prompt ranking</h2><p>Score = 40% daily usefulness + 30% completeness + 30% correctness. A default needs completeness ≥4, correctness ≥4, a named successful local action, genuine desktop and 390 px evidence, two distinct successful runs, no failed sibling or open error, and a distinct primary task family.</p><div class="filters"><label>Search <input id="case-search" type="search" placeholder="Prompt, component, or finding"></label><label>Family <select id="family-filter"><option value="">All families</option>${[...new Set(cases.map(testCase=>testCase.family))].sort().map(family=>`<option>${escapeHtml(family)}</option>`).join('')}</select></label></div><div class="grid" id="case-grid">
${cases.map((testCase, index) => `<article class="card case-card" data-family="${escapeHtml(testCase.family)}" data-search="${escapeHtml([testCase.title,testCase.prompt,testCase.family,...testCase.runs.flatMap(run=>run.modelGeneratedComponents),...testCase.findings.map(finding=>finding.observed)].join(' ').toLowerCase())}"><div class="rank">#${index + 1}</div><p class="family">${escapeHtml(testCase.family)} · ${testCase.repeatability} distinct successful run${testCase.repeatability===1?'':'s'} · ${testCase.eligibleForDefault?'default eligible':'not default eligible'}</p><h3>${escapeHtml(testCase.title)}</h3>${scorePills(testCase.score)}<div class="prompt">${escapeHtml(testCase.prompt)}</div><button class="copy" data-prompt="${escapeHtml(testCase.prompt)}">Copy prompt</button><p>${escapeHtml(testCase.score?.rationale ?? testCase.run?.notes ?? 'Evidence or scoring is still pending.')}</p>${testCase.findings.map(finding=>`<p class="travel-finding"><strong>${escapeHtml(finding.id)}</strong>: ${escapeHtml(finding.observed)}</p>`).join('')}<div class="components">${[...new Set(testCase.validRuns ? testCase.runs.filter(run=>run.acceptedSceneCount>0).flatMap(run=>run.modelGeneratedComponents) : [])].map(name => `<span>${escapeHtml(name)}</span>`).join('')}</div>${attemptsMarkup(testCase)}</article>`).join('')}
</div></section>
<section id="coverage"><h2>Registered component ledger</h2><p>A green row means the descriptor appeared in an accepted persisted model-authored scene. Internal-only rows are visible through a fixed composite but were not selected directly by the model. Component scores judge the component itself, separately from the usefulness of any one prompt.</p><div class="filters"><label>Filter components <input id="component-search" type="search" placeholder="Name, group, capability"></label><label>Status <select id="status-filter"><option value="">All statuses</option><option>model-generated</option><option>internal-only</option><option>attempted-not-observed</option><option>not-targeted</option></select></label></div><div class="coverage-wrap"><table class="coverage"><thead><tr><th>Component</th><th>Group</th><th>Status</th><th>Scores</th><th>Evidence</th><th>Reason and capability</th></tr></thead><tbody>${componentRanking.map(component => `<tr data-status="${escapeHtml(component.status)}" data-search="${escapeHtml([component.name,component.group,component.description,component.score?.rationale].join(' ').toLowerCase())}"><td><strong>${escapeHtml(component.name)}</strong></td><td>${escapeHtml(component.group)}</td><td class="status ${component.status}">${escapeHtml(component.status)}</td><td>${component.score ? `Daily ${escapeHtml(component.score.dailyUsefulness)}/5<br>Complete ${escapeHtml(component.score.completeness)}/5<br>Correct ${escapeHtml(component.score.correctness)}/5<br><strong>${escapeHtml(component.score.total.toFixed(2))}/5</strong>` : 'Pending'}</td><td>${escapeHtml(component.directCases.join(', ') || component.internalCases.join(', ') || component.targetedBy.join(', ') || 'None')}</td><td>${escapeHtml(component.score?.rationale ?? 'No score rationale.')}<br><small>${escapeHtml(component.description)}</small></td></tr>`).join('')}</tbody></table></div></section>
<section id="host"><h2>Host-owned and internal UI</h2><p>These are part of the product but are intentionally absent from the agent catalog.</p><div class="host">${hostOwned.map(item => `<article><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.reason)}</p></article>`).join('')}</div><h2>Audit incidents</h2><div class="host">${incidents.map(item => `<article><h3>${escapeHtml(item.id)}</h3><p>${escapeHtml(item.classification)}. ${escapeHtml(item.resolution)}</p></article>`).join('')}</div></section></main>
<footer>Catalog ${catalogVersion} · ${catalogHash}</footer><script>
const caseSearch=document.querySelector('#case-search'),familyFilter=document.querySelector('#family-filter');function filterCases(){const q=caseSearch.value.toLowerCase(),family=familyFilter.value;document.querySelectorAll('.case-card').forEach(card=>card.hidden=!(card.dataset.search.includes(q)&&(!family||card.dataset.family===family)))}caseSearch.addEventListener('input',filterCases);familyFilter.addEventListener('change',filterCases);
const componentSearch=document.querySelector('#component-search'),statusFilter=document.querySelector('#status-filter');function filterComponents(){const q=componentSearch.value.toLowerCase(),status=statusFilter.value;document.querySelectorAll('.coverage tbody tr').forEach(row=>row.hidden=!(row.dataset.search.includes(q)&&(!status||row.dataset.status===status)))}componentSearch.addEventListener('input',filterComponents);statusFilter.addEventListener('change',filterComponents);
document.querySelectorAll('.copy').forEach(button=>button.addEventListener('click',async()=>{await navigator.clipboard.writeText(button.dataset.prompt);button.textContent='Copied';setTimeout(()=>button.textContent='Copy prompt',1200)}));
</script></body></html>`
await writeFile(path.join(reportRoot, 'index.html'), html)
console.log(JSON.stringify({ report: path.relative(root, reportRoot), cases: cases.length, evidence: evidence.length, registered: components.length, modelGenerated: directCount, topDefaults: topDefaults.map(item => item.id) }))
