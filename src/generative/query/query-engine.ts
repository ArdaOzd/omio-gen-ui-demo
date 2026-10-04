import { DatasetRevisionSchema, type AllowedFareField, type BoundedQueryResult, type DatasetId, type DatasetRevision, type FareRow, type JsonScalar, type PredicateTree, type QueryIR } from '../contracts'
import { abortError } from '../data/resource-loader'
export type QueryResource={rows:readonly FareRow[];revision:DatasetRevision;sourceVersion:string;logicalDatasetId?:DatasetId}
export type QueryResources=ReadonlyMap<DatasetId,QueryResource>
export type QueryLimits={maxScanRows:number;maxJoinRows:number;maxGroups:number;maxResultBytes:number;yieldEvery:number}
const defaults:QueryLimits={maxScanRows:1_000_000,maxJoinRows:200_000,maxGroups:1000,maxResultBytes:65536,yieldEvery:4096}
function compare(left:JsonScalar,right:JsonScalar):number {return left===right?0:left===null?1:right===null?-1:left<right?-1:1}
function matches(row:FareRow,predicate:PredicateTree):boolean {
 if('all'in predicate)return predicate.all.every(item=>matches(row,item))
 if('any'in predicate)return predicate.any.some(item=>matches(row,item))
 const current=row[predicate.field]??null;const value=predicate.value
 switch(predicate.op){
 case'eq':return current===value
 case'neq':return current!==value
 case'in':return Array.isArray(value)&&value.includes(current)
 case'gte':return current!==null&&value!==null&&!Array.isArray(value)&&compare(current,value)>=0
 case'lte':return current!==null&&value!==null&&!Array.isArray(value)&&compare(current,value)<=0
 case'between':return current!==null&&Array.isArray(value)&&value[0]!=null&&value[1]!=null&&compare(current,value[0])>=0&&compare(current,value[1])<=0
 case'contains':return typeof current==='string'&&typeof value==='string'&&current.includes(value)
 default:{const never:never=predicate.op;throw new Error(String(never))}
 }
}
function valueOf(row:Record<string,JsonScalar|undefined>,field:string):JsonScalar {const value=row[field];if(value===undefined){if(field==='carrierName')return null;throw new Error('Query output field unavailable');}return value}
export async function executeQuery(query:QueryIR,resources:QueryResources,signal:AbortSignal,options:Partial<QueryLimits>={}):Promise<BoundedQueryResult>{
 const limits={...defaults,...options}
 if(signal.aborted)throw abortError()
 const selected=query.sources.map(source=>{const resource=resources.get(source.datasetRef);if(!resource)throw new Error('Expired dataset reference');return {...resource,alias:source.alias}})
 if(new Set(selected.map(item=>item.sourceVersion)).size>1)throw new Error('Mixed source version')
 if(selected.reduce((total,item)=>total+item.rows.length,0)>limits.maxScanRows)throw new Error('Query scan budget exceeded')
 const first=selected[0];if(!first)throw new Error('Query requires source')
 if(selected.length>1&&query.joins?.length!==selected.length-1)throw new Error('Multiple sources require explicit joins')
 let scanRows:readonly FareRow[]=first.rows
 for(const join of query.joins??[]){
  const right=selected.find(item=>item.alias===join.rightAlias);if(!right)throw new Error('Unknown join alias')
  const index=new Map<JsonScalar,number>()
  for(const row of right.rows)index.set((row[join.rightKey]??null),(index.get((row[join.rightKey]??null))??0)+1)
  let expanded=0
  for(const row of scanRows)expanded+=index.get((row[join.leftKey]??null))??(join.kind==='left'?1:0)
  if(expanded>limits.maxJoinRows)throw new Error('Join expansion budget exceeded')
  const joined:FareRow[]=[]
  for(const row of scanRows){const count=index.get((row[join.leftKey]??null))??(join.kind==='left'?1:0);for(let i=0;i<count;i++)joined.push(row)}
  scanRows=joined
 }
 const filtered:FareRow[]=[]
 for(let index=0;index<scanRows.length;index++){
  if(signal.aborted)throw abortError()
  const row=scanRows[index];if(row&&(!query.where||matches(row,query.where)))filtered.push(row)
  if(index>0&&index%limits.yieldEvery===0)await new Promise<void>(resolve=>setTimeout(resolve,0))
 }
 let output:Array<Record<string,JsonScalar|undefined>>=[]
 let projection:AllowedFareField[]|undefined
 if(query.groupBy?.length||query.metrics?.length){
  const groups=new Map<string,FareRow[]>()
  for(const row of filtered){const key=JSON.stringify((query.groupBy??[]).map(field=>row[field]));const group=groups.get(key)??[];group.push(row);groups.set(key,group);if(groups.size>limits.maxGroups)throw new Error('Grouping budget exceeded')}
  if(!filtered.length&&!query.groupBy?.length)groups.set('[]',[])
  output=[...groups.values()].map(group=>{
   const result:Record<string,JsonScalar>={}
   const example=group[0];for(const field of query.groupBy??[])if(example)result[field]=example[field]??null
   for(const metric of query.metrics??[]){
    const values=metric.field?group.map(row=>row[metric.field??'priceCents']).filter((value):value is number=>typeof value==='number'):[]
    switch(metric.op){
     case'count':result[metric.as]=group.length;break
     case'sum':result[metric.as]=values.reduce((total,value)=>total+value,0);break
     case'avg':result[metric.as]=values.length?values.reduce((total,value)=>total+value,0)/values.length:0;break
     case'min':result[metric.as]=values.length?values.reduce((minimum,value)=>Math.min(minimum,value),Infinity):0;break
     case'max':result[metric.as]=values.length?values.reduce((maximum,value)=>Math.max(maximum,value),-Infinity):0;break
     default:{const never:never=metric.op;throw new Error(String(never))}
    }
   }
   return result
  })
 }else{
  projection=query.project??['id','mode','carrierId','carrierName','priceCents','durationMinutes','serviceDate','departureMinutes','originId','destinationId']
  output=filtered
 }
 const ordering=query.topK?[{field:query.topK.by,direction:query.topK.direction},...(query.orderBy??[])]:query.orderBy??[]
 output.sort((left,right)=>{for(const order of ordering){const difference=compare(valueOf(left,order.field),valueOf(right,order.field));if(difference)return order.direction==='desc'?-difference:difference}return String(left.id??JSON.stringify(left)).localeCompare(String(right.id??JSON.stringify(right)))})
 const total=output.length
 const selectedRows=output.slice(0,Math.min(query.limit,query.topK?.k??query.limit))
 const fields=projection
 const rows=fields?selectedRows.map(row=>Object.fromEntries(fields.map(field=>[field,valueOf(row,field)]))):selectedRows.map(row=>Object.fromEntries(Object.entries(row).filter((entry):entry is [string,JsonScalar]=>entry[1]!==undefined)))
 if(new TextEncoder().encode(JSON.stringify(rows)).length>limits.maxResultBytes)throw new Error('Query transfer budget exceeded')
 if(signal.aborted)throw abortError()
 return {rows,total,truncated:rows.length<total,datasetRevision:DatasetRevisionSchema.parse(Math.max(...selected.map(item=>item.revision))),requestId:crypto.randomUUID()}
}
