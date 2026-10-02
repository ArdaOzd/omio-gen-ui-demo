# Repository workflow

## Knowledge graphs

- For code structure, callers, dependencies, change impact, and reviews, check `code-review-graph status --repo .` first. Build a missing graph with `code-review-graph build --repo .` and refresh a stale graph with `code-review-graph update --repo .`.
- Use the code-review-graph MCP tools before broad source searches. Start with `get_minimal_context_tool`, then use `query_graph_tool`, `get_impact_radius_tool`, or `detect_changes_tool` as the task requires.
- For project-wide questions that include source, documentation, or assets, invoke `/graphify` and query `graphify-out/graph.json` before scanning files. Use `graphify query`, `graphify path`, `graphify explain`, or `graphify affected` for the matching question.
- After code changes, refresh both graphs with `code-review-graph update --repo .` and `graphify update .`. After documentation or asset changes, invoke `/graphify . --update` with local or Codex extraction.
- Use graph results to narrow the files you read. Verify behavior in the implementation and relevant tests before editing or concluding; source code wins when a graph is stale or incomplete.
