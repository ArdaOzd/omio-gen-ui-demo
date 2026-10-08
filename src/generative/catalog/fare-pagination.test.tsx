import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ArtifactIdSchema, DatasetIdSchema, QueryGroupsResponseSchema } from '../contracts'
import { FareItemSchema, type FareScope } from '../contracts/query-groups'
import { createFareDataBridge } from '../data/fare-data-bridge'
import type { ServerQueryClient } from '../data/server-query-client'
import { createDisplayContextStore } from '../state/display-context'
import { createActionRouter } from '../state/action-router'
import { createUIStateStore } from '../state/ui-state-store'
import { createFixedProjectionFixture } from '../testing/fixed-projection-fixture'
import { DisplayContextProvider, DisplayNodeProvider } from './display-context-provider'
import { TravelProvider, type TravelServices } from './context'
import { FareCards, FarePicker } from './views'
import { FadeFares, FareCalendar } from './trip-planning/components'

const scope: FareScope = { kind: 'fareScope', originId: 'london', destinationId: 'paris', dateWindow: { from: '2026-10-26', to: '2026-10-26' }, passengers: 1, earliestDeparture: { date: '2026-10-26', minutes: 0 } }
const items = Array.from({ length: 9 }, (_, index) => FareItemSchema.parse({
  id: `fare-${index + 1}`, originId: 'london', destinationId: 'paris', serviceDate: '2026-10-26', mode: 'train', carrierId: 'rail', carrierName: `Rail ${index + 1}`,
  priceCents: 2000 + index * 100, durationMinutes: 120, departureMinutes: 480 + index * 20, availableSeats: 4, currency: 'EUR', synthetic: true,
  priceBasis: 'per-passenger-including-demo-fees', direct: true,
  legs: [{ legIndex: 0, mode: 'train', carrierName: `Rail ${index + 1}`, durationMinutes: 120, originId: 'london', destinationId: 'paris', originLabel: 'London', destinationLabel: 'Paris' }],
}))

const selectorItems = Array.from({ length: 18 }, (_, index) => FareItemSchema.parse({
  ...items[0],
  id: `selector-fare-${index + 1}`,
  carrierName: `Selector Rail ${index + 1}`,
  priceCents: 3000 + index * 100,
  departureMinutes: 360 + index * 20,
  legs: [{ ...items[0]!.legs[0], carrierName: `Selector Rail ${index + 1}` }],
}))

async function renderSelector(component: 'picker'|'strip'|'calendar') {
  const fixture=createFixedProjectionFixture({rows:selectorItems,sourceVersion:'selector-source-1'})
  const manifest=await fixture.bridge.loadScope(scope,new AbortController().signal)
  const binding=fixture.bridge.getBinding(manifest.resourceKey)
  const artifactId=ArtifactIdSchema.parse(`artifact-${component}`)
  const state=createUIStateStore({now:()=> '2026-10-26T00:00:00.000Z'})
  state.initializeMissing(artifactId,{datasetRefs:[binding.datasetId],citySequence:['london','paris'],dates:{start:'2026-10-26'},availableModesByLeg:{'london:paris':['train']}})
  const router=createActionRouter(state,{bridge:fixture.bridge})
  const services={bridge:fixture.bridge,state,dispatch:router,activeId:()=>artifactId,activate:()=>{}} satisfies TravelServices
  const displayStore=createDisplayContextStore()
  const child=component==='picker'?<FarePicker artifactRef={artifactId} datasetRef={binding.datasetId}/>:component==='strip'?<FadeFares artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0}/>:<FareCalendar artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0}/>
  render(<DisplayContextProvider store={displayStore}><TravelProvider services={services}><DisplayNodeProvider identity={{componentRef:{value:`${artifactId}:present:${component}`,keySource:'authored-key'},componentType:component==='picker'?'FarePicker':component==='strip'?'FadeFares':'FareCalendar',scope:{kind:'leg',artifactId,legIndex:0,legKey:'london:paris',resourceKey:binding.resourceKey},authored:{}}}>{child}</DisplayNodeProvider></TravelProvider></DisplayContextProvider>)
  return{artifactId,state,displayStore,router}
}

describe('FareCards keyset pagination', () => {
  it('requests exactly the seven rendered rows and preserves a prior-page selection', async () => {
    const requests: Array<{ after: string | null; limit: number; projectionId: string }> = []
    const client: ServerQueryClient = {
      queryGroups: async request => QueryGroupsResponseSchema.parse({
        version: 1,
        requestId: request.requestId,
        sourceVersion: 'source-1',
        groups: request.groups.map(group => ({
          groupId: group.groupId,
          manifest: { kind: 'fareScopeManifest', resourceKey: 'scope-1', source: { kind: 'search', descriptorId: 'scope-1', sourceVersion: 'source-1' }, coverage: group.scope, totalAvailable: items.length, availableModes: ['train'], availableDateWindow: group.scope.dateWindow, complete: true },
          projections: group.projections.map(projection => {
            if (projection.kind !== 'farePage') throw new Error('Unexpected projection')
            requests.push({ after: projection.after, limit: projection.limit, projectionId: projection.projectionId })
            const offset = projection.after === 'cursor-7' ? 7 : 0
            const page = items.slice(offset, offset + projection.limit)
            return { projectionId: projection.projectionId, kind: 'farePage', inputHash: `input-${offset}`, resultFingerprint: `result-${offset}`, items: page, pageInfo: { total: items.length, returned: page.length, hasNextPage: offset + page.length < items.length, nextCursor: offset + page.length < items.length ? 'cursor-7' : null } }
          }),
        })),
      }),
      lookupPins: async () => { throw new Error('unused') },
    }
    const bridge = createFareDataBridge({ client })
    await bridge.loadScope(scope, new AbortController().signal)
    const artifactId = ArtifactIdSchema.parse('artifact-pages'), datasetId = DatasetIdSchema.parse('scope-1')
    const state = createUIStateStore({ now: () => '2026-10-26T00:00:00.000Z' })
    state.initializeMissing(artifactId, { datasetRefs: [datasetId], citySequence: ['london', 'paris'], dates: { start: '2026-10-26' } })
    const services = { bridge, state, activeId: () => artifactId, activate: () => {} } satisfies TravelServices
    const displayStore = createDisplayContextStore()
    render(<DisplayContextProvider store={displayStore}><TravelProvider services={services}><DisplayNodeProvider identity={{ componentRef: { value: 'artifact-pages:present:fares', keySource: 'authored-key' }, componentType: 'FareCards', scope: { kind: 'leg', artifactId, legIndex: 0, legKey: 'london:paris', resourceKey: 'scope-1' }, authored: {} }}><FareCards artifactRef={artifactId} datasetRef={datasetId} /></DisplayNodeProvider></TravelProvider></DisplayContextProvider>)

    await screen.findByText('Rail 1')
    expect(requests.at(-1)).toMatchObject({ after: null, limit: 7 })
    const firstProjectionId = requests.at(-1)?.projectionId
    fireEvent.click(screen.getByRole('button', { name: /Select Train Rail 1/i }))
    expect(state.get(artifactId).selectedFareIds).toEqual([items[0]!.id])
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Rail 8')
    await waitFor(() => expect(requests.at(-1)).toMatchObject({ after: 'cursor-7', limit: 7, projectionId: firstProjectionId }))
    expect(state.get(artifactId).selectedFareIds).toEqual([items[0]!.id])
    expect(screen.getByText('Page 2')).toBeVisible()

    const capture = displayStore.capture({ captureId: 'page-2', artifactIds: [artifactId] })
    expect(capture.exposedOrderedIds).toEqual([items[7]!.id, items[8]!.id])
    expect(capture.components[0]?.display?.payload).toMatchObject({ kind: 'fare-order', renderedRange: { fromRank: 8, toRank: 9 }, viewport: { offset: 7, limit: 2, cursor: 'cursor-7' } })
  })
})

describe('interactive selector pagination',()=>{
  it('reaches and selects a second FarePicker page while recording its exact order',async()=>{
    const {artifactId,state,displayStore,router}=await renderSelector('picker')
    await screen.findByRole('option',{name:/Selector Rail 1 ·/})
    fireEvent.click(within(screen.getByLabelText('Fare picker pages')).getByRole('button',{name:'Next'}))
    const second=await screen.findByRole('option',{name:/Selector Rail 13 ·/})
    fireEvent.change(screen.getByLabelText('Choose a synthetic fare'),{target:{value:second.getAttribute('value')}})
    expect(state.get(artifactId).selectedFareIds).toEqual([selectorItems[12]!.id])
    const capture=displayStore.capture({captureId:'picker-page-2',artifactIds:[artifactId]})
    expect(capture.exposedOrderedIds).toEqual(selectorItems.slice(12).map(item=>item.id))
    expect(capture.components[0]?.display?.payload).toMatchObject({kind:'fare-order',renderedRange:{fromRank:13,toRank:18},viewport:{offset:12,limit:6,cursor:'fixture-cursor-12'}})
    router.dispose()
  })

  it('reaches a second FareStrip page and keeps a prior-page selection pinned',async()=>{
    const {artifactId,state,displayStore,router}=await renderSelector('strip')
    const first=(await screen.findAllByRole('article'))[0]!
    fireEvent.click(within(first).getByRole('button',{name:'Choose fare'}))
    const pages=screen.getByLabelText('Fare pages for London to Paris')
    fireEvent.click(within(pages).getByRole('button',{name:'Next'}))
    await waitFor(()=>expect(within(pages).getByText('Page 2')).toBeVisible())
    expect(state.get(artifactId).selectedFareIds).toEqual([selectorItems[0]!.id])
    const capture=displayStore.capture({captureId:'strip-page-2',artifactIds:[artifactId]})
    expect(capture.exposedOrderedIds).toEqual(selectorItems.slice(16).map(item=>item.id))
    expect(capture.components[0]?.display?.payload).toMatchObject({kind:'fare-order',renderedRange:{fromRank:17,toRank:18},viewport:{offset:16,limit:2,cursor:'fixture-cursor-16'}})
    router.dispose()
  })

  it('reaches a second active-day FareCalendar page with a separate display record',async()=>{
    const {artifactId,displayStore,router}=await renderSelector('calendar')
    const pages=await screen.findByLabelText('Calendar fare pages for 2026-10-26')
    fireEvent.click(within(pages).getByRole('button',{name:'Next'}))
    await waitFor(()=>expect(within(pages).getByText('Page 2')).toBeVisible())
    const capture=displayStore.capture({captureId:'calendar-page-2',artifactIds:[artifactId]})
    const active=capture.components.find(component=>component.identity.componentType==='FareCalendarActiveDay')
    expect(active?.display?.payload).toMatchObject({kind:'fare-order',renderedRange:{fromRank:9,toRank:16},viewport:{offset:8,limit:8,cursor:'fixture-cursor-8'}})
    expect((active?.display?.payload.kind==='fare-order'?active.display.payload.orderedFareRefs:[]).map(item=>item.fareId)).toEqual(selectorItems.slice(8,16).map(item=>item.id))
    router.dispose()
  })
})
