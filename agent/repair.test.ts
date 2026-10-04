import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvalidModelOutputError, withOneRepair } from './repair';

afterEach(() => vi.useRealTimers());
describe('one bounded model repair', () => {
 it('repairs validation once with original context and sanitized feedback', async () => {
  const prompts:string[]=[];let calls=0;
  const result=await withOneRepair({prompt:'compact original context',signal:new AbortController().signal,run:async prompt=>{prompts.push(prompt);return ++calls===1?'invalid secret source':'valid'},validate:value=>{if(value!=='valid')throw new Error('Invalid generated scene')}});
  expect(result).toBe('valid');expect(calls).toBe(2);expect(prompts[1]).toContain('compact original context');expect(prompts[1]).not.toContain('invalid secret source');
 });
 it.each(['Codex generation timed out','Codex protocol request rejected','Signed-in Codex runtime unavailable'])('does not repair terminal provider failure: %s', async message => {
  const run=vi.fn(async()=>{throw new Error(message)}),validate=vi.fn(),failed=vi.fn();
  await expect(withOneRepair({prompt:'context',signal:new AbortController().signal,run,validate,failed})).rejects.toThrow(message);
  expect(run).toHaveBeenCalledTimes(1);expect(validate).not.toHaveBeenCalled();expect(failed).toHaveBeenCalledTimes(1);
 });
 it('repairs typed malformed provider output, without retrying generic provider errors',async()=>{
  const run=vi.fn(async()=>{if(run.mock.calls.length===1)throw new InvalidModelOutputError('Model returned an invalid decision');return 'valid'});
  await expect(withOneRepair({prompt:'context',signal:new AbortController().signal,run,validate:()=>{}})).resolves.toBe('valid');expect(run).toHaveBeenCalledTimes(2);
 });
 it('stops after two invalid outputs and never retries cancellation', async () => {
  const run=vi.fn(async()=> 'invalid');
  await expect(withOneRepair({prompt:'context',signal:new AbortController().signal,run,validate:()=>{throw new Error('Invalid')}})).rejects.toThrow('Invalid');expect(run).toHaveBeenCalledTimes(2);
  const controller=new AbortController(),cancelled=vi.fn(async()=>{controller.abort();throw new Error('Cancelled')});
  await expect(withOneRepair({prompt:'context',signal:controller.signal,run:cancelled,validate:()=>{}})).rejects.toThrow();expect(cancelled).toHaveBeenCalledTimes(1);
 });
 it('shares 120 seconds across the original attempt and repair', async () => {
  vi.useFakeTimers();const signals:AbortSignal[]=[];let calls=0;
  const result=withOneRepair({prompt:'context',signal:new AbortController().signal,run:async(_prompt,_attempt,signal)=>{signals.push(signal);const attempt=calls++;await new Promise(resolve=>setTimeout(resolve,attempt===0?70_000:80_000));return attempt===0?'invalid':'valid'},validate:value=>{if(value==='invalid')throw new Error('Invalid')}});
  const rejected=expect(result).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(70_000);expect(calls).toBe(2);
  await vi.advanceTimersByTimeAsync(50_000);await rejected;expect(signals).toHaveLength(2);expect(signals[0]).toBe(signals[1]);expect(signals[1]?.aborted).toBe(true);
 });
 it('rejects an ignored-abort late result without validating or repairing it', async () => {
  vi.useFakeTimers();const validate=vi.fn(),run=vi.fn(async()=>{await new Promise(resolve=>setTimeout(resolve,130_000));return 'late'});
  const result=withOneRepair({prompt:'context',signal:new AbortController().signal,run,validate});const rejected=expect(result).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(120_000);await rejected;await vi.advanceTimersByTimeAsync(10_000);
  expect(validate).not.toHaveBeenCalled();expect(run).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
 });
 it('rejects a result after deadline even before the timeout callback runs',async()=>{
  vi.useFakeTimers();const validate=vi.fn(),started=Date.now(),run=vi.fn(async()=>{vi.setSystemTime(started+120_001);return 'late'});
  await expect(withOneRepair({prompt:'context',signal:new AbortController().signal,run,validate})).rejects.toThrow('timed out');expect(validate).not.toHaveBeenCalled();expect(run).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
 });
 it('propagates parent cancellation while a provider ignores its signal', async () => {
  const controller=new AbortController(),run=vi.fn(async()=>new Promise<string>(()=>{})),validate=vi.fn();
  const result=withOneRepair({prompt:'context',signal:controller.signal,run,validate});const rejected=expect(result).rejects.toThrow('cancelled');controller.abort();await rejected;
  expect(run).toHaveBeenCalledTimes(1);expect(validate).not.toHaveBeenCalled();
 });
 it('does not start work when already cancelled', async()=> {
  const controller=new AbortController();controller.abort();const run=vi.fn(async()=> 'valid');
  await expect(withOneRepair({prompt:'context',signal:controller.signal,run,validate:()=>{}})).rejects.toThrow('cancelled');expect(run).not.toHaveBeenCalled();
 });
});
