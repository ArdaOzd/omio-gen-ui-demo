import { isToolUIPart,type UIMessage } from 'ai'
export function normalizeToolContinuations(messages:UIMessage[]):UIMessage[]{
 const result:UIMessage[]=[]
 for(const message of messages){
  const previous=result.at(-1)
  let sharedTool=false
  const cumulative=previous?.role==='assistant'&&message.role==='assistant'&&previous.parts.length<=message.parts.length&&previous.parts.every((part,index)=>{
   const next=message.parts[index];if(!next||part.type!==next.type)return false
   if(isToolUIPart(part)&&isToolUIPart(next)){
    if(part.toolCallId!==next.toolCallId||JSON.stringify(part.input)!==JSON.stringify(next.input))return false
    sharedTool=true;return true
   }
   return part.type==='text'&&next.type==='text'?part.text===next.text:JSON.stringify(part)===JSON.stringify(next)
  })
  if(cumulative&&sharedTool)result[result.length-1]=message;else result.push(message)
 }
 return result
}
