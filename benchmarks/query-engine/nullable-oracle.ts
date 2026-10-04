import {type DatasetId,type JsonScalar,type QueryIR} from '../../src/generative/contracts'
import {createSyntheticRows} from '../../src/generative/data/synthetic-source'

export const nullableRows=createSyntheticRows(4).map((row,index)=>({...row,serviceDate:'2026-10-02',carrierName:index===0?undefined:index===1?null:index===2?'Alpha':'Zulu'}))
export function nullableOracleCases(datasetId:DatasetId):Array<{name:string;query:QueryIR;sql:string;params:JsonScalar[];expected:Array<Record<string,JsonScalar>>}>{
 const base:QueryIR={version:1,sources:[{datasetRef:datasetId,alias:'f'}],project:['id','carrierName'],limit:4}
 const fixed=(indices:number[])=>indices.map(index=>({id:`synthetic-${String(index).padStart(9,'0')}`,carrierName:index<2?null:index===2?'Alpha':'Zulu'}))
 return [
  {name:'eq-null',query:{...base,where:{field:'carrierName',op:'eq',value:null}},sql:'SELECT id,carrierName FROM nullable_fares WHERE carrierName IS NOT DISTINCT FROM ? ORDER BY id',params:[null],expected:fixed([0,1])},
  {name:'neq-null',query:{...base,where:{field:'carrierName',op:'neq',value:null}},sql:'SELECT id,carrierName FROM nullable_fares WHERE carrierName IS DISTINCT FROM ? ORDER BY id',params:[null],expected:fixed([2,3])},
  {name:'in-null',query:{...base,where:{field:'carrierName',op:'in',value:[null,'Alpha']}},sql:'SELECT id,carrierName FROM nullable_fares WHERE carrierName IS NOT DISTINCT FROM ? OR carrierName IS NOT DISTINCT FROM ? ORDER BY id',params:[null,'Alpha'],expected:fixed([0,1,2])},
  {name:'neq-text',query:{...base,where:{field:'carrierName',op:'neq',value:'Alpha'}},sql:'SELECT id,carrierName FROM nullable_fares WHERE carrierName IS DISTINCT FROM ? ORDER BY id',params:['Alpha'],expected:fixed([0,1,3])},
  {name:'nested',query:{...base,where:{all:[{any:[{field:'carrierName',op:'eq',value:null},{field:'carrierName',op:'contains',value:'Al'}]},{field:'priceCents',op:'gte',value:1017}]}},sql:'SELECT id,carrierName FROM nullable_fares WHERE (carrierName IS NOT DISTINCT FROM ? OR contains(carrierName,?)) AND priceCents>=? ORDER BY id',params:[null,'Al',1017],expected:fixed([1,2])},
  {name:'asc-null-last',query:{...base,orderBy:[{field:'carrierName',direction:'asc'}]},sql:'SELECT id,carrierName FROM nullable_fares ORDER BY carrierName ASC NULLS LAST,id',params:[],expected:fixed([2,3,0,1])},
  {name:'desc-null-first',query:{...base,orderBy:[{field:'carrierName',direction:'desc'}]},sql:'SELECT id,carrierName FROM nullable_fares ORDER BY carrierName DESC NULLS FIRST,id',params:[],expected:fixed([0,1,3,2])},
 ]
}
