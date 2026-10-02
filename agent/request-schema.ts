import { z } from 'zod';
import { EditArtifactInputSchema,CoverageRequestSchema,ArtifactIdSchema,DatasetIdSchema,FareIdSchema,FareFieldSchema,DatasetManifestSchema,BoundedFareFactSchema,parseAgentContext, type AgentContextEnvelope } from '../src/generative/contracts';
import { validatePresentTree } from '../src/generative/variants/a/tree';
import { validateReactiveProgram } from '../src/generative/variants/b/query/validate-program';
import { assertNoBulkData } from '../src/generative/contracts/privacy';
export const TOOL_NAMES=['load_fares','summarize_fares','get_top_fares','get_fare','get_route','find_carriers','present','compose_reactive_scene','edit_artifact','create_artifact'] as const;
const ToolSchema=z.strictObject({description:z.string().max(3000).optional(),parameters:z.record(z.string(),z.unknown()),providerOptions:z.record(z.string(),z.unknown()).optional()});
const PartSchema=z.object({type:z.string().max(80),text:z.string().max(5000).optional(),state:z.string().max(40).optional(),toolCallId:z.string().max(128).optional(),toolName:z.string().max(80).optional(),input:z.unknown().optional(),output:z.unknown().optional(),errorText:z.string().max(200).optional()});
const MessageSchema=z.object({id:z.string().min(1).max(128),role:z.enum(['user','assistant','system']),parts:z.array(PartSchema).max(40)});
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
   if(part.type.startsWith('tool-')||part.type==='dynamic-tool'){
    const name=part.type==='dynamic-tool'?part.toolName:part.type.slice(5);
    if(!name||!TOOL_NAMES.some(tool=>tool===name)||!part.toolCallId)throw new Error('Invalid tool identity');
    if(part.input!==undefined && part.state!=='input-streaming')parseToolInput(name,part.input);
    if(part.output!==undefined)parseToolOutput(name,part.output);
   }
  }
 }
 if(!request.messages.some(message=>message.role==='user'))throw new Error('Missing visible user turn');
 if(JSON.stringify(request.messages).length>40_000)throw new Error('History exceeds byte budget');
 const messages=request.messages.map(message=>({...message,parts:message.parts.filter(part=>part.state!=='input-streaming')}));
 return {...request,messages,currentContext:context};
}

const id=z.string().min(1).max(96);
const revision=z.number().int().nonnegative();
const ErrorOutput=z.strictObject({status:z.literal('error'),code:z.literal('LOCAL_TOOL_FAILED')});
export function parseToolOutput(name:string,input:unknown):unknown {
 if(ErrorOutput.safeParse(input).success)return ErrorOutput.parse(input);
 if(name==='load_fares')return DatasetManifestSchema.parse(input);
 if(name==='get_fare')return BoundedFareFactSchema.parse(input);
 if(name==='get_top_fares')return z.strictObject({datasetId:id,revision,facts:z.array(BoundedFareFactSchema).max(5)}).parse(input);
 if(name==='summarize_fares')return z.strictObject({datasetId:id,revision,groups:z.array(z.strictObject({label:z.string().max(160),count:z.number().int().nonnegative()})).max(30),truncated:z.boolean()}).parse(input);
 if(name==='get_route')return z.strictObject({datasetId:id,originIds:z.array(id).max(8),destinationIds:z.array(id).max(8),modes:z.array(z.enum(['train','bus','flight','ferry'])).max(4)}).parse(input);
 if(name==='find_carriers')return z.strictObject({datasetId:id,carrierIds:z.array(id).max(20),truncated:z.boolean()}).parse(input);
 if(name==='present')return z.strictObject({}).parse(input);
 if(name==='compose_reactive_scene')return z.strictObject({artifactId:id,programRevision:revision,status:z.enum(['ready','accepted','error'])}).parse(input);
 if(name==='edit_artifact')return z.strictObject({artifactId:id,revision,status:z.enum(['applied','stale'])}).parse(input);
 if(name==='create_artifact')return z.strictObject({artifactId:id,revision}).parse(input);
 throw new Error('Unregistered tool output');
}

export function parseToolInput(name:string,input:unknown):unknown {
 assertNoBulkData(input);
 if(name==='load_fares')return z.strictObject({coverage:CoverageRequestSchema,artifactRef:ArtifactIdSchema.optional()}).parse(input);
 if(name==='summarize_fares')return z.strictObject({datasetRef:DatasetIdSchema,groupBy:FareFieldSchema}).parse(input);
 if(name==='get_top_fares')return z.strictObject({datasetRef:DatasetIdSchema,objective:z.enum(['cheapest','fastest'])}).parse(input);
 if(name==='get_fare')return z.strictObject({fareId:FareIdSchema}).parse(input);
 if(name==='get_route'||name==='find_carriers')return z.strictObject({datasetRef:DatasetIdSchema}).parse(input);
 if(name==='edit_artifact')return EditArtifactInputSchema.parse(input);
 if(name==='create_artifact')return z.strictObject({}).parse(input);
 if(name==='present')return validatePresentTree(input);
 if(name==='compose_reactive_scene'){const parsed=z.strictObject({program:z.string().max(60000),artifactRef:ArtifactIdSchema,programRevision:z.number().int().nonnegative()}).parse(input);validateReactiveProgram(parsed.program,{complete:true});return parsed;}
 throw new Error('Unregistered tool input');
}
