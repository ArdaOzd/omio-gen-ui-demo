# Generative UI A/B continuation handoff

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
