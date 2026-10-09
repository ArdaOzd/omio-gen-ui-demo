import assert from 'node:assert/strict'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const args = process.argv.slice(2)
const outputIndex = args.indexOf('--output')
const output = path.resolve(outputIndex >= 0 ? args[outputIndex + 1] : 'verification/generative-ui/capability-audit/evidence')
const inputs = args.filter((value, index) => value !== '--output' && index !== outputIndex + 1)
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
  return [...(raw.errors ?? []), ...(raw.consoleErrors ?? []), ...(raw.pageErrors ?? [])]
    .filter(value => !String(value).includes('favicon'))
    .map(String)
}

for (const input of inputs) {
  const inputPath = path.resolve(input)
  const raw = JSON.parse(await readFile(inputPath, 'utf8'))
  const prompt = promptOf(raw)
  const id = idOf(raw, prompt, inputPath)
  const testCase = byId.get(id)
  assert.equal(prompt, testCase.prompt, `${id} prompt must match the verified case exactly`)
  const scene = raw.latestScene ?? raw.tree
  const sceneComponents = walkTypes(scene)
  const generated = raw.modelGeneratedComponents ?? raw.componentTypes ?? (sceneComponents.length ? sceneComponents : raw.components ?? [])
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
    modelGeneratedComponents: [...new Set(generated)],
    internallyRenderedComponents: raw.internallyRenderedComponents ?? [],
    targetComponents: testCase.targets,
    acceptedSceneCount,
    rejectedSceneCount: raw.rejectedSceneCount ?? raw.tools?.filter(tool => tool.name === 'present' && tool.state === 'output-error').length ?? 0,
    chatStatuses: raw.chatStatuses ?? raw.responseStatuses ?? raw.chat?.filter(event => event.kind === 'response').map(event => event.status) ?? [],
    elapsedMs: raw.elapsedMs ?? null,
    interactionEvidence: raw.interactionEvidence ?? raw.interaction ?? null,
    componentEvidence: raw.componentEvidence ?? {},
    errors: errorsOf(raw),
    warnings: raw.warnings ?? [],
    noHorizontalOverflowAt390: raw.noHorizontalOverflowAt390 ?? raw.interaction?.noHorizontalOverflow ?? null,
    notes: raw.notes ?? null,
    sourceEvidence: path.relative(root, inputPath)
  }
  assert.equal(normalized.catalogVersion, manifest.catalogVersion, `${id} catalog version drift`)
  assert.equal(normalized.catalogHash, manifest.catalogHash, `${id} catalog hash drift`)
  const screenshots = []
  const candidatePaths = [
    raw.screenshots?.desktop,
    raw.screenshots?.mobile,
    inputPath.replace(/\.json$/, '.png'),
    inputPath.replace(/\.json$/, '-bottom.png')
  ].filter(Boolean)
  for (const candidate of candidatePaths) {
    try {
      const extension = path.extname(candidate) || '.png'
      const suffix = screenshots.length === 0 ? 'desktop' : screenshots.length === 1 ? 'mobile' : `extra-${screenshots.length + 1}`
      const targetName = `${id}-${suffix}${extension}`
      await copyFile(candidate, path.join(output, 'screenshots', targetName))
      screenshots.push(`screenshots/${targetName}`)
    } catch {}
  }
  normalized.screenshots = [...new Set(screenshots)]
  await writeFile(path.join(output, `${id}.json`), `${JSON.stringify(normalized, null, 2)}\n`)
  console.log(JSON.stringify({ id, components: normalized.modelGeneratedComponents.length, screenshots: normalized.screenshots.length }))
}
