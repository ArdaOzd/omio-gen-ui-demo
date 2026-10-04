export function fareSearchDate(value){const url=new URL(value,'http://localhost');return url.pathname==='/api/search'?url.searchParams.get('departure_date'):null;}
export function firstFareOption(options){const option=options.find(option=>option.value&&option.label.trim());if(!option)throw new Error('No selectable fare exists in the native control');return option;}
export function oracleFacts(rows,filters){return rows.filter(row=>(!filters.modes?.length||filters.modes.includes(row.mode))&&(!filters.carrierIds?.length||filters.carrierIds.includes(row.carrierId))&&(filters.minPriceCents===undefined||row.priceCents>=filters.minPriceCents)&&(filters.maxPriceCents===undefined||row.priceCents<=filters.maxPriceCents)&&(filters.maxDurationMinutes===undefined||row.durationMinutes<=filters.maxDurationMinutes)&&(!filters.directOnly||row.direct!==false));}
const datePredicate=(node,date)=>Boolean(node&&(String(node.field).split('.').at(-1)==='serviceDate'&&((node.op==='eq'&&node.value===date)||(node.op==='in'&&node.value?.includes(date)))||node.all?.some(child=>datePredicate(child,date))||node.any?.some(child=>datePredicate(child,date))));
export function assertSourceAvailability({state,descriptors,queries,availableCount,visibleDataCount,sourceVersion,expectedDate,origin='london',destination='paris',requireSingleDate=false}){
 if(state?.dates?.start!==expectedDate)throw new Error('Active artifact did not retain the requested departure date');
 const matching=descriptors.filter(item=>state.datasetRefs.includes(item.datasetId)&&item.sourceVersion===sourceVersion&&item.request.originIds.includes(origin)&&item.request.destinationIds.includes(destination)&&item.request.dateWindow.from<=expectedDate&&item.request.dateWindow.to>=expectedDate);
 if(!matching.length)throw new Error('Active artifact loaded coverage does not include the actual task route/date/source');
 const refs=new Set(matching.map(item=>item.datasetId));
 const scoped=queries.filter(query=>query.status==='result'&&query.scope?.sources?.some(source=>refs.has(source.datasetRef))&&(query.resultDates?.includes(expectedDate)||datePredicate(query.scope.where,expectedDate)));
 if(requireSingleDate&&!scoped.some(query=>datePredicate(query.scope.where,expectedDate)&&(availableCount===0||query.resultFareRows>0&&query.resultDates?.length===1&&query.resultDates[0]===expectedDate)))throw new Error('Departure control did not query actual fare rows for exactly the latest date');
 if(availableCount>0&&!(visibleDataCount>0))throw new Error('Generated view displays no available source fares for the actual task scope');
 if(!scoped.length||(availableCount>0&&!scoped.some(query=>query.resultRows>0&&query.resultTotal>0)))throw new Error('Generated view failed to query/display available source fares for the actual task scope');
 return{expectedDate,availableCount,visibleDataCount,legitimateEmpty:availableCount===0,datasetRefs:[...refs],successfulScopedQueries:scoped.length};
}

export function assertDelayedCoverage({intercepted,completed,fulfilled,canceled,latestDate,activeWindowStarts}){
 if(intercepted<1||completed<1||completed>intercepted||fulfilled+canceled!==completed)throw new Error('The delayed coverage fault never completed on an actual departure_date request');
 if(latestDate!=='2026-10-22'||activeWindowStarts.includes('2026-10-20'))throw new Error('The older delayed coverage replaced the latest requested date');
 return {intercepted,completed,fulfilled,canceled,lateCompletionIgnored:true};
}
