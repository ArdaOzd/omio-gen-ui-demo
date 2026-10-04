import {expect,it} from 'vitest'
import {createFareDataBridge} from '../data/fare-data-bridge'
import {parseQuery} from '../contracts'
import {nullableOracleCases,nullableRows} from '../../../benchmarks/query-engine/nullable-oracle'

it('checks every nullable oracle case against fixed independent rows through manifest parsing and real local execution',async()=>{
 const bridge=createFareDataBridge({pageSource:async()=>({rows:nullableRows,total:4,pages:1,page:1,sourceVersion:'oracle-v1'})})
 const manifest=await bridge.load({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-02',to:'2026-10-02'},modes:['train','bus','flight','ferry'],passengers:1},new AbortController().signal)
 const cases=nullableOracleCases(manifest.datasetId)
 expect(cases.map(item=>item.name)).toEqual(['eq-null','neq-null','in-null','neq-text','nested','asc-null-last','desc-null-first'])
 for(const item of cases){
  const result=await bridge.query(parseQuery(item.query,[manifest]),new AbortController().signal)
  expect(result.rows,item.name).toEqual(item.expected)
 }
})
