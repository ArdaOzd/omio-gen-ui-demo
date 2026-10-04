import {describe,expect,it} from 'vitest'
import {parseQuery,type DatasetManifest} from '../contracts'
import {createFareDataBridge} from '../data/fare-data-bridge'
import {createSyntheticRows} from '../data/synthetic-source'

const rows=createSyntheticRows(4).map((row,index)=>({...row,serviceDate:'2026-10-02',carrierName:index===0?undefined:index===1?null:index===2?'Alpha':'Zulu'}))
async function fixture(){
 const bridge=createFareDataBridge({pageSource:async()=>({rows,total:4,pages:1,page:1,sourceVersion:'nullable-v1'})})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-02'},modes:['train','bus','flight','ferry'],passengers:1},new AbortController().signal)
 const input=(where:unknown)=>({version:1,sources:[{datasetRef:manifest.datasetId,alias:'f'}],where,project:['id','carrierName'],orderBy:[{field:'id',direction:'asc'}],limit:4})
 return{bridge,manifest,input}
}
describe('manifest-declared nullable predicates',()=>{
 it('executes null-safe equality, inequality and list membership including omitted legacy labels',async()=>{
  const {bridge,manifest,input}=await fixture()
  for(const [op,value,indices] of [
   ['eq',null,[0,1]],['neq',null,[2,3]],['in',[null,'Alpha'],[0,1,2]],['eq','Alpha',[2]],['neq','Alpha',[0,1,3]],
  ] as const){
   const parsed=parseQuery(input({field:'carrierName',op,value:Array.isArray(value)?[...value]:value}),[manifest])
   const result=await bridge.query(parsed,new AbortController().signal)
   expect(result.rows.map(row=>row.id)).toEqual(indices.map(index=>rows[index]?.id))
   expect(result.total).toBe(indices.length)
   expect(result.rows.filter(row=>row.carrierName===null).map(row=>row.id)).toEqual(indices.filter(index=>index<2).map(index=>rows[index]?.id))
  }
 })
 it('rejects null for nonnullable fields and for fields not declared nullable by the actual manifest',async()=>{
  const {manifest,input}=await fixture()
  for(const field of ['priceCents','mode','id'])for(const value of [null,[null]])expect(()=>parseQuery(input({field,op:Array.isArray(value)?'in':'eq',value}),[manifest])).toThrow(/null|type/i)
  const legacy:DatasetManifest={...manifest,fields:manifest.fields.map(field=>({...field,nullable:false}))}
  expect(()=>parseQuery(input({field:'carrierName',op:'eq',value:null}),[legacy])).toThrow(/null|type/i)
 })
 it('preserves operator shape, type and ordered-pair bounds rather than sorting null predicate operands',async()=>{
  const {manifest,input}=await fixture()
  for(const [field,op,value] of [['carrierName','contains',null],['carrierName','gte',null],['carrierName','between',[null,'Zulu']],['priceCents','between',[null,1000]],['carrierName','eq',[null]],['carrierName','in',null],['carrierName','in',[null,42]]] as const){
   expect(()=>parseQuery(input({field,op,value}),[manifest])).toThrow()
  }
  const declaredNull:DatasetManifest={...manifest,fields:manifest.fields.map(field=>({...field,nullable:field.name==='carrierName'}))}
  expect(()=>parseQuery(input({field:'carrierName',op:'in',value:[null,...Array(20).fill('Alpha')]}),[declaredNull])).toThrow()
 })
 it('keeps nullable projections, explicit null sorting and compatible nested predicates bounded',async()=>{
  const {bridge,manifest,input}=await fixture()
  for(const [direction,indices] of [['asc',[2,3,0,1]],['desc',[0,1,3,2]]] as const){
   const result=await bridge.query(parseQuery({...input(undefined),orderBy:[{field:'carrierName',direction}]},[manifest]),new AbortController().signal)
   expect(result.rows.map(row=>row.id)).toEqual(indices.map(index=>rows[index]?.id))
  }
  const result=await bridge.query(parseQuery(input({all:[{any:[{field:'carrierName',op:'eq',value:null},{field:'carrierName',op:'contains',value:'Al'}]},{field:'priceCents',op:'gte',value:1017}]}),[manifest]),new AbortController().signal)
  expect(result.rows.map(row=>row.id)).toEqual([rows[1]?.id,rows[2]?.id])
 })
})
