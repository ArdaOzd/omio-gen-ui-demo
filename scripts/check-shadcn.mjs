import fs from "node:fs"
import crypto from "node:crypto"
import path from "node:path"
import process from "node:process"
import ts from "typescript"

const root = process.cwd()
const sourceRoot = path.join(root, "src")
const uiRoot = path.join(sourceRoot, "components", "ui")
const manifestPath = path.join(root, "shadcn-provenance.json")
const componentsPath = path.join(root, "components.json")

const rawWidgetTags = new Set([
  "button",
  "caption",
  "details",
  "dialog",
  "fieldset",
  "hr",
  "input",
  "label",
  "legend",
  "meter",
  "optgroup",
  "option",
  "progress",
  "select",
  "summary",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "tr",
])
const interactiveRoles = new Set([
  "button",
  "checkbox",
  "combobox",
  "dialog",
  "listbox",
  "menuitem",
  "option",
  "radio",
  "switch",
  "tab",
  "textbox",
])
const assistantInteractiveParts = new Set([
  "BranchPickerNext",
  "BranchPickerPrevious",
  "Cancel",
  "Input",
  "Reload",
  "Send",
  "Suggestion",
])

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return /\.[jt]sx$/.test(entry.name) ? [fullPath] : []
  })
}

function isProductionSource(file) {
  const relative = path.relative(sourceRoot, file)
  return (
    !relative.startsWith(`components${path.sep}ui${path.sep}`) &&
    !/\.(?:test|spec)\.[jt]sx$/.test(file)
  )
}

function jsxName(node) {
  if (ts.isIdentifier(node)) return node.text
  if (ts.isPropertyAccessExpression(node)) {
    return `${jsxName(node.expression)}.${jsxName(node.name)}`
  }
  if (ts.isJsxNamespacedName(node)) {
    return `${node.namespace.text}:${node.name.text}`
  }
  return node.getText()
}

function attributesOf(node) {
  return new Map(
    node.attributes.properties
      .filter(ts.isJsxAttribute)
      .map((attribute) => [attribute.name.text, attribute])
  )
}

function stringAttribute(attribute) {
  return attribute?.initializer && ts.isStringLiteral(attribute.initializer)
    ? attribute.initializer.text
    : undefined
}

function isDirectShadcnAsChild(node, shadcnBindings) {
  const element = ts.isJsxOpeningElement(node) ? node.parent : node
  const parent = element.parent
  if (!ts.isJsxElement(parent)) return false
  const parentName = jsxName(parent.openingElement.tagName)
  return (
    shadcnBindings.has(parentName) &&
    attributesOf(parent.openingElement).has("asChild")
  )
}

function location(sourceFile, node) {
  const point = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  return `${path.relative(root, sourceFile.fileName)}:${point.line + 1}:${point.character + 1}`
}

function scanJsx(file, violations, externalImports, allowedNative, seenNative) {
  const sourceText = fs.readFileSync(file, "utf8")
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JSX
  )
  const fileUiImports = new Set(
    sourceFile.statements.flatMap((node) => {
      if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return []
      const match = node.moduleSpecifier.text.match(/^@\/components\/ui\/([^/]+)$/)
      return match ? [match[1]] : []
    })
  )
  const shadcnBindings = new Set(
    sourceFile.statements.flatMap((node) => {
      if (
        !ts.isImportDeclaration(node) ||
        !ts.isStringLiteral(node.moduleSpecifier) ||
        !node.moduleSpecifier.text.startsWith("@/components/ui/")
      ) return []
      const bindings = node.importClause?.namedBindings
      if (!bindings || !ts.isNamedImports(bindings)) return []
      return bindings.elements.map((element) => element.name.text)
    })
  )

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const match = node.moduleSpecifier.text.match(/^@\/components\/ui\/([^/]+)$/)
      if (match) externalImports.add(match[1])
    }

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = jsxName(node.tagName)
      const attributes = attributesOf(node)
      const where = location(sourceFile, node)

      if (rawWidgetTags.has(name)) {
        violations.push(`${where} raw <${name}> must use the matching shadcn component`)
      }

      if (/^[a-z]/.test(name)) {
        const role = stringAttribute(attributes.get("role"))
        const compositionKey = `${path.relative(root, file)}:${name}:${role ?? ""}`
        const disguisedInteraction =
          attributes.has("onClick") ||
          attributes.has("tabIndex") ||
          (role !== undefined && interactiveRoles.has(role))
        const allowed = allowedNative.get(compositionKey)
        if (disguisedInteraction && isDirectShadcnAsChild(node, shadcnBindings)) {
          // The shadcn Slot owns the intrinsic element while preserving SVG/DOM geometry.
        } else if (disguisedInteraction && allowed !== undefined) {
          const missingBases = allowed.builtFrom.filter((component) => !fileUiImports.has(component))
          if (missingBases.length > 0) {
            violations.push(`${where} allowed native composition is missing shadcn imports: ${missingBases.join(", ")}`)
          } else {
            seenNative.add(compositionKey)
          }
        } else if (disguisedInteraction && !rawWidgetTags.has(name)) {
          violations.push(`${where} interactive <${name}> must compose a shadcn component`)
        }
      }

      const [primitive, part] = name.split(".")
      if (
        primitive?.endsWith("Primitive") &&
        part !== undefined &&
        assistantInteractiveParts.has(part) &&
        !attributes.has("asChild")
      ) {
        violations.push(`${where} ${name} must use asChild with a shadcn component`)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

function uiDependencies(file) {
  const sourceText = fs.readFileSync(file, "utf8")
  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const dependencies = new Set()
  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return
    const match = node.moduleSpecifier.text.match(/^@\/components\/ui\/([^/]+)$/)
    if (match) dependencies.add(match[1])
  })
  return dependencies
}

function main() {
  const violations = []
  const manifest = readJson(manifestPath)
  const components = readJson(componentsPath)
  const uiFiles = fs
    .readdirSync(uiRoot)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => name.slice(0, -4))
    .sort()
  const registered = [...manifest.generatedComponents].sort()

  if (manifest.cli?.version !== "4.21.0") {
    violations.push("shadcn-provenance.json must pin the generating CLI to 4.21.0")
  }
  if (manifest.registry?.style !== components.style || components.style !== "radix-nova") {
    violations.push("components.json and provenance must use the radix-nova registry style")
  }
  if (!manifest.registry?.source?.startsWith("https://github.com/shadcn-ui/ui/")) {
    violations.push("provenance must link to the official shadcn-ui/ui source")
  }
  const licensePath = path.join(root, manifest.license?.notice ?? "")
  if (
    manifest.license?.spdx !== "MIT" ||
    !fs.existsSync(licensePath) ||
    !fs.readFileSync(licensePath, "utf8").includes("Copyright (c) 2023 shadcn")
  ) {
    violations.push("provenance must retain the upstream shadcn MIT notice")
  }
  if (JSON.stringify(uiFiles) !== JSON.stringify(registered)) {
    violations.push("provenance generatedComponents must exactly match src/components/ui/*.tsx")
  }
  if (JSON.stringify(Object.keys(manifest.sourceHashes ?? {}).sort()) !== JSON.stringify(uiFiles)) {
    violations.push("provenance sourceHashes must exactly match src/components/ui/*.tsx")
  }

  for (const component of uiFiles) {
    const source = fs.readFileSync(path.join(uiRoot, `${component}.tsx`), "utf8")
    if (!source.includes("data-slot=")) {
      violations.push(`src/components/ui/${component}.tsx is missing the upstream data-slot marker`)
    }
    const digest = crypto.createHash("sha256").update(source).digest("hex")
    if (manifest.sourceHashes?.[component] !== digest) {
      violations.push(`src/components/ui/${component}.tsx differs from its recorded source hash`)
    }
  }

  const externalImports = new Set()
  const allowedNative = new Map(
    (manifest.allowedNativeCompositions ?? []).map((entry) => [
      `${entry.file}:${entry.element}:${entry.role ?? ""}`,
      entry,
    ])
  )
  const seenNative = new Set()
  for (const file of walk(sourceRoot).filter(isProductionSource)) {
    scanJsx(file, violations, externalImports, allowedNative, seenNative)
  }
  for (const composition of allowedNative.keys()) {
    if (!seenNative.has(composition)) {
      violations.push(`unused allowedNativeCompositions entry: ${composition}`)
    }
  }

  const reachable = new Set()
  const pending = [...externalImports]
  while (pending.length > 0) {
    const component = pending.pop()
    if (reachable.has(component) || !uiFiles.includes(component)) continue
    reachable.add(component)
    pending.push(...uiDependencies(path.join(uiRoot, `${component}.tsx`)))
  }
  const unused = uiFiles.filter((component) => !reachable.has(component))
  if (unused.length > 0) {
    violations.push(`unused generated shadcn components: ${unused.join(", ")}`)
  }

  if (violations.length > 0) {
    console.error(`shadcn coverage failed with ${violations.length} violation(s):`)
    for (const violation of violations) console.error(`- ${violation}`)
    process.exitCode = 1
    return
  }

  console.log(`shadcn coverage passed: ${uiFiles.length} source-owned components, ${externalImports.size} direct consumer imports`)
}

main()
