import { createHash } from 'node:crypto';
import { LIMITS } from '../src/generative/contracts';
import type { ChatRequest } from './request-schema';
const ledger=new Map<string,{calls:number;facts:number;expires:number}>();
export function acceptTurn(request:ChatRequest):string {
 const user=[...request.messages].reverse().find(message=>message.role==='user');
 if(!user)throw new Error('Missing user turn');
 const key=createHash('sha256').update(request.id+':'+user.id).digest('hex');
 for(const [id,entry]of ledger)if(entry.expires<Date.now())ledger.delete(id);
 if(ledger.size>1000)throw new Error('Too many active turns');
 if(!ledger.has(key))ledger.set(key,{calls:0,facts:0,expires:Date.now()+30*60_000});
 return key;
}
export function spendTool(key:string,name:string):void {
 const entry=ledger.get(key);if(!entry)throw new Error('Unknown turn');
 const facts=name==='get_top_fares'?5:name==='get_fare'?1:0;
 if(entry.calls+1>LIMITS.toolCalls || entry.facts+facts>LIMITS.factBudget)throw new Error('Visible-turn tool budget exhausted');
 entry.calls++;entry.facts+=facts;
}
