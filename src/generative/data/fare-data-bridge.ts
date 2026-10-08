import { BoundedFareFactSchema, CoverageRequestSchema, DatasetIdSchema, DatasetManifestSchema, DatasetRevisionSchema, FareFieldSchema, CONTRACT_VERSION, parseQuery, type DatasetId, type DatasetManifest, type FareRow, type FareDataBridge, type DatasetFieldManifest } from '../contracts'
import { loadResource,coverageKey,stableRef,abortError,type PageSource } from './resource-loader'
import { createLocalQueryEngine,type LocalQueryEngine } from '../query/worker-client'
import { createSearchPageSource } from './search-client'

export function createFareDataBridge(options:{pageSource?:PageSource;maxRows?:number;maxPages?:number;queryEngine?:LocalQueryEngine}={}):FareDataBridge {
  const engine=options.queryEngine??createLocalQueryEngine()
  const ownsEngine=options.queryEngine===undefined
  const resources=new Map<DatasetId,{manifest:DatasetManifest;engineId:DatasetId;rows:FareRow[];byId:Map<string,FareRow>;carrierNames:Map<string,string>;references:number}>()
  const pending=new Map<string,{promise:Promise<DatasetManifest>;controller:AbortController;subscribers:number}>()
  const listeners=new Map<DatasetId,Set<()=>void>>()
  const fields:DatasetFieldManifest[]=FareFieldSchema.options.map(name=>({name,type:['priceCents','durationMinutes','departureMinutes','availableSeats'].includes(name)?'number':name==='synthetic'||name==='direct'?'boolean':'string',nullable:name==='carrierName',filterable:true,groupable:true,joinKey:['id','originId','destinationId','serviceDate','carrierId'].includes(name)}))
  async function load(raw:Parameters<FareDataBridge['load']>[0],signal:AbortSignal):Promise<DatasetManifest> {
    if(signal.aborted)throw abortError()
    const request=CoverageRequestSchema.parse(raw)
    const key=coverageKey(request);const id=DatasetIdSchema.parse(`dataset-${stableRef(key)}`)
    const existing=resources.get(id)
    if(existing?.manifest.coverage.complete){existing.references++;return structuredClone(existing.manifest)}
    let active=pending.get(key)
    if(!active){
      const controller=new AbortController()
      const promise=loadResource(request,options.pageSource??createSearchPageSource(),controller.signal,{maxRows:options.maxRows??50_000,maxPages:options.maxPages??256}).then(async result=>{
        if(controller.signal.aborted)throw abortError()
        const range=result.rows.reduce((range,row)=>({minPrice:Math.min(range.minPrice,row.priceCents),maxPrice:Math.max(range.maxPrice,row.priceCents),minDuration:Math.min(range.minDuration,row.durationMinutes),maxDuration:Math.max(range.maxDuration,row.durationMinutes)}),{minPrice:Infinity,maxPrice:0,minDuration:Infinity,maxDuration:0})
        const counts:Partial<Record<FareRow['mode'],number>>={};for(const row of result.rows)counts[row.mode]=(counts[row.mode]??0)+1
        const summary={modeCounts:counts,...(result.rows.length?{minPriceCents:range.minPrice,maxPriceCents:range.maxPrice,minDurationMinutes:range.minDuration,maxDurationMinutes:range.maxDuration}:{})}
        const manifest=DatasetManifestSchema.parse({datasetId:id,revision:DatasetRevisionSchema.parse((existing?.manifest.revision??0)+1),schemaVersion:CONTRACT_VERSION,coverage:{...request,complete:result.complete,truncated:!result.complete},rowCount:result.rows.length,fields,compactSummary:summary,source:{kind:'search',descriptorId:`resource-${stableRef(key)}`,sourceVersion:result.sourceVersion}})
        const engineId=DatasetIdSchema.parse(`cache-${crypto.randomUUID()}`)
        let committed=false
        try{
          await engine.register(engineId,{rows:result.rows,revision:manifest.revision,sourceVersion:manifest.source.sourceVersion,logicalDatasetId:id})
          if(controller.signal.aborted)throw abortError()
          const previous=resources.get(id)
          resources.set(id,{manifest,engineId,rows:result.rows,byId:new Map(result.rows.map(row=>[row.id,row])),carrierNames:new Map(result.rows.flatMap(row=>row.carrierName?[[row.carrierId,row.carrierName]]:[])),references:previous?.references??0})
          committed=true
          if(previous)engine.release(previous.engineId)
          listeners.get(id)?.forEach(listener=>listener())
          return manifest
        }finally{if(!committed)engine.release(engineId)}
      }).finally(()=>{if(pending.get(key)?.controller===controller)pending.delete(key)})
      active={promise,controller,subscribers:0};pending.set(key,active)
    }
    active.subscribers++
    const loadState=active
    return new Promise((resolve,reject)=>{
      let settled=false
      function finish(){if(settled)return false;settled=true;signal.removeEventListener('abort',cancel);loadState.subscribers--;return true}
      function cancel(){if(!finish())return;reject(abortError());if(!loadState.subscribers){loadState.controller.abort();if(pending.get(key)===loadState)pending.delete(key)}}
      signal.addEventListener('abort',cancel,{once:true})
      loadState.promise.then(manifest=>{if(!finish())return;const resource=resources.get(manifest.datasetId);if(resource)resource.references++;resolve(structuredClone(manifest))},error=>{if(finish())reject(error)})
    })
  }
  return {load,
    getCarrierLabel(carrierId,datasetId){if(datasetId)return resources.get(datasetId)?.carrierNames.get(carrierId);const names=new Set([...resources.values()].flatMap(resource=>{const name=resource.carrierNames.get(carrierId);return name?[name]:[]}));return names.size===1?[...names][0]:undefined},
    getFareItinerary(id,datasetId){const row=resources.get(datasetId)?.byId.get(id);if(!row)return undefined;const legs=row.legs??[];return structuredClone({transfers:legs.length?legs.length-1:row.direct?0:1,legs})},
    getManifest(id){const resource=resources.get(id);if(!resource)throw new Error('Expired dataset reference');return structuredClone(resource.manifest)},
    async query(input,signal){
      const query=parseQuery(input,[...resources.values()].map(resource=>resource.manifest))
      const captured=query.sources.map(source=>{const resource=resources.get(source.datasetRef);if(!resource)throw new Error('Expired dataset reference');return{source,resource}})
      const result=await engine.execute({...query,sources:captured.map(({source,resource})=>({...source,datasetRef:resource.engineId}))},signal)
      if(captured.some(({source,resource})=>resources.get(source.datasetRef)!==resource))throw new Error('Stale query result')
      return result
    },
    async lookupFare(id,_fields){for(const resource of resources.values()){const row=resource.byId.get(id);if(row){const {availableSeats:_seats,direct:_direct,legs:_legs,...fact}=row;return BoundedFareFactSchema.parse(fact)}}throw new Error('Expired fare reference')},
    subscribe(id,listener){const set=listeners.get(id)??new Set<()=>void>();set.add(listener);listeners.set(id,set);return()=>{set.delete(listener)}},
    release(id){const resource=resources.get(id);if(resource&&--resource.references<=0){resources.delete(id);engine.release(resource.engineId);listeners.delete(id)}},
    dispose(){for(const item of pending.values())item.controller.abort();pending.clear();for(const resource of resources.values())engine.release(resource.engineId);resources.clear();listeners.clear();if(ownsEngine)engine.dispose()},
  }
}
