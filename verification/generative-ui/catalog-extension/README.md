# Selected fare count adapter proof

This is deterministic real-framework evidence, with no model calls. Native A uses the compiler-owned toolkit and streamed `present`; B uses the real OpenUI parser/renderer and shared catalog.

At 360px, select a Bus fare with FarePicker, observe `1 selected fare`, then clear it and observe `0 selected fares`. Native A's selection happens before stream completion and survives the completed tool input. Both pass without page errors, overflow or chat network requests. `result.json` records Chrome version and outcomes. The selected-state screenshots are retained as `a.png` and `b.png`; reruns also write screenshots into the ignored `artifacts/` directory.

```sh
node_modules/.bin/vite --config verification/generative-ui/catalog-extension/spike/vite.config.ts --host 127.0.0.1 --port 5397
# In a second terminal:
node verification/generative-ui/catalog-extension/run-browser.mjs
```

Synthetic source rows exist only in the host fixture loader. Generated native props and OpenUI programs contain refs, never copied fare facts. The fixture does not replace or write the shared SQLite database.
