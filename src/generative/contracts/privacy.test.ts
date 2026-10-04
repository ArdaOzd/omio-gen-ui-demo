import { describe, expect, it } from 'vitest';
import { AgentContextEnvelopeSchema, CoverageSchema, DatasetIdSchema, QueryIRSchema, parseAgentContext, CoverageRequestSchema } from './index';
import { assertNoBulkData, LEAKAGE_SENTINEL } from './privacy';
describe('model and persistence boundaries', () => {
  it('rejects unknown keys at every snapshot level', () => {
    expect(AgentContextEnvelopeSchema.safeParse({schemaVersion:'1.0.0',turnId:'t1',artifacts:[],datasets:[],selectedFareFacts:[],rows:[]}).success).toBe(false);
    expect(parseAgentContext({schemaVersion:'1.0.0',turnId:'t1',artifacts:[],datasets:[],selectedFareFacts:[]})).toMatchObject({turnId:'t1'});
  });
  it('rejects invalid ids, complete truncated coverage and unknown active artifact', () => {
    expect(DatasetIdSchema.safeParse('<script>').success).toBe(false);
    expect(CoverageSchema.safeParse({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-02-30',to:'2026-03-01'},modes:['train'],passengers:1,complete:true,truncated:true}).success).toBe(false);
    expect(() => parseAgentContext({schemaVersion:'1.0.0',turnId:'t1',activeArtifactId:'lost',artifacts:[],datasets:[],selectedFareFacts:[]})).toThrow('Unknown active');
  });
  it('finds nested row fields and sentinel values without banning bounded ids', () => {
    expect(() => assertNoBulkData({parts:[{result:{fares:[{secret:1}]}}]})).toThrow();
    expect(() => assertNoBulkData({parts:[{text:LEAKAGE_SENTINEL}]})).toThrow();
    expect(() => assertNoBulkData({selectedFareIds:['fare-1'],children:['Section','FareCards']})).not.toThrow();
  });
  it('caps results and rejects SQL or arbitrary operator fields', () => {
    const query={version:1,sources:[{datasetRef:'dataset-1',alias:'d'}],limit:100};
    expect(QueryIRSchema.safeParse(query).success).toBe(true);
    expect(QueryIRSchema.safeParse({...query,limit:101}).success).toBe(false);
    expect(QueryIRSchema.safeParse({...query,sql:'select *'}).success).toBe(false);
  });
});

it('rejects nine passengers at the browser contract before a backend request',()=>{
 expect(()=>CoverageRequestSchema.parse({originIds:['london'],destinationIds:['paris'],dateWindow:{from:'2026-10-03',to:'2026-10-03'},modes:['train'],passengers:9})).toThrow()
})
