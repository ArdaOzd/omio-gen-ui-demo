import { FareRowSchema, type CoverageRequest, type FareRow } from '../contracts'

export type PageInput = {originId:string;destinationId:string;date:string;passengers:number;page:number;limit:number}
export type FarePage = {rows:FareRow[];total:number;pages:number;page:number;sourceVersion:string}
export type PageSource = (input:PageInput, signal:AbortSignal)=>Promise<FarePage>
export type LoadedResource = {rows:FareRow[];complete:boolean;sourceVersion:string}
export function abortError(): DOMException {return new DOMException('Operation canceled','AbortError')}
export function coverageKey(request:CoverageRequest):string {return JSON.stringify({...request,originIds:[...request.originIds].sort(),destinationIds:[...request.destinationIds].sort(),modes:[...request.modes].sort()})}
export function stableRef(value:string):string {let hash=2166136261;for (const char of value) {hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(36)}

export async function loadResource(request:CoverageRequest, source:PageSource,signal:AbortSignal,options:{maxRows:number;maxPages:number}):Promise<LoadedResource> {
  const rows = new Map<string,FareRow>()
  let sourceVersion:string|undefined
  let pagesRead=0
  for (const originId of request.originIds) for (const destinationId of request.destinationIds) {
    if (originId===destinationId) continue
    for (let day=Date.parse(request.dateWindow.from);day<=Date.parse(request.dateWindow.to);day+=86400000) {
      const date=new Date(day).toISOString().slice(0,10)
      let expectedTotal:number|undefined
      let expectedPages:number|undefined
      const received=new Set<string>()
      for (let page=1;;page++) {
        if (signal.aborted) throw abortError()
        if (pagesRead>=options.maxPages || rows.size>=options.maxRows) return {rows:[...rows.values()],complete:false,sourceVersion:sourceVersion??'unknown'}
        const result=await source({originId,destinationId,date,passengers:request.passengers,page,limit:100},signal)
        if (signal.aborted) throw abortError()
        if (result.page!==page || !Number.isInteger(result.total) || result.total<0 || !Number.isInteger(result.pages) || result.pages<0 || result.rows.length>100) throw new Error('Invalid page metadata')
        if (expectedTotal!==undefined && (result.total!==expectedTotal || result.pages!==expectedPages)) throw new Error('Page coverage changed while loading')
        if (sourceVersion!==undefined && sourceVersion!==result.sourceVersion) throw new Error('Mixed source version')
        sourceVersion=result.sourceVersion;expectedTotal=result.total;expectedPages=result.pages;pagesRead++
        for (const raw of result.rows) {
          const row=FareRowSchema.parse(raw)
          if (row.originId!==originId || row.destinationId!==destinationId || row.serviceDate!==date || row.availableSeats<request.passengers) throw new Error('Fare falls outside declared coverage')
          received.add(row.id)
          if (!request.modes.includes(row.mode)) continue
          const previous=rows.get(row.id)
          if (previous && JSON.stringify(previous)!==JSON.stringify(row)) throw new Error('Conflicting fare identity')
          if (!previous && rows.size>=options.maxRows) return {rows:[...rows.values()],complete:false,sourceVersion}
          rows.set(row.id,row)
        }
        if (page>=result.pages) {
          if (received.size!==result.total) throw new Error('Incomplete page exhaustion')
          break
        }
        if (!result.rows.length) throw new Error('Empty page before exhaustion')
      }
    }
  }
  return {rows:[...rows.values()],complete:true,sourceVersion:sourceVersion??'empty-v1'}
}
