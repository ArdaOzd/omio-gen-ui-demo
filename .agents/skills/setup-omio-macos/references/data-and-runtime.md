# Data, runtime, and verification

Run all commands from the repository root.

## Database contract

The default dataset is synthetic and deterministic. It contains 50,000,000 fares across 120 locations, covering 2026-10-08 through 2027-12-31. It is generated locally and ignored by Git.

Verify an existing database before regenerating it:

```sh
python3 -m backend.verify_db data/omio.sqlite3 --json
python3 -m backend.app --database data/omio.sqlite3 --check-contract
```

The full verifier is quiet while it scans and groups the 50,000,000-row fixture. It can take several minutes or longer depending on the Mac and storage. Let it finish; silence by itself is not a failure.

Generate only when missing or invalid:

```sh
time npm run seed
```

The generator writes `data/.omio.sqlite3.tmp`, removes a stale temporary file on retry, and atomically replaces `data/omio.sqlite3` only after a complete build. An interruption can leave the valid prior database intact. Never add the database or temporary file to Git.

## Verification before persistent start

Run the narrow contract checks, then the complete repository checks:

```sh
python3 -m unittest discover -s backend/tests -v
npm test
npm run typecheck
npm run build
npm run test:browser
```

The browser suite starts an isolated Vite frontend and exercises deterministic mocked API and chat boundaries in the browser. It uses the installed Chrome channel. A successful suite is useful regression evidence, but it does not replace the final signed-in planner smoke test.

Run the GitHub Pages presentation checks separately with `npm run test:browser:site`. That command builds the presentation and starts its own preview server on port 4174. It does not require the fare API or a Codex login.

## Services and ports

`npm run dev` starts all three services under one parent process:

| Service | Default URL | Health proof |
| --- | --- | --- |
| React/Vite app | `http://127.0.0.1:5173` | Browser page loads |
| Python fare API | `http://127.0.0.1:8000` | `/api/health` says `omio-fare-api` and reports the owned PID |
| Generative agent | `http://127.0.0.1:8010` | `/api/agent/health` says `omio-generative-agent` and reports the owned PID |

The agent health response describes configured provider `signed-in-codex`, model `gpt-6.1-sol`, and high reasoning effort. It does not prove login, entitlement, or a successful model response.

The launcher understands shell environment variables; this repository deliberately has no `.env` parser:

```sh
export OMIO_DATABASE="$PWD/data/omio.sqlite3"
export API_PORT=8000 AGENT_PORT=8010 WEB_PORT=5173
```

Use alternate ports only when the user needs them, and pass the same values to verification. Avoid adding an `.env.example` that the application will not load.

## Safe process management

For an agent using a managed command executor, launch the app in a foreground PTY session:

```sh
.agents/skills/setup-omio-macos/scripts/manage-app.sh run
```

Set `tty: true` and a short initial yield on the executor call. A running result returns a tool session ID; retain that session and include the ID in the completion receipt. Run status and browser verification in separate tool calls while the foreground session remains open. `nohup` is not a persistence boundary for managed executors because they may reap descendants when a call ends.

Use the remaining commands from separate calls:

```sh
.agents/skills/setup-omio-macos/scripts/manage-app.sh status
.agents/skills/setup-omio-macos/scripts/manage-app.sh stop
```

`run` records `artifacts/setup/omio-dev.pid`, then replaces the helper process with the canonical `node scripts/run.mjs dev` runner so its PID remains stable. Runtime output stays in the foreground PTY. It refuses a port used by an unknown process and never kills it. Inspect a conflict with `lsof -nP -iTCP:<port> -sTCP:LISTEN`; either stop the known process through its owner or choose unused ports.

A human working in an ordinary macOS Terminal may instead use `.agents/skills/setup-omio-macos/scripts/manage-app.sh start`; it backgrounds the runner and writes `artifacts/setup/omio-dev.log`. Do not use `start` from an agent executor and do not claim its `nohup` child survives executor cleanup.

Its stop boundary checks both the expected command and the process's exact physical repository working directory. The bundled `scripts/test-manage-app.sh` proves that a process with the same command in another clone is rejected.

The parent launcher terminates its Python and agent children on `SIGINT` or `SIGTERM`. `stop` signals only the exact recorded command in this physical clone. After a crash or closed PTY, `status` distinguishes a stale PID file from a healthy owned process.

## Final user-flow proof

With the persistent app running, execute:

```sh
node .agents/skills/setup-omio-macos/scripts/verify-running.mjs
```

The script performs these checks through the real app and services:

1. Reads both health endpoints and verifies service identity.
2. Queries London to Paris on an in-range date and requires a generated SQLite fare.
3. Opens the app in stable Google Chrome.
4. Requests a fare-comparison planner scene through signed-in Codex and waits for a rendered travel surface.
5. Adds a displayed fare to the shared trip tracker.
6. Checks desktop and narrow viewport overflow and saves screenshots plus a JSON receipt under `artifacts/setup-verification/`.

Fixture mode is request-level test support that can return text. It is not the generative planner and cannot satisfy step 4. A model/provider error, timeout, or missing scene means setup remains incomplete even when health endpoints are green.
