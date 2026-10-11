# Troubleshooting and recovery

Work from the first failed boundary. Preserve the existing checkout, a valid database, and unknown processes.

## `brew`, `node`, `python3`, or `codex` is missing

- Reopen the shell after `brew shellenv` or `uv tool update-shell`.
- Detect the Homebrew prefix from `uname -m` or `brew --prefix`; do not hardcode another Mac's path.
- Run `.agents/skills/setup-omio-macos/scripts/preflight.sh --before-seed` again. Its failure text identifies the unsupported version or missing application.
- For Codex, validate `CODEX_BINARY` is executable, then check `command -v codex` and `codex login status`. An invalid explicit override fails before other discovery by design.

## `npm ci` fails

- Confirm Node satisfies `^20.19.0 || >=22.12.0` and that `package-lock.json` is present.
- Retry after fixing network or registry access. Do not replace `npm ci` with an unpinned install and do not hand-edit the lockfile.
- `npm ci` removes a partial `node_modules` automatically.

## Database generation is interrupted or disk fills

- Stop and restore at least 18 GiB free before retrying.
- Verify `data/omio.sqlite3`; a prior valid database may still be intact because generation targets a temporary file.
- Rerun `time npm run seed`. The generator removes its stale temporary output before rebuilding.
- Do not truncate the row target or commit generated data.

## A port is occupied

Inspect without killing anything:

```sh
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:8010 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

Use `.agents/skills/setup-omio-macos/scripts/manage-app.sh status`. Stop only a process whose ownership is known. Otherwise export three unused ports and use the same values for foreground run and verification.

## App disappears after the launch command returns

An agent used background `start` in a managed executor whose cleanup reaped the `nohup` child. Remove the stale PID by rerunning `run`, then keep `run` attached to a foreground PTY executor session. Record that tool session ID, check `status` from another call, complete browser verification, and confirm the original session remains running. Use background `start` only from a human-controlled ordinary Terminal.

## Health succeeds but planner verification fails

The health endpoint reports configured provider metadata only. Check, in order:

1. `codex login status` completes and reports a signed-in session.
2. The signed-in account can use `gpt-6.1-sol`; there is no supported model override in this app.
3. `CODEX_BINARY`, when set, points to an executable Codex binary.
4. `.agents/skills/setup-omio-macos/scripts/manage-app.sh logs` contains no provider error, timeout, invalid output, or cancellation.
5. Retry the final browser verification once after correcting the cause. Do not substitute fixture mode or call text-only fixture output a planner scene.

## Browser verification fails

- Confirm stable Google Chrome exists in `/Applications` and that `npm ci` installed Playwright.
- Read `artifacts/setup/omio-dev.log` and the receipt/error from `artifacts/setup-verification/`.
- Check that the selected travel date falls inside 2026-10-08 through 2027-12-31.
- Re-run the focused browser smoke after services are healthy. Preserve screenshots for diagnosis.

## Stale PID file

`.agents/skills/setup-omio-macos/scripts/manage-app.sh status` reports a stale or foreign PID without killing it. `run` and `start` remove a stale record only when that PID is no longer alive; both refuse a live foreign PID. After confirming all three ports are free, retry the appropriate launch mode. Background-start logs are append-only unless the user deliberately archives them; foreground-run output remains in its PTY session.

## Graph tools fail after moving the checkout

Run `uv tool install --force graphifyy`, reinstall repository hooks, and rebuild the graphs. Machine-local hook shebangs and cached interpreter paths are not portable. Preserve user-owned graph output and unrelated working-tree changes.
