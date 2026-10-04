export const conditionScope='whole-cell-start';
export function observeCondition({cache,index,phase,resources,sourceVersion}){
 if(!['cold','warm'].includes(cache)||!['initial','before-first-request','before-target'].includes(phase))throw new Error('Unknown predeclared cache condition or phase');
 const registrations=resources.map(({datasetId,rowCount,sourceVersion,revision})=>({datasetId,rowCount,sourceVersion,revision}));
 if(registrations.some(item=>!Number.isSafeInteger(item.rowCount)||item.rowCount<0||item.sourceVersion!==sourceVersion))throw new Error('Resource observation has invalid row count or source identity');
 const ready=registrations.some(item=>item.rowCount>0);
 if(phase==='initial'&&registrations.length)throw new Error('Fresh whole-cell context already contains registered resources');
 if(phase==='before-first-request'&&cache==='cold'&&registrations.length)throw new Error('Cold whole-cell first request was already resource warm');
 if(phase==='before-first-request'&&cache==='warm'&&!ready)throw new Error('Warm whole-cell first request has no actual ready worker rows');
 if(phase==='before-target'&&index>=4&&!ready)throw new Error('Later-turn prerequisite did not leave actual ready worker resources');
 return{conditionScope,wholeCellCondition:cache,phase,resourceState:ready?'ready-worker-rows':registrations.length?'registered-empty-resource':'no-registered-resources',targetNaturallyWarm:phase==='before-target'&&index>=4,registrations};
}
