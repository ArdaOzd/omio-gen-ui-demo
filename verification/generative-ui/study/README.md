# Automated twelve-family matrix

The plan's minimum machine matrix has96cells: twelve shared task families × A/B × cold/warm × fixed/withheld wording. Budgets are declared before the first live run:180seconds per HTTP model call,600seconds per visible turn with tool continuations, and1800seconds per complete cell including prerequisites, cancellation and retry. These are recording safety limits, not claims about good latency. Each pair runs in counterbalanced order, with at most three independent browser contexts active. There are no extra statistical repetitions beyond the two required wordings.

Dry-run preparation makes no model calls:

```sh
npm run experiment:live -- --dry-run
node --test verification/generative-ui/study/matrix.test.mjs
```

After the live user bug is resolved, run against the stable local demo:

```sh
OMIO_APP_REVISION=<frozen-preview-commit> OMIO_SOURCE_VERSION=<verified-source-version> OMIO_FIXTURE_ROWS=10000000 OMIO_DEMO_URL=http://127.0.0.1:5194 OMIO_SCENARIOS=all OMIO_CONCURRENCY=3 npm run experiment:live
```

`OMIO_EXPERIMENT_OUTPUT` selects an evidence directory; `OMIO_SCENARIOS` selects a comma-separated subset for a targeted verification. Each cell retains its source/tool events, request sizes and compact snapshots, worker timings and result sizes, screenshot, trace, state, outcome and failure reason. The result index is updated after every cell. The frozen preview commit is required before live calls. Existing completed cell records from that same commit and matrix are resumed, including failures, so a targeted first batch and subsequent full run do not create extra model repetitions. Use a new output directory when changing the tested app or rerunning a failed cell; preserve the previous corpus.

Cold means a fresh browser and worker with no restored coverage descriptors. Warm means the same normalized London–Paris coverage is actually loaded and restored before the task; it does not replay a scene or use a separate layout model. The SQLite source and signed-in provider process are shared. Later-turn task prerequisites are recorded separately; their follow-up context is naturally warm in both conditions.

The live model remains signed-in Codex `gpt-6.1-sol` with high reasoning. The provider does not expose token usage or a supported model seed; those values stay null. Browser worker memory is also unavailable through the Worker API. A runtime wording seed is recorded separately from any model seed.

Families7–12 exercise actual controls, a delayed older fare response, editing during an active stream, independent artifacts over shared resources, complete and genuinely bounded partial-resource reloads, cancellation and native retry. Naturally invalid outputs and repair events remain in the corpus. The explicit invalid-source/one-repair boundary also has separate deterministic regressions; a successful cancellation/retry cell does not claim that a new invalid live model response was elicited.

No human ratings are collected or fabricated by this runner. A missing control, unsupported scene, timeout, model failure or state mismatch is retained as a failed cell. Screenshots and traces may be large; all evidence stays in the repository workflow without external analytics.

Pin source identity and row count from the authoritative `/api/health` response. The runner verifies them before starting, before and after each cell, and every five seconds while running. Drift stops new cells and aborts active browser contexts; affected samples are retained as failures and explicitly excluded from comparison. Resume accepts only records from the same frozen source generation and app commit. Three independent browser contexts run against one unchanged preview, SQLite fixture and signed-in provider, with no competing model calls, builds or graph refreshes.
