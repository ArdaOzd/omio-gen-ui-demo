import { describe, expect, it } from 'vitest'
import { createSnapshotTransport, snapshotRequest } from './transport'
import type { UIMessage } from 'ai'

const envelope = (turnId: string) => ({ schemaVersion: '1.0.0', turnId, artifacts: [], olderArtifactSummaries: [], datasets: [], selectedFareFacts: [] })

const messages: UIMessage[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Compare options' }] }]

describe('snapshot-aware native assistant-ui transport', () => {
  it('preserves augmented tools/system/config and complete request identity', async () => {
    const prepare = snapshotRequest(() => envelope('turn-2'))
    const options = {
      id: 'thread-1', messages, requestMetadata: { source: 'retry' },
      body: { system: 'policy', tools: { present: { parameters: { type: 'object' } } }, config: { temperature: 0 }, callSettings: { budget: 4 } },
      credentials: undefined, headers: undefined, api: '/api/chat', trigger: 'regenerate-message' as const, messageId: 'a1',
    }
    const prepared = await prepare(options)
    expect(prepared.body).toEqual({ ...options.body, id: options.id, messages, trigger: options.trigger, messageId: 'a1', metadata: options.requestMetadata, currentContext: envelope('turn-2') })
  })

  it('captures fresh state on every real send including continuation and retry', async () => {
    let revision = 1
    const requests: unknown[] = []
    const transport = createSnapshotTransport({ capture: () => envelope(`turn-${revision}`), transport: {
      fetch: async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)))
        return new Response('data: {"type":"start","messageId":"assistant-1"}\n\ndata: {"type":"finish","finishReason":"stop"}\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' } })
      },
    } })
    for (const trigger of ['submit-message', 'regenerate-message'] as const) {
      const stream = await transport.sendMessages({ chatId: 'thread-1', messages, trigger, messageId: 'a1', abortSignal: new AbortController().signal })
      await stream.pipeTo(new WritableStream())
      revision += 1
    }
    expect(requests).toMatchObject([{ currentContext: envelope('turn-1') }, { currentContext: envelope('turn-2'), trigger: 'regenerate-message' }])
  })
})
