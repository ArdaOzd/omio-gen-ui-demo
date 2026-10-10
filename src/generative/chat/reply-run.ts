import type { FinishReason } from 'ai'

export function replyRunResult(finishReason:FinishReason|undefined,result:{isAbort:boolean;isDisconnect:boolean;isError:boolean}){
  const failed=result.isAbort||result.isDisconnect||result.isError
  return{failed,willContinue:!failed&&finishReason==='tool-calls'}
}
