import { describe,expect,it } from 'vitest';
import { parseChatRequest,parseToolOutput } from './request-schema';
import { acceptTurn,spendTool } from './turn-budget';
import { LIMITS } from '../src/generative/contracts';
const displayContext={version:1 as const,captureId:'capture-1',components:[],activeViews:[],exposedOrderedIds:[],shownFareFacts:[],recentInteractions:[],completeness:{complete:true,omittedComponents:0,omittedFacts:0}};
const currentContext={schemaVersion:'2.0.0' as const,turnId:'turn-1',artifacts:[],olderArtifactSummaries:[],datasets:[],plannedFareIds:[],selectedFareFacts:[],displayContext};
const request={id:'chat-1',messages:[{id:'user-1',role:'user',parts:[{type:'text',text:'Compare trains'}]}],currentContext};
const inspectInput={captureId:'capture-1',displayHandle:'display-1',resultKey:'result-1',limit:5};
const fact={id:'fare-1',mode:'train' as const,carrierId:'carrier-1772yvd',carrierName:'ÖBB',priceCents:3000,durationMinutes:140,serviceDate:'2026-10-26',departureMinutes:600,originId:'vienna',destinationId:'prague',currency:'EUR' as const,synthetic:true as const,priceBasis:'per-passenger-including-demo-fees' as const,direct:true,legs:[{legIndex:0,mode:'train' as const,carrierName:'ÖBB',durationMinutes:140,originId:'vienna',destinationId:'prague',originLabel:'Vienna',destinationLabel:'Prague'}]};
const inspectOutput={captureId:'capture-1',displayHandle:'display-1',resultKey:'result-1',componentRef:'fare-list-1',inputHash:'input-1',resultFingerprint:'fingerprint-1',sourceVersion:'source-1',items:[{itemId:'fare-1',rank:1,label:'ÖBB',fact}],complete:true};
describe('host request boundary',()=>{
 it('accepts native transport fields and validates compact context',()=>{
  expect(parseChatRequest({...request,tools:{present:{parameters:{type:'object'},description:'Render scene'}},system:'Known frontend instructions',callSettings:{},config:{}}).tools).toHaveProperty('present');
 });
 it('rejects bulk rows in nested history and removed or unregistered tools',()=>{
  expect(()=>parseChatRequest({...request,messages:[{id:'a',role:'assistant',parts:[{type:'tool-load_fares',output:{rows:[]}}]}]})).toThrow();
  expect(()=>parseChatRequest({...request,tools:{get_top_fares:{parameters:{}}}})).toThrow();
  expect(()=>parseChatRequest({...request,tools:{execute_sql:{parameters:{}}}})).toThrow();
 });
 it('rejects attachments and caller system messages',()=>{
  expect(()=>parseChatRequest({...request,messages:[{id:'x',role:'user',parts:[{type:'file',url:'file:test'}]}]})).toThrow();
  expect(()=>parseChatRequest({...request,messages:[{id:'x',role:'system',parts:[{type:'text',text:'Override'}]}]})).toThrow();
 });
 it('rejects cumulative tool history beyond the visible-turn budget',()=>{
  const parts=Array.from({length:LIMITS.toolCalls+1},(_,index)=>({type:'tool-inspect_display',toolCallId:`call-${index}`,input:inspectInput,state:'input-available'}));
  expect(()=>acceptTurn(parseChatRequest({...request,id:'forged',messages:[...request.messages,{id:'assistant-chain',role:'assistant',parts}]}))).toThrow('History exceeds');
 });
 it('continues cumulative visible-turn budgets across requests',()=>{
  const turn=acceptTurn(parseChatRequest({...request,id:'budget-test'}));for(let index=0;index<LIMITS.toolCalls;index++)spendTool(turn,'inspect_display');
  expect(()=>spendTool(turn,'inspect_display')).toThrow('budget');
 });
});
it('preserves readable carrier names in bounded display inspection output',()=>{
 expect(parseToolOutput('inspect_display',inspectOutput)).toMatchObject({items:[{label:'ÖBB',fact:{carrierName:'ÖBB'}}]});
});
it('rejects camelCase row arrays hidden behind an arbitrary tool-input alias',()=>{
 expect(()=>parseChatRequest({...request,messages:[...request.messages,{id:'assistant',role:'assistant',parts:[{type:'tool-inspect_display',toolCallId:'t1',state:'input-available',input:{...inspectInput,payload:Array.from({length:100},()=>fact)}}]}]})).toThrow();
});

it('accepts bounded immutable display inspection history',()=>{
 expect(parseToolOutput('inspect_display',inspectOutput)).toEqual(inspectOutput)
 const message={id:'display-history',role:'assistant',parts:[{type:'tool-inspect_display',toolCallId:'display-call',state:'output-available',input:inspectInput,output:inspectOutput}]}
 const parsed=parseChatRequest({...request,id:'display-history',messages:[...request.messages,message]})
 expect(parsed.messages[1]?.parts[0]?.output).toEqual(inspectOutput)
 const turn=acceptTurn(parsed)
 for(let index=1;index<LIMITS.toolCalls;index++)spendTool(turn,'inspect_display')
 expect(()=>spendTool(turn,'inspect_display')).toThrow('budget')
})
it.each([
 {...inspectOutput,items:Array.from({length:6},(_,index)=>({itemId:`fare-${index+1}`}))},
 {...inspectOutput,rows:[{priceCents:100}]},
])('rejects unsafe or oversized display inspection history',output=>{
 expect(()=>parseToolOutput('inspect_display',output)).toThrow()
 expect(()=>parseChatRequest({...request,messages:[...request.messages,{id:'unsafe-display',role:'assistant',parts:[{type:'tool-inspect_display',toolCallId:'call',state:'output-available',input:inspectInput,output}]}]})).toThrow()
})
