import { Component, type ReactNode } from 'react'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { sharedPropsSchema } from './generated/catalog'
import { useTravelServices } from './context'
import { ArtifactIdSchema, DatasetIdSchema } from '../contracts'
import { Layout, type WidgetProps } from './layout'
import { Control } from './controls'
import { Status } from './status'
import { FareCards, FarePicker, CitySequence, PriceCalendar, Comparison, ComparisonTable, ModeBreakdown, SelectedItinerary, Total, Coverage, Route, Timeline, Plot, CheapestFastest, SelectedFareCount } from './views'
import { CityField, TravelDate, StayDuration, TransportSelect, FareOrder, FadeFares, FareCalendar, MultiCityPlanGrid } from './trip-planning/components'
const layouts=new Set(['TravelSurface','TravelHero','Section','Stack','Inline','ResponsiveGrid','SplitPane','StickySummary','Tabs','Carousel','Callout'])
const controls=new Set(['ModeChips','CarrierFilter','PriceRange','DurationRange','DirectToggle','SortSelect','DateStrip','DateWindow','StayAllocation'])
const statuses=new Set(['ArtifactSkeleton','CoverageNotice','EmptyState','InlineError','StaleBadge','RetryAction'])
export class ArtifactErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};static getDerivedStateFromError(){return{failed:true}}
 render(){return this.state.failed?<Alert className="travel-tools-error">This view could not be displayed. Ask the assistant to regenerate it.</Alert>:this.props.children}
}
export function CatalogNode({kind,...input}:WidgetProps&{kind:string}) {
 const services=useTravelServices()
 const {children,$status,...scalar}=input;const parsed=sharedPropsSchema.safeParse(scalar)
 if(!parsed.success)return $status==='streaming'?<Skeleton className="travel-skeleton" role="status">Preparing view…</Skeleton>:<Alert className="travel-tools-error">This view has invalid references.</Alert>
 const props={...parsed.data,children,$status}
 try {services.state.get(ArtifactIdSchema.parse(props.artifactRef));if(props.datasetRef)services.bridge.getManifest(DatasetIdSchema.parse(props.datasetRef))}catch{return <Alert className="travel-notice" role="status">This view's travel data is not available. Reload or retry the conversation.</Alert>}
 let content:ReactNode
 if(layouts.has(kind))content=<Layout kind={kind} {...props}/>
 else if(controls.has(kind))content=<Control kind={kind} {...props}/>
 else if(statuses.has(kind))content=<Status kind={kind} {...props}/>
 else switch(kind){
 case 'CityField':content=<CityField {...props}/>;break
 case 'TravelDate':content=<TravelDate {...props}/>;break
 case 'StayDuration':content=<StayDuration {...props}/>;break
 case 'TransportSelect':content=<TransportSelect {...props}/>;break
 case 'FareOrder':content=<FareOrder {...props}/>;break
 case 'FadeFares':content=<FadeFares {...props}/>;break
 case 'FareCalendar':content=<FareCalendar {...props}/>;break
 case 'MultiCityPlanGrid':content=<MultiCityPlanGrid {...props}/>;break
 case 'FareCards':content=<FareCards {...props}/>;break
 case 'FarePicker':content=<FarePicker {...props}/>;break
 case 'PriceCalendar':content=<PriceCalendar {...props}/>;break
 case 'ComparisonTable':content=<ComparisonTable {...props}/>;break
 case 'ComparisonMatrix':content=<Comparison {...props}/>;break
 case 'ModeBreakdown':content=<ModeBreakdown {...props}/>;break
 case 'SyntheticTotal':content=<Total {...props}/>;break
 case 'SelectedItinerary':content=<SelectedItinerary {...props}/>;break
 case 'CoverageSummary':content=<Coverage {...props}/>;break
 case 'RouteMap':content=<Route {...props}/>;break
 case 'CitySequence':content=<CitySequence {...props}/>;break
 case 'ItineraryTimeline':content=<Timeline {...props}/>;break
 case 'DurationPricePlot':content=<Plot {...props}/>;break
 case 'CheapestFastest':content=<CheapestFastest {...props}/>;break
 case 'SelectedFareCount':content=<SelectedFareCount {...props}/>;break
 default:content=<Alert>Unknown travel component.</Alert>
 }
 return <ArtifactErrorBoundary>{content}</ArtifactErrorBoundary>
}
