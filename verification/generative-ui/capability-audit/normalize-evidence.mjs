import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const args = process.argv.slice(2)
const outputIndex = args.indexOf('--output')
const output = path.resolve(outputIndex >= 0 ? args[outputIndex + 1] : 'verification/generative-ui/capability-audit/evidence')
const labelIndex = args.indexOf('--run-label')
const runLabel = labelIndex >= 0 ? args[labelIndex + 1] : ''
assert.match(runLabel, /^[a-z0-9-]*$/, 'Run label must be lowercase letters, numbers, and hyphens')
const inputs = args.filter((value, index) => value !== '--output' && index !== outputIndex + 1 && value !== '--run-label' && index !== labelIndex + 1)
assert.ok(inputs.length, 'Pass one or more evidence JSON paths')
const manifest = JSON.parse(await readFile(path.join(root, 'verification/generative-ui/capability-audit/cases.json'), 'utf8'))
const byId = new Map(manifest.cases.map(testCase => [testCase.id, testCase]))
const byPrompt = new Map(manifest.cases.map(testCase => [testCase.prompt, testCase]))
await mkdir(output, { recursive: true })
await mkdir(path.join(output, 'screenshots'), { recursive: true })

function walkTypes(node, types = []) {
  if (!node || typeof node !== 'object') return types
  if (typeof node.$type === 'string') types.push(node.$type)
  const children = Array.isArray(node.children) ? node.children : node.children ? [node.children] : []
  for (const child of children) walkTypes(child, types)
  return types
}

function promptOf(raw) {
  return raw.prompt ?? raw.candidate?.text
}

function idOf(raw, prompt, inputPath) {
  const direct = raw.id ?? raw.candidate?.slug
  if (direct && byId.has(direct)) return direct
  const fromPrompt = byPrompt.get(prompt)?.id
  if (fromPrompt) return fromPrompt
  const base = path.basename(inputPath, path.extname(inputPath))
  if (byId.has(base)) return base
  throw new Error(`Cannot map ${inputPath} to a capability case`)
}

function errorsOf(raw) {
  return [...(raw.errors ?? []), ...(raw.consoleErrors ?? []), ...(raw.pageErrors ?? []), ...(raw.error ? [raw.error] : [])]
    .filter(value => !String(value).includes('favicon') && !String(value).includes('Failed to load resource: the server responded with a status of 404 (Not Found)'))
    .map(String)
}

function interactionOf(raw) {
  const interaction = raw.interactionEvidence ?? raw.interaction
  if (!interaction) return null
  if (typeof interaction === 'string') return { summary: interaction, chatRequestDelta: raw.localInteractionChatDelta ?? null }
  if (Array.isArray(interaction)) return interaction.length ? { steps: interaction, chatRequestDelta: raw.localInteractionChatDelta ?? null } : null
  const chatRequestDelta = interaction.chatRequestDelta
    ?? raw.localInteractionChatDelta
    ?? (Number.isFinite(interaction.chatRequestsBefore) && Number.isFinite(interaction.chatRequestsAfter) ? interaction.chatRequestsAfter - interaction.chatRequestsBefore : null)
  return { ...interaction, chatRequestDelta }
}

function parseViewport(value) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d+)x(\d+)$/)
    return match ? { width: Number(match[1]), height: Number(match[2]) } : null
  }
  if (value && Number.isFinite(value.width) && Number.isFinite(value.height)) {
    return { width: value.width, height: value.height }
  }
  return null
}

function pngDimensions(buffer) {
  const signature = '89504e470d0a1a0a'
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature) return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

function screenshotRole(candidate, explicitRole) {
  if (explicitRole) return explicitRole
  const name = path.basename(candidate).toLowerCase()
  if (name.includes('failed') || name.includes('failure') || name.includes('error')) return 'failure'
  if (name.includes('interactive')) return 'interaction'
  if (name.includes('mobile')) return 'mobile'
  if (name.includes('desktop')) return 'desktop'
  if (name.includes('bottom')) return 'detail'
  return 'desktop'
}

function screenshotCandidates(raw, inputPath) {
  const explicit = []
  const push = (candidate, role, cssViewport = null, condition = null) => {
    if (candidate) explicit.push({ candidate, role: screenshotRole(candidate, role), cssViewport: parseViewport(cssViewport), condition })
  }
  for (const screenshot of raw.screenshotEvidence ?? []) push(screenshot.path, screenshot.role, screenshot.cssViewport, screenshot.condition)
  const screenshotPaths = Array.isArray(raw.screenshotPath) ? raw.screenshotPath : raw.screenshotPath ? [raw.screenshotPath] : []
  for (const candidate of screenshotPaths) push(candidate)
  push(raw.screenshots?.desktop, 'desktop')
  push(raw.screenshots?.mobile, 'mobile')
  push(inputPath.replace(/\.json$/, '.png'), 'desktop')
  push(inputPath.replace(/\.json$/, '-mobile.png'), 'mobile')
  push(inputPath.replace(/\.json$/, '-interactive.png'), 'interaction')
  push(inputPath.replace(/\.json$/, '-bottom.png'), 'detail')
  return explicit
}

for (const input of inputs) {
  const inputPath = path.resolve(input)
  const rawBytes = await readFile(inputPath)
  const raw = JSON.parse(rawBytes.toString('utf8'))
  const prompt = promptOf(raw)
  const id = idOf(raw, prompt, inputPath)
  const testCase = byId.get(id)
  assert.equal(prompt, testCase.prompt, `${id} prompt must match the verified case exactly`)
  const scene = raw.latestScene ?? raw.tree ?? raw.finalTree
  const sceneComponents = walkTypes(scene)
  const claimedGenerated = raw.modelGeneratedComponents ?? raw.componentTypes ?? raw.components ?? []
  const generated = sceneComponents.length ? sceneComponents : claimedGenerated
  const claimedGeneratedComponents = [...new Set(claimedGenerated)]
  const generatedComponents = [...new Set(generated)]
  const componentClaimMismatch = sceneComponents.length && JSON.stringify([...claimedGeneratedComponents].sort()) !== JSON.stringify([...generatedComponents].sort())
  const acceptedSceneCount = raw.acceptedSceneCount ?? raw.sceneCount ?? (scene ? 1 : 0)
  const normalized = {
    schemaVersion: 1,
    id,
    title: testCase.title,
    family: testCase.family,
    prompt,
    runAt: raw.runAt ?? raw.timestamp ?? null,
    catalogVersion: raw.catalogVersion ?? manifest.catalogVersion,
    catalogHash: raw.catalogHash ?? manifest.catalogHash,
    modelGeneratedComponents: generatedComponents,
    claimedModelGeneratedComponents: claimedGeneratedComponents,
    componentClaimMismatch,
    internallyRenderedComponents: raw.internallyRenderedComponents?.length ? raw.internallyRenderedComponents : testCase.internallyRendered ?? [],
    targetComponents: testCase.targets,
    acceptedSceneCount,
    rejectedSceneCount: raw.rejectedSceneCount ?? raw.tools?.filter(tool => tool.name === 'present' && tool.state === 'output-error').length ?? 0,
    chatStatuses: raw.chatStatuses ?? raw.responseStatuses ?? raw.chat?.filter(event => event.kind === 'response').map(event => event.status) ?? [],
    elapsedMs: raw.elapsedMs ?? null,
    interactionEvidence: interactionOf(raw),
    componentEvidence: raw.componentEvidence ?? {},
    errors: errorsOf(raw),
    warnings: raw.warnings ?? [],
    noHorizontalOverflowAt390: raw.noHorizontalOverflowAt390 ?? raw.mobileNoHorizontalOverflow ?? null,
    noHorizontalOverflowAtDesktop: raw.desktopNoHorizontalOverflow ?? null,
    notes: raw.notes ?? null,
    sourceEvidence: path.basename(inputPath),
    sourceEvidenceSha256: createHash('sha256').update(rawBytes).digest('hex')
  }
  assert.equal(normalized.catalogVersion, manifest.catalogVersion, `${id} catalog version drift`)
  assert.equal(normalized.catalogHash, manifest.catalogHash, `${id} catalog hash drift`)
  const screenshots = []
  const seenCandidates = new Set()
  const seenHashes = new Set()
  const viewports = (Array.isArray(raw.viewport) ? raw.viewport : raw.viewport ? [raw.viewport] : []).map(parseViewport).filter(Boolean)
  const viewportForRole = role => role === 'mobile'
    ? viewports.find(viewport => viewport.width <= 480) ?? null
    : viewports.find(viewport => viewport.width >= 1024) ?? null
  for (const { candidate, role, cssViewport, condition } of screenshotCandidates(raw, inputPath)) {
    const absoluteCandidate = path.resolve(candidate)
    if (seenCandidates.has(absoluteCandidate)) continue
    seenCandidates.add(absoluteCandidate)
    try {
      const bytes = await readFile(absoluteCandidate)
      const sha256 = createHash('sha256').update(bytes).digest('hex')
      if (seenHashes.has(sha256)) continue
      seenHashes.add(sha256)
      const extension = path.extname(candidate) || '.png'
      const sameRoleCount = screenshots.filter(screenshot => screenshot.role === role).length
      const suffix = `${role}${sameRoleCount ? `-${sameRoleCount + 1}` : ''}`
      const targetName = `${id}${runLabel ? `-${runLabel}` : ''}-${suffix}${extension}`
      await copyFile(absoluteCandidate, path.join(output, 'screenshots', targetName))
      screenshots.push({
        path: `screenshots/${targetName}`,
        role,
        cssViewport: cssViewport ?? viewportForRole(role),
        pixelDimensions: pngDimensions(bytes),
        sha256,
        condition
      })
    } catch {}
  }
  normalized.screenshots = screenshots
  await writeFile(path.join(output, `${id}${runLabel ? `-${runLabel}` : ''}.json`), `${JSON.stringify(normalized, null, 2)}\n`)
  console.log(JSON.stringify({ id, components: normalized.modelGeneratedComponents.length, screenshots: normalized.screenshots.length }))
}
