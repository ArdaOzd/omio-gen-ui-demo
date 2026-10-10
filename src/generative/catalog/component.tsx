import { Children, Component, isValidElement, type ReactNode } from 'react'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { nodePropsSchema } from './generated/catalog'
import { useArtifact, useTravelServices } from './context'
import { ArtifactIdSchema, DatasetIdSchema } from '../contracts'
import { Layout, type WidgetProps } from './layout'
import { Control } from './controls'
import { Status } from './status'
import { FareCards, FarePicker, CitySequence, PriceCalendar, Comparison, ComparisonTable, ModeBreakdown, SelectedItinerary, Total, Coverage, Route, Timeline, Plot, CheapestFastest, SelectedFareCount } from './views'
import { CityField, TravelDate, StayDuration, TransportSelect, FareOrder, FadeFares, FareCalendar, MultiCityPlanGrid } from './trip-planning/components'
import { isDatasetBoundComponent, resolvePlannerDatasetRef } from './trip-planning/binding'
import { DisplayNodeProvider } from './display-context-provider'
import type { ComponentIdentity } from '../contracts/display-context'
import { legKey } from '../state/leg-bindings'
import { resolveRouteText } from './route-text'
const layouts=new Set(['TravelSurface','TravelHero','Section','Stack','Inline','ResponsiveGrid','SplitPane','StickySummary','Tabs','Carousel','Callout'])
const controls=new Set(['ModeChips','CarrierFilter','PriceRange','DurationRange','DirectToggle','SortSelect','DateStrip','DateWindow','StayAllocation'])
const statuses=new Set(['ArtifactSkeleton','CoverageNotice','EmptyState','InlineError','StaleBadge','RetryAction'])
export class ArtifactErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};static getDerivedStateFromError(){return{failed:true}}
 render(){return this.state.failed?<Alert className="travel-tools-error">This view could not be displayed. Ask the assistant to regenerate it.</Alert>:this.props.children}
}
type ChildTextProps={title?:unknown;tabLabel?:unknown;routeTextLegIndex?:unknown;legIndex?:unknown}
function ResolvedTabLabel({props,index}:{props:ChildTextProps&{artifactRef?:unknown};index:number}){
 const raw=typeof props.tabLabel==='string'?props.tabLabel:typeof props.title==='string'?props.title:undefined
 if(typeof props.artifactRef!=='string'||!raw)return <>View {index+1}</>
 return <ResolvedTabLabelText artifactRef={props.artifactRef} raw={raw} legIndex={typeof props.routeTextLegIndex==='number'?props.routeTextLegIndex:typeof props.legIndex==='number'?props.legIndex:undefined}/>
}
function ResolvedTabLabelText({artifactRef,raw,legIndex}:{artifactRef:string;raw:string;legIndex?:number}){
 const {state}=useArtifact(artifactRef)
 return <>{resolveRouteText(raw,state,legIndex)}</>
}
function tabLabels(children:ReactNode):ReactNode[]{
 return Children.toArray(children).map((child,index)=>{
  if(!isValidElement<ChildTextProps>(child))return `View ${index+1}`
  return <ResolvedTabLabel key={index} props={child.props} index={index}/>
 })
}
function ResolvedCatalogNode({kind,props}:{kind:string;props:WidgetProps}) {
 const {services,state}=useArtifact(props.artifactRef)
 const textLegIndex=props.routeTextLegIndex??props.legIndex
 let current:WidgetProps={
  ...props,
  ...(props.title?{title:resolveRouteText(props.title,state,textLegIndex)}:{}),
  ...(props.tabLabel?{tabLabel:resolveRouteText(props.tabLabel,state,textLegIndex)}:{}),
  ...(props.body?{body:resolveRouteText(props.body,state,textLegIndex)}:{}),
  ...(typeof props.children==='string'?{children:resolveRouteText(props.children,state,textLegIndex)}:{}),
  ...(kind==='Tabs'?{__tabLabels:tabLabels(props.children)}:{}),
 }
 let failed=false
 try {
  const datasetRef=isDatasetBoundComponent(kind)?resolvePlannerDatasetRef({kind,artifactRef:props.artifactRef,datasetRef:props.datasetRef,legIndex:props.legIndex},services.state,services.bridge):undefined
  if(datasetRef)current={...current,datasetRef}
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
 const componentRef=props.__displayComponent?.componentRef??{value:`${props.artifactRef}:direct.${kind}`,keySource:'tree-path' as const}
 const selectedScope=new Set(['SelectedItinerary','SyntheticTotal','SelectedFareCount']).has(kind)
 const binding=current.datasetRef?services.bridge.findBinding(DatasetIdSchema.parse(current.datasetRef)):undefined
 const bindingKey=binding?legKey(binding.manifest.coverage):undefined
 const routeIndex=bindingKey?state.citySequence.slice(1).findIndex((destination,index)=>`${state.citySequence[index]}:${destination}`===bindingKey):-1
 const boundIndex=current.legIndex??(routeIndex>=0?routeIndex:state.datasetRefs.findIndex(datasetId=>datasetId===current.datasetRef))
 const scope:ComponentIdentity['scope']=selectedScope?{kind:'selection',artifactId:current.artifactRef}:binding&&bindingKey&&boundIndex>=0?{kind:'leg',artifactId:current.artifactRef,legIndex:boundIndex,legKey:bindingKey,resourceKey:binding.resourceKey}:{kind:'artifact',artifactId:current.artifactRef}
 const identity:ComponentIdentity={componentRef,componentType:kind,scope,authored:{...(current.title?{title:current.title}:{}),...(current.tabLabel?{tabLabel:current.tabLabel}:{}),...(current.body?{body:current.body}:{}),...(current.variant?{variant:current.variant}:{}),...(current.actionRef?{actionRef:current.actionRef}:{}),...(current.selectorRef?{selectorRef:current.selectorRef}:{})}}
 return <DisplayNodeProvider identity={identity}>{content}</DisplayNodeProvider>
}
function AvailableCatalogNode({kind,props}:{kind:string;props:WidgetProps}) {
 const services=useTravelServices()
 try{services.state.get(ArtifactIdSchema.parse(props.artifactRef))}
 catch{return <Alert className="travel-notice" role="status">This view's travel data is not available. Reload or retry the conversation.</Alert>}
 return <ArtifactErrorBoundary><ResolvedCatalogNode kind={kind} props={props}/></ArtifactErrorBoundary>
}
export function CatalogNode({kind,...input}:WidgetProps&{kind:string}) {
 const {children,$status,__displayComponent,...scalar}=input;const parsed=nodePropsSchema.safeParse(scalar)
 if(!parsed.success)return $status==='streaming'?<Skeleton className="travel-skeleton" role="status">Preparing view…</Skeleton>:<Alert className="travel-tools-error">This view has invalid references.</Alert>
 const props={...parsed.data,children,$status,__displayComponent}
 return <AvailableCatalogNode kind={kind} props={props}/>
}
