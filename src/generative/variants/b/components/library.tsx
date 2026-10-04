import { useEffect,useMemo,useRef } from 'react'
import { createLibrary,defineComponent,useStateField,useTriggerAction,type ComponentRenderProps } from '@openuidev/react-lang'
import { z } from 'zod'
import { ArtifactIdSchema,DatasetIdSchema,FareIdSchema,FareRowSchema } from '../../../contracts'
import type { QueryFareSelectionScope } from '../../../state/action-router'
import { catalogDescriptors } from '../../../catalog/generated/catalog'
import { CatalogNode } from '../../../catalog/component'
import { TravelProvider,useArtifact,useTravelServices } from '../../../catalog/context'
import { WorkerResponseSchema } from '../../../query/protocol'
import { useSceneQuery } from './query-context'
import { runBoundQueryResult } from '../query/result-ownership'
import { resolveBoundDatasetId } from '../../../state/leg-bindings'
import { parseAction } from '../query/action'
import { bPropsSchema,bComponentPropsSchema } from '../query/schema'
type Props=z.infer<typeof bPropsSchema>
function HostBoundNode({name,props,renderNode}:{name:string}&ComponentRenderProps<Props>){
 const host=useTravelServices(),{state}=useArtifact(props.artifactRef),trigger=useTriggerAction(),scene=useSceneQuery()
 const generatedQuery=scene?.bindings.find(binding=>binding.kind===name&&binding.artifactRef===props.artifactRef&&binding.datasetRef===(props.datasetRef??undefined)&&binding.title===(props.title??undefined))
 const field=useStateField(`${props.artifactRef}:${props.binding??name}`,props.value)
 const fieldRef=useRef(field);fieldRef.current=field
 const hostValue=props.binding?state[props.binding]:undefined
 const encoded=JSON.stringify(field.value),desired=JSON.stringify(hostValue)
 useEffect(()=>{if(props.binding){const current=host.state.get(state.artifactId)[props.binding];if(JSON.stringify(fieldRef.current.value)!==JSON.stringify(current))fieldRef.current.setValue(current)}},[props.binding,encoded,desired,host.state,state.artifactId])
 const queryEncoded=JSON.stringify(props.query)
 const selectionScope=useRef<QueryFareSelectionScope|undefined>(undefined)
 const services=useMemo(()=>{
  const validated=WorkerResponseSchema.safeParse({kind:'result',id:'view',result:props.query})
  return {...host,queryForView:generatedQuery&&scene?()=>scene.currentQuery(generatedQuery.queryId):undefined,bridge:{...host.bridge,query:async(input:Parameters<typeof host.bridge.query>[0],signal:AbortSignal)=>{
   if(generatedQuery&&scene){
    const query=input
    const sources=query.sources.map(source=>{const manifest=host.bridge.getManifest(source.datasetRef);return{datasetId:manifest.datasetId,revision:manifest.revision,sourceVersion:manifest.source.sourceVersion}})
    const result=await scene.execute(generatedQuery.queryId,signal,name,query)
    if(['FareCards','FarePicker','Timeline','Plot'].includes(name)&&result.rows.some(row=>!FareRowSchema.safeParse(row).success))throw new Error('QUERY_VIEW_SHAPE_MISMATCH')
    if(!signal.aborted)selectionScope.current={kind:'query-result',fareIds:result.rows.flatMap(row=>{const id=FareIdSchema.safeParse(row.id);return id.success?[id.data]:[]}),query,currentQuery:()=>scene.currentQuery(generatedQuery.queryId),sources}
    return result
   }
   if(validated.success&&validated.data.kind==='result')return runBoundQueryResult(validated.data.result,props.artifactRef,signal)
   if(props.query!==undefined&&props.query!==null)throw new Error('GENERATED_QUERY_PENDING')
   return host.bridge.query(input,signal)
  }},dispatch:Object.assign((command:Parameters<typeof host.state.dispatch>[0])=>{
   const result=command.kind==='select'&&command.selected&&generatedQuery&&host.dispatch?.selectFromQuery&&selectionScope.current?host.dispatch.selectFromQuery(command,selectionScope.current):(host.dispatch??host.state.dispatch)(command)
   if(result.status==='applied'&&props.binding)fieldRef.current.setValue(host.state.get(command.artifactId)[props.binding])
   return result
  },{retry:host.dispatch?.retry,selectFromQuery:host.dispatch?.selectFromQuery})}
 },[host,queryEncoded,props.binding,props.artifactRef,generatedQuery?.queryId,scene?.execute,scene?.currentQuery])
 const {children,value,binding,query,action,...common}=props
 const scalar=Object.fromEntries(Object.entries(common).filter(([,value])=>value!==null&&value!==undefined))
 const normalized=name==='Callout'&&typeof scalar.title==='string'&&scalar.title.length>160?{...scalar,title:undefined,body:scalar.body??scalar.title}:scalar
 const checked=bPropsSchema.parse(normalized)
 return <TravelProvider services={services}><div onClick={action?()=>trigger(props.title??name,undefined,parseAction(action)):undefined}><CatalogNode kind={name} {...checked}>{renderNode(children)}</CatalogNode></div></TravelProvider>
}
function BoundNode(input:{name:string}&ComponentRenderProps<Props>){
 const host=useTravelServices(),scene=useSceneQuery()
 try{
  if(scene){
   if(input.props.artifactRef!==scene.artifactId)throw new Error('UNKNOWN_ARTIFACT_REFERENCE')
   if(input.props.datasetRef){const state=host.state.get(ArtifactIdSchema.parse(input.props.artifactRef)),resolved=resolveBoundDatasetId(state,host.bridge,DatasetIdSchema.parse(input.props.datasetRef));if(!state.datasetRefs.includes(resolved))throw new Error('UNKNOWN_DATASET_REFERENCE')}
  }
 }catch{return <div role="alert" className="travel-notice">This generated view refers to travel data outside its artifact. Ask the assistant to repair it.</div>}
 return <HostBoundNode {...input}/>
}
export const bLibrary=createLibrary({root:'TravelSurface',components:catalogDescriptors.map(d=>defineComponent({name:d.name,description:d.description,props:bComponentPropsSchema(d.name),component:input=><BoundNode name={d.name} {...input}/>}))})
