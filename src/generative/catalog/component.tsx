import { Component, type ReactNode } from 'react'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { nodePropsSchema } from './generated/catalog'
import { useArtifact, useTravelServices } from './context'
import { ArtifactIdSchema } from '../contracts'
import { Layout, type WidgetProps } from './layout'
import { Control } from './controls'
import { Status } from './status'
import { FareCards, FarePicker, CitySequence, PriceCalendar, Comparison, ComparisonTable, ModeBreakdown, SelectedItinerary, Total, Coverage, Route, Timeline, Plot, CheapestFastest, SelectedFareCount } from './views'
import { CityField, TravelDate, StayDuration, TransportSelect, FareOrder, FadeFares, FareCalendar, MultiCityPlanGrid } from './trip-planning/components'
import { resolvePlannerDatasetRef } from './trip-planning/binding'
const layouts=new Set(['TravelSurface','TravelHero','Section','Stack','Inline','ResponsiveGrid','SplitPane','StickySummary','Tabs','Carousel','Callout'])
const controls=new Set(['ModeChips','CarrierFilter','PriceRange','DurationRange','DirectToggle','SortSelect','DateStrip','DateWindow','StayAllocation'])
const statuses=new Set(['ArtifactSkeleton','CoverageNotice','EmptyState','InlineError','StaleBadge','RetryAction'])
export class ArtifactErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};static getDerivedStateFromError(){return{failed:true}}
 render(){return this.state.failed?<Alert className="travel-tools-error">This view could not be displayed. Ask the assistant to regenerate it.</Alert>:this.props.children}
}
function SubscribedCatalogNode({kind,props}:{kind:string;props:WidgetProps}) {
 const {services}=useArtifact(props.artifactRef)
 let current=props,failed=false
 try {
  const datasetRef=resolvePlannerDatasetRef({kind,artifactRef:props.artifactRef,datasetRef:props.datasetRef,legIndex:props.legIndex},services.state,services.bridge)
  if(datasetRef)current={...props,datasetRef}
 }catch{failed=true}
 if(failed)return <Alert className="travel-notice" role="status">This view's travel data is not available. Reload or retry the conversation.</Alert>
 let content:ReactNode
 if(layouts.has(kind))content=<Layout kind={kind} {...current}/>
 else if(controls.has(kind))content=<Control kind={kind} {...current}/>
 else if(statuses.has(kind))content=<Status kind={kind} {...current}/>
 else switch(kind){
 case 'CityField':content=<CityField {...current}/>;break
 case 'TravelDate':content=<TravelDate {...current}/>;break
 case 'StayDuration':content=<StayDuration {...current}/>;break
 case 'TransportSelect':content=<TransportSelect {...current}/>;break
 case 'FareOrder':content=<FareOrder {...current}/>;break
 case 'FadeFares':content=<FadeFares {...current}/>;break
 case 'FareCalendar':content=<FareCalendar {...current}/>;break
 case 'MultiCityPlanGrid':content=<MultiCityPlanGrid {...current}/>;break
 case 'FareCards':content=<FareCards {...current}/>;break
 case 'FarePicker':content=<FarePicker {...current}/>;break
 case 'PriceCalendar':content=<PriceCalendar {...current}/>;break
 case 'ComparisonTable':content=<ComparisonTable {...current}/>;break
 case 'ComparisonMatrix':content=<Comparison {...current}/>;break
 case 'ModeBreakdown':content=<ModeBreakdown {...current}/>;break
 case 'SyntheticTotal':content=<Total {...current}/>;break
 case 'SelectedItinerary':content=<SelectedItinerary {...current}/>;break
 case 'CoverageSummary':content=<Coverage {...current}/>;break
 case 'RouteMap':content=<Route {...current}/>;break
 case 'CitySequence':content=<CitySequence {...current}/>;break
 case 'ItineraryTimeline':content=<Timeline {...current}/>;break
 case 'DurationPricePlot':content=<Plot {...current}/>;break
 case 'CheapestFastest':content=<CheapestFastest {...current}/>;break
 case 'SelectedFareCount':content=<SelectedFareCount {...current}/>;break
 default:content=<Alert>Unknown travel component.</Alert>
 }
 return content
}
export function CatalogNode({kind,...input}:WidgetProps&{kind:string}) {
 const services=useTravelServices()
 const {children,$status,...scalar}=input;const parsed=nodePropsSchema.safeParse(scalar)
 if(!parsed.success)return $status==='streaming'?<Skeleton className="travel-skeleton" role="status">Preparing view…</Skeleton>:<Alert className="travel-tools-error">This view has invalid references.</Alert>
 const props={...parsed.data,children,$status}
 try {
  services.state.get(ArtifactIdSchema.parse(props.artifactRef))
  resolvePlannerDatasetRef({kind,artifactRef:props.artifactRef,datasetRef:props.datasetRef,legIndex:props.legIndex},services.state,services.bridge)
 }catch{return <Alert className="travel-notice" role="status">This view's travel data is not available. Reload or retry the conversation.</Alert>}
 return <ArtifactErrorBoundary><SubscribedCatalogNode kind={kind} props={props}/></ArtifactErrorBoundary>
}
