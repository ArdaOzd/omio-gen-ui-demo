import { describe, expect, it } from 'vitest'
import { DatasetIdSchema } from '../contracts'
import { createTripPlanningFixtureTree } from './trip-planning-fixture'

describe('trip planning fixture composition',()=>{
 it('renders one all-leg booking workflow without a competing flexible-date calendar',()=>{
  const first=DatasetIdSchema.parse('dataset-fixture-first')
  const second=DatasetIdSchema.parse('dataset-fixture-second')
  const tree=createTripPlanningFixtureTree([first,second])
  const children=Array.isArray(tree.children)?tree.children:[]
  expect(children.map(child=>typeof child==='object'&&child!==null?child.$type:child)).toEqual(['MultiCityPlanGrid','ResponsiveGrid'])
  expect(children[1]).toMatchObject({$type:'ResponsiveGrid',children:[{$type:'CheapestFastest',datasetRef:first,legIndex:0},{$type:'CheapestFastest',datasetRef:second,legIndex:1}]})
 })

 it('renders one flexible-date workflow for each requested leg without MultiCity',()=>{
  const first=DatasetIdSchema.parse('dataset-fixture-first')
  const second=DatasetIdSchema.parse('dataset-fixture-second')
  const tree=createTripPlanningFixtureTree([first,second],'flexible')
  const children=Array.isArray(tree.children)?tree.children:[]
  expect(children).toMatchObject([
   {$type:'FareCalendar',datasetRef:first,legIndex:0},
   {$type:'FareCalendar',datasetRef:second,legIndex:1},
   {$type:'ResponsiveGrid',children:[{$type:'CheapestFastest',datasetRef:first,legIndex:0},{$type:'CheapestFastest',datasetRef:second,legIndex:1}]},
  ])
 })
})
