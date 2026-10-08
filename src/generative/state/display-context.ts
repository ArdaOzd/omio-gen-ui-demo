import { z } from 'zod'
import {
  DISPLAY_CONTEXT_VERSION,
  DISPLAY_LIMITS,
  ComponentIdentitySchema,
  DisplayLedgerEntrySchema,
  DisplayRepresentationSchema,
  DisplayedFareFactSchema,
  FrozenDisplayContextSchema,
  InspectDisplayInputSchema,
  InspectDisplayOutputSchema,
  SemanticInteractionSchema,
  type ComponentIdentity,
  type DisplayLedgerEntry,
  type DisplayRepresentation,
  type DisplayVisibility,
  type DisplayedFareFact,
  type EffectiveInputs,
  type FrozenDisplayContext,
  type InputProvenance,
  type InspectDisplayInput,
  type InspectDisplayItem,
  type InspectDisplayOutput,
  type SemanticInteraction,
} from '../contracts/display-context'
import type { QueryExecutionState, QueryGroupScope } from '../contracts/query-groups'
import type { QueryFareSelectionScope } from './action-router'

const SelectionFareIdSchema = z.string().min(1).max(160).regex(/^[a-zA-Z0-9_.:-]+$/).brand<'FareId'>()

export type DisplayInspectionSource = {
  resultKey: string
  inputHash: string
  resultFingerprint: string
  sourceVersion: string
  items: readonly InspectDisplayItem[]
}

export type DisplayInputs = {
  values: EffectiveInputs
  provenance: readonly InputProvenance[]
}

export type DisplayCaptureInput = {
  captureId: string
  artifactIds: readonly string[]
  shownFareFacts?: readonly DisplayedFareFact[]
  omittedFacts?: number
}

export type DisplayInspectionFailureCode =
  | 'unknownCapture'
  | 'unknownDisplay'
  | 'resultMismatch'
  | 'sourceMismatch'
  | 'unknownItem'
  | 'expiredCapture'

export class DisplayInspectionError extends Error {
  constructor(readonly code: DisplayInspectionFailureCode, message: string) {
    super(message)
    this.name = 'DisplayInspectionError'
  }
}

export interface DisplayContextStore {
  register(identity: ComponentIdentity): () => void
  setGroup(componentRef: string, group: QueryGroupScope | undefined): void
  setInputs(componentRef: string, inputs: DisplayInputs): void
  setExecution(componentRef: string, execution: QueryExecutionState | undefined): void
  setDisplay(componentRef: string, display: DisplayRepresentation | undefined, inspection?: DisplayInspectionSource): void
  setVisibility(componentRef: string, visibility: DisplayVisibility): void
  setActiveChild(layoutRef: string, activeChildRef: string | undefined, childRefs: readonly string[]): void
  recordInteraction(event: Omit<SemanticInteraction, 'sequence'>): SemanticInteraction
  provenance(artifactId: string, fields: readonly InputProvenance['field'][]): InputProvenance[]
  capture(input: DisplayCaptureInput): FrozenDisplayContext
  inspect(input: InspectDisplayInput): InspectDisplayOutput
  resolveFareSelection(input: { captureId: string; displayHandle: string; resultKey: string; sourceVersion?: string; fareId: string; artifactId: string }): QueryFareSelectionScope
  get(componentRef: string): DisplayLedgerEntry | undefined
}

type MutableEntry = DisplayLedgerEntry & {
  registrations: number
  inspection?: DisplayInspectionSource
}

type CapturedInspection = DisplayInspectionSource & {
  componentRef: string
  displayHandle: string
}

type CapturedRecord = {
  context: FrozenDisplayContext
  inspections: Map<string, CapturedInspection>
}

const clone = <T>(value: T): T => structuredClone(value)

function displayFareIds(display: DisplayRepresentation): string[] {
  switch (display.payload.kind) {
    case 'fare-order': {
      const payload=display.payload,viewport=payload.viewport
      if (viewport) return payload.orderedFareRefs.filter(item => item.rank > viewport.offset && item.rank <= viewport.offset + viewport.limit).map(item => item.fareId)
      return payload.orderedFareRefs.map(item => item.fareId)
    }
    case 'plot':
    case 'selection':
      return display.payload.orderedFareRefs.map(item => item.fareId)
    case 'fare-highlights':
      return display.payload.items.flatMap(item => item.fareId ? [item.fareId] : [])
    case 'calendar':
    case 'aggregate':
      return display.payload.cells.flatMap(cell => cell.fareId ? [cell.fareId] : [])
    default:
      return []
  }
}

function currentResult(execution: QueryExecutionState | undefined) {
  if (!execution) return undefined
  if (execution.status === 'ready' || execution.status === 'refreshing') return execution.current
  if (execution.status === 'error') return execution.previous
  return undefined
}

export function createDisplayContextStore(options: { maxCapturedDisplays?: number; maxEvents?: number } = {}): DisplayContextStore {
  const entries = new Map<string, MutableEntry>()
  const interactions: SemanticInteraction[] = []
  const inputProvenance = new Map<string, Map<InputProvenance['field'], InputProvenance>>()
  const captures = new Map<string, CapturedRecord>()
  const captureOrder: string[] = []
  const expiredCaptures = new Set<string>()
  const maxCapturedDisplays = options.maxCapturedDisplays ?? 8
  const maxEvents = options.maxEvents ?? DISPLAY_LIMITS.interactions
  let renderOrder = 0
  let eventSequence = 0
  let handleSequence = 0

  const requireEntry = (componentRef: string): MutableEntry => {
    const entry = entries.get(componentRef)
    if (!entry) throw new Error(`Unknown display component: ${componentRef}`)
    return entry
  }

  const replace = (componentRef: string, patch: Partial<MutableEntry>): void => {
    const current = requireEntry(componentRef)
    const next = { ...current, ...patch }
    const { registrations: _registrations, inspection: _inspection, ...publicEntry } = next
    DisplayLedgerEntrySchema.parse(publicEntry)
    entries.set(componentRef, next)
  }

  const register = (identity: ComponentIdentity): (() => void) => {
    const parsed = ComponentIdentitySchema.parse(clone(identity))
    const componentRef = parsed.componentRef.value
    const current = entries.get(componentRef)
    if (current) {
      if (JSON.stringify(current.identity) !== JSON.stringify(parsed)) {
        if (current.registrations > 0) throw new Error(`Conflicting display component: ${componentRef}`)
        entries.set(componentRef, {
          identity: parsed,
          inputs: {},
          provenance: [],
          visibility: 'visible',
          renderOrder: current.renderOrder,
          registrations: 1,
        })
      } else {
        current.registrations += 1
        current.visibility = 'visible'
      }
    } else {
      entries.set(componentRef, {
        identity: parsed,
        inputs: {},
        provenance: [],
        visibility: 'visible',
        renderOrder: renderOrder++,
        registrations: 1,
      })
    }
    let active = true
    return () => {
      if (!active) return
      active = false
      const latest = entries.get(componentRef)
      if (!latest) return
      latest.registrations = Math.max(0, latest.registrations - 1)
      if (latest.registrations === 0 && latest.visibility === 'visible') latest.visibility = 'offscreen'
    }
  }

  const setGroup = (componentRef: string, group: QueryGroupScope | undefined): void => replace(componentRef, { group: group ? clone(group) : undefined })
  const setInputs = (componentRef: string, inputs: DisplayInputs): void => replace(componentRef, { inputs: clone(inputs.values), provenance: clone([...inputs.provenance]) })
  const setExecution = (componentRef: string, execution: QueryExecutionState | undefined): void => replace(componentRef, { execution: execution ? clone(execution) : undefined })
  const setVisibility = (componentRef: string, visibility: DisplayVisibility): void => replace(componentRef, { visibility })

  const setDisplay = (componentRef: string, display: DisplayRepresentation | undefined, inspection?: DisplayInspectionSource): void => {
    if (!display) {
      replace(componentRef, { display: undefined, inspection: undefined })
      return
    }
    let nextDisplay = DisplayRepresentationSchema.parse(clone(display))
    if (inspection) {
      const previous = requireEntry(componentRef)
      const previousResult = previous.inspection?.resultKey
      const displayHandle = previousResult === inspection.resultKey && previous.display?.displayHandle
        ? previous.display.displayHandle
        : `display-${++handleSequence}`
      nextDisplay = DisplayRepresentationSchema.parse({ ...nextDisplay, displayHandle })
    }
    replace(componentRef, { display: nextDisplay, inspection: inspection ? clone(inspection) : undefined })
  }

  const setActiveChild = (layoutRef: string, activeChildRef: string | undefined, childRefs: readonly string[]): void => {
    const layout = requireEntry(layoutRef)
    setDisplay(layoutRef, {
      payload: { kind: 'layout', activeChildRef, childRefs: [...childRefs] },
      totalDisplayed: childRefs.length,
      includedCount: childRefs.length,
      complete: true,
      omittedCount: 0,
    })
    for (const childRef of childRefs) {
      if (!entries.has(childRef)) continue
      setVisibility(childRef, childRef === activeChildRef ? 'visible' : 'hidden-tab')
    }
    if (layout.visibility === 'hidden-tab') for (const childRef of childRefs) if (entries.has(childRef)) setVisibility(childRef, 'hidden-tab')
  }

  const recordInteraction = (event: Omit<SemanticInteraction, 'sequence'>): SemanticInteraction => {
    const parsed = SemanticInteractionSchema.parse({ ...event, sequence: ++eventSequence })
    interactions.push(parsed)
    const byField = inputProvenance.get(parsed.artifactId) ?? new Map<InputProvenance['field'], InputProvenance>()
    const origin = parsed.actor === 'user' ? 'user' : parsed.actor === 'agent' ? 'agent' : 'derived'
    for (const field of parsed.inputFields) byField.set(field, { field, origin, eventSequence: parsed.sequence, ...(parsed.componentRef ? { componentRef: parsed.componentRef } : {}) })
    inputProvenance.set(parsed.artifactId, byField)
    if (interactions.length > maxEvents) interactions.splice(0, interactions.length - maxEvents)
    return clone(parsed)
  }

  const capture = (input: DisplayCaptureInput): FrozenDisplayContext => {
    const artifactIds = new Set(input.artifactIds)
    const matching = [...entries.values()]
      .filter(entry => artifactIds.has(entry.identity.scope.artifactId))
      .sort((left, right) => left.renderOrder - right.renderOrder)
    const included = matching.slice(0, DISPLAY_LIMITS.components)
    const exposed: string[] = []
    for (const entry of included) {
      if (entry.visibility !== 'visible' || !entry.display) continue
      for (const fareId of displayFareIds(entry.display)) {
        if (!exposed.includes(fareId) && exposed.length < DISPLAY_LIMITS.orderedFareRefs) exposed.push(fareId)
      }
    }
    const displayedFacts = new Map<string, DisplayedFareFact>()
    let omittedDisplayedBy = 0
    const factEntries = included.filter(entry => entry.visibility === 'visible').sort((left, right) => left.renderOrder - right.renderOrder)
    for (const entry of factEntries) {
      const sourceVersion = entry.inspection?.sourceVersion
      if (!sourceVersion) continue
      for (const item of entry.inspection?.items ?? []) {
        if (!item.fact) continue
        const key = `${sourceVersion}\u0000${item.fact.id}`
        const displayedBy = { componentRef: entry.identity.componentRef.value, ...(item.rank ? { rank: item.rank } : {}), ...(item.label ? { label: item.label } : {}) }
        const current = displayedFacts.get(key)
        if (current && current.displayedBy.length < 16) current.displayedBy.push(displayedBy)
        else if (current) omittedDisplayedBy += 1
        else displayedFacts.set(key, DisplayedFareFactSchema.parse({ sourceVersion, fact: item.fact, displayedBy: [displayedBy] }))
      }
    }
    for (const fact of input.shownFareFacts ?? []) {
      const parsed = DisplayedFareFactSchema.parse(clone(fact))
      const key = `${parsed.sourceVersion}\u0000${parsed.fact.id}`
      const current = displayedFacts.get(key)
      if (current) {
        for (const owner of parsed.displayedBy) if (!current.displayedBy.some(candidate => JSON.stringify(candidate) === JSON.stringify(owner))) {
          if (current.displayedBy.length < 16) current.displayedBy.push(owner)
          else omittedDisplayedBy += 1
        }
      } else displayedFacts.set(key, parsed)
    }
    const allShownFacts = [...displayedFacts.values()]
    const shownFareFacts = allShownFacts.slice(0, DISPLAY_LIMITS.shownFacts)
    const omittedFacts = Math.max(input.omittedFacts ?? 0, allShownFacts.length - shownFareFacts.length) + omittedDisplayedBy
    const context = FrozenDisplayContextSchema.parse({
      version: DISPLAY_CONTEXT_VERSION,
      captureId: input.captureId,
      components: included.map(({ registrations: _registrations, inspection: _inspection, ...entry }) => clone(entry)),
      activeViews: included.filter(entry => entry.visibility === 'visible').map(entry => entry.identity.componentRef.value),
      exposedOrderedIds: exposed,
      shownFareFacts,
      recentInteractions: interactions.filter(event => artifactIds.has(event.artifactId)).slice(-DISPLAY_LIMITS.interactions),
      completeness: {
        complete: matching.length <= DISPLAY_LIMITS.components && omittedFacts === 0,
        omittedComponents: Math.max(0, matching.length - DISPLAY_LIMITS.components),
        omittedFacts,
      },
    })
    const inspections = new Map<string, CapturedInspection>()
    for (const entry of included) {
      const handle = entry.display?.displayHandle
      if (!handle || !entry.inspection) continue
      inspections.set(handle, clone({ ...entry.inspection, componentRef: entry.identity.componentRef.value, displayHandle: handle }))
    }
    captures.set(input.captureId, { context: clone(context), inspections })
    captureOrder.push(input.captureId)
    while (captureOrder.length > maxCapturedDisplays) {
      const expired = captureOrder.shift()
      if (expired) {
        captures.delete(expired)
        expiredCaptures.add(expired)
        while (expiredCaptures.size > 32) expiredCaptures.delete(expiredCaptures.values().next().value!)
      }
    }
    return clone(context)
  }

  const inspect = (raw: InspectDisplayInput): InspectDisplayOutput => {
    const input = InspectDisplayInputSchema.parse(raw)
    const capture = captures.get(input.captureId)
    if (!capture) throw new DisplayInspectionError(expiredCaptures.has(input.captureId) ? 'expiredCapture' : 'unknownCapture', expiredCaptures.has(input.captureId) ? 'The captured display has expired.' : 'The captured display is unknown.')
    const source = capture.inspections.get(input.displayHandle)
    if (!source) throw new DisplayInspectionError('unknownDisplay', 'The display handle is not part of this capture.')
    if (source.resultKey !== input.resultKey) throw new DisplayInspectionError('resultMismatch', 'The display result does not match this captured handle.')
    if (input.sourceVersion && source.sourceVersion !== input.sourceVersion) throw new DisplayInspectionError('sourceMismatch', 'The display source does not match this captured handle.')
    const byId = new Map(source.items.map(item => [item.itemId, item]))
    if (input.itemIds?.some(itemId => !byId.has(itemId))) throw new DisplayInspectionError('unknownItem', 'A requested display item is not part of this captured result.')
    const requested = input.itemIds ? input.itemIds.map(itemId => byId.get(itemId)!) : source.items
    const offset = input.cursor ? Number.parseInt(input.cursor, 10) : 0
    if (!Number.isSafeInteger(offset) || offset < 0) throw new DisplayInspectionError('unknownItem', 'The inspection cursor is invalid.')
    const items = requested.slice(offset, offset + input.limit)
    const next = offset + items.length
    return InspectDisplayOutputSchema.parse({
      captureId: input.captureId,
      displayHandle: input.displayHandle,
      resultKey: input.resultKey,
      componentRef: source.componentRef,
      inputHash: source.inputHash,
      resultFingerprint: source.resultFingerprint,
      sourceVersion: source.sourceVersion,
      items,
      nextCursor: next < requested.length ? String(next) : undefined,
      complete: next >= requested.length,
    })
  }

  const resolveFareSelection = (input: { captureId: string; displayHandle: string; resultKey: string; sourceVersion?: string; fareId: string; artifactId: string }): QueryFareSelectionScope => {
    const capture = captures.get(input.captureId)
    if (!capture) throw new DisplayInspectionError(expiredCaptures.has(input.captureId) ? 'expiredCapture' : 'unknownCapture', expiredCaptures.has(input.captureId) ? 'The captured display has expired.' : 'The captured display is unknown.')
    const source = capture.inspections.get(input.displayHandle)
    if (!source) throw new DisplayInspectionError('unknownDisplay', 'The display handle is not part of this capture.')
    if (source.resultKey !== input.resultKey) throw new DisplayInspectionError('resultMismatch', 'The display result does not match this captured handle.')
    if (input.sourceVersion && source.sourceVersion !== input.sourceVersion) throw new DisplayInspectionError('sourceMismatch', 'The display source does not match this captured handle.')
    const component = capture.context.components.find(entry => entry.identity.componentRef.value === source.componentRef)
    if (!component || component.identity.scope.artifactId !== input.artifactId) throw new DisplayInspectionError('unknownDisplay', 'The captured display does not belong to this artifact.')
    const inspectedIds = new Set(source.items.map(item => item.itemId))
    const fareIds = component.display ? displayFareIds(component.display).filter(fareId => inspectedIds.has(fareId)).map(fareId => SelectionFareIdSchema.parse(fareId)) : []
    if (!fareIds.includes(SelectionFareIdSchema.parse(input.fareId))) throw new DisplayInspectionError('unknownItem', 'The selected fare is not part of this captured display.')
    const result = currentResult(component.execution)
    if (!result || result.resultKey !== source.resultKey || result.sourceVersion !== source.sourceVersion) throw new DisplayInspectionError('resultMismatch', 'The captured display is not backed by the expected query result.')
    return {
      kind: 'query-result',
      fareIds,
      resultKey: result.resultKey,
      currentResultKey: () => currentResult(entries.get(source.componentRef)?.execution)?.resultKey,
      resourceKey: result.resourceKey,
      datasetId: result.datasetId,
      datasetRevision: result.datasetRevision,
      sourceVersion: result.sourceVersion,
    }
  }

  const get = (componentRef: string): DisplayLedgerEntry | undefined => {
    const entry = entries.get(componentRef)
    if (!entry) return undefined
    const { registrations: _registrations, inspection: _inspection, ...publicEntry } = entry
    return clone(publicEntry)
  }

  const provenance = (artifactId: string, fields: readonly InputProvenance['field'][]): InputProvenance[] => {
    const current = inputProvenance.get(artifactId)
    return fields.map(field => clone(current?.get(field) ?? { field, origin: 'unknown' as const }))
  }

  return { register, setGroup, setInputs, setExecution, setDisplay, setVisibility, setActiveChild, recordInteraction, provenance, capture, inspect, resolveFareSelection, get }
}

export function currentDisplayResult(entry: DisplayLedgerEntry) {
  return currentResult(entry.execution)
}
