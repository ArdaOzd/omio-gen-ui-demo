import{describe,expect,it}from'vitest'
import type{UIMessage}from'ai'
import{getSceneMetadata}from'./scene-metadata'
import{createPresentValidationScope}from'./variants/a/tree'

const message=(id:string,kind:string):UIMessage=>({id,role:'assistant',parts:[{type:'tool-present',toolCallId:id,state:'output-available',input:{$type:'TravelSurface',$key:`root-${id}`,artifactRef:'artifact-a',children:[{$type:kind,$key:`leaf-${id}`,artifactRef:'artifact-a',datasetRef:'dataset-1',selectorRef:'legSchedule'}]},output:{}}]})
const present=(id:string,children:Record<string,unknown>[]):UIMessage=>({id,role:'assistant',parts:[{type:'tool-present',toolCallId:id,state:'output-available',input:{$type:'TravelSurface',$key:`root-${id}`,artifactRef:'artifact-a',children},output:{}}]})

describe('active approved artifact scenes',()=>{
 it('records only the latest non-booking composition with scene-scoped stable bindings',()=>{
  const first=message('first','SplitPane');expect(getSceneMetadata([first]).sources.get('artifact-a')).toContain('SplitPane')
  const next=getSceneMetadata([first,message('second','ItineraryTimeline')])
  expect(next.sources.get('artifact-a')).toContain('ItineraryTimeline');expect(next.sources.get('artifact-a')).not.toContain('SplitPane')
  expect(next.layouts.get('artifact-a')).toBe('TravelSurface(ItineraryTimeline)')
  expect(next.bindings.get('artifact-a')).toEqual([{key:'present-second:root-second',type:'TravelSurface'},{key:'present-second:leaf-second',type:'ItineraryTimeline',datasetRef:'dataset-1',selectorRef:'legSchedule'}])
 })
 it('retains booking and supplementary scenes together for next-turn bindings',()=>{
  const scope=createPresentValidationScope([{artifactId:'artifact-a',legDatasetIds:[new Set(['dataset-1']),new Set(['dataset-2'])]}],['dataset-1','dataset-2'])
  const booking=present('booking',[{$type:'FareCalendar',$key:'leg-1',artifactRef:'artifact-a',datasetRef:'dataset-1',legIndex:0},{$type:'FareCalendar',$key:'leg-2',artifactRef:'artifact-a',datasetRef:'dataset-2',legIndex:1}])
  const comparison=present('comparison',[{$type:'CheapestFastest',$key:'compare',artifactRef:'artifact-a',datasetRef:'dataset-1',legIndex:0}])
  const metadata=getSceneMetadata([booking,comparison],scope),types=metadata.bindings.get('artifact-a')?.map(binding=>binding.type)
  expect(types).toEqual(['TravelSurface','FareCalendar','FareCalendar','TravelSurface','CheapestFastest'])
  expect(new Set(metadata.bindings.get('artifact-a')?.map(binding=>binding.key)).size).toBe(5)
  expect(metadata.sources.get('artifact-a')).toContain('FareCalendar');expect(metadata.sources.get('artifact-a')).toContain('CheapestFastest')
 })
 it('excludes a completed flexible booking missing one authoritative leg',()=>{
  const scope=createPresentValidationScope([{artifactId:'artifact-a',legDatasetIds:[new Set(['dataset-1']),new Set(['dataset-2'])]}],['dataset-1','dataset-2'])
  const incomplete=present('incomplete',[{$type:'FareCalendar',artifactRef:'artifact-a',datasetRef:'dataset-1',legIndex:0}])
  expect(getSceneMetadata([incomplete],scope).sources.has('artifact-a')).toBe(false)
 })
})

it('assigns deterministic scene-scoped path keys when a composition omits optional keys',()=>{
 const value: UIMessage={id:'paths',role:'assistant',parts:[{type:'tool-present',toolCallId:'paths',state:'output-available',input:{$type:'TravelSurface',artifactRef:'artifact-a',children:[{$type:'Stack',artifactRef:'artifact-a',children:[{$type:'FareCalendar',artifactRef:'artifact-a',datasetRef:'dataset-1',legIndex:0}]}]},output:{}}]}
 expect(getSceneMetadata([value]).bindings.get('artifact-a')?.map(binding=>binding.key)).toEqual(['present-paths:root','present-paths:root.0','present-paths:root.0.0'])
})
