import { createHash } from 'node:crypto';
import { LIMITS,type ArtifactId,type UIStateRevision } from '../src/generative/contracts';
import type { ChatRequest } from './request-schema';
type SceneCompletion={artifactRef:ArtifactId;uiStateRevision:UIStateRevision;toolName:'present'|'compose_reactive_scene'};
const ledger=new Map<string,{calls:number;facts:number;expires:number;scenes:Map<string,SceneCompletion>}>();
export function acceptTurn(request:ChatRequest):string {
 const user=[...request.messages].reverse().find(message=>message.role==='user');
 if(!user)throw new Error('Missing user turn');
 const key=createHash('sha256').update(request.id+':'+user.id).digest('hex');
 for(const [id,entry]of ledger)if(entry.expires<Date.now())ledger.delete(id);
 if(ledger.size>1000)throw new Error('Too many active turns');
 const userIndex=request.messages.indexOf(user);
 const calls=new Set<string>();let facts=0;
 for(const message of request.messages.slice(userIndex+1)){for(const part of message.parts){
  if((part.type.startsWith('tool-')||part.type==='dynamic-tool')&&part.toolCallId&&!calls.has(part.toolCallId)){
   calls.add(part.toolCallId);const name=part.type==='dynamic-tool'?part.toolName:part.type.slice(5);facts+=name==='get_top_fares'?5:name==='get_fare'?1:0;
  }
 }}
 if(calls.size>LIMITS.toolCalls||facts>LIMITS.factBudget)throw new Error('History exceeds visible-turn tool budget');
 const existing=ledger.get(key);
 ledger.set(key,{calls:Math.max(existing?.calls??0,calls.size),facts:Math.max(existing?.facts??0,facts),expires:Date.now()+30*60_000,scenes:existing?.scenes??new Map()});
 return key;
}
export function spendTool(key:string,name:string):void {
 const entry=ledger.get(key);if(!entry)throw new Error('Unknown turn');
 const facts=name==='get_top_fares'?5:name==='get_fare'?1:0;
 if(entry.calls+1>LIMITS.toolCalls || entry.facts+facts>LIMITS.factBudget)throw new Error('Visible-turn tool budget exhausted');
 entry.calls++;entry.facts+=facts;
}

export function recordScene(key:string,callId:string,toolName:string,artifactRef:ArtifactId,uiStateRevision:UIStateRevision):void{
 if(toolName!=='present'&&toolName!=='compose_reactive_scene')return;
 const entry=ledger.get(key);if(!entry)throw new Error('Unknown turn');
 entry.scenes.set(callId,{artifactRef,uiStateRevision,toolName});
}
export function getAcceptedScenes(key:string,request:ChatRequest):SceneCompletion[]{
 if(request.trigger==='regenerate-message')return [];
 let userIndex=request.messages.length-1;while(userIndex>=0&&request.messages[userIndex]?.role!=='user')userIndex--;const result=new Map<string,SceneCompletion>();
 for(const message of request.messages.slice(userIndex+1))for(const part of message.parts){
  const name=part.type==='dynamic-tool'?part.toolName:part.type.slice(5);
  if((name!=='present'&&name!=='compose_reactive_scene')||part.state!=='output-available'||!part.toolCallId)continue;
  const input=part.input,output=part.output;if(typeof input!=='object'||input===null||!('artifactRef' in input)||typeof output!=='object'||output===null)continue;
  const artifact=request.currentContext.artifacts.find(artifact=>artifact.artifactId===input.artifactRef);if(!artifact)continue;
  if(name==='present'?Object.keys(output).length!==0:!('status' in output)||output.status!=='accepted'||!('artifactId' in output)||output.artifactId!==artifact.artifactId||!('programRevision' in input)||!('programRevision' in output)||input.programRevision!==output.programRevision)continue;
  const issued=ledger.get(key)?.scenes.get(part.toolCallId);
  const revision=issued?.uiStateRevision??(name==='compose_reactive_scene'&&'programRevision' in input&&'programRevision' in output&&input.programRevision===output.programRevision?output.programRevision:undefined);
  if(revision!==artifact.revision||issued&&(issued.artifactRef!==artifact.artifactId||issued.toolName!==name))continue;
  result.set(artifact.artifactId,{artifactRef:artifact.artifactId,uiStateRevision:artifact.revision,toolName:name});
 }
 return [...result.values()];
}
