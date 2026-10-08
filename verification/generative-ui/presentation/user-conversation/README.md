# Native A conversation completion

The single isolated live check passed on served source `a36f4340bf66219ff7c6e1205cc216e7c71865b8`, using signed-in Codex `gpt-6.1-sol` with high reasoning and Chrome154.0.8037.97. It took107,106ms over five HTTP200 responses. The preserved10M fixture remained `sqlite-demo-v2-aa65e0b-5f489000-18dad574e0d82bc6`.

A fresh browser context submitted the recorded London–Paris–Barcelona request. Real native SDK tool execution loaded both legs, set ordered stays to London0/Paris2/Barcelona4 and accepted one `present` tree. Its native empty acknowledgment `{}` reached the continuation at the same issued/current UI revision. The last HTTP response contained text and no tool; the page remained quiet for six seconds afterward. The final prose was: “Choose one fare for each leg using the compact pickers; the synthetic total updates automatically.”

The DOM assertions confirm one travel surface, a full three-city schematic and a separate ordered stop list. The captured authored tree has distinct compact fare selectors and expanded cards for each leg. There were no page errors. Completed earlier step prose remains accessible under the reversible disclosure. No saved user conversation or selected fare was edited by this check. Selection/filter/revision survival is covered separately by `src/generative/catalog/catalog.test.tsx` and the user's saved-thread reload verification.

`completion-result.json` retains requests, genuine SSE responses, accepted source, snapshots and diagnostics. `completion.png` captures the finished page. `run-completion.mjs` declares180seconds per HTTP call and600seconds per visible turn, and rejects a served revision mismatch before any model call. Do not automatically repeat this proof or start the parked96-cell study: the user requested fixing the current errors, documenting the remaining work and stopping.

For a later explicitly authorized verification:

```sh
OMIO_APP_REVISION=<verified-served-source-commit> OMIO_DEMO_URL=http://127.0.0.1:5194 node verification/generative-ui/presentation/user-conversation/run-completion.mjs
```
