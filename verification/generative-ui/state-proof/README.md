# State continuity browser proof

Both initial scenes replay the genuine case-0 native tree; the text-only answer uses a new signed-in Codex high-reasoning call. This distinction is deliberate.

Chrome restored two compiled artifact views sharing one dataset, retained the second active artifact, its Bus filter and selected fare, and left the first independent. The restored total was €25.43. Direct edits made zero chat requests. The next request’s atomic snapshot carried the second artifact revision2, London–Paris bus mode and one selected fare; the model answered these correctly without a scene tool, using30 genuine text deltas. Stop then cancelled a replacement request while preserving the useful selected Bus view. No page errors occurred.

An initial run exposed a real reload regression: redundant active-artifact notifications cancelled the30ms autosave timer. The fixed route flushes pending saves before subscription changes, and identical activation no longer notifies. The repeated browser run now passes assertions rather than merely recording observations.

Reproduce against a running demo with `OMIO_DEMO_URL=http://127.0.0.1:5173 node verification/generative-ui/run-state-proof.mjs`.
