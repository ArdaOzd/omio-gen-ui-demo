import type { ServerResponse } from 'node:http';
import { createUIMessageStream, pipeUIMessageStreamToResponse } from 'ai';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { catalogDescriptors,catalogHash,catalogVersion } from '../src/generative/catalog/generated/catalog';
import { assertNoBulkData } from '../src/generative/contracts/privacy';
import { codexDecision, type Decision } from './codex-provider';
import { parseToolInput } from './request-schema';
import type { ChatRequest } from './request-schema';
import { aPrompt } from '../src/generative/variants/a/prompt';
import { validatePresentTree } from '../src/generative/variants/a/tree';
import { acceptTurn,spendTool } from './turn-budget';
export async function handleChat(request:ChatRequest,response:ServerResponse,signal:AbortSignal):Promise<void>{
 const key=acceptTurn(request);const tools=request.tools??{};
 const prompt=JSON.stringify({variant:request.variant,catalogVersion,catalogHash,components:catalogDescriptors,policy:'Browser owns rows. Only supplied scalar refs and bounded summaries can enter tools. Local edits do not need model requests. Native present uses $type plus scalar props and children. B uses valid OpenUI v0.5 program with registered components.',frontendInstructions:(request.variant==='a'?aPrompt+'\n':'')+(request.system??''),tools,context:request.currentContext,history:request.messages.slice(-20)});
 const stream=createUIMessageStream({execute:async({writer})=>{
  writer.write({type:'start',messageId:randomUUID()});writer.write({type:'start-step'});
  const callId=randomUUID();let toolStarted=false;const textStarted=new Set<string>();
  const delta=(field:'intro'|'toolInput'|'outro',value:string,toolName:string)=>{
   if(field==='toolInput'){
    if(toolName==='none' || !Object.hasOwn(tools,toolName))return;
    if(!toolStarted){writer.write({type:'tool-input-start',toolCallId:callId,toolName});toolStarted=true;}
    writer.write({type:'tool-input-delta',toolCallId:callId,inputTextDelta:value});return;
   }
   if(!textStarted.has(field)){writer.write({type:'text-start',id:field});textStarted.add(field);}
   writer.write({type:'text-delta',id:field,delta:value});
  };
  let decision:Decision;
  if(request.provider==='fixture'){
   decision={intro:'Fixture response. This deterministic message is not a live model result.',toolName:'none',toolInput:'{}',outro:''};delta('intro',decision.intro,'none');
  }else decision=await codexDecision({prompt,toolNames:Object.keys(tools),signal,onDelta:delta});
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
