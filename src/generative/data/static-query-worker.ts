/// <reference lib="webworker" />

import { ServerQueryError } from './server-query-client'
import { createStaticQueryEngine, type StaticQueryEngine } from './static-query-engine'
import type { StaticWorkerRequest, StaticWorkerResponse } from './static-query-protocol'

declare const self: DedicatedWorkerGlobalScope

let engine: StaticQueryEngine | undefined
const requests = new Map<string, AbortController>()
type SerializedError = Extract<StaticWorkerResponse, { kind: 'error' }>['error']

function send(response: StaticWorkerResponse): void {
  self.postMessage(response)
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof ServerQueryError) {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code,
      requestId: error.requestId,
    }
  }
  if (error instanceof Error) return { name: error.name, message: error.message }
  return { name: 'Error', message: 'Static fare query failed.' }
}

self.onmessage = async (event: MessageEvent<StaticWorkerRequest>) => {
  const input = event.data
  if (input.kind === 'init') {
    try {
      engine = createStaticQueryEngine({
        baseUrl: input.baseUrl,
        maxCachedOrigins: input.maxCachedOrigins,
        arrivalCutoff: input.arrivalCutoff,
      })
      await engine.manifest()
      send({ kind: 'ready', id: input.id })
    } catch (error) {
      send({ kind: 'error', id: input.id, error: serializeError(error) })
    }
    return
  }
  if (input.kind === 'cancel') {
    requests.get(input.id)?.abort()
    return
  }
  if (!engine) {
    send({ kind: 'error', id: input.id, error: { name: 'Error', message: 'Static fare worker is not initialized.' } })
    return
  }

  const controller = new AbortController()
  requests.set(input.id, controller)
  try {
    if (input.kind === 'queryGroups') {
      send({ kind: 'queryGroups', id: input.id, response: await engine.queryGroups(input.request, controller.signal) })
    } else {
      send({ kind: 'lookupPins', id: input.id, response: await engine.lookupPins(input.request, controller.signal) })
    }
  } catch (error) {
    send({ kind: 'error', id: input.id, error: serializeError(error) })
  } finally {
    requests.delete(input.id)
  }
}
