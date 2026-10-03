# Generative UI A/B continuation handoff

## Final stop checkpoint — 2026-10-03

The user asked to fix A's duplicated output and B's errors, ensure the fixes work, save the status for later, and stop. Those reported defects are fixed and verified in the actual saved chats. Agent work is stopped after the final integration-owner graph/identity refresh. Do not start the study, make further model calls or remove either variant without a later explicit request. No formal winner, human UX rating or 96-cell study result is claimed.

### Canonical checkout and preserved user work

Use `feature/gen-ui-ab-integration` in `/Users/ardaozdogru/.codex/worktrees/generative-spine/omio-gen-ui-demo` for the verified implementation. Product freeze: `d540b4d7c9dbaa7895dc993641f906e55d647f4b`; native acceptance evidence: `454a7fe3ca7c81d72a9ea9dc3de74d2b9c307652`, exercising product `4e7031003c2a8c11658161ca122caaf2378526fb`. Later status/graph commits do not imply another product change; read current Git and service health rather than treating this document's commit as the branch tip.

The original `/Users/ardaozdogru/projects/omio-gen-ui-demo` is preserved on `feature/gen-ui-ab-demo` at `a1c3f8f72eb617747ce458259b77b0da5285d05a`. It currently has **18 modified paths**, including the original carrier-related changes. Do not reset, clean, overwrite, stage or commit those changes as part of resuming this work:

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
