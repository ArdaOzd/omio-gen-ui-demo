# QueryIR nullable predicate semantics

QueryIR accepts null only for fields declared nullable in every selected source manifest. Existing manifests declaring fields nonnullable still reject null; adding optional display labels does not weaken the full-fare privacy boundary.

`eq` and `neq` use null-safe equality and inequality. An omitted legacy carrier label is normalized to null, so `carrierName eq null` selects both omitted and explicit null labels. `in` uses the same equality semantics for each bounded member, including null. Mixed incompatible scalar types remain rejected.

`contains`, `gte`, `lte` and `between` require compatible nonnull predicate operands. A null row value never satisfies an ordered comparison. The existing number/date restriction and ordered pair bounds remain unchanged. Null sorting is separate: ascending places null last and descending places null first, with deterministic tie ordering. Projection preserves null rather than substituting invented display data.

The independent DuckDB oracle must compile null-safe equality as `IS NOT DISTINCT FROM`, inequality as `IS DISTINCT FROM`, and list membership as a bounded disjunction of null-safe comparisons. SQL `= NULL` is not an equivalent implementation. SQL order clauses specify `NULLS LAST` or `NULLS FIRST` explicitly. Parameters are bound through prepared statements.

References: [DuckDB NULL semantics](https://duckdb.org/docs/stable/sql/data_types/nulls.html), [DuckDB prepared statements](https://github.com/duckdb/duckdb-wasm/blob/main/packages/duckdb-wasm/README.md).
