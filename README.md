# Omio generative UI demo

The classic Omio-style search and two conversational travel interfaces share a deterministic SQLite fixture of 1,000,000 synthetic fares. `/a` uses native React component composition; `/b` uses authored OpenUI reactive programs. Both use the same signed-in Codex `gpt-6.1-sol` model with high reasoning. Direct controls query local data and do not call the model.

## Run locally

```sh
npm install
npm run dev
```

Open [the chooser](http://127.0.0.1:5173/generative), [A](http://127.0.0.1:5173/a), [B](http://127.0.0.1:5173/b), or [classic search](http://127.0.0.1:5173/). The launcher starts three owned processes: Python fare API on 8000, model agent on 8010, and Vite on 5173. It generates the full fixture if missing and stops its children together. Occupied ports fail explicitly; existing unrelated servers are not reused.

The agent uses your already signed-in local Codex CLI. No separate API key is needed. On macOS its default binary is the bundled Codex executable in `/Applications/ChatGPT.app`; set `CODEX_BINARY` to another installed Codex executable when needed. Model execution runs in an empty temporary directory with read-only isolation and shell, web, apps, plugins, MCP and delegation disabled. The service binds to loopback.

To change ports or reuse a local fixture:

```sh
API_PORT=8094 AGENT_PORT=8095 WEB_PORT=5194 OMIO_DATABASE=/absolute/path/omio.sqlite3 npm run dev
```

For a production build and local preview, run `npm start` and open `http://127.0.0.1:4173/generative`. Agent health is available at `/api/agent/health`; fare health at `/api/health`. Abort a response with Stop; Retry uses the latest local state. Saved conversations retain artifact source, descriptor requests and compact state in IndexedDB; row buffers are reloaded locally.

## Verify and compare

```sh
npm run typecheck
npm run check:catalog
npm test
npm run test:browser
npm run build
npm run benchmark:query # optional TS/DuckDB browser benchmark
python3 -m unittest discover -s backend/tests -v
```

Playwright uses installed Chrome. Signed-in live composition replay: `OMIO_DEMO_URL=http://127.0.0.1:5173 node verification/generative-ui/a/run-live.mjs`. Evidence lives in `verification/generative-ui/`; real model outputs and deterministic renderer fixtures are labeled separately. The optional TS-versus-DuckDB benchmark has its own dependency manifest under `benchmarks/query-engine/`; recorded thresholds and results are checked in.

For automated cold-context model recordings, use `OMIO_SCENARIOS=cheap-fast,calendar npm run experiment:live` against the running demo. Set `OMIO_SCENARIOS=all` for all twelve families; interaction/recovery families additionally require the deterministic browser tests and manual steps listed in the plan. This can consume substantial signed-in model usage.

For anonymous counterbalanced review, open `/study?participant=anonymous-01`. Both variants remain available. Ratings are entered by the human and exported locally; no winner has been chosen from machine checks.

The API contract is documented in [backend/README.md](backend/README.md), source asset URLs in [public/assets/omio/SOURCES.md](public/assets/omio/SOURCES.md), and implementation/evidence gates in [the plan](docs/plans/generative-ui-ab-implementation-plan.md). Development starts from `dev`; stable releases live on `main`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the merge flow.
