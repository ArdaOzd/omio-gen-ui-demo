import { describe, expect, it } from 'vitest'
import { prunePresentTree, validatePresentTree } from './tree'
import { LEAKAGE_SENTINEL } from '../../contracts/privacy'
const leaf=(name:string,key:string)=>({$type:name,$key:key,artifactRef:'artifact-1',datasetRef:'dataset-1'})
const tree=(children:unknown[])=>({$type:'TravelSurface',artifactRef:'artifact-1',children})
const scope={artifactIds:new Set(['artifact-1']),datasetIds:new Set(['dataset-1'])}
describe('native present boundary',()=>{
 it('accepts materially different granular comparison, calendar, and timeline arrangements',()=>{
  const scenes=[tree([{...leaf('SplitPane','split'),children:[{...leaf('Stack','left'),children:[leaf('ModeChips','modes'),leaf('FareCards','fares')]},{...leaf('StickySummary','right'),children:[leaf('CheapestFastest','choice'),leaf('SyntheticTotal','total')]}]}]),tree([{...leaf('Stack','stack'),children:[leaf('PriceCalendar','days'),{...leaf('ResponsiveGrid','grid'),children:[leaf('ComparisonTable','compare'),leaf('DurationPricePlot','chart')]}]}]),tree([{...leaf('Section','section'),children:[leaf('RouteMap','route'),leaf('ItineraryTimeline','time')]},{...leaf('Inline','inputs'),children:[leaf('DateStrip','date'),leaf('SortSelect','sort')]}])]
  expect(scenes.map(scene=>validatePresentTree(scene,scope).children)).toHaveLength(3)
  expect(new Set(scenes.map(scene=>JSON.stringify(scene))).size).toBe(3)
 })
 it('accepts every modular trip-planning node through the production present schema',()=>{
  const names=['MultiCityPlanGrid','FareCalendar','FadeFares','FareOrder','TransportSelect','StayDuration','TravelDate','CityField']
  const scene=tree(names.map((name,index)=>({...leaf(name,`trip-${index}`),...(name==='MultiCityPlanGrid'?{}:{legIndex:0}),selectorRef:'legSchedule'})))
  expect(validatePresentTree(scene,scope)).toEqual(scene)
 })
 it('limits stable leg bindings to planner primitives and requires them for planner datasets',()=>{
  expect(validatePresentTree(tree([{...leaf('FareCalendar','calendar'),legIndex:0}]),{artifactIds:new Set(['artifact-1']),datasetIds:new Set()})).toBeTruthy()
  expect(()=>validatePresentTree(tree([{...leaf('FareCalendar','calendar')}]),scope)).toThrow('legIndex')
  expect(()=>validatePresentTree(tree([{...leaf('FareCards','fares'),legIndex:0}]),scope)).toThrow('legIndex')
 })
 it('rejects executable sources, raw rows, invented refs, unknown components and props',()=>{
  for(const input of [tree([{...leaf('FareCards','f'),rows:[{secret:LEAKAGE_SENTINEL}]}]),tree([leaf('Iframe','x')]),tree([{...leaf('ModeChips','m'),actionRef:'fetch'}]),tree([{...leaf('FareCards','f'),datasetRef:'unknown'}]),tree([{...leaf('Section','s'),html:'<script>alert(1)</script>'}]),tree([{...leaf('FareCards','f'),title:LEAKAGE_SENTINEL}])])expect(()=>validatePresentTree(input,scope)).toThrow()
 })
 it('rejects unbounded recursion and ambiguous duplicate identity',()=>{
  expect(()=>validatePresentTree(tree([leaf('FareCards','same'),leaf('FareCards','same')]),scope)).toThrow('Duplicate')
  let node:unknown=leaf('FareCards','f');for(let i=0;i<10;i++)node={...leaf('Stack',`stack-${i}`),children:[node]}
  expect(()=>validatePresentTree(tree([node]),scope)).toThrow('budget')
 })
})

describe('partial native rendering boundary',()=>{
 it('retains only complete planner leg bindings when their authored dataset handle has expired',()=>{
  const input=tree([{...leaf('FareCalendar','current'),legIndex:0},leaf('FareCalendar','missing-index'),{...leaf('FareCards','arbitrary'),legIndex:0}])
  expect(prunePresentTree(input,{artifactIds:new Set(['artifact-1']),datasetIds:new Set()} )?.children).toEqual([{...leaf('FareCalendar','current'),legIndex:0}])
 })
 it('retains valid completed siblings and drops incomplete or row-shaped children',()=>{
  const tree={$type:'TravelSurface',artifactRef:'artifact-1',children:[{$type:'ModeChips',artifactRef:'artifact-1'},{$type:'FareCards',artifactRef:'artifact-'},{$type:'Section',artifactRef:'artifact-1',payload:[{id:'f',priceCents:10}]},{$type:'DateStrip',artifactRef:'artifact-1'}]}
  const result=prunePresentTree(tree,{artifactIds:new Set(['artifact-1']),datasetIds:new Set()},['children','1','artifactRef'])
  expect(result?.children).toEqual([tree.children[0],tree.children[3]])
 })
 it('bounds streamed nodes and depth before native rendering while final validation rejects excess',()=>{
  const tree={$type:'TravelSurface',artifactRef:'artifact-1',children:Array.from({length:90},()=>({$type:'ModeChips',artifactRef:'artifact-1'}))}
  expect((prunePresentTree(tree)?.children as unknown[]).length).toBe(79)
  expect(()=>validatePresentTree(tree)).toThrow()
  let nested:unknown={$type:'ModeChips',artifactRef:'artifact-1'}
  for(let i=0;i<20;i++)nested={$type:'Section',artifactRef:'artifact-1',children:nested}
  const result=prunePresentTree({$type:'TravelSurface',artifactRef:'artifact-1',children:nested})
  let depth=0;let current:unknown=result
  while(current&&typeof current==='object'&&'children' in current){depth++;current=current.children}
  expect(depth).toBeLessThanOrEqual(8)
 })
})
