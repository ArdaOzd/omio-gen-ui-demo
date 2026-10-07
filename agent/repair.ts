import { validationReason } from './validation-reason';

export const MODEL_REQUEST_TIMEOUT_MS = 120_000;
export class InvalidModelOutputError extends Error {
 constructor(message:string,cause?:unknown){super(message,{cause});this.name='InvalidModelOutputError'}
}
export type ModelAttemptObservation = {
 attempt:0|1;
 elapsedMs:number;
} & (
 {status:'start';reason:'initial'|'validation-repair'} |
 {status:'end';reason:'accepted'|'invalid-output'|'provider-error'|'timeout'|'cancelled'}
);

export async function withOneRepair<T>(options:{prompt:string;signal:AbortSignal;run:(prompt:string,attempt:number,signal:AbortSignal)=>Promise<T>;validate:(value:T)=>void;failed?:(attempt:number,error:unknown)=>void;onAttempt?:(event:ModelAttemptObservation)=>void}):Promise<T>{
 if(options.signal.aborted)throw new Error('Generation cancelled');
 const controller=new AbortController();
 const deadline=Date.now()+MODEL_REQUEST_TIMEOUT_MS;
 const cancel=()=>controller.abort(new Error('Generation cancelled'));
 options.signal.addEventListener('abort',cancel,{once:true});
 if(options.signal.aborted)cancel();
 const timeout=setTimeout(()=>controller.abort(new Error('Codex generation timed out')),MODEL_REQUEST_TIMEOUT_MS);
 const checkActive=()=>{
  if(!controller.signal.aborted && Date.now()>=deadline)controller.abort(new Error('Codex generation timed out'));
  if(controller.signal.aborted)throw controller.signal.reason;
 };
 let rejectAborted:(reason:unknown)=>void=()=>{};
 const aborted=new Promise<never>((_resolve,reject)=>{rejectAborted=reject;});
 const abort=()=>rejectAborted(controller.signal.reason);
 controller.signal.addEventListener('abort',abort,{once:true});
 // The request may be cancelled before a provider promise has been attached.
 aborted.catch(()=>{});
 if(controller.signal.aborted)abort();
 let feedback='';
 try{
  const attempts:readonly (0|1)[]=[0,1];
  for(const attempt of attempts){
   checkActive();
   const started=Date.now();
   const elapsed=()=>Math.min(MODEL_REQUEST_TIMEOUT_MS,Math.max(0,Date.now()-started));
   options.onAttempt?.({attempt,status:'start',reason:attempt===0?'initial':'validation-repair',elapsedMs:0});
   let validationFailed=false;
   let value:T;
   try{
    checkActive();
    const prompt=attempt===0?options.prompt:options.prompt+'\nRepair the previous invalid decision once. Use only the registered grammar, schemas and existing references. Do not include the invalid source. Return text only if no valid scene is possible. Validation feedback: '+feedback;
    value=await Promise.race([options.run(prompt,attempt,controller.signal),aborted]);
    checkActive();
    try{options.validate(value);}catch(error){validationFailed=true;throw error;}
    checkActive();
   }catch(error){
    const reason=options.signal.aborted?'cancelled':controller.signal.aborted?'timeout':validationFailed||error instanceof InvalidModelOutputError?'invalid-output':'provider-error';
    options.onAttempt?.({attempt,status:'end',reason,elapsedMs:elapsed()});
    options.failed?.(attempt,error);
    checkActive();
    if(attempt===1 || (!validationFailed && !(error instanceof InvalidModelOutputError)))throw error;
    feedback=validationReason(error);
    continue;
   }
   options.onAttempt?.({attempt,status:'end',reason:'accepted',elapsedMs:elapsed()});
   checkActive();
   return value;
  }
  throw new Error('Repair budget exhausted');
 }finally{
  clearTimeout(timeout);
  options.signal.removeEventListener('abort',cancel);
  controller.signal.removeEventListener('abort',abort);
 }
}
