import type { ServerResponse } from 'node:http';
import { createUIMessageStream, pipeUIMessageStreamToResponse } from 'ai';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { catalogDescriptors,catalogHash,catalogVersion } from '../src/generative/catalog/generated/catalog';
import { assertNoBulkData } from '../src/generative/contracts/privacy';
import { codexDecision, type Decision } from './codex-provider';
import { parseToolInput } from './request-schema';
import type { ChatRequest } from './request-schema';
import { validatePresentPrefix } from './present-prefix';
import { loadLocationCatalog } from './location-catalog';
import { aPrompt } from '../src/generative/variants/a/prompt';
import { validatePresentTree } from '../src/generative/variants/a/tree';
import { withOneRepair } from './repair';
import { acceptTurn,spendTool } from './turn-budget';
export async function handleChat(request:ChatRequest,response:ServerResponse,signal:AbortSignal):Promise<void>{
 const key=acceptTurn(request);const tools=request.tools??{};
 const locations=await loadLocationCatalog(request.messages);
 const prompt=JSON.stringify({locations,locationPolicy:'Coverage originIds/destinationIds use these actual location IDs. Translate natural city names to their IDs; do not invent dataset refs. Load coverage before composing a view.',variant:request.variant,catalogVersion,catalogHash,components:catalogDescriptors,policy:'Browser owns rows. Only supplied scalar refs and bounded summaries can enter tools. Local edits do not need model requests. Native present uses $type plus scalar props and children. B uses valid OpenUI v0.5 program with registered components.',frontendInstructions:(request.variant==='a'?aPrompt+'\n':'')+(request.system??''),tools,context:request.currentContext,history:request.messages.slice(-20)});
 const stream=createUIMessageStream({originalMessages:request.messages.map(({id,role})=>({id,role,parts:[]})),execute:async({writer})=>{
  writer.write({type:'start'});writer.write({type:'start-step'});
  let callId=randomUUID(),attempt=0,currentTool='none';let toolStarted=false;let toolPrefix='';const textStarted=new Set<string>();
  const delta=(field:'intro'|'toolInput'|'outro',value:string,toolName:string)=>{
   currentTool=toolName;
   if(field==='toolInput'){
    if(toolName==='none' || !Object.hasOwn(tools,toolName))return;
    toolPrefix+=value;if(toolName==='present')validatePresentPrefix(toolPrefix,{artifactIds:new Set(request.currentContext.artifacts.map(a=>a.artifactId)),datasetIds:new Set(request.currentContext.datasets.map(d=>d.datasetId))});
    if(!toolStarted){writer.write({type:'tool-input-start',toolCallId:callId,toolName});toolStarted=true;}
    writer.write({type:'tool-input-delta',toolCallId:callId,inputTextDelta:value});return;
   }
   const id=`${attempt}-${field}`;if(!textStarted.has(id)){writer.write({type:'text-start',id});textStarted.add(id);}
   writer.write({type:'text-delta',id,delta:value});
  };
  let decision:Decision;
  if(request.provider==='fixture'){
   decision={intro:'Fixture response. This deterministic message is not a live model result.',toolName:'none',toolInput:'{}',outro:''};delta('intro',decision.intro,'none');
  }else decision=await withOneRepair({prompt,signal,run:async(repairPrompt,index)=>{attempt=index;callId=randomUUID();toolStarted=false;toolPrefix='';return codexDecision({prompt:repairPrompt,toolNames:Object.keys(tools),signal,onDelta:delta});},validate:value=>{if(value.toolName==='none')return;const tool=tools[value.toolName];if(!tool)throw new Error('Unregistered tool');const input=parseToolInput(value.toolName,JSON.parse(value.toolInput));z.fromJSONSchema(tool.parameters).parse(input);if(value.toolName==='present')validatePresentTree(input,{artifactIds:new Set(request.currentContext.artifacts.map(a=>a.artifactId)),datasetIds:new Set(request.currentContext.datasets.map(d=>d.datasetId))});},failed:()=>{for(const id of textStarted)writer.write({type:'text-end',id});textStarted.clear();if(toolStarted)writer.write({type:'tool-input-error',toolCallId:callId,toolName:currentTool,input:{},errorText:'This scene could not be completed. One bounded repair is allowed.'});}});
  for(const field of textStarted)writer.write({type:'text-end',id:field});
  if(decision.toolName!=='none'){
   const tool=tools[decision.toolName];if(!tool)throw new Error('Model selected an unregistered tool');
   const input:unknown=parseToolInput(decision.toolName,JSON.parse(decision.toolInput));assertNoBulkData(input);
   z.fromJSONSchema(tool.parameters).parse(input);
   if(decision.toolName==='present')validatePresentTree(input,{artifactIds:new Set(request.currentContext.artifacts.map(a=>a.artifactId)),datasetIds:new Set(request.currentContext.datasets.map(d=>d.datasetId))});
   spendTool(key,decision.toolName);
   writer.write({type:'tool-input-available',toolCallId:callId,toolName:decision.toolName,input});
  }
  writer.write({type:'finish-step'});writer.write({type:'finish',finishReason:decision.toolName==='none'?'stop':'tool-calls'});
 },onError:()=> 'The response could not be completed. Retry with the current artifact state.'});
 await pipeUIMessageStreamToResponse({response,stream});
}
