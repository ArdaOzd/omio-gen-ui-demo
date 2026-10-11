import { Fragment, StrictMode, useMemo, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { z } from 'zod'
import '../../src/shadcn.css'
import '../../src/generative/catalog/tokens.css'
import '../../src/generative/catalog/trip-planning/trip-planning.css'
import '../../src/generative/omio-theme.css'
import { CatalogNode } from '../../src/generative/catalog/component'
import { TravelProvider, type TravelServices } from '../../src/generative/catalog/context'
import { ArtifactIdSchema, UIStateRevisionSchema, type DatasetId } from '../../src/generative/contracts'
import { createFareDataBridge } from '../../src/generative/data/fare-data-bridge'
import { createStaticQueryClient } from '../../src/generative/data/static-query-client'
import { withDisplayComponentIdentity, type DisplayRenderNode } from '../../src/generative/presentation/present-boundary'
import { createPresentValidationScope, validatePresentTree, type PresentNode } from '../../src/generative/presentation/tree'
import { createActionRouter } from '../../src/generative/state/action-router'
import { stateRespectsDateBounds, type TravelDateBounds } from '../../src/generative/state/date-bounds'
import { createUIStateStore } from '../../src/generative/state/ui-state-store'
import { createPlanningStore, type PlanningStore } from '../../src/generative/tracker/planning-store'
import { PlanningTracker } from '../../src/generative/tracker/planning-tracker'
import { showcaseScenarios, type ShowcaseScenario } from './scenario-registry'

const SHOWCASE_NOW = '2026-12-08T09:00:00.000Z'
const DATE_BOUNDS = { from: '2026-12-01', to: '2026-12-15' } satisfies TravelDateBounds
const dataBaseUrl = new URL('./data/fares-v1/', document.baseURI)
const staticClient = createStaticQueryClient({ baseUrl: dataBaseUrl, arrivalCutoff: DATE_BOUNDS.to })
const bridge = createFareDataBridge({ client: staticClient, maxProjectionItems: 1_024 })

const LocationsFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  fields: z.tuple([
    z.literal('id'),
    z.literal('slug'),
    z.literal('city'),
    z.literal('countryCode'),
    z.literal('latitude'),
    z.literal('longitude'),
  ]),
  rows: z.array(z.tuple([z.number().int().positive(), z.string(), z.string(), z.string(), z.number(), z.number()])),
})

let locationPromise: Promise<ReadonlyArray<{ id: string; label: string }>> | undefined

function loadLocations(signal: AbortSignal): Promise<ReadonlyArray<{ id: string; label: string }>> {
  locationPromise ??= fetch(new URL('locations.json', dataBaseUrl))
    .then(response => {
      if (!response.ok) throw new Error(`Location data returned ${response.status}`)
      return response.json()
    })
    .then(value => LocationsFileSchema.parse(value).rows.map(([, slug, city, countryCode]) => ({
      id: slug,
      label: `${city}, ${countryCode}`,
    })))
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
  return new Promise((resolve, reject) => {
    const cancel = () => reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', cancel, { once: true })
    locationPromise!.then(
      value => { signal.removeEventListener('abort', cancel); resolve(value) },
      error => { signal.removeEventListener('abort', cancel); reject(error) },
    )
  })
}

function bindTree(node: PresentNode, datasetIds: readonly DatasetId[]): PresentNode {
  const children = Array.isArray(node.children)
    ? node.children.map(child => bindTree(child, datasetIds))
    : node.children && typeof node.children !== 'string'
      ? bindTree(node.children, datasetIds)
      : node.children
  const datasetRef = node.datasetRef
    ? datasetIds[node.legIndex ?? (datasetIds.length === 1 ? 0 : -1)]
    : undefined
  if (node.datasetRef && !datasetRef) throw new Error(`${node.$type} has no matching fare scope`)
  return {
    ...node,
    ...(datasetRef ? { datasetRef } : {}),
    ...(children === undefined ? {} : { children }),
  }
}

function RenderNode({ node }: { node: DisplayRenderNode }): ReactNode {
  const children = Array.isArray(node.children)
    ? node.children.map(child => <RenderNode key={child.__displayComponent.componentRef.value} node={child} />)
    : node.children && typeof node.children !== 'string'
      ? <RenderNode node={node.children} />
      : node.children
  return <CatalogNode
    kind={node.$type}
    artifactRef={node.artifactRef}
    datasetRef={node.datasetRef}
    legIndex={node.legIndex}
    title={node.title}
    tabLabel={node.tabLabel}
    routeTextLegIndex={node.routeTextLegIndex}
    body={node.body}
    variant={node.variant}
    actionRef={node.actionRef}
    selectorRef={node.selectorRef}
    $status="done"
    __displayComponent={node.__displayComponent}
  >{children}</CatalogNode>
}

type PreparedShowcase = {
  services: TravelServices
  planning: PlanningStore
  tree: DisplayRenderNode
  reset(): Promise<void>
  dispose(): void
}

async function prepareShowcase(scenario: ShowcaseScenario, signal: AbortSignal): Promise<PreparedShowcase> {
  const manifests = await Promise.all(scenario.scopes.map(scope => bridge.loadScope(scope, signal)))
  const bindings = manifests.map(manifest => bridge.getBinding(manifest.resourceKey))
  const datasetIds = bindings.map(binding => binding.datasetId)
  const artifactId = ArtifactIdSchema.parse(scenario.tree.artifactRef)
  const tree = validatePresentTree(
    bindTree(scenario.tree, datasetIds),
    createPresentValidationScope(
      [{ artifactId, legDatasetIds: datasetIds.map(datasetId => new Set([datasetId])) }],
      datasetIds,
    ),
  )
  const availableModesByLeg = Object.fromEntries(bindings.map(binding => {
    const coverage = binding.manifest.coverage
    return [`${coverage.originId}:${coverage.destinationId}`, binding.manifest.availableModes]
  }))
  const displayWindowByLeg = Object.fromEntries(bindings.map(binding => {
    const coverage = binding.manifest.coverage
    return [`${coverage.originId}:${coverage.destinationId}`, coverage.dateWindow]
  }))
  const state = createUIStateStore({ now: () => SHOWCASE_NOW })
  state.initializeMissing(artifactId, {
    datasetRefs: datasetIds,
    availableModesByLeg,
    requestedModesByLeg: availableModesByLeg,
    displayWindowByLeg,
    ...scenario.initialState,
  })
  const baseline = state.get(artifactId)
  if (!stateRespectsDateBounds(baseline, DATE_BOUNDS, bridge)) {
    throw new Error(`${scenario.title} starts outside the showcase date range`)
  }
  const planning = createPlanningStore()
  const router = createActionRouter(state, { bridge, planning, dateBounds: DATE_BOUNDS })
  let resetPromise: Promise<void> | undefined
  let resetController: AbortController | undefined
  let disposed = false
  const services: TravelServices = {
    bridge,
    state,
    activeId: () => artifactId,
    artifactIds: () => [artifactId],
    activate: () => {},
    dispatch: router,
    whenIdle: router.whenIdle,
    dateBounds: DATE_BOUNDS,
    loadLocations,
  }
  return {
    services,
    planning,
    tree: withDisplayComponentIdentity(tree, 'root', undefined, `site-${scenario.key}`),
    reset() {
      if (resetPromise) return resetPromise
      const controller = new AbortController()
      resetController = controller
      resetPromise = (async () => {
        router.abortTurn()
        const lease = router.beginTurn(`showcase-reset:${scenario.key}`)
        try {
          await lease.ready
          const current = state.get(artifactId)
          const currentResourceKeys = current.datasetRefs.flatMap(datasetId => {
            const binding = bridge.findBinding(datasetId)
            return binding ? [binding.resourceKey] : []
          })
          const results = await Promise.allSettled(scenario.scopes.map(scope => bridge.loadScope(scope, controller.signal)))
          const acquired = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
          const failure = results.find(result => result.status === 'rejected')
          const revisionChanged = state.get(artifactId).revision !== current.revision
          if (failure || disposed || revisionChanged) {
            for (const manifest of acquired) bridge.release(manifest.resourceKey)
            if (failure?.status === 'rejected') throw failure.reason
            if (revisionChanged) throw new Error('Travel state changed during reset')
            throw new DOMException('Disposed', 'AbortError')
          }
          const restoredBindings = acquired.map(manifest => bridge.getBinding(manifest.resourceKey))
          const revision = UIStateRevisionSchema.parse(current.revision + 1)
          state.replace({
            ...baseline,
            revision,
            datasetRefs: restoredBindings.map(binding => binding.datasetId),
            lastInteractionAt: new Date().toISOString(),
          })
          for (const resourceKey of currentResourceKeys) bridge.release(resourceKey)
          planning.clear()
        } finally {
          router.releaseTurn(lease.token)
        }
        await router.retry(artifactId)
      })().finally(() => {
        if (resetController === controller) resetController = undefined
        resetPromise = undefined
      })
      return resetPromise
    },
    dispose() {
      disposed = true
      resetController?.abort()
      const resourceKeys = state.get(artifactId).datasetRefs.flatMap(datasetId => {
        const binding = bridge.findBinding(datasetId)
        return binding ? [binding.resourceKey] : []
      })
      router.dispose()
      for (const resourceKey of resourceKeys) bridge.release(resourceKey)
    },
  }
}

function Showcase({ prepared }: { prepared: PreparedShowcase }) {
  const content = useMemo(() => <RenderNode node={prepared.tree} />, [prepared.tree])
  const [resetStatus, setResetStatus] = useState<'idle' | 'pending' | 'error'>('idle')
  const reset = () => {
    setResetStatus('pending')
    prepared.reset().then(
      () => setResetStatus('idle'),
      () => setResetStatus('error'),
    )
  }
  return <Fragment>
    <div className="showcase-toolbar">
      <span className="showcase-range">All departures · 1–15 Dec 2026</span>
      <button className="showcase-reset" type="button" disabled={resetStatus === 'pending'} onClick={reset}>
        {resetStatus === 'pending' ? 'Resetting…' : 'Reset composition'}
      </button>
      {resetStatus === 'error' && <span role="alert">Reset could not finish. Try again.</span>}
    </div>
    <TravelProvider services={prepared.services}>
      <div className="showcase-runtime" aria-busy={resetStatus === 'pending'} inert={resetStatus === 'pending'}>
        {content}
        <PlanningTracker store={prepared.planning} />
      </div>
    </TravelProvider>
  </Fragment>
}

type MountedCase = { root: Root; prepared: PreparedShowcase }
const mounted = new Map<string, MountedCase>()
const preparing = new Map<string, AbortController>()

function showFailure(host: HTMLElement, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unknown error'
  host.replaceChildren(Object.assign(document.createElement('p'), {
    className: 'composition-error',
    role: 'alert',
    textContent: `This composition could not load. ${message}`,
  }))
}

function mountCase(details: HTMLDetailsElement, scenario: ShowcaseScenario): void {
  if (!details.open || mounted.has(scenario.key) || preparing.has(scenario.key)) return
  const host = details.querySelector<HTMLElement>(`[data-showcase-case="${scenario.key}"]`)
  if (!host) return
  const controller = new AbortController()
  preparing.set(scenario.key, controller)
  prepareShowcase(scenario, controller.signal).then(prepared => {
    if (controller.signal.aborted) {
      prepared.dispose()
      return
    }
    const root = createRoot(host)
    root.render(<StrictMode><Showcase prepared={prepared} /></StrictMode>)
    host.dataset.showcaseMounted = scenario.key
    mounted.set(scenario.key, { root, prepared })
  }).catch(error => {
    if (!controller.signal.aborted) showFailure(host, error)
  }).finally(() => preparing.delete(scenario.key))
}

for (const scenario of showcaseScenarios) {
  const details = document.querySelector<HTMLDetailsElement>(`.case:has([data-showcase-case="${scenario.key}"])`)
  if (!details) continue
  details.addEventListener('toggle', () => mountCase(details, scenario))
  mountCase(details, scenario)
}

window.addEventListener('pagehide', () => {
  for (const controller of preparing.values()) controller.abort()
  preparing.clear()
  for (const item of mounted.values()) {
    item.root.unmount()
    item.prepared.dispose()
  }
  mounted.clear()
  bridge.dispose()
  staticClient.dispose()
}, { once: true })
