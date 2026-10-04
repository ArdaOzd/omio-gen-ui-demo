import {z} from 'zod'
import {ArtifactIdSchema,DatasetIdSchema,FareFieldSchema} from '../contracts'

export const SummarizeFaresInputSchema=z.strictObject({datasetRef:DatasetIdSchema,groupBy:FareFieldSchema,artifactRef:ArtifactIdSchema.optional()})
