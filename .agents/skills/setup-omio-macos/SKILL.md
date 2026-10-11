---
name: setup-omio-macos
description: Clone, install, configure, run, and verify omio-gen-ui-demo on a current macOS release. Use for a first setup, moving the demo to another Mac, or repairing a local setup until the signed-in Codex planner and synthetic fare search both work.
---

# Set up Omio on macOS

Bring a clean Mac to a running, verified demo. The finish line is a browser showing fares from the generated SQLite database and a generative planner scene produced by signed-in Codex. A green health endpoint alone does not prove that the planner works.

Read only the reference needed for the current stage:

- [prerequisites.md](references/prerequisites.md) for macOS, Homebrew, Node, Python, Chrome, Codex, disk, and time requirements.
- [data-and-runtime.md](references/data-and-runtime.md) for database generation, ports, processes, tests, and browser proof.
- [agent-tooling.md](references/agent-tooling.md) for pstack-equivalent setup, Graphify, code-review-graph, hooks, and optional diagram tooling.
- [troubleshooting.md](references/troubleshooting.md) after a failed check or interrupted setup.

## Rules

- Support current macOS on `arm64` or `x86_64`. Check required commands and versions instead of rejecting a Mac by release number; never assume a Homebrew prefix.
- Reuse compatible installed tools. Install only missing or incompatible prerequisites.
- Continue unattended work around the unavoidable Xcode Command Line Tools dialog and Codex browser sign-in. State the exact human action and resume after it completes.
- Keep credentials in the user's existing Codex login. Do not request or create an API key.
- Keep the generated database, logs, PID files, screenshots, `.env*`, and tool caches out of Git. Preserve unrelated working-tree changes.
- Do not report complete when only fixture text, service health, or a build succeeded. Full completion requires a real planner response from the fixed `gpt-6.1-sol` model at high reasoning effort.

## Workflow

1. Locate the repository. If absent, clone `https://github.com/ArdaOzd/omio-gen-ui-demo.git`, enter it, and confirm that `package.json`, `package-lock.json`, `backend/`, and `agent/` exist. If already inside a checkout, do not reclone or reset it.
2. Read [prerequisites.md](references/prerequisites.md). Run `.agents/skills/setup-omio-macos/scripts/preflight.sh --before-seed`; install or repair only failed prerequisites, then rerun it.
3. Run `codex login status` with a short timeout. If signed out, run `codex login`, tell the human to finish the browser flow, and continue other independent setup work. If the account cannot use `gpt-6.1-sol`, report that exact live-planner blocker; still finish dependency, database, build, test, and classic-search setup.
4. Run `npm ci`, then `npm run typecheck` and `npm run build`. `npm ci` intentionally replaces `node_modules` from the committed lockfile.
5. Complete [agent-tooling.md](references/agent-tooling.md). Treat agent tooling as setup for repository work, not as an application runtime dependency.
6. If `data/omio.sqlite3` exists, verify it first. If absent or invalid, confirm the free-space requirement in [prerequisites.md](references/prerequisites.md), then run `time npm run seed`. Do not lower the 50,000,000-row contract to make setup finish faster.
7. Run the verification commands in [data-and-runtime.md](references/data-and-runtime.md). Fix failures before starting the persistent app.
8. As an agent, launch `.agents/skills/setup-omio-macos/scripts/manage-app.sh run` in a foreground PTY executor session with a short initial yield. Keep the returned tool session open and record its session ID. The command records the canonical runner PID and refuses unknown port owners. Do not use background `start` from a managed executor: executor cleanup may reap a `nohup` child after the call returns. A human using an ordinary Terminal may use `start` and its `artifacts/setup/omio-dev.log` file.
9. Run `node .agents/skills/setup-omio-macos/scripts/verify-running.mjs`. This proves the API returns generated fares, opens Chrome, requests a real generative planner scene, adds a fare to the shared tracker, checks a narrow viewport, and saves review evidence under `artifacts/setup-verification/`.
10. Give the user a completion receipt: repository path, tool versions, database contract and size, service URLs, runner PID and live executor session ID, test results, planner model/account result, and evidence paths. Confirm the foreground session is still running after browser verification. Name any remaining blocker precisely. Never describe fixture-only output as full success.

## Reruns and recovery

Rerun from the failed stage. Dependency installation, contract verification, graph builds, hook installation, and the process helper are intended to converge safely. Database generation uses a temporary file and replaces the final database only after success. Never delete a valid database or kill an unknown listener merely to retry; follow [troubleshooting.md](references/troubleshooting.md).
