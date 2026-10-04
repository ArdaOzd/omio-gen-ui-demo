import {describe,expect,it} from 'vitest'
import type {UIMessage} from 'ai'
import { normalizeToolContinuations } from './continuation-history'
const text=(value:string):UIMessage['parts'][number]=>({type:'text',text:value})
const tool=(id:string,state:'input-available'|'output-available'='output-available'):UIMessage['parts'][number]=>state==='input-available'?{type:'tool-load_fares',toolCallId:id,state,input:{coverage:'same fixture'}}:{type:'tool-load_fares',toolCallId:id,state,input:{coverage:'same fixture'},output:{status:'ready'}}
const assistant=(id:string,parts:UIMessage['parts']):UIMessage=>({id,role:'assistant',parts})
describe('persisted native tool continuations',()=>{
 it('collapses the proven cumulative prefix while keeping the final tool result and ordered prose',()=>{
  const first=assistant('step-1',[text('Route one.'),tool('load-1','input-available')]);const second=assistant('step-2',[text('Route one.'),tool('load-1'),text('Route two.'),tool('load-2')]);const final=assistant('step-3',[...second.parts,text('The view is ready.')])
  expect(normalizeToolContinuations([first,second,final])).toEqual([final])
 })
 it('preserves legitimate repeated prose, different tool identities, and a later user turn',()=>{
  const first=assistant('first',[text('Same words.'),tool('first-load')]);const different=assistant('different',[text('Same words.'),tool('different-load')]);const user:UIMessage={id:'user',role:'user',parts:[text('Tell me again.')]};const later=assistant('later',[...first.parts,text('More detail.')])
  expect(normalizeToolContinuations([first,different,user,later])).toEqual([first,different,user,later])
  const prose=assistant('prose',[text('Same words.')]);expect(normalizeToolContinuations([prose,assistant('more-prose',[...prose.parts,text('More detail.')])])).toHaveLength(2)
 })
 it('keeps terminal tool results when a later message regresses or changes them',()=>{
  const complete=assistant('complete',[text('Route.'),tool('load')]);const pending=assistant('pending',[text('Route.'),tool('load','input-available'),text('More.')]);const changed=assistant('changed',[text('Route.'),{type:'tool-load_fares',toolCallId:'load',state:'output-available',input:{coverage:'same fixture'},output:{status:'different result'}},text('More.')])
  expect(normalizeToolContinuations([complete,pending])).toEqual([complete,pending]);expect(normalizeToolContinuations([complete,changed])).toEqual([complete,changed])
 })
 it('retains separate source revisions and does not mutate persisted arrays',()=>{
  const first=assistant('first',[text('Earlier wording.'),tool('load')]);const changed=assistant('changed',[text('New wording.'),tool('load'),text('Done.')]);const input=[first,changed];expect(normalizeToolContinuations(input)).toEqual(input);expect(input).toHaveLength(2)
 })
})
