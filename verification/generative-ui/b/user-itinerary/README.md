# Captured B itinerary regression

`accepted-repair.openui` is the exact accepted user scene (5,409 source characters, excluding its final newline), artifact revision5. `failed-part.json` is the captured terminal failed tool with empty input. The rejected source was not retained by the original server and cannot be diagnosed retroactively.

`captured-context.json` preserves root's pre-reload artifact state and compact manifests. `replay-result.json` records an isolated native history restore using that exact source, failed/accepted parts, the real Python fare API, and browser query workers. The reconstructed initial user prompt is identified in the harness. The test intentionally seeds descending host sort, then verifies it wins over the scene's ascending default. The actual user session is untouched.

The replay passes: stable refs, three empty per-leg query results, three comparison tables with useful empty statuses, a useful empty fare picker, no failed-tool spinner, and preserved highest-price sort. The first multi-route resource refreshed to 268 rows versus 23 in the earlier capture; both counts concern the aggregate, while each requested train/bus date and leg has zero results. The captured count remains unchanged in its fixture.

`backend-availability.json` independently shows Barcelona–Prague has no demo route, and both Paris–Prague directions offer flights only on the requested dates. Requested train/bus coverage does not establish availability.

`followup-http400-diagnostic.json` retains the first isolated follow-up failure before model dispatch. The current request parser accepts its exact request. This attempt does not prove live model authorship or a successful follow-up. The server environment is being checked separately.

Run `node verification/generative-ui/b/user-itinerary/replay-and-followup.mjs` against the owned preview at 5194. It uses an isolated browser context and performs one genuine model follow-up after replay verification.

The corrected-environment retry produced two valid model-authored accepted scenes, then hit the initial240-second whole-turn harness limit during the third continuation. `resume-followup.mjs` resumed that exact third HTTP body (equality asserted) without repeating completed generations. Three more accepted scenes followed, then HTTP6 failed because canonical history reached40,665 characters. `followup-diagnostic-summary.json` and five exact UTF-8 source files preserve these genuine accepted outputs. This is diagnostic evidence of a continuation completion bug, not a successful complete conversation gate. The model received its accepted tool acknowledgments.

The harness now uses180-second HTTP and600-second visible-turn bounds and handles late response-body shutdown. Earlier partial/cancelled artifacts remain labeled. `resume-client.jsx` is a verification-only nativeSDK host; product routing and UI components remain the actual implementation.

The legacy identity replay seeds the exact captured sqlite-demo-v1 descriptors, then restores against the authoritative v2 fixture. The original B programRevision5 remains valid with restored UIrevision6; the 5,409-character source, artifact references, descending sort, useful empty results, and terminal repair rendering are preserved. This isolated replay performs zero model requests.
