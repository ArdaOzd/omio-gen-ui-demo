import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { InvalidModelOutputError, MODEL_REQUEST_TIMEOUT_MS } from './repair';
export const CODEX_MODEL = 'gpt-6.1-sol';
export const CODEX_REASONING_EFFORT = 'high';
export const DecisionSchema = z.strictObject({intro:z.string().max(4000),toolName:z.string().max(80),toolInput:z.string().max(24000),outro:z.string().max(4000)});
export type Decision = z.infer<typeof DecisionSchema>;
export type DecisionDelta = (field:'intro'|'toolInput'|'outro', delta:string, toolName:string) => void;
export const CODEX_DEVELOPER_INSTRUCTIONS='One decision per response. Output intro, toolName, toolInput, outro in that order. toolInput is serialized JSON conforming to the chosen frontend tool schema. Use none and {} for text-only replies and to finalize fulfilled tool-backed requests after successful tool acknowledgments. An accepted scene already fulfills presentation for that artifact at that UI revision; do not reauthor it merely because the original user request appears again in continuation history. Continue tools only for unmet requested work, such as a different requested artifact, a new UI revision, missing coverage, or a real tool error requiring repair. Once the requested work is fulfilled, finish with a concise text reply and none. On tool continuations, do not repeat intro or outro prose already emitted in the current visible turn; add only new information or a brief completion. A new explicit user request may repeat earlier wording. Do not invent refs, fare data, component names or tools. Never emit rows, SQL, HTML, CSS, JavaScript or URLs.';
const binary = process.env.CODEX_BINARY ?? '/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex';
function readString(source:string,field:string):string|undefined {
 const match = new RegExp(`"${field}"\\s*:\\s*"`).exec(source);
 if(!match) return undefined;
 let value=''; let escape=false;
 for(let i=match.index+match[0].length;i<source.length;i++) {
  const char=source[i];
  if(!escape && char==='"') break;
  if(!escape && char==='\\') { escape=true;value+=char;continue; }
  value+=char; escape=false;
 }
 while(value.endsWith('\\'))value=value.slice(0,-1);
 for(let trim=0;trim<7 && value.length>=trim;trim++) {
  try { const decoded:unknown=JSON.parse(`"${value.slice(0,value.length-trim)}"`); if(typeof decoded==='string')return decoded; } catch { /* incomplete escape remains buffered */ }
 }
 return undefined;
}
export async function codexDecision(options:{prompt:string;toolNames:string[];signal:AbortSignal;onDelta:DecisionDelta}):Promise<Decision> {
 if(options.signal.aborted)throw new Error('Generation cancelled');
 const cwd=await mkdtemp(join(tmpdir(),'omio-model-only-'));
 try{
 if(options.signal.aborted)throw new Error('Generation cancelled');
 const config=await readFile(join(homedir(),'.codex/config.toml'),'utf8').catch(()=> '');
 const names=[...config.matchAll(/^\[mcp_servers\.([^\].]+)\]/gm)].map(match=>match[1]);
 const args=['app-server','--stdio','-c','approval_policy="never"','-c','web_search="disabled"','-c','project_doc_max_bytes=0','-c','model_provider="openai"','-c','features.code_mode=false'];
 for(const feature of ['shell_tool','code_mode_host','plugins','apps','multi_agent','hooks'])args.push('--disable',feature);
 for(const name of names)args.push('-c',`mcp_servers.${name}.enabled=false`);
 if(options.signal.aborted)throw new Error('Generation cancelled');
 const child=spawn(binary,args,{cwd,env:{PATH:process.env.PATH,HOME:homedir(),TMPDIR:tmpdir()},stdio:['pipe','pipe','pipe']});
 let terminalError:Error|undefined;
 let seq=0,buffer='',output='',name='none';const sent={intro:'',toolInput:'',outro:''};
 const pending=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void}>();
 let complete:(value:Decision)=>void=()=>{};let fail:(error:Error)=>void=()=>{};
 const done=new Promise<Decision>((resolve,reject)=>{complete=resolve;fail=(error)=>{if(terminalError)return;terminalError=error;for(const request of pending.values())request.reject(error);pending.clear();reject(error)};});
 done.catch(()=>{});
 const rpc=(method:string,params:unknown)=>new Promise<unknown>((resolve,reject)=>{if(terminalError){reject(terminalError);return;}if(options.signal.aborted){reject(new Error('Generation cancelled'));return;}const id=++seq;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,method,params})+'\n')});
 const stop=()=>{ child.kill('SIGTERM');fail(new Error('Generation cancelled')); };
 options.signal.addEventListener('abort',stop,{once:true});
 const timeout=setTimeout(()=>{child.kill('SIGTERM');fail(new Error('Codex generation timed out'));},MODEL_REQUEST_TIMEOUT_MS);
 child.stderr.on('data',()=>{});
 child.on('error',()=>fail(new Error('Signed-in Codex runtime unavailable')));
 child.on('exit',code=>{if(code && code!==0)fail(new Error('Signed-in Codex runtime failed'))});
 child.stdout.on('data',chunk=>{
  if(terminalError || options.signal.aborted)return;
  buffer+=String(chunk);let newline:number;
  while((newline=buffer.indexOf('\n'))>=0){
   if(terminalError || options.signal.aborted)break;
   const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);
   let raw:unknown;try{raw=JSON.parse(line)}catch{continue}
   const message=z.object({id:z.number().optional(),method:z.string().optional(),params:z.unknown().optional(),result:z.unknown().optional(),error:z.unknown().optional()}).safeParse(raw);
   if(!message.success)continue;
   if(message.data.id!==undefined){const request=pending.get(message.data.id);pending.delete(message.data.id);if(message.data.error)request?.reject(new Error('Codex protocol request rejected'));else request?.resolve(message.data.result);continue;}
   if(message.data.method==='item/agentMessage/delta'){
    const delta=z.object({delta:z.string()}).safeParse(message.data.params);if(!delta.success)continue;
    output+=delta.data.delta;if(output.length>40_000){fail(new InvalidModelOutputError('Model decision exceeds byte budget'));child.kill();continue;}
    name=readString(output,'toolName')??name;
    for(const field of ['intro','toolInput','outro'] satisfies Array<keyof typeof sent>){const value=readString(output,field);if(value!==undefined && value.startsWith(sent[field]) && value.length>sent[field].length){const added=value.slice(sent[field].length);sent[field]=value;try{options.onDelta(field,added,name)}catch{fail(new InvalidModelOutputError('Model emitted an invalid partial scene'));child.kill('SIGTERM');break;}}}
   }
   if(message.data.method==='turn/completed'){
    try{const decision=DecisionSchema.parse(JSON.parse(output));if(options.signal.aborted)stop();else complete(decision)}catch{fail(new InvalidModelOutputError('Model returned an invalid decision'))}
   }
   if(message.data.method?.includes('requestApproval') || message.data.method?.includes('tool/call')){fail(new InvalidModelOutputError('Model attempted an unregistered capability'));child.kill();}
  }
 });
 try{
  if(options.signal.aborted)stop();
  await rpc('initialize',{clientInfo:{name:'omio-generative-model',version:'1.0.0'},capabilities:{experimentalApi:true}});
  if(options.signal.aborted)throw new Error('Generation cancelled');
  if(terminalError)throw terminalError;
  child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');
  const started=z.object({thread:z.object({id:z.string()})}).parse(await rpc('thread/start',{model:CODEX_MODEL,modelProvider:'openai',cwd,sandbox:'read-only',approvalPolicy:'never',ephemeral:true,baseInstructions:'You are a travel UI model. Use only the supplied host tool names and compact context. No shell, files, web, plugins, apps, MCP, network, or background work. Return the strict decision JSON. The host executes every tool.',developerInstructions:CODEX_DEVELOPER_INSTRUCTIONS}));
  await rpc('turn/start',{threadId:started.thread.id,input:[{type:'text',text:options.prompt}],effort:CODEX_REASONING_EFFORT,approvalPolicy:'never',sandboxPolicy:{type:'readOnly',networkAccess:false},outputSchema:{type:'object',additionalProperties:false,required:['intro','toolName','toolInput','outro'],properties:{intro:{type:'string'},toolName:{type:'string',enum:['none',...options.toolNames]},toolInput:{type:'string'},outro:{type:'string'}}}});
  const decision=await done;
  if(options.signal.aborted)throw new Error('Generation cancelled');
  return decision;
 }finally{ clearTimeout(timeout);options.signal.removeEventListener('abort',stop);child.kill('SIGTERM');}
 }finally{await rm(cwd,{recursive:true,force:true});}
}
