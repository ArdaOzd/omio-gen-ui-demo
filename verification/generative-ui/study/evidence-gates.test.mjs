import{test}from'node:test';
import assert from'node:assert/strict';
import{sourceQueries}from'./evidence-gates.mjs';
import{assertSourceAvailability}from'./semantic-gates.mjs';
const state={artifactId:'art',datasetRefs:['route'],dates:{start:'2026-10-09'},filters:{modes:['bus'],carrierIds:[],directOnly:false},sort:{field:'priceCents',direction:'asc'},modesByLeg:{}};
const descriptor={datasetId:'route',sourceVersion:'fixture',request:{originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-09',to:'2026-10-15'},modes:['train','bus','flight','ferry']}};
const resource={datasetId:'route',physicalDatasetId:'physical-current',sourceVersion:'fixture',revision:1,rowCount:85};
const query={status:'result',scope:{sources:[{datasetRef:'route'}],where:{all:[{field:'serviceDate',op:'eq',value:'2026-10-09'},{field:'mode',op:'in',value:['bus']}]},orderBy:[{field:'priceCents',direction:'asc'}]},sourceGenerations:[resource],resultFareRows:20,resultRows:20,resultTotal:20,resultDates:['2026-10-09']};
const sample={queries:[query],resources:[resource],descriptors:[descriptor],state,sourceVersion:'fixture',offset:1,retainedInitial:true,acceptedScene:true,retainedScene:{artifactId:'art',source:'accepted scene'},currentScene:{artifactId:'art',source:'accepted scene'}};
const gate=options=>assertSourceAvailability({...sample,...options,queries:sourceQueries({...sample,...options}),availableCount:20,visibleDataCount:20,expectedDate:'2026-10-09',requireSingleDate:true});
test('a text-only target may retain source-backed current scene evidence without another query',()=>{assert.equal(gate({}).successfulScopedQueries,1);assert.throws(()=>gate({acceptedScene:false}),/accepted current scene/)});
test('retained evidence rejects changed source, physical generation, revision, resource release and canceled result',()=>{
 for(const options of [{sourceVersion:'new-fixture'},{resources:[{...resource,physicalDatasetId:'replacement'}]},{resources:[{...resource,revision:2}]},{resources:[]},{queries:[{...query,status:'canceled-result'}]},{descriptors:[{...descriptor,sourceVersion:'old'}]}])assert.throws(()=>gate(options),/latest date|loaded coverage/);
});
test('retained evidence rejects current filter, date and sort scope mismatches',()=>{
 for(const changed of [{...state,filters:{...state.filters,modes:['train']}},{...state,dates:{start:'2026-10-10'}},{...state,sort:{field:'durationMinutes',direction:'asc'}}])assert.throws(()=>gate({state:changed}),/latest date|departure date/);
 assert.throws(()=>gate({queries:[{...query,scope:{...query.scope,where:{field:'serviceDate',op:'eq',value:'2026-10-10'}},resultDates:['2026-10-10']}]}),/latest date/);
});
test('post-action and post-reload gates cannot reuse pre-action evidence',()=>{
 assert.throws(()=>gate({retainedInitial:false}),/latest date/);
 assert.equal(gate({retainedInitial:false,queries:[query,query]}).successfulScopedQueries,1);
 assert.equal(gate({retainedInitial:false,offset:0}).successfulScopedQueries,1);
 assert.throws(()=>gate({retainedInitial:false,offset:0,queries:[{...query,sourceGenerations:[{...resource,physicalDatasetId:'retired'}]}]}),/latest date/);
});

test('retained price bounds match independent current minimum and maximum constraints',()=>{
 const limited={...state,filters:{...state.filters,minPriceCents:1000}},where={all:[...query.scope.where.all,{field:'priceCents',op:'gte',value:1000}]},options={state:limited,queries:[{...query,scope:{...query.scope,where}}]};
 assert.equal(gate(options).successfulScopedQueries,1);
 assert.throws(()=>gate({...options,queries:[{...query,scope:{...query.scope,where:{all:[...where.all,{field:'priceCents',op:'lte',value:1200}]}}}]}),/latest date/);
});

test('retained reuse is bound to the exact accepted source and artifact, never a newly accepted target',()=>{
 for(const options of [{currentScene:{artifactId:'art',source:'new scene'}},{retainedScene:{artifactId:'other',source:'accepted scene'}},{newAcceptedTarget:true}, {acceptedScene:false}])assert.throws(()=>gate(options),/latest date|accepted current scene/);
 assert.equal(gate({newAcceptedTarget:true,queries:[query,query]}).successfulScopedQueries,1,'A newly accepted target needs fresh query proof');
});
