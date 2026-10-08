import{expect,it}from'vitest'
import{createAgentPresentValidationScope}from'./present-scope'
import{validatePresentTree}from'../src/generative/variants/a/tree'

const datasets=[
 {datasetId:'d0',manifest:{coverage:{originId:'london',destinationId:'paris'}}},
 {datasetId:'d1',manifest:{coverage:{originId:'paris',destinationId:'rome'}}},
 {datasetId:'d2',manifest:{coverage:{originId:'rome',destinationId:'london'}}},
]
const context={artifacts:[{artifactId:'a',datasetRefs:['d0','d1','d2'],citySequence:['london','paris','rome','london']}],datasets}
const calendar=(legIndex:number,datasetRef:string)=>({$type:'FareCalendar',artifactRef:'a',datasetRef,legIndex})

it('derives complete resolved ownership for every leg of an optional-return route',()=>{
 const scope=createAgentPresentValidationScope(context)
 expect(()=>validatePresentTree({$type:'TravelSurface',artifactRef:'a',children:[calendar(0,'d0'),calendar(1,'d1'),calendar(2,'d2')]},scope)).not.toThrow()
 expect(()=>validatePresentTree({$type:'TravelSurface',artifactRef:'a',children:[calendar(0,'d0'),calendar(1,'d1')]},scope)).toThrow('Incomplete booking workflow leg coverage')
 expect(()=>validatePresentTree({$type:'TravelSurface',artifactRef:'a',children:[calendar(0,'d0'),calendar(1,'d0'),calendar(2,'d2')]},scope)).toThrow('Inconsistent booking workflow leg binding')
})
