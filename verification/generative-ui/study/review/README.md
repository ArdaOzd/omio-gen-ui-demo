# Blinded human review

This protocol is predeclared before any machine matrix cell is collected. Human observations stay separate from machine pass/failure counts and latency measurements. No participant count is mandated by the implementation plan. No ratings are generated or entered by an agent.

Default sampling is exactly 24 items: the cold/fixed wording cell from **each of all twelve families**, once for each representation. Selection uses family/cache/wording identity, never pass rate, attractive captures or observed latency. Failed and missing selected cells appear explicitly. The complete 96-cell machine corpus remains available separately. Any changed sampling is a new, explicitly disclosed review package.

Use stable IDs such as `anonymous-001`. Odd participant numbers receive one representation first; even numbers receive the other. Reviewer-visible labels are only case and round numbers. The private identity map retains representation, cell ID and original native record. Do not give that directory to the reviewer or publish it. Raw original screenshots are private because they contain developer/variant labels.

The six separate dimensions are visual quality, usability, creativity, information hierarchy, mobile adaptation and perceived responsiveness. The common scale is 1 Poor, 2 Weak, 3 Acceptable, 4 Good, 5 Excellent. Each starts **unrated**. Short notes record failures, absent controls, data availability and unassessed dimensions. A reviewer must review the available capture **and** attempt the available interactive task before exporting its ratings. Screenshots alone do not meet the hands-on requirement.

The public captures are freshly rendered **native replays of the recorded artifact state**, with developer labels, composer and identity labels hidden. They are not a second model generation. Exact original source/state and the original screenshot remain private provenance. The interactive view restores those messages/artifacts and descriptors through the actual native adapter, FareDataBridge, local worker and pinned synthetic SQLite data. Each review server opens a separate Chrome browser context at a new loopback origin; existing user conversations are untouched. New model POSTs are blocked. Replay/source failures produce an explicit unavailable card and keep unsupported dimensions empty.

Generate after the frozen machine corpus exists, using a **new output directory**:

```sh
node verification/generative-ui/study/review/build-package.mjs \
  verification/generative-ui/study/artifacts \
  verification/generative-ui/study/review-packets/anonymous-001 \
  anonymous-001

node --import tsx verification/generative-ui/study/review/serve-review.mjs \
  verification/generative-ui/study/review-packets/anonymous-001 \
  http://127.0.0.1:5194
```

The server requires the native replay helper from `verification/generative-ui/resume-artifacts/replay-artifact.mjs` at the integrated product revision. It first checks the exact app/provider/model/reasoning and fixture identities, prepares blinded native captures, and opens the concrete review URL. Keep that supervised command running during review; stop it with Ctrl-C. It serves only public assets and proxies the frozen native application's required assets/data endpoints. It does not expose the private map or tool traces.

Follow each visible task, use the 390px/full-width controls, enter any ratings you can assess, and export locally. Export refuses an untouched template, invalid ratings, unknown items, a changed source freeze, or quality scores for wholly unavailable evidence. Unassessed dimensions stay null. Validate a returned export with `node verification/generative-ui/study/review/validate-export.mjs <public-manifest.json> <human-review-export.json> [new-output.json]`. Output refuses overwriting an existing file. The participant returns the exported JSON for later ingestion; this workflow does not send ratings to anyone.

Run offline checks with:

```sh
node --test verification/generative-ui/study/review/package.test.mjs
```

`../task-coverage-2026-10-03.json` records the separately verified study fare/date eligibility. Its check proves genuine data exists for local actions; a generated scene that binds the wrong window or omits a control still fails its machine cell.

Fixture global bounds are January 1, 2026 through December 31, 2027. Study resources initially cover October 9–15 only. October 20/22 therefore exercise a new browser resource load even though the SQLite source contains genuine rows for those days. An empty authored view does not prove SQLite lacks fares.
