import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createFareDataBridge } from '../data/fare-data-bridge'
import { createUIStateStore } from '../state/ui-state-store'
import { ArtifactIdSchema, FareRowSchema, type FareRow } from '../contracts'
import { TravelProvider } from './context'
import { CatalogNode } from './component'
const artifactId=ArtifactIdSchema.parse('artifact-1')
const fare=(id:string,mode:'train'|'bus',price:number):FareRow=>FareRowSchema.parse({id,originId:'london',destinationId:'paris',serviceDate:'2026-10-09',mode,carrierId:mode==='train'?'eurostar':'flixbus',priceCents:price,durationMinutes:mode==='train'?140:470,departureMinutes:600,availableSeats:10,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true})
async function setup(){
 const bridge=createFareDataBridge({pageSource:async()=>({rows:[fare('f1','train',5500),fare('f2','bus',2300)],total:2,page:1,pages:1,sourceVersion:'fixture-v1'})})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-09'},modes:['train','bus'],passengers:2},new AbortController().signal)
 const state=createUIStateStore();state.initializeMissing(artifactId,{datasetRefs:[manifest.datasetId],dates:{start:'2026-10-09'}})
 const services={bridge,state,activate:()=>{},activeId:()=>artifactId}
 return{services,manifest,state}
}
describe('shared direct travel controls',()=>{
 it('updates siblings, selections and synthetic totals locally across repeated revisions',async()=>{
  const{services,state}=await setup()
  render(<TravelProvider services={services}><CatalogNode kind="ModeChips" artifactRef={artifactId}/><CatalogNode kind="FareCards" artifactRef={artifactId}/><CatalogNode kind="SyntheticTotal" artifactRef={artifactId}/></TravelProvider>)
  await screen.findByText('Eurostar');expect(screen.getByText('Flixbus')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Train'}));await waitFor(()=>expect(screen.queryByText('Flixbus')).not.toBeInTheDocument())
  fireEvent.click(screen.getByRole('button',{name:'Train'}));await screen.findByText('Flixbus')
  fireEvent.click(screen.getByRole('button',{name:/Select Bus Flixbus/}));await screen.findByText('€46.00')
  expect(state.get(artifactId).revision).toBe(3);expect(state.get(artifactId).selectedFareIds).toHaveLength(1)
 })
 it('allows complete controls during streaming without overwriting a newer click',async()=>{
  const{services,state}=await setup()
  const view=render(<TravelProvider services={services}><CatalogNode kind="ModeChips" artifactRef={artifactId} $status="streaming"/></TravelProvider>)
  fireEvent.click(screen.getByRole('button',{name:'Bus'}));const revision=state.get(artifactId).revision
  view.rerender(<TravelProvider services={services}><CatalogNode kind="ModeChips" artifactRef={artifactId} $status="done"/></TravelProvider>)
  expect(screen.getByRole('button',{name:'Bus'})).toHaveAttribute('aria-pressed','true');expect(state.get(artifactId).revision).toBe(revision)
 })
})
