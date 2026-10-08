# Omio generative UI demo

The classic Omio-style search and conversational travel interface share a deterministic
SQLite fixture of 50,000,000 synthetic fares across 120 cities in geographic Europe.
The fixture covers every ordered city pair on every day from 2026-10-08 through
2027-12-31. Routes can contain multiple train, bus, flight, or ferry legs.
The generative interface uses native React component composition with the signed-in
Codex `gpt-6.1-sol` model at high reasoning. Direct controls query local data and do
not call the model. All schedules and fares are generated examples and are not live
or bookable inventory.

## Run locally

```sh
npm install
npm run dev
```

On macOS, you can instead double-click `Start Omio Demo.command`. It installs project packages when needed and opens the landing page. When it starts the demo, keep the Terminal window open and press Control-C there to stop it; if the demo is already running, the launcher opens it and exits.

Open [generative travel](http://127.0.0.1:5173/generative) or [classic search](http://127.0.0.1:5173/). The launcher starts three owned processes: Python fare API on 8000, model agent on 8010, and Vite on 5173. It generates the full fixture if missing and rejects stale fixtures whose schema, coverage model, location scope, or date bounds do not match the current contract. Run `npm run seed` to replace a stale fixture. Occupied ports fail explicitly; existing unrelated servers are not reused. Old `/b` and `/study` bookmarks redirect to `/generative`.

The agent uses your already signed-in local Codex CLI. No separate API key is needed. On macOS its default binary is the bundled Codex executable in `/Applications/ChatGPT.app`; set `CODEX_BINARY` to another installed Codex executable when needed. Model execution runs in an empty temporary directory with read-only isolation and shell, web, apps, plugins, MCP and delegation disabled. The service binds to loopback.

To change ports or reuse a local fixture:

```sh
API_PORT=8094 AGENT_PORT=8095 WEB_PORT=5194 OMIO_DATABASE=/absolute/path/omio.sqlite3 npm run dev
```

For a production build and local preview, run `npm start` and open `http://127.0.0.1:4173/generative`. Agent health is available at `/api/agent/health`; fare health at `/api/health`. Abort a response with Stop; Retry uses the latest local state. Saved conversations retain artifact source, descriptor requests and compact state in IndexedDB; row buffers are reloaded locally.

## Verify

```sh
npm run seed       # regenerate data/omio.sqlite3 with 50,000,000 fares
npm run typecheck
npm run check:catalog
npm test
npm run test:browser
npm run build
npm run benchmark:query # optional TS/DuckDB browser benchmark
python3 -m unittest discover -s backend/tests -v
```

Playwright uses installed Chrome. Signed-in live composition replay: `OMIO_DEMO_URL=http://127.0.0.1:5173 node verification/generative-ui/presentation/run-live.mjs`. Evidence lives in `verification/generative-ui/`; real model outputs and deterministic renderer fixtures are labeled separately. The optional TS-versus-DuckDB benchmark has its own dependency manifest under `benchmarks/query-engine/`; recorded thresholds and results are checked in.

The API contract is documented in [backend/README.md](backend/README.md), and source asset URLs are listed in [public/assets/omio/SOURCES.md](public/assets/omio/SOURCES.md). Development starts from `dev`; stable releases live on `main`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the merge flow.
