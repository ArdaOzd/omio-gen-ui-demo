import { useEffect, useState, type ReactNode } from 'react'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { CatalogNode } from '../catalog/component'
import { TravelProvider, type TravelServices } from '../catalog/context'
import '../catalog/tokens.css'
import '../catalog/trip-planning/trip-planning.css'
import { ArtifactIdSchema, type DatasetId } from '../contracts'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createUIStateStore } from '../state/ui-state-store'
import { createActionRouter } from '../state/action-router'
import { PlanningTracker } from '../variants/a/planning-tracker'
import { validatePresentTree, type PresentNode } from '../variants/a/tree'

const artifactId=ArtifactIdSchema.parse('trip-planning-fixture')

export type TripPlanningFixtureWorkflow = 'multi-city' | 'flexible'

export function createTripPlanningFixtureTree(datasetIds: readonly DatasetId[], workflow: TripPlanningFixtureWorkflow = 'multi-city'): PresentNode {
 const bookingWorkflow: PresentNode[] = workflow === 'flexible'
  ? datasetIds.map((datasetRef,legIndex)=>({$type:'FareCalendar',$key:`fixture-calendar-${legIndex}`,artifactRef:artifactId,datasetRef,legIndex,actionRef:'calendarDateByLeg'}))
  : [{$type:'MultiCityPlanGrid',$key:'fixture-grid',artifactRef:artifactId,selectorRef:'legSchedule'}]
 const comparisons: PresentNode = {$type:'ResponsiveGrid',$key:'fixture-comparisons',artifactRef:artifactId,children:datasetIds.map((datasetRef,legIndex)=>({$type:'CheapestFastest',$key:`fixture-comparison-${legIndex}`,artifactRef:artifactId,datasetRef,legIndex,title:`Leg ${legIndex+1}: cheapest and fastest`}))}
 return validatePresentTree({$type:'TravelSurface',$key:'fixture-root',artifactRef:artifactId,children:[...bookingWorkflow,comparisons]},{artifactIds:new Set([artifactId]),datasetIds:new Set(datasetIds)})
}

function FixtureScene({node}:{node:PresentNode}):ReactNode{
 const children=Array.isArray(node.children)?node.children.map((child,index)=><FixtureScene key={child.$key??index} node={child}/>):node.children&&typeof node.children==='object'?<FixtureScene node={node.children}/>:node.children
 return <CatalogNode kind={node.$type} artifactRef={node.artifactRef} datasetRef={node.datasetRef} legIndex={node.legIndex} actionRef={node.actionRef} selectorRef={node.selectorRef} title={node.title} variant={node.variant} body={node.body}>{children}</CatalogNode>
}

export function TripPlanningFixture(){
 const workflow:TripPlanningFixtureWorkflow=new URLSearchParams(window.location.search).get('workflow')==='flexible'?'flexible':'multi-city'
 const [fixture]=useState(()=>{
  const bridge=createFareDataBridge()
  const state=createUIStateStore({now:()=> '2026-10-06T12:00:00.000Z'})
  return{bridge,state}
 })
 const [ready,setReady]=useState<{services:TravelServices;tree:PresentNode}|{error:true}>()
 useEffect(()=>{
  const controller=new AbortController()
  const firstScope={kind:'fareScope' as const,originId:'london',destinationId:'paris',dateWindow:{from:'2026-10-26',to:'2026-11-01'},passengers:1,earliestDeparture:{date:'2026-10-26',minutes:0}}
  const secondScope={kind:'fareScope' as const,originId:'paris',destinationId:'rome',dateWindow:{from:'2026-10-29',to:'2026-11-01'},passengers:1,earliestDeparture:{date:'2026-10-29',minutes:0}}
  Promise.all([
   fixture.bridge.loadScope(firstScope,controller.signal),
   fixture.bridge.loadScope(secondScope,controller.signal),
  ]).then(([first,second])=>{
   if(controller.signal.aborted)return
   const firstBinding=fixture.bridge.getBinding(first.resourceKey),secondBinding=fixture.bridge.getBinding(second.resourceKey)
   fixture.state.initializeMissing(artifactId,{datasetRefs:[firstBinding.datasetId,secondBinding.datasetId],citySequence:['london','paris','rome'],dates:{start:'2026-10-26',end:'2026-11-01'},stays:[{cityId:'paris',nights:3},{cityId:'rome',nights:0}],availableModesByLeg:{'london:paris':first.availableModes,'paris:rome':second.availableModes},displayWindowByLeg:{'london:paris':{from:'2026-10-26',to:'2026-11-01'},'paris:rome':{from:'2026-10-29',to:'2026-11-01'}}})
   const router=createActionRouter(fixture.state,{bridge:fixture.bridge})
   const services:TravelServices={bridge:fixture.bridge,state:fixture.state,activeId:()=>artifactId,artifactIds:()=>[artifactId],activate:()=>{},dispatch:router,whenIdle:router.whenIdle}
   const tree=createTripPlanningFixtureTree([firstBinding.datasetId,secondBinding.datasetId],workflow)
   setReady({services,tree})
  }).catch(()=>{if(!controller.signal.aborted)setReady({error:true})})
  return()=>controller.abort()
 },[fixture,workflow])
 if(!ready)return <div className="travel-app"><Skeleton className="travel-skeleton" role="status">Preparing the multi-city fixture…</Skeleton></div>
 if('error' in ready)return <div className="travel-app"><Alert>Fixture data could not be prepared.</Alert></div>
 return <div className="travel-app"><TravelProvider services={ready.services}><div className="travel-workspace"><main className="travel-chat"><div className="travel-viewport"><FixtureScene node={ready.tree}/></div></main><PlanningTracker/></div></TravelProvider></div>
}
