# B authored-program evidence, 2026-10-02

Two genuine signed-in Codex `gpt-6.1-sol`, high-reasoning programs completed on the shared `/b` preview, Chrome 154 at 1280×1000, with the real million-row synthetic Python source. Each completed four HTTP200 requests: load fares, compose program, continued prose, and a text-only current-state follow-up. Provider token usage is unavailable. These are representative engineering cases, not a blinded human study or the complete twelve-family cold/warm live matrix.

| Case | Authored graph | Completed live run | Exact-source replay after date fix |
| --- | --- | --- | --- |
| 0 | SplitPane/Stack/StickySummary; mode grouping; two queries depend on `$filters`; conditional coverage; ordered `@Run(reveal), @Set($show,true)` | 113.7s; Bus/details edits captured in genuine follow-up | Bus minimum €20.79, fastest 7h36m, count19, nineteen fare choices; details shown |
| 1 | Section/Inline/calendar/SplitPane; serviceDate grouping; fares depend on `$dates,$sort`; two mutations and conditional show/hide timeline actions | 204.8s; calendar and fare choices rendered; original label matcher did not click the journey toggle | Seven daily aggregates; Oct10/fastest sort produces nine fare choices; timeline shown |

Both replay cases pass with zero additional chat requests from local edits, no page or inline query errors, and exact next-request snapshots: case0 `filters.modes=[bus], $show=true`; case1 `dates.start=2026-10-10, sort=durationMinutes:asc, $showTimeline=true`. The replay forwards captured genuine SSE through the same scene adapter and uses the real fare API and browser worker. Its subsequent request inspects snapshot metadata; replayed text is not a new model judgment. Screenshots are taken before that snapshot probe.

The original completed case0 exposed a real failure: its authored inclusive `serviceDate between [Oct9,Oct15]` was rejected by the host's numeric-only comparison guard, leaving an empty table and fare error. It remains in `case-0.json/png` as failed initial functional evidence. Commit `8877ce1` permits typed serviceDate comparisons, already supported by the engine, with a failing-then-passing exact-query regression. The exact authored source works afterward in `replay-0.json/png`. Case1 authored a different AST, grouping, state dependencies, condition and action sequence; `authored-graphs.json` records parser validation, bindings and query argument ASTs.

`response.text()` decoded UTF-8 SSE as Latin-1 in the evidence runner while the actual browser rendered correct Unicode. Recorded bodies were converted back to UTF-8 and checked against original screenshots; the reusable runner now decodes `response.body()` as UTF-8. No program structure or model decisions were altered.

Development diagnostics are kept separately. The earlier real partial run clicked Bus before completion and began a third continuation with the latest state, but closed before that continuation finished. It is not a completed authorship gate. Earlier missing frontend-tool declaration, oversized tool description, shared location-catalog limit and harness locator failures are diagnostics, not model successes or human ratings.

Reproduce against a running shared launcher:

```sh
OMIO_DEMO_URL=http://127.0.0.1:5194 node verification/generative-ui/b/run-live.mjs
npx tsx verification/generative-ui/b/analyze-live.ts
OMIO_DEMO_URL=http://127.0.0.1:5194 node verification/generative-ui/b/replay-live.mjs
```

The reusable live runner deliberately records outcomes rather than treating HTTP200/pageerror0 as proof of useful data views. Inspect original visible text and replay assertions together. The independent SUM18 toggle regression and current-date resource-arrival regression live in `src/generative/variants/b/renderer.test.tsx`; they prevent replacing authored metrics with a stock selector after unrelated edits.
