import { expect, it } from 'vitest'
import { ArtifactIdSchema, FareIdSchema, UIStateRevisionSchema, type ArtifactUIState, type BoundedFareFact, type Coverage } from '../contracts'
import { fareMeetsThreshold, legThreshold, scheduleLegs, staleDownstreamFareIds } from './itinerary-schedule'
import {legState} from './leg-bindings'

const state = (nights = 3): ArtifactUIState => ({
  artifactId: ArtifactIdSchema.parse('schedule'), revision: UIStateRevisionSchema.parse(0), runtimeVariables: {}, datasetRefs: [],
  filters: {modes: [], carrierIds: [], directOnly: false}, dates: {start: '2026-10-26'},
  citySequence:['london','paris','rome'],stays: [{cityId: 'paris', nights}], modesByLeg: {}, availableModesByLeg:{},requestedModesByLeg:{}, displayWindowByLeg:{}, sort: {field: 'priceCents', direction: 'asc'},sortByLeg:{},calendarDateByLeg:{},
  selectedFareIds: [], pending: [], lastInteractionAt: '2026-10-01T00:00:00.000Z',
})
const fare = (id:string, originId:string, destinationId:string, serviceDate:string, departureMinutes:number, durationMinutes:number):BoundedFareFact => ({
  id:FareIdSchema.parse(id),originId,destinationId,serviceDate,departureMinutes,durationMinutes,mode:'train',carrierId:'rail',carrierName:'Rail',priceCents:1000,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',
})
const coverage=(originId:string,destinationId:string):Coverage=>({originIds:[originId],destinationIds:[destinationId],dateWindow:{from:'2026-10-01',to:'2026-11-30'},modes:['train'],passengers:1,complete:true,truncated:false})

it('cascades 26th 21:00 plus 20 hours plus a three-day stay to 30th 17:00',()=>{
 const preceding=fare('first','london','paris','2026-10-26',21*60,20*60)
 expect(legThreshold(state(),coverage('paris','rome'),[preceding])).toEqual({date:'2026-10-30',minutes:17*60,source:'selected-arrival',precedingFareId:preceding.id})
})

it('uses date-only fallbacks before a preceding fare is chosen and handles month boundaries',()=>{
 expect(legThreshold(state(),coverage('paris','rome'),[])).toEqual({date:'2026-10-29',minutes:0,source:'trip-date'})
 const overnight=fare('overnight','london','paris','2026-10-31',23*60,180)
 expect(legThreshold(state(1),coverage('paris','rome'),[overnight])).toMatchObject({date:'2026-11-02',minutes:120})
})

it('marks only a now-impossible downstream fare stale when the preceding fare or stay changes',()=>{
 const first=fare('first','london','paris','2026-10-26',21*60,20*60)
 const stale=fare('second','paris','rome','2026-10-30',16*60+59,120)
 const coverages=[coverage('london','paris'),coverage('paris','rome')]
 expect(fareMeetsThreshold(stale,legThreshold(state(),coverages[1]!,[first]))).toBe(false)
 expect(staleDownstreamFareIds(state(),coverages,[first,stale])).toEqual([stale.id])
 expect(scheduleLegs(state(),coverages,[first,stale])[0]?.selectedFare?.id).toBe(first.id)
})

it('invalidates every later selected leg after the first broken dependency',()=>{
 const first=fare('first','london','paris','2026-10-26',21*60,20*60)
 const broken=fare('second','paris','rome','2026-10-30',16*60,120)
 const later=fare('third','rome','vienna','2026-11-02',600,120)
 const routed={...state(),citySequence:['london','paris','rome','vienna'],stays:[{cityId:'paris',nights:3},{cityId:'rome',nights:1}]}
 expect(staleDownstreamFareIds(routed,[coverage('london','paris'),coverage('paris','rome'),coverage('rome','vienna')],[first,broken,later])).toEqual([broken.id,later.id])
})

it('returns an empty query state when a selected-arrival threshold exceeds the requested window',()=>{
 const first=fare('first','london','paris','2026-10-26',21*60,20*60)
 const windowed={...state(),dates:{start:'2026-10-26',end:'2026-10-27'},displayWindowByLeg:{'paris:rome':{from:'2026-10-26',to:'2026-10-27'}}}
 expect(legState(windowed,coverage('paris','rome'),[first]).dates).toEqual({start:'2026-10-27',end:'2026-10-27'})
 expect(legState(windowed,coverage('paris','rome'),[first]).runtimeVariables.$outsideDisplayWindow).toBe(true)
})

it('excludes coverage margins before the display window without carrying an earlier minute threshold',()=>{
 const first=fare('first','london','paris','2026-10-26',8*60,60)
 const windowed={...state(),displayWindowByLeg:{'paris:rome':{from:'2026-10-30',to:'2026-11-01'}}}
 const scoped=legState(windowed,coverage('paris','rome'),[first])
 expect(scoped.dates).toEqual({start:'2026-10-30',end:'2026-11-01'})
 expect(scoped.runtimeVariables.$earliestDepartureMinutes).toBe(0)
})
