import type { WidgetProps } from '../layout'
import { useArtifact } from '../context'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
export function Status({kind,...props}:WidgetProps&{kind:string}) {
  const {services,state}=useArtifact(props.artifactRef)
  if(kind==='RetryAction')return <Button type="button" className="travel-button" onClick={()=>{void services.dispatch?.retry?.(state.artifactId)}}>{props.title??'Refresh this view'}</Button>
  const text=props.title??({ArtifactSkeleton:'Preparing your travel view…',CoverageNotice:'Some dates may be outside the loaded data.',EmptyState:'No options match these filters. Try clearing a filter.',InlineError:'This view could not load. You can retry.',StaleBadge:'A newer edit is active.'}[kind]??'Travel status')
  if(kind==='ArtifactSkeleton')return <Skeleton className="travel-notice travel-skeleton" role="status">{text}</Skeleton>
  return <Alert className="travel-notice" role={kind==='InlineError'?'alert':'status'}>{text}</Alert>
}
