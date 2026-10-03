# Generative UI implementation ledger

Reconstructed on 2026-10-03 from repository Git objects, source/tests, committed evidence and live GitHub PR metadata. Baseline: `dc14f22`; audited final application checkout: `e30d0fefbd57fb65d0728b2330ec3f7f5b01456e`; frozen runtime source: `a36f4340bf66219ff7c6e1205cc216e7c71865b8`. Later resume commits and results must be appended by the integration owner. This reconstruction does not invent original worker identities, per-package execution times or passing results absent from retained records.

## Owners, worktrees and publication

Owner keys below identify the documented path responsibility, not an independently verified historical individual. Git attributes all inspected commits to the repository author, so exact historical agent IDs remain unrecorded.

| Owner | Exclusive paths | Branch/worktree | Published ref and review |
|---|---|---|---|
| I | root scripts/routes/dependencies, shared contracts, agent, integration docs/graphs | feature/gen-ui-ab-integration; generative-spine | PR1 to dev; draft/open; live observed head 721a0e5 |
| A | variants/a, shared catalog layouts/controls/views and A evidence | feature/gen-ui-a-compat; generative-a-compat | PR2 to integration; draft/open; head 6a49838 |
| B | variants/b and B evidence | feature/gen-ui-b-adapter; gen-ui-b-adapter | PR3 to integration; draft/open; head 0bbc274 |
| B compatibility | tests/compatibility and OpenUI spike | feature/gen-ui-b-compat; gen-ui-b-compat | no separately published PR verified |
| D | data/query/state and benchmarks | feature/gen-ui-data-state; gen-ui-data-state | no separately published PR verified; local head 1cd1edb |
| Protocol | continuation fixes and variant regression evidence | fix/gen-ui-tool-continuation; gen-ui-study | PR4 to integration; draft/open; head 723d91c |
| S | experiments/scenarios, study runner/evidence | feature/gen-ui-study; gen-ui-study-harness | PR5 to integration; draft/open; head ee6e2f5 |
| Extension | catalog descriptor/generator/shared view, native A toolkit, own tests/RFC/evidence and this ledger | feature/gen-ui-catalog-extension; gen-ui-catalog-extension | base e30d0fe; verified owned units b7006c0/28835ec/7743ecc; PR6 draft to integration |

Managed worktree roots are under `/Users/ardaozdogru/.codex/worktrees/<name>/omio-gen-ui-demo`. Original checkout remains `/Users/ardaozdogru/projects/omio-gen-ui-demo`. Integration hashes below sometimes differ from worker hashes because verified work was cherry-picked; an open PR is not evidence that it merged. The phase map records prerequisite anchors rather than guessing each worker's original creation commit. Root and shared-file edits remain the integration writer's responsibility.

PR metadata was read from GitHub on 2026-10-03; [PR6](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/6) publishes the catalog extension and semantic corrections: [PR1](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/1), [PR2](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/2), [PR3](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/3), [PR4](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/4), [PR5](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/5). Branch heads are time-specific observations.

## Every package

| Package | Owner | Prerequisite anchor | Implementation/evidence commits | Check/evidence entry | Coverage or remaining gate |
|---|---|---|---|---|---|
| P00 | I/A/B | `d7fa98e5ed05` | `655ad88a3aef`; `80a584c564b3` | Native A compatibility; OpenUI compatibility; transport/renderer tests | Representative compatibility recorded; current locked stack builds |
| P01 | I | `dc14f22f06ea` | `d7fa98e5ed05` | contracts/privacy.test.ts; request-schema tests | Boundary contracts implemented |
| P02 | I | `80a584c564b3` | `ce9b25589782`; `becdac77a478` | generate:catalog + check:catalog; catalog tests | Canonical descriptors; native A generation strengthened by extension |
| P03 | I | `dc14f22f06ea` | `d7fa98e5ed05` | Vitest/TypeScript/Playwright configurations | Unit/DOM/stream tests implemented; browser smoke scope limited |
| P10 | D | `d7fa98e5ed05` | `cc4b03d7a86f`; `ae97ef70acb4`; `d675bfabb070` | data-state/search-client tests; real API evidence | Page exhaustion, cancellation, source migration and bounded resources |
| P11 | D | `d7fa98e5ed05` | `ae97ef70acb4` | query-engine/worker-client tests; query-engine-2026-10-02.md | 50k/200k gates passed historically; optional 1M unattempted |
| P12 | D | `d7fa98e5ed05` | `cc4b03d7a86f`; `96fdeed799a1` | state/action/persistence tests; state-proof | Per-artifact revisions and descriptor reload; current-origin reload gate remains |
| P13 | I | `d7fa98e5ed05` | `d53552e7f3b0`; `5c9cd37b1a1f` | browser-tools tests; request-schema tests | Capped tools and cumulative budgets implemented |
| P20 | A/I | `ce9b25589782` | `6256bcb12779`; `2b9e28d64753` | catalog tests; a/browser-proof; responsive shell tests | Shared themes/layouts exist; full task accessibility/human review pending |
| P21 | A | `ce9b25589782` | `6256bcb12779`; `8ff3076d5f84` | catalog tests; A/B real-data replay | Shared controls update views locally |
| P22 | I | `a162a9c2bb6a` | `54fe410df48c`; `a36f4340bf66` | chat transport/continuation and agent repair/scene-completion tests | Bounded streaming; preserved conversation regressions fixed |
| P23 | I | `54fe410df48c` | `b352aafb6ef0` | run.mjs; health checks; shell/classic browser tests | Three-process launcher and neutral routes implemented; fresh runtime health required |
| P30 | A | `ce9b25589782` | `bb7c31d5f485`; `6256bcb12779` | tree/present-supersession tests; A compiler/browser proof | Bounded native recursive scenes and partial controls |
| P31 | A | `6256bcb12779` | `1b82d715a346`; `8d1bfa6c9afe` | a/live/README.md; state-proof/README.md | Three genuine arrangements; local edits and real text-only proof |
| P32 | A/D | `6256bcb12779` | `8ff3076d5f84`; `73c20f3b78bc`; `582dc53d170d` | data-state/catalog/persistence tests; multicity-proof; A browser proof | Representative depth exists; all shared hard gates await full matrix/accessibility |
| P40 | B | `6256bcb12779` | `422f32487599`; `ccec8bb330e1`; `b86c42f97f96` | B renderer/toolkit tests; OpenUI runtime compatibility | Real host adapter with variables and semantic state capture |
| P41 | B/D | `422f32487599` | `b86c42f97f96`; `a8c031fae20b`; `40cf447bbb90` | validate-program/query-engine/B renderer tests; repair tests | Bounded QueryIR/actions, preserved authored semantics and typed dates |
| P42 | B | `422f32487599` | `2f668535e696`; `5cc4dca30897` | b/live/README.md; b/user-itinerary/post-completion-fix | Two genuine graphs; exact-source real-data replay; full hard gates pending |
| P50 | S/I | `8ff3076d5f84` | `870c9e0c39f6`; `86be30925935`; `ee6e2f50785b` | scenarios.test.ts; study branch matrix/metrics tests | Basic form integrated; 96-cell runner remains study-branch work at audit |
| P51 | S | `e30d0fefbd57` | none | final-checks.json; study branch README | Zero matrix cells at original handoff; six-dimension human ratings uncollected |
| P52 | I | `e30d0fefbd57` | `2e08b9498fd5` | comparison-decision.md | Retain both record exists; formal evidence-based recommendation/human acceptance pending |

## Verification scope and remaining work

Historical aggregate gates at a36f434 are recorded in `verification/generative-ui/final-checks.json`: 108 Vitest tests/29 files, TypeScript, byte-exact catalog, build and eight Python tests. Seven Chrome browser tests prove welcome-screen labels/focus/overflow and classic welcome controls only; they do not prove real searches or all shared-task accessibility. Genuine model cases, deterministic scene replays and human ratings are distinct classifications. Full shared-task keyboard, reduced-motion, accessibility and artifact responsiveness evidence remains an integration-owner gate.

This extension worktree freshly passed 112 Vitest tests/30 files, eight Python backend tests, strict TypeScript, production build, repeated generator/check mode, and actual native A plus OpenUI B browser selection-count proof in Chrome154.0.8037.97 at360px. Runtime versions: Node24.7.0, npm11.5.1, Python3.12.0, macOS; no dependency changes. Model configuration remains signed-in Codex gpt-6.1-sol/high, but these extension tests make no model calls.

The external 10M SQLite fixture is preserved. Its recorded source is `sqlite-demo-v2-aa65e0b-5f489000-18dad574e0d82bc6`; current file stats match the handoff. Historical structural checks passed and newer source-manifest coverage failed. Replacing the fixture is not an acceptance repair.

At audit time P51 had zero96 cells and no human scores. PR5's improved runner needed integration onto final application source. The HEAD runner was cold-only prompt recording and cannot substitute for interaction tasks or the complete counterbalanced cold/warm matrix. Human review requires real participant entries, anonymous IDs, hidden framework labels, six independent dimensions and reviewer notes; agents cannot supply those ratings. There is no required minimum participant count in the plan. P52 must distinguish machine evidence, the resulting recommendation and human acceptance while retaining both variants.

The selected-fare-count RFC and actual-adapter proof close the sample extension requirement only after independent integration-owner review. Existing persisted A/B conversations need unchanged identity/source/state verification at the final served revision. Code graph metadata was stale at1e815aa and incremental update did not advance it; canonical graph rebuild/refresh belongs to the final integration owner after freeze. Graphify at audit parsed1183nodes/2070edges with no dangling endpoints.

Resume catalog evidence: owned commits b7006c0,28835ec,7743ecc introduce the count extension, distinct itinerary/price/comparison/mode views, inclusive date controls and genuine failed-coverage retry. Query-owner seams3501138/4504bc2 are present in the worker branch as5a38e59/bdce940; integrate original owner commits once. The combined worker suite passed123tests/32files and production build, followed by a focused captured genuine B source regression and uncached DateWindow expansion test. Final integration suite is still the integration owner's gate. The window test verifies new dates are fetched from the source locally; cache bounds are not global source availability.
