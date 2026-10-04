# Automated twelve-family matrix

Status: parked at the user’s explicit request to fix the current errors, document the remaining work and stop. No live matrix cells have run. The offline runner and its five tests are retained on `feature/gen-ui-study` (PR5); this is preparation, not completed P51 evidence. Do not start the command below without a later request to resume the study.

The plan's minimum machine matrix has96cells: twelve shared task families × A/B × cold/warm × fixed/withheld wording. Budgets are declared before the first live run:180seconds per HTTP model call,600seconds per visible turn with tool continuations, and1800seconds per complete cell including prerequisites, cancellation and retry. These are recording safety limits, not claims about good latency. Each pair runs in counterbalanced order, with at most three independent browser contexts active. There are no extra statistical repetitions beyond the two required wordings.

Dry-run preparation makes no model calls:

```sh
npm run experiment:live -- --dry-run
node --import tsx --test verification/generative-ui/study/*.test.mjs
```

For a later authorized study, first rebase this branch onto the verified integration revision, read `docs/status/generative-ui-ab-handoff.md`, check both health endpoints and pin the served app revision and fixture identity. Then run against the stable local demo:

```sh
OMIO_APP_REVISION=<frozen-preview-commit> OMIO_SOURCE_VERSION=sqlite-demo-v2-aa65e0b-5f489000-18dad574e0d82bc6 OMIO_FIXTURE_ROWS=10000000 OMIO_DEMO_URL=http://127.0.0.1:5194 OMIO_SCENARIOS=all OMIO_CONCURRENCY=3 npm run experiment:live
```

`OMIO_EXPERIMENT_OUTPUT` selects an evidence directory; `OMIO_SCENARIOS` selects a comma-separated subset for a targeted verification. Each cell retains its source/tool events, request sizes and compact snapshots, worker timings and result sizes, screenshot, trace, state, outcome and failure reason. The result index is updated after every cell. The frozen preview commit is required before live calls. Authoritative agent health must match that revision, signed-in Codex, gpt-6.1-sol and high reasoning; recorded provider fields come from that verified response. Add `-- --preflight` to the npm command for a health-only check with zero model calls and no browser contexts. If the tsx CLI socket is restricted, use `node --import tsx verification/generative-ui/run-experiment.ts --preflight` or `--dry-run`. Existing completed cell records from that same commit and matrix are resumed, including failures, so a targeted first batch and subsequent full run do not create extra model repetitions. Use a new output directory when changing the tested app or rerunning a failed cell; preserve the previous corpus.

Cold means a fresh browser and worker with no restored coverage descriptors. Warm means the same normalized London–Paris coverage is actually loaded and restored before the task; it does not replay a scene or use a separate layout model. The SQLite source and signed-in provider process are shared. Later-turn task prerequisites are recorded separately; their follow-up context is naturally warm in both conditions.

The live model remains signed-in Codex `gpt-6.1-sol` with high reasoning. The provider does not expose token usage or a supported model seed; those values stay null. Browser worker memory is also unavailable through the Worker API. A runtime wording seed is recorded separately from any model seed.

Families7–12 exercise actual controls, a delayed older fare response, editing during an active stream, independent artifacts over shared resources, complete and genuinely bounded partial-resource reloads, cancellation and native retry. Naturally invalid outputs and repair events remain in the corpus. The explicit invalid-source/one-repair boundary also has separate deterministic regressions; a successful cancellation/retry cell does not claim that a new invalid live model response was elicited.

No human ratings are collected or fabricated by this runner. A missing control, unsupported scene, timeout, model failure or state mismatch is retained as a failed cell. Screenshots and traces may be large; all evidence stays in the repository workflow without external analytics.

Pin source identity and row count from the authoritative `/api/health` response. The runner verifies fixture and runtime identity before starting, before and after each cell, before forwarding every chat HTTP request, and every five seconds while running. Drift stops new cells and aborts active browser contexts; affected samples are retained as failures and explicitly excluded from comparison. Resume accepts only records from the same verified runtime configuration, frozen source generation and app commit. Three independent browser contexts run against one unchanged preview, SQLite fixture and signed-in provider, with no competing model calls, builds or graph refreshes.

The original whole-cell definition above remains authoritative. Every new record declares `conditionScope: whole-cell-start` and records row-free worker registrations at initial startup, before the first model request and before the target request. Initial contexts must contain no resources; cold first requests must still contain none; warm first requests require observed ready rows from the pinned source. Later-turn target phases must contain real prerequisite resources and are explicitly marked naturally warm in both conditions. Prerequisite, target response, task actions, warm setup and whole-cell timings are separate.

`run-environment.json` is created once before model calls and linked by ID from cells and corpus indexes. It records verified provider/config/source, installed package versions, lock hash, catalog version/hash, browser/runtime versions and hardware using an explicit allowlist. Changing that identity requires a new output directory. No environment dump or credential fields are collected. The study checkout must match the frozen served source.

First UI and first control timings currently detect new travel-surface mounts. A successful in-place replacement can leave these fields null. Null means that this measurement did not observe a new mount; it is not zero latency or a failed view. Source/semantic gates and captures assess the actual replacement independently.
