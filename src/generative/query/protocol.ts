import { z } from 'zod'
import { DatasetRevisionSchema, type DatasetId, type QueryIR } from '../contracts'
import type { QueryResource } from './query-engine'
export type WorkerRequest = {kind:'register';id:string;datasetId:DatasetId;resource:QueryResource}|{kind:'release';id:string;datasetId:DatasetId}|{kind:'query';id:string;query:QueryIR}|{kind:'cancel';id:string}
const scalar=z.union([z.string(),z.number().finite(),z.boolean()])
export const WorkerResponseSchema=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('ready'),id:z.string()}),
 z.strictObject({kind:z.literal('result'),id:z.string(),result:z.strictObject({rows:z.array(z.record(z.string(),scalar)).max(100),total:z.number().int().nonnegative(),truncated:z.boolean(),datasetRevision:DatasetRevisionSchema,requestId:z.string()})}),
 z.strictObject({kind:z.literal('error'),id:z.string(),code:z.enum(['canceled','query-failed'])}),
])
export type WorkerResponse=z.infer<typeof WorkerResponseSchema>
