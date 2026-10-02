import { z } from 'zod';
import { parseAgentContext, type AgentContextEnvelope } from '../src/generative/contracts';
import { assertNoBulkData } from '../src/generative/contracts/privacy';
export const TOOL_NAMES=['load_fares','summarize_fares','get_top_fares','get_fare','get_route','find_carriers','present','compose_reactive_scene'] as const;
const ToolSchema=z.strictObject({description:z.string().max(3000).optional(),parameters:z.record(z.string(),z.unknown()),providerOptions:z.record(z.string(),z.unknown()).optional()});
const PartSchema=z.looseObject({type:z.string().max(80)});
const MessageSchema=z.looseObject({id:z.string().min(1).max(128),role:z.enum(['user','assistant','system']),parts:z.array(PartSchema).max(40)});
const RequestSchema=z.strictObject({id:z.string().max(128),messages:z.array(MessageSchema).max(60),currentContext:z.unknown(),variant:z.enum(['a','b']),provider:z.enum(['codex','fixture']).optional(),tools:z.record(z.string(),ToolSchema).optional(),system:z.string().max(30000).optional(),trigger:z.string().optional(),messageId:z.string().optional(),metadata:z.unknown().optional(),callSettings:z.unknown().optional(),config:z.unknown().optional()});
export type ChatRequest=Omit<z.infer<typeof RequestSchema>,'currentContext'> & {currentContext:AgentContextEnvelope};
export function parseChatRequest(input:unknown):ChatRequest {
 assertNoBulkData(input);const request=RequestSchema.parse(input);
 const context=parseAgentContext(request.currentContext);
 const keys=Object.keys(request.tools??{});
 if(keys.some(key=>!TOOL_NAMES.some(name=>name===key)))throw new Error('Unregistered tool');
 if(keys.includes(request.variant==='a'?'compose_reactive_scene':'present'))throw new Error('Wrong scene variant');
 if(JSON.stringify(request.tools??{}).length>60_000)throw new Error('Tool catalog exceeds budget');
 for(const message of request.messages){
  if(message.role==='system')throw new Error('User-authored system messages are forbidden');
  for(const part of message.parts){
   if(part.type==='file')throw new Error('Attachments are unsupported by this demo');
   if(part.type!=='text' && part.type!=='step-start' && !part.type.startsWith('tool-') && part.type!=='dynamic-tool')throw new Error('Unsupported message part');
   if(part.type==='text')z.string().max(5000).parse(part.text);
  }
 }
 if(!request.messages.some(message=>message.role==='user'))throw new Error('Missing visible user turn');
 return {...request,currentContext:context};
}
