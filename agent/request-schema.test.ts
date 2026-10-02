import { describe,expect,it } from 'vitest';
import { parseChatRequest } from './request-schema';
import { acceptTurn,spendTool } from './turn-budget';
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
 it('continues cumulative visible-turn budgets across requests',()=>{
  const parsed=parseChatRequest({...request,id:'budget-test'});const first=acceptTurn(parsed);spendTool(first,'get_top_fares');spendTool(acceptTurn(parsed),'get_top_fares');
  expect(()=>spendTool(acceptTurn(parsed),'get_top_fares')).toThrow('budget');
 });
});
