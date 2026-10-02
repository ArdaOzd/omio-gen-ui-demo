import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
export const CODEX_MODEL = 'gpt-6.1-sol';
export const DecisionSchema = z.strictObject({intro:z.string().max(4000),toolName:z.string().max(80),toolInput:z.string().max(24000),outro:z.string().max(4000)});
export type Decision = z.infer<typeof DecisionSchema>;
export type DecisionDelta = (field:'intro'|'toolInput'|'outro', delta:string, toolName:string) => void;
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
 const cwd=await mkdtemp(join(tmpdir(),'omio-model-only-'));
 const config=await readFile(join(homedir(),'.codex/config.toml'),'utf8').catch(()=> '');
 const names=[...config.matchAll(/^\[mcp_servers\.([^\].]+)\]/gm)].map(match=>match[1]);
 const args=['app-server','--stdio','-c','approval_policy="never"','-c','web_search="disabled"','-c','project_doc_max_bytes=0','-c','model_provider="openai"','-c','features.code_mode=false'];
 for(const feature of ['shell_tool','code_mode_host','plugins','apps','multi_agent','hooks'])args.push('--disable',feature);
 for(const name of names)args.push('-c',`mcp_servers.${name}.enabled=false`);
 const child=spawn(binary,args,{cwd,env:{PATH:process.env.PATH,HOME:homedir(),TMPDIR:tmpdir()},stdio:['pipe','pipe','pipe']});
 let seq=0,buffer='',output='',name='none';const sent={intro:'',toolInput:'',outro:''};
 const pending=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void}>();
 let complete:(value:Decision)=>void=()=>{};let fail:(error:Error)=>void=()=>{};
 const done=new Promise<Decision>((resolve,reject)=>{complete=resolve;fail=(error)=>{for(const request of pending.values())request.reject(error);pending.clear();reject(error)};});
 done.catch(()=>{});
 const rpc=(method:string,params:unknown)=>new Promise<unknown>((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,method,params})+'\n')});
 const stop=()=>{ child.kill('SIGTERM');fail(new Error('Generation cancelled')); };
 options.signal.addEventListener('abort',stop,{once:true});
 const timeout=setTimeout(()=>{child.kill('SIGTERM');fail(new Error('Codex generation timed out'));},120_000);
 child.stderr.on('data',()=>{});
 child.on('error',()=>fail(new Error('Signed-in Codex runtime unavailable')));
 child.on('exit',code=>{if(code && code!==0)fail(new Error('Signed-in Codex runtime failed'))});
 child.stdout.on('data',chunk=>{
  buffer+=String(chunk);let newline:number;
  while((newline=buffer.indexOf('\n'))>=0){
   const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);
   let raw:unknown;try{raw=JSON.parse(line)}catch{continue}
   const message=z.object({id:z.number().optional(),method:z.string().optional(),params:z.unknown().optional(),result:z.unknown().optional(),error:z.unknown().optional()}).safeParse(raw);
   if(!message.success)continue;
   if(message.data.id!==undefined){const request=pending.get(message.data.id);pending.delete(message.data.id);if(message.data.error)request?.reject(new Error('Codex protocol request rejected'));else request?.resolve(message.data.result);continue;}
   if(message.data.method==='item/agentMessage/delta'){
    const delta=z.object({delta:z.string()}).safeParse(message.data.params);if(!delta.success)continue;
    output+=delta.data.delta;if(output.length>40_000){fail(new Error('Model decision exceeds byte budget'));child.kill();continue;}
    name=readString(output,'toolName')??name;
    for(const field of ['intro','toolInput','outro'] satisfies Array<keyof typeof sent>){const value=readString(output,field);if(value!==undefined && value.startsWith(sent[field]) && value.length>sent[field].length){const added=value.slice(sent[field].length);sent[field]=value;options.onDelta(field,added,name);}}
   }
   if(message.data.method==='turn/completed'){
    try{complete(DecisionSchema.parse(JSON.parse(output)))}catch{fail(new Error('Model returned an invalid decision'))}
   }
   if(message.data.method?.includes('requestApproval') || message.data.method?.includes('tool/call')){fail(new Error('Model attempted an unregistered capability'));child.kill();}
  }
 });
 try{
  await rpc('initialize',{clientInfo:{name:'omio-generative-model',version:'1.0.0'},capabilities:{experimentalApi:true}});
  child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');
  const started=z.object({thread:z.object({id:z.string()})}).parse(await rpc('thread/start',{model:CODEX_MODEL,modelProvider:'openai',cwd,sandbox:'read-only',approvalPolicy:'never',ephemeral:true,baseInstructions:'You are a travel UI model. Use only the supplied host tool names and compact context. No shell, files, web, plugins, apps, MCP, network, or background work. Return the strict decision JSON. The host executes every tool.',developerInstructions:'One decision per response. Output intro, toolName, toolInput, outro in that order. toolInput is serialized JSON conforming to the chosen frontend tool schema. Use none and {} for text-only. Do not invent refs, fare data, component names or tools. Never emit rows, SQL, HTML, CSS, JavaScript or URLs.'}));
  await rpc('turn/start',{threadId:started.thread.id,input:[{type:'text',text:options.prompt}],effort:'high',approvalPolicy:'never',sandboxPolicy:{type:'readOnly',networkAccess:false},outputSchema:{type:'object',additionalProperties:false,required:['intro','toolName','toolInput','outro'],properties:{intro:{type:'string'},toolName:{type:'string',enum:['none',...options.toolNames]},toolInput:{type:'string'},outro:{type:'string'}}}});
  return await done;
 }finally{ clearTimeout(timeout);options.signal.removeEventListener('abort',stop);child.kill('SIGTERM');await rm(cwd,{recursive:true,force:true}); }
}
