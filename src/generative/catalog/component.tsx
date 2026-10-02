import { Component, type ReactNode } from 'react'
import { sharedPropsSchema } from './generated/catalog'
import { useTravelServices } from './context'
import { ArtifactIdSchema, DatasetIdSchema } from '../contracts'
import { Layout, type WidgetProps } from './layout'
import { Control } from './controls'
import { Status } from './status'
import { FareCards, PriceCalendar, Comparison, Total, Coverage, Route, Timeline, Plot, CheapestFastest } from './views'
const layouts=new Set(['TravelSurface','TravelHero','Section','Stack','Inline','ResponsiveGrid','SplitPane','StickySummary','Tabs','Carousel','Callout'])
const controls=new Set(['ModeChips','CarrierFilter','PriceRange','DurationRange','DirectToggle','SortSelect','DateStrip','DateWindow','StayAllocation'])
const statuses=new Set(['ArtifactSkeleton','CoverageNotice','EmptyState','InlineError','StaleBadge','RetryAction'])
export class ArtifactErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};static getDerivedStateFromError(){return{failed:true}}
 render(){return this.state.failed?<div role="alert" className="travel-tools-error">This view could not be displayed. Ask the assistant to regenerate it.</div>:this.props.children}
}
export function CatalogNode({kind,...input}:WidgetProps&{kind:string}) {
 const services=useTravelServices()
 const {children,$status,...scalar}=input;const parsed=sharedPropsSchema.safeParse(scalar)
 if(!parsed.success)return $status==='streaming'?<div className="travel-skeleton" role="status">Preparing view…</div>:<div className="travel-tools-error" role="alert">This view has invalid references.</div>
 const props={...parsed.data,children,$status}
 try {services.state.get(ArtifactIdSchema.parse(props.artifactRef));if(props.datasetRef)services.bridge.getManifest(DatasetIdSchema.parse(props.datasetRef))}catch{return <div className="travel-notice" role="status">This view's travel data is not available. Reload or retry the conversation.</div>}
 let content:ReactNode
 if(layouts.has(kind))content=<Layout kind={kind} {...props}/>
 else if(controls.has(kind))content=<Control kind={kind} {...props}/>
 else if(statuses.has(kind))content=<Status kind={kind} {...props}/>
 else switch(kind){
 case 'FareCards':case 'FarePicker':content=<FareCards {...props}/>;break
 case 'PriceCalendar':content=<PriceCalendar {...props}/>;break
 case 'ComparisonTable':case 'ComparisonMatrix':case 'ModeBreakdown':content=<Comparison {...props}/>;break
 case 'SyntheticTotal':case 'SelectedItinerary':content=<Total {...props}/>;break
 case 'CoverageSummary':content=<Coverage {...props}/>;break
 case 'RouteMap':case 'CitySequence':content=<Route {...props}/>;break
 case 'ItineraryTimeline':content=<Timeline {...props}/>;break
 case 'DurationPricePlot':content=<Plot {...props}/>;break
 case 'CheapestFastest':content=<CheapestFastest {...props}/>;break
 default:content=<div role="alert">Unknown travel component.</div>
 }
 return <ArtifactErrorBoundary>{content}</ArtifactErrorBoundary>
}
