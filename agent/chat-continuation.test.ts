// @vitest-environment node
import { createServer } from 'node:http'
import { afterEach,describe,expect,it,vi } from 'vitest'
import { Chat } from '@ai-sdk/react'
import { DefaultChatTransport,lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { ArtifactIdSchema } from '../src/generative/contracts'
import { createUIStateStore } from '../src/generative/state/ui-state-store'
import { exportAgentContext } from '../src/generative/state/snapshot-exporter'
import { createFareDataBridge } from '../src/generative/data/fare-data-bridge'
import { parseChatRequest } from './request-schema'
const {decision}=vi.hoisted(()=>({decision:vi.fn()}))
vi.mock('./codex-provider',()=>({codexDecision:decision}))
vi.mock('./location-catalog',()=>({loadLocationCatalog:async()=>[]}))
import { handleChat } from './chat-route'
import { InvalidModelOutputError } from './repair'
const servers:ReturnType<typeof createServer>[]=[]
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise<void>(resolve=>server.close(()=>resolve()))));decision.mockReset()})
describe('native frontend tool continuation messages',()=>{
 it('passes one effective request signal through a repaired native HTTP stream',async()=>{
  const id=ArtifactIdSchema.parse('deadline-chat-artifact'),store=createUIStateStore();store.initializeMissing(id,{})
  const context=exportAgentContext({turnId:'deadline-chat-test',activeArtifactId:id,artifactIds:[id],store,bridge:createFareDataBridge()})
  const parent=new AbortController(),signals:AbortSignal[]=[]
  decision.mockImplementation(async({signal,onDelta})=>{signals.push(signal);if(signals.length===1)throw new InvalidModelOutputError('Model returned an invalid decision');onDelta('intro','Repaired once.','none');return{intro:'Repaired once.',toolName:'none',toolInput:'{}',outro:''}})
  const server=createServer(async(request,response)=>{try{let body='';for await(const chunk of request)body+=chunk.toString();await handleChat(parseChatRequest(JSON.parse(body)),response,parent.signal)}catch(error){response.writeHead(500);response.end(String(error))}});servers.push(server)
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('Expected local test server')
  const observations:unknown[]=[];const requests:unknown[]=[]
  const chat=new Chat({onData:part=>observations.push(part),transport:new DefaultChatTransport({api:`http://127.0.0.1:${address.port}`,body:{variant:'a',currentContext:context,tools:{}},fetch:async(input,init)=>{requests.push(JSON.parse(String(init?.body)));return fetch(input,init)}})})
  await chat.sendMessage({text:'Plan this route.'});await vi.waitFor(()=>expect(chat.status).toBe('ready'))
  expect(signals).toHaveLength(2);expect(signals[0]).toBe(signals[1]);expect(signals[0]).not.toBe(parent.signal)
  expect(observations).toMatchObject([{type:'data-model-attempt',transient:true,data:{attempt:0,status:'start',reason:'initial'}},{type:'data-model-attempt',transient:true,data:{attempt:0,status:'end',reason:'invalid-output'}},{type:'data-model-attempt',transient:true,data:{attempt:1,status:'start',reason:'validation-repair'}},{type:'data-model-attempt',transient:true,data:{attempt:1,status:'end',reason:'accepted'}}]);expect(observations).toHaveLength(4)
  expect(chat.messages.flatMap(message=>message.parts).some(part=>part.type.startsWith('data-'))).toBe(false)
  expect(chat.messages.filter(message=>message.role==='assistant')).toHaveLength(1);expect(chat.messages.at(-1)?.parts.filter(part=>part.type==='text').map(part=>part.text)).toEqual(['Repaired once.'])
  await chat.sendMessage({text:'Continue.'});await vi.waitFor(()=>expect(chat.status).toBe('ready'));expect(JSON.stringify(requests[1])).not.toContain('data-model-attempt')
 })

 it('keeps three tool steps and each prose segment in one assistant message',async()=>{
  const id=ArtifactIdSchema.parse('continuation-artifact'),store=createUIStateStore();store.initializeMissing(id,{})
  const context=exportAgentContext({turnId:'continuation-test',activeArtifactId:id,artifactIds:[id],store,bridge:createFareDataBridge()})
  const coverage=[{originIds:['barcelona'],destinationIds:['prague'],dateWindow:{from:'2026-10-03',to:'2026-10-03'},modes:['train','bus'],passengers:1},{originIds:['prague'],destinationIds:['paris'],dateWindow:{from:'2026-10-05',to:'2026-10-05'},modes:['train','bus'],passengers:1}] as const
  const bridge=createFareDataBridge({pageSource:async input=>({rows:[],total:0,pages:1,page:input.page,sourceVersion:'fixture-v1'})})
  const manifests=await Promise.all(coverage.map(request=>bridge.load({...request,originIds:[...request.originIds],destinationIds:[...request.destinationIds],modes:[...request.modes]},new AbortController().signal)))
  const segments=['First route.','Second route.','Third route.','Your view is ready.'];let step=0
  decision.mockImplementation(async({onDelta,prompt})=>{const index=step++;if(index===3)expect(JSON.parse(prompt).completion.acceptedScenes).toEqual([{artifactRef:id,uiStateRevision:0,toolName:'present'}]);const toolName=index<2?'load_fares':index===2?'present':'none';const text=segments[index<4?index:0];const toolInput=index<2?JSON.stringify({coverage:coverage[index]}):index===2?JSON.stringify({$type:'TravelSurface',$key:'root',artifactRef:id,children:[]}):'{}';onDelta('intro',text,toolName);if(toolName!=='none')onDelta('toolInput',toolInput,toolName);return{intro:text,toolName,toolInput,outro:''}})
  const server=createServer(async(request,response)=>{try{let body='';for await(const chunk of request)body+=chunk.toString();await handleChat(parseChatRequest(JSON.parse(body)),response,new AbortController().signal)}catch(error){response.writeHead(500);response.end(String(error))}});servers.push(server)
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('Expected local test server')
  const requests:unknown[]=[];const transport=new DefaultChatTransport({api:`http://127.0.0.1:${address.port}`,body:{variant:'a',currentContext:context,tools:{load_fares:{parameters:{}},present:{parameters:{}}}},fetch:async(input,init)=>{requests.push(JSON.parse(String(init?.body)));return fetch(input,init)}})
  let loaded=0;const chat=new Chat({transport,sendAutomaticallyWhen:lastAssistantMessageIsCompleteWithToolCalls,onToolCall:({toolCall})=>{void chat.addToolOutput({tool:toolCall.toolName,toolCallId:toolCall.toolCallId,output:toolCall.toolName==='present'?{}:manifests[loaded++]})}})
  await chat.sendMessage({text:'Plan three journey legs.'})
  await vi.waitFor(()=>expect(chat.status).toBe('ready'));expect(step).toBe(4);expect(requests).toHaveLength(4)
  const assistants=chat.messages.filter(message=>message.role==='assistant');expect(assistants).toHaveLength(1)
  const parts=assistants[0]?.parts??[];expect(parts.filter(part=>part.type==='text').map(part=>part.text)).toEqual(segments)
  expect(parts.filter(part=>part.type.startsWith('tool-')).map(part=>part.type)).toEqual(['tool-load_fares','tool-load_fares','tool-present'])
  expect(parts.filter(part=>part.type==='text'||part.type.startsWith('tool-')).map(part=>part.type)).toEqual(['text','tool-load_fares','text','tool-load_fares','text','tool-present','text'])
  await chat.sendMessage({text:'A later text-only question.'});expect(chat.messages.filter(message=>message.role==='assistant')).toHaveLength(2)
  expect(chat.messages.at(-1)?.parts.filter(part=>part.type==='text').map(part=>part.text)).toEqual([segments[0]])
  await chat.regenerate();expect(chat.messages.filter(message=>message.role==='assistant')).toHaveLength(2);expect(chat.messages.at(-1)?.parts.filter(part=>part.type==='text').map(part=>part.text)).toEqual([segments[0]])
 })
})
