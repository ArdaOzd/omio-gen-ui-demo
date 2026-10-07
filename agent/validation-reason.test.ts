import { describe,expect,it } from 'vitest';
import { z } from 'zod';
import { withOneRepair } from './repair';
import { validationReason } from './validation-reason';
import { parseToolInput } from './request-schema';
describe('specific bounded scene validation feedback',()=>{
 it('repairs an invalid native tree once with a field reason and no rejected input',async()=>{const prompts:string[]=[];const failures:string[]=[];let calls=0;const invalid={$type:'TravelSurface',artifactRef:7,title:'rejected-source'};const result=await withOneRepair({prompt:'original compact state',signal:new AbortController().signal,run:async prompt=>{prompts.push(prompt);return ++calls===1?invalid:{$type:'TravelSurface',artifactRef:'artifact-test'}},validate:value=>{parseToolInput('present',value)},failed:(_attempt,error)=>failures.push(validationReason(error))});expect(result.artifactRef).toBe('artifact-test');expect(calls).toBe(2);expect(failures[0]).toContain('artifactRef');expect(prompts[1]).toContain('Validation feedback: ZodError invalid_type at artifactRef');expect(prompts[1]).not.toContain('rejected-source');expect(failures[0]?.length).toBeLessThanOrEqual(190);});
 it('retains parser codes and omits arbitrary errors and stack traces',()=>{expect(validationReason(new Error('PROGRAM_INCOMPLETE'))).toBe('Error: PROGRAM_INCOMPLETE');expect(validationReason(new Error('wrapped',{cause:new Error('Unknown partial tree field')}))).toBe('Error: Unknown partial tree field');expect(validationReason(new SyntaxError('secret-source stack trace'))).toBe('SyntaxError: malformed JSON tool input');expect(validationReason(new Error('private host credential raw rows'))).not.toContain('private');expect(validationReason(z.strictObject({}).safeParse({secret:'value'}).error)).not.toContain('secret');});
});
