import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
import { FadeFares, FareCalendar, TransportSelect, TravelDate } from './trip-planning/components'

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

async function renderSelector(component: 'picker'|'strip'|'calendar', rows=selectorItems, wrapClient?: (client: ServerQueryClient)=>ServerQueryClient) {
  const fixedFixture=createFixedProjectionFixture({rows,sourceVersion:'selector-source-1'})
  const bridge=wrapClient?createFareDataBridge({client:wrapClient(fixedFixture.client)}):fixedFixture.bridge
  const fixture={...fixedFixture,bridge}
  const manifest=await bridge.loadScope(scope,new AbortController().signal)
  const binding=bridge.getBinding(manifest.resourceKey)
  const artifactId=ArtifactIdSchema.parse(`artifact-${component}`)
  const state=createUIStateStore({now:()=> '2026-10-26T00:00:00.000Z'})
  state.initializeMissing(artifactId,{datasetRefs:[binding.datasetId],citySequence:['london','paris'],dates:{start:'2026-10-26'},availableModesByLeg:{'london:paris':['train']}})
  const router=createActionRouter(state,{bridge})
  const services={bridge,state,dispatch:router,activeId:()=>artifactId,activate:()=>{}} satisfies TravelServices
  const displayStore=createDisplayContextStore()
  const child=component==='picker'?<FarePicker artifactRef={artifactId} datasetRef={binding.datasetId}/>:component==='strip'?<FadeFares artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0}/>:<FareCalendar artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0}/>
  render(<DisplayContextProvider store={displayStore}><TravelProvider services={services}><DisplayNodeProvider identity={{componentRef:{value:`${artifactId}:present:${component}`,keySource:'authored-key'},componentType:component==='picker'?'FarePicker':component==='strip'?'FadeFares':'FareCalendar',scope:{kind:'leg',artifactId,legIndex:0,legKey:'london:paris',resourceKey:binding.resourceKey},authored:{}}}>{child}</DisplayNodeProvider></TravelProvider></DisplayContextProvider>)
  return{artifactId,state,displayStore,router,fixture}
}

function scrollFareResultsToEnd(region:HTMLElement) {
  Object.defineProperties(region,{
    scrollTop:{value:180,writable:true,configurable:true},
    clientHeight:{value:240,configurable:true},
    scrollHeight:{value:400,configurable:true},
  })
  fireEvent.scroll(region)
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

  it('appends FareStrip pages while preserving their exact display handles and earlier selections',async()=>{
    const {artifactId,state,displayStore,router,fixture}=await renderSelector('strip')
    const region=await screen.findByRole('region',{name:'Scrollable fares from London to Paris'})
    expect(screen.getAllByRole('article')).toHaveLength(16)
    expect(screen.queryByLabelText('Fare pages for London to Paris')).not.toBeInTheDocument()

    scrollFareResultsToEnd(region)
    await waitFor(()=>expect(screen.getAllByRole('article')).toHaveLength(18))
    const first=screen.getAllByRole('article')[0]!
    const appended=screen.getAllByRole('article')[17]!
    fireEvent.click(within(first).getByRole('button',{name:'Choose fare'}))
    fireEvent.click(within(appended).getByRole('button',{name:'Choose fare'}))
    expect(state.get(artifactId).selectedFareIds).toEqual([selectorItems[0]!.id,selectorItems[17]!.id])
    expect(fixture.bridge.findCachedFare(selectorItems[17]!.id)?.id).toBe(selectorItems[17]!.id)

    const capture=displayStore.capture({captureId:'strip-scroll',artifactIds:[artifactId]})
    expect(capture.exposedOrderedIds).toEqual(selectorItems.map(item=>item.id))
    const root=capture.components.find(component=>component.identity.componentType==='FadeFares')
    expect(root?.display?.displayHandle).toBeUndefined()
    expect(root?.execution).toBeUndefined()
    expect(root?.display?.payload).toMatchObject({kind:'fare-order',renderedRange:{fromRank:1,toRank:18},viewport:{offset:0,limit:18}})
    const pages=capture.components.filter(component=>component.identity.componentType==='FareStripPage')
    expect(pages).toHaveLength(2)
    expect(pages.map(page=>page.identity.componentRef.value)).toEqual([`${artifactId}:present:strip.page-1`,`${artifactId}:present:strip.page-2`])
    expect(pages.every(page=>page.identity.scope.kind==='leg'&&page.identity.scope.legKey==='london:paris')).toBe(true)
    expect(pages.map(page=>page.display?.displayHandle).every(Boolean)).toBe(true)
    expect(new Set(pages.map(page=>page.display?.displayHandle)).size).toBe(2)
    expect(new Set(pages.map(page=>page.execution?.status==='ready'?page.execution.current.resultKey:undefined)).size).toBe(2)
    expect(pages[0]?.display?.payload).toMatchObject({kind:'fare-order',renderedRange:{fromRank:1,toRank:16}})
    expect(pages[1]?.display?.payload).toMatchObject({kind:'fare-order',renderedRange:{fromRank:17,toRank:18}})
    const firstPage=pages[0]!,firstHandle=firstPage.display?.displayHandle,firstExecution=firstPage.execution
    const appendedPage=pages[1]!,appendedHandle=appendedPage.display?.displayHandle,appendedExecution=appendedPage.execution
    expect(firstHandle).toBeDefined()
    expect(firstExecution?.status).toBe('ready')
    expect(appendedHandle).toBeDefined()
    expect(appendedExecution?.status).toBe('ready')
    if(!firstHandle||firstExecution?.status!=='ready'||!appendedHandle||appendedExecution?.status!=='ready')throw new Error('Expected inspectable fare pages')
    const inspected=displayStore.inspect({captureId:'strip-scroll',displayHandle:firstHandle,resultKey:firstExecution.current.resultKey,itemIds:[selectorItems[0]!.id],limit:5})
    expect(inspected.items[0]?.fact?.id).toBe(selectorItems[0]!.id)
    const appendedInspection=displayStore.inspect({captureId:'strip-scroll',displayHandle:appendedHandle,resultKey:appendedExecution.current.resultKey,itemIds:[selectorItems[17]!.id],limit:5})
    expect(appendedInspection.items[0]?.fact?.id).toBe(selectorItems[17]!.id)
    expect(capture.shownFareFacts.slice(0,2).map(item=>item.fact.id)).toEqual(selectorItems.slice(0,2).map(item=>item.id))
    router.dispose()
  })

  it('loads the next FareStrip page when its sentinel is already visible',async()=>{
    let reveal:undefined|(()=>void)
    class VisibleSentinelObserver {
      constructor(callback:IntersectionObserverCallback){reveal=()=>callback([{isIntersecting:true} as IntersectionObserverEntry],this as unknown as IntersectionObserver)}
      observe(){}
      disconnect(){}
    }
    vi.stubGlobal('IntersectionObserver',VisibleSentinelObserver)
    try{
      const {router}=await renderSelector('strip')
      await screen.findByRole('region',{name:'Scrollable fares from London to Paris'})
      expect(screen.getAllByRole('article')).toHaveLength(16)
      expect(reveal).toBeDefined()
      act(()=>reveal?.())
      await waitFor(()=>expect(screen.getAllByRole('article')).toHaveLength(18))
      router.dispose()
    }finally{
      vi.unstubAllGlobals()
    }
  })

  it('keeps loaded FareStrip rows and retries a failed progressive page',async()=>{
    let failAppend=true
    const wrapClient=(client:ServerQueryClient):ServerQueryClient=>({
      queryGroups:async(request,signal)=>{
        const hasAppend=request.groups.some(group=>group.projections.some(projection=>projection.kind==='farePage'&&projection.after!==null))
        if(hasAppend&&failAppend){failAppend=false;throw new Error('temporary append failure')}
        return client.queryGroups(request,signal)
      },
      lookupPins:(request,signal)=>client.lookupPins(request,signal),
    })
    const {router}=await renderSelector('strip',selectorItems,wrapClient)
    const region=await screen.findByRole('region',{name:'Scrollable fares from London to Paris'})
    scrollFareResultsToEnd(region)
    const retry=await screen.findByRole('button',{name:'Retry loading fares'})
    expect(screen.getAllByRole('article')).toHaveLength(16)
    expect(screen.getByText('More fares could not load.')).toBeVisible()
    fireEvent.click(retry)
    await waitFor(()=>expect(screen.getAllByRole('article')).toHaveLength(18))
    expect(screen.queryByRole('button',{name:'Retry loading fares'})).not.toBeInTheDocument()
    router.dispose()
  })

  it('progressively renders more than the serialized 100-fare context bound',async()=>{
    const manyItems=Array.from({length:112},(_,index)=>FareItemSchema.parse({
      ...items[0],
      id:`many-fare-${index+1}`,
      carrierName:`Many Rail ${index+1}`,
      departureMinutes:300+index*5,
      legs:[{...items[0]!.legs[0],carrierName:`Many Rail ${index+1}`}],
    }))
    const {artifactId,displayStore,router}=await renderSelector('strip',manyItems)
    const region=await screen.findByRole('region',{name:'Scrollable fares from London to Paris'})
    expect(screen.getAllByRole('article')).toHaveLength(16)
    for(const expected of [32,48,64,80,96,112]){
      scrollFareResultsToEnd(region)
      await waitFor(()=>expect(screen.getAllByRole('article')).toHaveLength(expected))
    }
    const capture=displayStore.capture({captureId:'strip-over-context-bound',artifactIds:[artifactId]})
    const root=capture.components.find(component=>component.identity.componentType==='FadeFares')
    expect(root?.display).toMatchObject({totalDisplayed:112,includedCount:100,complete:false,omittedCount:12})
    expect(capture.exposedOrderedIds).toEqual(manyItems.slice(0,100).map(item=>item.id))
    expect(screen.getAllByRole('article')).toHaveLength(112)
    router.dispose()
  })

  it('resets accumulated FareStrip pages and rejects a late append when its leg modes change',async()=>{
    const mixedItems=(['train','bus'] as const).flatMap((mode,modeIndex)=>Array.from({length:18},(_,index)=>FareItemSchema.parse({
      ...items[0],
      id:`${mode}-fare-${index+1}`,
      mode,
      carrierId:mode==='train'?'rail':'bus-line',
      carrierName:mode==='train'?`Mode Rail ${index+1}`:`Mode Bus ${index+1}`,
      departureMinutes:300+modeIndex*600+index*20,
      legs:[{...items[0]!.legs[0],mode,carrierName:mode==='train'?`Mode Rail ${index+1}`:`Mode Bus ${index+1}`}],
    })))
    const fixture=createFixedProjectionFixture({rows:mixedItems,sourceVersion:'mode-page-source-1'})
    let releaseLateAppend:()=>void=()=>{}
    const lateAppendGate=new Promise<void>(resolve=>{releaseLateAppend=resolve})
    let lateAppendStarted=false
    const client:ServerQueryClient={
      queryGroups:async(request,signal)=>{
        const isThirdPage=request.groups.some(group=>group.projections.some(projection=>projection.kind==='farePage'&&projection.after==='fixture-cursor-32'))
        if(!isThirdPage)return fixture.client.queryGroups(request,signal)
        lateAppendStarted=true
        await lateAppendGate
        return fixture.client.queryGroups(request,new AbortController().signal)
      },
      lookupPins:(request,signal)=>fixture.client.lookupPins(request,signal),
    }
    const bridge=createFareDataBridge({client})
    const manifest=await bridge.loadScope(scope,new AbortController().signal)
    const binding=bridge.getBinding(manifest.resourceKey)
    const artifactId=ArtifactIdSchema.parse('artifact-mode-pages')
    const state=createUIStateStore({now:()=> '2026-10-26T00:00:00.000Z'})
    state.initializeMissing(artifactId,{datasetRefs:[binding.datasetId],citySequence:['london','paris'],dates:{start:'2026-10-26'},availableModesByLeg:{'london:paris':['train','bus']}})
    const router=createActionRouter(state,{bridge})
    const services={bridge,state,dispatch:router,activeId:()=>artifactId,activate:()=>{}} satisfies TravelServices
    render(<TravelProvider services={services}><TransportSelect artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0}/><FadeFares artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0}/></TravelProvider>)

    const region=await screen.findByRole('region',{name:'Scrollable fares from London to Paris'})
    scrollFareResultsToEnd(region)
    await waitFor(()=>expect(screen.getAllByRole('article')).toHaveLength(32))
    scrollFareResultsToEnd(region)
    await waitFor(()=>expect(lateAppendStarted).toBe(true))

    fireEvent.click(screen.getByRole('button',{name:'Train'}))
    await waitFor(()=>expect(screen.getAllByRole('article')).toHaveLength(16))
    await act(async()=>{releaseLateAppend();await lateAppendGate})
    await waitFor(()=>expect(screen.getAllByRole('article')).toHaveLength(16))
    expect(screen.getAllByRole('article').every(article=>article.textContent?.includes('Mode Bus'))).toBe(true)
    expect((await screen.findByRole('region',{name:'Scrollable fares from London to Paris'})).scrollTop).toBe(0)
    router.dispose()
  })

  it('discards accumulated pages and resets the viewport when the trip departure date changes',async()=>{
    const datedItems=['2026-10-26','2026-10-27'].flatMap(serviceDate=>Array.from({length:24},(_,index)=>FareItemSchema.parse({
      ...items[0],
      id:`date-${serviceDate}-fare-${index+1}`,
      serviceDate,
      carrierName:`Date ${serviceDate} Rail ${index+1}`,
      departureMinutes:300+index*20,
      legs:[{...items[0]!.legs[0],carrierName:`Date ${serviceDate} Rail ${index+1}`}],
    })))
    const fixture=createFixedProjectionFixture({rows:datedItems,sourceVersion:'date-page-source-1',sourceDateWindow:{from:'2026-10-26',to:'2026-10-27'}})
    const manifest=await fixture.bridge.loadScope({...scope,dateWindow:{from:'2026-10-26',to:'2026-10-27'}},new AbortController().signal)
    const binding=fixture.bridge.getBinding(manifest.resourceKey)
    const artifactId=ArtifactIdSchema.parse('artifact-date-pages')
    const state=createUIStateStore({now:()=> '2026-10-26T00:00:00.000Z'})
    state.initializeMissing(artifactId,{
      datasetRefs:[binding.datasetId],
      citySequence:['london','paris'],
      dates:{start:'2026-10-26'},
      displayWindowByLeg:{'london:paris':{from:'2026-10-26',to:'2026-10-26'}},
      availableModesByLeg:{'london:paris':['train']},
    })
    const router=createActionRouter(state,{bridge:fixture.bridge})
    const services={bridge:fixture.bridge,state,dispatch:router,activeId:()=>artifactId,activate:()=>{}} satisfies TravelServices
    render(<TravelProvider services={services}><TravelDate artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0}/><FadeFares artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0}/></TravelProvider>)

    const oldRegion=await screen.findByRole('region',{name:'Scrollable fares from London to Paris'})
    scrollFareResultsToEnd(oldRegion)
    await waitFor(()=>expect(screen.getAllByRole('article')).toHaveLength(24))
    expect(screen.getAllByRole('article').every(article=>article.textContent?.includes('2026-10-26'))).toBe(true)
    Object.defineProperty(oldRegion,'scrollTop',{value:1153,writable:true,configurable:true})

    fireEvent.change(screen.getByLabelText('Departure'),{target:{value:'2026-10-27'}})
    await router.whenIdle(artifactId)
    await waitFor(()=>expect(screen.getAllByRole('article')).toHaveLength(16))
    const newRegion=await screen.findByRole('region',{name:'Scrollable fares from London to Paris'})
    expect(newRegion).not.toBe(oldRegion)
    expect(newRegion.scrollTop).toBe(0)
    expect(screen.getAllByRole('article').every(article=>article.textContent?.includes('2026-10-27'))).toBe(true)
    expect(screen.queryByText(/2026-10-26/)).not.toBeInTheDocument()
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

  it('moves a persisted FareCalendar day into a shifted trip window',async()=>{
    const datedItems=['2026-10-26','2026-10-27'].map((serviceDate,index)=>FareItemSchema.parse({
      ...items[0],
      id:`dated-calendar-fare-${index+1}`,
      serviceDate,
      carrierName:`Dated Rail ${index+1}`,
      legs:[{...items[0]!.legs[0],carrierName:`Dated Rail ${index+1}`}],
    }))
    const fixture=createFixedProjectionFixture({rows:datedItems,sourceVersion:'calendar-date-shift-source-1',sourceDateWindow:{from:'2026-10-26',to:'2026-10-27'}})
    const manifest=await fixture.bridge.loadScope({
      ...scope,
      dateWindow:{from:'2026-10-26',to:'2026-10-27'},
    },new AbortController().signal)
    const binding=fixture.bridge.getBinding(manifest.resourceKey)
    const artifactId=ArtifactIdSchema.parse('artifact-calendar-date-shift')
    const state=createUIStateStore({now:()=> '2026-10-26T00:00:00.000Z'})
    state.initializeMissing(artifactId,{
      datasetRefs:[binding.datasetId],
      citySequence:['london','paris'],
      dates:{start:'2026-10-26'},
      displayWindowByLeg:{'london:paris':{from:'2026-10-26',to:'2026-10-26'}},
      calendarDateByLeg:{'london:paris':'2026-10-26'},
      availableModesByLeg:{'london:paris':['train']},
    })
    const router=createActionRouter(state,{bridge:fixture.bridge})
    const services={bridge:fixture.bridge,state,dispatch:router,activeId:()=>artifactId,activate:()=>{}} satisfies TravelServices
    const displayStore=createDisplayContextStore()
    render(<DisplayContextProvider store={displayStore}><TravelProvider services={services}><DisplayNodeProvider identity={{componentRef:{value:`${artifactId}:present:calendar`,keySource:'authored-key'},componentType:'FareCalendar',scope:{kind:'leg',artifactId,legIndex:0,legKey:'london:paris',resourceKey:binding.resourceKey},authored:{}}}><FareCalendar artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0}/><FadeFares artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0}/></DisplayNodeProvider></TravelProvider></DisplayContextProvider>)

    await screen.findByLabelText('Calendar fare pages for 2026-10-26')
    act(()=>state.dispatch({kind:'dates',artifactId,dates:{start:'2026-10-27'}}))

    await screen.findByLabelText('Calendar fare pages for 2026-10-27')
    expect(screen.getByRole('heading',{name:'Tuesday 27 October'})).toBeVisible()
    await waitFor(()=>expect(state.get(artifactId).calendarDateByLeg['london:paris']).toBe('2026-10-27'))
    expect(screen.queryByText('Calendar fares could not load. Try the date again.')).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('article')).toHaveTextContent('2026-10-27')
    router.dispose()
  })
})

it('reports omitted FareCalendar days when requested coverage exceeds the 62-day display cap',async()=>{
  const start=Date.parse('2026-10-01T00:00:00.000Z')
  const calendarRows=Array.from({length:62},(_,index)=>{
    const serviceDate=new Date(start+index*86_400_000).toISOString().slice(0,10)
    return FareItemSchema.parse({
      ...items[0],
      id:`long-calendar-${serviceDate}`,
      serviceDate,
      carrierName:`Calendar Rail ${index+1}`,
      legs:[{...items[0]!.legs[0],carrierName:`Calendar Rail ${index+1}`}],
    })
  })
  const fixture=createFixedProjectionFixture({rows:calendarRows,sourceVersion:'long-calendar-source-1',sourceDateWindow:{from:'2026-10-01',to:'2026-12-01'}})
  const requestedScope:FareScope={...scope,dateWindow:{from:'2026-10-01',to:'2026-12-02'},earliestDeparture:{date:'2026-10-01',minutes:0}}
  const manifest=await fixture.bridge.loadScope(requestedScope,new AbortController().signal)
  const binding=fixture.bridge.getBinding(manifest.resourceKey)
  const artifactId=ArtifactIdSchema.parse('artifact-long-calendar')
  const state=createUIStateStore()
  state.initializeMissing(artifactId,{
    datasetRefs:[binding.datasetId],
    citySequence:['london','paris'],
    dates:{start:'2026-10-01',end:'2026-12-02'},
    displayWindowByLeg:{'london:paris':{from:'2026-10-01',to:'2026-12-02'}},
    availableModesByLeg:{'london:paris':['train']},
  })
  const router=createActionRouter(state,{bridge:fixture.bridge})
  const displayStore=createDisplayContextStore()
  render(<DisplayContextProvider store={displayStore}><TravelProvider services={{bridge:fixture.bridge,state,dispatch:router,activeId:()=>artifactId,activate:()=>{}}}><DisplayNodeProvider identity={{componentRef:{value:'artifact-long-calendar:present:calendar',keySource:'authored-key'},componentType:'FareCalendar',scope:{kind:'leg',artifactId,legIndex:0,legKey:'london:paris',resourceKey:binding.resourceKey},authored:{}}}><FareCalendar artifactRef={artifactId} datasetRef={binding.datasetId} legIndex={0}/></DisplayNodeProvider></TravelProvider></DisplayContextProvider>)

  await waitFor(()=>expect(document.querySelectorAll('.trip-calendar-day')).toHaveLength(62))
  await waitFor(()=>{
    const capture=displayStore.capture({captureId:'long-calendar',artifactIds:[artifactId]})
    const calendar=capture.components.find(component=>component.identity.componentType==='FareCalendar')
    expect(calendar?.display).toMatchObject({totalDisplayed:63,includedCount:62,complete:false,omittedCount:1})
    expect(calendar?.display?.payload.kind).toBe('calendar')
    if(calendar?.display?.payload.kind==='calendar'){
      expect(calendar.display.payload.cells).toHaveLength(62)
      expect(calendar.display.payload.cells.at(-1)?.key).toBe('2026-12-01')
    }
  })
  router.dispose()
})
