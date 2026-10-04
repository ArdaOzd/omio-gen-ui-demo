export function RequestNotice({status,empty=false,label='These options'}:{status:'loading'|'ready'|'error';empty?:boolean;label?:string}) {
 if(status==='loading')return <p role="status" className="travel-notice">Loading {label.toLowerCase()}…</p>
 if(status==='error')return <p role="alert" className="travel-notice">{label} could not load. Try refreshing the view.</p>
 return empty?<p role="status" className="travel-notice">No options match. Try another mode, date, or price limit.</p>:null
}
