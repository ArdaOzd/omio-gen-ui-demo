import { useEffect,useRef } from 'react'
import { z } from 'zod'
import { useToolArgsStatus,type Toolkit } from '@assistant-ui/react'
import { ArtifactIdSchema } from '../../contracts'
import { bSchemaLibrary } from './query/schema'
import { validateReactiveProgram } from './query/validate-program'
import { ReactiveScene } from './renderer'
export const ComposeSceneInputSchema=z.strictObject({program:z.string().min(1).max(60000),artifactRef:ArtifactIdSchema,programRevision:z.number().int().nonnegative()})
export const bInstructions=bSchemaLibrary.prompt({tools:['local_query','patch_artifact_state'],bindings:true,toolCalls:true})+'\nUse Query("local_query", QueryIR), Mutation("patch_artifact_state", typedUICommandPatch). No refresh intervals. Bind controls using canonical positional six props then children,value,binding,query,action. Object state is allowed only for validated semantic bindings. Other state is primitive and bounded. Query result props refer to Query declarations; never literal rows.'
export const bToolkit={compose_reactive_scene:{type:'frontend',description:bInstructions,parameters:ComposeSceneInputSchema,render:function SceneTool({args,status,addResult,result}){
 const completed=useRef(false),{propStatus}=useToolArgsStatus(),streaming=propStatus.program==='streaming'
 useEffect(()=>{if(streaming||completed.current||result)return;const parsed=ComposeSceneInputSchema.safeParse(args);if(!parsed.success)return;completed.current=true
  try{validateReactiveProgram(parsed.data.program);addResult({artifactId:parsed.data.artifactRef,programRevision:parsed.data.programRevision,status:'accepted'})}catch{addResult({artifactId:parsed.data.artifactRef,programRevision:parsed.data.programRevision,status:'error'})}
 },[args,streaming,result,addResult])
 if(typeof args.program!=='string'||typeof args.artifactRef!=='string')return <div role="status">Preparing reactive view…</div>
 return <ReactiveScene program={args.program} artifactRef={args.artifactRef} isStreaming={streaming}/>
}}} satisfies Toolkit
export default bToolkit
