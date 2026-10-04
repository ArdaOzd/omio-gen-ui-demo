import { catalogDescriptors } from '../../../src/generative/catalog/generated/catalog'
export const storyStates = ['ready', 'loading', 'partial', 'empty', 'error', 'stale', 'invalid-ref'] as const
export type StoryState = typeof storyStates[number]
type Coverage = { applicable: boolean; reason: string }
export const queryStoryNames = new Set(['CarrierFilter','FareCards','FarePicker','ComparisonTable','ComparisonMatrix','PriceCalendar','ModeBreakdown','ItineraryTimeline','DurationPricePlot','CheapestFastest'])
export const selectedFactStoryNames = new Set(['SelectedItinerary','SyntheticTotal'])
export const emptyRouteStoryNames = new Set(['CitySequence','RouteMap','StayAllocation','CoverageSummary'])
const empty = new Set([...queryStoryNames,...emptyRouteStoryNames,'SelectedItinerary','SelectedFareCount','EmptyState'])
const explicitStates: Record<string,StoryState> = {ArtifactSkeleton:'loading',CoverageNotice:'partial',EmptyState:'empty',InlineError:'error',StaleBadge:'stale'}
function coverage(name:string, state:StoryState):Coverage {
 const request=queryStoryNames.has(name)||selectedFactStoryNames.has(name)
 const applicable=state==='ready'||state==='invalid-ref'||state==='partial'||state==='stale'||explicitStates[name]===state||((state==='loading'||state==='error')&&(request||name==='RetryAction'))||(state==='empty'&&empty.has(name))
 const reason=state==='partial'?'Actual incomplete local resource; native CoverageSummary companion reports bounded coverage.':state==='stale'?'Revision-checked obsolete edit rejected; current host snapshot remains authoritative.':state==='invalid-ref'?'Native tool acceptance/rendering rejects an unregistered resource.':explicitStates[name]===state?'The registered status primitive renders its declared state.':applicable?'Actual request or host state fixture through the native adapter.':state==='empty'?'This scalar control, layout, total, or explicit status surface has no collection emptiness state.':'This synchronous host control/layout or explicit status primitive has no independent asynchronous request lifecycle.'
 return {applicable,reason}
}
export const storyInventory = catalogDescriptors.map(descriptor=>({name:descriptor.name,group:descriptor.group,states: {
 ready:coverage(descriptor.name,'ready'),loading:coverage(descriptor.name,'loading'),partial:coverage(descriptor.name,'partial'),empty:coverage(descriptor.name,'empty'),error:coverage(descriptor.name,'error'),stale:coverage(descriptor.name,'stale'),'invalid-ref':coverage(descriptor.name,'invalid-ref')
}}))
