import { describe, expect, it } from 'vitest'
import { validatePresentTree } from './tree'
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
 it('rejects executable sources, raw rows, invented refs, unknown components and props',()=>{
  for(const input of [tree([{...leaf('FareCards','f'),rows:[{secret:LEAKAGE_SENTINEL}]}]),tree([leaf('Iframe','x')]),tree([{...leaf('ModeChips','m'),actionRef:'fetch'}]),tree([{...leaf('FareCards','f'),datasetRef:'unknown'}]),tree([{...leaf('Section','s'),html:'<script>alert(1)</script>'}]),tree([{...leaf('FareCards','f'),title:LEAKAGE_SENTINEL}])])expect(()=>validatePresentTree(input,scope)).toThrow()
 })
 it('rejects unbounded recursion and ambiguous duplicate identity',()=>{
  expect(()=>validatePresentTree(tree([leaf('FareCards','same'),leaf('FareCards','same')]),scope)).toThrow('Duplicate')
  let node:unknown=leaf('FareCards','f');for(let i=0;i<10;i++)node={...leaf('Stack',`stack-${i}`),children:[node]}
  expect(()=>validatePresentTree(tree([node]),scope)).toThrow('budget')
 })
})
