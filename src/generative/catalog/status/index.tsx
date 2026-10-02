import type { WidgetProps } from '../layout'
import { useArtifact } from '../context'
export function Status({kind,...props}:WidgetProps&{kind:string}) {
  const {services,state}=useArtifact(props.artifactRef)
  if(kind==='RetryAction')return <button type="button" className="travel-button" onClick={()=>services.state.dispatch({kind:'datasets',artifactId:state.artifactId,datasetRefs:state.datasetRefs})}>{props.title??'Refresh this view'}</button>
  const text=props.title??({ArtifactSkeleton:'Preparing your travel view…',CoverageNotice:'Some dates may be outside the loaded data.',EmptyState:'No options match these filters. Try clearing a filter.',InlineError:'This view could not load. You can retry.',StaleBadge:'A newer edit is active.'}[kind]??'Travel status')
  return <div className={`travel-notice ${kind==='ArtifactSkeleton'?'travel-skeleton':''}`} role={kind==='InlineError'?'alert':'status'}>{text}</div>
}
