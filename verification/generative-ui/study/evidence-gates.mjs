const field=name=>String(name).split('.').at(-1);
const same=(a,b)=>JSON.stringify(Array.isArray(a)?[...a].sort():a)===JSON.stringify(Array.isArray(b)?[...b].sort():b);
const implies=(node,name,op,value)=>{
 if(!node)return false;if(node.all)return node.all.some(child=>implies(child,name,op,value));if(node.any)return node.any.length>0&&node.any.every(child=>implies(child,name,op,value));
 return field(node.field)===name&&(node.op===op&&same(node.value,value)||op==='in'&&node.op==='eq'&&value.length===1&&node.value===value[0]);
};
function currentScope(query,state,descriptor){
 const modes=state.modesByLeg?.['london:paris']??state.filters.modes,filters={...state.filters,modes};
 const policies=[['modes','mode','in'],['carrierIds','carrierId','in'],['minPriceCents','priceCents','gte'],['maxPriceCents','priceCents','lte'],['maxDurationMinutes','durationMinutes','lte'],['directOnly','direct','eq']];
 const expected=policies.flatMap(([key,name,op])=>{const value=filters[key],enabled=Array.isArray(value)?value.length>0:key==='directOnly'?value===true:value!==undefined;return enabled?[{name,op,value}]:key==='modes'?[{name,op,value:descriptor.request.modes,optional:true}]:[]});
 const allowed=node=>!node||node.all?(!node||node.all.every(allowed)):node.any?node.any.every(allowed):field(node.field)==='serviceDate'||expected.some(({name,op,value})=>implies(node,name,op,value));
 if(!allowed(query.scope.where)||!expected.every(({name,op,value,optional})=>optional||implies(query.scope.where,name,op,value)))return false;

 return field(query.scope.orderBy?.[0]?.field)===state.sort.field&&query.scope.orderBy[0].direction===state.sort.direction;
}
export function sourceQueries({queries,resources,descriptors,state,sourceVersion,offset=0,retainedInitial=false,acceptedScene=false,retainedScene,currentScene,newAcceptedTarget=false}){
 if(retainedInitial&&!acceptedScene)throw new Error('Retained initial evidence requires an accepted current scene');
 const reuse=retainedInitial&&!newAcceptedTarget&&retainedScene?.artifactId===state.artifactId&&currentScene?.artifactId===state.artifactId&&typeof retainedScene?.source==='string'&&retainedScene.source===currentScene.source;
 return queries.slice(reuse?0:offset).filter(query=>{
  const sources=query.scope?.sources??[],generations=query.sourceGenerations??[];
  if(query.status!=='result'||!sources.length||sources.length!==generations.length)return false;
  return sources.every((source,index)=>{
   const generation=generations[index],descriptor=descriptors.find(item=>item.datasetId===source.datasetRef&&state.datasetRefs.includes(item.datasetId)&&item.sourceVersion===sourceVersion);
   if(!descriptor||!generation||generation.datasetId!==source.datasetRef||generation.sourceVersion!==sourceVersion)return false;
   const current=resources.some(resource=>resource.datasetId===generation.datasetId&&resource.physicalDatasetId===generation.physicalDatasetId&&resource.sourceVersion===generation.sourceVersion&&resource.revision===generation.revision&&resource.rowCount===generation.rowCount);
   const project=(query.scope.project??[]).map(field),fareEvidence=query.resultFareRows>0||project.includes('id')&&project.includes('priceCents');
   return current&&(!fareEvidence||currentScope(query,state,descriptor));
  });
 });
}
