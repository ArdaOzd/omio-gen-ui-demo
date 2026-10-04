import { describe,expect,it } from 'vitest';
import { z } from 'zod';
import { withOneRepair } from './repair';
import { validationReason } from './validation-reason';
import { parseToolInput } from './request-schema';
describe('specific bounded scene validation feedback',()=>{
 it('repairs an actual invalid tool input once with a field reason and no rejected program',async()=>{const prompts:string[]=[];const failures:string[]=[];let calls=0;const invalid={artifactRef:'artifact-test',programRevision:'wrong',program:'rejected-source'};const result=await withOneRepair({prompt:'original compact state',signal:new AbortController().signal,run:async prompt=>{prompts.push(prompt);return ++calls===1?invalid:{artifactRef:'artifact-test',programRevision:0,program:'root = TravelSurface("artifact-test")'}},validate:value=>{parseToolInput('compose_reactive_scene',value)},failed:(_attempt,error)=>failures.push(validationReason(error))});expect(result.programRevision).toBe(0);expect(calls).toBe(2);expect(failures[0]).toContain('programRevision');expect(prompts[1]).toContain('Validation feedback: ZodError invalid_type at programRevision');expect(prompts[1]).not.toContain('rejected-source');expect(failures[0]?.length).toBeLessThanOrEqual(190);});
 it('retains parser codes and omits arbitrary errors and stack traces',()=>{expect(validationReason(new Error('PROGRAM_INCOMPLETE'))).toBe('Error: PROGRAM_INCOMPLETE');expect(validationReason(new SyntaxError('secret-source stack trace'))).toBe('SyntaxError: malformed JSON tool input');expect(validationReason(new Error('private host credential raw rows'))).not.toContain('private');expect(validationReason(z.strictObject({}).safeParse({secret:'value'}).error)).not.toContain('secret');});
});
