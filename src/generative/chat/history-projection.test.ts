import {describe,expect,it} from 'vitest'
import type {UIMessage} from 'ai'
import {snapshotRequest} from './transport'
import {parseChatRequest} from '../../../agent/request-schema'

const context=()=>({schemaVersion:'1.0.0',turnId:'latest',artifacts:[],olderArtifactSummaries:[],datasets:[],selectedFareFacts:[]})
const text=(id:string,role:'user'|'assistant',value:string):UIMessage=>({id,role,parts:[{type:'text',text:value}]})
async function prepared(messages:UIMessage[]){return snapshotRequest(context)({id:'thread',messages,body:{},trigger:'submit-message',messageId:'continuation',requestMetadata:{retry:true},api:'/api/chat',credentials:undefined,headers:undefined})}

describe('bounded outbound history with intact local transcript',()=>{
 it.each([61,200])('continues after %i messages and preserves request identity, latest turn and local history',async length=>{
  const messages=Array.from({length},(_,i)=>text(`m${i}`,i%2?'assistant':'user',`Turn ${i}`)),before=structuredClone(messages)
  const result=await prepared(messages),request=parseChatRequest(result.body)
  expect(request.messages.length).toBeLessThanOrEqual(60)
  expect(request.messages.at(-1)?.id).toBe(`m${length-1}`)
  expect(request).toMatchObject({id:'thread',trigger:'submit-message',messageId:'continuation',metadata:{retry:true},currentContext:context()})
  expect(messages).toEqual(before)
 })
 it('fits history above 40k while retaining the full latest user text losslessly',async()=>{
  const messages=Array.from({length:20},(_,i)=>text(`m${i}`,i%2?'assistant':'user','Older text '.repeat(400)))
  const current=text('current','user','Current '.repeat(1000));messages.push(current)
  expect(JSON.stringify(messages).length).toBeGreaterThan(40000)
  const request=parseChatRequest((await prepared(messages)).body)
  const latest=request.messages.at(-1)
  expect(latest?.id).toBe('current')
  expect(latest?.parts.map(part=>part.text??'').join('')).toBe(current.parts.map(part=>part.type==='text'?part.text:'').join(''))
  expect(latest?.parts.every(part=>(part.text?.length??0)<=5000)).toBe(true)
  expect(JSON.stringify(request.messages).length).toBeLessThanOrEqual(40000)
 })
 it('summarizes invalid completed tool inputs but preserves and validates the current continuation',async()=>{
  const old: UIMessage={id:'old-tool',role:'assistant',parts:[{type:'dynamic-tool',toolName:'present',toolCallId:'old-call',state:'output-available',input:{$type:'Unknown',artifactRef:'a'},output:{}}]}
  const current:UIMessage={id:'current-tool',role:'assistant',parts:[{type:'dynamic-tool',toolName:'get_route',toolCallId:'current-call',state:'input-available',input:{datasetRef:'dataset-current'}}]}
  const messages=[text('old-user','user','Make a planner'),old,text('repair','user','Repair the planner'),current]
  const request=parseChatRequest((await prepared(messages)).body)
  expect(request.messages.find(message=>message.id==='old-tool')?.parts).toEqual([{type:'text',text:expect.stringContaining('Earlier tool present')}])
  expect(request.messages.at(-1)).toEqual(current)
  current.parts=[{type:'dynamic-tool',toolName:'get_route',toolCallId:'current-call',state:'input-available',input:{wrong:'input'}}]
  const invalidCurrent=await prepared(messages)
  expect(()=>parseChatRequest(invalidCurrent.body)).toThrow()
 })
 it('rejects bulk data even in an older turn before projection',async()=>{
  const messages:UIMessage[]=[text('old','user','Old task'),{id:'private-tool',role:'assistant',parts:[{type:'dynamic-tool',toolName:'get_route',toolCallId:'private',state:'input-available',input:{rows:[{id:'private-fare'}]}}]},text('latest','user','Repair')]
  await expect(prepared(messages)).rejects.toThrow(/bulk|rows/i)
 })
 it('reports an oversized mandatory turn and permits a subsequent short repair turn',async()=>{
  const oversized=text('huge','user','x'.repeat(41000))
  await expect(prepared([oversized])).rejects.toThrow(/current turn.*shorter/i)
  expect(parseChatRequest((await prepared([oversized,text('repair','user','Continue briefly')])).body).messages.at(-1)?.id).toBe('repair')
 })
 it('never truncates a mandatory tool input or its continuation to fit the budget',async()=>{
  const continuation:UIMessage={id:'pending',role:'assistant',parts:[{type:'dynamic-tool',toolName:'present',toolCallId:'call',state:'input-available',input:{$type:'TravelSurface',artifactRef:'a',title:'x'.repeat(41000)}}]}
  const local=[text('u','user','Compose'),continuation],before=structuredClone(local)
  await expect(prepared(local)).rejects.toThrow(/current turn.*shorter/i)
  expect(local).toEqual(before)
  const recovered=parseChatRequest((await prepared([...local,text('repair','user','Try a small planner')])).body)
  expect(recovered.messages.at(-1)?.id).toBe('repair')
  expect(recovered.messages.find(message=>message.id==='pending')?.parts).toEqual([{type:'text',text:expect.stringContaining('Earlier tool present')}])
 })
})
