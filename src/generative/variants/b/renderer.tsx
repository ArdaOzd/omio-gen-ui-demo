import { useMemo,useRef,useEffect,useState } from 'react'
import { Renderer } from '@openuidev/react-lang'
import { useTravelServices } from '../../catalog/context'
import { ArtifactIdSchema,ArtifactUIStateSchema,RuntimeVariablesSchema,QueryIRSchema,UICommandPatchSchema,parseQuery,type ValidatedQueryIR } from '../../contracts'
import { bLibrary } from './components/library'
import { validateReactiveProgram } from './query/validate-program'
import { resolveBoundDatasetId } from '../../state/leg-bindings'
import { SceneQueryProvider } from './components/query-context'
import { adaptQueryResult } from './query/view-result'
import { evaluateQueryArguments,findQueryStatement } from './query/program-query'
import { rememberQueryResult } from './query/result-ownership'
import { hydrateBindings,applyBindingState } from './state-bridge'
export function ReactiveScene({program,artifactRef,isStreaming=false,onError}:{program:string;artifactRef:string;isStreaming?:boolean;onError?:(code:string)=>void}){
 const host=useTravelServices(),id=ArtifactIdSchema.parse(artifactRef)
 const [actionFailure,setActionFailure]=useState(0)
 const latest=useRef<Record<string,unknown>>({}),lastValid=useRef(''),controllers=useRef(new Map<string,AbortController>())
 const validation=useMemo(()=>{try{const result=validateReactiveProgram(program,{complete:!isStreaming});if(result.bindings.some(b=>b.artifactRef!==artifactRef))throw new Error('CROSS_ARTIFACT_BINDING');lastValid.current=program;return{result,error:undefined}}catch{return{result:undefined,error:'PROGRAM_INVALID'}}},[program,isStreaming,artifactRef])
 const analysis=useRef(validation.result);if(validation.result)analysis.current=validation.result
 const bindings=validation.result?.bindings??[]
 const hydrated=hydrateBindings(host.state,bindings,validation.result?.parsed.stateDeclarations??{})
 latest.current={...hydrated,...latest.current}
 for(const binding of bindings)latest.current[binding.variable]=hydrated[binding.variable]
 for(const [key,value]of Object.entries(host.state.get(id).runtimeVariables))if(validation.result?.variables.includes(key))latest.current[key]=value
 const currentSceneQuery=useMemo(()=>(statementId:string)=>{
  const program=analysis.current;if(!program)throw new Error('QUERY_PENDING')
  const state=host.state.get(id),original=evaluateQueryArguments(program,statementId,state,latest.current)
  const query={...original,sources:original.sources.map(source=>({...source,datasetRef:resolveBoundDatasetId(state,host.bridge,source.datasetRef)}))}
  if(query.sources.some(source=>!state.datasetRefs.includes(source.datasetRef)))throw new Error('UNKNOWN_DATASET_REFERENCE')
  return parseQuery(query,query.sources.map(source=>host.bridge.getManifest(source.datasetRef)))
 },[host,id])
 const executeSceneQuery=useMemo(()=>async(statementId:string,signal:AbortSignal,kind?:string,validatedQuery?:ValidatedQueryIR)=>{
  const query=validatedQuery??currentSceneQuery(statementId)
  return adaptQueryResult(await host.bridge.query(query,signal),query,kind)
 },[host,currentSceneQuery])
 const provider=useMemo(()=>({
  local_query:async(input:Record<string,unknown>)=>{
   const program=analysis.current;if(!program)throw new Error('QUERY_PENDING')
   const original=QueryIRSchema.parse(input),statementId=findQueryStatement(program,original,host.state.get(id),latest.current)
   const controller=new AbortController();controllers.current.get(statementId)?.abort();controllers.current.set(statementId,controller)
   const result=await executeSceneQuery(statementId,controller.signal)
   if(controller.signal.aborted)throw new Error('STALE_QUERY')
   rememberQueryResult(result,artifactRef,signal=>executeSceneQuery(statementId,signal));return result
  },
  patch_artifact_state:async(input:Record<string,unknown>)=>{const patch=UICommandPatchSchema.parse(input);if(patch.kind==='select')await host.bridge.lookupFare(patch.fareId,['id']);const state=host.state.get(id);return(host.dispatch??host.state.dispatch)({...patch,artifactId:id,expectedRevision:state.revision})},
 }),[host,id,executeSceneQuery,artifactRef])
 useEffect(()=>()=>{controllers.current.forEach(c=>c.abort())},[])
 useEffect(()=>setActionFailure(0),[program])
 useEffect(()=>{if(validation.error)onError?.(validation.error)},[validation.error,onError])
 return <SceneQueryProvider value={{artifactId:id,bindings:analysis.current?.queryBindings??[],currentQuery:currentSceneQuery,execute:executeSceneQuery}}><Renderer key={actionFailure} library={bLibrary} response={validation.result?program:lastValid.current} isStreaming={isStreaming} initialState={latest.current} toolProvider={provider} publishObservability={false} onStateUpdate={raw=>{
  const compact:Record<string,unknown>={};for(const variable of validation.result?.variables??[]){if(variable in raw)compact[variable]=raw[variable]}
  const primitive=Object.fromEntries(Object.entries(compact).filter(([key])=>!bindings.some(binding=>binding.variable===key)))
  const current=host.state.get(id),variables=RuntimeVariablesSchema.safeParse({...current.runtimeVariables,...primitive})
  if(!variables.success||bindings.some(binding=>binding.variable in compact&&!ArtifactUIStateSchema.shape[binding.field].safeParse(compact[binding.variable]).success)){
   latest.current={...hydrateBindings(host.state,bindings,analysis.current?.parsed.stateDeclarations??{}),...current.runtimeVariables}
   setActionFailure(failure=>failure+1);onError?.('ACTION_STATE_INVALID');return
  }
  latest.current=compact;applyBindingState(compact,bindings,host.state,host.dispatch??host.state.dispatch)
  const latestState=host.state.get(id)
  if(JSON.stringify(latestState.runtimeVariables)!==JSON.stringify(variables.data))(host.dispatch??host.state.dispatch)({kind:'runtimeVariables',artifactId:id,expectedRevision:latestState.revision,runtimeVariables:variables.data})
 }}/>{validation.error&&<div className="travel-tools-error" role="alert">This generated view could not be applied. The last usable view remains available; ask the assistant to repair it.</div>}{actionFailure>0&&<div className="travel-tools-error" role="alert">This local action exceeded the saved-state limits. Your last saved choices remain available; ask the assistant to repair it.</div>}</SceneQueryProvider>
}
