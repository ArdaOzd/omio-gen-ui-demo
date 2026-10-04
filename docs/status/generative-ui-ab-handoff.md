# Generative UI A/B continuation handoff

## Authoritative stop checkpoint — 2026-10-04

The user's latest instruction is to fix A's duplicated output and B's errors, ensure both work, save the current status for later, and **STOP**. Those reported bugs are fixed and independently verified in the actual saved user chats. Both variants remain runnable. No further model calls, matrix cells, human ratings, old PR merges or implementation expansion are authorized by this stop checkpoint. The full implementation plan is **not complete**; remaining gates below are explicit.

### Source, checkout and review identity

All relative evidence paths in this document resolve in the canonical checkout below; the original mirror contains only this handoff file.

Final verified product tree: `21e2c4ddcfac029443984bf9ef1996ffe6224327`, branch `feature/gen-ui-ab-integration`, canonical `/Users/ardaozdogru/.codex/worktrees/generative-spine/omio-gen-ui-demo`. Evidence/document/graph commits follow this product commit; read `git rev-parse HEAD` and `/api/agent/health` for the final checkpoint revision rather than treating an embedded hash as the latest tip.

Publication status: the final canonical checkpoint/evidence commits are **local and unpushed**. Automatic approval rejected the combined commit/push because it treated screenshots, local-path/status data and generated graphs as sensitive payload to an unverified remote; no push ran. Root instructed no retry or bypass under STOP. Local handoff is complete; any later publication must resolve this explicit blocker.

Original `/Users/ardaozdogru/projects/omio-gen-ui-demo` was tracked-clean at external `de8adc0` on `feature/gen-ui-ab-demo` before this one-file local documentation mirror. External `04ddaa7ea3632570b106385057f4a920660ca8fd` (carrier work) and `de8adc0` (Graphify lifecycle hooks) supersede the Oct3 eighteen-dirty-files state. Preserve those commits exactly. The original receives **only this handoff file**, a narrow local commit; it is not pushed because that would publish the two external commits. Its product tree differs from canonical. Do not reset it or blindly bulk merge its older implementation. Read current Git for the mirror commit's own revision.

PR7 boundary repairs and PR9 query/calendar/context repairs passed independent cross-review. PR10 carrier display repairs were accepted independently through `6a5fd36f1f62642cb5d8919768482a3ef88082d8` (four filter-label tests and strict TypeScript; earlier eleven carrier/compatibility tests). Independent current canonical duplication/B regression review passed sixteen targeted tests plus strict TypeScript at `57aaf08`. The exact `/review-agent` capability was unavailable; these focused reviews are not a completed replacement whole-plan review. Final `/code-review` standards/spec gate remains pending before PR1→dev.

### Actual saved A/B chats: final reload passed

The root orchestrator explicitly reloaded the actual user tabs at `http://127.0.0.1:5194` against product `21e2c4d`. For **both** variants, `JSON.stringify(messages)` and `JSON.stringify(artifactRecords)` exactly matched the fresh Oct4 baselines. No chat/model request, control edit, selection edit or storage reset occurred. Conversation diagnostics are closed. Evidence: `verification/generative-ui/root-saved-chat-proof-2026-10-04.json` (compact facts, no fare-row corpus or rewritten source).

- A: artifact `artifact-b1ab4aca-b3e1-4e3c-8b34-e282e6550669`, revision66; `fare_003796061` remains selected, Bus / **Blablacar Bus**, 07:03, €28.10; train/bus/flight preferences preserved. One FarePicker with101 options. Zero alerts, zero repeated visible "Travel data updated locally." lines, one final answer.
- B: artifact `artifact-372a6384-6768-42e0-850e-519a230e35ff`, revision17, exact3339-character authored source preserved, no fare selected. Two FarePickers each have101 options. Zero alerts, zero repeated visible local status lines, one final answer. Authoritative carrier labels render even with the genuine legacy projection that omits `carrierName`.

Do not restore historical Bus€19.98 / Train revision22 captures over these records. Same-origin IndexedDB is `omio-generative-state`, `threads`; preserve current records and stale-tab protection.

### Repairs and final checks

Completed-tool statuses fold into Completed steps without rewriting canonical message/tool history. B query/result and selection scopes use the exact current authored query and current host-owned resource generations; late results, dynamic foreign-resource escapes and unregistered host refs are rejected. Cancelled SDK loads cannot commit even when the loader ignores cancellation; cancellation releases acquired resources. Passenger controls and request contracts cap at8. A ninth distinct artifact resource returns an explicit bounded error before commit rather than reporting success with a missing descriptor. Privacy boundaries reject full camelCase/snake_case fare corpora in nested tool schemas and full FareRow object literals while retaining bounded selected facts. Context snapshots retain all owned refs (derived64 bound), export active + latest7 full artifacts plus typed compact older summaries, and preserve active refs within the24KB budget. Query sorting occurs before projection; calendar/route actions reconcile leg dates correctly.

Carrier labels come from the actual API `company` field through an optional local label and source-generation-scoped index. Stable IDs, legacy saved facts and authored B projections are preserved; releases clear labels. Missing labels use an explicit synthetic ID. No hardcoded provider names or fixture regeneration was used. Full old FareRows lacking the optional label remain prohibited at privacy boundaries.

Final checks at product `21e2c4d`: **159 Vitest tests /38 files**, strict TypeScript, byte-exact generated catalog and production build all passed. Existing third-party annotation/large-chunk advisories remain. Eight Python tests passed earlier; no backend change followed. Exact scope: `verification/generative-ui/final-checks-2026-10-04.json`.

New zero-model native carrier proof: **3/3** retained genuine A0/B0/B1 programs,390px reduced-motion Chrome, real8094 API/browser worker, zero page errors/alerts/model requests, isolated storage. Results/screenshots/reproducible runner: `verification/generative-ui/carrier-labels/`. Run `node --import tsx verification/generative-ui/carrier-labels/verify.mjs` only after a later explicit verification request; it creates isolated contexts and blocks chat requests. Historical15/15 genuine native responsive/focus cases at360/800/1280 remain `verification/generative-ui/resume-artifacts/final-native-proof/`; they exercised earlier product `4e70310`, not this final tree and not formal study cells. A historical screenshot's mojibake is a retained replay-encoding limitation; the final actual user B text is correct. No screen-reader completeness claim is made.

### Services and unchanged source

Authoritative user origin5194 serves canonical Vite and proxies fare API8094 / canonical agent8097. The final integration owner pins only agent8097 to the final checkpoint HEAD after documentation/graphs. Provider is signed-in Codex, `gpt-6.1-sol`, `reasoningEffort: high`. No model request is active. API8094 PID67786, Vite5194 PID90312 and preserved original idle agent8095 PID73337 were verified; canonical agent PID96307 is superseded by the final controlled restart. Read current health/PID, not these historical handles. Temporary carrier5198 is stopped. Other external services on5173/8000/8010 are unrelated and untouched.

```sh
curl http://127.0.0.1:5194/api/health
curl http://127.0.0.1:5194/api/agent/health
```

External fixture remains `/Users/ardaozdogru/projects/omio-gen-ui-demo/data/omio.sqlite3`,10,000,000 fares,1,598,590,976 bytes, mtime_ns1790978499798379462, source `sqlite-demo-v2-aa65e0b-5f489000-18dad574e0d82bc6`. Domain2026-01-01–2027-12-31; loaded resource windows are cache coverage, not global availability. Preserved generator_version2 still lacks newer manifest destinations/routes: provenance verifier gap remains, do not regenerate under STOP. A mistaken temporary carrier preview bootstrap created its own ignored1M scratch fixture in that isolated worktree; it never modified the external10M fixture or user chats. The owned scratch fixture is removed at shutdown.

Restart only an intentionally stopped owned service after verifying PID/port/cwd. Use independently owned processes, **not `npm run dev`** (it may bootstrap data/supervise unrelated processes):

```sh
# canonical agent only
cd /Users/ardaozdogru/.codex/worktrees/generative-spine/omio-gen-ui-demo
OMIO_APP_REVISION=$(git rev-parse HEAD) API_PORT=8094 AGENT_PORT=8097 WEB_PORT=5194 OMIO_API_URL=http://127.0.0.1:8094 OMIO_AGENT_URL=http://127.0.0.1:8097 node --import tsx agent/server.ts
# canonical Vite only, if stopped
API_PORT=8094 AGENT_PORT=8097 WEB_PORT=5194 OMIO_API_URL=http://127.0.0.1:8094 OMIO_AGENT_URL=http://127.0.0.1:8097 node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5194 --strictPort
# fare API only, if stopped; preserve the explicit external database path
cd /Users/ardaozdogru/projects/omio-gen-ui-demo
python3 -m backend.app --port 8094 --database /Users/ardaozdogru/projects/omio-gen-ui-demo/data/omio.sqlite3
```

Full local code-review graph rebuild completed (156 files,1454 nodes,13723 edges). Graphify local AST refresh completed (1315 nodes,2685 edges,0 dangling edges); all283 pre-existing document/asset nodes were retained. Both knowledge graphs receive a bounded local code/AST refresh. Existing semantic nodes are preserved; changed document/image semantic extraction is **pending** under STOP, with no semantic model calls. Shared external Graphify hooks are skipped for these narrow commits (`GRAPHIFY_SKIP_HOOK=1`) so original graph files are not rewritten. Historical untracked failed screenshots/debug directories and Graphify label caches remain preserved separately from task commits.

### PRs, parked work and remaining plan gates

Actual GitHub MERGED states (not merely closed): PR7→`1b1a263`, PR9→`782d3a5`, PR2→`21f0011`, PR4→`57aaf08`, PR10→`21e2c4d`. PR2/4 reconciliation preserved the tested latest tree and their unique evidence; no blind ours/force resolution. Origin/dev `dc14f22` is already an ancestor. **PR1→dev is still open draft**; dev/main have not received final integration. PR3 B (`0bbc274`) and PR6 catalog (`803e1a0`) remain open draft; patch-equivalent functionality is integrated but their remaining unique changes/ancestry must be audited before any later merge. PR8 study readiness is open at `52d83910866bf0a37899c2c41ebed62c6dca04c2`, held, not merged. No additional merges under STOP.

- Canonical worktree: branch `feature/gen-ui-ab-integration`; product21e2, later owned checkpoint commits; preserved untracked historical failure/debug paths and two Graphify label caches.
- Boundary worktree `gen-ui-boundary-repairs`: branch `fix/gen-ui-boundary-guards`,434e54d, PR7 merged; untracked dependency symlink.
- Carrier worktree `gen-ui-carrier-labels`: branch `fix/gen-ui-carrier-labels`,6a5fd36, PR10 merged; proof copied to canonical, dependency symlink retained.
- Audit `gen-ui-review-repairs`: branch `feature/gen-ui-catalog-stories`, local/unpushed `52bff8c4073c8c2fa1deccfcc372ecb02645baf7`. Eight verification-only story files are **committed**, tracked clean; two untracked Graphify labels. Four-row native A/B FareCards smoke and standalone TypeScript passed; comprehensive P20 per-export loading/error/partial/retry/control recipe/visual sweep remains unfinished. Its5398 services are stopped.
- Study `gen-ui-study-readiness`: branch `feature/gen-ui-study-readiness`, published52d8391/PR8. Published24 offline checks and four real native cold/warm startup proofs passed with zero model calls. Preserved uncommitted modified `study/run-matrix.mjs`; new `source-analysis.mjs`, `source-analysis.test.mjs`, `source-oracle.mjs`, `task-gates.mjs`, `task-gates.test.mjs`, `verify-first-tasks.mjs`, `stop-handoff-2026-10-04.md` under `verification/generative-ui/study/`. Working-diff27 offline checks/import/diff checks and96-cell dry run passed with0 calls; new native first-task verifier was **not launched**. Its four tracked graph deltas, labels/backups and dependency symlink remain untouched. Read its stop-handoff before resuming.

Remaining gates: finish and independently review the parked study semantic assertions (actual facet predicate/result semantics; A corpus counts excluding mere hierarchy reorders; native reveal/per-leg/query privacy proof); integrate reviewed PR8 and remaining branch ancestry; complete P20 standalone stories; implement/verify declared-nullable-field predicate semantics (new optional carrierName currently normalizes output null but input null predicates remain rejected; plan507 gap); refresh/document changed semantics; rerun justified engine benchmarks against final nullable-label projection (historical50k/200k results are not this HEAD); resolve source-manifest provenance gap without changing the fixture silently; complete requested whole-plan review standards/spec evidence and source/runtime freeze. Then, only after a new user resume, collect the declared96-cell matrix, genuine blinded interactive human UX review across all six dimensions, P52 recommendation/selection and human acceptance. **None of the formal96 cells or human ratings is collected; no winner or framework removal is claimed.**

On later resume, read current Git/services and this checkpoint first, preserve original external history and saved chats, inspect parked failures rather than assuming green historical evidence applies to the new head, and keep both A/B runnable. Do not continue automatically from the historical instructions below.

## Superseded historical checkpoint (2026-10-03)

Everything below is retained for provenance. Its dirty-original, source/PR/PID, carrier fallback and service bootstrap statements are obsolete and superseded by the Oct4 checkpoint above.

## Final stop checkpoint — 2026-10-03

The user asked to fix A's duplicated output and B's errors, ensure the fixes work, save the status for later, and stop. Those reported defects are fixed and verified in the actual saved chats. Agent work is stopped after the final integration-owner graph/identity refresh. Do not start the study, make further model calls or remove either variant without a later explicit request. No formal winner, human UX rating or 96-cell study result is claimed.

### Canonical checkout and preserved user work

Use `feature/gen-ui-ab-integration` in `/Users/ardaozdogru/.codex/worktrees/generative-spine/omio-gen-ui-demo` for the verified implementation. Product freeze: `d540b4d7c9dbaa7895dc993641f906e55d647f4b`; native acceptance evidence: `454a7fe3ca7c81d72a9ea9dc3de74d2b9c307652`, exercising product `4e7031003c2a8c11658161ca122caaf2378526fb`. Later status/graph commits do not imply another product change; read current Git and service health rather than treating this document's commit as the branch tip.

The original `/Users/ardaozdogru/projects/omio-gen-ui-demo` is preserved on `feature/gen-ui-ab-demo` at `a1c3f8f72eb617747ce458259b77b0da5285d05a`. It has **18 preserved external source/test modifications**, including the original carrier-related changes. Generated graph output changes are additional; inspect current Git status and preserve them separately. Do not reset, clean, overwrite, stage or commit those changes as part of resuming this work:

```text
agent/request-schema.test.ts
agent/request-schema.ts
src/generative/catalog/catalog.test.tsx
src/generative/catalog/controls/index.tsx
src/generative/catalog/primitives.test.tsx
src/generative/catalog/views/index.tsx
src/generative/contracts/index.ts
src/generative/data/data-state.test.ts
src/generative/data/search-client.test.ts
src/generative/data/search-client.ts
src/generative/data/synthetic-source.ts
src/generative/query/query-engine.test.ts
src/generative/state/action-router.test.ts
src/generative/state/persistence.test.ts
src/generative/tools/browser-tools.test.ts
src/generative/tools/browser-tools.ts
verification/generative-ui/a/spike/main.tsx
verification/generative-ui/catalog-extension/spike/main.tsx
```

Historical failed screenshots and reactive-debug directories remain untracked in the canonical worktree and are preserved separately from task-owned commits. Do not confuse them with the passing `final-native-proof/` corpus. `main` and `dev` have not received this integration. The earlier external `dev` commit `719d03ce4b4c11a9c8e882303b19e826065d032d` remains outside this work.

### Actual saved-chat verification

The root orchestrator explicitly reloaded A and B at the same user origin, `http://127.0.0.1:5194`, after `d540b4d`. Both `JSON.stringify(messages)` and `JSON.stringify(artifactRecords)` exactly matched their fresh pre-reload baselines. No chat request, model call, control edit, selection edit or storage reset occurred during this verification. The saved database remains `omio-generative-state`, store `threads`; stale-tab revision protection still applies.

- A `travel-a`: message IDs `Pw3pJQ5pgo1nOP0O` / `hRKWORyRqS730H0V`, artifact `artifact-b1ab4aca-b3e1-4e3c-8b34-e282e6550669`, revision66, start2026-10-02, modes train/bus/flight, selected `fare_003796061`. The actual selected fare remains Bus, 07:03, €28.10. Its three dataset refs and last interaction timestamp are recorded in the proof JSON. There are zero duplicated visible "Travel data updated locally." statuses, one final "Your route is set." text and no alerts.
- B `travel-b`: message IDs `ZIYSTKeS7udRK28N` / `3hAQarty9rnZu47T`, artifact `artifact-372a6384-6768-42e0-850e-519a230e35ff`, revision17, start2026-10-02, no selected fares, dataset `dataset-9ehhb5`. The exact authored source remains unchanged. Both actual FarePicker controls have101 options:100 bounded fares plus "No fare". There is one final "Your planner is ready." text, zero visible duplicated local statuses, no alerts and no false empty state after worker hydration.

Authoritative root-observed read-only evidence: `verification/generative-ui/root-saved-chat-proof-2026-10-03.json`. Do not restore the earlier Bus €19.98 or Train revision22 captures over these current records. Carrier labels currently use ID fallbacks in canonical code; the original dirty carrier-label work is intentionally preserved rather than silently integrated.

### Repairs and checks

`4e70310` fixes B's query execution and guarded selection scope: the exact current validated authored query drives both execution and freshness checks, complete fare result rows supply selection membership, current source generations are checked, deferred obsolete queries cannot overwrite newer state, and nested providers preserve trusted retry/selection capabilities. An explicit choice from a current wider authored query aligns a point-date itinerary to that fare; an explicit date window stays intact. Stale native point-date offers cannot silently change the departure. The actual focused native picker survives a valid selection. A query/view shape mismatch becomes a bounded repairable error.

`d540b4d` folds genuine completed local-tool status parts into the existing Completed steps disclosure. It preserves the raw message history, final text, authored views, pending status and failed/stale results; it does not rewrite saved conversations. Independent reviews found no actionable defect in either repair. Independent B review ran30 targeted tests plus strict TypeScript; independent disclosure review ran3 tests. The integration owner separately accepted the typed catalog RFC and additive persistence compatibility.

Final deterministic checks at `d540b4d`: **137 Vitest tests in33 files**, strict TypeScript, byte-exact generated catalog check and production build all pass. The build retains its existing large-chunk and third-party annotation advisories. Eight Python tests passed earlier; no backend code changed in these final repairs. These checks are separate from human evaluation.

The genuine native replay proof passes15/15 cases: three historical A authored trees and two B programs at360/800/1280px, current real fare API/browser worker, Chrome154.0.8037.97, unchanged10M source and zero model calls. It checks keyboard action/selection, focus, overflow, accessible names/roles, reduced motion, compact next snapshots and row-free boundaries. It is a replay of exact existing authored structures, not a new live authorship run, study cell or hands-on screen-reader review. See `verification/generative-ui/resume-artifacts/README.md` and `final-native-proof/results.json` with15 screenshots.

The required atomic `SelectedFareCount` extension and distinct SelectedItinerary/SyntheticTotal/ComparisonTable/ModeBreakdown semantics are integrated, with A/B proof and owner-reviewed RFC. DateWindow has inclusive start/end actions; local date expansion fetches coverage outside the current cache; RetryAction performs a genuine failed-resource retry. Tabs has linked tab/tabpanel semantics and keyboard navigation. Package evidence and remaining gates are indexed in `docs/implementation/generative-ui-ab-ledger.md`; extension details are in `docs/decisions/selected-fare-count-extension.md` and `docs/decisions/catalog-primitive-semantics.md`.

### Services and source identity

The user origin5194 now serves **canonical integration code**, proxies the preserved real fare API8094 and the canonical agent8097. Check health before any action:

```sh
curl http://127.0.0.1:5194/api/health
curl http://127.0.0.1:5194/api/agent/health
```

Process ownership at this checkpoint: Vite5194 PID90312 (tool session35080, canonical cwd); fare API8094 PID67786; canonical agent8097 PID90233 (session50994). The separate original agent8095 PID73337 is preserved idle. Temporary canonical preview5196 was stopped. These PIDs are observations, not permanent identifiers. The final integration owner refreshes both graphs and restarts only its canonical agent after this status commit; read health for its new PID and final declared revision. Before that restart, health reported evidence commit454a7fe. Under the user’s STOP instruction the integration owner refreshes the code-review graph and local AST graph only. Existing Graphify semantic nodes are preserved; changed document/image semantic extraction remains pending and is not claimed fresh. No semantic extraction model calls are authorized now. Provider identity is signed-in Codex, `gpt-6.1-sol`, high reasoning. No matrix/model request is active. The app remains running when agent work stops.

The external fixture remains `/Users/ardaozdogru/projects/omio-gen-ui-demo/data/omio.sqlite3`:10,000,000 fares,1,598,590,976 bytes, mtime_ns1790978499798379462; source `sqlite-demo-v2-aa65e0b-5f489000-18dad574e0d82bc6`. The source's date domain is2026-01-01–2027-12-31. A currently loaded Oct2–8 or Oct9–15 resource describes a cache window, not global source availability. Real London–Paris Oct9 has85 fares and Paris–Barcelona Oct11 has47; mode/leg availability comes from actual queries. The preserved generator_version2 fixture still lacks newer source-manifest routes/destinations; no regeneration was performed.

To restart only after the documented services have intentionally stopped, use the canonical checkout and preserve that external fixture:

```sh
cd /Users/ardaozdogru/.codex/worktrees/generative-spine/omio-gen-ui-demo
OMIO_APP_REVISION=$(git rev-parse HEAD) API_PORT=8094 AGENT_PORT=8097 WEB_PORT=5194 OMIO_DATABASE=/Users/ardaozdogru/projects/omio-gen-ui-demo/data/omio.sqlite3 npm run dev
```

Verify ports/process ownership first; do not start a second server on occupied ports. Stop an owned supervised command with Ctrl-C, or verify `ps -p <pids> -o pid,ppid,command` before terminating only documented service processes. Do not broadly kill Codex/browser processes or the preserved original agent.

### Branches, PRs and later resume

Open draft PRs: [integration1](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/1) `feature/gen-ui-ab-integration` → `dev`; [A2](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/2) `feature/gen-ui-a-compat` head6a49838; [B3](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/3) `feature/gen-ui-b-adapter` head0bbc274; [protocol4](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/4) `fix/gen-ui-tool-continuation` head723d91c; [catalog6](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/6) `feature/gen-ui-catalog-extension` head803e1a0. PR2/3/4/6 target integration. The catalog source units are integrated as762eb24, a5b36f0,781ffbc,8209816 and8051854; the branch's duplicate runtime cherry-picks must not be reapplied.

[Study5](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/5) was merged into integration at235b629, merge dd332f5, on2026-10-03. **Later study preparation at `feature/gen-ui-study` heada1f7886 remains unmerged**. This preparation is not96 live cells or human ratings. P51's full twelve-family × A/B × cold/warm × fixed/withheld96-cell matrix is uncollected, as are blinded captures/hands-on human ratings and notes across the six prescribed dimensions. P52's formal evidence-based recommendation/selection and human acceptance remain pending. Both variants remain available. No framework removal is approved.

For a later explicit resume:

1. Read this checkpoint, the implementation plan, package ledger and the parked study branch's README. Check canonical/original Git state and preserve all user changes, saved chats and the fixture.
2. Verify current app/API/agent health, provider/high reasoning, authoritative10M source and actual saved-chat state before changing anything. Do not reuse obsolete status captures or assume cache coverage equals source coverage.
3. Review the unmerged study preparation against the final frozen product, retaining historical failures. Recheck its native action/coverage fault tests and runtime identity preflight with zero model calls before authorizing a run.
4. Only after a new explicit study request, freeze a verified source/fixture/runtime and run the declared96-cell matrix. Keep failures, exact sources and machine gates separate from genuine human review. Do not fabricate human scores or a winner.
5. Refresh canonical graphs as required by AGENTS.md and verify source behavior directly when graph metadata is stale. Any eventual integration into dev, formal selection or framework removal requires the appropriate later user decision.

## Historical checkpoint before the resumed repair

The following retained record is historical. Its frozen revisions, clean-original claim, PIDs, old selected fares and all-open-PR statement are superseded by the final stop checkpoint above. Keep its evidence links for provenance; do not execute its obsolete resume instructions without checking current state.

Status: reported errors fixed and verified; agent work stopped at the user's request. The 96-cell study is paused. Both variants remain available; no study winner or human rating is claimed.

## Start here

1. Read this file and `docs/plans/generative-ui-ab-implementation-plan.md`.
2. Check `git status --short`, `git branch --show-current`, and `git log -5 --oneline`. Preserve user files and the external SQLite fixture.
3. Check the existing preview before starting another server: `curl http://127.0.0.1:5194/api/health` and `curl http://127.0.0.1:5194/api/agent/health`.
4. Open `http://127.0.0.1:5194/a` or `/b`. Do not reset IndexedDB or replace the current conversation with an older evidence capture.

The integration branch is `feature/gen-ui-ab-integration`, managed checkout `/Users/ardaozdogru/.codex/worktrees/generative-spine/omio-gen-ui-demo`. Original checkout: `/Users/ardaozdogru/projects/omio-gen-ui-demo`. `dev` and `main` remain unmerged. A newer external local `dev` commit `719d03ce4b4c11a9c8e882303b19e826065d032d` was discovered during handoff and is preserved untouched on `dev`; it was not reset or merged into this demo branch. Frozen runtime code: `a36f4340bf66219ff7c6e1205cc216e7c71865b8`. Evidence/docs commits follow it. The original checkout passed `npm ci --no-audit --no-fund`, `npm run typecheck` and `npm run build` with matching locked dependencies; its task branch is clean. The original checkout is handed off on `feature/gen-ui-ab-demo` at the final integration commit; use `git rev-parse HEAD` for that exact docs-inclusive revision.

## Runtime

Signed-in Codex uses `gpt-6.1-sol` with high reasoning. No Google API key is needed. The provider isolates model processes and uses genuine app-server delta events. Existing preview ports are web 5194, fare API 8094, agent 8095. Verified PIDs: web 55968, API 54609, agent 59406. Agent health reports the frozen source revision; later evidence/docs commits do not change the running app. Independent tool sessions: web 2198, API 9277, agent 11682. No study/model request remains active.

To resume after the existing services have been intentionally stopped:

```sh
cd /Users/ardaozdogru/projects/omio-gen-ui-demo
npm ci
OMIO_APP_REVISION=$(git rev-parse HEAD) API_PORT=8094 AGENT_PORT=8095 WEB_PORT=5194 OMIO_DATABASE=/Users/ardaozdogru/projects/omio-gen-ui-demo/data/omio.sqlite3 npm run dev
```

Stop that supervised command with Ctrl-C. For the current independently running preview, verify exact process ownership with `ps -p <pids> -o pid,ppid,command` before sending SIGTERM to its documented web/API/agent PIDs. Do not broadly kill Codex or browser processes. The app is deliberately left running when agent work stops.

## Saved user conversations

The origin `http://127.0.0.1:5194` uses IndexedDB `omio-generative-state`, store `threads`, keys `travel-a` and `travel-b`. Other origins have separate storage. Record revisions reject stale-tab overwrites; reload a stale tab before editing its conversation.

- A: active artifact `artifact-b1ab4aca-b3e1-4e3c-8b34-e282e6550669`; user `Pw3pJQ5pgo1nOP0O`; assistant `hRKWORyRqS730H0V`; captured revision 5, bus-only and selected `fare_003796057` (€19.98).
- B: active artifact `artifact-372a6384-6768-42e0-850e-519a230e35ff`; user `ZIYSTKeS7udRK28N`; assistant `3hAQarty9rnZu47T`; captured revision 5; accepted programRevision 3/source 3339 characters, tool `61f37f07-cc25-41d5-b175-3f4103dd09e1`; no fare selected.

Both current prompts concern London/Paris/Barcelona with two/four-night stays. An earlier Barcelona/Prague/Paris conversation was captured in the original root CUA session as 110K JSON; the full capture is transient, not an archived disk record. Its exact accepted source and diagnostic evidence are committed under `verification/generative-ui/b/user-itinerary/`. Do not restore it over the current London trip. The DEV diagnostics details expose a readonly `Conversation diagnostics` textarea for exact inspection/copying without a storage reset.

## Fixture identity and limitations

The externally regenerated fixture is preserved:10,000,000 fares, 1,598,590,976 bytes, mtime_ns 1790978499798379462. Its authoritative source version is `sqlite-demo-v2-aa65e0b-5f489000-18dad574e0d82bc6`; API health, metadata and searches agree. Health uses metadata and file stats rather than scanning 10M rows. A changed source during a read produces 503 `source_changed` instead of mixed facts.

Read-only verification confirms exact row count, metadata count, complete route-day coverage, positive fare facts, SQLite integrity and required indexes. The complete verifier then fails the newer repository source-manifest requirement: this preserved generator_version2 fixture lacks six newly listed US destinations and newer routes/providers. No regeneration or hidden seed update was performed. Actual counts are163 locations / 472 directional routes / 91 companies. Requested coverage modes do not prove availability; missing synthetic legs/modes must be explained from actual compact counts/query results.

Legacy source descriptors refresh without dropping messages, authored source, active artifact or preferences. Affected old selections may be conservatively cleared with an explicit notice where old fare identity cannot be proved. Temporary API/resource failure keeps the saved conversation untouched and exposes a retry instead of mounting an empty replacement conversation.

## Completed checks and evidence

At frozen code `a36f434`: 108 Vitest tests in 29 files, strict TypeScript, byte-exact generated catalog, production build, 8 Python tests and 7 Chrome 154 responsive/classic-shell tests pass. Browser scope is labels/focus/overflow and classic welcome controls; the test frontend’s default API 8000 emitted connection-refused diagnostics, so those shell checks do not prove real searches. Real API/resource evidence is separate.

Final root saved-chat reload preserves the exact current A/B message/artifact IDs: A Bus/€19.98 selection and B source 3339 characters / full 193-character Callout survive; Completed steps is initially closed, expanding it preserves selection. Historical HMR AbortError logs remain; no historical-log-buffer-empty claim is made. See `verification/generative-ui/root-saved-chat-reload.json`.

Final genuine A completion: five HTTP 200 responses, one native accepted `{}` presentation, full three-city map / stays 0/2/4, final text-only response and six seconds quiet, zero page errors. Final B follow-up: two HTTP 200 responses, typed state edit then `none`/stop, with the exact existing 5409-character source replayed; this is a completion/replay proof, not a newly authored B graph. Both use the same frozen source and unchanged fixture. Screenshots and full results are committed.

Important evidence entry points:

- `verification/generative-ui/a/user-conversation/`: final genuine completion script/result/screenshot.
- `verification/generative-ui/b/user-itinerary/post-completion-fix/`: final genuine state-edit completion and exact-source replay screenshots.
- `verification/generative-ui/final-checks.json`: precise final gates and their scope.
- `verification/generative-ui/a/live/README.md`: three real native arrangements.
- `verification/generative-ui/b/live/`: two real authored reactive graphs and exact-source data replays.
- `verification/generative-ui/b/user-itinerary/`: actual user-source, unavailable-mode, Callout, continuation-loop and source-migration regressions; historical failures are retained.
- `verification/generative-ui/query-engine-2026-10-02.md`: predeclared 50k/200k worker benchmarks; TypeScript selected, DuckDB faster on repeated analytics with larger startup cost.
- `verification/generative-ui/codex-provider.md`: provider isolation and genuine streaming evidence.

Review PRs remain open and unmerged: [integration1](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/1), [A2](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/2), [B3](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/3), [protocol4](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/4), [study5](https://github.com/ArdaOzd/omio-gen-ui-demo/pull/5).

## Resume later

Do not automatically start more model calls. First verify the current chat/error state and runtime revision. Read the retained failures before interpreting a passing fixture as a completed real conversation. P00–P03/P10–P13/P20–P23/P30–P32/P40–P42 engineering is implemented with representative evidence. P50 has a harness/form. P51’s full 12-family cold/warm counterbalanced machine matrix and human UX ratings have not run; none of its 96 cells is collected. P52’s formal evidence-based selection has not been performed. These phases are paused at the user’s explicit request. The offline study runner remains separate on `feature/gen-ui-study` / PR5, head `ee6e2f5`; five offline checks and its 96-cell dry run pass. It uses per-HTTP 180s, visible-turn 600s and cell 1800s bounds. After an explicitly authorized resume, rebase the study worktree onto the verified final code and run with `OMIO_APP_REVISION=<verified-source-hash> OMIO_SOURCE_VERSION=sqlite-demo-v2-aa65e0b-5f489000-18dad574e0d82bc6 OMIO_FIXTURE_ROWS=10000000 OMIO_DEMO_URL=http://127.0.0.1:5194 OMIO_SCENARIOS=all OMIO_CONCURRENCY=3 npm run experiment:live`. require explicit matching app revision and current authoritative fixture version before resuming. Keep machine observations separate from human scores and retain both variants unless the user later chooses otherwise.
