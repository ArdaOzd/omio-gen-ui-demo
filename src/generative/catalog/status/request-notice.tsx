import { Alert } from '@/components/ui/alert'

export function RequestNotice({status,empty=false,label='These options'}:{status:'loading'|'ready'|'error';empty?:boolean;label?:string}) {
 if(status==='loading')return <Alert role="status" className="travel-notice">Loading {label.toLowerCase()}…</Alert>
 if(status==='error')return <Alert className="travel-notice">{label} could not load. Try refreshing the view.</Alert>
 return empty?<Alert role="status" className="travel-notice">No options match. Try another mode, date, or price limit.</Alert>:null
}
