import { AssistantChatTransport } from '@assistant-ui/ai-sdk'
import { parseAgentContext } from '../contracts'
import { assertNoBulkData } from '../contracts/privacy'
import { projectNetworkHistory } from './history-projection'
import type { HttpChatTransportInitOptions, PrepareSendMessagesRequest, UIMessage } from 'ai'

export type SnapshotCaptureRequest = { ownerMessageId: string }

function latestUserMessageId(messages: readonly UIMessage[]): string {
  let message: UIMessage | undefined
  for (let index=messages.length-1;index>=0;index-=1) if(messages[index]?.role==='user'){message=messages[index];break}
  if (!message) throw new Error('A user message is required to capture reply context')
  return message.id
}

export function snapshotRequest<T extends UIMessage>(capture: (request: SnapshotCaptureRequest) => unknown | Promise<unknown>): PrepareSendMessagesRequest<T> {
  return async (options) => {
    const currentContext = parseAgentContext(await capture({ ownerMessageId: latestUserMessageId(options.messages) }))
    assertNoBulkData(currentContext)
    return { body: {
      ...options.body,
      id: options.id,
      messages: projectNetworkHistory(options.messages),
      trigger: options.trigger,
      messageId: options.messageId,
      metadata: options.requestMetadata,
      currentContext,
    } }
  }
}

export function createSnapshotTransport<T extends UIMessage>(options: {
  capture: (request: SnapshotCaptureRequest) => unknown | Promise<unknown>
  transport?: Omit<HttpChatTransportInitOptions<T>, 'prepareSendMessagesRequest'>
}) {
  return new AssistantChatTransport<T>({
    api: '/api/chat',
    ...options.transport,
    body: options.transport?.body,
    prepareSendMessagesRequest: snapshotRequest<T>(options.capture),
  })
}
