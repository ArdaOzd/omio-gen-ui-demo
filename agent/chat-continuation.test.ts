// @vitest-environment node
import { createServer } from 'node:http'
import { afterEach,describe,expect,it,vi } from 'vitest'
import { Chat } from '@ai-sdk/react'
import { DefaultChatTransport,lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { ArtifactIdSchema } from '../src/generative/contracts'
import { createUIStateStore } from '../src/generative/state/ui-state-store'
import { exportAgentContext } from '../src/generative/state/snapshot-exporter'
import { createFareDataBridge } from '../src/generative/data/fare-data-bridge'
import { createDisplayContextStore } from '../src/generative/state/display-context'
import { parseChatRequest } from './request-schema'
const {decision}=vi.hoisted(()=>({decision:vi.fn()}))
vi.mock('./codex-provider',()=>({codexDecision:decision}))
vi.mock('./location-catalog',()=>({loadLocationCatalog:async()=>[]}))
import { handleChat } from './chat-route'
import { InvalidModelOutputError } from './repair'
const servers:ReturnType<typeof createServer>[]=[]
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise<void>(resolve=>server.close(()=>resolve()))));decision.mockReset();vi.restoreAllMocks()})
describe('native frontend tool continuation messages',()=>{
 it('passes one effective request signal through a repaired native HTTP stream',async()=>{
  const warnings:string[]=[];vi.spyOn(console,'warn').mockImplementation(value=>warnings.push(String(value)))
  const id=ArtifactIdSchema.parse('deadline-chat-artifact'),store=createUIStateStore();store.initializeMissing(id,{})
  const context=exportAgentContext({turnId:'deadline-chat-test',activeArtifactId:id,artifactIds:[id],store,bridge:createFareDataBridge(),displayStore:createDisplayContextStore()})
  const parent=new AbortController(),signals:AbortSignal[]=[]
  decision.mockImplementation(async({signal,onDelta})=>{signals.push(signal);if(signals.length===1)throw new InvalidModelOutputError('Model returned an invalid decision',new Error('Unknown partial tree field'));onDelta('intro','Repaired once.','none');return{intro:'Repaired once.',toolName:'none',toolInput:'{}',outro:''}})
  const server=createServer(async(request,response)=>{try{let body='';for await(const chunk of request)body+=chunk.toString();await handleChat(parseChatRequest(JSON.parse(body)),response,parent.signal)}catch(error){response.writeHead(500);response.end(String(error))}});servers.push(server)
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('Expected local test server')
  const observations:unknown[]=[];const requests:unknown[]=[]
  const chat=new Chat({onData:part=>observations.push(part),transport:new DefaultChatTransport({api:`http://127.0.0.1:${address.port}`,body:{currentContext:context,tools:{}},fetch:async(input,init)=>{requests.push(JSON.parse(String(init?.body)));return fetch(input,init)}})})
  await chat.sendMessage({text:'Plan this route.'});await vi.waitFor(()=>expect(chat.status).toBe('ready'))
  expect(signals).toHaveLength(2);expect(signals[0]).toBe(signals[1]);expect(signals[0]).not.toBe(parent.signal)
  const warning=JSON.parse(warnings[0]??'{}');expect(warning).toMatchObject({event:'omio-agent-attempt-failed',attempt:0,tool:'unknown',reason:'Error: Unknown partial tree field'});expect(warning.traceId).toMatch(/^[0-9a-f-]{36}$/);expect(warnings).toHaveLength(1);expect(warnings[0]).not.toContain('Plan this route.')
  expect(observations).toMatchObject([{type:'data-model-attempt',transient:true,data:{attempt:0,status:'start',reason:'initial'}},{type:'data-model-attempt',transient:true,data:{attempt:0,status:'end',reason:'invalid-output'}},{type:'data-model-attempt',transient:true,data:{attempt:1,status:'start',reason:'validation-repair'}},{type:'data-model-attempt',transient:true,data:{attempt:1,status:'end',reason:'accepted'}}]);expect(observations).toHaveLength(4)
  expect(chat.messages.flatMap(message=>message.parts).some(part=>part.type.startsWith('data-'))).toBe(false)
  expect(chat.messages.filter(message=>message.role==='assistant')).toHaveLength(1);expect(chat.messages.at(-1)?.parts.filter(part=>part.type==='text').map(part=>part.text)).toEqual(['Repaired once.'])
  await chat.sendMessage({text:'Continue.'});await vi.waitFor(()=>expect(chat.status).toBe('ready'));expect(JSON.stringify(requests[1])).not.toContain('data-model-attempt')
 })

 it('keeps three tool steps and each prose segment in one assistant message',async()=>{
  const id=ArtifactIdSchema.parse('continuation-artifact'),store=createUIStateStore();store.initializeMissing(id,{})
  const context=exportAgentContext({turnId:'continuation-test',activeArtifactId:id,artifactIds:[id],store,bridge:createFareDataBridge(),displayStore:createDisplayContextStore()})
  const segments=['First route.','Second route.','Third route.','Your view is ready.'];let step=0
  decision.mockImplementation(async({onDelta,prompt})=>{const index=step++;if(index===3){const parsed=JSON.parse(prompt);expect(parsed.completion.acceptedScenes).toEqual([{artifactRef:id,uiStateRevision:0,toolName:'present'}]);expect(parsed.frontendInstructions).toContain("friendly, candid travel agency guide");expect(parsed.frontendInstructions).toContain('Never imply that a fare is live');expect(parsed.completion.policy).toContain('Compare the options, recommend a fit for the user and suggest relevant next steps.')}const toolName=index<2?'create_artifact':index===2?'present':'none';const text=segments[index<4?index:0];const toolInput=index<2?'{}':index===2?JSON.stringify({$type:'TravelSurface',$key:'root',artifactRef:id,children:[]}):'{}';onDelta('intro',text,toolName);if(toolName!=='none')onDelta('toolInput',toolInput,toolName);return{intro:text,toolName,toolInput,outro:''}})
  const server=createServer(async(request,response)=>{try{let body='';for await(const chunk of request)body+=chunk.toString();await handleChat(parseChatRequest(JSON.parse(body)),response,new AbortController().signal)}catch(error){response.writeHead(500);response.end(String(error))}});servers.push(server)
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('Expected local test server')
  const requests:unknown[]=[];const transport=new DefaultChatTransport({api:`http://127.0.0.1:${address.port}`,body:{currentContext:context,tools:{create_artifact:{parameters:{}},present:{parameters:{}}}},fetch:async(input,init)=>{requests.push(JSON.parse(String(init?.body)));return fetch(input,init)}})
  const chat=new Chat({transport,sendAutomaticallyWhen:lastAssistantMessageIsCompleteWithToolCalls,onToolCall:({toolCall})=>{void chat.addToolOutput({tool:toolCall.toolName,toolCallId:toolCall.toolCallId,output:toolCall.toolName==='present'?{}:{artifactId:id,revision:0}})}})
  await chat.sendMessage({text:'Plan three journey legs.'})
  await vi.waitFor(()=>expect(chat.status).toBe('ready'));expect(step).toBe(4);expect(requests).toHaveLength(4)
  const assistants=chat.messages.filter(message=>message.role==='assistant');expect(assistants).toHaveLength(1)
  const parts=assistants[0]?.parts??[];expect(parts.filter(part=>part.type==='text').map(part=>part.text)).toEqual(segments)
  expect(parts.filter(part=>part.type.startsWith('tool-')).map(part=>part.type)).toEqual(['tool-create_artifact','tool-create_artifact','tool-present'])
  expect(parts.filter(part=>part.type==='text'||part.type.startsWith('tool-')).map(part=>part.type)).toEqual(['text','tool-create_artifact','text','tool-create_artifact','text','tool-present','text'])
  await chat.sendMessage({text:'A later text-only question.'});expect(chat.messages.filter(message=>message.role==='assistant')).toHaveLength(2)
  expect(chat.messages.at(-1)?.parts.filter(part=>part.type==='text').map(part=>part.text)).toEqual([segments[0]])
  await chat.regenerate();expect(chat.messages.filter(message=>message.role==='assistant')).toHaveLength(2);expect(chat.messages.at(-1)?.parts.filter(part=>part.type==='text').map(part=>part.text)).toEqual([segments[0]])
 })
})
