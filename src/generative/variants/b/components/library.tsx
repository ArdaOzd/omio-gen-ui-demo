import { useEffect,useMemo } from 'react'
import { createLibrary,defineComponent,useStateField,useTriggerAction,type ComponentRenderProps } from '@openuidev/react-lang'
import { z } from 'zod'
import { catalogDescriptors } from '../../../catalog/generated/catalog'
import { CatalogNode } from '../../../catalog/component'
import { TravelProvider,useArtifact,useTravelServices } from '../../../catalog/context'
import { WorkerResponseSchema } from '../../../query/protocol'
import { useSceneQuery } from './query-context'
import { runBoundQueryResult } from '../query/result-ownership'
import { parseAction } from '../query/action'
import { bPropsSchema,bComponentPropsSchema } from '../query/schema'
type Props=z.infer<typeof bPropsSchema>
function BoundNode({name,props,renderNode}:{name:string}&ComponentRenderProps<Props>){
 const host=useTravelServices(),{state}=useArtifact(props.artifactRef),trigger=useTriggerAction(),scene=useSceneQuery()
 const generatedQuery=scene?.bindings.find(binding=>binding.kind===name&&binding.artifactRef===props.artifactRef&&binding.datasetRef===(props.datasetRef??undefined)&&binding.title===(props.title??undefined))
 const field=useStateField(`${props.artifactRef}:${props.binding??name}`,props.value)
 const hostValue=props.binding?state[props.binding]:undefined
 const encoded=JSON.stringify(field.value),desired=JSON.stringify(hostValue)
 useEffect(()=>{if(props.binding&&encoded!==desired)field.setValue(hostValue)},[props.binding,encoded,desired,hostValue,field])
 const queryEncoded=JSON.stringify(props.query)
 const services=useMemo(()=>{
  const validated=WorkerResponseSchema.safeParse({kind:'result',id:'view',result:props.query})
  return {...host,bridge:{...host.bridge,query:async(input:Parameters<typeof host.bridge.query>[0],signal:AbortSignal)=>{
   if(generatedQuery&&scene)return scene.execute(generatedQuery.queryId,signal,name)
   if(validated.success&&validated.data.kind==='result')return runBoundQueryResult(validated.data.result,props.artifactRef,signal)
   if(props.query!==undefined&&props.query!==null)throw new Error('GENERATED_QUERY_PENDING')
   return host.bridge.query(input,signal)
  }},dispatch:(command:Parameters<typeof host.state.dispatch>[0])=>{
   const result=(host.dispatch??host.state.dispatch)(command)
   if(result.status==='applied'&&props.binding)field.setValue(host.state.get(command.artifactId)[props.binding])
   return result
  }}
 },[host,queryEncoded,props.binding,field,state.revision,props.artifactRef,generatedQuery?.queryId,scene?.execute])
 const {children,value,binding,query,action,...common}=props
 const scalar=Object.fromEntries(Object.entries(common).filter(([,value])=>value!==null&&value!==undefined))
 const normalized=name==='Callout'&&typeof scalar.title==='string'&&scalar.title.length>160?{...scalar,title:undefined,body:scalar.body??scalar.title}:scalar
 const checked=bPropsSchema.parse(normalized)
 return <TravelProvider services={services}><div onClick={action?()=>trigger(props.title??name,undefined,parseAction(action)):undefined}><CatalogNode kind={name} {...checked}>{renderNode(children)}</CatalogNode></div></TravelProvider>
}
export const bLibrary=createLibrary({root:'TravelSurface',components:catalogDescriptors.map(d=>defineComponent({name:d.name,description:d.description,props:bComponentPropsSchema(d.name),component:input=><BoundNode name={d.name} {...input}/>}))})
