import { createContext, useContext, useEffect, useLayoutEffect, useMemo, type ReactNode } from 'react'
import type {
  ComponentIdentity,
  DisplayRepresentation,
  DisplayVisibility,
  EffectiveInputs,
  InputField,
  InputProvenance,
  InspectDisplayItem,
} from '../contracts/display-context'
import type { QueryExecutionState, QueryGroupScope, QueryResultIdentity } from '../contracts/query-groups'
import type { DisplayContextStore, DisplayInspectionSource } from '../state/display-context'

const StoreContext = createContext<DisplayContextStore | undefined>(undefined)
const NodeContext = createContext<{ componentRef?: string; visibility: DisplayVisibility }>({ visibility: 'visible' })

export function DisplayContextProvider({ store, children }: { store: DisplayContextStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useDisplayContextStore(): DisplayContextStore | undefined {
  return useContext(StoreContext)
}

export function DisplayNodeProvider({ identity, children }: { identity: ComponentIdentity; children: ReactNode }) {
  const store = useDisplayContextStore()
  const parent = useContext(NodeContext)
  const componentRef = identity.componentRef.value
  const identityKey = JSON.stringify(identity)
  useLayoutEffect(() => store?.register(identity), [store, identityKey])
  useEffect(() => store?.setVisibility(componentRef, parent.visibility), [store, componentRef, parent.visibility])
  const value = useMemo(() => ({ componentRef, visibility: parent.visibility }), [componentRef, parent.visibility])
  return <NodeContext.Provider value={value}>{children}</NodeContext.Provider>
}

export function DisplayVisibilityProvider({ visibility, children }: { visibility: DisplayVisibility; children: ReactNode }) {
  const parent = useContext(NodeContext)
  const value = useMemo(() => ({ componentRef: parent.componentRef, visibility: parent.visibility === 'hidden-tab' ? 'hidden-tab' : visibility }), [parent.componentRef, parent.visibility, visibility])
  return <NodeContext.Provider value={value}>{children}</NodeContext.Provider>
}

export function useDisplayNode() {
  const store = useDisplayContextStore()
  const node = useContext(NodeContext)
  return { store, ...node }
}

export type PublishDisplayInput = {
  group?: QueryGroupScope
  inputs?: EffectiveInputs
  provenance?: readonly InputProvenance[]
  execution?: QueryExecutionState
  display?: DisplayRepresentation
  inspectionItems?: readonly InspectDisplayItem[]
  publishDisplay?: boolean
}

function inspectionSource(execution: QueryExecutionState | undefined, items: readonly InspectDisplayItem[] | undefined): DisplayInspectionSource | undefined {
  if (!items) return undefined
  let current: QueryResultIdentity | undefined
  if (execution?.status === 'ready' || execution?.status === 'refreshing') current = execution.current
  else if (execution?.status === 'error') current = execution.previous
  if (!current) return undefined
  return {
    resultKey: current.resultKey,
    inputHash: current.inputHash,
    resultFingerprint: current.resultFingerprint,
    sourceVersion: current.sourceVersion,
    items,
  }
}

export function usePublishDisplay(input: PublishDisplayInput): void {
  const { store, componentRef, visibility } = useDisplayNode()
  const groupKey = JSON.stringify(input.group)
  const inputKey = JSON.stringify(input.inputs)
  const provenanceKey = JSON.stringify(input.provenance)
  const executionKey = JSON.stringify(input.execution)
  const displayKey = JSON.stringify(input.display)
  const inspectionKey = JSON.stringify(input.inspectionItems)
  useEffect(() => {
    if (!store || !componentRef) return
    store.setGroup(componentRef, input.group)
    if (input.inputs) store.setInputs(componentRef, { values: input.inputs, provenance: input.provenance ?? [] })
    store.setExecution(componentRef, input.execution)
    if (input.publishDisplay !== false) store.setDisplay(componentRef, input.display, inspectionSource(input.execution, input.inspectionItems))
    store.setVisibility(componentRef, visibility)
  }, [store, componentRef, visibility, groupKey, inputKey, provenanceKey, executionKey, displayKey, inspectionKey, input.publishDisplay])
}

export function recordDisplayInteraction(store: DisplayContextStore | undefined, input: {
  artifactId: string
  componentRef?: string
  action: 'input' | 'select' | 'deselect' | 'activate-tab' | 'scroll' | 'retry'
  inputFields?: readonly InputField[]
  actor?: 'user' | 'agent' | 'derived'
}) {
  return store?.recordInteraction({
    artifactId: input.artifactId,
    componentRef: input.componentRef,
    actor: input.actor ?? 'user',
    action: input.action,
    inputFields: [...(input.inputFields ?? [])],
  })
}
