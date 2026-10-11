import {
  LookupPinsResponseSchema,
  QueryGroupsResponseSchema,
  type LookupPinsRequest,
  type LookupPinsResponse,
  type QueryGroupsRequest,
  type QueryGroupsResponse,
} from '../contracts/query-groups'
import { ServerQueryError, type ServerQueryClient } from './server-query-client'
import { createStaticQueryEngine } from './static-query-engine'
import type { StaticWorkerRequest, StaticWorkerResponse } from './static-query-protocol'

export interface StaticQueryWorker {
  postMessage(message: StaticWorkerRequest): void
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
  terminate(): void
}

export type StaticQueryClientOptions = {
  baseUrl: string | URL
  maxCachedOrigins?: number
  arrivalCutoff?: string
  fetch?: typeof globalThis.fetch
  workerFactory?: () => StaticQueryWorker
}

export type StaticQueryClient = ServerQueryClient & { dispose(): void }

type Pending = {
  resolve(value: unknown): void
  reject(error: Error): void
  cleanup(): void
}

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError')
}

function workerError(error: Extract<StaticWorkerResponse, { kind: 'error' }>['error']): Error {
  if (error.name === 'ServerQueryError' && error.status !== undefined && error.code && error.requestId) {
    return new ServerQueryError(error.status, error.code, error.message, error.requestId)
  }
  if (error.name === 'AbortError') return abortError()
  const result = new Error(error.message)
  result.name = error.name
  return result
}

function directClient(options: StaticQueryClientOptions): StaticQueryClient {
  const engine = createStaticQueryEngine(options)
  return {
    queryGroups: engine.queryGroups,
    lookupPins: engine.lookupPins,
    dispose: engine.clearCache,
  }
}

function absoluteBaseUrl(value: string | URL): string {
  const fallback = typeof document === 'undefined' ? 'http://localhost/' : document.baseURI
  const resolved = new URL(value.toString(), fallback)
  return resolved.href.endsWith('/') ? resolved.href : `${resolved.href}/`
}

export function createStaticQueryClient(options: StaticQueryClientOptions): StaticQueryClient {
  if (options.fetch || (typeof Worker !== 'function' && !options.workerFactory)) return directClient(options)

  const worker: StaticQueryWorker = options.workerFactory
    ? options.workerFactory()
    : new Worker(new URL('./static-query-worker.ts', import.meta.url), { type: 'module' })
  const pending = new Map<string, Pending>()
  let disposed = false

  function receive(event: MessageEvent<unknown>): void {
    const response = event.data as StaticWorkerResponse
    if (!response || typeof response !== 'object' || !('id' in response) || !('kind' in response)) return
    const item = pending.get(response.id)
    if (!item) return
    pending.delete(response.id)
    item.cleanup()
    if (response.kind === 'error') item.reject(workerError(response.error))
    else item.resolve(response.kind === 'ready' ? undefined : response.response)
  }

  worker.addEventListener('message', receive)

  function request(message: StaticWorkerRequest, signal?: AbortSignal): Promise<unknown> {
    if (disposed) return Promise.reject(new Error('Static fare query client is disposed.'))
    if (signal?.aborted) return Promise.reject(abortError())
    return new Promise((resolve, reject) => {
      function cancel(): void {
        pending.delete(message.id)
        worker.postMessage({ kind: 'cancel', id: message.id })
        signal?.removeEventListener('abort', cancel)
        reject(abortError())
      }
      pending.set(message.id, { resolve, reject, cleanup: () => signal?.removeEventListener('abort', cancel) })
      signal?.addEventListener('abort', cancel, { once: true })
      worker.postMessage(message)
    })
  }

  const initId = crypto.randomUUID()
  const ready = request({
    kind: 'init',
    id: initId,
    baseUrl: absoluteBaseUrl(options.baseUrl),
    maxCachedOrigins: options.maxCachedOrigins,
    arrivalCutoff: options.arrivalCutoff,
  })

  async function execute<T>(
    kind: 'queryGroups' | 'lookupPins',
    payload: QueryGroupsRequest | LookupPinsRequest,
    signal: AbortSignal,
  ): Promise<T> {
    await ready
    if (signal.aborted) throw abortError()
    const id = crypto.randomUUID()
    return await request({ kind, id, request: payload } as StaticWorkerRequest, signal) as T
  }

  return {
    async queryGroups(request, signal): Promise<QueryGroupsResponse> {
      return QueryGroupsResponseSchema.parse(await execute('queryGroups', request, signal))
    },
    async lookupPins(request, signal): Promise<LookupPinsResponse> {
      return LookupPinsResponseSchema.parse(await execute('lookupPins', request, signal))
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      worker.removeEventListener('message', receive)
      worker.terminate()
      for (const item of pending.values()) {
        item.cleanup()
        item.reject(abortError())
      }
      pending.clear()
    },
  }
}
