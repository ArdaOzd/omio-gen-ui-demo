import { useMemo,useRef,useEffect } from 'react'
import { Renderer } from '@openuidev/react-lang'
import { useTravelServices } from '../../catalog/context'
import { ArtifactIdSchema,QueryIRSchema,UICommandPatchSchema,parseQuery } from '../../contracts'
import { bLibrary } from './components/library'
import { validateReactiveProgram } from './query/validate-program'
import { hydrateBindings,applyBindingState } from './state-bridge'
export function ReactiveScene({program,artifactRef,isStreaming=false,onError}:{program:string;artifactRef:string;isStreaming?:boolean;onError?:(code:string)=>void}){
 const host=useTravelServices(),id=ArtifactIdSchema.parse(artifactRef)
 const latest=useRef<Record<string,unknown>>({}),lastValid=useRef(''),controllers=useRef(new Map<string,AbortController>())
 const validation=useMemo(()=>{try{const result=validateReactiveProgram(program,{complete:!isStreaming});if(result.bindings.some(b=>b.artifactRef!==artifactRef))throw new Error('CROSS_ARTIFACT_BINDING');lastValid.current=program;return{result,error:undefined}}catch{return{result:undefined,error:'PROGRAM_INVALID'}}},[program,isStreaming,artifactRef])
 const bindings=validation.result?.bindings??[]
 const hydrated=hydrateBindings(host.state,bindings,validation.result?.parsed.stateDeclarations??{})
 latest.current={...hydrated,...latest.current}
 for(const binding of bindings)latest.current[binding.variable]=hydrated[binding.variable]
 const provider=useMemo(()=>({
  local_query:async(input:Record<string,unknown>)=>{const query=QueryIRSchema.parse(input),manifests=query.sources.map(s=>host.bridge.getManifest(s.datasetRef));const parsed=parseQuery(query,manifests)
   const lane=JSON.stringify({sources:query.sources,project:query.project,groupBy:query.groupBy});controllers.current.get(lane)?.abort();const controller=new AbortController();controllers.current.set(lane,controller)
   const revision=host.state.get(id).revision,result=await host.bridge.query(parsed,controller.signal)
   if(controller.signal.aborted||host.state.get(id).revision!==revision)throw new Error('STALE_QUERY')
   return result
  },
  patch_artifact_state:async(input:Record<string,unknown>)=>{const patch=UICommandPatchSchema.parse(input);if(patch.kind==='select')await host.bridge.lookupFare(patch.fareId,['id']);const state=host.state.get(id);return(host.dispatch??host.state.dispatch)({...patch,artifactId:id,expectedRevision:state.revision})},
 }),[host,id])
 useEffect(()=>()=>{controllers.current.forEach(c=>c.abort())},[])
 useEffect(()=>{if(validation.error)onError?.(validation.error)},[validation.error,onError])
 return <><Renderer library={bLibrary} response={validation.result?program:lastValid.current} isStreaming={isStreaming} initialState={latest.current} toolProvider={provider} publishObservability={false} onStateUpdate={raw=>{
  const compact:Record<string,unknown>={};for(const variable of validation.result?.variables??[]){if(variable in raw)compact[variable]=raw[variable]}
  latest.current=compact;applyBindingState(compact,bindings,host.state,host.dispatch??host.state.dispatch)
 }}/>{validation.error&&<div className="travel-tools-error" role="alert">This generated view could not be applied. The last usable view remains available; ask the assistant to repair it.</div>}</>
}
