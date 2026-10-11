# Agent and graph tooling

These tools support agents working in the repository. The browser application itself can run without them. Configure them after runtime prerequisites and before broad repository investigation.

## pstack role setup

If the host exposes the `setup-pstack` skill, invoke it once. Inspect current role mappings first, preserve valid explicit user choices, replace only missing or unavailable choices, and keep reruns idempotent.

If `setup-pstack` is unavailable, perform the equivalent setup through capabilities the host actually exposes:

1. Inspect the host's current pstack/model-role configuration through its settings or configuration API. Do not guess a private file path.
2. Enumerate model slugs confirmed available in the current host or session. Never invent or probe unlisted models.
3. Preserve every explicit role choice whose slug remains available. Repair only empty or unavailable choices.
4. When the current orchestrator is `gpt-6-astra`, restrict worker roles and dispatches to `gpt-5.6-sol`, `gpt-5.6-terra`, or `gpt-5.6-luna`, set reasoning effort to `high`, and use `gpt-5.6-sol` as the default worker.
5. For other orchestrators, select only confirmed models according to the repository's AGENTS instructions and the host's supported role mechanism.
6. Save through the host-supported configuration interface. If the host has no persistent pstack configuration sink, apply an in-session role mapping and record `setup-pstack unavailable; equivalent session mapping applied` with the chosen, confirmed slugs.
7. Re-read the resulting mapping and verify every configured slug is available. On Astra, also verify every worker role is in the three-model allowlist and uses high effort.

Do not install, copy, or synthesize an unverified private `setup-pstack` skill. The verified fallback above is complete when its resulting persistent or session mapping passes step 7.

## Graphify and code-review-graph

Inspect installed versions first. The verified minimums for this workflow are Graphify `0.9.50` and code-review-graph `2.3.8`. Keep a compatible newer version. Install a missing tool or upgrade an older one in an isolated uv tool environment:

```sh
graphify --version || uv tool install graphifyy
code-review-graph --version || uv tool install code-review-graph
# When the reported version is below the minimum:
uv tool upgrade graphifyy
uv tool upgrade code-review-graph
uv tool update-shell
```

Open a new shell or load the path printed by uv, then verify:

```sh
command -v graphify
graphify --version
command -v code-review-graph
code-review-graph --version
```

The PyPI package is `graphifyy`; its command is `graphify`. `uvx --from graphifyy graphify ...` is a valid one-shot fallback, while plain `uvx graphify` names the wrong package. Do not store uv's interpreter or tool paths in tracked files.

Install integrations without replacing the curated repository instructions:

```sh
graphify install --platform codex
code-review-graph install --platform codex --repo . --no-instructions --dry-run
code-review-graph install --platform codex --repo . --no-instructions -y
```

An integration installed during the current agent session may not become invocable until the next session. If `/graphify` is still unavailable, locate and read the newly installed Graphify `SKILL.md` through the host's skill inventory and follow it directly. If the host cannot expose that file in-session, record a restart/resume checkpoint and continue after a new session. Do not substitute Graphify's code-only hook extraction for the required full semantic corpus.

Build a missing or invalid Graphify corpus with `/graphify .`. If a tracked graph came from another checkout or is stale, use `/graphify . --update`. Continue the full-corpus warning and select local or Codex extraction. Then validate graph structure, manifest coverage, and clone-relative paths:

```sh
python3 - <<'PY'
import json, os
graph = json.load(open("graphify-out/graph.json"))
manifest = json.load(open("graphify-out/manifest.json"))
source_paths = [node["source_file"] for node in graph.get("nodes", []) if node.get("source_file")]
if not manifest or not source_paths:
    raise SystemExit("Graphify graph or manifest has no local source corpus")
paths = source_paths + list(manifest)
invalid = [path for path in paths if os.path.isabs(path) or not os.path.exists(path)]
if invalid:
    raise SystemExit(f"Graph paths are missing or non-portable: {invalid[:10]}")
print(f"Graphify valid: {len(graph.get('nodes', []))} nodes, {len(manifest)} manifest files")
PY
code-review-graph build --repo .
code-review-graph status --repo .
```

Compare the manifest with the current source/document/asset corpus; if relevant tracked files are absent or changed, run `/graphify . --update` and validate again. Do not authorize or configure an external extraction provider during setup. Leave generated graph changes uncommitted during setup so the repository owner can review them separately. In later agent work, call code-review-graph's `get_minimal_context_tool` before broad searches. After code edits run `code-review-graph update --repo .` and `graphify update .`; after documentation or asset edits invoke `/graphify . --update` with local or Codex extraction.

## Repository graph hooks

Install and exercise the repository's fail-open Graphify hooks:

```sh
scripts/install-graphify-hooks.sh
scripts/test-graphify-hooks.sh
graphify hook status
```

The installer handles post-commit and post-checkout and adds an idempotent post-merge forwarder. Set `GRAPHIFY_SKIP_HOOK=1` for a deliberately skipped invocation. Hooks may embed the local uv interpreter path, so every Mac must reinstall them after cloning and after a Graphify upgrade. Never copy `graphify-out/.graphify_python` from another machine.

## Diagram tooling

The global `archify` skill is required only when an architecture, workflow, sequence, data-flow, or lifecycle diagram is requested. If it is unavailable at that time, report the capability gap and use a user-authorized fallback. Its absence does not block clone setup, data generation, or runtime verification.
