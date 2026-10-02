import { useEffect,useRef } from 'react'
import { z } from 'zod'
import { useToolArgsStatus,type Toolkit } from '@assistant-ui/react'
import { ArtifactIdSchema,ArtifactUIStateSchema,QueryIRSchema,UICommandPatchSchema } from '../../contracts'
import { bSchemaLibrary } from './query/schema'
import { validateReactiveProgram } from './query/validate-program'
import { ReactiveScene } from './renderer'
export const ComposeSceneInputSchema=z.strictObject({artifactRef:ArtifactIdSchema,programRevision:z.number().int().nonnegative(),program:z.string().min(1).max(60000)})
const semanticSchema=ArtifactUIStateSchema.pick({filters:true,dates:true,sort:true,stays:true,modesByLeg:true,selectedFareIds:true})
export const bInstructions=bSchemaLibrary.prompt({tools:['local_query','patch_artifact_state'],bindings:true,toolCalls:true})+'\nUse Query("local_query", QueryIR), Mutation("patch_artifact_state", typedUICommandPatch). No refresh intervals. Bind controls using canonical positional six props then children,value,binding,query,action. Object state is allowed only for validated semantic bindings. Other state is primitive and bounded. Query result props refer to Query declarations; never literal rows. Each editable semantic variable must have at least one component binding to its host field; ModeChips binds the entire filters object, not a scalar mode. Optional positional arguments use null. Layout children contain references or conditionals. RetryAction can run an ordered Action as its last argument. Use latest context values as defaults. FareCards, FarePicker, Timeline and Plot queries project all FareRow fields so shared widgets can display them.'+'\nHost semantic fields: '+JSON.stringify(z.toJSONSchema(semanticSchema))+'\nlocal_query input: '+JSON.stringify(z.toJSONSchema(QueryIRSchema))+'\npatch_artifact_state input: '+JSON.stringify(z.toJSONSchema(UICommandPatchSchema))
export const bToolkit={compose_reactive_scene:{type:'frontend',description:bInstructions,parameters:ComposeSceneInputSchema,execute:async(input:unknown)=>{const parsed=ComposeSceneInputSchema.parse(input);try{validateReactiveProgram(parsed.program);return{artifactId:parsed.artifactRef,programRevision:parsed.programRevision,status:'accepted'}}catch{return{artifactId:parsed.artifactRef,programRevision:parsed.programRevision,status:'error'}}},render:function SceneTool({args,status,addResult,result}){
 const completed=useRef(false),{propStatus}=useToolArgsStatus(),streaming=propStatus.program==='streaming'
 useEffect(()=>{if(streaming||completed.current||result)return;const parsed=ComposeSceneInputSchema.safeParse(args);if(!parsed.success)return;completed.current=true
  try{validateReactiveProgram(parsed.data.program);addResult({artifactId:parsed.data.artifactRef,programRevision:parsed.data.programRevision,status:'accepted'})}catch{addResult({artifactId:parsed.data.artifactRef,programRevision:parsed.data.programRevision,status:'error'})}
 },[args,streaming,result,addResult])
 if(typeof args.program!=='string'||typeof args.artifactRef!=='string')return <div role="status">Preparing reactive view…</div>
 return <ReactiveScene program={args.program} artifactRef={args.artifactRef} isStreaming={streaming}/>
}}} satisfies Toolkit
export default bToolkit
