import { expect, it } from 'vitest'
import { nullableOracleCases, nullableRows } from '../../../benchmarks/query-engine/nullable-oracle'
import { createQueryEngineFixture } from '../testing/query-engine-fixture'

it('checks every nullable oracle case against fixed independent rows through manifest parsing and local execution', async () => {
  const fixture = createQueryEngineFixture(nullableRows, 'nullable-oracle')
  const cases = nullableOracleCases(fixture.datasetId)
  expect(cases.map(item => item.name)).toEqual(['eq-null', 'neq-null', 'in-null', 'neq-text', 'nested', 'asc-null-last', 'desc-null-first'])
  for (const item of cases) {
    const result = await fixture.execute(item.query)
    expect(result.rows, item.name).toEqual(item.expected)
  }
})
