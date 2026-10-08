import {
  LookupPinsRequestSchema,
  LookupPinsResponseSchema,
  QueryErrorResponseSchema,
  QueryGroupsRequestSchema,
  QueryGroupsResponseSchema,
  type LookupPinsRequest,
  type LookupPinsResponse,
  type FareScope,
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

function sameScope(left: FareScope, right: FareScope): boolean {
  return left.kind === right.kind
    && left.originId === right.originId
    && left.destinationId === right.destinationId
    && left.dateWindow.from === right.dateWindow.from
    && left.dateWindow.to === right.dateWindow.to
    && left.passengers === right.passengers
    && left.earliestDeparture.date === right.earliestDeparture.date
    && left.earliestDeparture.minutes === right.earliestDeparture.minutes
}

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
      const responseGroupIds = new Set(response.groups.map(group => group.groupId))
      if (responseGroupIds.size !== requests.size || [...requests.keys()].some(groupId => !responseGroupIds.has(groupId))) {
        throw new Error('Fare query group identity mismatch')
      }
      for (const group of response.groups) {
        const expected = requests.get(group.groupId)
        if (!expected) throw new Error('Unexpected fare query group')
        if (group.manifest.source.sourceVersion !== response.sourceVersion) throw new Error('Mixed fare source version')
        if (!sameScope(group.manifest.coverage, expected.scope)) throw new Error('Fare query scope mismatch')
        const expectedProjections = new Map(expected.projections.map(projection => [projection.projectionId, projection]))
        const projectionIds = new Set(expectedProjections.keys())
        const responseProjectionIds = new Set(group.projections.map(projection => projection.projectionId))
        if (group.projections.length !== projectionIds.size || responseProjectionIds.size !== projectionIds.size
          || [...projectionIds].some(projectionId => !responseProjectionIds.has(projectionId))) {
          throw new Error('Fare query projection identity mismatch')
        }
        if (group.projections.some(projection => expectedProjections.get(projection.projectionId)?.kind !== projection.kind)) {
          throw new Error('Fare query projection kind mismatch')
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
      const requestedFareIds = new Set(request.pins.map(pin => pin.fareId))
      const returnedFareIds = response.items.map(item => item.id)
      const missingKeys = response.missingPins.map(pin => `${pin.resourceKey}\u0000${pin.fareId}`)
      if (new Set(returnedFareIds).size !== returnedFareIds.length || returnedFareIds.some(fareId => !requestedFareIds.has(fareId))) {
        throw new Error('Unexpected looked-up fare')
      }
      if (new Set(missingKeys).size !== missingKeys.length || missingKeys.some(key => !requested.has(key))) {
        throw new Error('Unexpected missing fare pin')
      }
      const returned = new Set(returnedFareIds)
      const missing = new Set(missingKeys)
      if (request.pins.some(pin => !returned.has(pin.fareId) && !missing.has(`${pin.resourceKey}\u0000${pin.fareId}`))) {
        throw new Error('Fare lookup omitted a requested pin')
      }
      return response
    },
  }
}
