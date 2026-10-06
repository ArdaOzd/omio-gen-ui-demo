import { useEffect, useState, type ReactNode } from 'react'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { CatalogNode } from '../catalog/component'
import { TravelProvider, type TravelServices } from '../catalog/context'
import '../catalog/tokens.css'
import '../catalog/trip-planning/trip-planning.css'
import { ArtifactIdSchema, FareRowSchema, type TransportMode } from '../contracts'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createUIStateStore } from '../state/ui-state-store'
import { createActionRouter } from '../state/action-router'
import { PlanningTracker } from '../variants/a/planning-tracker'
import { validatePresentTree, type PresentNode } from '../variants/a/tree'

const artifactId=ArtifactIdSchema.parse('trip-planning-fixture')
const modes:TransportMode[]=['train','bus','flight','ferry']

function FixtureScene({node}:{node:PresentNode}):ReactNode{
 const children=Array.isArray(node.children)?node.children.map((child,index)=><FixtureScene key={child.$key??index} node={child}/>):node.children&&typeof node.children==='object'?<FixtureScene node={node.children}/>:node.children
 return <CatalogNode kind={node.$type} artifactRef={node.artifactRef} datasetRef={node.datasetRef} legIndex={node.legIndex} actionRef={node.actionRef} selectorRef={node.selectorRef} title={node.title} variant={node.variant} body={node.body}>{children}</CatalogNode>
}

export function TripPlanningFixture(){
 const [fixture]=useState(()=>{
  const bridge=createFareDataBridge({pageSource:async input=>({
   rows:modes.map((mode,index)=>FareRowSchema.parse({id:`${input.originId}-${input.destinationId}-${input.date}-${mode}`,originId:input.originId,destinationId:input.destinationId,serviceDate:input.date,mode,carrierId:`fixture-${mode}`,carrierName:`Fixture ${mode}`,priceCents:2400+index*1700+(Number(input.date.slice(-2))%5)*250,durationMinutes:input.originId==='london'&&input.date==='2026-10-26'&&mode==='train'?1200:120+index*95,departureMinutes:input.originId==='london'&&input.date==='2026-10-26'&&mode==='train'?1260:1080+index*30,availableSeats:8,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})),
   total:modes.length,page:input.page,pages:1,sourceVersion:'fixture-v1',
  })})
  const state=createUIStateStore({now:()=> '2026-10-06T12:00:00.000Z'})
  return{bridge,state}
 })
 const [ready,setReady]=useState<{services:TravelServices;tree:PresentNode}|{error:true}>()
 useEffect(()=>{
  const controller=new AbortController()
  Promise.all([
   fixture.bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-23',to:'2026-11-03'},modes,passengers:1},controller.signal),
   fixture.bridge.load({originIds:['paris'],destinationIds:['rome'],dateWindow:{from:'2026-10-27',to:'2026-11-05'},modes,passengers:1},controller.signal),
  ]).then(([first,second])=>{
   if(controller.signal.aborted)return
   fixture.state.initializeMissing(artifactId,{datasetRefs:[first.datasetId,second.datasetId],citySequence:['london','paris','rome'],dates:{start:'2026-10-26',end:'2026-11-01'},stays:[{cityId:'paris',nights:3},{cityId:'rome',nights:0}],availableModesByLeg:{'london:paris':['train','bus','flight','ferry'],'paris:rome':['train','bus','flight','ferry']},displayWindowByLeg:{'london:paris':{from:'2026-10-26',to:'2026-11-01'},'paris:rome':{from:'2026-10-29',to:'2026-11-01'}}})
   const router=createActionRouter(fixture.state,{bridge:fixture.bridge})
   const services:TravelServices={bridge:fixture.bridge,state:fixture.state,activeId:()=>artifactId,artifactIds:()=>[artifactId],activate:()=>{},dispatch:router,whenIdle:router.whenIdle}
   const tree=validatePresentTree({$type:'TravelSurface',$key:'fixture-root',artifactRef:artifactId,children:[{$type:'MultiCityPlanGrid',$key:'fixture-grid',artifactRef:artifactId,selectorRef:'legSchedule'},{$type:'FareCalendar',$key:'fixture-calendar',artifactRef:artifactId,datasetRef:first.datasetId,legIndex:0,actionRef:'calendarDateByLeg'}]},{artifactIds:new Set([artifactId]),datasetIds:new Set([first.datasetId,second.datasetId])})
   setReady({services,tree})
  }).catch(()=>{if(!controller.signal.aborted)setReady({error:true})})
  return()=>controller.abort()
 },[fixture])
 if(!ready)return <div className="travel-app"><Skeleton className="travel-skeleton" role="status">Preparing the multi-city fixture…</Skeleton></div>
 if('error' in ready)return <div className="travel-app"><Alert>Fixture data could not be prepared.</Alert></div>
 return <div className="travel-app"><TravelProvider services={ready.services}><div className="travel-workspace"><main className="travel-chat"><div className="travel-viewport"><FixtureScene node={ready.tree}/></div></main><PlanningTracker/></div></TravelProvider></div>
}
