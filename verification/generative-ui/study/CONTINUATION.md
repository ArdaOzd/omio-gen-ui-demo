# Study continuation at requested stop

The user requested fixing the current A/B errors, recording status, then stopping. No 96-cell machine matrix run has started. No human ratings have been entered. Keep both variants available. No winner or formal P52 decision is claimed.

The study branch is `feature/gen-ui-study`, existing checkout `/Users/ardaozdogru/.codex/worktrees/gen-ui-study-harness/omio-gen-ui-demo`; its PR is https://github.com/ArdaOzd/omio-gen-ui-demo/pull/5. It safely merges the integration source and coordinated runtime/replay helper rather than rewriting published history. Use live `git rev-parse HEAD` and `git status --short --branch`; retain the existing untracked `node_modules` symlink.

Completed offline checks: runtime/fixture identity gates; 96 unique dry-run cells with no model calls; 16 study/review boundary tests; verified task date/route availability; anonymous blinded review package and human-input validation. Authoritative health must match app revision, signed-in Codex, gpt-6.1-sol and high reasoning before any call, before/after each cell, and every five seconds. Drift stops/aborts samples and excludes them. Recorded provider metadata comes from verified health. Old unverified or excluded records cannot resume.

Corrected native handler seams: native FarePicker select keyboard path alongside fare-card keyboard activation; actual `departure_date` serialized search parameter; an older fault must actually be intercepted and finish, the latest date/query must win, and obsolete coverage must not attach. Active source scope and visible data are checked against an independent bounded fare API oracle; genuine selected filters can legitimately yield zero. Real worker registrations and result scopes/counts are recorded without fare buffers. Reload resets metric offsets and proves real full hydration after a genuinely bounded five-row partial resource.

`handler-proof-2026-10-03.json` is a zero-model replay of exact recorded native **A** source over the real fixture. Local controls, delayed coverage and complete/partial reload pass. The first attempt had two failed assertions; the later in-flight narrow run passes after concurrent runtime work. This is neither a genuine machine authorship cell nor proof of B native keyboard handling. The reusable `verify-handlers.mjs` blocks model requests in separate contexts. Do not substitute replay proof for the study.

Global fixture bounds are January 2026 through December 2027. Initial task resources cover October 9–15; later October 20/22 therefore need a new browser resource even though SQLite has real rows for them. Read-only `task-coverage-2026-10-03.json` proves London→Paris has selectable train/bus/flight rows on every required day and Paris→Barcelona has train/flight rows on October 11. Ferry on London→Paris and bus/ferry on Paris→Barcelona are truly unavailable. An empty authored screenshot does not establish database absence. No database regeneration occurred.

Human review sampling was predeclared before matrix cells: 24 items, all twelve families' cold/fixed wording cells, both representations. Stable anonymous IDs alternate A/B and B/A order. Six separate 1–5 ratings use Poor/Weak/Acceptable/Good/Excellent anchors and notes; fields start null. Failed/missing cells remain honest cards. The private map and original unblinded screenshots are kept separate; public captures are explicitly blinded native replays of recorded state, not new authorship. Review requires capture inspection and hands-on work for available evidence. Isolated server/context/origin use actual native adapters, resources and worker, with model POSTs blocked.

The isolated review server successfully prepared one blinded native A capture and opened its review page from historical proof data without model calls or ratings. That test package was not a study corpus. Its supervised server was stopped; root preview services and user conversations were preserved. Complete hands-on reviewer-form verification and B replay remain pending. Do not ask for real ratings until a concrete frozen study package works.

## Resume after explicit authorization

First coordinate the final product bug/verification freeze and independent study review; require the exact served source hash and fixture from authoritative health. Root runtime ownership manages any service restart. Never assume old PIDs or ports are alive. Do not reset user IndexedDB or replace user conversation records.

Health-only preparation (no model calls):

```sh
node --import tsx --test verification/generative-ui/study/*.test.mjs verification/generative-ui/study/review/*.test.mjs
node --import tsx verification/generative-ui/run-experiment.ts --dry-run
OMIO_APP_REVISION=<verified-served-hash> OMIO_SOURCE_VERSION=sqlite-demo-v2-aa65e0b-5f489000-18dad574e0d82bc6 OMIO_FIXTURE_ROWS=10000000 node --import tsx verification/generative-ui/run-experiment.ts --preflight
PYTHONPATH=. python3 verification/generative-ui/study/verify-task-coverage.py /Users/ardaozdogru/projects/omio-gen-ui-demo/data/omio.sqlite3
```

Only after an explicitly authorized study resume and product freeze:

```sh
OMIO_APP_REVISION=<verified-served-hash> OMIO_SOURCE_VERSION=sqlite-demo-v2-aa65e0b-5f489000-18dad574e0d82bc6 OMIO_FIXTURE_ROWS=10000000 OMIO_DEMO_URL=http://127.0.0.1:5194 OMIO_SCENARIOS=all OMIO_CONCURRENCY=3 node --import tsx verification/generative-ui/run-experiment.ts
```

The budgets remain HTTP 180 seconds, visible turn 600 seconds, complete cell 1800 seconds. Pair order is counterbalanced, with three independent contexts. Preserve failed records; reuse a corpus only with matching verified source/configuration. A new frozen source requires a new evidence directory. Human review package generation/serving commands are in `review/README.md`; collect only actual reviewer entries. Refresh tracked graphs through the integration owner after merging these narrow harness files.

## Authorized resume, October 4, 2026

The user resumed the full goal. Published study preparation `a1f7886` was safely merged into a separate managed `feature/gen-ui-study-readiness` branch from current integration `6fe737e`, preserving product changes. Canonical 6fe still used the wrong API `date` parameter in the delayed fault. The readiness merge corrects `departure_date`; an inverted test rejects the original never-fired fault, incomplete completion and late overwrite. Actual date-control checks require fare rows from precisely the latest day rather than snapshot state alone.

Native proofs use exact retained authored sources, real SQLite/Worker data and isolated browser contexts, with every model request blocked. The historical B0 source has mode/fare controls and B1 has date/sort/fare controls, so handler evidence uses both sources. It does not pretend either one is a complete local-controls matrix family. The live matrix still requires every declared family action, retains failures and has not run. Review packets remain 24 predeclared cold/fixed items across all twelve families, anonymous counterbalanced rounds, six separately null dimensions, short notes, capture and hands-on tasks. Non-final engineering packets are explicitly labeled and excluded from matrix authorship.

Before study calls, integrate all approved product repairs and this study unit, independently review, rebuild/restart, then require root's explicit source freeze. Read authoritative health again and use its exact revision/provider/model/reasoning plus sourceVersion and rowCount. Run the existing `--preflight`, task coverage probe and strict native handlers before the96-cell command. Old corpus reuse is allowed only for identical verified freeze/configuration. No model matrix cells or human ratings have been collected.

Exact `/review-agent` command/skill was absent from applicable ~/.agents, ~/.codex skill/plugin and project command filenames on this date. The available `/code-review` skill is `/Users/ardaozdogru/.agents/skills/code-review/SKILL.md`; root will perform separate independent review-agent fallback and the skill's Standards/Spec reviews transparently.
