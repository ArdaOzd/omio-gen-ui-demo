import {expect,it,vi} from 'vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {ArtifactIdSchema,FareRowSchema} from '../../contracts'
import {createUIStateStore} from '../../state/ui-state-store'
import {createFareDataBridge} from '../../data/fare-data-bridge'
import {TravelProvider} from '../../catalog/context'
import {ReactiveScene} from './renderer'
import {createBToolkit} from './toolkit'
it('cannot change an accepted authored query to another artifact resource through primitive state',async()=>{
 const bridge=createFareDataBridge({pageSource:async input=>({rows:[FareRowSchema.parse({id:`fare-${input.originId}`,originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode:input.originId==='london'?'train':'bus',carrierId:'proof',priceCents:1000,durationMinutes:100,departureMinutes:600,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})],total:1,pages:1,page:1,sourceVersion:'v1'})})
 const request={originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-03',to:'2026-10-03'},modes:['train','bus'] as const,passengers:1}
 const own=await bridge.load({...request,modes:[...request.modes]},new AbortController().signal),foreign=await bridge.load({...request,modes:[...request.modes],originIds:['rome'],destinationIds:['milan']},new AbortController().signal)
 const id=ArtifactIdSchema.parse('own'),other=ArtifactIdSchema.parse('other'),state=createUIStateStore();state.initializeMissing(id,{datasetRefs:[own.datasetId],dates:{start:'2026-10-03'}});state.initializeMissing(other,{datasetRefs:[foreign.datasetId],dates:{start:'2026-10-03'}})
 const services={bridge,state,activeId:()=>id,activate:()=>{}}
 const program=`$resource = "${own.datasetId}"
q = Query("local_query", {version:1,sources:[{datasetRef:$resource,alias:"f"}],project:${JSON.stringify(FareRowSchema.keyof().options)},limit:100})
offers = FarePicker("${id}", "${own.datasetId}", null, null, "Offers", null, null, null, null, q)
change = RetryAction("${id}", null, null, null, "Use foreign resource", null, null, null, null, null, Action([@Set($resource, "${foreign.datasetId}")]))
root = TravelSurface("${id}", null, null, null, "Trip", null, [offers,change])`
 expect((await createBToolkit(services).compose_reactive_scene.execute({artifactRef:id,programRevision:0,program})).result).toMatchObject({status:'accepted'})
 const query=vi.spyOn(bridge,'query'),beforeOther=state.get(other)
 render(<TravelProvider services={services}><ReactiveScene artifactRef={id} program={program}/></TravelProvider>)
 await screen.findByRole('option',{name:/Train/})
 fireEvent.click(screen.getByRole('button',{name:'Use foreign resource'}))
 await waitFor(()=>expect(state.get(id).runtimeVariables.$resource).toBe(foreign.datasetId))
 await screen.findByRole('alert')
 expect(screen.queryByRole('option',{name:/Bus/})).toBeNull()
 expect(query.mock.calls.every(([input])=>input.sources.every(source=>source.datasetRef!==foreign.datasetId))).toBe(true)
 expect(state.get(id).datasetRefs).toEqual([own.datasetId]);expect(state.get(other)).toEqual(beforeOther)
 expect(await createBToolkit(services).compose_reactive_scene.execute({artifactRef:id,programRevision:0,program})).toMatchObject({isError:true,result:{status:'error'}})
})
