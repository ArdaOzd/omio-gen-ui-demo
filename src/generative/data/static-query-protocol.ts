import type {
  LookupPinsRequest,
  LookupPinsResponse,
  QueryErrorCode,
  QueryGroupsRequest,
  QueryGroupsResponse,
} from '../contracts/query-groups'

export type StaticWorkerInit = {
  kind: 'init'
  id: string
  baseUrl: string
  maxCachedOrigins?: number
  arrivalCutoff?: string
}

export type StaticWorkerRequest = StaticWorkerInit
  | { kind: 'queryGroups'; id: string; request: QueryGroupsRequest }
  | { kind: 'lookupPins'; id: string; request: LookupPinsRequest }
  | { kind: 'cancel'; id: string }

export type StaticWorkerResponse =
  | { kind: 'ready'; id: string }
  | { kind: 'queryGroups'; id: string; response: QueryGroupsResponse }
  | { kind: 'lookupPins'; id: string; response: LookupPinsResponse }
  | {
    kind: 'error'
    id: string
    error: { name: string; message: string; status?: number; code?: QueryErrorCode; requestId?: string }
  }
