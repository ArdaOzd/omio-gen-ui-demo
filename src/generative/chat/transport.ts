import { AssistantChatTransport } from '@assistant-ui/ai-sdk'
import { parseAgentContext } from '../contracts'
import { assertNoBulkData } from '../contracts/privacy'
import { projectNetworkHistory } from './history-projection'
import type { HttpChatTransportInitOptions, PrepareSendMessagesRequest, UIMessage } from 'ai'

export function snapshotRequest<T extends UIMessage>(capture: () => unknown): PrepareSendMessagesRequest<T> {
  return (options) => {
    const currentContext = parseAgentContext(capture())
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
  capture: () => unknown
  variant: 'a' | 'b'
  transport?: Omit<HttpChatTransportInitOptions<T>, 'prepareSendMessagesRequest'>
}) {
  return new AssistantChatTransport<T>({
    api: '/api/chat',
    ...options.transport,
    body: { variant: options.variant, ...options.transport?.body },
    prepareSendMessagesRequest: snapshotRequest<T>(options.capture),
  })
}
