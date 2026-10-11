# Repository workflow

## Orchestration

When the current model is `gpt-6-astra`, keep Astra in the main thread as the orchestrator and decision maker. Delegate investigation, editing, commands, tests, and verification to workers. Spawn every worker with `fork_turns: "none"`, `reasoning_effort: "high"`, and an explicit model of `gpt-5.6-sol`, `gpt-5.6-terra`, or `gpt-5.6-luna`; use `gpt-5.6-sol` by default. Never assign Astra to a worker or let it reach one through inherited history. The Astra thread synthesizes results and makes final decisions.

Every other model should delegate only when the task benefits from it.

## Commit policy

Treat each verified, meaningful minimal change as a local commit boundary. Stage only task-owned files, skip empty commits, and report the commit hash or the reason an isolated commit was impossible. Push only when the user explicitly asks.

Use the branch conventions in `CONTRIBUTING.md`. Preserve unrelated working-tree changes and generated graph artifacts.

## First-open bootstrap

On the first task in a fresh clone or newly opened project, inspect the existing setup before changing it:

1. Invoke the installed `setup-pstack` skill when available. Otherwise use the pstack fallback in `.agents/skills/setup-omio-macos/SKILL.md`. Preserve valid explicit model choices, select only model slugs confirmed on the current host, and skip a rewrite when configuration is already valid. Astra worker mappings must follow the orchestration rules above.
2. Run `code-review-graph status --repo .`. Build a missing graph with `code-review-graph build --repo .`; update a stale graph with `code-review-graph update --repo .`.
3. Check that `graphify-out/graph.json` and `graphify-out/manifest.json` exist and parse. Confirm manifest entries and graph source paths are relative to this clone and match the current source, documentation, and asset corpus. Invoke `/graphify . --update` when an existing graph is stale or carries paths from another clone; invoke `/graphify .` for a missing or invalid graph. Continue through the corpus-size warning and use local or Codex semantic extraction unless the user explicitly authorizes an external provider.

Bootstrap is complete when code-review-graph covers the current commit and Graphify's graph and manifest match the current corpus without paths from another clone. Do not repeat valid initialization.

For a new Mac, fresh clone, missing tool, broken hook, or local runtime setup, read and follow `.agents/skills/setup-omio-macos/SKILL.md`. That skill owns portable installation and verification. Derive paths from the clone and command discovery; never copy another developer's absolute paths, uv environment, or generated interpreter sidecars.

## Architecture contracts

- `backend/` owns the deterministic synthetic timetable, SQLite generation and verification, and the fixed HTTP query API. `backend/README.md` is the API contract.
- `src/generative/contracts/` owns the strict shared domain and wire schemas. Keep these modules independent of React and transport details.
- `src/generative/catalog/` owns the agent-visible component vocabulary, composition metadata, and fixed component functions. `src/generative/catalog/generated/` is derived output; update it through the catalog generator and verify it with `npm run check:catalog`.
- `src/generative/data/` owns bounded host-side query coordination. `src/generative/state/` owns browser-local artifact, selection, display, and persistence state. The model composes registered components from compact route and selection context; it does not receive arbitrary SQL, arbitrary query trees, or the full fare corpus.
- `agent/` owns request validation, prompt assembly, model execution, repair, and scene completion. The host owns query execution and validates every model-produced tree at the boundary.
- The classic search and generative interface share the synthetic fare database and fixed backend query contracts. Keep the selected-fare tracker independent of scene replacement. Completed scenes remain inert snapshots; only the newest accepted scene is active where ownership overlaps.
- Booking controls have explicit artifact and leg ownership. Preserve the source-bound dataset, cursor, result, and inspection identities documented in `docs/server-driven-generative-ui-implementation-plan.md`.

The local runtime has three loopback services: the Python fare API, the Node/TypeScript model agent, and Vite. `scripts/run.mjs` is the source of truth for startup, health checks, ports, ownership, and shutdown. `package.json` is the source of truth for commands.

`data/omio.sqlite3` is a generated, ignored local artifact. The canonical seed contains 50,000,000 fares and is expensive to regenerate. Use small temporary fixtures in tests. Run `npm run seed` only when the task requires the full database or the launcher reports an incompatible contract; verify a full artifact with `python3 -m backend.verify_db data/omio.sqlite3 --expected-rows 50000000`. Keep databases, `node_modules/`, build output, incidental local captures, and machine-specific paths untracked. Commit screenshots or public assets only when the task requires them and they contain no personal data.

## Knowledge graphs

- For code structure, callers, dependencies, change impact, and reviews, start with `code-review-graph status --repo .`, then call the MCP `get_minimal_context_tool` before broad source searches. Use `query_graph_tool`, `get_impact_radius_tool`, or `detect_changes_tool` as the task requires.
- For project-wide questions spanning source, documentation, or assets, query `graphify-out/graph.json` before scanning files. Use `graphify query`, `graphify path`, `graphify explain`, or `graphify affected` for the matching question.
- Use graph results to narrow direct reads. Verify behavior in source and relevant tests before editing or concluding; source wins when a graph is stale or incomplete.
- After code changes, run `code-review-graph update --repo .` and `graphify update .`. After documentation or asset changes, invoke `/graphify . --update` with local or Codex extraction. Preserve existing graph edits and coordinate refreshes when another task owns those files.

## Library documentation and diagrams

Use Context7 for current library, framework, SDK, API, CLI, and cloud-service documentation. Resolve the exact `/org/project` library ID first unless the user supplied one, then query one concept per call. Use repository source for business logic, reviews, and refactors.

Use the global `archify` skill for architecture, workflow, sequence, data-flow, and lifecycle diagrams. Follow its typed JSON, repository-evidence, validation, and delivery workflow.

## Verification

Run the smallest checks that prove the changed behavior, then the relevant boundary checks:

- TypeScript or React: focused Vitest, `npm run typecheck`, and `npm run check:catalog` when catalog inputs or generated outputs change.
- Python backend or database contracts: focused `unittest`; use `python3 -m unittest discover -s backend/tests -v` for the full backend boundary.
- User-visible flows or responsive layout: `npm run test:browser` or the focused Playwright case, then inspect the real desktop and narrow-mobile result.
- Runtime integration: start the canonical runner and check `/api/health`, `/api/agent/health`, and the affected browser flow.
- Release-facing changes: `npm test` and `npm run build` in addition to the focused checks.

Do not regenerate the 50-million-row database merely to run unit tests. Report checks that were skipped because a required local artifact, login, or browser was unavailable.
