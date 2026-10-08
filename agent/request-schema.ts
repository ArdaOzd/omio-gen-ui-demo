import { z } from 'zod';
import { HISTORY_LIMITS } from '../src/generative/chat/history-limits';
import { EditArtifactInputSchema,parseAgentContext, type AgentContextEnvelope } from '../src/generative/contracts';
import { validatePresentTree } from '../src/generative/variants/a/tree';
import { assertNoBulkData } from '../src/generative/contracts/privacy';
import { InspectDisplayErrorSchema,InspectDisplayInputSchema,InspectDisplayOutputSchema } from '../src/generative/contracts/display-context';
export const TOOL_NAMES=['inspect_display','present','edit_artifact','create_artifact'] as const;
const ToolSchema=z.strictObject({description:z.string().max(30000).optional(),parameters:z.record(z.string(),z.unknown()),providerOptions:z.record(z.string(),z.unknown()).optional()});
const PartSchema=z.object({type:z.string().max(80),text:z.string().max(HISTORY_LIMITS.textCharacters).optional(),state:z.string().max(40).optional(),toolCallId:z.string().max(128).optional(),toolName:z.string().max(80).optional(),input:z.unknown().optional(),output:z.unknown().optional(),errorText:z.string().max(200).optional()});
const MessageSchema=z.object({id:z.string().min(1).max(128),role:z.enum(['user','assistant','system']),parts:z.array(PartSchema).max(HISTORY_LIMITS.parts)});
const RequestSchema=z.strictObject({id:z.string().max(128),messages:z.array(MessageSchema).max(HISTORY_LIMITS.messages),currentContext:z.unknown(),provider:z.enum(['codex','fixture']).optional(),tools:z.record(z.string(),ToolSchema).optional(),system:z.string().max(30000).optional(),trigger:z.string().optional(),messageId:z.string().optional(),metadata:z.unknown().optional(),callSettings:z.unknown().optional(),config:z.unknown().optional()});
export type ChatRequest=Omit<z.infer<typeof RequestSchema>,'currentContext'> & {currentContext:AgentContextEnvelope};
export function parseChatRequest(input:unknown):ChatRequest {
 assertNoBulkData(input);const request=RequestSchema.parse(input);
 const context=parseAgentContext(request.currentContext);
 const keys=Object.keys(request.tools??{});
 if(keys.some(key=>!TOOL_NAMES.some(name=>name===key)))throw new Error('Unregistered tool');
 if(JSON.stringify(request.tools??{}).length>60_000)throw new Error('Tool catalog exceeds budget');
 for(const message of request.messages){
  if(message.role==='system')throw new Error('User-authored system messages are forbidden');
  for(const part of message.parts){
   if(part.type==='file')throw new Error('Attachments are unsupported by this demo');
   if(part.type!=='text' && part.type!=='step-start' && !part.type.startsWith('tool-') && part.type!=='dynamic-tool')throw new Error('Unsupported message part');
   if(part.type==='text')z.string().max(HISTORY_LIMITS.textCharacters).parse(part.text);
   if(part.type.startsWith('tool-')||part.type==='dynamic-tool'){
    const name=part.type==='dynamic-tool'?part.toolName:part.type.slice(5);
    if(!name||!TOOL_NAMES.some(tool=>tool===name)||!part.toolCallId)throw new Error('Invalid tool identity');
    if(part.input!==undefined && part.state!=='input-streaming' && part.state!=='output-error')parseToolInput(name,part.input);
    if(part.output!==undefined)parseToolOutput(name,part.output);
   }
  }
 }
 if(!request.messages.some(message=>message.role==='user'))throw new Error('Missing visible user turn');
 if(JSON.stringify(request.messages).length>HISTORY_LIMITS.serializedCharacters)throw new Error('History exceeds byte budget');
 const messages=request.messages.map(message=>({...message,parts:message.parts.filter(part=>part.state!=='input-streaming' && part.state!=='output-error')}));
 return {...request,messages,currentContext:context};
}

const id=z.string().min(1).max(96);
const revision=z.number().int().nonnegative();
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ScopeOutputSchema=z.strictObject({datasetRef:id,resourceKey:id,legIndex:z.number().int().min(0).max(7),originId:id,destinationId:id,dateWindow:z.strictObject({from:date,to:date}),sourceVersion:id,totalAvailable:z.number().int().nonnegative(),complete:z.boolean()});
const ErrorOutput=z.strictObject({status:z.literal('error'),code:z.enum(['LOCAL_TOOL_FAILED','LOCAL_TOOL_CANCELLED'])});
export function parseToolOutput(name:string,input:unknown):unknown {
 if(ErrorOutput.safeParse(input).success)return ErrorOutput.parse(input);
 if(name==='inspect_display')return z.union([InspectDisplayOutputSchema,InspectDisplayErrorSchema]).parse(input);
 if(name==='present')return z.strictObject({}).parse(input);
 if(name==='edit_artifact')return z.strictObject({artifactId:id,revision,status:z.enum(['applied','stale']),scopes:z.array(ScopeOutputSchema).max(8).optional()}).parse(input);
 if(name==='create_artifact')return z.strictObject({artifactId:id,revision}).parse(input);
 throw new Error('Unregistered tool output');
}

export function parseToolInput(name:string,input:unknown):unknown {
 assertNoBulkData(input);
 if(name==='inspect_display')return InspectDisplayInputSchema.parse(input);
 if(name==='edit_artifact')return EditArtifactInputSchema.parse(input);
 if(name==='create_artifact')return z.strictObject({}).parse(input);
 if(name==='present')return validatePresentTree(input);
 throw new Error('Unregistered tool input');
}
