import {expect,it} from 'vitest'
import {fireEvent,render,screen} from '@testing-library/react'
import {ArtifactIdSchema,BoundedFareFactSchema,FareRowSchema,parseQuery} from '../contracts'
import {assertNoBulkData} from '../contracts/privacy'
import {createFareDataBridge} from './fare-data-bridge'
import {createSearchPageSource} from './search-client'
import {createUIStateStore} from '../state/ui-state-store'
import {TravelProvider} from '../catalog/context'
import {CatalogNode} from '../catalog/component'
import {ReactiveScene} from '../variants/b/renderer'
const request={originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-02'},modes:['bus'] as const,passengers:1}
const apiRow={id:'same-fare',mode:'bus',company:'Blablacar Bus',departure_time:'2026-10-02T09:00',duration_minutes:120,origin:{id:'london'},destination:{id:'paris'},price_cents:2103,currency:'EUR',available_seats:9}
const pageSource=createSearchPageSource({fetch:async()=>new Response(JSON.stringify({source_version:'v1',outbound:{date:'2026-10-02',page:1,pages:1,total:1,results:[apiRow]}}))})
it('retains API carrier names and same IDs through bounded facts and old authored projections',async()=>{
 const bridge=createFareDataBridge({pageSource}),manifest=await bridge.load({...request,modes:[...request.modes]},new AbortController().signal)
 const fact=await bridge.lookupFare(FareRowSchema.shape.id.parse(apiRow.id),['id'])
 expect(fact).toMatchObject({id:apiRow.id,carrierId:'carrier-1ixeerp',carrierName:apiRow.company})
 const state=createUIStateStore(),id=ArtifactIdSchema.parse('labels');state.initializeMissing(id,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-02'}})
 const legacyFields=FareRowSchema.keyof().options.filter(field=>field!=='carrierName')
 const program=`q = Query("local_query", {version:1,sources:[{datasetRef:"${manifest.datasetId}",alias:"f"}],project:${JSON.stringify(legacyFields)},limit:100})\noffers = FarePicker("labels", "${manifest.datasetId}", null, null, "Offers", null, null, null, null, q)\nroot = TravelSurface("labels", null, null, null, "Trip", null, [offers])`
 render(<TravelProvider services={{bridge,state,activate:()=>{},activeId:()=>id}}><ReactiveScene artifactRef={id} program={program}/></TravelProvider>)
 expect(await screen.findByRole('option',{name:/Blablacar Bus/})).toHaveValue(apiRow.id)
 expect(state.get(id).datasetRefs).toEqual([manifest.datasetId]);expect(state.get(id).selectedFareIds).toEqual([])
})
it('projects and orders nullable display names without breaking unlabeled legacy rows or bypassing declared nullability',async()=>{
 const named=(await pageSource({originId:'london',destinationId:'paris',date:'2026-10-02',passengers:1,page:1,limit:100},new AbortController().signal)).rows[0];if(!named)throw new Error('Missing fixture')
 const {carrierName:_name,...legacy}=named
 expect(FareRowSchema.parse(legacy)).toEqual(legacy)
 const {availableSeats:_seats,direct:_direct,...legacyFact}=legacy
 expect(BoundedFareFactSchema.parse(legacyFact)).toEqual(legacyFact)
 const bridge=createFareDataBridge({pageSource:async()=>({rows:[{...named,id:FareRowSchema.shape.id.parse('named')},{...legacy,id:FareRowSchema.shape.id.parse('legacy')}],total:2,pages:1,page:1,sourceVersion:'v1'})})
 const manifest=await bridge.load({...request,modes:[...request.modes]},new AbortController().signal)
 for(const project of [undefined,['id','carrierName']]){
  const query=parseQuery({version:1,sources:[{datasetRef:manifest.datasetId,alias:'f'}],project,orderBy:[{field:'carrierName',direction:'asc'}],limit:2},[manifest]),result=await bridge.query(query,new AbortController().signal)
  expect(result.rows.map(row=>[row.id,row.carrierName])).toEqual([['named','Blablacar Bus'],['legacy',null]])
 }
 const missing=parseQuery({version:1,sources:[{datasetRef:manifest.datasetId,alias:'f'}],where:{field:'carrierName',op:'eq',value:null},project:['id','carrierName'],limit:2},[manifest])
 expect((await bridge.query(missing,new AbortController().signal)).rows).toEqual([{id:'legacy',carrierName:null}])
 expect(()=>assertNoBulkData({hidden:{const:[legacy]}})).toThrow('Copied normalized fare data')
})

it('keeps label indexes within resource generations and removes them when their resource is released',async()=>{
 let generation='one',label='First API provider'
 const bridge=createFareDataBridge({pageSource:async input=>({rows:[FareRowSchema.parse({id:input.date,originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:'bus',carrierId:'stable-legacy-provider',carrierName:label,priceCents:1000,durationMinutes:120,departureMinutes:600,availableSeats:9,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})],total:1,pages:1,page:1,sourceVersion:generation})})
 const first=await bridge.load({...request,modes:[...request.modes]},new AbortController().signal)
 generation='two';label='Updated API provider'
 const second=await bridge.load({...request,modes:[...request.modes],dateWindow:{from:'2026-10-03',to:'2026-10-03'}},new AbortController().signal)
 expect(bridge.getCarrierLabel?.('stable-legacy-provider',first.datasetId)).toBe('First API provider')
 expect(bridge.getCarrierLabel?.('stable-legacy-provider',second.datasetId)).toBe('Updated API provider')
 expect(bridge.getCarrierLabel?.('stable-legacy-provider')).toBeUndefined()
 bridge.release(first.datasetId);expect(bridge.getCarrierLabel?.('stable-legacy-provider',first.datasetId)).toBeUndefined()
 expect(bridge.getCarrierLabel?.('stable-legacy-provider')).toBe('Updated API provider')
 bridge.release(second.datasetId);expect(bridge.getCarrierLabel?.('stable-legacy-provider')).toBeUndefined()
})

it('shows authoritative names in carrier filters while dispatching only the same stable carrier ID',async()=>{
 const bridge=createFareDataBridge({pageSource}),manifest=await bridge.load({...request,modes:[...request.modes]},new AbortController().signal),state=createUIStateStore(),id=ArtifactIdSchema.parse('carrier-control')
 state.initializeMissing(id,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-02'}})
 render(<TravelProvider services={{bridge,state,activate:()=>{},activeId:()=>id}}><CatalogNode kind="CarrierFilter" artifactRef={id} datasetRef={manifest.datasetId}/></TravelProvider>)
 const checkbox=await screen.findByRole('checkbox',{name:'Blablacar Bus'});fireEvent.click(checkbox)
 expect(state.get(id).filters.carrierIds).toEqual(['carrier-1ixeerp']);expect(checkbox).toBeChecked()
})
