// @vitest-environment node
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
const mocks=vi.hoisted(()=>({spawn:vi.fn(),mkdtemp:vi.fn(),readFile:vi.fn(),rm:vi.fn()}));
vi.mock('node:child_process',()=>({spawn:mocks.spawn}));
vi.mock('node:fs/promises',()=>({mkdtemp:mocks.mkdtemp,readFile:mocks.readFile,rm:mocks.rm}));
import { codexDecision } from './codex-provider';
import { InvalidModelOutputError, withOneRepair } from './repair';
import { validationReason } from './validation-reason';

const valid={intro:'Ready.',toolName:'none',toolInput:'{}',outro:''};
class ModelProcess extends EventEmitter {
 stdout=new PassThrough();stderr=new PassThrough();kill=vi.fn(()=>true);
 onTurn:()=>void=()=>this.decision(JSON.stringify(valid));
 rpcError=false;
 stdin={write:(source:string)=>{
  const message=z.object({id:z.number().optional(),method:z.string()}).parse(JSON.parse(source));
  if(message.id!==undefined)queueMicrotask(()=>{
   if(this.rpcError){this.message({id:message.id,error:{message:'private RPC failure'}});return;}
   this.message({id:message.id,result:message.method==='thread/start'?{thread:{id:'test-thread'}}:{}});
   if(message.method==='turn/start')this.onTurn();
  });return true;
 }};
 message(value:unknown){this.stdout.write(JSON.stringify(value)+'\n');}
 decision(output:string){this.message({method:'item/agentMessage/delta',params:{delta:output}});this.message({method:'turn/completed',params:{}});}
}
let child:ModelProcess;
beforeEach(()=>{child=new ModelProcess();mocks.spawn.mockImplementation(()=>child);mocks.mkdtemp.mockResolvedValue('/tmp/model-only-test');mocks.readFile.mockResolvedValue('');mocks.rm.mockResolvedValue(undefined);});
afterEach(()=>{vi.useRealTimers();vi.resetAllMocks();});
const options=(signal=new AbortController().signal)=>({prompt:'compact context',toolNames:['present'],signal,onDelta:vi.fn()});
describe('isolated model provider failure classification and cancellation',()=>{
 it('returns a valid decision and cleans up process, timer and directory',async()=>{
  vi.useFakeTimers();const input=options();await expect(codexDecision(input)).resolves.toEqual(valid);
  expect(input.onDelta).toHaveBeenCalledWith('intro','Ready.','none');expect(child.kill).toHaveBeenCalledWith('SIGTERM');expect(mocks.rm).toHaveBeenCalledWith('/tmp/model-only-test',{recursive:true,force:true});expect(vi.getTimerCount()).toBe(0);
 });
 it.each(['not JSON',JSON.stringify({...valid,intro:'x'.repeat(4001)})])('classifies invalid completed output as repairable',async output=>{
  child.onTurn=()=>child.decision(output);await expect(codexDecision(options())).rejects.toBeInstanceOf(InvalidModelOutputError);expect(mocks.rm).toHaveBeenCalledOnce();
 });
 it('classifies invalid partial output without accepting later completion',async()=>{
  const input=options();input.onDelta.mockImplementation(()=>{throw new Error('Unknown partial tree field')});let failure:unknown;
  try{await codexDecision(input)}catch(error){failure=error}
  expect(failure).toBeInstanceOf(InvalidModelOutputError);expect(validationReason(failure)).toBe('Error: Unknown partial tree field');expect(child.kill).toHaveBeenCalledWith('SIGTERM');expect(input.onDelta).toHaveBeenCalledTimes(1);
 });
 it.each(['oversize','capability'])('classifies generated %s failures as repairable',async kind=>{
  child.onTurn=()=>kind==='oversize'?child.decision('x'.repeat(40_001)):child.message({method:'item/tool/call',params:{}});
  await expect(codexDecision(options())).rejects.toBeInstanceOf(InvalidModelOutputError);
 });
 it('does not repair an actual RPC rejection',async()=>{
  child.rpcError=true;const input=options(),run=vi.fn(async(_prompt:string,_attempt:number,signal:AbortSignal)=>codexDecision({...input,signal}));
  await expect(withOneRepair({prompt:input.prompt,signal:input.signal,run,validate:()=>{}})).rejects.toThrow('protocol request rejected');
  expect(mocks.spawn).toHaveBeenCalledTimes(1);expect(run).toHaveBeenCalledTimes(1);expect(mocks.rm).toHaveBeenCalledOnce();
 });
 it('does not repair a real provider timeout',async()=>{
  vi.useFakeTimers();child.onTurn=()=>{};const input=options(),run=vi.fn(async(_prompt:string,_attempt:number,signal:AbortSignal)=>codexDecision({...input,signal}));
  const result=withOneRepair({prompt:input.prompt,signal:input.signal,run,validate:()=>{}}),rejected=expect(result).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(120_000);await rejected;await Promise.resolve();expect(mocks.spawn).toHaveBeenCalledTimes(1);expect(run).toHaveBeenCalledTimes(1);expect(mocks.rm).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
 });
 it('checks cancellation after asynchronous directory creation',async()=>{
  let created:(value:string)=>void=()=>{};mocks.mkdtemp.mockImplementation(()=>new Promise<string>(resolve=>{created=resolve}));const controller=new AbortController();
  const result=codexDecision(options(controller.signal)),rejected=expect(result).rejects.toThrow('cancelled');controller.abort();created('/tmp/model-only-test');await rejected;
  expect(mocks.spawn).not.toHaveBeenCalled();expect(mocks.readFile).not.toHaveBeenCalled();expect(mocks.rm).toHaveBeenCalledOnce();
 });
 it('checks cancellation after asynchronous configuration reading',async()=>{
  let read:(value:string)=>void=()=>{};mocks.readFile.mockImplementation(()=>new Promise<string>(resolve=>{read=resolve}));const controller=new AbortController();
  const result=codexDecision(options(controller.signal)),rejected=expect(result).rejects.toThrow('cancelled');await Promise.resolve();expect(mocks.readFile).toHaveBeenCalledOnce();controller.abort();read('');await rejected;
  expect(mocks.spawn).not.toHaveBeenCalled();expect(mocks.rm).toHaveBeenCalledOnce();
 });
 it('handles cancellation in the child startup/listener window without sending RPCs',async()=>{
  const controller=new AbortController();mocks.spawn.mockImplementation(()=>{controller.abort();return child});
  await expect(codexDecision(options(controller.signal))).rejects.toThrow('cancelled');expect(child.kill).toHaveBeenCalledWith('SIGTERM');expect(mocks.rm).toHaveBeenCalledOnce();
 });
 it('rejects late output after parent cancellation',async()=>{
  const controller=new AbortController(),input=options(controller.signal);child.onTurn=()=>{controller.abort();child.decision(JSON.stringify(valid))};
  await expect(codexDecision(input)).rejects.toThrow('cancelled');expect(input.onDelta).not.toHaveBeenCalled();expect(mocks.rm).toHaveBeenCalledOnce();
 });
});
