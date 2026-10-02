import { describe, expect, it } from 'vitest'
import { createFareDataBridge } from './fare-data-bridge'
import { createUIStateStore } from '../state/ui-state-store'
import { ArtifactIdSchema, FareIdSchema, UIStateRevisionSchema, type CoverageRequest, type FareRow } from '../contracts'

const request: CoverageRequest = { originIds: ['london'], destinationIds: ['paris'], dateWindow: { from: '2026-10-02', to: '2026-10-02' }, modes: ['train', 'bus'], passengers: 2 }
const fare = (id: string, mode: 'train'|'bus', priceCents: number): FareRow => ({ id: FareIdSchema.parse(id),originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode,carrierId:'test',priceCents,durationMinutes:120,departureMinutes:600,availableSeats:4,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true })
const first = fare('fare-1','train',3000)
const second = fare('fare-2','bus',1000)

describe('shared browser data and artifact state', () => {
  it('declares complete only after exhausting pages and rejects conflicting fare identities', async () => {
    const calls: number[] = []
    const bridge = createFareDataBridge({ pageSource: async input => {
      calls.push(input.page)
      return { rows: input.page === 1 ? [first] : [second], total: 2, pages: 2, page: input.page, sourceVersion: 'fixture-v1' }
    } })
    const manifest = await bridge.load(request, new AbortController().signal)
    expect(calls).toEqual([1,2])
    expect(manifest.coverage).toMatchObject({complete:true,truncated:false})
    expect(manifest.rowCount).toBe(2)
    const conflict = createFareDataBridge({pageSource:async input => ({rows:[input.page===1?first:{...first,priceCents:999}], total:2,pages:2,page:input.page,sourceVersion:'fixture-v1'})})
    await expect(conflict.load(request,new AbortController().signal)).rejects.toThrow(/conflicting/i)
  })

  it('detaches one canceled subscriber while a coalesced resource still finishes for another', async () => {
    let finish: ((value: {rows:FareRow[];total:number;pages:number;page:number;sourceVersion:string}) => void) | undefined
    let sourceSignal: AbortSignal | undefined
    const bridge = createFareDataBridge({pageSource:async (_input,signal) => {sourceSignal=signal;return new Promise(resolve=>{finish=resolve})}})
    const firstAbort = new AbortController()
    const one = bridge.load(request,firstAbort.signal)
    const two = bridge.load(request,new AbortController().signal)
    firstAbort.abort()
    await expect(one).rejects.toMatchObject({name:'AbortError'})
    expect(sourceSignal?.aborted).toBe(false)
    if (!finish) throw new Error('load not started')
    finish({rows:[first],total:1,pages:1,page:1,sourceVersion:'fixture-v1'})
    expect((await two).coverage.complete).toBe(true)
  })

  it('marks row/page budgets partial and rejects gaps, mixed versions, and expired refs', async () => {
    const partial=createFareDataBridge({maxRows:1,pageSource:async input=>({rows:[first,second],total:2,pages:1,page:input.page,sourceVersion:'v1'})})
    const manifest=await partial.load(request,new AbortController().signal)
    expect(manifest.coverage).toMatchObject({complete:false,truncated:true});expect(manifest.rowCount).toBe(1)
    partial.release(manifest.datasetId);expect(()=>partial.getManifest(manifest.datasetId)).toThrow(/expired/i)
    const gap=createFareDataBridge({pageSource:async input=>({rows:[first],total:2,pages:1,page:input.page,sourceVersion:'v1'})})
    await expect(gap.load(request,new AbortController().signal)).rejects.toThrow(/exhaustion/i)
    const mixed=createFareDataBridge({pageSource:async input=>({rows:[input.page===1?first:second],total:2,pages:2,page:input.page,sourceVersion:input.page===1?'v1':'v2'})})
    await expect(mixed.load(request,new AbortController().signal)).rejects.toThrow(/source version/i)
  })

  it('preserves newer clicks and isolates two artifacts sharing one dataset', () => {
    const a = ArtifactIdSchema.parse('artifact-a');const b=ArtifactIdSchema.parse('artifact-b')
    const store = createUIStateStore()
    store.initializeMissing(a,{dates:{start:'2026-10-02'}})
    store.initializeMissing(b,{dates:{start:'2026-10-02'}})
    expect(store.dispatch({kind:'select',artifactId:a,fareId:first.id,selected:true}).status).toBe('applied')
    const current = store.get(a).revision
    store.initializeMissing(a,{selectedFareIds:[],revision:UIStateRevisionSchema.parse(0)})
    expect(store.get(a).selectedFareIds).toEqual([first.id])
    expect(store.dispatch({kind:'select',artifactId:a,fareId:second.id,selected:true,expectedRevision:UIStateRevisionSchema.parse(0)}).status).toBe('stale')
    expect(store.dispatch({kind:'select',artifactId:a,fareId:second.id,selected:true,expectedRevision:current}).status).toBe('applied')
    expect(store.get(b).selectedFareIds).toEqual([])
    expect(store.exportSnapshot(a).selectedFareIds).toEqual([first.id,second.id])
  })
})
