import { validationReason } from './validation-reason';
export async function withOneRepair<T>(options:{prompt:string;signal:AbortSignal;run:(prompt:string,attempt:number)=>Promise<T>;validate:(value:T)=>void;failed?:(attempt:number,error:unknown)=>void}):Promise<T>{
 let feedback='';
 for(let attempt=0;attempt<2;attempt++){
  if(options.signal.aborted)throw new Error('Generation cancelled');
  try{const value=await options.run(attempt===0?options.prompt:options.prompt+'\nRepair the previous invalid decision once. Use only the registered grammar, schemas and existing references. Do not include the invalid source. Return text only if no valid scene is possible. Validation feedback: '+feedback,attempt);options.validate(value);return value;}
  catch(error){feedback=validationReason(error);options.failed?.(attempt,error);if(options.signal.aborted||attempt===1)throw error;}
 }
 throw new Error('Repair budget exhausted');
}
