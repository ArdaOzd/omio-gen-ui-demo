import { describe,expect,it } from 'vitest'
import { replyRunResult } from './reply-run'

describe('reply run completion',()=>{
  it('keeps one logical turn open after a response that requested frontend tools',()=>{
    expect(replyRunResult('tool-calls',{isAbort:false,isDisconnect:false,isError:false})).toEqual({failed:false,willContinue:true})
  })

  it.each(['stop','length','content-filter','error','other',undefined] as const)('ends a successful logical turn for %s',finishReason=>{
    expect(replyRunResult(finishReason,{isAbort:false,isDisconnect:false,isError:false})).toEqual({failed:false,willContinue:false})
  })

  it.each([
    ['abort',{isAbort:true,isDisconnect:false,isError:false}],
    ['disconnect',{isAbort:false,isDisconnect:true,isError:false}],
    ['error',{isAbort:false,isDisconnect:false,isError:true}],
  ] as const)('ends the logical turn on %s even when the tool call looks continuable',(_name,result)=>{
    expect(replyRunResult('tool-calls',result)).toEqual({failed:true,willContinue:false})
  })
})
