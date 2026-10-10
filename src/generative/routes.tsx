import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { UIMessage } from 'ai'
import { getSceneMetadata } from './scene-metadata'
import { ArtifactIdSchema, CATALOG_VERSION, CONTRACT_VERSION, type AgentContextEnvelope, type ArtifactId, type FareId } from './contracts'
import { createFareDataBridge } from './data/fare-data-bridge'
import { createUIStateStore } from './state/ui-state-store'
import { createArtifactStore } from './state/artifact-store'
import { createActionRouter } from './state/action-router'
import { captureAgentContextWithSelectedFares } from './state/snapshot-exporter'
import { createDisplayContextStore } from './state/display-context'
import { createIndexedDBStorage, createThreadPersistence, ThreadConflictError, type PersistedThread } from './state/persistence'
import { assertNoBulkData } from './contracts/privacy'
import { GenerativeChat } from './chat/runtime-provider'
import type { TravelServices } from './catalog/context'
import { createRuntimePresentValidationScope } from './presentation/present-scope'
import { completeSmartPlannerHandoff, readSmartPlannerHandoff, type SmartPlannerHandoff } from './smart-planner-handoff'
import {
  createSessionSummary,
  renameSessionSummary,
  readSessionHistory,
  sessionTitle,
  updateSessionDraft,
  updateSessionSummary,
  writeSessionHistory,
  type SessionHistory,
  type SessionSummary,
} from './chat/session-history'
import { SessionSidebar } from './chat/session-sidebar'
import { createPlanningStore } from './tracker/planning-store'
import { createSceneLifecycle, type SceneLifecycle } from './presentation/scene-lifecycle'

function createServices(onCoverageStatus: (message: string) => void) {
  const bridge = createFareDataBridge()
  const state = createUIStateStore()
  const artifacts = createArtifactStore()
  const displayStore = createDisplayContextStore()
  const planning = createPlanningStore()
  const createArtifact = () => {
    if (artifacts.getIds().length >= 8) throw new Error('Eight-artifact limit reached')
    const id = ArtifactIdSchema.parse(`artifact-${crypto.randomUUID()}`)
    artifacts.register(id)
    state.initializeMissing(id, {})
    artifacts.activate(id)
    return id
  }
  const router = createActionRouter(state, {
    bridge,
    planning,
    activate: id => artifacts.activate(id),
    onSourceChanged: artifactId => displayStore.recordInteraction({ artifactId, actor: 'derived', action: 'deselect', inputFields: [] }),
    onCoverageStatus: status => onCoverageStatus(status.status === 'loading'
      ? 'Loading the requested travel dates…'
      : status.status === 'error'
        ? status.message ?? 'Coverage could not be loaded. Try the date again.'
        : ''),
  })
  const services: TravelServices = {
    bridge,
    state,
    activeId: artifacts.getActiveId,
    artifactIds: artifacts.getIds,
    subscribeActive: artifacts.subscribe,
    activate: id => artifacts.activate(ArtifactIdSchema.parse(id)),
    dispatch: router,
    whenIdle: router.whenIdle,
    createArtifact,
  }
  return { services, artifacts, displayStore, planning, createArtifact, router }
}

function isUIMessage(message: unknown): message is UIMessage {
  return typeof message === 'object'
    && message !== null
    && 'id' in message
    && 'role' in message
    && 'parts' in message
}

type ThreadPersistence = ReturnType<typeof createThreadPersistence>
type RegisterFlush = (flush: (() => Promise<boolean>) | null) => void

type SessionConversationProps = {
  session: SessionSummary
  history: SessionHistory
  handoff: SmartPlannerHandoff | null
  persistence: ThreadPersistence
  switching: boolean
  registerFlush: RegisterFlush
  onNew: () => void
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onCollapsedChange: (collapsed: boolean) => void
  onSessionSaved: (id: string, title: string) => void
  onSessionDraft: (id: string, draft: string) => void
}

function SessionConversation(props: SessionConversationProps) {
  const [notice, setNotice] = useState('')
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const [restoreError, setRestoreError] = useState(false)
  const [diagnostics, setDiagnostics] = useState('')
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [runtime] = useState(() => createServices(setNotice))
  const [registryRevision, setRegistryRevision] = useState(0)
  const [ready, setReady] = useState(false)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [initialRunMessageId, setInitialRunMessageId] = useState<string>()
  const [sceneLifecycle, setSceneLifecycle] = useState<SceneLifecycle>()
  const messagesRef = useRef<UIMessage[]>([])
  const sceneLifecycleRef = useRef<SceneLifecycle | undefined>(undefined)
  const readyRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const messageSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stopRunRef = useRef<(() => Promise<void>) | null>(null)

  const buildRecord = useCallback((next: UIMessage[]): PersistedThread => {
    assertNoBulkData(next)
    const { sources } = getSceneMetadata(next,createRuntimePresentValidationScope(runtime.artifacts.getIds(),runtime.services))
    const states = runtime.artifacts.getIds().map(id => runtime.services.state.get(id))
    const sceneSnapshots = sceneLifecycleRef.current?.exportSnapshots(next) ?? []
    const refs = [...new Set([...states, ...sceneSnapshots.flatMap(snapshot => snapshot.artifactStates)].flatMap(state => state.datasetRefs))]
    const frozenBindings = new Map((sceneLifecycleRef.current?.bindings() ?? []).map(binding => [binding.datasetId, binding]))
    return {
      schemaVersion: CONTRACT_VERSION,
      catalogVersion: CATALOG_VERSION,
      activeArtifactId: runtime.artifacts.getActiveId(),
      parserVersion: 'native-present-1',
      queryVersion: '1',
      messages: next,
      artifacts: states.map(state => ({
        source: sources.get(state.artifactId) ?? 'No scene authored yet.',
        state,
      })),
      descriptors: refs.map(datasetId => {
        const binding = runtime.services.bridge.findBinding(datasetId) ?? frozenBindings.get(datasetId)
        if(!binding)throw new Error('Missing fare scope binding')
        const manifest = binding.manifest
        return {
          datasetId,
          resourceKey:binding.resourceKey,
          scope:manifest.coverage,
          sourceVersion: manifest.source.sourceVersion,
          complete: manifest.complete,
        }
      }),
      plannedFares: [...runtime.planning.get()],
      sceneSnapshots,
    }
  }, [runtime])

  const save = useCallback(async (next: UIMessage[]) => {
    if (messageSaveTimer.current) {
      clearTimeout(messageSaveTimer.current)
      messageSaveTimer.current = undefined
    }
    await props.persistence.save(props.session.id, buildRecord(next))
    messagesRef.current = next
    setMessages(next)
    props.onSessionSaved(props.session.id, sessionTitle(next))
  }, [buildRecord, props.persistence, props.session.id, props.onSessionSaved])

  const saveLive = useCallback(async (next: UIMessage[]) => {
    await props.persistence.save(props.session.id, buildRecord(next))
    messagesRef.current = next
    props.onSessionSaved(props.session.id, sessionTitle(next))
  }, [buildRecord, props.persistence, props.session.id, props.onSessionSaved])

  const flush = useCallback(async (): Promise<boolean> => {
    if (!readyRef.current) return true
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = undefined
    }
    try {
      runtime.router.cancelPending()
      await stopRunRef.current?.()
      runtime.router.cancelPending()
      await Promise.all(runtime.artifacts.getIds().map(id => runtime.router.whenIdle(id)))
      await save(messagesRef.current)
      return true
    } catch (error) {
      setNotice(error instanceof ThreadConflictError ? error.message : 'Local history could not be saved.')
      return false
    }
  }, [runtime, save])

  useEffect(() => {
    props.registerFlush(flush)
    return () => props.registerFlush(null)
  }, [flush, props.registerFlush])

  useEffect(() => {
    const controller = new AbortController()
    readyRef.current = false
    setReady(false)
    setRestoreError(false)
    props.persistence.load(props.session.id).then(async record => {
      if (controller.signal.aborted) return
      let valid: UIMessage[] = []
      let sourceRefreshed = false
      let sourceChangedFareIdsByArtifact: ReadonlyMap<ArtifactId, ReadonlySet<FareId>> = new Map()
      if (record) {
        valid = record.messages.filter(isUIMessage)
        await props.persistence.restore(record, runtime.services.bridge, runtime.services.state, controller.signal, sourceChange => {
          sourceRefreshed = true
          sourceChangedFareIdsByArtifact = sourceChange.sourceChangedFareIdsByArtifact
          setNotice(sourceChange.clearedSelections
            ? 'Synthetic fare data changed. Coverage was refreshed and affected saved fare selections were cleared; your conversation and travel preferences are preserved.'
            : 'Synthetic fare data changed. Coverage was refreshed; your conversation and travel preferences are preserved.')
        })
        runtime.planning.restore(record.plannedFares.flatMap(entry => {
          const owners = entry.owners.filter(owner => !sourceChangedFareIdsByArtifact.get(owner)?.has(entry.fact.id))
          const sources = entry.sources?.filter(source => owners.includes(source.owner))
          return owners.length ? [{ ...entry, owners, ...(sources ? { sources } : {}) }] : []
        }))
        if (!record.plannedFares.length) {
          for (const artifact of record.artifacts) {
            for (const fareId of artifact.state.selectedFareIds) {
              const fare = runtime.services.bridge.findCachedFare(fareId)
              if (!fare) continue
              const { availableSeats: _availableSeats, ...fact } = fare
              runtime.planning.select(artifact.state.artifactId, fact)
            }
          }
        }
        if (controller.signal.aborted) return
        for (const artifact of record.artifacts) runtime.artifacts.register(artifact.state.artifactId)
        if (record.activeArtifactId) runtime.artifacts.activate(record.activeArtifactId)
      }
      if (!runtime.artifacts.getIds().length) runtime.createArtifact()
      const lifecycle = createSceneLifecycle(runtime.services, {
        initialMessages: valid,
        initialSnapshots: record?.sceneSnapshots,
        restoreSelectedFareIds: (artifactId, capturedIds) => {
          const retained = new Set(runtime.planning.get().flatMap(entry => entry.owners.includes(artifactId) ? [entry.fact.id] : []))
          return capturedIds.filter(fareId => retained.has(fareId))
        },
      })
      sceneLifecycleRef.current = lifecycle
      setSceneLifecycle(lifecycle)
      const promptHandoff = props.handoff?.kind === 'prompt' ? props.handoff : null
      if (promptHandoff && !valid.some(message => message.id === promptHandoff.id)) {
        valid = [...valid, { id: promptHandoff.id, role: 'user', parts: [{ type: 'text', text: promptHandoff.prompt }] }]
        await save(valid)
      } else {
        messagesRef.current = valid
        setMessages(valid)
        if (sourceRefreshed) await save(valid)
      }
      if (controller.signal.aborted) return
      if (promptHandoff) setInitialRunMessageId(promptHandoff.id)
      if (props.handoff?.kind === 'empty') completeSmartPlannerHandoff(props.handoff.id)
      readyRef.current = true
      setReady(true)
    }).catch(() => {
      if (controller.signal.aborted) return
      setRestoreError(true)
      setNotice('Your saved conversation has been kept. Its travel data could not be restored; retry when the local API is available.')
    })
    return () => controller.abort()
  }, [props.session.id, props.handoff?.id, props.persistence, restoreAttempt, runtime, save])

  useEffect(() => runtime.artifacts.subscribe(() => setRegistryRevision(value => value + 1)), [runtime])
  useEffect(() => () => {
    runtime.router.dispose()
    runtime.services.bridge.dispose?.()
  }, [runtime])

  useEffect(() => {
    if (!ready) return
    const persist = () => void save(messagesRef.current).catch(error => {
      setNotice(error instanceof ThreadConflictError ? error.message : 'Local history could not be saved.')
    })
    const changed = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveTimer.current = undefined
        persist()
      }, 30)
    }
    const unsubscribe = runtime.artifacts.getIds().map(id => runtime.services.state.subscribe(id, changed))
    const stopActive = runtime.artifacts.subscribe(changed)
    const stopPlanning = runtime.planning.subscribe(changed)
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = undefined
        persist()
      }
      stopActive()
      stopPlanning()
      unsubscribe.forEach(stop => stop())
    }
  }, [ready, registryRevision, runtime, save])

  const capture = async (): Promise<AgentContextEnvelope> => {
    const lifecycle = sceneLifecycleRef.current
    if (!lifecycle) throw new Error('Scene lifecycle unavailable')
    await lifecycle.prepareTurn(messagesRef.current)
    const { layouts, bindings } = getSceneMetadata(messagesRef.current,createRuntimePresentValidationScope(runtime.artifacts.getIds(),runtime.services))
    const sceneArtifactIds = lifecycle.activeArtifactIds(messagesRef.current)
    const currentActiveArtifactId = runtime.artifacts.getActiveId()
    const activeArtifactIds = [...new Set([...sceneArtifactIds, ...(currentActiveArtifactId ? [currentActiveArtifactId] : [])])]
    const activeArtifactId = currentActiveArtifactId ?? activeArtifactIds[0]
    return captureAgentContextWithSelectedFares({
      turnId: `turn-${crypto.randomUUID()}`,
      activeArtifactId,
      artifactIds: activeArtifactIds,
      store: runtime.services.state,
      bridge: runtime.services.bridge,
      displayStore: runtime.displayStore,
      plannedFareFacts: runtime.planning.get().map(entry => entry.fact),
      layoutSummaries: layouts,
      componentBindings: bindings,
    })
  }

  const readDiagnostics = async () => {
    const persisted = await createIndexedDBStorage().read(props.session.id)
    const metadata = getSceneMetadata(messagesRef.current,createRuntimePresentValidationScope(runtime.artifacts.getIds(),runtime.services))
    const artifactRecords = runtime.artifacts.getIds().map(id => ({
      state: runtime.services.state.get(id),
      source: metadata.sources.get(id),
    }))
    const refs = [...new Set(artifactRecords.flatMap(record => record.state.datasetRefs))]
    const manifests = refs.map(datasetId => {
      try {
        const binding = runtime.services.bridge.findBinding(datasetId)
        if(!binding)throw new Error('Missing fare scope binding')
        const manifest=binding.manifest
        return { datasetId,resourceKey:binding.resourceKey,totalAvailable:manifest.totalAvailable, coverage: manifest.coverage,availableModes:manifest.availableModes, sourceVersion: manifest.source.sourceVersion,complete:manifest.complete }
      } catch {
        return { datasetId, error: 'Manifest unavailable' }
      }
    })
    setDiagnostics(JSON.stringify({ schemaVersion: CONTRACT_VERSION, threadId: props.session.id, activeArtifactId: runtime.artifacts.getActiveId(), messages: messagesRef.current, artifactRecords, manifests, persisted }, null, 2))
  }

  const sidebar = <SessionSidebar
    sessions={props.history.sessions}
    activeSessionId={props.session.id}
    collapsed={props.history.collapsed}
    switching={props.switching}
    onNew={props.onNew}
    onSelect={props.onSelect}
    onRename={props.onRename}
    onCollapsedChange={props.onCollapsedChange}
  />

  if (!ready || !sceneLifecycle) return <div className="travel-app">
    {sidebar}
    {restoreError
      ? <><Alert>{notice}</Alert><Button type="button" onClick={() => setRestoreAttempt(value => value + 1)}>Retry restoring conversation</Button><Card aria-label="Saved conversation">{messages.map(message => <p key={message.id}>{message.parts.flatMap(part => part.type === 'text' ? [part.text] : []).join(' ')}</p>)}</Card></>
      : <Skeleton className="travel-skeleton" role="status">Restoring travel conversation…</Skeleton>}
  </div>

  return <>
    <nav className="travel-variant-nav"><Button asChild variant="link"><a href="/">Classic search</a></Button><span>Generative travel · Signed-in Codex</span></nav>
    {notice && <Alert role="status">{notice}</Alert>}
    <GenerativeChat
      services={runtime.services}
      planning={runtime.planning}
      sceneLifecycle={sceneLifecycle}
      displayStore={runtime.displayStore}
      capture={capture}
      initialMessages={messages}
      initialRunMessageId={initialRunMessageId}
      initialDraft={props.session.draft}
      onLiveMessages={next => {
        messagesRef.current = next
        const persist = () => void saveLive(messagesRef.current).catch(error => setNotice(error instanceof ThreadConflictError ? error.message : 'Local history could not be saved.'))
        if (messageSaveTimer.current) clearTimeout(messageSaveTimer.current)
        if (next.at(-1)?.role === 'user') {
          messageSaveTimer.current = undefined
          persist()
        } else {
          messageSaveTimer.current = setTimeout(() => {
            messageSaveTimer.current = undefined
            persist()
          }, 30)
        }
      }}
      onMessages={next => {
        messagesRef.current = next
        return save(next).catch(error => setNotice(error instanceof ThreadConflictError ? error.message : 'Local history could not be saved.'))
      }}
      onDraft={draft => props.onSessionDraft(props.session.id, draft)}
      sidebar={sidebar}
      registerRunStop={stop => { stopRunRef.current = stop }}
    />
    {import.meta.env.DEV && <Collapsible open={diagnosticsOpen} onOpenChange={open => {
      setDiagnosticsOpen(open)
      if (open) void readDiagnostics().catch(() => setDiagnostics('Conversation diagnostics could not be read.'))
    }}>
      <CollapsibleTrigger asChild><Button type="button" variant="outline">Developer conversation diagnostics</Button></CollapsibleTrigger>
      <CollapsibleContent><Button type="button" variant="outline" onClick={() => void readDiagnostics()}>Refresh diagnostics</Button><Textarea aria-label="Conversation diagnostics" readOnly value={diagnostics} rows={12} className="font-mono" /></CollapsibleContent>
    </Collapsible>}
  </>
}

export function GenerativeRoute() {
  const persistence = useMemo(() => createThreadPersistence(), [])
  const [history, setHistory] = useState<SessionHistory | null>(null)
  const [handoff, setHandoff] = useState<SmartPlannerHandoff | null>(null)
  const [switching, setSwitching] = useState(false)
  const flushRef = useRef<(() => Promise<boolean>) | null>(null)
  const transitionActive = useRef(false)
  const registerFlush = useCallback<RegisterFlush>(flush => { flushRef.current = flush }, [])

  useEffect(() => {
    const controller = new AbortController()
    const initialize = async () => {
      const nextHandoff = readSmartPlannerHandoff(new URLSearchParams(window.location.search).get('handoff'))
      const stored = readSessionHistory()
      let sessions = stored?.sessions ?? []
      let activeSessionId = stored?.activeSessionId
      if (nextHandoff) {
        let target = sessions.find(session => session.handoffId === nextHandoff.id)
        if (!target) {
          target = createSessionSummary({
            handoffId: nextHandoff.id,
            title: nextHandoff.kind === 'prompt' ? nextHandoff.prompt : undefined,
          })
          sessions = [...sessions, target]
        }
        activeSessionId = target.id
      }
      if (!sessions.length) {
        const first = createSessionSummary()
        sessions = [first]
        activeSessionId = first.id
      }
      if (!activeSessionId || !sessions.some(session => session.id === activeSessionId)) activeSessionId = sessions[0]!.id
      const next: SessionHistory = {
        version: 1,
        activeSessionId,
        collapsed: stored?.collapsed ?? false,
        sessions,
      }
      writeSessionHistory(next)
      if (controller.signal.aborted) return
      setHandoff(nextHandoff)
      setHistory(next)
    }
    void initialize()
    return () => controller.abort()
  }, [persistence])

  useEffect(() => {
    if (history) writeSessionHistory(history)
  }, [history])

  const transition = useCallback(async (next: () => void) => {
    if (transitionActive.current) return
    transitionActive.current = true
    setSwitching(true)
    try {
      const flushed = await (flushRef.current?.() ?? Promise.resolve(true))
      if (flushed) next()
    } finally {
      transitionActive.current = false
      setSwitching(false)
    }
  }, [])

  const selectSession = useCallback((id: string) => {
    if (history?.activeSessionId === id) return
    void transition(() => {
      setHandoff(null)
      setHistory(current => current ? { ...current, activeSessionId: id } : current)
    })
  }, [history?.activeSessionId, transition])

  const newSession = useCallback(() => {
    void transition(() => {
      const session = createSessionSummary()
      setHandoff(null)
      setHistory(current => current ? { ...current, activeSessionId: session.id, sessions: [...current.sessions, session] } : current)
    })
  }, [transition])

  const setCollapsed = useCallback((collapsed: boolean) => {
    setHistory(current => current ? { ...current, collapsed } : current)
  }, [])

  const renameSession = useCallback((id: string, title: string) => {
    setHistory(current => current ? renameSessionSummary(current, id, title) : current)
  }, [])

  const onSessionSaved = useCallback((id: string, title: string) => {
    setHistory(current => current ? updateSessionSummary(current, id, title) : current)
  }, [])

  const onSessionDraft = useCallback((id: string, draft: string) => {
    setHistory(current => {
      if (!current) return current
      const next = updateSessionDraft(current, id, draft)
      writeSessionHistory(next)
      return next
    })
  }, [])

  if (!history) return <div className="travel-app"><Skeleton className="travel-skeleton" role="status">Restoring chat history…</Skeleton></div>
  const session = history.sessions.find(item => item.id === history.activeSessionId)
  if (!session) return <Alert>Chat history could not be restored.</Alert>
  return <SessionConversation
    key={session.id}
    session={session}
    history={history}
    handoff={session.handoffId === handoff?.id ? handoff : null}
    persistence={persistence}
    switching={switching}
    registerFlush={registerFlush}
    onNew={newSession}
    onSelect={selectSession}
    onRename={renameSession}
    onCollapsedChange={setCollapsed}
    onSessionSaved={onSessionSaved}
    onSessionDraft={onSessionDraft}
  />
}
