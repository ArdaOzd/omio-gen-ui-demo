import {
  LookupPinsRequestSchema,
  LookupPinsResponseSchema,
  QueryErrorResponseSchema,
  QueryGroupsRequestSchema,
  QueryGroupsResponseSchema,
  type LookupPinsRequest,
  type LookupPinsResponse,
  type QueryErrorCode,
  type QueryGroupsRequest,
  type QueryGroupsResponse,
} from '../contracts/query-groups'

export class ServerQueryError extends Error {
  readonly name = 'ServerQueryError'

  constructor(
    readonly status: number,
    readonly code: QueryErrorCode,
    message: string,
    readonly requestId: string,
  ) {
    super(message)
  }
}

export interface ServerQueryClient {
  queryGroups(request: QueryGroupsRequest, signal: AbortSignal): Promise<QueryGroupsResponse>
  lookupPins(request: LookupPinsRequest, signal: AbortSignal): Promise<LookupPinsResponse>
}

type Fetch = typeof fetch

async function responseBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new Error('The fare service returned an invalid response')
  }
}

function queryError(status: number, body: unknown, requestId: string): ServerQueryError {
  const parsed = QueryErrorResponseSchema.safeParse(body)
  if (parsed.success && parsed.data.requestId === requestId) {
    return new ServerQueryError(status, parsed.data.error.code, parsed.data.error.message, requestId)
  }
  return new ServerQueryError(status, 'internalError', 'The fare service could not complete the request.', requestId)
}

export function createServerQueryClient(options: { fetch?: Fetch; baseUrl?: string } = {}): ServerQueryClient {
  const fetcher = options.fetch ?? fetch
  const baseUrl = options.baseUrl ?? ''

  async function post(path: string, request: QueryGroupsRequest | LookupPinsRequest, signal: AbortSignal): Promise<unknown> {
    const response = await fetcher(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
    const body = await responseBody(response)
    if (!response.ok) throw queryError(response.status, body, request.requestId)
    return body
  }

  return {
    async queryGroups(raw, signal) {
      const request = QueryGroupsRequestSchema.parse(raw)
      const body = await post('/api/query-groups', request, signal)
      const response = QueryGroupsResponseSchema.parse(body)
      if (response.requestId !== request.requestId) throw new Error('Fare query request identity mismatch')
      if (request.expectedSourceVersion !== null && response.sourceVersion !== request.expectedSourceVersion) {
        throw new ServerQueryError(409, 'sourceChanged', 'The fare source changed. Refresh the displayed results.', request.requestId)
      }
      if (response.groups.length !== request.groups.length) throw new Error('Fare query group count mismatch')
      const requests = new Map(request.groups.map(group => [group.groupId, group]))
      for (const group of response.groups) {
        const expected = requests.get(group.groupId)
        if (!expected) throw new Error('Unexpected fare query group')
        if (group.manifest.source.sourceVersion !== response.sourceVersion) throw new Error('Mixed fare source version')
        const projectionIds = new Set(expected.projections.map(projection => projection.projectionId))
        if (group.projections.length !== projectionIds.size || group.projections.some(projection => !projectionIds.has(projection.projectionId))) {
          throw new Error('Fare query projection identity mismatch')
        }
      }
      return response
    },

    async lookupPins(raw, signal) {
      const request = LookupPinsRequestSchema.parse(raw)
      const body = await post('/api/lookup', request, signal)
      const response = LookupPinsResponseSchema.parse(body)
      if (response.requestId !== request.requestId) throw new Error('Fare lookup request identity mismatch')
      if (response.sourceVersion !== request.sourceVersion) {
        throw new ServerQueryError(409, 'sourceChanged', 'The fare source changed. Refresh the displayed results.', request.requestId)
      }
      const requested = new Set(request.pins.map(pin => `${pin.resourceKey}\u0000${pin.fareId}`))
      if (response.missingPins.some(pin => !requested.has(`${pin.resourceKey}\u0000${pin.fareId}`))) {
        throw new Error('Unexpected missing fare pin')
      }
      return response
    },
  }
}
