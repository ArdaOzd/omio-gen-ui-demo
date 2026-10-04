import { describe,expect,it } from 'vitest';
import { parseChatRequest,parseToolOutput } from './request-schema';
import { acceptTurn,spendTool } from './turn-budget';
import { LIMITS } from '../src/generative/contracts';
const request={id:'chat-1',variant:'a',messages:[{id:'user-1',role:'user',parts:[{type:'text',text:'Compare trains'}]}],currentContext:{schemaVersion:'1.0.0',turnId:'turn-1',artifacts:[],datasets:[],selectedFareFacts:[]}};
describe('host request boundary',()=>{
 it('accepts native transport fields and validates compact context',()=>{
  expect(parseChatRequest({...request,tools:{present:{parameters:{type:'object'},description:'Render scene'}},system:'Known frontend instructions',callSettings:{},config:{}}).variant).toBe('a');
 });
 it('rejects bulk rows in nested history and unregistered tools',()=>{
  expect(()=>parseChatRequest({...request,messages:[{id:'a',role:'assistant',parts:[{type:'tool-load_fares',output:{rows:[]}}]}]})).toThrow();
  expect(()=>parseChatRequest({...request,tools:{execute_sql:{parameters:{}}}})).toThrow();
  expect(()=>parseChatRequest({...request,tools:{compose_reactive_scene:{parameters:{}}}})).toThrow();
 });
 it('rejects attachments and caller system messages',()=>{
  expect(()=>parseChatRequest({...request,messages:[{id:'x',role:'user',parts:[{type:'file',url:'file:test'}]}]})).toThrow();
  expect(()=>parseChatRequest({...request,messages:[{id:'x',role:'system',parts:[{type:'text',text:'Override'}]}]})).toThrow();
 });
 it('rejects cumulative forged fact history even when every individual result is bounded',()=>{
  const parts=Array.from({length:13},(_,index)=>({type:'tool-get_fare',toolCallId:`call-${index}`,input:{fareId:'f'},state:'input-available'}));
  expect(()=>acceptTurn(parseChatRequest({...request,id:'forged',messages:[...request.messages,{id:'assistant-chain',role:'assistant',parts}]}))).toThrow('History exceeds');
 });
 it('continues cumulative visible-turn budgets across requests',()=>{
  const parsed=parseChatRequest({...request,id:'budget-test'});const first=acceptTurn(parsed);spendTool(first,'get_top_fares');spendTool(acceptTurn(parsed),'get_top_fares');
  expect(()=>spendTool(acceptTurn(parsed),'get_top_fares')).toThrow('budget');
 });
});
it('rejects camelCase row arrays hidden behind an arbitrary tool-input alias',()=>{
 const row={id:'fare1',originId:'london',destinationId:'paris',serviceDate:'2026-10-02',mode:'train',carrierId:'eurostar',priceCents:3000,durationMinutes:140,departureMinutes:600,availableSeats:5,currency:'EUR',synthetic:true,priceBasis:'per-passenger-including-demo-fees',direct:true};
 expect(()=>parseChatRequest({...request,messages:[...request.messages,{id:'assistant',role:'assistant',parts:[{type:'tool-get_fare',toolCallId:'t1',state:'input-available',input:{payload:Array.from({length:100},()=>row)}}]}]})).toThrow();
});

it('continues after the captured failed B compose placeholder without replaying it',()=>{
 const failed={type:'tool-compose_reactive_scene',toolCallId:'ba0dbf46-f26a-4def-95d7-4a3150fdf266',state:'output-error',input:{},errorText:'This scene could not be completed. One bounded repair is allowed.'}
 const parsed=parseChatRequest({...request,variant:'b',messages:[...request.messages,{id:'failed-scene',role:'assistant',parts:[failed]},{id:'follow-up',role:'user',parts:[{type:'text',text:'I will stay 5 days'}]}]})
 expect(parsed.messages[1]?.parts).toEqual([])
 expect(parsed.messages[2]?.parts[0]?.text).toBe('I will stay 5 days')
})


it.each([{carriers:[{id:'carrier-1772yvd',name:'ÖBB'}]},{carrierIds:['carrier-1772yvd']}])('accepts preserved named and legacy carrier tool history',metadata=>{
 const output={datasetId:'dataset-1',...metadata,truncated:false}
 expect(parseToolOutput('find_carriers',output)).toEqual(output)
 const message={id:'named-carrier-history',role:'assistant',parts:[{type:'tool-find_carriers',toolCallId:'carrier-call',state:'output-available',input:{datasetRef:'dataset-1'},output}]}
 const parsed=parseChatRequest({...request,id:`carrier-history-${Object.keys(metadata)[0]}`,messages:[...request.messages,message]})
 expect(parsed.messages[1]?.parts[0]?.output).toEqual(output)
 const turn=acceptTurn(parsed)
 for(let index=1;index<LIMITS.toolCalls;index++)spendTool(turn,'find_carriers')
 expect(()=>spendTool(turn,'find_carriers')).toThrow('budget')
})
it.each([
 {carriers:Array.from({length:21},(_,index)=>({id:`carrier-${index}`,name:'Provider'}))},
 {carrierIds:Array.from({length:21},(_,index)=>`carrier-${index}`)},
 {carriers:[{id:'carrier-1',name:'x'.repeat(121)}]},
 {carriers:[{id:'carrier-1',name:'   '}]},
 {carriers:[{id:'carrier-1',name:'Provider',rows:[{priceCents:100}]}]},
 {carriers:[{id:'x'.repeat(97),name:'Provider'}]},
 {carriers:[{id:'carrier-1',name:'Provider'}],carrierIds:['carrier-1']},
])('rejects unsafe or oversized carrier output history',metadata=>{
 const output={datasetId:'dataset-1',...metadata,truncated:false}
 expect(()=>parseToolOutput('find_carriers',output)).toThrow()
 expect(()=>parseChatRequest({...request,messages:[...request.messages,{id:'unsafe-carriers',role:'assistant',parts:[{type:'tool-find_carriers',toolCallId:'call',state:'output-available',input:{datasetRef:'dataset-1'},output}]}]})).toThrow()
})
