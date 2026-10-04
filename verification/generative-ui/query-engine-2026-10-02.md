# Browser query engine decision

Use the TypeScript module worker in production. Both candidates passed the declared 50,000 and 200,000-row workload oracles and latency limits. DuckDB was substantially faster for repeated large queries. The TypeScript worker meets this demo's bounded data needs, supports the tested cancellation and revision protocol directly, and avoids a 40 MiB MVP WebAssembly asset plus an 820 KiB DuckDB worker. The isolated DuckDB benchmark remains reproducible without adding it to production dependencies.

## Measurement

Measured 2026-10-02 with installed Chrome 154.0.8037.97, Node runner 24.7.0, Apple M2, eight cores, 24 GiB RAM, macOS Darwin 25.6.0. Local Vite port 5312 served both candidates. All worker and WASM files came from local package assets. DuckDB was pinned to `1.33.1-dev57.0` in the benchmark-only package.

`benchmarks/query-engine/thresholds.json` was saved before measurement. Limits were query p95 1,500 ms, load 15,000 ms, results 64 KiB, visible cancellation 100 ms, worker cancellation acknowledgment 500 ms, zero main-thread long tasks during normal queries, and observed JavaScript heap below 512 MiB. Ten samples were collected for each workload after ingestion. The first sample may include JIT or cache initialization. The main application was being developed concurrently, so these values are observations on this machine, not service guarantees.

| Rows | Engine | Startup + ingestion ms | top-K p95 ms | Filter p95 ms | Group p95 ms | Join p95 ms | Append 1,000 rows ms |
|---:|---|---:|---:|---:|---:|---:|---:|
| 50,000 | TypeScript worker | 229.1 | 103.9 | 47.6 | 56.3 | 91.7 | 12.1 |
| 50,000 | DuckDB-Wasm | 1,371.3 | 43.0 | 78.3 | 42.5 | 43.1 | 65.2 |
| 200,000 | TypeScript worker | 712.2 | 353.0 | 260.6 | 313.3 | 375.3 | 49.8 |
| 200,000 | DuckDB-Wasm | 1,117.6 | 27.5 | 45.5 | 21.2 | 44.8 | 35.8 |

The four queries and appended counts matched independent fixture expectations for both engines. Projection results were 236 bytes and grouped results 188 bytes. Normal query windows recorded zero main-thread long tasks. TypeScript visible cancellation was 0 to 1.4 ms; worker acknowledgment was 2.2 to 5.5 ms. DuckDB cancellation was not claimed by this comparison. Chromium CDP sampled page and worker JavaScript heap; the raw report contains every sample. This sampling does not establish total process or WebAssembly resident memory.

The complete raw [results](../../benchmarks/query-engine/results-2026-10-02.json), [Playwright trace](query-engine-2026-10-02.trace.zip), and [capture](query-engine-2026-10-02.png) are retained. The optional one-million-row stress run was not attempted. That is not a product coverage claim.

## Reproduce

```sh
npm install --prefix benchmarks/query-engine --ignore-scripts
./node_modules/.bin/vite --config benchmarks/query-engine/vite.config.ts
# In a second terminal, with the same worktree:
./node_modules/.bin/tsx benchmarks/query-engine/run.ts
```

The runner uses installed Chrome, records its exact version, captures a trace, and samples heap through CDP. Generated rerun artifacts stay in `benchmarks/query-engine/artifacts/`. The benchmark's SQL is fixed host code. Generated scenes continue to use validated QueryIR and cannot emit SQL or access network tools.

## Domain verification

The committed domain suite covers exact page exhaustion, conflicting fare identities, source-version mismatch, partial row/page limits, expired references, cancellation that detaches one coalesced subscriber, stale worker replies, independent artifacts, current-click revisions, descriptor reload for complete and partial resources, nested persistence leakage, atomic snapshots, cached direct dates, and superseded outside-coverage loads. Strict typechecking and 16 domain tests passed.

The actual Python GET API was separately verified with `tests/generative/verify-api.ts` on an owned port 18523 process. London to Paris for 2026-10-02 through 2026-10-08, two passengers, yielded 58 complete rows, five cheapest projections, and exact mode counts of 20 bus, 19 flight, and 19 train. The process was stopped by its owner. No model request was part of this verification.
