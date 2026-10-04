import type { BoundedQueryResult } from '../../../contracts'
type Owner={artifactRef:string;execute:(signal:AbortSignal)=>Promise<BoundedQueryResult>}
const owners=new Map<string,Owner>()
export function rememberQueryResult(result:BoundedQueryResult,artifactRef:string,execute:Owner['execute']){owners.set(result.requestId,{artifactRef,execute});if(owners.size>100)owners.delete(owners.keys().next().value??'')}
export function runBoundQueryResult(result:BoundedQueryResult,artifactRef:string,signal:AbortSignal){const owner=owners.get(result.requestId);if(owner?.artifactRef!==artifactRef)throw new Error('UNKNOWN_QUERY_REFERENCE');return owner.execute(signal)}
