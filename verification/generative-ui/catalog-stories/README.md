# Shared catalog stories

This standalone verification application exercises every generated catalog export through the actual A frontend-tool adapter and B OpenUI frontend-tool adapter. It uses a deterministic tool stream, an actual browser-local data bridge/query worker, and typed fixtures. It does not represent model authorship, a study cell, or human visual ratings. Production routes have no story shortcuts.

Run from the repository root:

```sh
npx vite --config verification/generative-ui/catalog-stories/spike/vite.config.ts --host 127.0.0.1 --port 5398
# In another terminal:
node verification/generative-ui/catalog-stories/run-browser.mjs
npx tsc --noEmit -p verification/generative-ui/catalog-stories/tsconfig.json
```

The browser runner blocks external requests and the production chat endpoint. Tool calls use the real SDK protocol with fixture responses. Only fixture fare pages are loaded; contexts are checked for bulk fare data. `OMIO_STORIES_URL` changes the local origin. `OMIO_STORY_NAMES` selects comma-separated exports for diagnosis and is recorded explicitly in the result; an abbreviated run does not claim full coverage.

`inventory.ts` declares ready, loading, partial, empty, error, stale, and invalid-ref applicability with reasons for all exports. Query consumers and selected-fare consumers use actual pending/rejected requests. Empty route fixtures contain no stops or owned datasets. Partial fixtures retain a bounded incomplete resource and render the registered CoverageSummary companion. Invalid references are rejected by native tool acceptance/rendering. Every ready case rejects a revision-checked obsolete edit and exports current host state. RetryAction has a real failed coverage load followed by a successful native retry; current selections and chat requests are preserved.

The runner changes the actual filter/date/sort/stay/fare controls and checks the next compact context, operates Tabs and chart points by keyboard, checks fare-button focus through selection, and captures a composed SplitPane/StickySummary planner in both themes at 360, 800, and 1280 pixels with reduced motion. Responsive checks cover overflow and sticky-summary collapse. These are engineering checks; participant visual preference and usability ratings remain a separate study gate.

Results and screenshots are written to ignored local `result.json` and `artifacts/`. They remain local. The result identifies the source commit, tracked source dirtiness, browser, coverage inventory, exact cases and failures. Reusable source/tests and these instructions can be published independently of captured evidence.
