// This module evaluates only the predeclared prompts; it produces no human ratings.
const field=name=>String(name).split('.').at(-1);
const unique=items=>[...new Set(items)];
export function summarizeOracle(rows){
 const minimum=items=>items.length?{count:items.length,minimumPriceCents:Math.min(...items.map(row=>row.priceCents)),minimumDurationMinutes:Math.min(...items.map(row=>row.durationMinutes))}:{count:0,minimumPriceCents:null,minimumDurationMinutes:null};
 return{...minimum(rows),dates:unique(rows.map(row=>row.serviceDate)).sort(),byDate:Object.fromEntries(unique(rows.map(row=>row.serviceDate)).map(date=>[date,minimum(rows.filter(row=>row.serviceDate===date))])),byMode:Object.fromEntries(unique(rows.map(row=>row.mode)).map(mode=>[mode,minimum(rows.filter(row=>row.mode===mode))]))};
}
function permitsDate(node,date){if(!node)return true;if(node.all)return node.all.every(child=>permitsDate(child,date));if(node.any)return node.any.some(child=>permitsDate(child,date));if(field(node.field)!=='serviceDate')return true;switch(node.op){case'eq':return node.value===date;case'in':return node.value.includes(date);case'between':return date>=node.value[0]&&date<=node.value[1];case'gte':return date>=node.value;case'gt':return date>node.value;case'lte':return date<=node.value;case'lt':return date<node.value;case'neq':return date!==node.value;default:return false}}
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
function extremum(query,name,expected){if(expected===null)return false;const metric=query.scope.metrics?.find(metric=>metric.op==='min'&&field(metric.field)===name);return metric?query.aggregateFacts?.some(row=>row[metric.as]===expected):field(query.scope.orderBy?.[0]?.field)===name&&query.scope.orderBy[0].direction==='asc'&&query.fareExtrema?.[name==='priceCents'?'minimumPriceCents':'minimumDurationMinutes']===expected}
export function assertTaskData(cell,{state,descriptors,queries,oracle,components,dom,sourceVersion}){
 const refs=new Set(descriptors.filter(item=>state.datasetRefs.includes(item.datasetId)&&item.sourceVersion===sourceVersion&&item.request.originIds.includes('london')&&item.request.destinationIds.includes('paris')&&item.request.dateWindow.from<='2026-10-09'&&item.request.dateWindow.to>=(cell.scenario==='multi-city'?'2026-10-09':'2026-10-15')).map(item=>item.datasetId));
 const scoped=queries.filter(query=>query.status==='result'&&query.resultRows>0&&query.scope?.sources.some(source=>refs.has(source.datasetRef)));
 const week=scoped.filter(query=>oracle.dates.every(date=>permitsDate(query.scope.where,date)));
 const has=name=>components.includes(name),calendar=()=>{assert(has('PriceCalendar')&&dom.calendarDays>0,'Task requires a real price calendar');assert(week.some(query=>query.scope.groupBy?.map(field).includes('serviceDate')&&query.scope.metrics?.some(metric=>metric.op==='min'&&field(metric.field)==='priceCents'&&oracle.dates.every(date=>query.aggregateFacts?.some(row=>row.serviceDate===date&&row[metric.as]===oracle.byDate[date].minimumPriceCents)))),'Calendar did not compute actual cheapest prices across the requested week')};
 const filters=()=>assert(dom.filterControls>0,'Task requires operable local filters');const offers=()=>assert(dom.selectableFares>0,'Task requires actual selectable source fares');
 assert(refs.size>0,'Task route/week lacks current source-backed coverage');assert(oracle.count>0&&scoped.length>0,'Task has available backend rows but no actual scoped query output');
 if(cell.scenario==='cheap-fast'){
  assert(week.some(query=>extremum(query,'priceCents',oracle.minimumPriceCents))&&week.some(query=>extremum(query,'durationMinutes',oracle.minimumDurationMinutes)),'Cheapest/fastest results do not match the actual requested route/week extrema');
  assert(dom.dataPanels>0,'Cheapest/fastest data is not visible');
  if(cell.wording==='withheld'){assert(dom.dataPanels>=2,'Withheld task requires separate cheap and quick sections');assert(has('DurationPricePlot')&&dom.plotPoints>0,'Withheld task requires an actual duration/price comparison');assert(has('ModeChips'),'Withheld task requires local mode switching');offers();assert(has('SelectedItinerary')||has('ItineraryTimeline'),'Withheld task requires selected journey inspection')}
 }
 if(cell.scenario==='train-bus'){
  assert(dom.comparisonRows>0&&week.some(query=>query.resultModes?.includes('train')&&query.resultModes.includes('bus')),'Train/bus comparison lacks actual output for both available modes');
  if(cell.wording==='withheld'){calendar();filters();assert(dom.comparisonBeforeCalendar,'Withheld task requires the compact comparison before its calendar');assert(dom.filtersBesideResults,'Withheld task requires filters beside results')}
 }
 if(cell.scenario==='calendar'){
  calendar();filters();offers();
  if(cell.wording==='withheld'){assert(dom.calendarBeforeOffers,'Withheld task requires calendar-first exploration');assert(has('DurationPricePlot')&&dom.plotPoints>0,'Withheld task requires actual duration/price comparison');assert(has('ItineraryTimeline')||has('SelectedItinerary'),'Withheld task requires a journey timeline after selection')}
 }
 if(cell.scenario==='multi-city'){
  assert(state.stays.some(stay=>stay.cityId==='paris'&&stay.nights===2)&&state.stays.some(stay=>stay.cityId==='barcelona'&&stay.nights===4),'Three-city task did not retain both declared stay lengths');
  const onward=descriptors.filter(item=>state.datasetRefs.includes(item.datasetId)&&item.sourceVersion===sourceVersion&&item.request.originIds.includes('paris')&&item.request.destinationIds.includes('barcelona')&&item.request.dateWindow.from<='2026-10-11'&&item.request.dateWindow.to>='2026-10-11');
  assert(onward.length>0,'Three-city task lacks adjacent Paris/Barcelona coverage after the Paris stay');
  const onwardQueries=queries.filter(query=>query.status==='result'&&query.resultFareRows>0&&query.scope?.sources.some(source=>onward.some(item=>item.datasetId===source.datasetRef)));assert(new Set([...scoped,...onwardQueries].flatMap(query=>query.resultModes??[])).size>1&&onwardQueries.length>0,'Three-city mixed-mode task did not query actual alternatives for both legs');
  if(cell.wording==='withheld'){assert(dom.modeSections>=2,'Withheld task requires a control section for each leg');offers();assert((has('RouteMap')||has('CitySequence'))&&has('SyntheticTotal')&&dom.routeAndTotalBeforeOffers,'Withheld task requires route and selected total before alternatives')}
 }
 return{scenario:cell.scenario,wording:cell.wording,currentSourceVersion:sourceVersion,availableSourceCount:oracle.count,successfulScopedQueries:scoped.length,weekQueries:week.length,actualWeekExtrema:{minimumPriceCents:oracle.minimumPriceCents,minimumDurationMinutes:oracle.minimumDurationMinutes},declaredPromptClausesPassed:true};
}
export function assertRearrangement(before,after){assert(before?.valid&&after?.valid,'Rearrangement requires accepted before/after source');assert((before.layoutHash??before.structuralHash)!==(after.layoutHash??after.structuralHash),'Rearrangement changed no component composition');return{materialCompositionChange:true,before:before.layoutHash??before.structuralHash,after:after.layoutHash??after.structuralHash}}
function implies(node,expected){if(!node)return false;if(node.all)return node.all.some(child=>implies(child,expected));if(node.any)return node.any.length>0&&node.any.every(child=>implies(child,expected));const same=(a,b)=>JSON.stringify(Array.isArray(a)?[...a].sort():a)===JSON.stringify(Array.isArray(b)?[...b].sort():b);return field(node.field)===expected.field&&node.op===expected.op&&same(node.value,expected.value)}
function mentions(node,name,op){return Boolean(node&&(field(node.field)===name&&node.op===op||node.all?.some(child=>mentions(child,name,op))||node.any?.some(child=>mentions(child,name,op))))}
export function assertFacetApplied({before,after,queries,oracle,datasetRefs,expectedDate}){
 const old={...before.filters,modes:before.modesByLeg['london:paris']??before.filters.modes},current={...after.filters,modes:after.modesByLeg['london:paris']??after.filters.modes},policies=[['modes','mode','in'],['carrierIds','carrierId','in'],['minPriceCents','priceCents','gte'],['maxPriceCents','priceCents','lte'],['maxDurationMinutes','durationMinutes','lte'],['directOnly','direct','eq']],changes=policies.filter(([key])=>JSON.stringify(old[key])!==JSON.stringify(current[key]));assert(changes.length>0,'Facet did not change current host filter state');
 const qualifying=queries.filter(query=>query.status==='result'&&query.scope?.sources.some(source=>datasetRefs.includes(source.datasetRef))&&permitsDate(query.scope.where,expectedDate)&&changes.every(([key,name,op])=>{const value=current[key],enabled=Array.isArray(value)?value.length>0:key==='directOnly'?value===true:value!==undefined;return enabled?implies(query.scope.where,{field:name,op,value}):!mentions(query.scope.where,name,op)})&&query.resultTotal===(oracle.byDate?Object.entries(oracle.byDate).filter(([date])=>permitsDate(query.scope.where,date)).reduce((sum,[,facts])=>sum+facts.count,0):oracle.filteredCount)&&(query.resultTotal===0?query.resultRows===0:query.resultFareRows>0));
 assert(qualifying.length>0,'Facet changed the snapshot but no actual fare query applied its current predicate values and source result count');
 return{changedFields:changes.map(([key])=>key),actualFareQueryChanged:true,sourceFilteredCount:qualifying[0].resultTotal,legitimateEmpty:qualifying[0].resultTotal===0,successfulCurrentQueries:qualifying.length};
}
