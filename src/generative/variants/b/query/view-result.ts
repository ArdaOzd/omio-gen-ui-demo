import type { BoundedQueryResult,QueryIR } from '../../../contracts'
export function adaptQueryResult(result:BoundedQueryResult,query:QueryIR,kind?:string):BoundedQueryResult{
 if(!kind||!['ComparisonTable','ComparisonMatrix','ModeBreakdown','PriceCalendar'].includes(kind))return result
 const minimum=query.metrics?.find(metric=>metric.op==='min'&&metric.field==='priceCents')?.as
 const fastest=query.metrics?.find(metric=>metric.op==='min'&&metric.field==='durationMinutes')?.as
 const count=query.metrics?.find(metric=>metric.op==='count')?.as
 return {...result,rows:result.rows.map(row=>({...row,...(minimum&&row.minimum===undefined?{minimum:row[minimum]}:{}),...(fastest&&row.fastest===undefined?{fastest:row[fastest]}:{}),...(count&&row.count===undefined?{count:row[count]}:{})}))}
}
