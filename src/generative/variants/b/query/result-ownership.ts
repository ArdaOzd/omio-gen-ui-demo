import type { BoundedQueryResult } from '../../../contracts'
const owners=new Map<string,{artifactRef:string;revision:number}>()
export function rememberQueryResult(result:BoundedQueryResult,artifactRef:string,revision:number){owners.set(result.requestId,{artifactRef,revision});if(owners.size>100)owners.delete(owners.keys().next().value??'')}
export function isCurrentQueryResult(result:BoundedQueryResult,artifactRef:string,revision:number){const owner=owners.get(result.requestId);return owner?.artifactRef===artifactRef&&owner.revision===revision}
